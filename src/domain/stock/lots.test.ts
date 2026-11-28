import { describe, expect, it } from "vitest";

import {
  allocate,
  availableStock,
  expiredStock,
  expiryDay,
  expiryTimestamp,
  fefoOrder,
  isDay,
  isExpired,
  type Lot,
  zurichToday,
} from "./lots";

let nextId = 1;
function lot(partial: Partial<Lot>): Lot {
  return {
    id: nextId++,
    code: "L",
    quantityAvailable: 5,
    receivedAt: "2026-11-01T10:00:00.000Z",
    expiresAt: null,
    ...partial,
  };
}

describe("days in Zurich (F-013 D-1)", () => {
  it("today follows Zurich, not UTC", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Zurich (UTC+1).
    expect(zurichToday(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    // 22:30 UTC on 30 Jun is 00:30 on 1 Jul in Zurich (UTC+2).
    expect(zurichToday(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(zurichToday(new Date("2026-06-30T21:30:00Z"))).toBe("2026-06-30");
    expect(zurichToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("stored expiry timestamps map back to their day, summer and winter", () => {
    for (const day of ["2026-01-15", "2026-07-15", "2027-03-28", "2026-10-25"]) {
      expect(expiryDay(expiryTimestamp(day))).toBe(day);
    }
    // A day picked in the admin is midnight in Zurich, the previous day in UTC.
    expect(expiryDay("2026-12-30T23:00:00.000Z")).toBe("2026-12-31");
    expect(expiryDay(null)).toBeNull();
    expect(expiryDay(undefined)).toBeNull();
    expect(expiryDay("nope")).toBeNull();
  });

  it("isDay accepts real calendar days only", () => {
    expect(isDay("2026-02-28")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("28.02.2026")).toBe(false);
    expect(isDay(20260228)).toBe(false);
  });
});

describe("expired lots and available stock (F-013 CA-2)", () => {
  it("CA-2: a lot is sold through its expiry day and expires the day after", () => {
    const l = lot({ expiresAt: "2026-12-31" });
    expect(isExpired(l, "2026-12-30")).toBe(false);
    expect(isExpired(l, "2026-12-31")).toBe(false);
    expect(isExpired(l, "2027-01-01")).toBe(true);
    expect(isExpired(lot({ expiresAt: null }), "2999-01-01")).toBe(false);
  });

  it("CA-2: available stock adds up the lots that have not expired", () => {
    const today = "2026-11-28";
    expect(availableStock([], today)).toBe(0);
    const lots = [
      lot({ quantityAvailable: 3, expiresAt: "2026-12-31" }),
      lot({ quantityAvailable: 4, expiresAt: null }),
      lot({ quantityAvailable: 7, expiresAt: "2026-11-27" }),
    ];
    expect(availableStock(lots, today)).toBe(7);
    expect(expiredStock(lots, today)).toBe(7);
    expect(availableStock(lots.slice(2), today)).toBe(0);
    expect(expiredStock(lots.slice(0, 2), today)).toBe(0);
  });
});

describe("FEFO order (F-013 CA-3)", () => {
  it("CA-3: earliest expiry first, no expiry last, then oldest receipt, then id", () => {
    const noExpiryNew = lot({ code: "no-new", receivedAt: "2026-11-20T00:00:00Z" });
    const noExpiryOld = lot({ code: "no-old", receivedAt: "2026-10-01T00:00:00Z" });
    const march = lot({ code: "march", expiresAt: "2027-03-01" });
    const januaryLate = lot({
      code: "jan-late",
      expiresAt: "2027-01-01",
      receivedAt: "2026-11-02T00:00:00Z",
    });
    const januaryEarly = lot({
      code: "jan-early",
      expiresAt: "2027-01-01",
      receivedAt: "2026-11-01T00:00:00Z",
    });
    const januaryTwin = lot({
      code: "jan-twin",
      expiresAt: "2027-01-01",
      receivedAt: "2026-11-01T00:00:00Z",
    });
    const sorted = fefoOrder([
      noExpiryNew,
      march,
      januaryTwin,
      noExpiryOld,
      januaryLate,
      januaryEarly,
    ]);
    expect(sorted.map((l) => l.code)).toEqual([
      "jan-early",
      "jan-twin",
      "jan-late",
      "march",
      "no-old",
      "no-new",
    ]);
  });

  it("does not reorder the input", () => {
    const input = [lot({ expiresAt: null }), lot({ expiresAt: "2027-01-01" })];
    const before = [...input];
    fefoOrder(input);
    expect(input).toEqual(before);
  });
});

describe("allocating an outgoing quantity (F-013 CA-3, CA-5)", () => {
  const today = "2026-11-28";

  it("CA-3: takes from the earliest expiry first, across lots", () => {
    const later = lot({ quantityAvailable: 10, expiresAt: "2027-06-01" });
    const sooner = lot({ quantityAvailable: 2, expiresAt: "2027-01-01" });
    const never = lot({ quantityAvailable: 10, expiresAt: null });
    expect(allocate([never, later, sooner], 5, today)).toEqual({
      ok: true,
      takes: [
        { lotId: sooner.id, quantity: 2 },
        { lotId: later.id, quantity: 3 },
      ],
    });
    expect(allocate([never, later, sooner], 2, today)).toEqual({
      ok: true,
      takes: [{ lotId: sooner.id, quantity: 2 }],
    });
  });

  it("CA-3: skips expired and empty lots", () => {
    const expired = lot({ quantityAvailable: 50, expiresAt: "2026-11-27" });
    const empty = lot({ quantityAvailable: 0, expiresAt: "2026-12-01" });
    const ok = lot({ quantityAvailable: 3, expiresAt: null });
    expect(allocate([expired, empty, ok], 3, today)).toEqual({
      ok: true,
      takes: [{ lotId: ok.id, quantity: 3 }],
    });
  });

  it("CA-5: never a partial allocation", () => {
    const a = lot({ quantityAvailable: 1, expiresAt: "2026-12-01" });
    const b = lot({ quantityAvailable: 1, expiresAt: null });
    expect(allocate([a, b], 3, today)).toEqual({ ok: false, missing: 1 });
    expect(allocate([], 1, today)).toEqual({ ok: false, missing: 1 });
  });

  it("rejects quantities that are not positive integers", () => {
    expect(() => allocate([], 0, today)).toThrow(RangeError);
    expect(() => allocate([], -1, today)).toThrow(RangeError);
    expect(() => allocate([], 1.5, today)).toThrow(RangeError);
  });
});
