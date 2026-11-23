import type { Page } from "@playwright/test";

import { expect, test, visit } from "./fixtures";

test.describe("admin panel", () => {
  const loginButton = (page: Page) => page.getByRole("button", { name: "Iniciar sesión" });

  test("CA-4: /admin asks to sign in, in Spanish, with no axe violations", async ({ page }) => {
    await visit(page, "/admin", { ready: loginButton });
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("CA-8: /admin is never indexed", async ({ page, request }) => {
    const response = await request.get("/admin");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    await visit(page, "/admin", { ready: loginButton });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});

test("CA-8: robots.txt keeps /admin and /api out of search engines", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toMatch(/Disallow: \/admin/);
  expect(body).toMatch(/Disallow: \/api/);
});
