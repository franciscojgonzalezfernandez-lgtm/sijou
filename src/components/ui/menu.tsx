"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { buttonClasses, type ButtonVariant } from "./button";
import { cx } from "./cx";

export type MenuItem = { label: string; href?: string; onSelect?: () => void };

/**
 * Menu button on the Popover API (top layer, light dismiss). Arrow keys, Home and End move between
 * items; Esc closes and returns focus to the button (CA-3).
 */
export function Menu({
  label,
  items,
  variant = "secondary",
}: {
  label: string;
  items: MenuItem[];
  variant?: ButtonVariant;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const itemsIn = () =>
    Array.from(panel.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === "open";
      setOpen(isOpen);
      if (isOpen) {
        // Place the panel under the button; the top layer ignores the parent's layout.
        const rect = button.current!.getBoundingClientRect();
        const left = Math.min(rect.left, window.innerWidth - el.offsetWidth - 8);
        el.style.top = `${rect.bottom + 4}px`;
        el.style.left = `${Math.max(8, left)}px`;
        itemsIn()[0]?.focus();
      }
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  const close = () => {
    panel.current?.hidePopover();
    button.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const all = itemsIn();
    const index = all.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(all.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") panel.current?.hidePopover();
  };

  const itemClass =
    "flex min-h-11 w-full items-center rounded-sm px-3 text-left font-sans text-base text-ink hover:bg-subtle focus-visible:bg-subtle";

  return (
    <>
      <button
        ref={button}
        type="button"
        popoverTarget={`${id}-menu`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        className={buttonClasses(variant)}
      >
        {label}
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        ref={panel}
        id={`${id}-menu`}
        popover="auto"
        role="menu"
        tabIndex={-1}
        aria-label={label}
        onKeyDown={onKeyDown}
        className={cx(
          "border-line bg-raised shadow-overlay fixed m-0 min-w-48 rounded-md border p-1",
          "opacity-0 transition-[opacity,display,overlay] transition-discrete duration-(--duration-fast) open:opacity-100 starting:open:opacity-0",
        )}
      >
        {items.map((item) =>
          item.href ? (
            <a
              key={item.label}
              role="menuitem"
              href={item.href}
              tabIndex={-1}
              className={itemClass}
            >
              {item.label}
            </a>
          ) : (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={itemClass}
              onClick={() => {
                item.onSelect?.();
                close();
              }}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </>
  );
}
