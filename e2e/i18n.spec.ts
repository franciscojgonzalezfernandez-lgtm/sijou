import { expect, test, visit } from "./fixtures";

test.describe("language from the browser", () => {
  test.use({ locale: "de-CH" });

  test("CA-2/CA-6: a German browser lands on /de with lang=de", async ({ page }) => {
    await visit(page, "/");
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
  });

  test("CA-3: the locale cookie wins over the browser language", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "NEXT_LOCALE", value: "es", url: baseURL ?? "" }]);
    await visit(page, "/");
    await expect(page).toHaveURL(/\/es$/);
  });

  test("CA-4: the switcher goes to the same page in Spanish and remembers it", async ({ page }) => {
    await visit(page, "/de");
    await page
      .getByRole("navigation", { name: "Sprache" })
      .getByRole("link", { name: "Español" })
      .click();
    await expect(page).toHaveURL(/\/es$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "NEXT_LOCALE")?.value).toBe("es");
    await visit(page, "/");
    await expect(page).toHaveURL(/\/es$/);
  });
});

test("CA-9: a request without Accept-Language gets /en in one redirect", async ({
  playwright,
  baseURL,
}) => {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const crawler = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass } : {},
  });
  const first = await crawler.get("/", { maxRedirects: 0 });
  expect(first.status()).toBe(307);
  expect(new URL(first.headers()["location"] ?? "", baseURL).pathname).toBe("/en");
  const second = await crawler.get("/en", { maxRedirects: 0 });
  expect(second.status()).toBe(200);
  await crawler.dispose();
});

for (const locale of ["en", "de", "es"] as const) {
  test(`CA-5: /${locale} has hreflang for every language, x-default and canonical`, async ({
    page,
  }) => {
    await visit(page, `/${locale}`);
    for (const lang of ["en", "de", "es"]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute(
        "href",
        new RegExp(`/${lang}$`),
      );
    }
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      /\/en$/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/${locale}$`),
    );
  });
}

test("unsupported language prefix answers 404", async ({ request }) => {
  const response = await request.get("/fr");
  expect(response.status()).toBe(404);
});
