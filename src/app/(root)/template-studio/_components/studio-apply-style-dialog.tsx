"use client";

import { Paintbrush, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { StudioTimetableStatusId } from "@/types/template-studio";
import type { StudioVariantStyleScope } from "@/utils/template-studio/variant-style-propagation";

interface StudioApplyStyleDialogProps {
  open: boolean;
  sourceStatusId: StudioTimetableStatusId;
  statuses: Array<{ id: StudioTimetableStatusId; label: string }>;
  onApply: (options: {
    targetStatusIds: StudioTimetableStatusId[];
    scope: StudioVariantStyleScope;
    includeDescendants: boolean;
    applyToAllMultiSlots: boolean;
  }) => void;
  onClose: () => void;
}

const styleScopes: Array<{
  id: StudioVariantStyleScope;
  label: string;
  description: string;
}> = [
  {
    id: "visual",
    label: "Appearance & Typography",
    description: "Color, opacity, border, and text styling",
  },
  {
    id: "layout",
    label: "Position & Size",
    description: "Geometry and layout properties",
  },
  {
    id: "typography",
    label: "Typography only",
    description: "Font, alignment, and spacing",
  },
  {
    id: "appearance",
    label: "Appearance only",
    description: "Color, border, radius, and opacity",
  },
  {
    id: "all",
    label: "All Styles",
    description: "Every authored style property",
  },
];

export function StudioApplyStyleDialog({
  open,
  sourceStatusId,
  statuses,
  onApply,
  onClose,
}: StudioApplyStyleDialogProps) {
  const targetStatuses = statuses.filter(
    (status) => status.id !== sourceStatusId,
  );
  const [targetStatusIds, setTargetStatusIds] = useState<
    StudioTimetableStatusId[]
  >(() => targetStatuses.map((status) => status.id));
  const [scope, setScope] = useState<StudioVariantStyleScope>("visual");
  const [includeDescendants, setIncludeDescendants] = useState(false);
  const [applyToAllMultiSlots, setApplyToAllMultiSlots] = useState(true);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="studio-apply-style-title"
        aria-modal="true"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sel)] text-[var(--accent)]">
            <Paintbrush size={15} />
          </span>
          <div>
            <h2
              className="text-sm font-bold text-[var(--fg)]"
              id="studio-apply-style-title"
            >
              Apply style to other statuses
            </h2>
            <p className="text-[10px] font-semibold text-[var(--fg3)]">
              Source: {sourceStatusId}
            </p>
          </div>
          <button
            aria-label="Close style propagation"
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
              {targetStatuses.map((status) => {
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

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
              Style scope
            </legend>
            {styleScopes.map((option) => (
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2",
                  scope === option.id
                    ? "border-[var(--accent)] bg-[var(--sel)]"
                    : "border-[var(--field-border)] bg-[var(--field)]",
                )}
                key={option.id}
              >
                <input
                  checked={scope === option.id}
                  className="mt-0.5 accent-[var(--accent)]"
                  name="studio-style-scope"
                  type="radio"
                  onChange={() => setScope(option.id)}
                />
                <span className="grid gap-0.5">
                  <span className="text-xs font-bold text-[var(--fg)]">
                    {option.label}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--fg3)]">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--field)]/40 p-3">
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--fg2)]">
              Include descendants
              <input
                checked={includeDescendants}
                className="accent-[var(--accent)]"
                type="checkbox"
                onChange={(event) =>
                  setIncludeDescendants(event.currentTarget.checked)
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--fg2)]">
              Apply visual style to both Multi entries
              <input
                checked={applyToAllMultiSlots}
                className="accent-[var(--accent)]"
                disabled={scope === "layout"}
                type="checkbox"
                onChange={(event) =>
                  setApplyToAllMultiSlots(event.currentTarget.checked)
                }
              />
            </label>
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
            onClick={() =>
              onApply({
                targetStatusIds,
                scope,
                includeDescendants,
                applyToAllMultiSlots,
              })
            }
          >
            Apply
          </button>
        </footer>
      </section>
    </div>
  );
}
