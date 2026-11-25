import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { SkipLink } from "@/components/ui/skip-link";
import { serverEnv } from "@/env";
import { isLocale, locales } from "@/i18n/locales";
import { getRootLocale } from "@/i18n/root-locale";
import "../globals.css";

// F-004 CA-8: fonts are downloaded at build time and served from our domain, with metric-matched
// fallbacks so swapping them in does not shift the layout. Only the weights in use are loaded.
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-cormorant",
});
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-montserrat",
});

// F-003: one static tree per language.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Unknown prefixes (e.g. /fr) answer 404.
async function currentLocale() {
  const value = await getRootLocale();
  if (!isLocale(value)) notFound();
  return value;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await currentLocale(), namespace: "Metadata" });
  return {
    metadataBase: new URL(serverEnv().NEXT_PUBLIC_SITE_URL),
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await currentLocale();
  const t = await getTranslations({ locale, namespace: "Common" });
  return (
    // CA-6: the document language matches the page language.
    <html
      lang={locale}
      className={`${cormorant.variable} ${montserrat.variable} bg-page text-ink h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* F-004: first focusable element; every page's <main> has id="main". */}
        <SkipLink label={t("skipToContent")} />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
