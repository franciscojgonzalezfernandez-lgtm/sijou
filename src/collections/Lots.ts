import {
  ValidationError,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type FieldAccess,
  type PayloadRequest,
} from "payload";

import { CODE_MAX_LENGTH } from "@/domain/stock/movements";
import { adjustLot, lotsOf, receiveLot, StockError } from "@/lib/stock";

import { auditHooks } from "./audit";
import { expireCatalog } from "./shared";

export const LOTS = "lots";

const never: FieldAccess = () => false;

function idOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return undefined;
}

async function body(req: PayloadRequest): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await req.json?.();
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Errors as Payload's own validation errors, so the panel reads them the same way. */
function refused(error: unknown): Response {
  if (error instanceof StockError) {
    return Response.json({ errors: error.errors }, { status: 400 });
  }
  throw error;
}

/** D-2: when the admin renames a lot, the code stays unique within its variant. */
const uniqueCode: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (typeof data?.code !== "string") return data;
  data.code = data.code.trim();
  const original = originalDoc as { id?: number; variant?: unknown } | undefined;
  const variant = idOf(original?.variant ?? (data as { variant?: unknown }).variant);
  if (variant === undefined) return data;
  const { totalDocs } = await req.payload.count({
    collection: LOTS,
    where: {
      and: [
        { variant: { equals: variant } },
        { code: { equals: data.code } },
        ...(original?.id ? [{ id: { not_equals: original.id } }] : []),
      ],
    },
    req,
  });
  if (totalDocs > 0) {
    throw new ValidationError({
      collection: LOTS,
      errors: [{ path: "code", message: "Esta variante ya tiene un lote con este código." }],
      req,
    });
  }
  return data;
};

/** F-018: renaming a lot or changing its expiry is audited; quantities live in movements. */
const audit = auditHooks({
  entity: "lots",
  label: (doc) => (typeof doc.code === "string" ? doc.code : `#${String(doc.id)}`),
});

/**
 * Lots of a variant (F-013 CA-1, CA-1b). Created and adjusted only through the stock endpoints
 * below, which run in a transaction and write the movement (constitution IV). The admin can fix
 * a lot's code or expiry; quantities, variant and receipt date are read-only.
 */
export const Lots: CollectionConfig = {
  slug: LOTS,
  labels: { singular: "Lote", plural: "Lotes" },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: () => false,
  },
  admin: {
    group: "Catálogo",
    useAsTitle: "code",
    defaultColumns: ["code", "variant", "expiresAt", "quantityAvailable", "quantityInitial"],
    description:
      "Busca aquí un código de lote. Los lotes se registran y se ajustan desde la ficha de la variante.",
  },
  defaultSort: "expiresAt",
  endpoints: [
    {
      // HU-1: register a lot for a variant.
      path: "/receive",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const data = await body(req);
        const variantId = idOf(data.variant);
        if (variantId === undefined) {
          return Response.json(
            { errors: [{ path: "variant", message: "La variante no existe." }] },
            { status: 400 },
          );
        }
        try {
          const result = await receiveLot(req.payload, req.user, {
            variantId,
            code: data.code,
            quantity: data.quantity,
            expiresAt: data.expiresAt,
          });
          expireCatalog();
          return Response.json(result, { status: 201 });
        } catch (error) {
          return refused(error);
        }
      },
    },
    {
      // HU-2: a manual adjustment of one lot.
      path: "/:id/adjust",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const lotId = idOf(req.routeParams?.id);
        if (lotId === undefined) return Response.json({ error: "Not found" }, { status: 404 });
        const data = await body(req);
        try {
          const lot = await adjustLot(req.payload, req.user, {
            lotId,
            delta: data.delta,
            reason: data.reason,
            comment: data.comment,
          });
          expireCatalog();
          return Response.json({ lot });
        } catch (error) {
          return refused(error);
        }
      },
    },
    {
      // CA-7: a variant's lots in FEFO order, for the Stock block.
      path: "/of/:variant",
      method: "get",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const variantId = idOf(req.routeParams?.variant);
        if (variantId === undefined) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json({ lots: await lotsOf(req.payload, variantId) });
      },
    },
  ],
  fields: [
    {
      name: "auditHistory",
      type: "ui",
      admin: {
        position: "sidebar",
        custom: { entity: "lots" },
        components: { Field: "/components/admin/AuditHistoryLink#AuditHistoryLink" },
      },
    },
    {
      name: "variant",
      type: "relationship",
      relationTo: "variants",
      label: "Variante",
      required: true,
      index: true,
      access: { update: never },
      admin: { readOnly: true },
    },
    {
      name: "code",
      type: "text",
      label: "Código de lote",
      required: true,
      maxLength: CODE_MAX_LENGTH,
      index: true,
    },
    {
      type: "row",
      fields: [
        {
          name: "quantityInitial",
          type: "number",
          label: "Cantidad inicial",
          required: true,
          min: 1,
          access: { update: never },
          admin: { readOnly: true, width: "50%" },
        },
        {
          name: "quantityAvailable",
          type: "number",
          label: "Cantidad disponible",
          required: true,
          min: 0,
          access: { update: never },
          admin: {
            readOnly: true,
            width: "50%",
            description: "Cambia solo con un ajuste o una venta, desde la ficha de la variante.",
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "receivedAt",
          type: "date",
          label: "Entrada",
          required: true,
          access: { update: never },
          admin: {
            width: "50%",
            components: { Field: "/components/admin/ReadOnlyDate#ReadOnlyDate" },
          },
        },
        {
          name: "expiresAt",
          type: "date",
          label: "Caducidad",
          index: true,
          admin: {
            width: "50%",
            description: "Opcional. Se vende hasta ese día incluido.",
            components: { Field: "/components/admin/ZurichDay#ZurichDay" },
          },
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [uniqueCode],
    afterChange: [() => expireCatalog(), audit.afterChange],
  },
};
