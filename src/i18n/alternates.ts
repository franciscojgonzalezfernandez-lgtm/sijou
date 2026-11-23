import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "./locales";

/** Absolute or root-relative path of the same page in each language. */
export type LocalizedPaths = Record<Locale, string>;

/**
 * Canonical URL + hreflang alternates for one page (F-003 CA-5, RF-SEO-03).
 * Relative paths resolve against `metadataBase` (NEXT_PUBLIC_SITE_URL) set in the root layout.
 */
export function buildAlternates(locale: Locale, paths: LocalizedPaths): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = paths[l];
  languages["x-default"] = paths[defaultLocale];
  return { canonical: paths[locale], languages };
}
