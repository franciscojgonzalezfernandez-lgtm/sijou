import { utcToZurich } from "@/domain/catalog/zurich-time";

/**
 * Stock by lots (F-013). A lot's expiry is a calendar day in Zurich (`YYYY-MM-DD`); the lot is
 * still sold on that day and stops counting the next (plan D-1).
 */
export interface Lot {
  id: number;
  code: string;
  quantityAvailable: number;
  /** ISO timestamp of the goods receipt. */
  receivedAt: string;
  /** `YYYY-MM-DD`, or `null` when the lot does not expire. */
  expiresAt: string | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** True for a real calendar day written as `YYYY-MM-DD`. */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !DAY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Today in Zurich as `YYYY-MM-DD`. */
export function zurichToday(now: Date = new Date()): string {
  return utcToZurich(now.toISOString()).slice(0, 10);
}

/**
 * The Zurich day of a stored expiry timestamp. Lots are stored at noon UTC, which is the same
 * day in Zurich all year; a day picked in the admin (midnight in Zurich) also maps back right.
 */
export function expiryDay(iso: string | null | undefined): string | null {
  const local = utcToZurich(iso);
  return local ? local.slice(0, 10) : null;
}

/** The timestamp stored for an expiry day (noon UTC: same day in Zurich, summer and winter). */
export function expiryTimestamp(day: string): string {
  return `${day}T12:00:00.000Z`;
}

/** CA-2, D-1: expired once the expiry day is over. */
export function isExpired(lot: Pick<Lot, "expiresAt">, today: string): boolean {
  return lot.expiresAt !== null && lot.expiresAt < today;
}

/** CA-2: units of the lots that have not expired. */
export function availableStock(lots: readonly Lot[], today: string): number {
  return lots.reduce((sum, lot) => (isExpired(lot, today) ? sum : sum + lot.quantityAvailable), 0);
}

/** Units in lots that have expired and are no longer sold. */
export function expiredStock(lots: readonly Lot[], today: string): number {
  return lots.reduce((sum, lot) => (isExpired(lot, today) ? sum + lot.quantityAvailable : sum), 0);
}

/**
 * CA-3: earliest expiry first, lots without expiry last, then oldest receipt, then id (a total,
 * stable order, also the order rows are locked in, so two sales never deadlock).
 */
export function compareFefo(a: Lot, b: Lot): number {
  if (a.expiresAt !== b.expiresAt) {
    if (a.expiresAt === null) return 1;
    if (b.expiresAt === null) return -1;
    return a.expiresAt < b.expiresAt ? -1 : 1;
  }
  const received = Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
  return received !== 0 ? received : a.id - b.id;
}

export function fefoOrder<T extends Lot>(lots: readonly T[]): T[] {
  return [...lots].sort(compareFefo);
}

export interface Take {
  lotId: number;
  quantity: number;
}

export type Allocation = { ok: true; takes: Take[] } | { ok: false; missing: number };

/**
 * CA-3, CA-5: splits an outgoing quantity across lots in FEFO order, skipping expired and empty
 * lots. All or nothing: when there is not enough, nothing is taken.
 */
export function allocate(lots: readonly Lot[], quantity: number, today: string): Allocation {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new RangeError(`quantity must be a positive integer, got ${quantity}`);
  }
  const takes: Take[] = [];
  let left = quantity;
  for (const lot of fefoOrder(lots)) {
    if (left === 0) break;
    if (isExpired(lot, today) || lot.quantityAvailable <= 0) continue;
    const take = Math.min(left, lot.quantityAvailable);
    takes.push({ lotId: lot.id, quantity: take });
    left -= take;
  }
  return left === 0 ? { ok: true, takes } : { ok: false, missing: left };
}
