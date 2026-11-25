import { useId, type InputHTMLAttributes } from "react";

import { cx } from "./cx";
import { controlClasses, describedBy, FieldShell } from "./field";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  requiredLabel?: string;
};

export function TextField({
  id,
  label,
  hint,
  error,
  requiredLabel,
  className,
  required,
  ...rest
}: TextFieldProps) {
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
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cx(controlClasses, className)}
        {...rest}
      />
    </FieldShell>
  );
}
