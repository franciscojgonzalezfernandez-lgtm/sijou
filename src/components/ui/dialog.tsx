"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { buttonClasses, type ButtonVariant } from "./button";
import { cx } from "./cx";

export type DialogProps = {
  /** Text of the button that opens the dialog. */
  triggerLabel: string;
  triggerVariant?: ButtonVariant;
  title: string;
  /** Accessible name of the close button, e.g. "Cerrar". */
  closeLabel: string;
  children: ReactNode;
  /** Optional footer actions (e.g. a confirm button). Any `[data-close]` element closes the dialog. */
  actions?: ReactNode;
};

/**
 * Modal dialog on the native `<dialog>` + `showModal()`: the browser traps focus, makes the page
 * inert and closes on Esc. Focus goes back to the trigger on close (CA-3).
 */
export function Dialog({
  triggerLabel,
  triggerVariant = "secondary",
  title,
  closeLabel,
  children,
  actions,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => trigger.current?.focus();
    // Click on the backdrop (outside the panel) closes, like Esc.
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target === dialog || target.closest("[data-close]")) dialog.close();
    };
    dialog.addEventListener("close", onClose);
    dialog.addEventListener("click", onClick);
    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        className={buttonClasses(triggerVariant)}
        onClick={() => ref.current?.showModal()}
      >
        {triggerLabel}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className={cx(
          "bg-raised text-ink shadow-overlay m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] rounded-lg p-0",
          "backdrop:bg-[rgb(52_45_34/0.45)] forced-colors:border",
          "opacity-0 transition-[opacity,display,overlay] transition-discrete duration-(--duration-base) open:opacity-100 starting:open:opacity-0",
        )}
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="type-subtitle text-brand">
              {title}
            </h2>
            <button
              type="button"
              data-close
              aria-label={closeLabel}
              className="text-ink hover:bg-subtle -mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md"
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none">
                <path
                  d="m3.5 3.5 9 9m0-9-9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="type-body text-ink">{children}</div>
          {actions && <div className="flex flex-wrap justify-end gap-3">{actions}</div>}
        </div>
      </dialog>
    </>
  );
}
