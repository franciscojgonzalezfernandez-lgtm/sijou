/** Storefront languages (RF-I18N-01). Shared with Payload's field localization from F-010. */
export const locales = ["en", "de", "es"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
