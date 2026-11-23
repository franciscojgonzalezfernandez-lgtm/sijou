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
            "x-vercel-skip-toolbar": "1",
          }),
        }),
        // Vercel marks preview deployments noindex on purpose; crawlability is checked on production.
        ...(process.env.LHCI_PREVIEW === "1" && { skipAudits: ["is-crawlable"] }),
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
