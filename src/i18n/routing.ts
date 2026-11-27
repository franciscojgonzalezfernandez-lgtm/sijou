import { defineRouting } from "next-intl/routing";

import { defaultLocale, locales } from "./locales";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // F-003 CA-1: every public URL carries its language prefix.
  localePrefix: "always",
  // CA-3: the explicit choice wins over the browser. Only set when it differs from the browser.
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: "lax" },
  // hreflang comes from page metadata (src/i18n/alternates.ts), which knows translated DB slugs.
  alternateLinks: false,
  // Translated paths for fixed pages; dynamic pages build theirs from DB slugs.
  pathnames: {
    "/": "/",
    // F-004 CA-9: internal component catalogue, noindex.
    "/catalog": { en: "/catalog", de: "/katalog", es: "/catalogo" },
    // F-010 D-3: translated segment, translated slug from the database.
    "/products/[slug]": {
      en: "/products/[slug]",
      de: "/produkte/[slug]",
      es: "/productos/[slug]",
    },
    // F-012 D-1: translated segment, translated slug from the database.
    "/collections/[slug]": {
      en: "/collections/[slug]",
      de: "/kollektionen/[slug]",
      es: "/colecciones/[slug]",
    },
    // F-012/F-021 CA-1: category paths are the slugs of each level ("/es/rostro/cremas").
    "/[...path]": "/[...path]",
  },
});
