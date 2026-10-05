"use client";

import { cva } from "class-variance-authority";
import { Check, Menu } from "lucide-react";
import React, { useEffect, useId, useRef, useState } from "react";

import type { StudioPanelTab } from "./studio-left-sidebar";

const menuButtonVariants = cva(
  "flex h-[34px] w-8 items-center justify-center rounded-t-lg transition focus-visible:outline-2 focus-visible:outline-[var(--accent)]",
  {
    variants: {
      active: {
        true: "bg-[var(--field)] text-[var(--fg)]",
        false: "text-[var(--fg2)] hover:bg-[var(--hover)]",
      },
    },
  },
);

export function StudioPanelMenu({
  items,
  activePanelId,
  onSelect,
}: {
  items: StudioPanelTab[];
  activePanelId: string;
  onSelect: (panelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isActive = items.some((item) => item.id === activePanelId);

  useEffect(() => {
    if (!open) return;
    rootRef.current
      ?.querySelector<HTMLButtonElement>(
        '[role="menuitemradio"]:not(:disabled)',
      )
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape, true);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        aria-label="More panels"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={menuButtonVariants({ active: isActive || open })}
        title="More panels"
        type="button"
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Menu aria-hidden="true" size={16} />
      </button>
      {open ? (
        <div
          aria-label="More panels"
          className="absolute right-0 top-full z-50 mt-1 grid w-44 gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 shadow-lg"
          id={menuId}
          role="menu"
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]:not(:disabled)',
              ),
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
          }}
        >
          {items.map((item) => (
            <button
              aria-checked={item.id === activePanelId}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold text-[var(--fg)] outline-none hover:bg-[var(--hover)] focus:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={item.disabled}
              key={item.id}
              role="menuitemradio"
              type="button"
              onClick={() => {
                onSelect(item.id);
                setOpen(false);
                buttonRef.current?.focus();
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.id === activePanelId ? (
                <Check aria-hidden="true" size={14} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
