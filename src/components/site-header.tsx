import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { LocalizedPaths } from "@/i18n/alternates";
import { Link } from "@/i18n/navigation";

/** Provisional header: logo linking home and the language switcher. The full header is F-020. */
export async function SiteHeader({ paths }: { paths: LocalizedPaths }) {
  const t = await getTranslations("Common");
  return (
    <header className="page-gutter mx-auto flex w-full max-w-(--content-max) flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      <Link
        href="/"
        aria-label={t("home")}
        className="text-brand -mx-1 inline-flex min-h-11 items-center px-1"
      >
        <Logo decorative className="w-40 sm:w-48" />
      </Link>
      <LocaleSwitcher paths={paths} />
    </header>
  );
}
