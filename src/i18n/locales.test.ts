import { describe, expect, it } from "vitest";

import { isLocale } from "./locales";

describe("isLocale", () => {
  it("accepts only supported languages", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
