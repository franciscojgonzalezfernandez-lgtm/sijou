import "server-only";

import config from "@payload-config";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";

import { CATALOG_TAG } from "@/collections/shared";
import { serverEnv } from "@/env";
import { mainImage } from "@/domain/products/gallery";
import { responsiveImage, type ResponsiveImage } from "@/domain/products/images";
import { contentLocales } from "@/domain/products/readiness";
import type { Locale } from "@/i18n/locales";

export interface StoreProduct {
  name: string;
  shortDescription: string | null;
  description: SerializedEditorState | null;
  slugs: Record<Locale, string>;
  price: number | null;
  image: (ResponsiveImage & { alt: string }) | null;
  details: {
    inci: string | null;
    usage: string | null;
    warnings: string | null;
    allergens: string | null;
    certifications: string | null;
    pao: string | null;
  };
}

/**
 * A published product in one language, for the storefront (F-010). Cached until the catalog
 * changes: product, variant, category and photo hooks expire the `catalog` tag.
 */
export async function getPublishedProduct(
  locale: Locale,
  slug: string,
): Promise<StoreProduct | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "products",
    locale,
    where: { and: [{ slug: { equals: slug } }, { status: { equals: "published" } }] },
    depth: 1,
    limit: 1,
    pagination: false,
  });
  const product = docs[0];
  if (!product?.slug) return null;

  const [all, variants] = await Promise.all([
    payload.findByID({
      collection: "products",
      id: product.id,
      locale: "all",
      depth: 0,
      select: { slug: true },
    }),
    payload.find({
      collection: "variants",
      where: { and: [{ product: { equals: product.id } }, { active: { equals: true } }] },
      sort: "price",
      depth: 0,
      limit: 1,
      pagination: false,
    }),
  ]);

  const slugs = (all.slug ?? {}) as unknown as Partial<Record<Locale, string>>;
  if (contentLocales.some((l) => !slugs[l])) return null;

  const first = mainImage(product.gallery);
  const media = typeof first === "object" ? first : null;
  const image = responsiveImage(media, serverEnv().NEXT_PUBLIC_SITE_URL);

  return {
    name: product.name,
    shortDescription: product.shortDescription ?? null,
    description: (product.description as SerializedEditorState | null | undefined) ?? null,
    slugs: slugs as Record<Locale, string>,
    price: variants.docs[0]?.price ?? null,
    image: image && media ? { ...image, alt: media.alt ?? "" } : null,
    details: {
      inci: product.inci ?? null,
      usage: product.usage ?? null,
      warnings: product.warnings ?? null,
      allergens: product.allergens ?? null,
      certifications: product.certifications ?? null,
      pao: product.pao ?? null,
    },
  };
}

/** Slugs of published products in one language, for `generateStaticParams`. */
export async function getPublishedSlugs(locale: Locale): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "products",
    locale,
    where: { status: { equals: "published" } },
    select: { slug: true },
    depth: 0,
    pagination: false,
  });
  return docs.flatMap((doc) => (doc.slug ? [doc.slug] : []));
}
