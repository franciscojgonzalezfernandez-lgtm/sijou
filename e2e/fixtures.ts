import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export { expect, test } from "@playwright/test";

/** WCAG 2.2 AA (constitution II). */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Navigates to `url` and fails the test on any axe violation (F-001 CA-4).
 * All E2E navigation must go through this helper; ESLint forbids page.goto elsewhere.
 */
export async function visit(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  expect(response?.ok(), `GET ${url} returned ${response?.status()}`).toBe(true);
  await page.waitForLoadState("load");
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
    "axe violations",
  ).toEqual([]);
}
