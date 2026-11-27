// F-001 CA-5 / constitution I: every category >= 0.90 on the mobile profile, median of 3 runs.
// Locally (and without LH_BASE_URL) it starts `next start`; in CI it audits the Vercel preview (F-002).
const url = process.env.LH_BASE_URL;
// Constitution I: every locale is audited.
const LOCALES = ["en", "de", "es"];
// F-010: the seeded sample product (keep in sync with scripts/seed-data.ts). Production has no
// sample data (F-002 CA-7), so it is audited only on previews and locally.
const PRODUCT_PATHS = [
  "/en/products/lavender-face-cream",
  "/de/produkte/lavendel-gesichtscreme",
  "/es/productos/crema-facial-de-lavanda",
];
// F-012: the seeded sample category and collection (keep in sync with scripts/seed-data.ts).
const TAXONOMY_PATHS = [
  "/en/face-care",
  "/de/gesichtspflege",
  "/es/cuidado-facial",
  "/en/collections/favourites",
  "/de/kollektionen/lieblinge",
  "/es/colecciones/favoritos",
];
const withProducts = process.env.DEPLOY_ENV !== "Production";
// F-004 CA-9: the component catalogue is noindex, so it is only audited where is-crawlable is
// skipped (deployed URLs, below).
const CATALOG_PATHS = ["/en/catalog", "/de/katalog", "/es/catalogo"];
const urlsFor = (base) =>
  [
    ...LOCALES.map((l) => `/${l}`),
    ...(withProducts ? [...PRODUCT_PATHS, ...TAXONOMY_PATHS] : []),
    ...(url ? CATALOG_PATHS : []),
  ].map((path) => new URL(path, base).toString());
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

module.exports = {
  ci: {
    collect: {
      ...(url
        ? { url: urlsFor(url) }
        : {
            startServerCommand: "pnpm start --port 3100",
            startServerReadyPattern: "Ready",
            url: urlsFor("http://localhost:3100"),
          }),
      numberOfRuns: 3,
      // Sets the bypass cookie (robots.txt is fetched with cookies, not extra headers) and warms
      // the edge cache, so measured page loads skip the set-cookie redirect and a cold cache.
      ...(bypass && { puppeteerScript: "./lighthouse-warmup.cjs" }),
      settings: {
        ...(bypass && {
          extraHeaders: JSON.stringify({
            "x-vercel-protection-bypass": bypass,
            "x-vercel-skip-toolbar": "1",
          }),
        }),
        // Vercel serves every deployment URL (preview and production) with `x-robots-tag: noindex`.
        // Crawlability can only be audited on the custom domain (F-072); robots.txt is still audited.
        ...(url && { skipAudits: ["is-crawlable"] }),
      },
    },
    assert: {
      aggregationMethod: "median-run",
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
