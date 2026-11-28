import { describe, expect, it } from "vitest";

import {
  CODE_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
  MANUAL_REASONS,
  REASONS,
  validateAdjustment,
  validateLotEntry,
} from "./movements";

const paths = (errors: { path: string }[]) => errors.map((e) => e.path);

describe("manual adjustments (F-013 CA-4, CA-5)", () => {
  it("CA-4: the manual reasons are the five of the spec, all labelled", () => {
    expect(MANUAL_REASONS).toEqual(["receipt", "breakage", "gift", "correction", "other"]);
    for (const reason of MANUAL_REASONS) expect(REASONS[reason]).toBeTruthy();
  });

  it.each(MANUAL_REASONS.filter((r) => r !== "other"))(
    "CA-4: %s, positive or negative, needs no comment",
    (reason) => {
      expect(validateAdjustment({ delta: 2, reason }, 0)).toEqual([]);
      expect(validateAdjustment({ delta: -2, reason }, 2)).toEqual([]);
    },
  );

  it("CA-4: «Otro» needs a comment", () => {
    expect(validateAdjustment({ delta: -1, reason: "other" }, 3)).toEqual([
      { path: "comment", message: "Con el motivo «Otro», explica qué ha pasado." },
    ]);
    expect(paths(validateAdjustment({ delta: -1, reason: "other", comment: "   " }, 3))).toEqual([
      "comment",
    ]);
    expect(validateAdjustment({ delta: -1, reason: "other", comment: "Muestra" }, 3)).toEqual([]);
  });

  it("CA-4: system reasons and unknown reasons are refused", () => {
    for (const reason of ["sale", "expiry", "nope", undefined]) {
      expect(paths(validateAdjustment({ delta: 1, reason }, 0))).toEqual(["reason"]);
    }
  });

  it("CA-4: the quantity is a whole number other than 0", () => {
    for (const delta of [0, 1.5, Number.NaN, "3", null]) {
      expect(paths(validateAdjustment({ delta, reason: "correction" }, 10))).toEqual(["delta"]);
    }
  });

  it("CA-5: an adjustment never leaves the lot below 0", () => {
    expect(validateAdjustment({ delta: -3, reason: "breakage" }, 3)).toEqual([]);
    expect(validateAdjustment({ delta: -4, reason: "breakage" }, 3)).toEqual([
      { path: "delta", message: "El lote solo tiene 3 unidades." },
    ]);
    expect(validateAdjustment({ delta: -2, reason: "breakage" }, 1)).toEqual([
      { path: "delta", message: "El lote solo tiene 1 unidad." },
    ]);
  });

  it("caps the comment length", () => {
    const comment = "x".repeat(COMMENT_MAX_LENGTH + 1);
    expect(paths(validateAdjustment({ delta: 1, reason: "gift", comment }, 0))).toEqual([
      "comment",
    ]);
  });
});

describe("registering a lot (F-013 HU-1, CA-1)", () => {
  const today = "2026-11-28";

  it("CA-1: code and a positive whole quantity; expiry optional", () => {
    expect(validateLotEntry({ code: "A-1", quantity: 12 }, today)).toEqual({
      errors: [],
      expired: false,
    });
    expect(validateLotEntry({ code: "A-1", quantity: 1, expiresAt: "" }, today).errors).toEqual([]);
    expect(validateLotEntry({ code: "A-1", quantity: 1, expiresAt: null }, today).errors).toEqual(
      [],
    );
    expect(validateLotEntry({ code: "A-1", quantity: 1, expiresAt: "2027-05-01" }, today)).toEqual({
      errors: [],
      expired: false,
    });
  });

  it("CA-1: refuses an empty or too long code, and bad quantities", () => {
    expect(paths(validateLotEntry({ code: "  ", quantity: 1 }, today).errors)).toEqual(["code"]);
    expect(paths(validateLotEntry({ quantity: 1 } as never, today).errors)).toEqual(["code"]);
    expect(
      paths(validateLotEntry({ code: "x".repeat(CODE_MAX_LENGTH + 1), quantity: 1 }, today).errors),
    ).toEqual(["code"]);
    for (const quantity of [0, -1, 2.5, "4", undefined]) {
      expect(paths(validateLotEntry({ code: "A", quantity }, today).errors)).toEqual(["quantity"]);
    }
  });

  it("refuses a malformed expiry", () => {
    expect(
      paths(validateLotEntry({ code: "A", quantity: 1, expiresAt: "2026-02-30" }, today).errors),
    ).toEqual(["expiresAt"]);
  });

  it("edge case: an already expired lot is accepted with a warning", () => {
    expect(validateLotEntry({ code: "A", quantity: 1, expiresAt: "2026-11-27" }, today)).toEqual({
      errors: [],
      expired: true,
    });
    expect(validateLotEntry({ code: "A", quantity: 1, expiresAt: today }, today).expired).toBe(
      false,
    );
  });
});
