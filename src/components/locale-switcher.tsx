import { getLocale, getTranslations } from "next-intl/server";

import type { LocalizedPaths } from "@/i18n/alternates";
import { locales } from "@/i18n/locales";

/**
 * Language switcher (F-003 CA-4): plain links to the same page in each language, no client JS.
 * A full navigation lets the proxy store the choice in the locale cookie. Styled in F-020.
 */
export async function LocaleSwitcher({ paths }: { paths: LocalizedPaths }) {
  const current = await getLocale();
  const t = await getTranslations("LocaleSwitcher");
  return (
    <nav aria-label={t("label")}>
      <ul className="flex gap-3 text-sm">
        {locales.map((locale) => (
          <li key={locale}>
            {}
            <a
              href={paths[locale]}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className={
                locale === current
                  ? "font-semibold underline underline-offset-4"
                  : "underline-offset-4 hover:underline"
              }
            >
              {t(locale)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
