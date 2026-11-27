import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { buildAlternates, type LocalizedPaths } from "@/i18n/alternates";
import { isLocale, locales, type Locale } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";
import { getCollectionSlugs, getVisibleCollection, type StoreCollection } from "@/lib/navigation";

// Cache Components needs at least one param; this one never matches a collection (404).
const NO_COLLECTION = "__none__";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const slugs = isLocale(params.locale) ? await getCollectionSlugs(params.locale) : [];
  return (slugs.length ? slugs : [NO_COLLECTION]).map((slug) => ({ slug }));
}

function collectionPaths(slugs: StoreCollection["slugs"]): LocalizedPaths {
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
  const collection = await getVisibleCollection(locale, decodeURIComponent(slug));
  if (!collection) notFound();
  return { locale, collection };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { locale, collection } = await load(params);
  return {
    title: collection.seoTitle,
    description: collection.seoDescription ?? undefined,
    alternates: buildAlternates(locale, collectionPaths(collection.slugs)),
  };
}

/** Minimal collection page (F-012 D-1): texts and products in the hand-made order. */
export default async function CollectionPage({
  params,
}: PageProps<"/[locale]/collections/[slug]">) {
  const { locale, collection } = await load(params);
  const t = await getTranslations({ locale: locale satisfies Locale, namespace: "Collection" });

  return (
    <>
      <SiteHeader paths={collectionPaths(collection.slugs)} />
      <TaxonomyPage
        name={collection.name}
        image={collection.image}
        description={collection.description}
        products={collection.products}
        labels={{ products: t("products"), empty: t("empty") }}
      />
    </>
  );
}
