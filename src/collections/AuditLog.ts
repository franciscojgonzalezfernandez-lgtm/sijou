import type { CollectionConfig } from "payload";

import { AUDIT_ACTIONS, AUDITED_ENTITIES } from "@/domain/audit/entities";

import { AUDIT_LOG } from "./audit";

const NATIVE_SELECT = "/components/admin/NativeSelect#NativeSelect";

const options = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/**
 * Append-only audit log (F-018 CA-3…CA-6). Nobody can create, edit or delete rows through the
 * admin or the API; the audit hooks insert them, and a Postgres trigger rejects any UPDATE or
 * DELETE. No relationships on purpose: a foreign key with ON DELETE SET NULL would rewrite rows.
 */
export const AuditLog: CollectionConfig = {
  slug: AUDIT_LOG,
  labels: { singular: "Registro de auditoría", plural: "Auditoría" },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: false,
  lockDocuments: false,
  admin: {
    group: "Sistema",
    useAsTitle: "entityLabel",
    defaultColumns: ["at", "actorEmail", "entity", "entityLabel", "action"],
    description: "Quién cambió qué y cuándo. Solo lectura; se conserva 10 años.",
    pagination: { defaultLimit: 25 },
    components: { beforeListTable: ["/components/admin/AuditFilters#AuditFilters"] },
  },
  defaultSort: "-at",
  fields: [
    {
      name: "at",
      type: "date",
      label: "Fecha",
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: "dayAndTime", displayFormat: "dd/MM/yyyy HH:mm" },
        components: { Field: "/components/admin/ReadOnlyDate#ReadOnlyDate" },
      },
    },
    {
      type: "row",
      fields: [
        {
          name: "actorEmail",
          type: "text",
          label: "Usuario",
          index: true,
          admin: { width: "50%", description: "Vacío = Sistema (seed, webhooks, tareas)." },
        },
        { name: "actorId", type: "number", label: "Id del usuario", admin: { width: "50%" } },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "entity",
          type: "select",
          label: "Entidad",
          required: true,
          index: true,
          options: options(AUDITED_ENTITIES),
          admin: { width: "33%", components: { Field: NATIVE_SELECT } },
        },
        { name: "entityId", type: "text", label: "Id", index: true, admin: { width: "33%" } },
        { name: "entityLabel", type: "text", label: "Elemento", admin: { width: "33%" } },
      ],
    },
    {
      type: "row",
      fields: [
        {
          name: "action",
          type: "select",
          label: "Acción",
          required: true,
          options: options(AUDIT_ACTIONS),
          admin: { width: "50%", components: { Field: NATIVE_SELECT } },
        },
        { name: "locale", type: "text", label: "Idioma", admin: { width: "50%" } },
      ],
    },
    {
      name: "changes",
      type: "json",
      label: "Cambios",
      admin: { components: { Field: "/components/admin/AuditChanges#AuditChanges" } },
    },
  ],
};
