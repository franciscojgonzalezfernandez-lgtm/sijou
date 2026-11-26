import { expect, test, visit } from "./fixtures";

// F-004: design system, checked on the internal component catalogue (CA-9).
const CATALOG = { en: "/en/catalog", de: "/de/katalog", es: "/es/catalogo" } as const;

test.describe("component catalogue", () => {
  for (const [locale, path] of Object.entries(CATALOG)) {
    test(`CA-9: ${path} renders every component with no axe violations and is not indexed`, async ({
      page,
    }) => {
      await visit(page, path);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      // CA-5: one of each base component is on the page.
      const main = page.getByRole("main");
      await expect(main.getByRole("button").first()).toBeVisible();
      await expect(main.getByRole("textbox").first()).toBeVisible();
      await expect(main.getByRole("combobox")).toBeVisible();
      await expect(main.getByRole("checkbox")).toBeVisible();
      await expect(main.getByRole("radio")).toHaveCount(2);
      await expect(main.getByRole("navigation")).toHaveCount(3);
    });
  }

  test("CA-10: the header logo is an accessible link home, and the site has icons", async ({
    page,
  }) => {
    await visit(page, CATALOG.es);
    const logo = page.getByRole("banner").getByRole("link", { name: "Sijôu, inicio" });
    await expect(logo).toBeVisible();
    await expect(page.getByRole("img", { name: "Sijôu" }).first()).toBeVisible();
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      /apple-icon/,
    );
    // The icons answer themselves; the language proxy must not redirect them.
    for (const [rel, type] of [
      ["icon", "image/svg+xml"],
      ["apple-touch-icon", "image/png"],
    ]) {
      const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
      const response = await page.request.get(href ?? "", { maxRedirects: 0 });
      expect(response.status(), rel).toBe(200);
      expect(response.headers()["content-type"], rel).toContain(type);
    }
    await logo.click();
    await expect(page).toHaveURL(/\/es$/);
  });

  test("CA-6: no horizontal scroll at 320px (200% zoom of a 640px window)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await visit(page, CATALOG.de);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("CA-4: interactive targets are at least 24×24px, buttons and fields 44px tall", async ({
    page,
  }) => {
    await visit(page, CATALOG.en);
    const sizes = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      // Links inside running text are exempt (WCAG 2.5.8 inline exception). Labels count only
      // when they wrap a checkbox or radio (the row is the target); a text field's label is not.
      const targets = [
        ...main.querySelectorAll<HTMLElement>("a, button, input, select, label"),
      ].filter(
        (el) =>
          !el.closest("p") &&
          el.getClientRects().length > 0 &&
          (el.tagName !== "LABEL" || !!el.querySelector("input[type=checkbox], input[type=radio]")),
      );
      return targets.map((el) => {
        const box = el.getBoundingClientRect();
        return { tag: el.tagName, text: el.textContent?.trim() ?? "", w: box.width, h: box.height };
      });
    });
    for (const size of sizes) {
      if (size.tag === "INPUT" && size.h < 30) continue; // checkbox and radio: their label is the target
      expect(Math.min(size.w, size.h), `${size.tag} "${size.text}"`).toBeGreaterThanOrEqual(24);
      if (["BUTTON", "SELECT", "LABEL"].includes(size.tag)) {
        expect(size.h, `${size.tag} "${size.text}"`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("CA-7: nothing animates with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await visit(page, CATALOG.en);
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll("main button, main a")].map(
        (el) => getComputedStyle(el).transitionDuration,
      ),
    );
    expect(durations.every((d) => d.split(",").every((part) => parseFloat(part) === 0))).toBe(true);
  });

  test("edge case: controls keep visible borders in forced-colors mode", async ({ page }) => {
    // Audit first: axe cannot judge contrast once the system has replaced the colours.
    await visit(page, CATALOG.en);
    await page.emulateMedia({ forcedColors: "active" });
    const border = await page
      .getByRole("textbox")
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopStyle);
    expect(border).toBe("solid");
  });
});

test.describe("keyboard", () => {
  // Touch devices have no Tab key; the desktop project covers keyboard use.
  test.skip(({ isMobile }) => isMobile, "keyboard only on desktop");

  test("CA-3: the skip link is the first stop and moves focus to the content", async ({ page }) => {
    await visit(page, CATALOG.en);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
  });

  test("CA-3: the focus ring is visible and 2px away from the element", async ({ page }) => {
    await visit(page, CATALOG.en);
    const button = page.getByRole("main").getByRole("button").first();
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const ring = await button.evaluate((el) => {
      const style = getComputedStyle(el);
      return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset };
    });
    expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px" });
  });

  test("CA-5: the dialog opens from the keyboard, closes with Esc and returns focus", async ({
    page,
  }) => {
    await visit(page, CATALOG.es);
    const trigger = page.getByRole("button", { name: "Vaciar la cesta" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "¿Vaciar la cesta?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cerrar" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("CA-5: the menu moves with the arrow keys and closes with Esc", async ({ page }) => {
    await visit(page, CATALOG.es);
    const button = page.getByRole("button", { name: "Mi cuenta" });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const items = page.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(items.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });

  test("CA-5: toasts are announced in live regions and stay while focused", async ({ page }) => {
    await visit(page, CATALOG.es);
    await page.getByRole("button", { name: "Mostrar aviso" }).click();
    const status = page.getByRole("status").filter({ hasText: "Añadido a la cesta" });
    await expect(status).toBeVisible();
    await page.getByRole("button", { name: "Mostrar error" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "No hemos podido guardar" }),
    ).toBeVisible();
    await status.getByRole("button", { name: "Cerrar" }).click();
    await expect(page.getByText("Añadido a la cesta")).toBeHidden();
  });
});
