import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    // Postgres tests run on their own, after migrations (`pnpm test:integration`).
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
    environment: "node",
    // next-intl imports `next/server` without an extension; let Vite resolve it.
    server: { deps: { inline: ["next-intl"] } },
    coverage: {
      provider: "v8",
      include: [
        "src/domain/**/*.{ts,tsx}",
        "src/lib/**/*.{ts,tsx}",
        "src/env.ts",
        "src/i18n/**/*.ts",
        "src/proxy.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "src/i18n/request.ts",
        "src/i18n/navigation.ts",
        "src/i18n/root-locale.ts",
      ],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        // Constitution V: critical domain logic needs 100 % branch coverage.
        "src/domain/**": { branches: 100, functions: 100, lines: 100, statements: 100 },
        "src/env.ts": { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
