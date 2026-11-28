import { readFile } from "node:fs/promises";
import path from "node:path";

import type { APIRequestContext, APIResponse, Page } from "@playwright/test";

import {
  seedCategoryPaths,
  seedCollectionPaths,
  seedProduct,
  seedTaxonomy,
} from "../scripts/seed-data";
import { adminSession } from "./admin-session";
import { expect, test, visit } from "./fixtures";

const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
// Production has neither the sample data nor the test admin (F-002 CA-7): previews and local only.
const hasSampleData = process.env.DEPLOY_ENV !== "Production";
const hasTestAdmin = hasSampleData && Boolean(email && password);

const LOCALES = ["es", "en", "de"] as const;
type Locale = (typeof LOCALES)[number];
type Texts = Record<Locale, string>;

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

// API calls authenticate with the login token: Payload's CSRF check rejects cookie auth from
// requests without Origin. The browser keeps the cookie the login sets.
let token = "";
const auth = () => ({ Authorization: `JWT ${token}` });

async function call(
  request: APIRequestContext,
  method: "post" | "patch" | "get" | "delete",
  url: string,
  data?: unknown,
): Promise<APIResponse> {
  return request[method](url, { headers: auth(), ...(data === undefined ? {} : { data }) });
}

async function api<T>(
  request: APIRequestContext,
  method: "post" | "patch" | "get" | "delete",
  url: string,
  data?: unknown,
): Promise<T> {
  const response = await call(request, method, url, data);
  expect(
    response.ok(),
    `${method.toUpperCase()} ${url} → ${response.status()} ${response.ok() ? "" : await response.text()}`,
  ).toBe(true);
  return (await response.json()) as T;
}

/**
 * An admin save expires the catalog cache at once, but on Vercel other instances can serve the
 * old page for a few seconds. Shop checks after a write reload until they see the change.
 */
const PROPAGATION = { timeout: 30_000, intervals: [1_000, 2_000, 5_000] };

/** Visits a shop page until `check` passes. */
async function expectInStore(page: Page, url: string, check: () => Promise<void>) {
  await expect(async () => {
    await visit(page, url);
    await check();
  }).toPass(PROPAGATION);
}

/** Visits a shop page that must be a 404 (streamed: the first hit can answer 200). */
async function expectNotInStore(page: Page, url: string) {
  await expect(async () => {
    await page.goto(url); // eslint-disable-line no-restricted-syntax -- a 404 page must not fail visit()
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
      { timeout: 2_000 },
    );
  }).toPass(PROPAGATION);
}

const slugOf = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function texts(base: Texts, tag: string): { name: Texts; slug: Texts } {
  const name = Object.fromEntries(LOCALES.map((l) => [l, `${base[l]} ${tag}`])) as Texts;
  const slug = Object.fromEntries(LOCALES.map((l) => [l, slugOf(name[l])])) as Texts;
  return { name, slug };
}

/** A category complete in the three languages, published unless `status` says otherwise. */
async function createCategory(
  request: APIRequestContext,
  t: { name: Texts; slug: Texts },
  extra: Record<string, unknown> = {},
  status = "published",
): Promise<number> {
  const { doc } = await api<{ doc: { id: number } }>(request, "post", "/api/categories?locale=es", {
    name: t.name.es,
    slug: t.slug.es,
    ...extra,
  });
  for (const locale of ["en", "de"] as const) {
    await api(request, "patch", `/api/categories/${doc.id}?locale=${locale}`, {
      name: t.name[locale],
      slug: t.slug[locale],
    });
  }
  if (status !== "draft") {
    await api(request, "patch", `/api/categories/${doc.id}?locale=es`, { status });
  }
  return doc.id;
}

/** A published product in the given categories: texts in 3 languages, a photo and a variant. */
async function createProduct(
  request: APIRequestContext,
  t: { name: Texts; slug: Texts },
  categories: number[],
): Promise<{ id: number; media: number }> {
  const file = await readFile(path.join(import.meta.dirname, "fixtures/sample-product.jpg"));
  const upload = await request.post("/api/media?locale=es", {
    headers: auth(),
    multipart: {
      file: { name: "sample-product.jpg", mimeType: "image/jpeg", buffer: file },
      _payload: JSON.stringify({ alt: `Foto ${t.name.es}` }),
    },
  });
  expect(upload.ok(), `upload → ${upload.status()} ${await upload.text()}`).toBe(true);
  const media = ((await upload.json()) as { doc: { id: number } }).doc.id;
  const { doc } = await api<{ doc: { id: number } }>(request, "post", "/api/products?locale=es", {
    name: t.name.es,
    categories,
    gallery: [{ image: media }],
  });
  for (const locale of LOCALES) {
    await api(request, "patch", `/api/media/${media}?locale=${locale}`, {
      alt: `Foto ${t.name[locale]}`,
    });
    await api(request, "patch", `/api/products/${doc.id}?locale=${locale}`, {
      name: t.name[locale],
      slug: t.slug[locale],
      shortDescription: `${t.name[locale]}.`,
      description: richText(`${t.name[locale]}.`),
    });
  }
  await api(request, "post", "/api/variants", {
    product: doc.id,
    sku: `CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    price: 10,
    active: true,
  });
  await api(request, "patch", `/api/products/${doc.id}?locale=es`, { status: "published" });
  return { id: doc.id, media };
}

const REGIONS = {
  es: { subcategories: "Subcategorías", products: "Productos" },
  en: { subcategories: "Subcategories", products: "Products" },
  de: { subcategories: "Unterkategorien", products: "Produkte" },
} as const;
const subcategoryLinks = (page: Page, locale: Locale = "es") =>
  page.getByRole("region", { name: REGIONS[locale].subcategories }).getByRole("link");
const productLinks = (page: Page, locale: Locale = "es") =>
  page.getByRole("region", { name: REGIONS[locale].products }).getByRole("link");

test.describe("F-012 sample category and collection in the shop", () => {
  test.skip(!hasSampleData, "needs the seeded sample data (previews and local only)");

  for (const locale of LOCALES) {
    test(`CA-1/CA-2: sample category and collection in ${locale}`, async ({ page }) => {
      await visit(page, seedCategoryPaths[locale]);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        seedProduct.category[locale],
      );
      const crumbs = page
        .getByRole("navigation", { name: /./ })
        .filter({ has: page.locator("ol") });
      await expect(crumbs.locator('[aria-current="page"]')).toHaveText(
        seedProduct.category[locale],
      );
      await expect(page.getByText(seedTaxonomy.category.description[locale])).toBeVisible();
      await expect(subcategoryLinks(page, locale)).toHaveText([
        seedTaxonomy.subcategory.name[locale],
      ]);
      await expect(productLinks(page, locale)).toContainText([seedProduct.name[locale]]);
      for (const other of LOCALES) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${other}"]`)).toHaveAttribute(
          "href",
          new RegExp(`${seedCategoryPaths[other]}$`),
        );
      }

      await visit(page, seedCollectionPaths[locale]);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        seedTaxonomy.collection.name[locale],
      );
      await expect(productLinks(page, locale)).toContainText([seedProduct.name[locale]]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${seedCollectionPaths[locale]}$`),
      );
    });
  }
});

test.describe("F-012 categories and collections in the admin", () => {
  test.skip(!hasTestAdmin, "needs the seeded test admin (previews and local only)");

  test("CA-1…CA-6: tree, publishing, order, visibility dates, hiding and deleting", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    token = await adminSession(page);
    const request = page.request;
    const tag = `${testInfo.project.name}-${Date.now()}`;
    const rostro = texts({ es: "Rostro", en: "Face", de: "Gesicht" }, tag);
    const cremas = texts({ es: "Cremas", en: "Creams", de: "Cremes" }, tag);
    const noche = texts({ es: "Noche", en: "Night", de: "Nacht" }, tag);
    const aceites = texts({ es: "Aceites", en: "Oils", de: "Öle" }, tag);
    const cleanup: (() => Promise<unknown>)[] = [];
    let productId = 0;

    try {
      let rostroId = 0;
      await test.step("CA-3: a category only in Spanish cannot be published", async () => {
        await visit(page, "/admin/collections/categories/create?locale=es", {
          ready: (p) => p.getByRole("combobox", { name: /Categoría superior/ }),
        });
        await expect(page.getByRole("combobox", { name: /Categoría superior/ })).toBeEnabled();
        await page.getByRole("textbox", { name: /^Nombre/ }).fill(rostro.name.es);
        await page.getByRole("combobox", { name: /^Estado/ }).selectOption("published");
        await page.getByRole("button", { name: "Guardar", exact: true }).click();
        await expect(
          page.getByText(/No se puede publicar\. Falta en inglés: nombre, slug\./),
        ).toBeVisible();
        await expect(page.getByText(/Falta en alemán: nombre, slug\./)).toBeVisible();

        await page.getByRole("combobox", { name: /^Estado/ }).selectOption("draft");
        await Promise.all([
          page.waitForURL(/\/admin\/collections\/categories\/\d+/),
          page.getByRole("button", { name: "Guardar", exact: true }).click(),
        ]);
        rostroId = Number(/categories\/(\d+)/.exec(page.url())?.[1]);
        cleanup.push(() => call(request, "delete", `/api/categories/${rostroId}`));
        for (const locale of ["en", "de"] as const) {
          await api(request, "patch", `/api/categories/${rostroId}?locale=${locale}`, {
            name: rostro.name[locale],
            slug: rostro.slug[locale],
          });
        }
        await api(request, "patch", `/api/categories/${rostroId}?locale=es`, {
          slug: rostro.slug.es,
          status: "published",
        });
      });

      const cremasId = await createCategory(request, cremas, { parent: rostroId });
      cleanup.unshift(() => call(request, "delete", `/api/categories/${cremasId}`));
      const nocheId = await createCategory(request, noche, { parent: cremasId, position: 1 });
      cleanup.unshift(() => call(request, "delete", `/api/categories/${nocheId}`));
      const nochePath = `/es/${rostro.slug.es}/${cremas.slug.es}/${noche.slug.es}`;

      await test.step("CA-1: three levels with breadcrumbs in the shop", async () => {
        await visit(page, nochePath);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(noche.name.es);
        const trail = page.getByRole("navigation", { name: "Estás aquí" }).getByRole("listitem");
        await expect(trail).toHaveText([
          "Inicio/",
          `${rostro.name.es}/`,
          `${cremas.name.es}/`,
          noche.name.es,
        ]);
        await expect(
          page.getByRole("navigation", { name: "Estás aquí" }).locator('[aria-current="page"]'),
        ).toHaveText(noche.name.es);
      });

      await test.step("CA-1 edge cases: no 4th level, no cycles", async () => {
        const fourth = await call(request, "post", "/api/categories?locale=es", {
          name: `Cuarto ${tag}`,
          parent: nocheId,
        });
        expect(fourth.status()).toBe(400);
        expect(await fourth.text()).toContain("Máximo 3 niveles");
        const cycle = await call(request, "patch", `/api/categories/${rostroId}?locale=es`, {
          parent: nocheId,
        });
        expect(cycle.status()).toBe(400);
        expect(await cycle.text()).toContain("No puede estar dentro de sí misma");

        // The parent list never offers the category itself or its subcategories.
        await visit(page, `/admin/collections/categories/${rostroId}`, {
          ready: (p) => p.getByRole("combobox", { name: /Categoría superior/ }),
        });
        const parent = page.getByRole("combobox", { name: /Categoría superior/ });
        await expect(parent).toBeEnabled();
        await expect(parent.locator("option", { hasText: tag })).toHaveCount(0);
      });

      await test.step("CA-1: moving a category changes its URL; position orders siblings", async () => {
        await api(request, "patch", `/api/categories/${nocheId}?locale=es`, { parent: rostroId });
        await expectInStore(page, `/es/${rostro.slug.es}/${noche.slug.es}`, async () => {
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(noche.name.es);
        });
        await expectNotInStore(page, nochePath);

        const aceitesId = await createCategory(request, aceites, { parent: rostroId, position: 0 });
        cleanup.unshift(() => call(request, "delete", `/api/categories/${aceitesId}`));
        await expectInStore(page, `/es/${rostro.slug.es}`, async () => {
          await expect(subcategoryLinks(page)).toHaveText([
            aceites.name.es,
            cremas.name.es,
            noche.name.es,
          ]);
        });
        await api(request, "patch", `/api/categories/${aceitesId}?locale=es`, { position: 5 });
        await expectInStore(page, `/es/${rostro.slug.es}`, async () => {
          await expect(subcategoryLinks(page)).toHaveText([
            cremas.name.es,
            noche.name.es,
            aceites.name.es,
          ]);
        });

        // CA-2: a product in two categories and two collections shows in all four.
        const product = await createProduct(
          request,
          texts({ es: "Bálsamo", en: "Balm", de: "Balsam" }, tag),
          [nocheId, aceitesId],
        );
        cleanup.unshift(() => call(request, "delete", `/api/media/${product.media}`));
        cleanup.unshift(() => call(request, "delete", `/api/products/${product.id}`));
        productId = product.id;
        for (const url of [
          `/es/${rostro.slug.es}/${noche.slug.es}`,
          `/es/${rostro.slug.es}/${aceites.slug.es}`,
        ]) {
          await visit(page, url);
          await expect(productLinks(page)).toContainText([`Bálsamo ${tag}`]);
        }
      });

      const favoritos = texts({ es: "Favoritos", en: "Favourites", de: "Lieblinge" }, tag);
      const navidad = texts({ es: "Navidad", en: "Christmas", de: "Weihnachten" }, tag);
      const collectionIds: number[] = [];
      for (const t of [favoritos, navidad]) {
        const { doc } = await api<{ doc: { id: number } }>(
          request,
          "post",
          "/api/product-collections?locale=es",
          { name: t.name.es, slug: t.slug.es, products: [productId] },
        );
        collectionIds.push(doc.id);
        cleanup.unshift(() => call(request, "delete", `/api/product-collections/${doc.id}`));
        for (const locale of ["en", "de"] as const) {
          await api(request, "patch", `/api/product-collections/${doc.id}?locale=${locale}`, {
            name: t.name[locale],
            slug: t.slug[locale],
          });
        }
        await api(request, "patch", `/api/product-collections/${doc.id}?locale=es`, {
          status: "published",
        });
      }
      const [favoritosId, navidadId] = collectionIds as [number, number];

      await test.step("CA-2/CA-4: collections in hand-made order, reordered with the keyboard", async () => {
        const seedId = (
          await api<{ docs: { id: number }[] }>(
            request,
            "get",
            `/api/products?locale=es&depth=0&where[slug][equals]=${seedProduct.slug.es}`,
          )
        ).docs[0]?.id;
        expect(seedId, "seeded sample product").toBeDefined();
        await api(request, "patch", `/api/product-collections/${favoritosId}?locale=es`, {
          products: [productId, seedId],
        });
        await expectInStore(page, `/es/colecciones/${favoritos.slug.es}`, async () => {
          await expect(productLinks(page)).toHaveText([`Bálsamo ${tag}`, seedProduct.name.es]);
        });
        await expectInStore(page, `/de/kollektionen/${navidad.slug.de}`, async () => {
          await expect(productLinks(page, "de")).toHaveText([`Balsam ${tag}`]);
        });

        await visit(page, `/admin/collections/product-collections/${favoritosId}`, {
          ready: (p) => p.getByRole("button", { name: `Bajar Bálsamo ${tag}` }),
        });
        await page.getByRole("button", { name: `Bajar Bálsamo ${tag}` }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByText(`Bálsamo ${tag}: posición 2 de 2.`)).toBeAttached();
        await Promise.all([
          page.waitForResponse(
            (r) =>
              r.request().method() === "PATCH" && r.url().includes("/api/product-collections/"),
          ),
          page.getByRole("button", { name: "Guardar", exact: true }).click(),
        ]);
        await expectInStore(page, `/es/colecciones/${favoritos.slug.es}`, async () => {
          await expect(productLinks(page)).toHaveText([seedProduct.name.es, `Bálsamo ${tag}`]);
        });
      });

      await test.step("CA-4: a collection stops showing when its end date passes", async () => {
        const bad = await call(
          request,
          "patch",
          `/api/product-collections/${navidadId}?locale=es`,
          {
            visibleFrom: "2026-12-24T00:00:00.000Z",
            visibleUntil: "2026-12-01T00:00:00.000Z",
          },
        );
        expect(bad.status()).toBe(400);
        expect(await bad.text()).toContain("La fecha de fin debe ser posterior a la de inicio.");

        const until = new Date(Date.now() + 20_000);
        await api(request, "patch", `/api/product-collections/${navidadId}?locale=es`, {
          visibleUntil: until.toISOString(),
        });
        await expectInStore(page, `/es/colecciones/${navidad.slug.es}`, async () => {
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(navidad.name.es);
        });
        await page.waitForTimeout(Math.max(0, until.getTime() - Date.now()) + 1_000);
        // The cache entry ends with the date; the first visit after it may still be the old page.
        await expect
          .poll(
            async () => {
              await page.goto(`/es/colecciones/${navidad.slug.es}`); // eslint-disable-line no-restricted-syntax -- a 404 page must not fail visit()
              return page.locator('meta[name="robots"]').first().getAttribute("content");
            },
            { timeout: 30_000, intervals: [1_000, 2_000, 3_000] },
          )
          .toMatch(/noindex/);
      });

      await test.step("CA-6: hiding a category hides its branch; hiding a collection hides it", async () => {
        await api(request, "patch", `/api/categories/${rostroId}?locale=es`, { status: "hidden" });
        await expectNotInStore(page, `/es/${rostro.slug.es}`);
        await expectNotInStore(page, `/es/${rostro.slug.es}/${noche.slug.es}`);
        await api(request, "patch", `/api/categories/${rostroId}?locale=es`, {
          status: "published",
        });
        await expectInStore(page, `/es/${rostro.slug.es}/${noche.slug.es}`, async () => {
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(noche.name.es);
        });

        await api(request, "patch", `/api/product-collections/${favoritosId}?locale=es`, {
          status: "hidden",
        });
        await expectNotInStore(page, `/es/colecciones/${favoritos.slug.es}`);
      });

      await test.step("CA-5: deleting warns first, never deletes products", async () => {
        const blocked = await call(request, "delete", `/api/categories/${rostroId}`);
        expect(blocked.status()).toBe(400);
        expect(await blocked.text()).toContain("Tiene subcategorías");
        await visit(page, `/admin/collections/categories/${rostroId}`, {
          ready: (p) => p.getByRole("region", { name: "Al borrarla" }).getByText(/subcategorías/),
        });

        // The balm is in Noche and Aceites: leaving only Noche, deleting Noche orphans it.
        await api(request, "patch", `/api/products/${productId}?locale=es`, {
          categories: [nocheId],
        });
        await visit(page, `/admin/collections/categories/${nocheId}`, {
          ready: (p) =>
            p
              .getByRole("region", { name: "Al borrarla" })
              .getByRole("link", { name: `Bálsamo ${tag}` }),
        });
        await expect(
          page
            .getByRole("region", { name: "Al borrarla" })
            .getByText("Se quedarían sin ninguna categoría:"),
        ).toBeVisible();
        await api(request, "delete", `/api/categories/${nocheId}`);
        const product = await api<{ categories: unknown[]; status: string }>(
          request,
          "get",
          `/api/products/${productId}?depth=0`,
        );
        expect(product.categories).toEqual([]);
        expect(product.status).toBe("published");
      });
    } finally {
      for (const undo of cleanup) await undo().catch(() => undefined);
    }
  });
});
