import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isLocale } from "./locales";
import { getRootLocale } from "./root-locale";

export default getRequestConfig(async ({ locale: override }) => {
  const candidate = override ?? (await getRootLocale());
  const locale = isLocale(candidate) ? candidate : defaultLocale;
  const messages = (await import(`../../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };
  return { locale, messages: messages.default };
});
