import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Tests against a migrated Postgres (F-013 plan D-5). Needs DATABASE_URL. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    environment: "node",
    testTimeout: 30_000,
  },
});
