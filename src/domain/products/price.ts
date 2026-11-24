/**
 * Prices are stored in CHF with at most 2 decimals. Domain arithmetic works in integer
 * Rappen (cents) so floating-point errors never reach a total (constitution IV).
 */
export function toRappen(chf: number): number {
  return Math.round(chf * 100);
}

/** True when the CHF amount is positive and has at most 2 decimals. */
export function isValidPrice(chf: unknown): chf is number {
  return (
    typeof chf === "number" &&
    Number.isFinite(chf) &&
    chf > 0 &&
    Math.abs(chf * 100 - Math.round(chf * 100)) < 1e-6
  );
}
