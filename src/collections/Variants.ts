import type { CollectionConfig } from "payload";

import { isValidPrice } from "@/domain/products/price";

import { expireCatalog } from "./shared";

/**
 * Minimal sellable variant (F-010 D-1). Its own collection so stock (F-013), orders (F-033)
 * and reservations (F-060) can reference it with a stable key. F-011 adds attributes, EAN,
 * reference price, weight and net quantity.
 */
export const Variants: CollectionConfig = {
  slug: "variants",
  labels: { singular: "Variante", plural: "Variantes" },
  admin: { useAsTitle: "sku", defaultColumns: ["sku", "product", "price", "active"] },
  fields: [
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      label: "Producto",
      required: true,
      index: true,
    },
    { name: "sku", type: "text", label: "SKU", required: true, unique: true },
    {
      name: "price",
      type: "number",
      label: "Precio (CHF)",
      required: true,
      min: 0.01,
      admin: { step: 0.05 },
      validate: (value: number | null | undefined) =>
        isValidPrice(value) ? true : "Precio en CHF mayor que 0, con 2 decimales como máximo.",
    },
    {
      name: "active",
      type: "checkbox",
      label: "Activa",
      defaultValue: true,
      admin: { description: "Desactívala para dejar de venderla sin borrarla." },
    },
  ],
  hooks: {
    afterChange: [() => expireCatalog()],
    afterDelete: [() => expireCatalog()],
  },
};
