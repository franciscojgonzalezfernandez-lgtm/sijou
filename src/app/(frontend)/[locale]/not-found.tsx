import { getTranslations } from "next-intl/server";

import { Link } from "@/components/ui/link";

// F-003 edge case: an unknown slug answers 404 in the page's language.
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main
      id="main"
      tabIndex={-1}
      className="page-gutter mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 py-16"
    >
      <h1 className="type-title text-brand">{t("title")}</h1>
      <p className="type-body measure text-ink-muted">{t("description")}</p>
      <p>
        <Link href="/">{t("backHome")}</Link>
      </p>
    </main>
  );
}
