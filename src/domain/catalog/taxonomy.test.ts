import { describe, expect, it } from "vitest";

import {
  formatTaxonomyMissing,
  isCollectionVisible,
  isValidVisibilityRange,
  nextVisibilityChange,
  taxonomyReadiness,
} from "./taxonomy";

const complete = {
  name: { es: "Navidad", en: "Christmas", de: "Weihnachten" },
  slug: { es: "navidad", en: "christmas", de: "weihnachten" },
};

describe("taxonomyReadiness (F-012 CA-3, CA-4)", () => {
  it("complete in the three languages", () => {
    expect(taxonomyReadiness(complete)).toEqual({ ready: true, missing: [] });
  });

  it("lists what is missing, grouped by language", () => {
    const result = taxonomyReadiness({ name: { es: "Navidad", en: " " }, slug: { es: "navidad" } });
    expect(result.ready).toBe(false);
    expect(formatTaxonomyMissing(result.missing)).toEqual([
      "Falta en inglés: nombre, slug.",
      "Falta en alemán: nombre, slug.",
    ]);
    expect(taxonomyReadiness({}).missing).toHaveLength(6);
  });
});

const now = new Date("2026-12-01T12:00:00Z");
const base = { status: "published" as const, name: "Navidad", slug: "navidad" };

describe("isCollectionVisible (F-012 CA-4, CA-6)", () => {
  it("without dates: by status and language", () => {
    expect(isCollectionVisible(base, now)).toBe(true);
    expect(isCollectionVisible({ ...base, status: "hidden" }, now)).toBe(false);
    expect(isCollectionVisible({ ...base, status: "draft" }, now)).toBe(false);
    expect(isCollectionVisible({ ...base, name: "" }, now)).toBe(false);
    expect(isCollectionVisible({ ...base, slug: null }, now)).toBe(false);
  });

  it("start included, end excluded", () => {
    expect(isCollectionVisible({ ...base, visibleFrom: now }, now)).toBe(true);
    expect(isCollectionVisible({ ...base, visibleFrom: "2026-12-01T12:00:01Z" }, now)).toBe(false);
    expect(isCollectionVisible({ ...base, visibleUntil: now }, now)).toBe(false);
    expect(isCollectionVisible({ ...base, visibleUntil: "2026-12-01T12:00:01Z" }, now)).toBe(true);
    expect(
      isCollectionVisible(
        { ...base, visibleFrom: "2026-11-01T00:00:00Z", visibleUntil: "2027-01-07T00:00:00Z" },
        now,
      ),
    ).toBe(true);
    expect(isCollectionVisible({ ...base, visibleFrom: "", visibleUntil: "nope" }, now)).toBe(true);
  });
});

describe("nextVisibilityChange (F-012 CA-4)", () => {
  it("seconds to the nearest future date, or null", () => {
    expect(nextVisibilityChange({}, now)).toBeNull();
    expect(nextVisibilityChange({ visibleFrom: "2026-11-01T00:00:00Z" }, now)).toBeNull();
    expect(nextVisibilityChange({ visibleUntil: "2026-12-01T12:00:30Z" }, now)).toBe(30);
    expect(
      nextVisibilityChange(
        { visibleFrom: "2026-12-01T12:01:00Z", visibleUntil: "2026-12-01T13:00:00Z" },
        now,
      ),
    ).toBe(60);
    expect(nextVisibilityChange({ visibleUntil: "2026-12-01T12:00:00.200Z" }, now)).toBe(1);
  });
});

describe("isValidVisibilityRange (F-012 CA-4)", () => {
  it("the end comes after the start", () => {
    expect(isValidVisibilityRange(null, null)).toBe(true);
    expect(isValidVisibilityRange("2026-12-01", null)).toBe(true);
    expect(isValidVisibilityRange("2026-12-01", "2026-12-02")).toBe(true);
    expect(isValidVisibilityRange("2026-12-02", "2026-12-01")).toBe(false);
    expect(isValidVisibilityRange("2026-12-01", "2026-12-01")).toBe(false);
  });
});
