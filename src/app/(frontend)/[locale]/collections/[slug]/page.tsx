import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { buildAlternates, type LocalizedPaths } from "@/i18n/alternates";
import { isLocale, locales, type Locale } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";
import {
  type CollectionHead,
  getCollectionHead,
  getCollectionSlugs,
  getVisibleCollection,
} from "@/lib/navigation";

// Cache Components needs at least one param; this one never matches a collection (404).
const NO_COLLECTION = "__none__";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const slugs = isLocale(params.locale) ? await getCollectionSlugs(params.locale) : [];
  return (slugs.length ? slugs : [NO_COLLECTION]).map((slug) => ({ slug }));
}

function collectionPaths(slugs: CollectionHead["slugs"]): LocalizedPaths {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      getPathname({
        locale,
        href: { pathname: "/collections/[slug]", params: { slug: slugs[locale] } },
      }),
    ]),
  ) as LocalizedPaths;
}

async function load(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const decoded = decodeURIComponent(slug);
  const head = await getCollectionHead(locale, decoded);
  if (!head) notFound();
  return { locale, slug: decoded, head };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { locale, head } = await load(params);
  return {
    title: head.seoTitle,
    description: head.seoDescription ?? undefined,
    alternates: buildAlternates(locale, collectionPaths(head.slugs)),
  };
}

/**
 * The texts and products, only while the collection is visible. Near a visibility date its cache
 * lives only until that date, which makes it request-time data: hence the Suspense boundary.
 */
async function CollectionBody({ locale, slug }: { locale: Locale; slug: string }) {
  const collection = await getVisibleCollection(locale, slug);
  if (!collection) notFound();
  const t = await getTranslations({ locale, namespace: "Collection" });
  return (
    <TaxonomyPage
      name={collection.name}
      image={collection.image}
      description={collection.description}
      products={collection.products}
      labels={{ products: t("products"), empty: t("empty") }}
    />
  );
}

/** Minimal collection page (F-012 D-1): texts and products in the hand-made order. */
export default async function CollectionPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, slug, head } = await load(params);
  return (
    <>
      <SiteHeader paths={collectionPaths(head.slugs)} />
      <Suspense fallback={<main id="main" tabIndex={-1} className="flex-1" />}>
        <CollectionBody locale={locale} slug={slug} />
      </Suspense>
    </>
  );
}
