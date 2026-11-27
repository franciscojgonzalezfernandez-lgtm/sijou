import { readFile } from "node:fs/promises";
import path from "node:path";

import { request, type APIRequestContext, type Page } from "@playwright/test";

import { seedProduct, seedProductPaths } from "../scripts/seed-data";
import { adminSession } from "./admin-session";
import { expect, test, visit } from "./fixtures";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
// Production has neither the sample data nor the test admin (F-002 CA-7): previews and local only.
const hasSampleData = process.env.DEPLOY_ENV !== "Production";
const hasTestAdmin = hasSampleData && Boolean(email && password);

function richText(text: string) {
  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          format: "",
          indent: 0,
          version: 1,
          direction: "ltr",
          textFormat: 0,
          children: [
            { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
          ],
        },
      ],
    },
  };
}

// Payload rejects cookie auth from requests without Origin/Sec-Fetch-Site (CSRF), as API calls from
// Playwright are; they authenticate with the login token instead. The browser keeps the cookie.
let token = "";
const auth = () => ({ Authorization: `JWT ${token}` });

async function api<T>(
  request: APIRequestContext,
  method: "post" | "patch" | "get" | "delete",
  url: string,
  data?: unknown,
): Promise<T> {
  const response = await request[method](url, {
    headers: auth(),
    ...(data === undefined ? {} : { data }),
  });
  expect(
    response.ok(),
    `${method.toUpperCase()} ${url} → ${response.status()} ${response.ok() ? "" : await response.text()}`,
  ).toBe(true);
  return (await response.json()) as T;
}

// The categories list is fetched on the client, so its first checkbox proves the form is hydrated
// (changes made before hydration are lost). The seed always creates one category.
const hydrated = (p: Page) =>
  p.getByRole("group", { name: "Categorías" }).getByRole("checkbox").first();

/** Clicks "Guardar" on an existing product and returns the status of the save request. */
async function save(page: Page): Promise<number> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.request().method() === "PATCH" && /\/api\/products\/\d+/.test(r.url()),
    ),
    page.getByRole("button", { name: "Guardar" }).click(),
  ]);
  return response.status();
}

async function login(page: Page) {
  token = await adminSession(page);
}

async function expectNotInStore(page: Page, url: string) {
  // Streamed 404: the first uncached hit can answer 200, so check the page itself.
  await page.goto(url); // eslint-disable-line no-restricted-syntax -- a 404 page must not fail visit()
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/E2E/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
}

test.describe("F-010 sample product in the shop", () => {
  test.skip(!hasSampleData, "needs the seeded sample product (previews and local only)");

  for (const locale of ["en", "de", "es"] as const) {
    test(`CA-9/CA-1: published product visible in ${locale}`, async ({ page }) => {
      await visit(page, seedProductPaths[locale]);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(seedProduct.name[locale]);
      await expect(page.getByText(seedProduct.shortDescription[locale])).toBeVisible();
      await expect(page.getByRole("img", { name: seedProduct.alt[locale] })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${seedProductPaths[locale]}$`),
      );
      for (const other of ["en", "de", "es"] as const) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
          "href",
          new RegExp(`${seedProductPaths[other]}$`),
        );
      }
    });
  }
});

test.describe("F-010 product lifecycle in the admin", () => {
  test.skip(!hasTestAdmin, "needs the seeded test admin (previews and local only)");

  test("CA-1…CA-8: draft in Spanish, blocked publish, complete, publish, hide, archive, delete", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const tag = `${testInfo.project.name}-${Date.now()}`;
    const names = { es: `Jabón E2E ${tag}`, en: `Soap E2E ${tag}`, de: `Seife E2E ${tag}` };
    await login(page);

    let id = "";
    await test.step("CA-3: save a draft with only the Spanish name", async () => {
      await visit(page, "/admin/collections/products/create?locale=es", {
        ready: hydrated,
      });
      await page.getByRole("textbox", { name: /^Nombre/ }).fill(names.es);
      await page.getByRole("button", { name: "Guardar" }).click();
      await page.waitForURL(/\/admin\/collections\/products\/\d+/, { waitUntil: "commit" });
      id = /products\/(\d+)/.exec(page.url())?.[1] ?? "";
      expect(id).not.toBe("");
    });

    await test.step("CA-6/CA-7: slug generated from the name; default restock type", async () => {
      const doc = await api<{ slug: string; status: string; restockType: string }>(
        page.request,
        "get",
        `/api/products/${id}?locale=es&depth=0`,
      );
      expect(doc.slug).toBe(`jabon-e2e-${tag.toLowerCase()}`);
      expect(doc.status).toBe("draft");
      expect(doc.restockType).toBe("replenishable");
    });

    await test.step("CA-2/CA-4: publishing an incomplete product is blocked with the list", async () => {
      await visit(page, `/admin/collections/products/${id}?locale=es`, {
        ready: hydrated,
      });
      await page.getByRole("combobox", { name: "Estado" }).selectOption({ label: "Publicado" });
      expect(await save(page)).toBe(400);
      // The sidebar box lists, from the server, everything still missing in every language.
      const checklist = page.getByRole("region", { name: "Para publicar" });
      await expect(checklist.getByText(/Falta en inglés: .*nombre/)).toBeVisible();
      await expect(checklist.getByText(/Falta en alemán:/)).toBeVisible();
      await expect(checklist.getByText("Falta al menos una categoría.")).toBeVisible();
      await expect(checklist.getByText("Falta al menos una foto.")).toBeVisible();
      const { baseURL, extraHTTPHeaders } = test.info().project.use;
      const anonymous = await request.newContext({ baseURL, extraHTTPHeaders });
      expect((await anonymous.get(`/api/products/${id}/readiness`)).status()).toBe(401);
      await anonymous.dispose();
      const doc = await api<{ status: string }>(page.request, "get", `/api/products/${id}?depth=0`);
      expect(doc.status).toBe("draft");
    });

    await test.step("CA-1/CA-2: complete the three languages, category, variant and photo", async () => {
      const category = await api<{ doc: { id: number } }>(
        page.request,
        "post",
        "/api/categories?locale=es",
        { name: `Categoría ${tag}` },
      );
      for (const locale of ["en", "de"] as const) {
        await api(page.request, "patch", `/api/categories/${category.doc.id}?locale=${locale}`, {
          name: `Category ${locale} ${tag}`,
        });
      }

      const file = await readFile(path.join(import.meta.dirname, "fixtures/sample-product.jpg"));
      const upload = await page.request.post("/api/media?locale=es", {
        headers: auth(),
        multipart: {
          file: { name: `e2e-${tag}.jpg`, mimeType: "image/jpeg", buffer: file },
          _payload: JSON.stringify({ alt: `Foto ${tag}` }),
        },
      });
      expect(upload.ok()).toBe(true);
      const media = ((await upload.json()) as { doc: { id: number } }).doc;
      for (const locale of ["en", "de"] as const) {
        await api(page.request, "patch", `/api/media/${media.id}?locale=${locale}`, {
          alt: `Photo ${locale} ${tag}`,
        });
      }

      await api(page.request, "post", "/api/variants", {
        product: Number(id),
        sku: `E2E-${tag}`,
        price: 12.5,
      });

      for (const locale of ["es", "en", "de"] as const) {
        await api(page.request, "patch", `/api/products/${id}?locale=${locale}`, {
          name: names[locale],
          shortDescription: `Short ${locale} ${tag}`,
          description: richText(`Long ${locale} ${tag}`),
          inci: locale === "en" ? "Aqua, Glycerin" : undefined,
          categories: [category.doc.id],
          gallery: [{ image: media.id }],
        });
      }
    });

    let slugs: Record<"es" | "en" | "de", string> = { es: "", en: "", de: "" };
    await test.step("CA-2/CA-10: publish from the admin", async () => {
      await visit(page, `/admin/collections/products/${id}?locale=es`, {
        ready: hydrated,
      });
      await expect(
        page.getByRole("region", { name: "Para publicar" }).getByText("Listo para publicar."),
      ).toBeVisible();
      await page.getByRole("combobox", { name: "Estado" }).selectOption({ label: "Publicado" });
      expect(await save(page)).toBe(200);
      await expect
        .poll(async () => {
          const doc = await api<{ status: string }>(
            page.request,
            "get",
            `/api/products/${id}?depth=0`,
          );
          return doc.status;
        })
        .toBe("published");
      const all = await api<{ slug: typeof slugs }>(
        page.request,
        "get",
        `/api/products/${id}?locale=all&depth=0`,
      );
      slugs = all.slug;
    });

    const storeUrls = () => ({
      en: `/en/products/${slugs.en}`,
      de: `/de/produkte/${slugs.de}`,
      es: `/es/productos/${slugs.es}`,
    });

    await test.step("CA-5/CA-9: visible in the shop in the three languages", async () => {
      for (const [locale, url] of Object.entries(storeUrls()) as ["es" | "en" | "de", string][]) {
        await visit(page, url);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(names[locale]);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
      }
      await expect(page.getByText("Aqua, Glycerin")).toHaveCount(0);
      await visit(page, storeUrls().en);
      await expect(page.getByText("Aqua, Glycerin")).toBeVisible();
    });

    await test.step("CA-6: the same slug in another language is allowed, in the same one it is not", async () => {
      const clash = await page.request.post("/api/products?locale=es", {
        headers: auth(),
        data: { name: "Otro", slug: slugs.es },
      });
      expect(clash.status()).toBe(400);
      const ok = await api<{ doc: { id: number } }>(
        page.request,
        "post",
        "/api/products?locale=de",
        {
          name: "Anderes",
          slug: slugs.es,
        },
      );
      await api(page.request, "delete", `/api/products/${ok.doc.id}`);
    });

    await test.step("CA-5: hidden products leave the shop", async () => {
      await api(page.request, "patch", `/api/products/${id}?locale=es`, { status: "hidden" });
      await expectNotInStore(page, storeUrls().es);
    });

    await test.step("CA-5: archived products leave the shop and the default admin list", async () => {
      await api(page.request, "patch", `/api/products/${id}?locale=es`, { status: "archived" });
      await expectNotInStore(page, storeUrls().en);
      await visit(page, "/admin/collections/products?locale=es", {
        ready: (p) => p.getByRole("heading", { name: "Productos", level: 1 }),
      });
      await expect(page.getByRole("link", { name: names.es })).toHaveCount(0);
      const filtered = `/admin/collections/products?locale=es&where[status][equals]=archived`;
      await visit(page, filtered, {
        ready: (p) => p.getByRole("heading", { name: "Productos", level: 1 }),
      });
      await expect(page.getByRole("link", { name: names.es })).toBeVisible();
    });

    await test.step("CA-8: a product without orders can be deleted after confirming", async () => {
      await visit(page, `/admin/collections/products/${id}?locale=es`, {
        ready: hydrated,
      });
      await page
        .getByRole("button", { name: /más opciones|opciones/i })
        .first()
        .click();
      await page.getByRole("button", { name: "Eliminar" }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /Confirmar|Eliminar/ })
        .click();
      await page.waitForURL(/\/admin\/collections\/products(\?|$)/, { waitUntil: "commit" });
      const gone = await page.request.get(`/api/products/${id}`, { headers: auth() });
      expect(gone.status()).toBe(404);
    });
  });
});
