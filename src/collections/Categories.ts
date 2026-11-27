import {
  APIError,
  ValidationError,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from "payload";

import {
  breadcrumbLabel,
  childrenOf,
  parentProblemMessages,
  productsLeftWithoutCategory,
  reservedSlugLocales,
  validateParent,
} from "@/domain/catalog/tree";
import { routing } from "@/i18n/routing";

import { expireCatalog } from "./shared";
import {
  enforceTaxonomyPublish,
  forgetCategoryTree,
  idOf,
  loadCategoryTree,
  mergedTexts,
  taxonomyFields,
} from "./taxonomy";

type Data = Record<string, unknown>;

export const HAS_CHILDREN = "Tiene subcategorías: muévelas o bórralas antes.";

/**
 * CA-1: at most 3 levels, never inside itself or one of its subcategories. A root category's
 * slug cannot hide a fixed page of the shop (`/es/productos`, `/de/katalog`…).
 */
const validateTree: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  const pending = (data ?? {}) as Data;
  const id = idOf(originalDoc);
  const parent =
    "parent" in pending
      ? (idOf(pending.parent) ?? null)
      : (idOf((originalDoc as Data | undefined)?.parent) ?? null);
  const errors: { path: string; message: string }[] = [];

  const problem = validateParent(await loadCategoryTree(req), id ?? null, parent);
  if (problem) errors.push({ path: "parent", message: parentProblemMessages[problem] });

  if (parent === null) {
    const { slug } = await mergedTexts(req, "categories", id, pending);
    const reserved = reservedSlugLocales(routing.pathnames, slug);
    if (reserved.length > 0) {
      errors.push({
        path: "slug",
        message: `Este slug es una página fija de la tienda (${reserved.join(", ")}). Elige otro.`,
      });
    }
  }

  if (errors.length > 0) throw new ValidationError({ collection: "categories", errors, req });
  return data;
};

/** Categories (F-012): a tree of up to 3 levels, with texts, banner, SEO and visibility. */
export const Categories: CollectionConfig = {
  slug: "categories",
  labels: { singular: "Categoría", plural: "Categorías" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["breadcrumb", "status", "position"],
    description:
      "Hasta 3 niveles. Para mover una categoría, cambia su categoría superior; para ordenarla entre sus hermanas, su orden.",
  },
  defaultSort: "position",
  endpoints: [
    {
      // CA-5: what deleting would do, shown before the delete is confirmed (admins only).
      path: "/:id/delete-impact",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const id = idOf(req.routeParams?.id);
        if (id === undefined) return Response.json({ error: "Not found" }, { status: 404 });
        const tree = await loadCategoryTree(req);
        const { docs } = await req.payload.find({
          collection: "products",
          where: { categories: { contains: id } },
          locale: "es",
          depth: 0,
          pagination: false,
          select: { name: true, categories: true },
          req,
        });
        const left = productsLeftWithoutCategory(
          docs.map((doc) => ({
            id: doc.id,
            name: doc.name,
            categories: (doc.categories ?? []).map(idOf).filter((c) => c !== undefined),
          })),
          id,
        );
        return Response.json({
          children: childrenOf(tree, id).map((child) => breadcrumbLabel(tree, child.id)),
          products: docs.length,
          orphans: left.map((product) => ({ id: product.id, name: product.name })),
        });
      },
    },
  ],
  fields: [
    {
      name: "deleteImpact",
      type: "ui",
      admin: {
        position: "sidebar",
        components: { Field: "/components/admin/DeleteImpact#DeleteImpact" },
      },
    },
    {
      name: "parent",
      type: "relationship",
      relationTo: "categories",
      label: "Categoría superior",
      index: true,
      admin: {
        position: "sidebar",
        description: "Vacía = categoría principal. Máximo 3 niveles.",
        custom: { excludeBranch: true, titleField: "breadcrumb" },
        components: { Field: "/components/admin/NativeRelationship#NativeRelationship" },
      },
    },
    {
      name: "position",
      type: "number",
      label: "Orden",
      required: true,
      defaultValue: 0,
      min: 0,
      admin: {
        position: "sidebar",
        step: 1,
        description: "Entre sus hermanas, menor primero.",
      },
      validate: (value: number | null | undefined) =>
        value === null || value === undefined || (Number.isInteger(value) && value >= 0)
          ? true
          : "Un número entero, 0 o mayor.",
    },
    ...taxonomyFields("categories"),
    {
      name: "breadcrumb",
      type: "text",
      label: "Ruta",
      virtual: true,
      admin: { readOnly: true, hidden: true },
      hooks: {
        afterRead: [
          async ({ originalDoc, req }) => {
            const id = idOf(originalDoc);
            return id === undefined ? "" : breadcrumbLabel(await loadCategoryTree(req, true), id);
          },
        ],
      },
    },
  ],
  hooks: {
    beforeValidate: [validateTree],
    beforeChange: [enforceTaxonomyPublish("categories")],
    // CA-5: never leaves subcategories without a parent. Products stay; only the link goes.
    beforeDelete: [
      async ({ id, req }) => {
        const tree = await loadCategoryTree(req);
        if (childrenOf(tree, Number(id)).length > 0)
          throw new APIError(HAS_CHILDREN, 400, null, true);
      },
    ],
    afterChange: [
      ({ req }) => {
        forgetCategoryTree(req);
        expireCatalog();
      },
    ],
    afterDelete: [
      ({ req }) => {
        forgetCategoryTree(req);
        expireCatalog();
      },
    ],
  },
};
