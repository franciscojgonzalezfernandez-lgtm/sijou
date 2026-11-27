import { describe, expect, it } from "vitest";

import {
  alertEmailsError,
  DEFAULT_SETTINGS,
  isNonNegativeInteger,
  isValidAmount,
  isValidEmail,
  resolveSettings,
} from "./settings";

describe("resolveSettings (F-018 CA-1, CA-2)", () => {
  it("CA-2: an empty global gives the defaults", () => {
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(resolveSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("CA-1: keeps saved values, including 0", () => {
    expect(
      resolveSettings({
        storeName: " Tienda ",
        contactEmail: "hola@example.com",
        impressumAddress: "Calle 1\n8000 Zürich",
        lowStockThreshold: 0,
        offerDaysBeforeExpiry: 0,
        expiryWarningDays: 14,
        alertEmails: [{ email: "a@example.com" }, { email: " " }, { email: null }],
        freeShippingThreshold: 0,
      }),
    ).toEqual({
      storeName: "Tienda",
      contactEmail: "hola@example.com",
      impressumAddress: "Calle 1\n8000 Zürich",
      lowStockThreshold: 0,
      offerDaysBeforeExpiry: 0,
      expiryWarningDays: 14,
      alertEmails: ["a@example.com"],
      freeShippingThreshold: 0,
    });
  });

  it("CA-2: invalid stored numbers fall back to the default", () => {
    const settings = resolveSettings({
      lowStockThreshold: -1,
      offerDaysBeforeExpiry: 1.5,
      freeShippingThreshold: -5,
    });
    expect(settings.lowStockThreshold).toBe(5);
    expect(settings.offerDaysBeforeExpiry).toBe(30);
    expect(settings.freeShippingThreshold).toBeNull();
  });

  it("alerts go to the contact email when no alert email is set", () => {
    expect(resolveSettings({ contactEmail: "hola@example.com" }).alertEmails).toEqual([
      "hola@example.com",
    ]);
    expect(resolveSettings({ alertEmails: [] }).alertEmails).toEqual([]);
  });
});

describe("settings validators (F-018 CA-2)", () => {
  it.each([
    [0, true],
    [12, true],
    [-1, false],
    [1.5, false],
    [null, false],
    ["3", false],
  ])("isNonNegativeInteger(%s) = %s", (value, expected) => {
    expect(isNonNegativeInteger(value)).toBe(expected);
  });

  it.each([
    [0, true],
    [80, true],
    [79.95, true],
    [-1, false],
    [1.234, false],
    [Number.NaN, false],
    [null, false],
  ])("isValidAmount(%s) = %s", (value, expected) => {
    expect(isValidAmount(value)).toBe(expected);
  });

  it.each([
    ["hola@example.com", true],
    [" hola@example.ch ", true],
    ["hola@", false],
    ["hola example@x.ch", false],
    ["", false],
    [null, false],
  ])("isValidEmail(%s) = %s", (value, expected) => {
    expect(isValidEmail(value)).toBe(expected);
  });

  it("alertEmailsError", () => {
    expect(alertEmailsError(null)).toBeNull();
    expect(alertEmailsError([{ email: "a@x.ch" }, { email: "b@x.ch" }])).toBeNull();
    expect(alertEmailsError([{ email: "a@x" }])).toBe("Revisa los emails: alguno no es válido.");
    expect(alertEmailsError([{ email: null }])).toBe("Revisa los emails: alguno no es válido.");
    expect(alertEmailsError([{ email: "a@x.ch" }, { email: "A@x.ch " }])).toBe(
      "Hay emails repetidos.",
    );
    expect(alertEmailsError(Array.from({ length: 6 }, (_, i) => ({ email: `${i}@x.ch` })))).toBe(
      "Como máximo 5 emails.",
    );
  });
});
