import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}", "src/env.ts"],
      exclude: ["**/*.test.{ts,tsx}"],
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        // Constitution V: critical domain logic needs 100 % branch coverage.
        "src/domain/**": { branches: 100, functions: 100, lines: 100, statements: 100 },
        "src/env.ts": { branches: 100, functions: 100, lines: 100, statements: 100 },
      },
    },
  },
});
