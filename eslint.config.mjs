import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

// eslint-config-next already registers the jsx-a11y and @typescript-eslint plugins,
// so we only layer their stricter rule sets on top (re-registering a plugin throws).
const typeCheckedRules = Object.assign(
  {},
  ...tseslint.configs.recommendedTypeChecked.map((c) => c.rules ?? {}),
);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: jsxA11y.flatConfigs.strict.rules,
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      ...typeCheckedRules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Constitution II + F-001 CA-4: every E2E navigation must go through visit(), which runs axe.
    files: ["e2e/**/*.ts"],
    ignores: ["e2e/fixtures.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='goto']",
          message: "Use visit(page, url) from e2e/fixtures.ts so axe runs on every page.",
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
    "next-env.d.ts",
    "*.config.{js,cjs,mjs}",
    "lighthouserc.cjs",
    "src/payload-types.ts",
    "src/migrations/**",
    "src/app/(payload)/**",
  ]),
]);

export default eslintConfig;
