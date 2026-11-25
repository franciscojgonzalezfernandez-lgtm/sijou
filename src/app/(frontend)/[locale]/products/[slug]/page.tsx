import { RichText } from "@payloadcms/richtext-lexical/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { buildAlternates, type LocalizedPaths } from "@/i18n/alternates";
import { formatPrice } from "@/i18n/formats";
import { isLocale, locales, type Locale } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";
import { getPublishedProduct, getPublishedSlugs, type StoreProduct } from "@/lib/catalog";

// Cache Components needs at least one param; this one never matches a product (404).
const NO_PRODUCT = "__none__";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const slugs = isLocale(params.locale) ? await getPublishedSlugs(params.locale) : [];
  return (slugs.length ? slugs : [NO_PRODUCT]).map((slug) => ({ slug }));
}

function productPaths(slugs: StoreProduct["slugs"]): LocalizedPaths {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      getPathname({
        locale,
        href: { pathname: "/products/[slug]", params: { slug: slugs[locale] } },
      }),
    ]),
  ) as LocalizedPaths;
}

async function load(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = await getPublishedProduct(locale, decodeURIComponent(slug));
  if (!product) notFound();
  return { locale, product };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { locale, product } = await load(params);
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    alternates: buildAlternates(locale, productPaths(product.slugs)),
  };
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <dt className="type-heading">{label}</dt>
      <dd className="mt-1 whitespace-pre-line">{value}</dd>
    </div>
  );
}

/** Minimal product page (F-010). Final design arrives with F-004 and F-022. */
export default async function ProductPage({ params }: PageProps<"/[locale]/products/[slug]">) {
  const { locale, product } = await load(params);
  const t = await getTranslations({ locale: locale satisfies Locale, namespace: "Product" });
  const { details } = product;
  const hasDetails = Object.values(details).some((value) => value?.trim());

  return (
    <>
      <SiteHeader paths={productPaths(product.slugs)} />
      <main
        id="main"
        tabIndex={-1}
        className="page-gutter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 py-10"
      >
        {product.image && (
          // F-010 D-2: Payload already generates WebP sizes; Vercel image optimization would use quota.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image.src}
            srcSet={product.image.srcSet}
            sizes="(min-width: 42rem) 40rem, calc(100vw - 2rem)"
            width={product.image.width}
            height={product.image.height}
            alt={product.image.alt}
            fetchPriority="high"
            className="bg-surface h-auto w-full rounded-md"
          />
        )}
        <h1 className="type-title text-brand">{product.name}</h1>
        {product.price !== null && (
          <p className="type-heading tabular">
            <span className="sr-only">{t("price")}: </span>
            {formatPrice(product.price, locale)}
          </p>
        )}
        {product.shortDescription && (
          <p className="type-body measure">{product.shortDescription}</p>
        )}
        {product.description && (
          <div className="type-body measure flex flex-col gap-4">
            <RichText data={product.description} />
          </div>
        )}
        {hasDetails && (
          <section aria-labelledby="details" className="flex flex-col gap-4">
            <h2 id="details" className="type-subtitle text-brand">
              {t("details")}
            </h2>
            <dl className="flex flex-col gap-4">
              <Detail label={t("inci")} value={details.inci} />
              <Detail label={t("usage")} value={details.usage} />
              <Detail label={t("warnings")} value={details.warnings} />
              <Detail label={t("allergens")} value={details.allergens} />
              <Detail label={t("certifications")} value={details.certifications} />
              <Detail label={t("pao")} value={details.pao} />
            </dl>
          </section>
        )}
      </main>
    </>
  );
}
