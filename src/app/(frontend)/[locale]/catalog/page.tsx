import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/brand/logo";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { Dialog } from "@/components/ui/dialog";
import { Link } from "@/components/ui/link";
import { Menu } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { ToastRegion } from "@/components/ui/toast";
import type { LocalizedPaths } from "@/i18n/alternates";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/locales";
import { getPathname } from "@/i18n/navigation";

import { ToastDemo } from "./toast-demo";

function catalogPaths(): LocalizedPaths {
  return Object.fromEntries(
    locales.map((locale) => [locale, getPathname({ locale, href: "/catalog" })]),
  ) as LocalizedPaths;
}

async function localeOf(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  return isLocale(locale) ? locale : defaultLocale;
}

// CA-9: internal page, kept out of search engines (and out of the sitemap, F-025).
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog">): Promise<Metadata> {
  const t = await getTranslations({ locale: await localeOf(params), namespace: "Catalog" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Colour pairs shown in the catalogue; their contrast is measured in src/styles/tokens.test.ts. */
const SWATCHES = [
  { token: "bg-page", bg: "bg-page", fg: "text-ink" },
  { token: "bg-surface", bg: "bg-surface", fg: "text-ink" },
  { token: "brand", bg: "bg-page", fg: "text-brand" },
  { token: "accent-solid", bg: "bg-accent", fg: "text-on-accent" },
  { token: "accent-subtle", bg: "bg-accent-soft", fg: "text-ink" },
  { token: "earth-solid", bg: "bg-earth", fg: "text-on-accent" },
  { token: "earth-subtle", bg: "bg-earth-soft", fg: "text-earth-ink" },
  { token: "danger-subtle", bg: "bg-danger-soft", fg: "text-danger-ink" },
  { token: "success-subtle", bg: "bg-success-soft", fg: "text-success-ink" },
  { token: "warning-subtle", bg: "bg-warning-soft", fg: "text-warning-ink" },
];

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-line flex flex-col gap-6 border-t pt-10">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="type-subtitle text-brand">
          {title}
        </h2>
        {intro && <p className="type-body measure text-ink-muted">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function CatalogPage({ params }: PageProps<"/[locale]/catalog">) {
  const locale = await localeOf(params);
  const t = await getTranslations({ locale, namespace: "Catalog" });
  const common = await getTranslations({ locale, namespace: "Common" });
  const home = getPathname({ locale, href: "/" });
  const catalog = getPathname({ locale, href: "/catalog" });

  return (
    <ToastRegion closeLabel={common("close")}>
      <SiteHeader paths={catalogPaths()} />
      <main
        id="main"
        tabIndex={-1}
        className="page-gutter mx-auto flex w-full max-w-(--content-max) flex-1 flex-col gap-12 pt-8 pb-20"
      >
        <div className="flex flex-col gap-3">
          <h1 className="type-title text-brand">{t("title")}</h1>
          <p className="type-body measure text-ink-muted">{t("intro")}</p>
        </div>

        <Section id="logo" title={t("logo")} intro={t("logoIntro")}>
          <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
            <figure className="flex flex-col gap-2">
              <div className="border-line bg-raised text-brand grid min-h-40 place-items-center rounded-md border p-6">
                <Logo className="w-full max-w-72" />
              </div>
              <figcaption className="type-body-sm text-ink-muted">{t("onLinen")}</figcaption>
            </figure>
            <figure className="flex flex-col gap-2">
              <div className="bg-accent text-on-accent grid min-h-40 place-items-center rounded-md p-6">
                <Logo className="w-full max-w-72" />
              </div>
              <figcaption className="type-body-sm text-ink-muted">{t("onOlive")}</figcaption>
            </figure>
            <figure className="flex flex-col gap-2">
              <div className="border-line bg-raised text-brand grid min-h-40 place-items-center rounded-md border p-6">
                <Logo variant="mark" className="size-16" />
              </div>
              <figcaption className="type-body-sm text-ink-muted">{t("icon")}</figcaption>
            </figure>
          </div>
        </Section>

        <Section id="colors" title={t("colors")} intro={t("colorsIntro")}>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
            {SWATCHES.map((s) => (
              <li
                key={s.token}
                className={`${s.bg} ${s.fg} border-line flex min-h-24 flex-col justify-end rounded-md border p-3`}
              >
                <span className="type-heading">Aa</span>
                <code className="type-body-sm">{s.token}</code>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="type" title={t("type")}>
          <div className="flex flex-col gap-4">
            <p className="type-display text-brand">{t("sampleDisplay")}</p>
            <p className="type-title text-brand">{t("sampleTitle")}</p>
            <p className="type-subtitle text-brand">{t("sampleSubtitle")}</p>
            <p className="type-heading">{t("sampleHeading")}</p>
            <p className="type-body measure">{t("sampleBody")}</p>
            <p className="type-body-sm text-ink-muted">{t("sampleSmall")}</p>
            <p className="type-label text-earth-ink">{t("sampleLabel")}</p>
          </div>
        </Section>

        <Section id="buttons" title={t("buttons")}>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("addToCart")}</Button>
            <Button variant="secondary">{t("secondary")}</Button>
            <Button variant="ghost">{t("ghost")}</Button>
            <Button variant="danger">{t("danger")}</Button>
            <Button loading>{t("loading")}</Button>
            <Button disabled>{t("disabled")}</Button>
          </div>
        </Section>

        <Section id="links" title={t("links")}>
          <p className="type-body measure">
            {t.rich("linkSentence", { link: (chunks) => <Link href="/">{chunks}</Link> })}
          </p>
          <nav aria-label={t("navigation")}>
            <ul className="flex flex-wrap gap-6">
              <li>
                <Link href="/catalog" variant="nav" current>
                  {t("navCosmetics")}
                </Link>
              </li>
              <li>
                <Link href="/" variant="nav">
                  {t("navCandles")}
                </Link>
              </li>
            </ul>
          </nav>
        </Section>

        <Section id="forms" title={t("forms")}>
          <form className="grid max-w-xl gap-6" action={catalog}>
            <TextField
              id="cat-name"
              name="name"
              label={t("nameLabel")}
              autoComplete="name"
              required
              requiredLabel={t("required")}
            />
            <TextField
              id="cat-email"
              name="email"
              type="email"
              label={t("emailLabel")}
              hint={t("emailHint")}
              autoComplete="email"
            />
            <TextField
              id="cat-email-error"
              name="email2"
              type="email"
              label={t("emailLabel")}
              error={t("emailError")}
              defaultValue="ana@"
              autoComplete="off"
            />
            <Select id="cat-size" name="size" label={t("sizeLabel")} defaultValue="50">
              <option value="30">{t("sizeSmall")}</option>
              <option value="50">{t("sizeLarge")}</option>
            </Select>
            <Checkbox
              id="cat-news"
              name="news"
              label={t("newsletter")}
              hint={t("newsletterHint")}
            />
            <RadioGroup
              name="delivery"
              legend={t("deliveryLegend")}
              defaultValue="home"
              options={[
                { value: "home", label: t("deliveryHome") },
                { value: "pickup", label: t("deliveryPickup") },
              ]}
            />
          </form>
        </Section>

        <Section id="overlays" title={t("overlays")}>
          <div className="flex flex-wrap items-start gap-3">
            <Dialog
              triggerLabel={t("dialogTrigger")}
              title={t("dialogTitle")}
              closeLabel={common("close")}
              actions={
                <>
                  <Button variant="secondary" data-close>
                    {t("dialogCancel")}
                  </Button>
                  <Button variant="danger" data-close>
                    {t("dialogConfirm")}
                  </Button>
                </>
              }
            >
              <p>{t("dialogBody")}</p>
            </Dialog>
            <Menu
              label={t("menuLabel")}
              items={[
                { label: t("menuOrders"), href: `${catalog}#overlays` },
                { label: t("menuAddresses"), href: `${catalog}#overlays` },
                { label: t("menuSignOut"), href: home },
              ]}
            />
            <ToastDemo
              labels={{
                show: t("toastShow"),
                showError: t("toastShowError"),
                success: t("toastSuccess"),
                error: t("toastError"),
              }}
            />
          </div>
        </Section>

        <Section id="badges" title={t("badges")}>
          <div className="flex flex-wrap gap-2">
            <Badge tone="olive">{t("badgeNew")}</Badge>
            <Badge tone="earth">{t("badgeAutumn")}</Badge>
            <Badge tone="success">{t("badgeInStock")}</Badge>
            <Badge tone="warning">{t("badgeLowStock", { count: 3 })}</Badge>
            <Badge tone="neutral">{t("badgeSoldOut")}</Badge>
            <Badge tone="danger">{t("badgeError")}</Badge>
          </div>
          <div
            aria-busy="true"
            aria-label={t("skeletonLabel")}
            role="group"
            className="grid max-w-md gap-3"
          >
            <Skeleton className="aspect-4/3 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        </Section>

        <Section id="navigation" title={t("navigation")}>
          <Breadcrumbs
            label={t("breadcrumbsLabel")}
            items={[
              { label: t("crumbHome"), href: "/" },
              { label: t("crumbShop"), href: "/catalog" },
              { label: t("crumbProduct") },
            ]}
          />
          <Pagination
            page={2}
            pageCount={4}
            hrefFor={(page) => `${catalog}?page=${page}`}
            labels={{
              nav: t("paginationNav"),
              previous: t("previous"),
              next: t("next"),
              page: (page) => t("page", { page }),
            }}
          />
        </Section>
      </main>
    </ToastRegion>
  );
}
