// F-001 CA-5 / constitution I: every category >= 0.90 on the mobile profile, median of 3 runs.
module.exports = {
  ci: {
    collect: {
      startServerCommand: "pnpm start --port 3100",
      startServerReadyPattern: "Ready",
      url: ["http://localhost:3100/"],
      numberOfRuns: 3,
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
