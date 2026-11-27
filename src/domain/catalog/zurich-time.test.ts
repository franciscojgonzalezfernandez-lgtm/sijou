import { describe, expect, it } from "vitest";

import { utcToZurich, zurichToUtc } from "./zurich-time";

describe("Zurich time for visibility dates (F-012 CA-4)", () => {
  it.each([
    ["2026-12-24T18:00", "2026-12-24T17:00:00.000Z"], // winter, UTC+1
    ["2026-07-01T09:30", "2026-07-01T07:30:00.000Z"], // summer, UTC+2
    ["2027-03-28T03:30", "2027-03-28T01:30:00.000Z"], // just after the spring change
  ])("%s → %s and back", (local, utc) => {
    expect(zurichToUtc(local)).toBe(utc);
    expect(utcToZurich(utc)).toBe(local);
  });

  it("empty or malformed values", () => {
    expect(zurichToUtc("")).toBeNull();
    expect(zurichToUtc("24.12.2026 18:00")).toBeNull();
    expect(utcToZurich(null)).toBe("");
    expect(utcToZurich(undefined)).toBe("");
    expect(utcToZurich("nope")).toBe("");
  });
});
