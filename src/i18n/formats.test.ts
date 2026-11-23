import { describe, expect, it } from "vitest";

import { formatDate, formatPrice } from "./formats";

// Intl uses narrow no-break spaces in some locales; normalise for readable assertions.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatPrice", () => {
  it("CA-8: English and German use the Swiss format", () => {
    expect(plain(formatPrice(24.9, "en"))).toBe("CHF 24.90");
    expect(plain(formatPrice(24.9, "de"))).toBe("CHF 24.90");
    expect(plain(formatPrice(1234.5, "de"))).toBe("CHF 1'234.50");
  });

  it("CA-8: Spanish follows Spanish conventions (D-1)", () => {
    expect(plain(formatPrice(24.9, "es"))).toBe("24,90 CHF");
  });
});

describe("formatDate", () => {
  const launch = new Date("2027-02-01T12:00:00Z");

  it("CA-8: long dates are written in each language", () => {
    expect(formatDate(launch, "en")).toBe("1 February 2027");
    expect(formatDate(launch, "de")).toBe("1. Februar 2027");
    expect(formatDate(launch, "es")).toBe("1 de febrero de 2027");
  });

  it("CA-8: short dates follow the Swiss region per language", () => {
    expect(formatDate(launch, "de", "short")).toBe("01.02.27");
  });
});
