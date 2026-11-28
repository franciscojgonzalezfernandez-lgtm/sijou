import { sql } from "@payloadcms/db-postgres";
import type { Payload } from "payload";

import { describeActor } from "@/domain/audit/diff";
import {
  allocate,
  expiryDay,
  expiryTimestamp,
  type Lot,
  type Take,
  zurichToday,
} from "@/domain/stock/lots";
import {
  type FieldError,
  type Reason,
  type Reference,
  validateAdjustment,
  validateLotEntry,
} from "@/domain/stock/movements";

/**
 * Every change to stock quantities (F-013, constitution IV, ADR-06). Each operation runs in one
 * Postgres transaction, locks the lot rows it reads with `FOR UPDATE`, and writes one
 * `stock_movements` row per lot it changes. Plain SQL on purpose (plan D-4): Payload's Local API
 * cannot lock rows, and no Payload hook may run between the read and the write.
 *
 * Nothing else writes `lots.quantity_available`: the field is read-only in Payload, the
 * collections refuse API creates, and the database refuses negative quantities.
 */

type Db = Payload["db"]["drizzle"];
/** A transaction from `db.transaction()`, also accepted from a caller (F-033). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** A refused operation, with errors per form field in Spanish. */
export class StockError extends Error {
  constructor(readonly errors: FieldError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "StockError";
  }
}

export interface StockLot extends Lot {
  variantId: number;
  quantityInitial: number;
}

interface LotRow extends Record<string, unknown> {
  id: number;
  variant_id: number;
  code: string;
  quantity_initial: number;
  quantity_available: number;
  received_at: Date | string;
  expires_at: Date | string | null;
}

const iso = (value: Date | string) =>
  (value instanceof Date ? value : new Date(value)).toISOString();

function toLot(row: LotRow): StockLot {
  return {
    id: Number(row.id),
    variantId: Number(row.variant_id),
    code: row.code,
    quantityInitial: Number(row.quantity_initial),
    quantityAvailable: Number(row.quantity_available),
    receivedAt: iso(row.received_at),
    expiresAt: row.expires_at === null ? null : expiryDay(iso(row.expires_at)),
  };
}

const LOT_COLUMNS = sql`id, variant_id, code, quantity_initial, quantity_available, received_at, expires_at`;

/** CA-3 in SQL: the same order as `fefoOrder`, so rows are always locked in one order. */
const FEFO = sql`expires_at ASC NULLS LAST, received_at ASC, id ASC`;

interface Movement {
  variantId: number;
  variantSku: string;
  lotId: number;
  lotCode: string;
  delta: number;
  quantityAfter: number;
  reason: Reason;
  comment?: string | null;
  refType: Reference;
  refId?: string | null;
  actor: { actorId: number | null; actorEmail: string | null };
}

/** CA-6: one immutable row per change. */
async function insertMovement(tx: Tx, m: Movement): Promise<void> {
  await tx.execute(sql`
    INSERT INTO stock_movements
      (at, variant_id, variant_sku, lot_id, lot_code, delta, quantity_after, reason, comment,
       ref_type, ref_id, actor_id, actor_email)
    VALUES
      (now(), ${m.variantId}, ${m.variantSku}, ${m.lotId}, ${m.lotCode}, ${m.delta},
       ${m.quantityAfter}, ${m.reason}, ${m.comment ?? null}, ${m.refType}, ${m.refId ?? null},
       ${m.actor.actorId}, ${m.actor.actorEmail})`);
}

async function variantSku(tx: Tx, variantId: number): Promise<string | null> {
  const { rows } = await tx.execute<{ sku: string }>(
    sql`SELECT sku FROM variants WHERE id = ${variantId}`,
  );
  return rows[0]?.sku ?? null;
}

export interface LotEntry {
  variantId: number;
  code: unknown;
  quantity: unknown;
  /** `YYYY-MM-DD` or empty. */
  expiresAt?: unknown;
  /** ISO timestamp; now when absent. */
  receivedAt?: string;
}

/** HU-1, CA-1, CA-1b, CA-6: a new lot and its receipt movement. */
export async function receiveLot(
  payload: Payload,
  user: unknown,
  entry: LotEntry,
): Promise<{ lot: StockLot; expired: boolean }> {
  const { errors, expired } = validateLotEntry(entry, zurichToday());
  if (errors.length > 0) throw new StockError(errors);
  const code = String(entry.code).trim();
  const quantity = entry.quantity as number;
  const expiresAt =
    typeof entry.expiresAt === "string" && entry.expiresAt !== ""
      ? expiryTimestamp(entry.expiresAt)
      : null;
  const receivedAt = entry.receivedAt ?? new Date().toISOString();

  return payload.db.drizzle.transaction(async (tx) => {
    const sku = await variantSku(tx, entry.variantId);
    if (sku === null)
      throw new StockError([{ path: "variant", message: "La variante no existe." }]);
    // D-2: unique per variant. The UNIQUE constraint backs this up under concurrency.
    const { rows: taken } = await tx.execute(
      sql`SELECT 1 FROM lots WHERE variant_id = ${entry.variantId} AND code = ${code}`,
    );
    if (taken.length > 0) {
      throw new StockError([
        { path: "code", message: "Esta variante ya tiene un lote con este código." },
      ]);
    }
    const { rows } = await tx.execute<LotRow>(sql`
      INSERT INTO lots (variant_id, code, quantity_initial, quantity_available, received_at, expires_at)
      VALUES (${entry.variantId}, ${code}, ${quantity}, ${quantity}, ${receivedAt}, ${expiresAt})
      RETURNING ${LOT_COLUMNS}`);
    const lot = toLot(rows[0] as LotRow);
    await insertMovement(tx, {
      variantId: lot.variantId,
      variantSku: sku,
      lotId: lot.id,
      lotCode: lot.code,
      delta: quantity,
      quantityAfter: quantity,
      reason: "receipt",
      refType: "lot",
      refId: String(lot.id),
      actor: describeActor(user),
    });
    return { lot, expired };
  });
}

export interface Adjustment {
  lotId: number;
  delta: unknown;
  reason: unknown;
  comment?: unknown;
}

/** HU-2, CA-4, CA-5, CA-6: a manual change to one lot, with its reason. */
export async function adjustLot(
  payload: Payload,
  user: unknown,
  adjustment: Adjustment,
): Promise<StockLot> {
  return payload.db.drizzle.transaction(async (tx) => {
    const { rows } = await tx.execute<LotRow>(
      sql`SELECT ${LOT_COLUMNS} FROM lots WHERE id = ${adjustment.lotId} FOR UPDATE`,
    );
    const row = rows[0];
    if (!row) throw new StockError([{ path: "lot", message: "El lote no existe." }]);
    const lot = toLot(row);
    const errors = validateAdjustment(adjustment, lot.quantityAvailable);
    if (errors.length > 0) throw new StockError(errors);
    const delta = adjustment.delta as number;
    const { rows: updated } = await tx.execute<LotRow>(sql`
      UPDATE lots SET quantity_available = quantity_available + ${delta}, updated_at = now()
      WHERE id = ${lot.id} RETURNING ${LOT_COLUMNS}`);
    const after = toLot(updated[0] as LotRow);
    const comment = typeof adjustment.comment === "string" ? adjustment.comment.trim() : "";
    await insertMovement(tx, {
      variantId: lot.variantId,
      variantSku: (await variantSku(tx, lot.variantId)) ?? "",
      lotId: lot.id,
      lotCode: lot.code,
      delta,
      quantityAfter: after.quantityAvailable,
      reason: adjustment.reason as Reason,
      comment: comment || null,
      refType: "adjustment",
      actor: describeActor(user),
    });
    return after;
  });
}

export interface Consumption {
  variantId: number;
  quantity: number;
  reason: Extract<Reason, "sale" | "expiry">;
  refType: Extract<Reference, "order" | "expiry">;
  refId?: string | null;
}

export type ConsumeResult = { ok: true; takes: Take[] } | { ok: false; missing: number };

/**
 * CA-3, CA-5, CA-8: takes `quantity` units of a variant, earliest expiry first. All or nothing:
 * when there are not enough units, nothing changes. The lots are locked, so two sales of the
 * last unit never both succeed. Pass `tx` to join the caller's transaction (F-033 saves the
 * order in the same one); by the system, so no actor.
 */
export async function consume(
  payload: Payload,
  consumption: Consumption,
  tx?: Tx,
): Promise<ConsumeResult> {
  const run = async (t: Tx): Promise<ConsumeResult> => {
    const { rows } = await t.execute<LotRow>(sql`
      SELECT ${LOT_COLUMNS} FROM lots
      WHERE variant_id = ${consumption.variantId} AND quantity_available > 0
      ORDER BY ${FEFO} FOR UPDATE`);
    const lots = rows.map(toLot);
    const allocation = allocate(lots, consumption.quantity, zurichToday());
    if (!allocation.ok) return allocation;
    const sku = (await variantSku(t, consumption.variantId)) ?? "";
    for (const take of allocation.takes) {
      const lot = lots.find((l) => l.id === take.lotId) as StockLot;
      const { rows: updated } = await t.execute<{ quantity_available: number }>(sql`
        UPDATE lots SET quantity_available = quantity_available - ${take.quantity}, updated_at = now()
        WHERE id = ${take.lotId} RETURNING quantity_available`);
      await insertMovement(t, {
        variantId: consumption.variantId,
        variantSku: sku,
        lotId: lot.id,
        lotCode: lot.code,
        delta: -take.quantity,
        quantityAfter: Number(updated[0]?.quantity_available),
        reason: consumption.reason,
        refType: consumption.refType,
        refId: consumption.refId ?? null,
        actor: { actorId: null, actorEmail: null },
      });
    }
    return allocation;
  };
  return tx ? run(tx) : payload.db.drizzle.transaction(run);
}

/** CA-7: a variant's lots, in FEFO order. */
export async function lotsOf(payload: Payload, variantId: number): Promise<StockLot[]> {
  const { rows } = await payload.db.drizzle.execute<LotRow>(
    sql`SELECT ${LOT_COLUMNS} FROM lots WHERE variant_id = ${variantId} ORDER BY ${FEFO}`,
  );
  return rows.map(toLot);
}

/** All lots of several variants in one query, keyed by variant (list columns, the shop later). */
export async function lotsByVariant(
  payload: Payload,
  variantIds: readonly number[],
): Promise<Map<number, StockLot[]>> {
  const byVariant = new Map<number, StockLot[]>(variantIds.map((id) => [id, []]));
  if (variantIds.length === 0) return byVariant;
  const { rows } = await payload.db.drizzle.execute<LotRow>(sql`
    SELECT ${LOT_COLUMNS} FROM lots
    WHERE variant_id IN (${sql.join(
      variantIds.map((id) => sql`${id}`),
      sql`, `,
    )})
    ORDER BY ${FEFO}`);
  for (const lot of rows.map(toLot)) byVariant.get(lot.variantId)?.push(lot);
  return byVariant;
}

/** D-3: true when any of these variants has stock history. */
export async function hasMovements(
  payload: Payload,
  variantIds: readonly number[],
): Promise<boolean> {
  if (variantIds.length === 0) return false;
  const { rows } = await payload.db.drizzle.execute(sql`
    SELECT 1 FROM stock_movements
    WHERE variant_id IN (${sql.join(
      variantIds.map((id) => sql`${id}`),
      sql`, `,
    )})
    LIMIT 1`);
  return rows.length > 0;
}
