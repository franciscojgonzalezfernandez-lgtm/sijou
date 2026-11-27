"use client";

import { FieldDescription, FieldLabel, useField } from "@payloadcms/ui";
import type { DateFieldClientComponent } from "payload";

import { utcToZurich, zurichToUtc } from "@/domain/catalog/zurich-time";

/**
 * Date and time as a native, labelled input in Zurich time (F-012 CA-4, constitution II),
 * stored in UTC. Payload's date picker leaves its input and clear button unlabelled.
 */
export const ZurichDateTime: DateFieldClientComponent = ({ field, path, readOnly }) => {
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
          type="datetime-local"
          className="native-select__input"
          value={utcToZurich(value)}
          readOnly={readOnly}
          aria-invalid={showError || undefined}
          aria-describedby={
            [showError && errorMessage ? errorId : "", description ? descriptionId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) => setValue(zurichToUtc(event.target.value))}
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
