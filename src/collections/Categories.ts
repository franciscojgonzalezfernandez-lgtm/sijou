import type { CollectionConfig } from "payload";

import { expireCatalog, slugField } from "./shared";

/** Minimal categories (F-010 D-1). F-012 adds the tree, texts, banner, SEO and visibility. */
export const Categories: CollectionConfig = {
  slug: "categories",
  labels: { singular: "Categoría", plural: "Categorías" },
  admin: { useAsTitle: "name", defaultColumns: ["name", "slug"] },
  fields: [
    { name: "name", type: "text", label: "Nombre", localized: true, required: true },
    slugField("categories"),
  ],
  hooks: {
    afterChange: [() => expireCatalog()],
    afterDelete: [() => expireCatalog()],
  },
};
