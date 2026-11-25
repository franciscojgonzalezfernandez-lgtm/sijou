"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cx } from "./cx";

export type ToastTone = "info" | "success" | "error";
type Toast = { id: number; message: string; tone: ToastTone };

const MIN_VISIBLE_MS = 6000;

const ToastContext = createContext<(message: string, tone?: ToastTone) => void>(() => {});

/** Shows a toast from any client component under `<ToastRegion>`. */
export function useToast() {
  return useContext(ToastContext);
}

/**
 * Live regions that exist from the first render, so screen readers announce what is added:
 * `role="status"` for information, `role="alert"` for errors. A toast stays at least 6 s and never
 * disappears while it has focus or the pointer over it (WCAG 2.2.1).
 */
export function ToastRegion({ closeLabel, children }: { closeLabel: string; children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    next.current += 1;
    const id = next.current;
    setToasts((all) => [...all, { id, message, tone }]);
  }, []);
  const dismiss = useCallback(
    (id: number) => setToasts((all) => all.filter((t) => t.id !== id)),
    [],
  );

  const stack = (tones: ToastTone[]) =>
    toasts
      .filter((t) => tones.includes(t.tone))
      .map((t) => <ToastItem key={t.id} toast={t} closeLabel={closeLabel} onDismiss={dismiss} />);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-4 sm:items-end">
        <div role="status" className="flex w-full flex-col items-center gap-2 sm:items-end">
          {stack(["info", "success"])}
        </div>
        <div role="alert" className="flex w-full flex-col items-center gap-2 sm:items-end">
          {stack(["error"])}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  closeLabel,
  onDismiss,
}: {
  toast: Toast;
  closeLabel: string;
  onDismiss: (id: number) => void;
}) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [held, onDismiss, toast.id]);

  return (
    // The handlers only pause the dismiss timer (WCAG 2.2.1); the close button is the interaction.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className={cx(
        "bg-raised shadow-overlay pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border p-4",
        "transition duration-(--duration-base) starting:translate-y-2 starting:opacity-0",
        toast.tone === "error"
          ? "border-danger-ink"
          : toast.tone === "success"
            ? "border-success-ink"
            : "border-line",
      )}
    >
      <p className="type-body-sm text-ink flex-1">{toast.message}</p>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={() => onDismiss(toast.id)}
        className="text-ink hover:bg-subtle -m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md"
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
  );
}
