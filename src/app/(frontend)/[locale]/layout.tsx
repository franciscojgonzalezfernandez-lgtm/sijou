import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";

import { serverEnv } from "@/env";
import { isLocale, locales } from "@/i18n/locales";
import { getRootLocale } from "@/i18n/root-locale";
import "../globals.css";

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
  return (
    // CA-6: the document language matches the page language.
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
