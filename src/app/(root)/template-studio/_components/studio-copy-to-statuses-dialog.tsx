"use client";

import { Copy, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { StudioTimetableStatusId } from "@/types/template-studio";

interface StudioCopyToStatusesDialogProps {
  open: boolean;
  sourceStatusLabel: string;
  /** 카드 루트를 골랐는지. 골랐으면 카드 전체를 복사한다. */
  copiesWholeCard: boolean;
  layerCount: number;
  statuses: Array<{ id: StudioTimetableStatusId; label: string }>;
  onCopy: (targetStatusIds: StudioTimetableStatusId[]) => void;
  onClose: () => void;
}

export function StudioCopyToStatusesDialog({
  open,
  sourceStatusLabel,
  copiesWholeCard,
  layerCount,
  statuses,
  onCopy,
  onClose,
}: StudioCopyToStatusesDialogProps) {
  const [targetStatusIds, setTargetStatusIds] = useState<
    StudioTimetableStatusId[]
  >(() => statuses.map((status) => status.id));

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="studio-copy-to-statuses-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sel)] text-[var(--accent)]">
            <Copy size={15} />
          </span>
          <div>
            <h2
              className="text-sm font-bold text-[var(--fg)]"
              id="studio-copy-to-statuses-title"
            >
              Copy to other statuses
            </h2>
            <p className="text-[10px] font-semibold text-[var(--fg3)]">
              Source: {sourceStatusLabel} ·{" "}
              {copiesWholeCard ? "Whole card" : `${layerCount} layer(s)`}
            </p>
          </div>
          <button
            aria-label="Close status copy"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            type="button"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </header>

        <div className="grid gap-4 p-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Target statuses
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map((status) => {
                const checked = targetStatusIds.includes(status.id);
                return (
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold",
                      checked
                        ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                        : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)]",
                    )}
                    key={status.id}
                  >
                    <input
                      checked={checked}
                      className="accent-[var(--accent)]"
                      type="checkbox"
                      onChange={(event) =>
                        setTargetStatusIds((current) =>
                          event.currentTarget.checked
                            ? [...current, status.id]
                            : current.filter((id) => id !== status.id),
                        )
                      }
                    />
                    {status.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-1.5 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3 text-[11px] font-semibold leading-relaxed text-[var(--fg2)]">
            <p>
              {copiesWholeCard
                ? "Card style and every layer replace the matching layers in each target card."
                : "Selected layers replace the matching layers in each target card, including text, images, bindings, and children."}
            </p>
            <p>
              Missing layers are added in the same place. Layers that exist only
              in the target card are kept.
            </p>
            {statuses.some((status) => status.id === "multi") ? (
              <p className="text-[var(--fg3)]">
                Single layers inside an Entry Group are not copied to Multi.
                Copy the whole Entry Group to rebuild both Multi slots.
              </p>
            ) : null}
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            className="h-8 rounded-lg px-3 text-xs font-bold text-[var(--fg2)] hover:bg-[var(--hover)]"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="h-8 rounded-lg bg-[var(--accent)] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={targetStatusIds.length === 0}
            type="button"
            onClick={() => onCopy(targetStatusIds)}
          >
            Copy
          </button>
        </footer>
      </section>
    </div>
  );
}
