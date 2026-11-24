import { describe, expect, it } from "vitest";

import { isValidPrice, toRappen } from "./price";
import { slugify } from "./slug";
import { isVisibleInStore, productStatuses } from "./status";

describe("slugify (F-010 CA-6)", () => {
  it.each([
    ["Crème Hydratante", "creme-hydratante"],
    ["Gesichtsöl für trockene Haut", "gesichtsoel-fuer-trockene-haut"],
    ["Süßes Bad", "suesses-bad"],
    ["ÄÖÜ", "aeoeue"],
    ["  Jabón   de   lavanda!! ", "jabon-de-lavanda"],
    ["Aceite (50 ml) — Rosa & Mosqueta", "aceite-50-ml-rosa-mosqueta"],
    ["---", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("prices", () => {
  it("converts CHF to integer Rappen without float drift", () => {
    expect(toRappen(24.9)).toBe(2490);
    expect(toRappen(0.1 + 0.2)).toBe(30);
  });

  it.each([
    [24.9, true],
    [0.05, true],
    [10, true],
    [0, false],
    [-1, false],
    [1.005, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    ["24.90", false],
    [null, false],
  ])("isValidPrice(%s) → %s", (value, expected) => {
    expect(isValidPrice(value)).toBe(expected);
  });
});

describe("isVisibleInStore (F-010 CA-5)", () => {
  it("shows only published products", () => {
    expect(productStatuses.filter((status) => isVisibleInStore(status))).toEqual(["published"]);
    expect(isVisibleInStore(undefined)).toBe(false);
  });
});
