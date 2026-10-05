"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";

export function StudioFormatModal({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
  }, [open]);
  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <>
      <div className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
        <span>{title}</span>
        <button
          aria-label={`Edit ${title}`}
          aria-haspopup="dialog"
          className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs text-[var(--fg)] outline-none hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          ref={triggerRef}
          type="button"
          onClick={() => {
            setSession((current) => current + 1);
            setOpen(true);
          }}
        >
          <span className="min-w-0 flex-1 truncate text-left">{summary}</span>
          <ChevronRight size={14} />
        </button>
      </div>
      <dialog
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-0 text-[var(--fg)] shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            close();
        }}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-sm font-bold" id={titleId}>
              {title}
            </h2>
            <button
              aria-label="Close format editor"
              className="rounded-lg p-2 text-[var(--fg2)] hover:bg-[var(--hover)]"
              type="button"
              onClick={close}
            >
              <X size={16} />
            </button>
          </header>
          <React.Fragment key={session}>{children(close)}</React.Fragment>
        </div>
      </dialog>
    </>
  );
}

export function StudioFormatActions({
  onCancel,
  onApply,
}: {
  onCancel: () => void;
  onApply: () => void;
}) {
  return (
    <footer className="flex shrink-0 justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
      <button
        className="h-9 rounded-lg border border-[var(--field-border)] px-4 text-xs font-semibold hover:bg-[var(--hover)]"
        type="button"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        className="h-9 rounded-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white"
        type="button"
        onClick={onApply}
      >
        Apply
      </button>
    </footer>
  );
}
