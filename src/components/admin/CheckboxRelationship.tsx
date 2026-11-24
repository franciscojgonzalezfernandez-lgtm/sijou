"use client";

import { FieldDescription, FieldError, useConfig, useField, useLocale } from "@payloadcms/ui";
import type { RelationshipFieldClientComponent } from "payload";
import { useEffect, useId, useState } from "react";

type Id = number | string;

interface Option {
  id: Id;
  title: string;
}

function idOf(value: unknown): Id | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return idOf(value.id);
  }
  return undefined;
}

/**
 * Many-to-many relationship as a list of native checkboxes in a fieldset (F-010, constitution II).
 * Replaces Payload's react-select widget, whose input has no accessible name. Meant for short
 * lists such as categories (tens of items).
 */
export const CheckboxRelationship: RelationshipFieldClientComponent = ({
  field,
  path,
  readOnly,
}) => {
  const { value, setValue, showError, errorMessage } = useField<unknown[]>({ path });
  const { config } = useConfig();
  const locale = useLocale();
  const [options, setOptions] = useState<Option[] | null>(null);
  const legendId = useId();
  const relationTo = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
  const label = typeof field.label === "string" ? field.label : path;
  const selected = new Set((Array.isArray(value) ? value : []).map(idOf));

  useEffect(() => {
    const controller = new AbortController();
    const collection = config.collections.find((c) => c.slug === relationTo);
    const titleField = collection?.admin?.useAsTitle ?? "id";
    const params = new URLSearchParams({
      limit: "200",
      depth: "0",
      sort: titleField,
      locale: locale.code,
      "fallback-locale": config.localization ? config.localization.defaultLocale : "",
    });
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/${relationTo}?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ docs: Record<string, unknown>[] }>)
      .then(({ docs }) =>
        setOptions(
          docs.map((doc) => ({
            id: doc.id as Id,
            title: typeof doc[titleField] === "string" ? doc[titleField] : String(doc.id),
          })),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      });
    return () => controller.abort();
  }, [config, locale.code, relationTo]);

  function toggle(id: Id, checked: boolean) {
    const current = (Array.isArray(value) ? value : []).map(idOf).filter((v) => v !== undefined);
    setValue(checked ? [...current, id] : current.filter((v) => v !== id));
  }

  return (
    <fieldset
      className={`field-type checkbox-relationship${showError ? "error" : ""}`}
      aria-labelledby={legendId}
      disabled={readOnly}
    >
      <legend id={legendId} className="field-label">
        {label}
        {field.required && <span className="required">*</span>}
      </legend>
      <FieldError message={errorMessage} path={path} showError={showError} />
      {options === null ? (
        <p aria-live="polite">Cargando…</p>
      ) : options.length === 0 ? (
        <p>
          No hay elementos todavía.{" "}
          <a href={`${config.routes.admin}/collections/${relationTo}/create`}>Crear uno</a>
        </p>
      ) : (
        <ul className="checkbox-relationship__list">
          {options.map((option) => (
            <li key={option.id}>
              <label className="checkbox-relationship__option">
                <input
                  type="checkbox"
                  checked={selected.has(option.id)}
                  onChange={(event) => toggle(option.id, event.target.checked)}
                />
                {option.title}
              </label>
            </li>
          ))}
        </ul>
      )}
      {field.admin?.description && (
        <FieldDescription description={field.admin.description} path={path} />
      )}
    </fieldset>
  );
};
