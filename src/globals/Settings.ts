import { revalidateTag } from "next/cache";
import type { GlobalConfig } from "payload";

import { auditGlobalHooks } from "@/collections/audit";
import {
  alertEmailsError,
  DEFAULT_SETTINGS,
  isNonNegativeInteger,
  isValidAmount,
  isValidEmail,
  MAX_ALERT_EMAILS,
} from "@/domain/settings/settings";

/** Cache tag for `getSettings()`. */
export const SETTINGS_TAG = "settings";

const wholeNumber = (value: number | null | undefined) =>
  value === null || value === undefined || isNonNegativeInteger(value)
    ? true
    : "Un número entero, 0 o mayor.";

const email = (value: string | null | undefined) =>
  !value || isValidEmail(value) ? true : "Email no válido.";

const countField = (name: string, label: string, description: string, fallback: number) => ({
  name,
  type: "number" as const,
  label,
  min: 0,
  defaultValue: fallback,
  admin: { step: 1, description },
  validate: wholeNumber,
});

/**
 * Shop settings (F-018 CA-1, CA-2). One row; features read it through `getSettings()`, never
 * directly. Nothing is translated: these are business data, not storefront texts.
 */
export const Settings: GlobalConfig = {
  slug: "settings",
  label: "Configuración",
  admin: { group: "Sistema" },
  // F-018 edge case: two admins, last save wins; no lock that blocks the other one.
  lockDocuments: false,
  access: { read: ({ req }) => Boolean(req.user), update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Tienda",
          fields: [
            {
              name: "storeName",
              type: "text",
              label: "Nombre de la tienda",
              required: true,
              defaultValue: DEFAULT_SETTINGS.storeName,
            },
            {
              name: "contactEmail",
              type: "email",
              label: "Email de contacto",
              admin: { description: "Obligatorio antes del lanzamiento." },
              validate: email,
            },
            {
              name: "impressumAddress",
              type: "textarea",
              label: "Dirección para el Impressum",
              admin: { description: "Obligatoria antes del lanzamiento." },
            },
          ],
        },
        {
          label: "Stock",
          fields: [
            countField(
              "lowStockThreshold",
              "Umbral de stock bajo (unidades)",
              "Se avisa cuando una variante baja de estas unidades.",
              DEFAULT_SETTINGS.lowStockThreshold,
            ),
            countField(
              "offerDaysBeforeExpiry",
              "Días antes de caducar para pasar a Ofertas",
              "Un lote pasa a Ofertas cuando le quedan estos días.",
              DEFAULT_SETTINGS.offerDaysBeforeExpiry,
            ),
            countField(
              "expiryWarningDays",
              "Días de aviso de caducidad",
              "Se avisa de los lotes que caducan en estos días.",
              DEFAULT_SETTINGS.expiryWarningDays,
            ),
          ],
        },
        {
          label: "Avisos",
          fields: [
            {
              name: "alertEmails",
              type: "array",
              label: "Emails que reciben los avisos",
              labels: { singular: "Email", plural: "Emails" },
              maxRows: MAX_ALERT_EMAILS,
              admin: {
                description: `Hasta ${MAX_ALERT_EMAILS}. Si no hay ninguno, se usa el email de contacto.`,
              },
              validate: (rows: unknown) =>
                alertEmailsError(rows as { email?: string | null }[] | null) ?? true,
              fields: [
                { name: "email", type: "email", label: "Email", required: true, validate: email },
              ],
            },
          ],
        },
        {
          label: "Envíos",
          fields: [
            {
              name: "freeShippingThreshold",
              type: "number",
              label: "Envío gratis a partir de (CHF)",
              min: 0,
              admin: { step: 0.05, description: "Vacío = sin envío gratis." },
              validate: (value: number | null | undefined) =>
                value === null || value === undefined || isValidAmount(value)
                  ? true
                  : "Importe en CHF, 0 o mayor, con 2 decimales como máximo.",
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      auditGlobalHooks({ entity: "settings", label: "Configuración" }),
      () => {
        try {
          revalidateTag(SETTINGS_TAG, { expire: 0 });
        } catch {
          // Not running inside Next.js (seed script): nothing cached to expire.
        }
      },
    ],
  },
};
