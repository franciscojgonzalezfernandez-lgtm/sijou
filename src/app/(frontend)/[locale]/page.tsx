import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SiteHeader } from "@/components/site-header";
import { buildAlternates, type LocalizedPaths } from "@/i18n/alternates";
import { defaultLocale, isLocale, locales } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";

function homePaths(): LocalizedPaths {
  return Object.fromEntries(
    locales.map((locale) => [locale, getPathname({ locale, href: "/" })]),
  ) as LocalizedPaths;
}

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(isLocale(locale) ? locale : defaultLocale, homePaths()) };
}

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations({
    locale: isLocale(locale) ? locale : defaultLocale,
    namespace: "Home",
  });
  return (
    <>
      <SiteHeader paths={homePaths()} />
      <main
        id="main"
        tabIndex={-1}
        className="page-gutter mx-auto flex w-full max-w-(--content-max) flex-1 flex-col justify-center gap-4 py-16"
      >
        <h1 className="type-display text-brand">Sijou</h1>
        <p className="type-body measure text-ink-muted">{t("tagline")}</p>
      </main>
    </>
  );
}
