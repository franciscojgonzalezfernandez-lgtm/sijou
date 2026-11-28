import type { CollectionConfig } from "payload";

import { REASONS, REFERENCES } from "@/domain/stock/movements";

const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

export const STOCK_MOVEMENTS = "stock-movements";

/**
 * Stock history (F-013 CA-6). Append-only: `src/lib/stock.ts` inserts the rows in the same
 * transaction as the change, nobody can create, edit or delete them through the admin or the
 * API, and a Postgres trigger rejects any UPDATE or DELETE. Variant and lot are plain ids plus
 * the SKU and code at the time, without foreign keys, like the audit log (plan D-3).
 */
export const StockMovements: CollectionConfig = {
  slug: STOCK_MOVEMENTS,
  labels: { singular: "Movimiento de stock", plural: "Movimientos de stock" },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: false,
  lockDocuments: false,
  admin: {
    group: "Catálogo",
    useAsTitle: "lotCode",
    defaultColumns: ["at", "variantSku", "lotCode", "delta", "reason", "actorEmail"],
    description: "Todo lo que ha entrado y salido de cada lote. Solo lectura.",
    pagination: { defaultLimit: 25 },
  },
  defaultSort: "-at",
  fields: [
    {
      name: "at",
      type: "date",
      label: "Fecha",
      required: true,
      index: true,
      admin: { components: { Field: "/components/admin/ReadOnlyDate#ReadOnlyDate" } },
    },
    {
      type: "row",
      fields: [
        {
          name: "variantId",
          type: "number",
          label: "Id de la variante",
          required: true,
          index: true,
        },
        { name: "variantSku", type: "text", label: "SKU", required: true },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "lotId", type: "number", label: "Id del lote", index: true },
        { name: "lotCode", type: "text", label: "Lote" },
      ],
    },
    {
      type: "row",
      fields: [
        { name: "delta", type: "number", label: "Cantidad", required: true },
        { name: "quantityAfter", type: "number", label: "Queda en el lote", required: true },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "reason",
          type: "select",
          label: "Motivo",
          required: true,
          index: true,
          options: options(REASONS),
          admin: { components: { Field: NATIVE_SELECT } },
        },
        {
          name: "refType",
          type: "select",
          label: "Referencia",
          required: true,
          options: options(REFERENCES),
          admin: { components: { Field: NATIVE_SELECT } },
        },
        { name: "refId", type: "text", label: "Id de la referencia" },
      ],
    },
    { name: "comment", type: "textarea", label: "Comentario" },
    {
      type: "row",
      fields: [
        {
          name: "actorEmail",
          type: "text",
          label: "Usuario",
          admin: { description: "Vacío = Sistema (ventas, caducidades, seed)." },
        },
        { name: "actorId", type: "number", label: "Id del usuario" },
      ],
    },
  ],
};
