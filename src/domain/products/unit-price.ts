import { toRappen } from "./price";

export const NET_UNITS = ["ml", "g"] as const;

export type NetUnit = (typeof NET_UNITS)[number];

/** Net quantity and unit go together: both or neither, and the quantity is positive. */
export function isValidNetQuantity(
  quantity: number | null | undefined,
  unit: NetUnit | null | undefined,
): boolean {
  const hasQuantity = quantity !== null && quantity !== undefined;
  if (!hasQuantity && !unit) return true;
  return hasQuantity && Boolean(unit) && Number.isFinite(quantity) && quantity > 0;
}

/**
 * Price per 100 ml or per 100 g, in Rappen (F-011 CA-2, D-2). Null when the variant has no net
 * quantity. Where and how it is shown is decided by F-022.
 */
export function unitPrice(
  price: number,
  quantity: number | null | undefined,
  unit: NetUnit | null | undefined,
): { rappen: number; per: `100 ${NetUnit}` } | null {
  if (!unit || !quantity || !isValidNetQuantity(quantity, unit)) return null;
  return { rappen: Math.round((toRappen(price) * 100) / quantity), per: `100 ${unit}` };
}

/** The reference ("before") price is optional, but when set it is higher than the price. */
export function isValidCompareAtPrice(
  price: number | null | undefined,
  compareAt: number | null | undefined,
): boolean {
  if (compareAt === null || compareAt === undefined) return true;
  return typeof price === "number" && toRappen(compareAt) > toRappen(price);
}
