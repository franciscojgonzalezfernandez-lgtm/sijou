"use client";

import { FieldDescription, FieldLabel, useField } from "@payloadcms/ui";
import type { SelectFieldClientComponent } from "payload";

/**
 * Select field as a native, labelled <select> (F-010, constitution II). Payload's default
 * react-select widget leaves its input unlabelled and its icons focusable under aria-hidden.
 */
export const NativeSelect: SelectFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path });
  const id = `field-${path.replace(/\./g, "__")}-input`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const options = field.options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option,
  );
  const description = field.admin?.description;

  return (
    <div className={`field-type select native-select${showError ? "error" : ""}`}>
      <FieldLabel
        htmlFor={id}
        label={field.label}
        localized={field.localized}
        path={path}
        required={field.required}
      />
      <div className="field-type__wrap">
        <select
          id={id}
          name={path}
          className="native-select__input"
          value={value ?? ""}
          disabled={readOnly}
          required={field.required}
          aria-invalid={showError || undefined}
          aria-describedby={
            [showError && errorMessage ? errorId : "", description ? descriptionId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) => setValue(event.target.value)}
        >
          {!field.required && <option value="">—</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {typeof option.label === "string" ? option.label : option.value}
            </option>
          ))}
        </select>
        {/* Visible text, not Payload's hover tooltip: on phones the tooltip never shows (CA-4, CA-10). */}
        {showError && errorMessage && (
          <p id={errorId} role="alert" className="native-select__error">
            {errorMessage}
          </p>
        )}
      </div>
      {description && (
        <div id={descriptionId}>
          <FieldDescription description={description} path={path} />
        </div>
      )}
    </div>
  );
};
