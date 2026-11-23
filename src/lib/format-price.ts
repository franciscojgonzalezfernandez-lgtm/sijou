/**
 * Formats an amount in Swiss francs for display, e.g. 24.9 → "CHF 24.90".
 * Placeholder utility proving the unit-test gate (F-001); real pricing lives in F-017.
 */
export function formatChf(amount: number, locale: "en" | "de" | "es" = "en"): string {
  const localeTag = { en: "en-CH", de: "de-CH", es: "es-CH" }[locale];
  return new Intl.NumberFormat(localeTag, { style: "currency", currency: "CHF" }).format(amount);
}

export const broken: number = "not a number";
