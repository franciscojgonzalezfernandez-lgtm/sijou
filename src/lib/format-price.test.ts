import { describe, expect, it } from "vitest";
import { formatChf } from "./format-price";

describe("formatChf", () => {
  it("CA-2: formats CHF amounts with two decimals", () => {
    expect(formatChf(24.9)).toMatch(/CHF\s?24\.90/);
  });

  it("CA-2: uses the locale's conventions", () => {
    expect(formatChf(1234.5, "de")).toMatch(/1.?234\.50/);
  });
});
