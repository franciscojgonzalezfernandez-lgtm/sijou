import type { APIRequestContext, APIResponse, Page } from "@playwright/test";

import { adminSession } from "./admin-session";
import { expect, test, visit } from "./fixtures";

// F-013: stock by lots. Needs the seeded test admin (previews and local only).
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const hasTestAdmin = process.env.DEPLOY_ENV !== "Production" && Boolean(email && password);

let token = "";
const auth = () => ({ Authorization: `JWT ${token}` });

function call(
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
  expect(response.ok(), `${method} ${url} → ${response.status()}`).toBe(true);
  return (await response.json()) as T;
}

/** A calendar day `days` from today, as the date input expects it. */
function day(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const stock = (page: Page) => page.getByRole("region", { name: "Stock" });
const status = (page: Page) => stock(page).getByRole("status");
const entry = (page: Page) => stock(page).getByRole("group", { name: "Registrar lote" });
const adjustment = (page: Page) => stock(page).getByRole("group", { name: "Ajustar stock" });
const lotRows = (page: Page) =>
  stock(page)
    .getByRole("table", { name: /^Lotes/ })
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader") });
const historyRows = (page: Page) =>
  stock(page)
    .getByRole("table", { name: /^Movimientos/ })
    .locator("tbody")
    .getByRole("row");

async function register(page: Page, code: string, quantity: number, expiresAt?: string) {
  const form = entry(page);
  await form.getByLabel("Código de lote").fill(code);
  await form.getByLabel("Cantidad").fill(String(quantity));
  await form.getByLabel("Caducidad").fill(expiresAt ?? "");
  await form.getByRole("button", { name: "Registrar lote" }).click();
}

test.describe("F-013 stock by lots in the admin", () => {
  test.skip(!hasTestAdmin, "needs the seeded test admin (previews and local only)");

  test("CA-1…CA-7: lots, FEFO order, adjustments, limits and history", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    token = await adminSession(page);
    const request = page.request;
    const tag = `${testInfo.project.name}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { doc: product } = await api<{ doc: { id: number } }>(
      request,
      "post",
      "/api/products?locale=es",
      { name: `Stock ${tag}` },
    );
    const { doc: variant } = await api<{ doc: { id: number } }>(request, "post", "/api/variants", {
      product: product.id,
      sku: `STK-${tag}`,
      price: 12,
      active: true,
    });
    const late = `L-${tag}`;
    const soon = `S-${tag}`;
    const old = `O-${tag}`;

    await visit(page, `/admin/collections/variants/${variant.id}`, {
      ready: (p) => p.getByText("Esta variante todavía no tiene lotes."),
    });

    await test.step("CA-1, CA-1b: two lots of one variant with different expiries", async () => {
      await register(page, late, 5, day(300));
      await expect(status(page)).toHaveText(`Lote ${late} registrado con 5 unidades.`);
      await register(page, soon, 3, day(60));
      await expect(status(page)).toHaveText(`Lote ${soon} registrado con 3 unidades.`);
      await register(page, late, 1);
      await expect(
        entry(page).getByText("Esta variante ya tiene un lote con este código."),
      ).toBeVisible();
      await expect(entry(page).getByLabel("Código de lote")).toBeFocused();
      await entry(page).getByLabel("Código de lote").fill("");
    });

    await test.step("CA-2, CA-3, CA-7: total and lots in FEFO order", async () => {
      await expect(stock(page).getByText("Stock disponible: 8")).toBeVisible();
      await expect(lotRows(page).getByRole("rowheader")).toHaveText([soon, late]);
    });

    await test.step("edge case: an expired lot is registered with a warning and not counted", async () => {
      await register(page, old, 4, day(-2));
      await expect(status(page)).toContainText("Este lote ya está caducado");
      await entry(page).getByRole("button", { name: "Registrar igualmente" }).click();
      await expect(status(page)).toHaveText(
        `Lote ${old} registrado con 4 unidades, caducado: no se venderá.`,
      );
      await expect(stock(page).getByText("Stock disponible: 8")).toBeVisible();
      await expect(stock(page).getByText("(+ 4 unidades caducadas, no se venden)")).toBeVisible();
      await expect(lotRows(page).filter({ hasText: old })).toContainText("Caducado");
    });

    await test.step("CA-4: manual adjustment with a reason; «Otro» needs a comment", async () => {
      const form = adjustment(page);
      await form.getByLabel("Lote").selectOption({ label: `${soon} (3 unidades)` });
      await form.getByLabel("Cantidad").fill("-1");
      await form.getByLabel("Motivo").selectOption({ label: "Rotura" });
      await form.getByRole("button", { name: "Guardar ajuste" }).click();
      await expect(status(page)).toHaveText(`Ajuste guardado: -1 en el lote ${soon}.`);
      await expect(stock(page).getByText("Stock disponible: 7")).toBeVisible();

      await form.getByLabel("Cantidad").fill("1");
      await form.getByLabel("Motivo").selectOption({ label: "Otro" });
      await form.getByRole("button", { name: "Guardar ajuste" }).click();
      await expect(form.getByText("Con el motivo «Otro», explica qué ha pasado.")).toBeVisible();
      await expect(form.getByLabel(/^Comentario/)).toBeFocused();
    });

    await test.step("CA-5: an adjustment that would leave the lot below 0 is refused", async () => {
      const form = adjustment(page);
      await form.getByLabel("Cantidad").fill("-10");
      await form.getByLabel("Motivo").selectOption({ label: "Corrección" });
      await form.getByRole("button", { name: "Guardar ajuste" }).click();
      await expect(form.getByText("El lote solo tiene 2 unidades.")).toBeVisible();
      await expect(stock(page).getByText("Stock disponible: 7")).toBeVisible();
    });

    await test.step("CA-7: the history, filterable by reason and lot", async () => {
      await expect(historyRows(page)).toHaveCount(4);
      await expect(historyRows(page).first()).toContainText("Rotura");
      await expect(historyRows(page).first()).toContainText(email ?? "");
      const filters = stock(page).getByRole("group", { name: "Filtrar el historial" });
      await filters.getByLabel("Motivo").selectOption({ label: "Entrada de mercancía" });
      await expect(historyRows(page)).toHaveCount(3);
      await filters.getByLabel("Lote").selectOption({ label: soon });
      await expect(historyRows(page)).toHaveCount(1);
      await filters.getByLabel("Motivo").selectOption({ label: "Rotura" });
      await filters.getByLabel("Lote").selectOption({ label: late });
      await expect(stock(page).getByText("No hay movimientos con estos filtros.")).toBeVisible();
    });

    await test.step("CA-6: movements cannot be created, edited or deleted; quantities are read-only", async () => {
      const { docs } = await api<{ docs: { id: number }[] }>(
        request,
        "get",
        `/api/stock-movements?where[variantId][equals]=${variant.id}&depth=0`,
      );
      expect(docs).toHaveLength(4);
      const movement = docs[0]?.id;
      expect(
        (await call(request, "patch", `/api/stock-movements/${movement}`, { delta: 99 })).status(),
      ).toBe(403);
      expect((await call(request, "delete", `/api/stock-movements/${movement}`)).status()).toBe(
        403,
      );
      expect(
        (
          await call(request, "post", "/api/stock-movements", {
            at: new Date().toISOString(),
            variantId: variant.id,
            variantSku: "X",
            delta: 5,
            quantityAfter: 5,
            reason: "receipt",
            refType: "adjustment",
          })
        ).status(),
      ).toBe(403);
      expect(
        (
          await call(request, "post", "/api/lots", {
            variant: variant.id,
            code: "API",
            quantityInitial: 9,
            quantityAvailable: 9,
            receivedAt: new Date().toISOString(),
          })
        ).status(),
      ).toBe(403);
      const { docs: lots } = await api<{ docs: { id: number; code: string }[] }>(
        request,
        "get",
        `/api/lots?where[variant][equals]=${variant.id}&depth=0`,
      );
      const lot = lots.find((l) => l.code === soon);
      await call(request, "patch", `/api/lots/${lot?.id}`, { quantityAvailable: 500 });
      const after = await api<{ quantityAvailable: number }>(
        request,
        "get",
        `/api/lots/${lot?.id}`,
      );
      expect(after.quantityAvailable).toBe(2);
    });

    await test.step("D-3: a variant with stock history cannot be deleted", async () => {
      const response = await call(request, "delete", `/api/variants/${variant.id}`);
      expect(response.status()).toBe(400);
      expect(await response.text()).toContain("Tiene historial de stock");
    });

    await test.step("axe on the Stock block with lots and history", async () => {
      await visit(page, `/admin/collections/variants/${variant.id}`, {
        ready: (p) => stock(p).getByText("Stock disponible: 7"),
      });
      await expect(historyRows(page)).toHaveCount(4);
    });
  });
});
