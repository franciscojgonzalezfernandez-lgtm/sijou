import "server-only";

import config from "@payload-config";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload, type Payload } from "payload";

import { CATALOG_TAG } from "@/collections/shared";
import { serverEnv } from "@/env";
import { firstParagraph } from "@/domain/catalog/rich-text";
import { isCollectionVisible, nextVisibilityChange } from "@/domain/catalog/taxonomy";
import {
  buildBreadcrumbs,
  buildTree,
  childrenOf,
  type CategoryNode,
  type CategoryTree,
  type Crumb,
  isCategoryVisible,
  type Localized,
  resolveCategoryPath,
} from "@/domain/catalog/tree";
import { responsiveImage, type ResponsiveImage } from "@/domain/products/images";
import { locales, type Locale } from "@/i18n/locales";
import type { Media } from "@/payload-types";

export interface ProductLink {
  name: string;
  slug: string;
}

interface Taxonomy {
  name: string;
  description: SerializedEditorState | null;
  seoTitle: string;
  /** `seo.description`, else the first paragraph of the text, else nothing. */
  seoDescription: string | null;
  image: (ResponsiveImage & { alt: string }) | null;
  products: ProductLink[];
}

export interface StoreCategory extends Taxonomy {
  breadcrumbs: Crumb[];
  /** Slug path of the same category in each language (for hreflang and the switcher). */
  paths: Record<Locale, string[]>;
  children: { name: string; path: string[] }[];
}

export interface StoreCollection extends Taxonomy {
  slugs: Record<Locale, string>;
}

type Doc = Record<string, unknown>;

async function categoryTree(payload: Payload): Promise<CategoryTree> {
  const { docs } = await payload.find({
    collection: "categories",
    locale: "all",
    depth: 0,
    pagination: false,
    select: { name: true, slug: true, parent: true, position: true, status: true },
  });
  return buildTree(
    docs.map((doc): CategoryNode => ({
      id: doc.id,
      parent: typeof doc.parent === "object" ? (doc.parent?.id ?? null) : (doc.parent ?? null),
      position: doc.position ?? 0,
      status: doc.status,
      names: doc.name as unknown as Localized,
      slugs: doc.slug as unknown as Localized,
    })),
  );
}

function headerImage(value: unknown): Taxonomy["image"] {
  const media = typeof value === "object" && value !== null ? (value as Media) : null;
  const image = responsiveImage(media, serverEnv().NEXT_PUBLIC_SITE_URL);
  return image && media ? { ...image, alt: media.alt ?? "" } : null;
}

function texts(doc: Doc): Omit<Taxonomy, "products"> {
  const description = (doc.description as SerializedEditorState | null | undefined) ?? null;
  const seo = (doc.seo ?? {}) as { title?: string | null; description?: string | null };
  return {
    name: doc.name as string,
    description,
    seoTitle: seo.title?.trim() || (doc.name as string),
    seoDescription: seo.description?.trim() || firstParagraph(description),
    image: headerImage(doc.headerImage),
  };
}

function publishedLinks(products: unknown[]): ProductLink[] {
  return products.flatMap((value) => {
    const product = value as { name?: string | null; slug?: string | null; status?: string };
    return typeof value === "object" &&
      product.status === "published" &&
      product.name &&
      product.slug
      ? [{ name: product.name, slug: product.slug }]
      : [];
  });
}

/**
 * A visible category by its slug path in one language (F-012 CA-1, CA-6), with breadcrumbs,
 * visible subcategories and the published products directly in it. Cached until the catalog
 * changes (category, product, variant and photo hooks expire the `catalog` tag).
 */
export async function getCategoryByPath(
  locale: Locale,
  segments: string[],
): Promise<StoreCategory | null> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  const payload = await getPayload({ config });
  const tree = await categoryTree(payload);
  const node = resolveCategoryPath(tree, locale, segments);
  if (!node || !isCategoryVisible(tree, node.id, locale)) return null;

  const [doc, products] = await Promise.all([
    payload.findByID({ collection: "categories", id: node.id, locale, depth: 1 }),
    payload.find({
      collection: "products",
      locale,
      where: { and: [{ categories: { contains: node.id } }, { status: { equals: "published" } }] },
      select: { name: true, slug: true, status: true },
      sort: "name",
      depth: 0,
      pagination: false,
    }),
  ]);

  return {
    ...texts(doc as unknown as Doc),
    products: publishedLinks(products.docs),
    breadcrumbs: buildBreadcrumbs(tree, node.id, locale),
    paths: Object.fromEntries(
      locales.map((l) => [l, buildBreadcrumbs(tree, node.id, l).at(-1)?.path ?? []]),
    ) as Record<Locale, string[]>,
    children: childrenOf(tree, node.id)
      .filter((child) => isCategoryVisible(tree, child.id, locale))
      .map((child) => ({
        name: child.names[locale] as string,
        path: buildBreadcrumbs(tree, child.id, locale).at(-1)?.path ?? [],
      })),
  };
}

/** Slug paths of every visible category in one language, for `generateStaticParams`. */
export async function getCategoryPaths(locale: Locale): Promise<string[][]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  const tree = await categoryTree(await getPayload({ config }));
  return [...tree.keys()]
    .filter((id) => isCategoryVisible(tree, id, locale))
    .map((id) => buildBreadcrumbs(tree, id, locale).at(-1)?.path ?? [])
    .filter((path) => path.length > 0);
}

/**
 * A collection visible right now in one language (F-012 CA-4, CA-6), with its published products
 * in the hand-made order. A tag expiry does not fire when a visibility date arrives, so the cache
 * entry lives only until the next date that changes what the shop shows.
 */
export async function getVisibleCollection(
  locale: Locale,
  slug: string,
): Promise<StoreCollection | null> {
  "use cache";
  cacheTag(CATALOG_TAG);

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "product-collections",
    locale,
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    pagination: false,
  });
  const doc = docs[0];
  const now = new Date();
  const seconds = doc ? nextVisibilityChange(doc, now) : null;
  if (seconds === null) cacheLife("max");
  else cacheLife({ stale: seconds, revalidate: seconds, expire: seconds + 1 });

  if (!doc || !isCollectionVisible(doc, now)) {
    return null;
  }
  const all = await payload.findByID({
    collection: "product-collections",
    id: doc.id,
    locale: "all",
    depth: 0,
    select: { slug: true },
  });
  const slugs = (all.slug ?? {}) as unknown as Partial<Record<Locale, string>>;
  if (locales.some((l) => !slugs[l])) return null;

  return {
    ...texts(doc as unknown as Doc),
    products: publishedLinks(doc.products ?? []),
    slugs: slugs as Record<Locale, string>,
  };
}

/** Slugs of collections visible now in one language, for `generateStaticParams`. */
export async function getCollectionSlugs(locale: Locale): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "product-collections",
    locale,
    where: { status: { equals: "published" } },
    select: { name: true, slug: true, status: true, visibleFrom: true, visibleUntil: true },
    depth: 0,
    pagination: false,
  });
  const now = new Date();
  return docs.flatMap((doc) => (doc.slug && isCollectionVisible(doc, now) ? [doc.slug] : []));
}
