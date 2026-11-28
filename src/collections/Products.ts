import {
  APIError,
  commitTransaction,
  initTransaction,
  killTransaction,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type PayloadRequest,
} from "payload";

import { hasMovements } from "@/lib/stock";

import { MAX_PHOTOS, TOO_MANY_PHOTOS } from "@/domain/products/gallery";
import { isValidPrice } from "@/domain/products/price";
import {
  formatMissing,
  publishReadiness,
  type Readiness,
  type ReadinessImage,
} from "@/domain/products/readiness";
import {
  affectedByRemoval,
  ATTRIBUTE_NAMES,
  ATTRIBUTES,
  missingCombinations,
  optionErrors,
  type ProductOption,
  withCodes,
} from "@/domain/products/variant-options";
import {
  productStatusLabels,
  productStatuses,
  restockTypeLabels,
  restockTypes,
} from "@/domain/products/status";

import { suggestSku } from "@/domain/products/sku";

import { auditHooks } from "./audit";
import { expireCatalog, slugField } from "./shared";

// Accessible replacements for Payload's react-select widgets (constitution II).
const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

export const PRODUCT_HAS_STOCK_HISTORY =
  "Sus variantes tienen historial de stock: archiva el producto en vez de borrarlo.";

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
  const gallery = ("gallery" in pending ? pending.gallery : stored.gallery) as
    { image?: unknown }[] | null | undefined;
  const imageIds = (gallery ?? []).map((row) => idOf(row.image)).filter((v) => v !== undefined);
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
    options: mergedOptions(stored.options, pending.options, locale),
    variants,
    images,
  });
}

type StoredOption = ProductOption & { id?: string };
type Labels = NonNullable<NonNullable<ProductOption["values"]>[number]["label"]>;

/**
 * The product's attributes with value labels in every language: the stored ones (`locale: "all"`)
 * with the labels being saved in `locale` laid over them, matched by value code.
 */
function mergedOptions(
  stored: unknown,
  pending: unknown,
  locale: string | undefined,
): ProductOption[] {
  const saved = (stored ?? []) as StoredOption[];
  if (!Array.isArray(pending)) return saved;
  return (pending as StoredOption[]).map((option) => ({
    attribute: option.attribute,
    values: (option.values ?? []).map((value) => {
      const label: unknown = value.label;
      if (locale === "all" || (typeof label === "object" && label !== null)) {
        return { code: value.code, label: label as Labels };
      }
      const before = saved
        .find((candidate) => candidate.attribute === option.attribute)
        ?.values?.find((candidate) => candidate.code === value.code)?.label;
      return { code: value.code, label: { ...before, ...(locale ? { [locale]: label } : {}) } };
    }),
  }));
}

/**
 * F-011 CA-4: the admin hides "Añadir Foto" at 10; API writes get the same limit, with its own
 * message (a field error would only say "Fotos" is invalid).
 */
const limitPhotos: CollectionBeforeValidateHook = ({ data }) => {
  const gallery = (data as ProductData | undefined)?.gallery;
  if (Array.isArray(gallery) && gallery.length > MAX_PHOTOS) {
    throw new APIError(TOO_MANY_PHOTOS, 400, null, true);
  }
  return data;
};

/** F-011 CA-1: valid attribute list, and value codes filled from the Spanish label. */
const normalizeOptions: CollectionBeforeChangeHook = ({ data, req }) => {
  const options = (data as ProductData).options;
  if (!Array.isArray(options)) return data;
  const locale = typeof req.locale === "string" ? req.locale : "es";
  const withLabels = (options as StoredOption[]).map((option) => ({
    ...option,
    values: (option.values ?? []).map((value) => ({
      ...value,
      // The code comes from the Spanish label; outside Spanish only an existing code is kept.
      label: locale === "es" ? { es: value.label as unknown as string } : {},
    })),
  }));
  const coded = withCodes(withLabels);
  const errors = optionErrors(coded);
  if (errors.length > 0) {
    throw new ValidationError({
      collection: "products",
      errors: [{ path: "options", message: errors.join(" ") }],
      req,
    });
  }
  (data as ProductData).options = (options as StoredOption[]).map((option, i) => ({
    ...option,
    values: (option.values ?? []).map((value, j) => ({
      ...value,
      code: coded[i]?.values?.[j]?.code ?? value.code,
    })),
  }));
  return data;
};

/** CA-2/CA-4: saving with status `published` is refused with the list of what is missing. */
const enforcePublishReadiness: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const product = data as ProductData;
  // Housekeeping updates (a deleted variant leaving the gallery) never block on content.
  if (product.status !== "published" || req.context.skipPublishCheck) return data;
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

/** F-018 CA-3: every create, edit, status change and delete, labelled by the Spanish name. */
const audit = auditHooks({
  entity: "products",
  localized: true,
  ignore: ["variants"],
  label: async (doc, req) => {
    if (req.locale === "es" && typeof doc.name === "string") return doc.name;
    // `find`, not `findByID`: on a deleted product findByID throws, and Payload's error path
    // kills the request's transaction, which would roll back the delete itself.
    const { docs } = await req.payload.find({
      collection: "products",
      where: { id: { equals: doc.id } },
      locale: "es",
      depth: 0,
      limit: 1,
      pagination: false,
      select: { name: true },
      req,
    });
    return docs[0]?.name ?? (typeof doc.name === "string" ? doc.name : `#${String(doc.id)}`);
  },
});

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
      // F-011 HU-1: create the attribute combinations that have no variant yet, in one transaction.
      path: "/:id/generate-variants",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const id = req.routeParams?.id as string | undefined;
        const body = (req.json ? await req.json().catch(() => ({})) : {}) as { price?: unknown };
        const price = Number(body.price);
        if (!id || !isValidPrice(price)) {
          return Response.json(
            { error: "Indica un precio en CHF mayor que 0, con 2 decimales como máximo." },
            { status: 400 },
          );
        }
        const product = await req.payload.findByID({
          collection: "products",
          id,
          depth: 0,
          locale: "es",
          req,
        });
        const options = (product.options ?? []) as ProductOption[];
        const variants = (
          await req.payload.find({
            collection: "variants",
            where: { product: { equals: id } },
            depth: 0,
            pagination: false,
            req,
          })
        ).docs;
        // Without attributes a product has a single variant (CA-1).
        if (options.length === 0 && variants.length > 0) return Response.json({ created: 0 });
        const missing = missingCombinations(options, variants);
        const taken = new Set(
          (
            await req.payload.find({
              collection: "variants",
              depth: 0,
              pagination: false,
              select: { sku: true },
              req,
            })
          ).docs.map((variant) => variant.sku),
        );
        const shouldCommit = await initTransaction(req);
        try {
          for (const combo of missing) {
            const sku = suggestSku(product.slug ?? product.name, combo, taken);
            taken.add(sku);
            await req.payload.create({
              collection: "variants",
              data: { product: product.id, sku, price, active: true, ...combo },
              depth: 0,
              req,
            });
          }
          if (shouldCommit) await commitTransaction(req);
        } catch (error) {
          await killTransaction(req);
          throw error;
        }
        return Response.json({ created: missing.length });
      },
    },
    {
      path: "/:id/readiness",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const id = req.routeParams?.id as string | undefined;
        const readiness = await readinessOf(req, id);
        // F-011 edge case: variants switched off (e.g. their attribute value was removed).
        const inactive = id
          ? (
              await req.payload.find({
                collection: "variants",
                where: { and: [{ product: { equals: id } }, { active: { equals: false } }] },
                depth: 0,
                pagination: false,
                req,
              })
            ).docs.map((variant) => variant.sku)
          : [];
        return Response.json({
          ready: readiness.ready,
          lines: formatMissing(readiness.missing),
          notices: inactive.length
            ? [`Variantes desactivadas (${inactive.length}): ${inactive.join(", ")}.`]
            : [],
        });
      },
    },
  ],
  fields: [
    {
      name: "auditHistory",
      type: "ui",
      admin: {
        position: "sidebar",
        custom: { entity: "products" },
        components: { Field: "/components/admin/AuditHistoryLink#AuditHistoryLink" },
      },
    },
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
      name: "gallery",
      type: "array",
      label: "Fotos",
      labels: { singular: "Foto", plural: "Fotos" },
      maxRows: MAX_PHOTOS,
      admin: {
        description:
          "Hasta 10. La primera es la principal. Reordénalas arrastrando o con el menú de cada foto. Marca las variantes que muestra cada foto; sin marcar, vale para todas.",
      },
      fields: [
        { name: "image", type: "upload", relationTo: "media", label: "Foto", required: true },
        {
          name: "variants",
          type: "relationship",
          relationTo: "variants",
          hasMany: true,
          label: "Variantes de esta foto",
          admin: {
            custom: {
              sameDocument: "product",
              emptyText: "Guarda el producto y crea sus variantes para poder asignarlas.",
            },
            components: { Field: "/components/admin/CheckboxRelationship#CheckboxRelationship" },
          },
        },
      ],
    },
    {
      name: "options",
      type: "array",
      label: "Atributos de las variantes",
      labels: { singular: "Atributo", plural: "Atributos" },
      maxRows: ATTRIBUTES.length,
      admin: {
        description:
          "Tamaño, aroma o color: de 0 a 3. Sin atributos, el producto tiene una sola variante. Si quitas un atributo o un valor, sus variantes se desactivan (no se borran).",
      },
      fields: [
        {
          name: "attribute",
          type: "select",
          label: "Atributo",
          required: true,
          options: ATTRIBUTES.map((value) => ({ value, label: ATTRIBUTE_NAMES[value] })),
          admin: { components: { Field: NATIVE_SELECT } },
        },
        {
          name: "values",
          type: "array",
          label: "Valores",
          labels: { singular: "Valor", plural: "Valores" },
          minRows: 1,
          fields: [
            {
              type: "row",
              fields: [
                {
                  name: "label",
                  type: "text",
                  label: "Etiqueta",
                  localized: true,
                  required: true,
                  admin: { width: "60%" },
                },
                {
                  name: "code",
                  type: "text",
                  label: "Código",
                  admin: {
                    width: "40%",
                    description: "Se genera desde la etiqueta en español. Las variantes lo usan.",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "variants",
      type: "join",
      collection: "variants",
      on: "product",
      label: "Variantes",
      admin: {
        defaultColumns: ["sku", "size", "scent", "color", "price", "active"],
        description: "Con atributos, «Generar variantes» crea las combinaciones que falten.",
      },
    },
    {
      name: "generateVariants",
      type: "ui",
      admin: { components: { Field: "/components/admin/GenerateVariants#GenerateVariants" } },
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
    beforeValidate: [limitPhotos],
    beforeChange: [normalizeOptions, enforcePublishReadiness],
    // CA-8: a product's variants go with it. F-033 blocks this once orders reference them.
    beforeDelete: [
      async ({ id, req }) => {
        // F-013 D-3: stock history keeps its variants; archive the product instead.
        const { docs } = await req.payload.find({
          collection: "variants",
          where: { product: { equals: id } },
          depth: 0,
          pagination: false,
          select: {},
          req,
        });
        if (
          await hasMovements(
            req.payload,
            docs.map((variant) => variant.id),
          )
        ) {
          throw new APIError(PRODUCT_HAS_STOCK_HISTORY, 400, null, true);
        }
        req.context.deletingProduct = true;
        await req.payload.delete({
          collection: "variants",
          where: { product: { equals: id } },
          req,
        });
      },
    ],
    afterChange: [
      // F-011 edge case: variants that use a removed attribute or value are switched off.
      async ({ doc, previousDoc, req }) => {
        const removed = affectedByRemoval(
          (previousDoc as ProductData | undefined)?.options as ProductOption[] | undefined,
          (doc as ProductData).options as ProductOption[] | undefined,
          (
            await req.payload.find({
              collection: "variants",
              where: { and: [{ product: { equals: idOf(doc) } }, { active: { equals: true } }] },
              depth: 0,
              pagination: false,
              req,
            })
          ).docs,
        );
        for (const variant of removed) {
          await req.payload.update({
            collection: "variants",
            id: variant.id,
            data: { active: false },
            depth: 0,
            req,
          });
        }
        expireCatalog();
      },
      audit.afterChange,
    ],
    afterDelete: [() => expireCatalog(), audit.afterDelete],
  },
};
