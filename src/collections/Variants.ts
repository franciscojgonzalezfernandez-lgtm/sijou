import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionConfig,
  type Field,
} from "payload";

import { isValidGtin } from "@/domain/products/ean";
import { isValidPrice } from "@/domain/products/price";
import { normalizeSku } from "@/domain/products/sku";
import { isValidCompareAtPrice, isValidNetQuantity, NET_UNITS } from "@/domain/products/unit-price";
import {
  ATTRIBUTE_NAMES,
  ATTRIBUTES,
  combinationKey,
  type ProductOption,
  type VariantValues,
  variantMatchesOptions,
} from "@/domain/products/variant-options";

import { availableStock, zurichToday } from "@/domain/stock/lots";
import { hasMovements, lotsByVariant } from "@/lib/stock";

import { auditHooks } from "./audit";
import { expireCatalog } from "./shared";

export const HAS_STOCK_HISTORY = "Tiene historial de stock: desactívala en vez de borrarla.";

const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

function idOf(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return undefined;
}

const attributeFields: Field[] = ATTRIBUTES.map((attribute) => ({
  name: attribute,
  type: "text",
  label: ATTRIBUTE_NAMES[attribute],
  index: true,
  admin: {
    width: "33%",
    custom: { attribute },
    components: { Field: "/components/admin/VariantValueSelect#VariantValueSelect" },
  },
}));

/**
 * F-011 CA-1: a variant's values match its product's attributes, no two variants of a product
 * share a combination, and a product without attributes has a single variant.
 */
const enforceCombination: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const variant = { ...(originalDoc as Record<string, unknown>), ...data } as VariantValues & {
    product?: unknown;
    sku?: string;
    active?: boolean | null;
  };
  if (typeof data.sku === "string") data.sku = normalizeSku(data.sku);
  for (const attribute of ATTRIBUTES) {
    if (data[attribute] === "") data[attribute] = null;
  }

  const productId = idOf(variant.product);
  if (productId === undefined) return data;
  const product = await req.payload.findByID({
    collection: "products",
    id: productId,
    depth: 0,
    locale: "es",
    req,
  });
  const options = (product.options ?? []) as ProductOption[];
  const siblings = (
    await req.payload.find({
      collection: "variants",
      where: {
        and: [
          { product: { equals: productId } },
          ...(idOf(originalDoc) !== undefined ? [{ id: { not_equals: idOf(originalDoc) } }] : []),
        ],
      },
      depth: 0,
      pagination: false,
      req,
    })
  ).docs as VariantValues[];

  const errors: { path: string; message: string }[] = [];
  if (options.length === 0 && siblings.length > 0) {
    errors.push({
      path: "product",
      message: "Este producto no tiene atributos: añade uno para tener más de una variante.",
    });
  } else if (variant.active !== false && !variantMatchesOptions(variant, options)) {
    errors.push({
      path:
        ATTRIBUTES.find((attribute) => options.some((o) => o.attribute === attribute)) ?? "product",
      message: "Elige un valor de cada atributo del producto, y solo de esos.",
    });
  } else if (
    options.length > 0 &&
    siblings.some((sibling) => combinationKey(sibling) === combinationKey(variant))
  ) {
    errors.push({
      path: options[0]?.attribute ?? "product",
      message: "Ya hay otra variante de este producto con esta combinación.",
    });
  }
  if (errors.length > 0) throw new ValidationError({ collection: "variants", errors, req });
  return data;
};

/**
 * Sellable variant (F-010 D-1, completed in F-011). Its own collection so stock (F-013), orders
 * (F-033) and reservations (F-060) can reference it with a stable key.
 */
/** F-018 CA-3: prices and every other change, labelled by SKU. */
const audit = auditHooks({
  entity: "variants",
  label: (doc) => (typeof doc.sku === "string" ? doc.sku : `#${String(doc.id)}`),
});

export const Variants: CollectionConfig = {
  slug: "variants",
  labels: { singular: "Variante", plural: "Variantes" },
  admin: {
    useAsTitle: "sku",
    defaultColumns: [
      "sku",
      "product",
      "size",
      "scent",
      "color",
      "price",
      "stockAvailable",
      "active",
    ],
  },
  fields: [
    {
      name: "auditHistory",
      type: "ui",
      admin: {
        position: "sidebar",
        custom: { entity: "variants" },
        components: { Field: "/components/admin/AuditHistoryLink#AuditHistoryLink" },
      },
    },
    {
      name: "product",
      type: "relationship",
      relationTo: "products",
      label: "Producto",
      required: true,
      index: true,
      admin: {
        components: { Field: "/components/admin/ProductReference#ProductReference" },
      },
    },
    { type: "row", fields: attributeFields },
    {
      name: "sku",
      type: "text",
      label: "SKU",
      required: true,
      unique: true,
      admin: { description: "Único en toda la tienda. Se guarda en mayúsculas." },
    },
    {
      name: "ean",
      type: "text",
      label: "EAN",
      admin: { description: "Opcional. Código de barras de 8, 12, 13 o 14 cifras." },
      validate: (value: string | null | undefined) =>
        !value || isValidGtin(value.trim()) ? true : "EAN no válido: revisa las cifras.",
    },
    {
      type: "row",
      fields: [
        {
          name: "price",
          type: "number",
          label: "Precio (CHF)",
          required: true,
          min: 0.01,
          admin: { step: 0.05, width: "50%" },
          validate: (value: number | null | undefined) =>
            isValidPrice(value) ? true : "Precio en CHF mayor que 0, con 2 decimales como máximo.",
        },
        {
          name: "compareAtPrice",
          type: "number",
          label: "Precio de referencia «antes» (CHF)",
          admin: { step: 0.05, width: "50%", description: "Opcional. Mayor que el precio." },
          validate: (
            value: number | null | undefined,
            { siblingData }: { siblingData: Partial<{ price: number }> },
          ) => {
            if (value !== null && value !== undefined && !isValidPrice(value)) {
              return "Precio en CHF mayor que 0, con 2 decimales como máximo.";
            }
            return isValidCompareAtPrice(siblingData.price, value)
              ? true
              : "El precio de referencia tiene que ser mayor que el precio.";
          },
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "weightGrams",
          type: "number",
          label: "Peso con envase (g)",
          min: 1,
          admin: { step: 1, width: "33%" },
          validate: (value: number | null | undefined) =>
            value === null || value === undefined || (Number.isInteger(value) && value > 0)
              ? true
              : "Gramos enteros, mayor que 0.",
        },
        {
          name: "netQuantity",
          type: "number",
          label: "Cantidad neta",
          admin: { width: "33%", description: "Para el precio por 100 ml o 100 g." },
          validate: (
            value: number | null | undefined,
            { siblingData }: { siblingData: Partial<{ netUnit: "ml" | "g" | null }> },
          ) =>
            isValidNetQuantity(value, siblingData.netUnit)
              ? true
              : "Indica la cantidad (mayor que 0) y su unidad, o deja las dos vacías.",
        },
        {
          name: "netUnit",
          type: "select",
          label: "Unidad",
          options: NET_UNITS.map((unit) => ({ value: unit, label: unit })),
          admin: { width: "33%", components: { Field: NATIVE_SELECT } },
        },
      ],
    },
    {
      // F-013 CA-7: total, lots, history, and the forms to register and adjust stock.
      name: "stock",
      type: "ui",
      admin: { components: { Field: "/components/admin/StockPanel#StockPanel" } },
    },
    {
      // CA-2: filled in by afterOperation, for the list of variants.
      name: "stockAvailable",
      type: "number",
      label: "Stock",
      virtual: true,
      admin: {
        readOnly: true,
        position: "sidebar",
        description: "Unidades que se pueden vender ahora (lotes sin caducar).",
      },
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
    beforeChange: [enforceCombination],
    // D-3: stock history must not lose its variant; deactivate it instead.
    beforeDelete: [
      async ({ id, req }) => {
        if (await hasMovements(req.payload, [Number(id)])) {
          throw new APIError(HAS_STOCK_HISTORY, 400, null, true);
        }
      },
    ],
    // CA-2: available stock for the list column, one query per page of variants.
    afterOperation: [
      async ({ operation, result: output, req }) => {
        const result: unknown = output;
        if (operation !== "find" && operation !== "findByID") return result;
        const docs = (operation === "find" ? (result as { docs: unknown[] }).docs : [result]) as {
          id?: unknown;
          stockAvailable?: number;
        }[];
        const ids = docs.map((doc) => doc?.id).filter((id): id is number => typeof id === "number");
        if (ids.length === 0) return result;
        const lots = await lotsByVariant(req.payload, ids);
        const today = zurichToday();
        for (const doc of docs) {
          if (typeof doc?.id === "number")
            doc.stockAvailable = availableStock(lots.get(doc.id) ?? [], today);
        }
        return result;
      },
    ],
    afterChange: [() => expireCatalog(), audit.afterChange],
    // CA-5: a deleted variant leaves the gallery rows it was assigned to.
    afterDelete: [
      async ({ doc, req }) => {
        const productId = idOf((doc as { product?: unknown }).product);
        // The product itself is being deleted (CA-8 of F-010): nothing to tidy.
        if (productId !== undefined && !req.context.deletingProduct) {
          const product = await req.payload
            .findByID({ collection: "products", id: productId, depth: 0, req })
            .catch(() => null);
          const gallery = product?.gallery ?? [];
          if (gallery.some((row) => (row.variants ?? []).some((v) => idOf(v) === idOf(doc)))) {
            await req.payload.update({
              collection: "products",
              id: productId,
              data: {
                gallery: gallery.map((row) => ({
                  ...row,
                  variants: (row.variants ?? [])
                    .map(idOf)
                    .filter((v): v is number => typeof v === "number" && v !== idOf(doc)),
                })),
              },
              depth: 0,
              context: { skipPublishCheck: true },
              req,
            });
          }
        }
        expireCatalog();
      },
      audit.afterDelete,
    ],
  },
};
