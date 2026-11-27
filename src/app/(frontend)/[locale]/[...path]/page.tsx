import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { TaxonomyPage } from "@/components/taxonomy-page";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Link } from "@/components/ui/link";
import { buildAlternates, type LocalizedPaths } from "@/i18n/alternates";
import { isLocale, locales, type Locale } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";
import { getCategoryByPath, getCategoryPaths, type StoreCategory } from "@/lib/navigation";

// Cache Components needs at least one param; this one never matches a category (404).
const NO_CATEGORY = ["__none__"];

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const paths = isLocale(params.locale) ? await getCategoryPaths(params.locale) : [];
  return (paths.length ? paths : [NO_CATEGORY]).map((path) => ({ path }));
}

function categoryPaths(paths: StoreCategory["paths"]): LocalizedPaths {
  return Object.fromEntries(
    locales.map((locale) => [
      locale,
      paths[locale].length
        ? getPathname({ locale, href: { pathname: "/[...path]", params: { path: paths[locale] } } })
        : `/${locale}`,
    ]),
  ) as LocalizedPaths;
}

async function load(params: Promise<{ locale: string; path: string[] }>) {
  const { locale, path } = await params;
  if (!isLocale(locale)) notFound();
  const category = await getCategoryByPath(locale, path.map(decodeURIComponent));
  if (!category) notFound();
  return { locale, category };
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[...path]">): Promise<Metadata> {
  const { locale, category } = await load(params);
  return {
    title: category.seoTitle,
    description: category.seoDescription ?? undefined,
    alternates: buildAlternates(locale, categoryPaths(category.paths)),
  };
}

/** Minimal category page (F-012 D-1): breadcrumbs, texts, subcategories and products. */
export default async function CategoryPage({ params }: PageProps<"/[locale]/[...path]">) {
  const { locale, category } = await load(params);
  const t = await getTranslations({ locale: locale satisfies Locale, namespace: "Category" });

  return (
    <>
      <SiteHeader paths={categoryPaths(category.paths)} />
      <TaxonomyPage
        name={category.name}
        image={category.image}
        description={category.description}
        products={category.products}
        labels={{ products: t("products"), empty: t("empty") }}
        before={
          <Breadcrumbs
            label={t("breadcrumbs")}
            items={[
              { label: t("home"), href: "/" },
              ...category.breadcrumbs.map((crumb) => ({
                label: crumb.name,
                href: { pathname: "/[...path]" as const, params: { path: crumb.path } },
              })),
            ]}
          />
        }
      >
        {category.children.length > 0 && (
          <section aria-labelledby="subcategories" className="flex flex-col gap-2">
            <h2 id="subcategories" className="type-subtitle text-brand">
              {t("subcategories")}
            </h2>
            <ul className="flex flex-col">
              {category.children.map((child) => (
                <li key={child.path.join("/")}>
                  <Link
                    variant="nav"
                    href={{ pathname: "/[...path]", params: { path: child.path } }}
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </TaxonomyPage>
    </>
  );
}
