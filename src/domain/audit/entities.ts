/**
 * Entities the audit log records (F-018 CA-3). F-013, F-017 and F-033/F-040 add theirs when they
 * create their collections, with a label, in the same migration (plan: "Contrato").
 */
export const AUDITED_ENTITIES = {
  products: "Producto",
  variants: "Variante",
  lots: "Lote",
  settings: "Configuración",
} as const;

export type AuditedEntity = keyof typeof AUDITED_ENTITIES;

export const AUDIT_ACTIONS = {
  create: "Creación",
  update: "Edición",
  delete: "Borrado",
  status: "Cambio de estado",
} as const;
