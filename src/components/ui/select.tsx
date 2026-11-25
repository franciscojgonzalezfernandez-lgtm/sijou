import { useId, type SelectHTMLAttributes } from "react";

import { cx } from "./cx";
import { controlClasses, describedBy, FieldShell } from "./field";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
};

/** Native select: the platform picker is the most accessible one on phones. */
export function Select({
  id,
  label,
  hint,
  error,
  requiredLabel,
  className,
  required,
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      requiredLabel={requiredLabel}
    >
      <div className="relative">
        <select
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cx(controlClasses, "appearance-none pr-10", className)}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="text-ink pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
          fill="none"
        >
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </FieldShell>
  );
}
