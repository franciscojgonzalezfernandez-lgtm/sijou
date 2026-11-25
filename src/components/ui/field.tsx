import type { ReactNode } from "react";

import { cx } from "./cx";

/** Shared look of text inputs and selects: 16px text so iOS does not zoom, 44px tall. */
export const controlClasses = cx(
  "block w-full min-h-11 rounded-sm border border-control bg-raised px-3 py-2",
  "font-sans text-base text-ink placeholder:text-ink-muted",
  "aria-invalid:border-danger-ink aria-invalid:border-2",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-ink-muted",
);

export type FieldShellProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Shown after the label when required, e.g. "(obligatorio)". Passed in, already translated. */
  requiredLabel?: string;
  children: ReactNode;
};

/** Ids of the hint and error, for the control's aria-describedby. */
export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/** Label, hint and error around a control. The error is text with an icon, never colour alone. */
export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  requiredLabel,
  children,
}: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-ink font-sans text-sm font-semibold">
        {label}
        {required && requiredLabel && (
          <span className="text-ink-muted font-normal"> {requiredLabel}</span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="type-body-sm text-ink-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="type-body-sm text-danger-ink flex items-start gap-1.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="mt-0.5 size-4 shrink-0"
            fill="none"
          >
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 4.5v4M8 10.75v.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
