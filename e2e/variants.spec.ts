import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { APIRequestContext, Page } from "@playwright/test";
import sharp from "sharp";

import { seedProductPaths } from "../scripts/seed-data";
import { expect, test, visit } from "./fixtures";

// F-011: variants and images. Admin flows need the seeded test admin (previews and local only).
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const hasSampleData = process.env.DEPLOY_ENV !== "Production";
const hasTestAdmin = hasSampleData && Boolean(email && password);
// On Vercel previews photos go straight from the browser to Blob with progress (CA-7); locally,
// through the server, without it.
const directUploads = Boolean(process.env.BASE_URL);

type Locale = "es" | "en" | "de";
interface Variant {
  id: number;
  sku: string;
  size?: string | null;
  scent?: string | null;
  active?: boolean;
  ean?: string | null;
  compareAtPrice?: number | null;
  weightGrams?: number | null;
  netQuantity?: number | null;
  netUnit?: string | null;
}
interface Option {
  id: string;
  attribute: string;
  values: { id: string; code: string; label: string }[];
}

// Payload rejects cookie auth from requests without Origin (CSRF), as Playwright's API calls are;
// they use the login token. The browser keeps the cookie for the admin pages.
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

async function login(page: Page) {
  const result = await api<{ token: string }>(page.request, "post", "/api/users/login", {
    email,
    password,
  });
  token = result.token;
}

// The categories checkboxes are fetched on the client: their first one proves the form is hydrated.
const hydrated = (p: Page) =>
  p.getByRole("group", { name: "Categorías" }).getByRole("checkbox").first();

async function savedStatus(page: Page, collection: "products" | "variants"): Promise<number> {
  await expect(page.getByRole("button", { name: "Guardar" })).toBeEnabled();
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.request().method() === "PATCH" && new RegExp(`/api/${collection}/\\d+`).test(r.url()),
    ),
    page.getByRole("button", { name: "Guardar" }).click(),
  ]);
  return response.status();
}

async function uploadPhoto(
  request: APIRequestContext,
  name: string,
  alt: Partial<Record<Locale, string>>,
): Promise<number> {
  const file = await readFile(path.join(import.meta.dirname, "fixtures/sample-product.jpg"));
  const upload = await request.post("/api/media?locale=es", {
    headers: auth(),
    multipart: {
      file: { name, mimeType: "image/jpeg", buffer: file },
      _payload: JSON.stringify({ alt: alt.es }),
    },
  });
  expect(upload.ok(), await upload.text()).toBe(true);
  const id = ((await upload.json()) as { doc: { id: number } }).doc.id;
  for (const locale of ["en", "de"] as const) {
    if (alt[locale]) {
      await api(request, "patch", `/api/media/${id}?locale=${locale}`, { alt: alt[locale] });
    }
  }
  return id;
}

async function variantsOf(request: APIRequestContext, productId: number): Promise<Variant[]> {
  const result = await api<{ docs: Variant[] }>(
    request,
    "get",
    `/api/variants?where[product][equals]=${productId}&depth=0&limit=100&sort=sku`,
  );
  return result.docs;
}

test.describe("F-011 variants and photos in the admin", () => {
  test.skip(!hasTestAdmin, "needs the seeded test admin (previews and local only)");

  test("CA-1…CA-7: attributes, generated variants, variant fields, gallery and limits", async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(180_000);
    const tag = `${testInfo.project.name}-${Date.now()}`;
    await login(page);

    // A product with Tamaño (50 ml, 100 ml) × Aroma (Lavanda, Rosa), labelled in the 3 languages.
    const created = await api<{ doc: { id: number; slug: string } }>(
      page.request,
      "post",
      "/api/products?locale=es",
      {
        name: `Crema F011 ${tag}`,
        options: [
          { attribute: "size", values: [{ label: "50 ml" }, { label: "100 ml" }] },
          { attribute: "scent", values: [{ label: "Lavanda" }, { label: "Rosa" }] },
        ],
      },
    );
    const id = created.doc.id;
    const labels: Record<string, Record<"en" | "de", string>> = {
      "50-ml": { en: "50 ml", de: "50 ml" },
      "100-ml": { en: "100 ml", de: "100 ml" },
      lavanda: { en: "Lavender", de: "Lavendel" },
      rosa: { en: "Rose", de: "Rose" },
    };
    const stored = await api<{ options: Option[] }>(
      page.request,
      "get",
      `/api/products/${id}?locale=es&depth=0`,
    );
    expect(stored.options.flatMap((o) => o.values.map((v) => v.code))).toEqual([
      "50-ml",
      "100-ml",
      "lavanda",
      "rosa",
    ]);
    for (const locale of ["en", "de"] as const) {
      await api(page.request, "patch", `/api/products/${id}?locale=${locale}`, {
        name: `Cream F011 ${locale} ${tag}`,
        options: stored.options.map((option) => ({
          ...option,
          values: option.values.map((value) => ({ ...value, label: labels[value.code]?.[locale] })),
        })),
      });
    }

    let variants: Variant[] = [];
    await test.step("CA-1/HU-1: «Generar variantes» creates the 4 combinations", async () => {
      await visit(page, `/admin/collections/products/${id}?locale=es`, { ready: hydrated });
      await page.getByRole("textbox", { name: "Precio inicial (CHF)" }).fill("19.90");
      await page.getByRole("button", { name: "Generar variantes" }).click();
      // The page reloads so the list shows them, and keeps the result message.
      await expect(
        page.getByRole("status").filter({ hasText: "Se han creado 4 variantes" }),
      ).toBeVisible();
      variants = await variantsOf(page.request, id);
      const stem = created.doc.slug.toUpperCase();
      expect(variants.map((v) => v.sku).sort()).toEqual(
        [
          `${stem}-100-ML-LAVANDA`,
          `${stem}-100-ML-ROSA`,
          `${stem}-50-ML-LAVANDA`,
          `${stem}-50-ML-ROSA`,
        ].sort(),
      );
      await page.getByRole("textbox", { name: "Precio inicial (CHF)" }).fill("19.90");
      await page.getByRole("button", { name: "Generar variantes" }).click();
      await expect(
        page.getByRole("status").filter({ hasText: "No falta ninguna combinación." }),
      ).toBeVisible();
    });

    const lavanda = () => variants.filter((v) => v.scent === "lavanda");
    const rosa = () => variants.filter((v) => v.scent === "rosa");

    await test.step("CA-1/CA-2: unique SKU and one variant per combination", async () => {
      // The SKU is unique in the whole shop, whatever its case: try it on another product.
      const other = await api<{ doc: { id: number } }>(
        page.request,
        "post",
        "/api/products?locale=es",
        {
          name: `Otro F011 ${tag}`,
        },
      );
      const sameSku = await page.request.post("/api/variants", {
        headers: auth(),
        data: { product: other.doc.id, sku: variants[0]?.sku.toLowerCase(), price: 10 },
      });
      expect(sameSku.status()).toBe(400);
      // Without attributes a product has a single variant.
      await api(page.request, "post", "/api/variants", {
        product: other.doc.id,
        sku: `UNICA-${tag}`,
        price: 10,
      });
      const second = await page.request.post("/api/variants", {
        headers: auth(),
        data: { product: other.doc.id, sku: `SEGUNDA-${tag}`, price: 10 },
      });
      expect(second.status()).toBe(400);
      await api(page.request, "delete", `/api/products/${other.doc.id}`);
      const sameCombination = await page.request.post("/api/variants", {
        headers: auth(),
        data: { product: id, sku: `OTRO-${tag}`, price: 10, size: "50-ml", scent: "rosa" },
      });
      expect(sameCombination.status()).toBe(400);
      const unknownValue = await page.request.post("/api/variants", {
        headers: auth(),
        data: { product: id, sku: `OTRO-${tag}`, price: 10, size: "30-ml", scent: "rosa" },
      });
      expect(unknownValue.status()).toBe(400);
    });

    await test.step("CA-2: EAN, reference price, weight and net quantity on a variant", async () => {
      const variant = lavanda()[0]!;
      await visit(page, `/admin/collections/variants/${variant.id}`, {
        ready: (p) => p.getByRole("combobox", { name: "Aroma" }),
      });
      await expect(page.getByRole("combobox", { name: "Aroma" })).toHaveValue("lavanda");
      const wrongEan = await page.request.patch(`/api/variants/${variant.id}`, {
        headers: auth(),
        data: { ean: "4006381333932" },
      });
      expect(wrongEan.status()).toBe(400);
      expect(await wrongEan.text()).toContain("inválido: EAN");
      await page.getByRole("textbox", { name: "EAN" }).fill("4006381333931");
      await page.getByRole("spinbutton", { name: "Precio de referencia «antes» (CHF)" }).fill("25");
      await page.getByRole("spinbutton", { name: "Peso con envase (g)" }).fill("120");
      await page.getByRole("spinbutton", { name: "Cantidad neta" }).fill("50");
      await page.getByRole("combobox", { name: "Unidad" }).selectOption("ml");
      expect(await savedStatus(page, "variants")).toBe(200);
      const saved = await api<Variant>(page.request, "get", `/api/variants/${variant.id}?depth=0`);
      expect(saved).toMatchObject({
        ean: "4006381333931",
        compareAtPrice: 25,
        weightGrams: 120,
        netQuantity: 50,
        netUnit: "ml",
      });
      const cheaperReference = await page.request.patch(`/api/variants/${variant.id}`, {
        headers: auth(),
        data: { compareAtPrice: 10 },
      });
      expect(cheaperReference.status()).toBe(400);
      const quantityWithoutUnit = await page.request.patch(`/api/variants/${variant.id}`, {
        headers: auth(),
        data: { netQuantity: 30, netUnit: null },
      });
      expect(quantityWithoutUnit.status()).toBe(400);
    });

    await test.step("CA-3: a variant is switched off without deleting it", async () => {
      await api(page.request, "patch", `/api/variants/${lavanda()[1]!.id}`, { active: false });
      const after = await variantsOf(page.request, id);
      expect(after).toHaveLength(4);
      expect(after.find((v) => v.id === lavanda()[1]!.id)?.active).toBe(false);
    });

    const photos: number[] = [];
    await test.step("CA-5: assign photos to variants and reorder them from the keyboard", async () => {
      for (const n of [1, 2, 3]) {
        photos.push(
          await uploadPhoto(page.request, `f011-${n}-${tag}.jpg`, {
            es: `Foto ${n} ${tag}`,
            en: `Photo ${n} ${tag}`,
            // CA-6: the third photo has no German text yet.
            ...(n < 3 ? { de: `Bild ${n} ${tag}` } : {}),
          }),
        );
      }
      await api(page.request, "patch", `/api/products/${id}?locale=es`, {
        gallery: photos.map((image) => ({ image })),
      });

      await visit(page, `/admin/collections/products/${id}?locale=es`, { ready: hydrated });
      const firstRow = page.locator("#gallery-row-0");
      for (const variant of lavanda()) {
        await firstRow.getByRole("checkbox", { name: variant.sku }).check();
      }
      // Move the second photo up with the keyboard: it becomes the main one.
      const menu = page.locator("#gallery-row-1").getByRole("button", { name: "Más opciones" });
      await menu.focus();
      await page.keyboard.press("Enter");
      const moveUp = page.getByRole("button", { name: "Mover arriba" });
      await moveUp.focus();
      await page.keyboard.press("Enter");
      expect(await savedStatus(page, "products")).toBe(200);

      const saved = await api<{ gallery: { image: number; variants: number[] }[] }>(
        page.request,
        "get",
        `/api/products/${id}?depth=0`,
      );
      expect(saved.gallery.map((row) => row.image)).toEqual([photos[1], photos[0], photos[2]]);
      expect(saved.gallery[1]?.variants.sort()).toEqual(
        lavanda()
          .map((v) => v.id)
          .sort(),
      );
      expect(saved.gallery[0]?.variants).toEqual([]);
    });

    await test.step("CA-6: publishing needs every photo's text in the 3 languages", async () => {
      const readiness = await api<{ lines: string[] }>(
        page.request,
        "get",
        `/api/products/${id}/readiness`,
      );
      expect(readiness.lines.join(" ")).toMatch(
        /Falta en alemán: [^.]*texto alternativo de las fotos/,
      );
      expect(readiness.lines.join(" ")).not.toMatch(/Falta en inglés: [^.]*texto alternativo/);
    });

    await test.step("CA-4: at most 10 photos per product", async () => {
      const eleven = Array.from({ length: 11 }, (_, i) => ({ image: photos[i % photos.length] }));
      const tooMany = await page.request.patch(`/api/products/${id}?locale=es`, {
        headers: auth(),
        data: { gallery: eleven },
      });
      expect(tooMany.status()).toBe(400);
      expect(await tooMany.text()).toContain("Máximo 10 fotos por producto.");
      await api(page.request, "patch", `/api/products/${id}?locale=es`, {
        gallery: eleven.slice(0, 10),
      });
      await visit(page, `/admin/collections/products/${id}?locale=es`, { ready: hydrated });
      await expect(page.locator("#gallery-row-9")).toBeAttached();
      await expect(page.getByRole("button", { name: "Añadir Foto" })).toHaveCount(0);
    });

    await test.step("CA-7: only JPEG, PNG and WebP up to 10 MB", async () => {
      const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
      const rejectedType = await page.request.post("/api/media?locale=es", {
        headers: auth(),
        multipart: { file: { name: `f011-${tag}.gif`, mimeType: "image/gif", buffer: gif } },
      });
      expect(rejectedType.status()).toBe(400);
      // Random pixels in an uncompressed PNG: over 10 MB.
      const big = await sharp(randomBytes(2000 * 2000 * 3), {
        raw: { width: 2000, height: 2000, channels: 3 },
      })
        .png({ compressionLevel: 0 })
        .toBuffer();
      expect(big.length).toBeGreaterThan(10 * 1024 * 1024);
      const tooBig = await page.request.post("/api/media?locale=es", {
        headers: auth(),
        multipart: { file: { name: `f011-big-${tag}.png`, mimeType: "image/png", buffer: big } },
      });
      expect(tooBig.ok()).toBe(false);
    });

    await test.step("CA-7: uploading a photo from the admin (on previews, straight to storage)", async () => {
      // Playwright's Linux WebKit build fails the cross-origin PUT to Vercel Blob ("The URL can't
      // be shown"); macOS WebKit (Safari's engine) does the same request fine. Chromium covers it.
      if (directUploads && browserName === "webkit" && process.platform === "linux") {
        test.info().annotations.push({
          type: "skipped step",
          description: "Direct Blob upload: not runnable in Linux WebKit",
        });
        return;
      }
      await visit(page, "/admin/collections/media/create?locale=es", {
        ready: (p) => p.getByRole("button", { name: "Guardar" }),
      });
      // The bar can come and go quickly: record that it appeared and every progress report.
      await page.evaluate(() => {
        const seen = { bar: false, reports: [] as number[] };
        (window as unknown as { f011: typeof seen }).f011 = seen;
        window.addEventListener("sijou:upload-progress", (event) => {
          seen.reports.push((event as CustomEvent<{ percentage: number }>).detail.percentage);
        });
        new MutationObserver(() => {
          if (document.querySelector(".upload-progress progress[aria-labelledby]")) seen.bar = true;
        }).observe(document.body, { childList: true, subtree: true });
      });
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles(path.join(import.meta.dirname, "fixtures/sample-product.jpg"));
      await expect(page.getByRole("button", { name: "Guardar" })).toBeEnabled();
      // Diagnostics for the direct-to-storage path: say why the save never lands.
      const notes: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning")
          notes.push(`console ${m.type()}: ${m.text()}`);
      });
      page.on("pageerror", (e) => notes.push(`pageerror: ${e.message}`));
      page.on("requestfailed", (r) =>
        notes.push(`failed ${r.method()} ${r.url()}: ${r.failure()?.errorText}`),
      );
      page.on("response", (r) => {
        if (/blob|\/api\/media/.test(r.url()))
          notes.push(`${r.status()} ${r.request().method()} ${r.url()}`);
      });
      await page.getByRole("button", { name: "Guardar" }).click();
      await page
        .waitForURL(/\/admin\/collections\/media\/\d+/, { waitUntil: "commit", timeout: 45_000 })
        .catch(async (error: unknown) => {
          const toasts = await page.locator(".payload-toast-container").allTextContents();
          throw new Error(`${String(error)}\ntoasts: ${toasts.join(" | ")}\n${notes.join("\n")}`);
        });
      const uploaded = /media\/(\d+)/.exec(page.url())?.[1];
      // CA-8: WebP sizes exist, also for a file the server never received itself (previews).
      const media = await api<{ sizes: Record<string, { url?: string | null }> }>(
        page.request,
        "get",
        `/api/media/${uploaded}?depth=0`,
      );
      expect(media.sizes.w480?.url).toMatch(/\.webp$/);
      if (directUploads) {
        // A client-side navigation keeps the window: the record survives the redirect.
        const seen = await page.evaluate(
          () => (window as unknown as { f011?: { bar: boolean; reports: number[] } }).f011,
        );
        expect(seen?.bar).toBe(true);
        expect(seen?.reports).toContain(100);
      }
      await api(page.request, "delete", `/api/media/${uploaded}`);
    });

    await test.step("Edge case: removing a value switches its variants off, with a notice", async () => {
      const current = await api<{ options: Option[] }>(
        page.request,
        "get",
        `/api/products/${id}?locale=es&depth=0`,
      );
      await api(page.request, "patch", `/api/products/${id}?locale=es`, {
        options: current.options.map((option) => ({
          ...option,
          values: option.values.filter((value) => value.code !== "rosa"),
        })),
      });
      const after = await variantsOf(page.request, id);
      expect(after).toHaveLength(4);
      for (const variant of rosa()) {
        expect(after.find((v) => v.id === variant.id)?.active).toBe(false);
      }
      const readiness = await api<{ notices: string[] }>(
        page.request,
        "get",
        `/api/products/${id}/readiness`,
      );
      for (const variant of rosa()) expect(readiness.notices.join(" ")).toContain(variant.sku);
    });

    await test.step("cleanup", async () => {
      await api(page.request, "delete", `/api/products/${id}`);
      for (const photo of photos) await api(page.request, "delete", `/api/media/${photo}`);
    });
  });
});

test.describe("F-011 photos in the shop", () => {
  test.skip(!hasSampleData, "needs the seeded sample product (previews and local only)");

  test("CA-8: photos are served as responsive WebP", async ({ page }) => {
    await visit(page, seedProductPaths.en);
    const srcset = await page.getByRole("main").getByRole("img").first().getAttribute("srcset");
    const candidates = (srcset ?? "").split(",").map((candidate) => candidate.trim());
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    for (const candidate of candidates) expect(candidate).toMatch(/\.webp \d+w$/);
  });
});
