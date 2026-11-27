import { contentLocales, type ContentLocale } from "@/domain/products/readiness";

import type { Localized, TaxonomyStatus } from "./tree";

/**
 * Publishing and visibility shared by categories and collections (F-012 CA-3, CA-4, CA-6).
 */
export interface TaxonomyMissing {
  field: "name" | "slug";
  locale: ContentLocale;
}

const FIELD_NAMES = { name: "nombre", slug: "slug" } as const;
const LOCALE_NAMES: Record<ContentLocale, string> = {
  es: "español",
  en: "inglés",
  de: "alemán",
};

/** CA-3: name and slug in es, en and de. */
export function taxonomyReadiness(doc: { name?: Localized; slug?: Localized }): {
  ready: boolean;
  missing: TaxonomyMissing[];
} {
  const missing: TaxonomyMissing[] = [];
  for (const locale of contentLocales) {
    for (const field of ["name", "slug"] as const) {
      if (!doc[field]?.[locale]?.trim()) missing.push({ field, locale });
    }
  }
  return { ready: missing.length === 0, missing };
}

/** Spanish messages grouped by language, like the product checklist (F-010). */
export function formatTaxonomyMissing(missing: readonly TaxonomyMissing[]): string[] {
  return contentLocales.flatMap((locale) => {
    const fields = missing.filter((m) => m.locale === locale).map((m) => FIELD_NAMES[m.field]);
    return fields.length > 0 ? [`Falta en ${LOCALE_NAMES[locale]}: ${fields.join(", ")}.`] : [];
  });
}

export interface CollectionVisibility {
  status: TaxonomyStatus;
  name?: string | null;
  slug?: string | null;
  visibleFrom?: string | Date | null;
  visibleUntil?: string | Date | null;
}

function time(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** CA-4/CA-6: published, in that language, from `visibleFrom` (included) to `visibleUntil` (excluded). */
export function isCollectionVisible(collection: CollectionVisibility, now: Date): boolean {
  if (collection.status !== "published") return false;
  if (!collection.name?.trim() || !collection.slug?.trim()) return false;
  const from = time(collection.visibleFrom);
  const until = time(collection.visibleUntil);
  const at = now.getTime();
  return (from === null || from <= at) && (until === null || at < until);
}

/** Seconds until a visibility date changes what the shop shows, or `null` if none is ahead. */
export function nextVisibilityChange(
  collection: Pick<CollectionVisibility, "visibleFrom" | "visibleUntil">,
  now: Date,
): number | null {
  const at = now.getTime();
  const ahead = [time(collection.visibleFrom), time(collection.visibleUntil)].filter(
    (ms): ms is number => ms !== null && ms > at,
  );
  return ahead.length > 0 ? Math.max(1, Math.ceil((Math.min(...ahead) - at) / 1000)) : null;
}

/** True when the end date, if both are set, is after the start date. */
export function isValidVisibilityRange(
  from: string | Date | null | undefined,
  until: string | Date | null | undefined,
): boolean {
  const start = time(from);
  const end = time(until);
  return start === null || end === null || end > start;
}
