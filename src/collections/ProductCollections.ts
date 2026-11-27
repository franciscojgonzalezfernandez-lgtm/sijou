import { ValidationError, type CollectionConfig, type DateField } from "payload";

import { isValidVisibilityRange } from "@/domain/catalog/taxonomy";

import { expireCatalog } from "./shared";
import { enforceTaxonomyPublish, taxonomyFields } from "./taxonomy";

type Data = Record<string, unknown>;

export const BAD_RANGE = "La fecha de fin debe ser posterior a la de inicio.";

function visibilityDate(name: string, label: string, description: string): DateField {
  return {
    name,
    type: "date",
    label,
    admin: {
      position: "sidebar",
      description,
      components: { Field: "/components/admin/ZurichDateTime#ZurichDateTime" },
    },
  };
}

/** Collections (F-012 HU-2): a hand-ordered list of products, optionally only between dates. */
export const ProductCollections: CollectionConfig = {
  slug: "product-collections",
  labels: { singular: "Colección", plural: "Colecciones" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "status", "visibleFrom", "visibleUntil"],
  },
  fields: [
    visibilityDate("visibleFrom", "Visible desde", "Hora de Zúrich. Vacío = desde ya."),
    visibilityDate(
      "visibleUntil",
      "Visible hasta",
      "Hora de Zúrich, sin incluir. Vacío = sin fin.",
    ),
    ...taxonomyFields("product-collections"),
    {
      name: "products",
      type: "relationship",
      relationTo: "products",
      hasMany: true,
      label: "Productos",
      admin: {
        description: "En este orden se muestran en la tienda.",
        components: { Field: "/components/admin/OrderedRelationship#OrderedRelationship" },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc, req }) => {
        const pending = (data ?? {}) as Data;
        const pick = (field: string) =>
          (field in pending ? pending[field] : (originalDoc as Data | undefined)?.[field]) as
            string | null | undefined;
        if (!isValidVisibilityRange(pick("visibleFrom"), pick("visibleUntil"))) {
          throw new ValidationError({
            collection: "product-collections",
            errors: [{ path: "visibleUntil", message: BAD_RANGE }],
            req,
          });
        }
        return data;
      },
    ],
    beforeChange: [enforceTaxonomyPublish("product-collections")],
    afterChange: [() => expireCatalog()],
    afterDelete: [() => expireCatalog()],
  },
};
