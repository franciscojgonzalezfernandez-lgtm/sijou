import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

// F-003 edge case: an unknown slug answers 404 in the page's language.
export default async function NotFound() {
  const t = await getTranslations("NotFound");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg leading-relaxed">{t("description")}</p>
      <Link href="/" className="underline underline-offset-4">
        {t("backHome")}
      </Link>
    </main>
  );
}
