// F-001 CA-5 / constitution I: every category >= 0.90 on the mobile profile, median of 3 runs.
// Locally (and without LHCI_URL) it starts `next start`; in CI it audits the Vercel preview (F-002).
const url = process.env.LHCI_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

module.exports = {
  ci: {
    collect: {
      ...(url
        ? { url: [url] }
        : {
            startServerCommand: "pnpm start --port 3100",
            startServerReadyPattern: "Ready",
            url: ["http://localhost:3100/"],
          }),
      numberOfRuns: 3,
      settings: {
        ...(bypass && {
          extraHeaders: JSON.stringify({
            "x-vercel-protection-bypass": bypass,
            // Sets a bypass cookie so Lighthouse's own fetches (robots.txt) also get through.
            "x-vercel-set-bypass-cookie": "true",
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
