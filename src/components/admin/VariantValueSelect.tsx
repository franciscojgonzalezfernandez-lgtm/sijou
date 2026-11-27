"use client";

import { FieldDescription, FieldLabel, useConfig, useField, useFormFields } from "@payloadcms/ui";
import type { TextFieldClientComponent } from "payload";
import { useEffect, useState } from "react";

interface ValueOption {
  code: string;
  label: string;
}

function idOf(value: unknown): number | string | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) {
    return idOf(value.id);
  }
  return undefined;
}

/**
 * A variant's value for one attribute (F-011 CA-1) as a native, labelled <select> with the
 * values defined on its product. Hidden when the product does not use the attribute and the
 * variant has no value for it; a value removed from the product stays visible as "retirado".
 */
export const VariantValueSelect: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path });
  const product = useFormFields(([fields]) => fields.product?.value);
  const { config } = useConfig();
  const [values, setValues] = useState<ValueOption[] | null>(null);
  const attribute = (field.admin?.custom as { attribute?: string } | undefined)?.attribute;
  const productId = idOf(product);
  const id = `field-${path.replace(/\./g, "__")}-input`;
  const errorId = `${id}-error`;

  useEffect(() => {
    if (productId === undefined) return;
    const controller = new AbortController();
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/products/${productId}?depth=0&locale=es`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          doc: {
            options?: { attribute?: string; values?: { code?: string; label?: string }[] }[];
          } | null,
        ) => {
          const option = doc?.options?.find((candidate) => candidate.attribute === attribute);
          setValues(
            (option?.values ?? []).flatMap((entry) =>
              entry.code ? [{ code: entry.code, label: entry.label || entry.code }] : [],
            ),
          );
        },
      )
      .catch(() => {
        if (!controller.signal.aborted) setValues([]);
      });
    return () => controller.abort();
  }, [attribute, config.routes.api, productId]);

  if (productId === undefined || values === null) return null;
  const current = value || "";
  if (values.length === 0 && !current) return null;
  const retired = current && !values.some((entry) => entry.code === current);

  return (
    <div className={`field-type select native-select${showError ? "error" : ""}`}>
      <FieldLabel htmlFor={id} label={field.label} path={path} />
      <div className="field-type__wrap">
        <select
          id={id}
          name={path}
          className="native-select__input"
          value={current}
          disabled={readOnly}
          aria-invalid={showError || undefined}
          aria-describedby={showError && errorMessage ? errorId : undefined}
          onChange={(event) => setValue(event.target.value || null)}
        >
          <option value="">—</option>
          {values.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
          {retired && <option value={current}>{`${current} (retirado)`}</option>}
        </select>
        {showError && errorMessage && (
          <p id={errorId} role="alert" className="native-select__error">
            {errorMessage}
          </p>
        )}
      </div>
      {field.admin?.description && (
        <FieldDescription description={field.admin.description} path={path} />
      )}
    </div>
  );
};
