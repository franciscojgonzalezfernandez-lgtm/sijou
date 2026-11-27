"use client";

import { useConfig, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";

// The result survives the reload that shows the new variants in the list.
const RESULT_KEY = "sijou:generate-variants";

/**
 * "Generar variantes" (F-011 HU-1): creates every attribute combination that has no variant yet,
 * with a suggested SKU and a common starting price that is then adjusted per variant.
 */
export function GenerateVariants() {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const options = useFormFields(([fields]) => fields.options?.rows?.length ?? 0);
  const inputId = useId();
  const statusId = useId();
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let text: string | null = null;
    try {
      text = sessionStorage.getItem(RESULT_KEY);
      sessionStorage.removeItem(RESULT_KEY);
    } catch {
      // Storage blocked: the list still shows the new variants.
    }
    // Restoring a message saved before the reload: an external value, read once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (text) setStatus({ kind: "ok", text });
  }, []);

  if (id === undefined || id === null || options === 0) return null;

  async function generate() {
    setBusy(true);
    setStatus(null);
    try {
      // Same-origin path: the admin can be served from a different host than serverURL (previews).
      const response = await fetch(`${config.routes.api}/products/${id}/generate-variants`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: Number(price.replace(",", ".")) }),
      });
      const result = (await response.json()) as {
        created?: number;
        error?: string;
        errors?: { message: string }[];
      };
      if (!response.ok) {
        setStatus({
          kind: "error",
          text: result.error ?? result.errors?.[0]?.message ?? "No se han podido generar.",
        });
      } else {
        const created = result.created ?? 0;
        if (created === 0) {
          setStatus({ kind: "ok", text: "No falta ninguna combinación." });
        } else {
          // Reload so the variants list and each photo's variant checkboxes include the new ones.
          try {
            sessionStorage.setItem(
              RESULT_KEY,
              `Se han creado ${created} variantes. Revisa sus SKU y precios.`,
            );
          } catch {
            // Storage blocked: the reloaded list is the confirmation.
          }
          window.location.reload();
        }
      }
    } catch {
      setStatus({ kind: "error", text: "No se han podido generar. Inténtalo de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  return (
    // A div, not a form: it lives inside Payload's document form.
    <div className="generate-variants" role="group" aria-labelledby={`${inputId}-title`}>
      <p id={`${inputId}-title`} className="field-label">
        Generar variantes
      </p>
      <p className="generate-variants__help">
        Crea las combinaciones de atributos que aún no tienen variante. Guarda antes los atributos.
      </p>
      <div className="generate-variants__row">
        <label htmlFor={inputId}>Precio inicial (CHF)</label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-describedby={status ? statusId : undefined}
        />
        <button
          type="button"
          className="btn btn--style-secondary btn--size-medium"
          disabled={busy || !price}
          aria-busy={busy || undefined}
          onClick={() => void generate()}
        >
          Generar variantes
        </button>
      </div>
      <p
        id={statusId}
        role={status?.kind === "error" ? "alert" : "status"}
        className={`generate-variants__status${status?.kind === "error" ? "error" : ""}`}
      >
        {status?.text}
      </p>
    </div>
  );
}
