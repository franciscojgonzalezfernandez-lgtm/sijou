import { expect, test, visit } from "./fixtures";

test.describe("placeholder page", () => {
  test("CA-3/CA-4: renders the heading with no axe violations", async ({ page }) => {
    await visit(page, "/");
    await expect(page.getByRole("heading", { level: 1, name: "Sijou" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle(/Sijou/);
  });
});
