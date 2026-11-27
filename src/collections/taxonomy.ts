import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionSlug,
  type Field,
  type PayloadRequest,
} from "payload";

import { formatTaxonomyMissing, taxonomyReadiness } from "@/domain/catalog/taxonomy";
import {
  buildTree,
  type CategoryNode,
  type CategoryTree,
  type Localized,
  taxonomyStatusLabels,
  taxonomyStatuses,
  type TaxonomyStatus,
} from "@/domain/catalog/tree";

import { slugField } from "./shared";

const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

type Data = Record<string, unknown>;

export function idOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return undefined;
}

/** Fields shared by categories and collections (F-012): texts, banner, SEO and status. */
export function taxonomyFields(collection: CollectionSlug): Field[] {
  return [
    {
      name: "status",
      type: "select",
      label: "Estado",
      required: true,
      defaultValue: "draft",
      index: true,
      options: taxonomyStatuses.map((value) => ({ value, label: taxonomyStatusLabels[value] })),
      admin: {
        position: "sidebar",
        description:
          "Solo las publicadas se ven en la tienda. Para publicar, completa los 3 idiomas.",
        components: { Field: NATIVE_SELECT },
      },
    },
    { name: "name", type: "text", label: "Nombre", localized: true, required: true },
    slugField(collection),
    { name: "description", type: "richText", label: "Texto descriptivo", localized: true },
    {
      name: "headerImage",
      type: "upload",
      relationTo: "media",
      label: "Imagen de cabecera",
      admin: { description: "Su texto alternativo es el de la foto, en cada idioma." },
    },
    {
      name: "seo",
      type: "group",
      label: "SEO",
      fields: [
        {
          name: "title",
          type: "text",
          label: "Título SEO",
          localized: true,
          admin: { description: "Si lo dejas vacío, se usa el nombre." },
        },
        {
          name: "description",
          type: "textarea",
          label: "Descripción SEO",
          localized: true,
          admin: { description: "Si la dejas vacía, se usa el primer párrafo del texto." },
        },
      ],
    },
  ];
}

/**
 * The stored document's `name` and `slug` in every language, with the data being saved in
 * `req.locale` laid over them.
 */
export async function mergedTexts(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: number | undefined,
  pending: Data,
): Promise<{ name: Localized; slug: Localized }> {
  // The database adapter, not the Local API: `find({ locale: "all", req })` would set
  // `req.locale` to "all" for the rest of the save, and the data would go to the wrong language.
  const stored = id
    ? (
        await req.payload.db.find<Data>({
          collection,
          where: { id: { equals: id } },
          locale: "all",
          limit: 1,
          pagination: false,
          req,
        })
      ).docs[0]
    : undefined;
  const locale = typeof req.locale === "string" ? req.locale : undefined;
  const merge = (field: "name" | "slug"): Localized => {
    const result = { ...((stored?.[field] as Localized | undefined) ?? {}) };
    if (!(field in pending)) return result;
    const value = pending[field];
    if (locale === "all" && typeof value === "object" && value !== null) {
      return { ...result, ...(value as Localized) };
    }
    if (locale && locale !== "all") return { ...result, [locale]: value as string | null };
    return result;
  };
  return { name: merge("name"), slug: merge("slug") };
}

/** CA-3/CA-4: publishing needs name and slug in es, en and de; the error lists what is missing. */
export function enforceTaxonomyPublish(collection: CollectionSlug): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req }) => {
    if ((data as Data).status !== "published") return data;
    const readiness = taxonomyReadiness(
      await mergedTexts(req, collection, idOf(originalDoc), data as Data),
    );
    if (readiness.ready) return data;
    throw new ValidationError({
      collection,
      errors: [
        {
          path: "status",
          message: `No se puede publicar. ${formatTaxonomyMissing(readiness.missing).join(" ")}`,
        },
      ],
      req,
    });
  };
}

const TREE_KEY = "categoryTree";

/**
 * Every category with its links and texts in every language, read straight from the database
 * (no hooks: the virtual breadcrumb reads the tree, and must not trigger itself).
 * `cached` reuses the tree within one request, for reads only.
 */
export async function loadCategoryTree(req: PayloadRequest, cached = false): Promise<CategoryTree> {
  const hit = req.context[TREE_KEY] as CategoryTree | undefined;
  if (cached && hit) return hit;
  const { docs } = await req.payload.db.find<Data>({
    collection: "categories",
    locale: "all",
    pagination: false,
    limit: 0,
    where: {},
    req,
  });
  const tree = buildTree(
    docs.map((doc): CategoryNode => ({
      id: Number(doc.id),
      parent: idOf(doc.parent) ?? null,
      position: typeof doc.position === "number" ? doc.position : 0,
      status: (doc.status as TaxonomyStatus | undefined) ?? "draft",
      names: (doc.name as Localized | undefined) ?? {},
      slugs: (doc.slug as Localized | undefined) ?? {},
    })),
  );
  req.context[TREE_KEY] = tree;
  return tree;
}

export function forgetCategoryTree(req: PayloadRequest): void {
  delete req.context[TREE_KEY];
}
