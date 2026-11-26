import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Locator, type Page } from "@playwright/test";

export { expect };

/**
 * Against protected Vercel previews the browser must not send the bypass headers everywhere:
 * cross-origin requests (direct uploads to Vercel Blob, F-011 CA-7) fail CORS on them, and the
 * secret would leave our deployment. The browser gets the bypass cookie instead, which only goes
 * to our origin, and our own pages get the header that hides the Vercel toolbar.
 */
export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (secret && baseURL) {
      const origin = new URL(baseURL).origin;
      await context.setExtraHTTPHeaders({});
      await context.request.get("/", {
        headers: { "x-vercel-protection-bypass": secret, "x-vercel-set-bypass-cookie": "true" },
        maxRedirects: 0,
      });
      await context.route(
        (url) => url.origin === origin,
        (route) =>
          route.request().resourceType() === "document"
            ? route.continue({
                headers: { ...route.request().headers(), "x-vercel-skip-toolbar": "1" },
              })
            : route.continue(),
      );
    }
    await provide(context);
  },
});

/** WCAG 2.2 AA (constitution II). */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Navigates to `url` and fails the test on any axe violation (F-001 CA-4).
 * All E2E navigation must go through this helper; ESLint forbids page.goto elsewhere.
 */
export async function visit(
  page: Page,
  url: string,
  options: {
    /** Element that proves the page has settled (client redirects, hydration) before auditing. */
    ready?: (page: Page) => Locator;
  } = {},
): Promise<void> {
  const response = await page.goto(url);
  // 304: WebKit revalidates a page it has already seen; the cached copy is what it shows.
  const status = response?.status() ?? 0;
  expect(status >= 200 && status < 400, `GET ${url} returned ${status}`).toBe(true);
  await page.waitForLoadState("load");
  if (options.ready) await options.ready(page).waitFor();
  // Audit the settled page: mid-fade elements report false colour-contrast failures.
  // Infinite animations (skeleton pulse, spinners) never finish, so they are not awaited.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => null)),
    ),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(
    violations.map(
      (v) =>
        `${v.id}: ${v.help} (${v.nodes.length} nodes: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")})`,
    ),
    "axe violations",
  ).toEqual([]);
}
