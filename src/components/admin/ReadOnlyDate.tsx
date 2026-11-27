"use client";

import { useField } from "@payloadcms/ui";
import type { DateFieldClientComponent } from "payload";
import { useId } from "react";

const FORMAT = new Intl.DateTimeFormat("es-CH", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Zurich",
});

/**
 * A date that nobody edits (audit log, F-018 CA-4) as plain text. Payload's date picker leaves
 * its input and clear button unlabelled (constitution II), and there is nothing to pick here.
 */
export const ReadOnlyDate: DateFieldClientComponent = ({ field, path }) => {
  const { value } = useField<string | null>({ path });
  const labelId = useId();
  const label = typeof field.label === "string" ? field.label : field.name;
  return (
    <div className="field-type read-only-date">
      <p id={labelId} className="field-label">
        {label}
      </p>
      <p aria-labelledby={labelId}>
        {value ? <time dateTime={value}>{FORMAT.format(new Date(value))}</time> : "—"}
      </p>
    </div>
  );
};
