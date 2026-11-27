/**
 * Shop settings (F-018 CA-1, CA-2). Business data, not storefront texts: nothing is translated.
 * Features never read the Payload global directly; they call `getSettings()`, which returns
 * `resolveSettings(global)` so every value is typed and defaulted.
 */
export interface Settings {
  storeName: string;
  /** Empty until the client fills it in before launch (D-1: the repository is public). */
  contactEmail: string | null;
  impressumAddress: string | null;
  lowStockThreshold: number;
  offerDaysBeforeExpiry: number;
  expiryWarningDays: number;
  /** Who gets stock and order alerts; falls back to `contactEmail` when empty. */
  alertEmails: string[];
  /** CHF. `null` = no free shipping (D-3, decided by N-08 / TA-01). */
  freeShippingThreshold: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  storeName: "Sijôu",
  contactEmail: null,
  impressumAddress: null,
  lowStockThreshold: 5,
  offerDaysBeforeExpiry: 30,
  expiryWarningDays: 30,
  alertEmails: [],
  freeShippingThreshold: null,
};

export const MAX_ALERT_EMAILS = 5;

/** Raw global as Payload stores it: every field may be missing or null. */
export interface RawSettings {
  storeName?: string | null;
  contactEmail?: string | null;
  impressumAddress?: string | null;
  lowStockThreshold?: number | null;
  offerDaysBeforeExpiry?: number | null;
  expiryWarningDays?: number | null;
  alertEmails?: { email?: string | null }[] | null;
  freeShippingThreshold?: number | null;
}

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function count(value: number | null | undefined, fallback: number): number {
  return isNonNegativeInteger(value) ? value : fallback;
}

/** Fills every missing value with its default. A saved 0 is kept. */
export function resolveSettings(raw: RawSettings | null | undefined): Settings {
  const contactEmail = text(raw?.contactEmail);
  const alertEmails = (raw?.alertEmails ?? []).flatMap((row) => {
    const email = text(row.email);
    return email ? [email] : [];
  });
  const threshold = raw?.freeShippingThreshold;
  return {
    storeName: text(raw?.storeName) ?? DEFAULT_SETTINGS.storeName,
    contactEmail,
    impressumAddress: text(raw?.impressumAddress),
    lowStockThreshold: count(raw?.lowStockThreshold, DEFAULT_SETTINGS.lowStockThreshold),
    offerDaysBeforeExpiry: count(
      raw?.offerDaysBeforeExpiry,
      DEFAULT_SETTINGS.offerDaysBeforeExpiry,
    ),
    expiryWarningDays: count(raw?.expiryWarningDays, DEFAULT_SETTINGS.expiryWarningDays),
    alertEmails: alertEmails.length > 0 ? alertEmails : contactEmail ? [contactEmail] : [],
    freeShippingThreshold: isValidAmount(threshold) ? threshold : null,
  };
}

/** Whole number, 0 or more (stock units, days). */
export function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** CHF amount of 0 or more with at most 2 decimals. */
export function isValidAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
  );
}

// Same shape browsers accept for <input type="email">: something@domain.tld, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && EMAIL.test(value.trim());
}

/** Error message for the alert email list, or `null` when it is valid. */
export function alertEmailsError(
  rows: { email?: string | null }[] | null | undefined,
): string | null {
  const emails = (rows ?? []).map((row) => row.email?.trim().toLowerCase() ?? "");
  if (emails.length > MAX_ALERT_EMAILS) return `Como máximo ${MAX_ALERT_EMAILS} emails.`;
  if (emails.some((email) => !isValidEmail(email)))
    return "Revisa los emails: alguno no es válido.";
  if (new Set(emails).size !== emails.length) return "Hay emails repetidos.";
  return null;
}
