"use client";
import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal, RotateCcw, Trash2 } from "lucide-react";

interface Props {
  name: string;
  onReset: () => void;
  onRemove: () => void;
  allowReset?: boolean;
  allowRemove?: boolean;
}
export function ThumbnailImageActionsMenu({
  name,
  onReset,
  onRemove,
  allowReset = true,
  allowRemove = true,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);
  return (
    <div
      ref={menuRef}
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setMenuOpen(false);
      }}
    >
      <button
        ref={menuButton}
        type="button"
        aria-label={`${name} 레이어 메뉴`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className="flex size-8 items-center justify-center rounded-lg hover:bg-[var(--runtime-input-hover)] focus-visible:outline-2 focus-visible:outline-[var(--runtime-primary)]"
        disabled={!allowReset && !allowRemove}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {menuOpen ? (
        <div
          role="menu"
          aria-label={`${name} 레이어 작업`}
          className="absolute right-0 top-full z-20 mt-1 grid w-36 gap-1 rounded-lg border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-1 shadow-lg"
          onKeyDown={(event) => {
            if (
              event.key !== "ArrowDown" &&
              event.key !== "ArrowUp" &&
              event.key !== "Home" &&
              event.key !== "End"
            )
              return;
            event.preventDefault();
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ),
            );
            const index = items.indexOf(
              window.document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="flex items-center gap-2 rounded px-2 py-2 text-xs hover:bg-[var(--runtime-input-hover)] focus:bg-[var(--runtime-input-hover)] disabled:opacity-50"
            disabled={!allowReset}
            onClick={() => {
              onReset();
              setMenuOpen(false);
              menuButton.current?.focus();
            }}
          >
            <RotateCcw size={14} />
            재설정
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex items-center gap-2 rounded px-2 py-2 text-xs text-[var(--runtime-danger)] hover:bg-[var(--runtime-input-hover)] focus:bg-[var(--runtime-input-hover)] disabled:opacity-50"
            disabled={!allowRemove}
            onClick={() => {
              onRemove();
              setMenuOpen(false);
              menuButton.current?.focus();
            }}
          >
            <Trash2 size={14} />
            삭제
          </button>
        </div>
      ) : null}
    </div>
  );
}
