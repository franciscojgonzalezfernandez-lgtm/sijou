import { slugify } from "./slug";
import type { Combination } from "./variant-options";
import { ATTRIBUTES } from "./variant-options";

/** SKUs are compared and stored in one form so uniqueness does not depend on case (F-011 CA-2). */
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, "-").replace(/-{2,}/g, "-");
}

/**
 * Suggested SKU for a generated variant: the product slug plus its values, e.g.
 * `CREMA-LAVANDA-50-ML`, with `-2`, `-3`… when it is already taken.
 */
export function suggestSku(base: string, combo: Combination, taken: ReadonlySet<string>): string {
  const parts = [base, ...ATTRIBUTES.flatMap((attribute) => combo[attribute] ?? [])];
  const stem = normalizeSku(slugify(parts.join(" ")) || "SKU");
  let candidate = stem;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${stem}-${n}`;
  return candidate;
}
