import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
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
      <header className="mx-auto flex w-full max-w-2xl justify-end px-4 pt-4">
        <LocaleSwitcher paths={homePaths()} />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Sijou</h1>
        <p className="text-lg leading-relaxed">{t("tagline")}</p>
      </main>
    </>
  );
}
