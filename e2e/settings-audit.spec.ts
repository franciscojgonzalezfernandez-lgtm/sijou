import { request, type APIRequestContext, type Page } from "@playwright/test";

import { adminSession } from "./admin-session";
import { expect, test, visit } from "./fixtures";
import { withLock } from "./lock";

const email = process.env.SEED_ADMIN_EMAIL ?? "";
const password = process.env.SEED_ADMIN_PASSWORD ?? "";
// Production has no test admin (F-002 CA-7): previews and local only.
const hasTestAdmin = process.env.DEPLOY_ENV !== "Production" && Boolean(email && password);

interface Change {
  path: string;
  before: unknown;
  after: unknown;
}

interface AuditRow {
  id: number;
  actorEmail: string | null;
  entity: string;
  entityId: string | null;
  action: string;
  changes: Change[];
}

// API calls authenticate with the login token: Payload's CSRF check rejects cookie auth from
// requests without Origin. The browser keeps the cookie the login sets.
let token = "";
const auth = () => ({ Authorization: `JWT ${token}` });

async function api<T>(
  client: APIRequestContext,
  method: "post" | "patch" | "get" | "delete",
  url: string,
  data?: unknown,
): Promise<T> {
  const response = await client[method](url, {
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
  token = await adminSession(page);
}

async function auditRows(page: Page, where: Record<string, string>): Promise<AuditRow[]> {
  const query = new URLSearchParams({ sort: "-at", limit: "50", depth: "0" });
  for (const [key, value] of Object.entries(where)) query.set(`where[${key}][equals]`, value);
  const { docs } = await api<{ docs: AuditRow[] }>(
    page.request,
    "get",
    `/api/audit-log?${query.toString()}`,
  );
  return docs;
}

// Payload reopens the tab used last, so the tab buttons are what proves the form is there.
const settingsReady = (p: Page) => p.getByRole("button", { name: "Tienda" });

test.describe("F-018 settings and audit log", () => {
  test.skip(!hasTestAdmin, "needs the seeded test admin (previews and local only)");

  test("CA-1…CA-5: settings, validation, audit rows, filters and read-only log", async ({
    page,
  }, testInfo) => {
    test.setTimeout(240_000);
    await login(page);
    // A value no other device project uses, so parallel projects never collide.
    const threshold = 1000 + Math.floor(Math.random() * 100_000);

    // The settings global is shared by every device project: one at a time.
    await withLock("settings", async () => {
      await test.step("CA-1/CA-2: every setting is on screen with its default", async () => {
        await visit(page, "/admin/globals/settings", { ready: settingsReady });
        await settingsReady(page).click();
        await expect(page.getByRole("textbox", { name: /Nombre de la tienda/ })).toHaveValue(
          "Sijôu",
        );
        await expect(page.getByRole("textbox", { name: /Email de contacto/ })).toBeVisible();
        await expect(
          page.getByRole("textbox", { name: /Dirección para el Impressum/ }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Stock" }).click();
        await expect(page.getByRole("spinbutton", { name: /Umbral de stock bajo/ })).toBeVisible();
        await expect(page.getByRole("spinbutton", { name: /Días antes de caducar/ })).toBeVisible();
        await expect(
          page.getByRole("spinbutton", { name: /Días de aviso de caducidad/ }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Avisos" }).click();
        await expect(page.getByText("Emails que reciben los avisos")).toBeVisible();
        await page.getByRole("button", { name: "Envíos" }).click();
        await expect(
          page.getByRole("spinbutton", { name: /Envío gratis a partir de/ }),
        ).toBeVisible();
      });

      await test.step("CA-2: a negative threshold and an invalid email are rejected", async () => {
        const before = await api<{ lowStockThreshold: number | null }>(
          page.request,
          "get",
          "/api/globals/settings?depth=0",
        );
        const response = await page.request.post("/api/globals/settings", {
          headers: auth(),
          data: { lowStockThreshold: -1, contactEmail: "no-es-un-email" },
        });
        expect(response.status()).toBe(400);
        const body = await response.text();
        expect(body).toContain("Email de contacto");
        expect(body).toContain("Umbral de stock bajo");
        const after = await api<{ lowStockThreshold: number | null }>(
          page.request,
          "get",
          "/api/globals/settings?depth=0",
        );
        expect(after.lowStockThreshold).toBe(before.lowStockThreshold);

        // In the form, each field shows its own message, also on phones. Each one is checked on
        // its own tab, right after the refused save (WebKit can drop a hidden tab's error).
        const refusedSave = async () => {
          // The form enables "Guardar" once it has registered the change.
          await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeEnabled();
          const [refused] = await Promise.all([
            page.waitForResponse(
              (r) => r.request().method() === "POST" && r.url().includes("/api/globals/settings"),
            ),
            page.getByRole("button", { name: "Guardar", exact: true }).click(),
          ]);
          expect(refused.status()).toBe(400);
        };
        await visit(page, "/admin/globals/settings", { ready: settingsReady });
        await settingsReady(page).click();
        await page.getByRole("textbox", { name: /Email de contacto/ }).fill("no-es-un-email");
        await refusedSave();
        await expect(page.getByText("Email no válido.")).toBeVisible();

        await visit(page, "/admin/globals/settings", { ready: settingsReady });
        await page.getByRole("button", { name: "Stock" }).click();
        await page.getByRole("spinbutton", { name: /Umbral de stock bajo/ }).fill("-1");
        await refusedSave();
        await expect(page.getByText("Un número entero, 0 o mayor.")).toBeVisible();
      });

      await test.step("CA-3: changing the threshold leaves an audit row with before and after", async () => {
        await visit(page, "/admin/globals/settings", { ready: settingsReady });
        await page.getByRole("button", { name: "Stock" }).click();
        await page
          .getByRole("spinbutton", { name: /Umbral de stock bajo/ })
          .fill(String(threshold));
        await Promise.all([
          page.waitForResponse(
            (r) => r.request().method() === "POST" && r.url().includes("/api/globals/settings"),
          ),
          page.getByRole("button", { name: "Guardar", exact: true }).click(),
        ]);

        const row = (await auditRows(page, { entity: "settings" })).find((r) =>
          r.changes.some((c) => c.path === "lowStockThreshold" && c.after === threshold),
        );
        expect(row, "audit row for the new threshold").toBeDefined();
        expect(row?.actorEmail).toBe(email);
        expect(row?.action).toBe("update");
        const change = row?.changes.find((c) => c.path === "lowStockThreshold");
        expect(typeof change?.before === "number" || change?.before === null).toBe(true);
        expect(change?.before).not.toBe(threshold);

        await visit(page, `/admin/collections/audit-log/${row?.id}`, {
          ready: (p) => p.getByRole("table", { name: "Cambios" }),
        });
        const tableRow = page
          .getByRole("table", { name: "Cambios" })
          .getByRole("row", { name: /lowStockThreshold/ });
        await expect(tableRow).toContainText(String(threshold));
        // CA-4: nothing to save or delete on a log row.
        await expect(page.getByRole("button", { name: "Guardar", exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: /Eliminar/ })).toHaveCount(0);
      });
    });

    const tag = `${testInfo.project.name}-${Date.now()}`;
    const product = await api<{ doc: { id: number } }>(
      page.request,
      "post",
      "/api/products?locale=es",
      { name: `Auditoría E2E ${tag}` },
    );
    const variant = await api<{ doc: { id: number } }>(page.request, "post", "/api/variants", {
      product: product.doc.id,
      sku: `AUD-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      price: 10,
    });

    await test.step("CA-3/HU-2: price and status changes are recorded", async () => {
      await api(page.request, "patch", `/api/variants/${variant.doc.id}`, { price: 12.5 });
      await api(page.request, "patch", `/api/products/${product.doc.id}?locale=es`, {
        status: "hidden",
      });

      const variantRows = await auditRows(page, {
        entity: "variants",
        entityId: String(variant.doc.id),
      });
      expect(variantRows.map((r) => r.action)).toEqual(["update", "create"]);
      expect(variantRows[0]?.changes).toContainEqual({ path: "price", before: 10, after: 12.5 });

      const productRows = await auditRows(page, {
        entity: "products",
        entityId: String(product.doc.id),
      });
      expect(productRows[0]?.action).toBe("status");
      expect(productRows[0]?.changes).toContainEqual({
        path: "status",
        before: "draft",
        after: "hidden",
      });
    });

    await test.step("HU-2: «Ver historial» opens the variant's history", async () => {
      await visit(page, `/admin/collections/variants/${variant.doc.id}`, {
        ready: (p) => p.getByRole("link", { name: "Ver historial" }),
      });
      await page.getByRole("link", { name: "Ver historial" }).click();
      await page.waitForURL(/\/admin\/collections\/audit-log\?/);
      await expect(page.getByRole("combobox", { name: "Entidad" })).toHaveValue("variants");
      const rows = page.locator(".table tbody tr");
      await expect(rows).toHaveCount(2);
    });

    await test.step("CA-4: filter by entity, user and date", async () => {
      await visit(page, "/admin/collections/audit-log", {
        ready: (p) => p.getByRole("combobox", { name: "Usuario" }),
      });
      // The admin list is fetched on the client.
      await expect(
        page.getByRole("combobox", { name: "Usuario" }).locator(`option[value="${email}"]`),
      ).toBeAttached();
      await page.getByRole("combobox", { name: "Entidad" }).selectOption("variants");
      await page.getByRole("combobox", { name: "Usuario" }).selectOption(email);
      const today = new Date().toLocaleDateString("sv-SE");
      await page.getByLabel("Desde").fill(today);
      await page.getByLabel("Hasta").fill(today);
      await page.getByRole("button", { name: "Filtrar" }).click();
      await page.waitForURL(/where%5Bentity%5D%5Bequals%5D=variants/);
      await expect(page.locator(".table tbody tr").first()).toBeVisible();
      const entities = await page.locator(".table tbody tr .cell-entity").allTextContents();
      expect(entities.length).toBeGreaterThan(0);
      expect(new Set(entities.map((t) => t.trim()))).toEqual(new Set(["Variante"]));
      const actors = await page.locator(".table tbody tr .cell-actorEmail").allTextContents();
      expect(new Set(actors.map((t) => t.trim()))).toEqual(new Set([email]));

      await page.getByRole("combobox", { name: "Usuario" }).selectOption({ label: "Sistema" });
      await page.getByRole("button", { name: "Filtrar" }).click();
      await page.waitForURL(/where%5BactorEmail%5D%5Bexists%5D=false/);
      // System rows (seed, scripts) have no user: none of the admin's rows may remain.
      await expect(
        page.locator(".table tbody tr .cell-actorEmail", { hasText: email }),
      ).toHaveCount(0);
    });

    await test.step("CA-4/CA-5: the log is read-only and has no secrets", async () => {
      const [row] = await auditRows(page, { entity: "variants", entityId: String(variant.doc.id) });
      const patch = await page.request.patch(`/api/audit-log/${row?.id}`, {
        headers: auth(),
        data: { entityLabel: "cambiado" },
      });
      expect(patch.status()).toBe(403);
      const remove = await page.request.delete(`/api/audit-log/${row?.id}`, { headers: auth() });
      expect(remove.status()).toBe(403);
      const create = await page.request.post("/api/audit-log", {
        headers: auth(),
        data: { at: new Date().toISOString(), entity: "settings", action: "update" },
      });
      expect(create.status()).toBe(403);

      const { baseURL, extraHTTPHeaders } = test.info().project.use;
      const anonymous = await request.newContext({ baseURL, extraHTTPHeaders });
      expect([401, 403]).toContain((await anonymous.get("/api/audit-log")).status());
      await anonymous.dispose();

      const all = await page.request.get("/api/audit-log?limit=200&depth=0", { headers: auth() });
      expect(await all.text()).not.toMatch(/"(password|hash|salt|token)"/i);
    });

    await api(page.request, "delete", `/api/products/${product.doc.id}`);
  });
});
