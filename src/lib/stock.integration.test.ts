import { sql } from "@payloadcms/db-postgres";
import { drizzle } from "@payloadcms/db-postgres/drizzle/node-postgres";
import type { Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { adjustLot, consume, lotsOf, receiveLot, StockError } from "./stock";

/**
 * F-013 against a real, migrated Postgres (plan D-5): row locks, constraints and the trigger
 * cannot be checked in memory. Runs in CI after `pnpm migrate`; `pnpm test:integration` locally
 * with DATABASE_URL pointing at a scratch database.
 */
const url = process.env.DATABASE_URL;
const db = drizzle({ connection: { connectionString: url ?? "", max: 30 } });
const payload = { db: { drizzle: db } } as unknown as Payload;
const admin = { id: 1, email: "admin@example.test" };

let productId: number;
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
let n = 0;

async function newVariant(): Promise<number> {
  const { rows } = await db.execute<{ id: number }>(sql`
    INSERT INTO variants (product_id, sku, price) VALUES (${productId}, ${`IT-${suffix}-${n++}`}, 10)
    RETURNING id`);
  return Number(rows[0]?.id);
}

/** Coherence: every lot holds exactly the sum of its movements. */
async function expectCoherent(variantId: number) {
  const { rows } = await db.execute<{ id: number; available: string; moved: string | null }>(sql`
    SELECT l.id, l.quantity_available AS available,
      (SELECT sum(delta) FROM stock_movements m WHERE m.lot_id = l.id) AS moved
    FROM lots l WHERE l.variant_id = ${variantId}`);
  for (const row of rows) expect(Number(row.moved)).toBe(Number(row.available));
}

describe.runIf(url)("stock in Postgres (F-013)", () => {
  beforeAll(async () => {
    const { rows } = await db.execute<{ id: number }>(
      sql`INSERT INTO products DEFAULT VALUES RETURNING id`,
    );
    productId = Number(rows[0]?.id);
  });

  afterAll(async () => {
    await db.$client.end();
  });

  it("CA-1, CA-1b, CA-6: registers lots with different expiries, each with its movement", async () => {
    const variantId = await newVariant();
    await receiveLot(payload, admin, {
      variantId,
      code: "A",
      quantity: 5,
      expiresAt: "2099-06-01",
    });
    await receiveLot(payload, null, { variantId, code: "B", quantity: 3, expiresAt: "2099-01-01" });
    await receiveLot(payload, admin, { variantId, code: "C", quantity: 2 });
    const lots = await lotsOf(payload, variantId);
    expect(lots.map((l) => [l.code, l.quantityAvailable, l.expiresAt])).toEqual([
      ["B", 3, "2099-01-01"],
      ["A", 5, "2099-06-01"],
      ["C", 2, null],
    ]);
    const { rows } = await db.execute<{ reason: string; actor_email: string | null }>(sql`
      SELECT reason, actor_email FROM stock_movements WHERE variant_id = ${variantId} ORDER BY id`);
    expect(rows).toEqual([
      { reason: "receipt", actor_email: admin.email },
      { reason: "receipt", actor_email: null },
      { reason: "receipt", actor_email: admin.email },
    ]);
    await expectCoherent(variantId);
  });

  it("D-2: a lot code is unique within its variant", async () => {
    const variantId = await newVariant();
    await receiveLot(payload, admin, { variantId, code: "X", quantity: 1 });
    await expect(
      receiveLot(payload, admin, { variantId, code: " X ", quantity: 1 }),
    ).rejects.toThrow(StockError);
    const other = await newVariant();
    await expect(
      receiveLot(payload, admin, { variantId: other, code: "X", quantity: 1 }),
    ).resolves.toBeTruthy();
  });

  it("edge case: an expired lot is registered but not consumed", async () => {
    const variantId = await newVariant();
    const { expired } = await receiveLot(payload, admin, {
      variantId,
      code: "OLD",
      quantity: 4,
      expiresAt: "2020-01-01",
    });
    expect(expired).toBe(true);
    expect(
      await consume(payload, { variantId, quantity: 1, reason: "sale", refType: "order" }),
    ).toEqual({ ok: false, missing: 1 });
  });

  it("CA-3, CA-6: a sale takes the earliest expiry first, across lots", async () => {
    const variantId = await newVariant();
    const { lot: late } = await receiveLot(payload, admin, {
      variantId,
      code: "LATE",
      quantity: 10,
      expiresAt: "2099-12-01",
    });
    const { lot: soon } = await receiveLot(payload, admin, {
      variantId,
      code: "SOON",
      quantity: 2,
      expiresAt: "2099-01-01",
    });
    const result = await consume(payload, {
      variantId,
      quantity: 5,
      reason: "sale",
      refType: "order",
      refId: "1001",
    });
    expect(result).toEqual({
      ok: true,
      takes: [
        { lotId: soon.id, quantity: 2 },
        { lotId: late.id, quantity: 3 },
      ],
    });
    const { rows } = await db.execute<{ lot_code: string; delta: string; actor_email: null }>(sql`
      SELECT lot_code, delta, actor_email FROM stock_movements
      WHERE variant_id = ${variantId} AND reason = 'sale' ORDER BY id`);
    expect(rows.map((r) => [r.lot_code, Number(r.delta), r.actor_email])).toEqual([
      ["SOON", -2, null],
      ["LATE", -3, null],
    ]);
    await expectCoherent(variantId);
  });

  it("CA-4, CA-5: adjustments need a valid reason and never go below 0", async () => {
    const variantId = await newVariant();
    const { lot } = await receiveLot(payload, admin, { variantId, code: "ADJ", quantity: 2 });
    await expect(
      adjustLot(payload, admin, { lotId: lot.id, delta: -3, reason: "breakage" }),
    ).rejects.toThrow("El lote solo tiene 2 unidades.");
    await expect(
      adjustLot(payload, admin, { lotId: lot.id, delta: -1, reason: "other" }),
    ).rejects.toThrow(StockError);
    const after = await adjustLot(payload, admin, {
      lotId: lot.id,
      delta: -1,
      reason: "other",
      comment: " Muestra para la feria ",
    });
    expect(after.quantityAvailable).toBe(1);
    const { rows } = await db.execute<{ comment: string; ref_type: string }>(sql`
      SELECT comment, ref_type FROM stock_movements WHERE lot_id = ${lot.id} AND reason = 'other'`);
    expect(rows).toEqual([{ comment: "Muestra para la feria", ref_type: "adjustment" }]);
    await expect(adjustLot(payload, admin, { lotId: 0, delta: 1, reason: "gift" })).rejects.toThrow(
      "El lote no existe.",
    );
    await expectCoherent(variantId);
  });

  it("CA-5: the database refuses a negative lot even outside the stock module", async () => {
    const variantId = await newVariant();
    const { lot } = await receiveLot(payload, admin, { variantId, code: "NEG", quantity: 1 });
    await expect(
      db.execute(sql`UPDATE lots SET quantity_available = -1 WHERE id = ${lot.id}`),
    ).rejects.toThrow();
  });

  it("CA-6: movements cannot be edited or deleted", async () => {
    const variantId = await newVariant();
    await receiveLot(payload, admin, { variantId, code: "IMM", quantity: 1 });
    await expect(
      db.execute(sql`UPDATE stock_movements SET comment = 'x' WHERE variant_id = ${variantId}`),
    ).rejects.toThrow();
    await expect(
      db.execute(sql`DELETE FROM stock_movements WHERE variant_id = ${variantId}`),
    ).rejects.toThrow();
  });

  it("CA-8: two sales of the last unit at once: exactly one succeeds", async () => {
    const variantId = await newVariant();
    await receiveLot(payload, admin, { variantId, code: "LAST", quantity: 1 });
    const sale = () =>
      consume(payload, { variantId, quantity: 1, reason: "sale", refType: "order" });
    const results = await Promise.all([sale(), sale()]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([{ ok: false, missing: 1 }]);
    const [lot] = await lotsOf(payload, variantId);
    expect(lot?.quantityAvailable).toBe(0);
    await expectCoherent(variantId);
  });

  it("CA-8: 20 concurrent adjustments of -1 on a lot of 10 leave it at exactly 0", async () => {
    const variantId = await newVariant();
    const { lot } = await receiveLot(payload, admin, { variantId, code: "RUSH", quantity: 10 });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        adjustLot(payload, admin, { lotId: lot.id, delta: -1, reason: "correction" }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(10);
    const refused = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(refused).toHaveLength(10);
    for (const r of refused) expect(r.reason).toBeInstanceOf(StockError);
    const [after] = await lotsOf(payload, variantId);
    expect(after?.quantityAvailable).toBe(0);
    await expectCoherent(variantId);
  });

  it("joins the caller's transaction: a rollback undoes the sale", async () => {
    const variantId = await newVariant();
    await receiveLot(payload, admin, { variantId, code: "TX", quantity: 3 });
    await expect(
      db.transaction(async (tx) => {
        await consume(payload, { variantId, quantity: 2, reason: "sale", refType: "order" }, tx);
        throw new Error("order failed");
      }),
    ).rejects.toThrow("order failed");
    const [lot] = await lotsOf(payload, variantId);
    expect(lot?.quantityAvailable).toBe(3);
    await expectCoherent(variantId);
  });
});
