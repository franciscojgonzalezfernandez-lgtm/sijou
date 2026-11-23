import type { Locale } from "./locales";

/**
 * Swiss regional conventions per language (F-003 CA-8, decision D-1: follow the language).
 * en/de → "CHF 24.90", es → "24,90 CHF".
 */
const REGION_TAG: Record<Locale, string> = { en: "en-CH", de: "de-CH", es: "es-CH" };

export function formatPrice(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(REGION_TAG[locale], { style: "currency", currency: "CHF" }).format(
    amount,
  );
}

export function formatDate(date: Date, locale: Locale, style: "short" | "long" = "long"): string {
  return new Intl.DateTimeFormat(REGION_TAG[locale], {
    dateStyle: style,
    timeZone: "Europe/Zurich",
  }).format(date);
}
