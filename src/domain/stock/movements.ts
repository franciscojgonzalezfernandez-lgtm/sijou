import { isDay } from "./lots";

/** CA-4, CA-6: why stock changed. People pick the manual ones; the system writes the rest. */
export const REASONS = {
  receipt: "Entrada de mercancía",
  breakage: "Rotura",
  gift: "Regalo",
  correction: "Corrección",
  other: "Otro",
  sale: "Pedido",
  expiry: "Caducidad",
} as const;

export type Reason = keyof typeof REASONS;

/** CA-4: the reasons a manual adjustment can use, in the order the admin lists them. */
export const MANUAL_REASONS = ["receipt", "breakage", "gift", "correction", "other"] as const;

export type ManualReason = (typeof MANUAL_REASONS)[number];

/** CA-6: what a movement points to. */
export const REFERENCES = {
  lot: "Alta de lote",
  adjustment: "Ajuste manual",
  order: "Pedido",
  expiry: "Caducidad",
} as const;

export type Reference = keyof typeof REFERENCES;

export interface FieldError {
  path: string;
  message: string;
}

export const COMMENT_MAX_LENGTH = 500;

function isManualReason(value: unknown): value is ManualReason {
  return (MANUAL_REASONS as readonly unknown[]).includes(value);
}

export interface AdjustmentInput {
  delta: unknown;
  reason: unknown;
  comment?: unknown;
}

/** CA-4, CA-5: a manual adjustment of `available` units in one lot. */
export function validateAdjustment(input: AdjustmentInput, available: number): FieldError[] {
  const errors: FieldError[] = [];
  const { delta, reason } = input;
  const comment = typeof input.comment === "string" ? input.comment.trim() : "";
  if (typeof delta !== "number" || !Number.isInteger(delta) || delta === 0) {
    errors.push({ path: "delta", message: "Indica un número entero de unidades, distinto de 0." });
  } else if (available + delta < 0) {
    errors.push({
      path: "delta",
      message: `El lote solo tiene ${available} ${available === 1 ? "unidad" : "unidades"}.`,
    });
  }
  if (!isManualReason(reason)) {
    errors.push({ path: "reason", message: "Elige un motivo de la lista." });
  } else if (reason === "other" && comment === "") {
    errors.push({ path: "comment", message: "Con el motivo «Otro», explica qué ha pasado." });
  }
  if (comment.length > COMMENT_MAX_LENGTH) {
    errors.push({
      path: "comment",
      message: `Máximo ${COMMENT_MAX_LENGTH} caracteres.`,
    });
  }
  return errors;
}

export const CODE_MAX_LENGTH = 64;

export interface LotEntryInput {
  code: unknown;
  quantity: unknown;
  expiresAt?: unknown;
}

export interface LotEntryCheck {
  errors: FieldError[];
  /** Edge case of the spec: an already expired lot is saved, with a warning, and not sold. */
  expired: boolean;
}

/** HU-1, CA-1: a new lot. `expiresAt` is a `YYYY-MM-DD` day, or empty. */
export function validateLotEntry(input: LotEntryInput, today: string): LotEntryCheck {
  const errors: FieldError[] = [];
  const code = typeof input.code === "string" ? input.code.trim() : "";
  if (code === "") {
    errors.push({ path: "code", message: "Escribe el código del lote." });
  } else if (code.length > CODE_MAX_LENGTH) {
    errors.push({ path: "code", message: `Máximo ${CODE_MAX_LENGTH} caracteres.` });
  }
  const { quantity } = input;
  if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
    errors.push({ path: "quantity", message: "Indica un número entero de unidades, 1 o más." });
  }
  const expiresAt = input.expiresAt ?? null;
  let expired = false;
  if (expiresAt !== null && expiresAt !== "") {
    if (!isDay(expiresAt)) {
      errors.push({ path: "expiresAt", message: "Fecha no válida." });
    } else {
      expired = expiresAt < today;
    }
  }
  return { errors, expired };
}
