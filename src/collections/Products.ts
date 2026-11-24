import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type PayloadRequest,
} from "payload";

import {
  formatMissing,
  publishReadiness,
  type Readiness,
  type ReadinessImage,
} from "@/domain/products/readiness";
import {
  productStatusLabels,
  productStatuses,
  restockTypeLabels,
  restockTypes,
} from "@/domain/products/status";

import { expireCatalog, slugField } from "./shared";

// Accessible replacements for Payload's react-select widgets (constitution II).
const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

type Localized = Partial<Record<string, unknown>>;
type ProductData = Record<string, unknown>;

const LOCALIZED_FIELDS = ["name", "slug", "shortDescription", "description"] as const;

function idOf(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return idOf(value.id);
  }
  return undefined;
}

function ids(value: unknown): (number | string)[] {
  return Array.isArray(value) ? value.map(idOf).filter((id) => id !== undefined) : [];
}

/**
 * Readiness of a product (F-010 CA-2): the stored product in every language, optionally overlaid
 * with the data being saved in `locale`, plus its categories, photos and variants.
 */
async function readinessOf(
  req: PayloadRequest,
  id: number | string | undefined,
  pending: ProductData = {},
): Promise<Readiness> {
  const stored: ProductData = id
    ? ((await req.payload.findByID({
        collection: "products",
        id,
        locale: "all",
        depth: 0,
        req,
      })) as unknown as ProductData)
    : {};

  const locale = typeof req.locale === "string" ? req.locale : undefined;
  const all: Record<string, Localized> = {};
  for (const field of LOCALIZED_FIELDS) {
    const merged: Localized = { ...((stored[field] as Localized | undefined) ?? {}) };
    if (locale && locale !== "all" && field in pending) merged[locale] = pending[field];
    if (locale === "all" && typeof pending[field] === "object") {
      Object.assign(merged, pending[field]);
    }
    all[field] = merged;
  }

  const categories = "categories" in pending ? pending.categories : stored.categories;
  const imageIds = ids("images" in pending ? pending.images : stored.images);
  const images: ReadinessImage[] = imageIds.length
    ? (
        await req.payload.find({
          collection: "media",
          where: { id: { in: imageIds } },
          locale: "all",
          depth: 0,
          limit: imageIds.length,
          pagination: false,
          req,
        })
      ).docs.map((doc) => ({ alt: doc.alt as unknown as ReadinessImage["alt"] }))
    : [];
  const variants = id
    ? (
        await req.payload.find({
          collection: "variants",
          where: { product: { equals: id } },
          depth: 0,
          pagination: false,
          req,
        })
      ).docs
    : [];

  return publishReadiness({
    name: all.name,
    slug: all.slug,
    shortDescription: all.shortDescription,
    description: all.description,
    categoryCount: ids(categories).length,
    variants,
    images,
  });
}

/** CA-2/CA-4: saving with status `published` is refused with the list of what is missing. */
const enforcePublishReadiness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const product = data as ProductData;
  if (product.status !== "published") return data;
  const readiness = await readinessOf(req, idOf(originalDoc), product);
  if (readiness.ready) return data;

  // One message: the admin shows a single error per field, and CA-4 needs the whole list.
  throw new ValidationError({
    collection: "products",
    errors: [
      {
        message: `No se puede publicar. ${formatMissing(readiness.missing).join(" ")}`,
        path: "status",
      },
    ],
    req,
  });
};

/** Products (F-010). Localized texts, lifecycle status and the publish rule. */
export const Products: CollectionConfig = {
  slug: "products",
  labels: { singular: "Producto", plural: "Productos" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "status", "restockType", "updatedAt"],
    description: "Escribe primero en español. Para publicar, completa los 3 idiomas.",
    // CA-5: archived products leave the default list; filtering by status shows them.
    baseFilter: ({ req }) => {
      const where = (req.query as { where?: unknown } | undefined)?.where;
      return JSON.stringify(where ?? {}).includes('"status"')
        ? null
        : { status: { not_equals: "archived" } };
    },
  },
  // CA-4: what is still missing to publish, for the sidebar checklist (admins only).
  endpoints: [
    {
      path: "/:id/readiness",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const id = req.routeParams?.id as string | undefined;
        const readiness = await readinessOf(req, id);
        return Response.json({ ready: readiness.ready, lines: formatMissing(readiness.missing) });
      },
    },
  ],
  fields: [
    {
      name: "publishChecklist",
      type: "ui",
      admin: {
        position: "sidebar",
        components: { Field: "/components/admin/PublishChecklist#PublishChecklist" },
      },
    },
    {
      name: "status",
      type: "select",
      label: "Estado",
      required: true,
      defaultValue: "draft",
      index: true,
      options: productStatuses.map((value) => ({ value, label: productStatusLabels[value] })),
      admin: {
        position: "sidebar",
        description: "Solo los publicados se ven en la tienda.",
        components: { Field: NATIVE_SELECT },
      },
    },
    {
      name: "restockType",
      type: "select",
      label: "Tipo de reposición",
      required: true,
      defaultValue: "replenishable",
      options: restockTypes.map((value) => ({ value, label: restockTypeLabels[value] })),
      admin: { position: "sidebar", components: { Field: NATIVE_SELECT } },
    },
    {
      name: "categories",
      type: "relationship",
      relationTo: "categories",
      hasMany: true,
      label: "Categorías",
      admin: {
        position: "sidebar",
        components: { Field: "/components/admin/CheckboxRelationship#CheckboxRelationship" },
      },
    },
    { name: "name", type: "text", label: "Nombre", localized: true, required: true },
    slugField("products"),
    {
      name: "shortDescription",
      type: "textarea",
      label: "Descripción corta",
      localized: true,
    },
    { name: "description", type: "richText", label: "Descripción larga", localized: true },
    {
      name: "images",
      type: "upload",
      relationTo: "media",
      hasMany: true,
      label: "Fotos",
      admin: { description: "La primera es la principal." },
    },
    {
      name: "variants",
      type: "join",
      collection: "variants",
      on: "product",
      label: "Variantes",
      admin: { defaultColumns: ["sku", "price", "active"] },
    },
    {
      type: "collapsible",
      label: "Información del producto",
      admin: { initCollapsed: true },
      fields: [
        { name: "inci", type: "textarea", label: "Ingredientes (INCI)", localized: true },
        { name: "usage", type: "textarea", label: "Modo de uso", localized: true },
        { name: "warnings", type: "textarea", label: "Advertencias", localized: true },
        { name: "allergens", type: "textarea", label: "Alérgenos", localized: true },
        { name: "certifications", type: "textarea", label: "Certificaciones", localized: true },
        {
          name: "pao",
          type: "text",
          label: "Caducidad tras abrir (PAO)",
          localized: true,
          admin: { description: "Por ejemplo: 12 meses." },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [enforcePublishReadiness],
    // CA-8: a product's variants go with it. F-033 blocks this once orders reference them.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({
          collection: "variants",
          where: { product: { equals: id } },
          req,
        });
      },
    ],
    afterChange: [() => expireCatalog()],
    afterDelete: [() => expireCatalog()],
  },
};
