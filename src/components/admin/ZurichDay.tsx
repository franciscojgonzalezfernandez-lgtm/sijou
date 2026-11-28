"use client";

import { FieldDescription, FieldLabel, useField } from "@payloadcms/ui";
import type { DateFieldClientComponent } from "payload";

import { expiryDay, expiryTimestamp } from "@/domain/stock/lots";

/**
 * A calendar day as a native, labelled date input (F-013 lot expiry, constitution II), stored
 * at noon UTC so it is the same day in Zurich all year. Payload's picker is unlabelled.
 */
export const ZurichDay: DateFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string | null>({ path });
  const id = `field-${path.replace(/\./g, "__")}-input`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const description = field.admin?.description;

  return (
    <div className={`field-type date-time-field zurich-date${showError ? "error" : ""}`}>
      <FieldLabel htmlFor={id} label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <input
          id={id}
          name={path}
          type="date"
          className="native-select__input"
          value={expiryDay(value) ?? ""}
          readOnly={readOnly}
          aria-invalid={showError || undefined}
          aria-describedby={
            [showError && errorMessage ? errorId : "", description ? descriptionId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) =>
            setValue(event.target.value ? expiryTimestamp(event.target.value) : null)
          }
        />
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
