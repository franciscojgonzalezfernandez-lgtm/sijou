import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { cx } from "./cx";

const inputClasses =
  "size-5 shrink-0 cursor-pointer accent-(--color-accent-solid) disabled:cursor-not-allowed";
const rowClasses = "flex min-h-11 cursor-pointer items-center gap-3 font-sans text-base text-ink";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  id?: string;
  label: ReactNode;
  hint?: string;
};

/** Native checkbox: a 20px control inside a 44px row that is all clickable (CA-4). */
export function Checkbox({ id, label, hint, className, ...rest }: CheckboxProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={cx("flex flex-col", className)}>
      <label htmlFor={fieldId} className={rowClasses}>
        <input
          id={fieldId}
          type="checkbox"
          aria-describedby={hint ? `${fieldId}-hint` : undefined}
          className={inputClasses}
          {...rest}
        />
        {label}
      </label>
      {hint && (
        <p id={`${fieldId}-hint`} className="type-body-sm text-ink-muted -mt-1 pl-8">
          {hint}
        </p>
      )}
    </div>
  );
}

export type RadioOption = { value: string; label: ReactNode; disabled?: boolean };

export type RadioGroupProps = {
  name: string;
  legend: string;
  options: RadioOption[];
  defaultValue?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

/** Radios in a fieldset: the legend names the group; arrow keys move between options natively. */
export function RadioGroup({
  name,
  legend,
  options,
  defaultValue,
  hint,
  error,
  required,
  className,
}: RadioGroupProps) {
  const id = useId();
  const described =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset aria-describedby={described} className={cx("flex flex-col gap-1", className)}>
      <legend className="text-ink mb-1 font-sans text-sm font-semibold">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="type-body-sm text-ink-muted">
          {hint}
        </p>
      )}
      {options.map((option) => (
        <label key={option.value} className={rowClasses}>
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={option.value === defaultValue}
            disabled={option.disabled}
            required={required}
            className={inputClasses}
          />
          {option.label}
        </label>
      ))}
      {error && (
        <p id={`${id}-error`} className="type-body-sm text-danger-ink">
          {error}
        </p>
      )}
    </fieldset>
  );
}
