import React from "react";

import { cn } from "@/lib/utils";
import { studioRuntimeFocusRingClass } from "./studio-runtime-ui";

export interface StudioRuntimeSegmentOption<T extends string> {
  id: T;
  label: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

interface StudioRuntimeSegmentedControlProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: StudioRuntimeSegmentOption<T>[];
  columns?: number;
  size?: "compact" | "default";
  className?: string;
  onValueChange: (value: T) => void;
}

export function StudioRuntimeSegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  columns = options.length,
  size = "default",
  className,
  onValueChange,
}: StudioRuntimeSegmentedControlProps<T>) {
  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "grid gap-1 rounded-xl border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] p-1",
        className,
      )}
      role="group"
      style={{ gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            className={cn(
              "min-w-0 rounded-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-[var(--runtime-disabled-opacity)]",
              size === "compact"
                ? "h-8 px-2 text-[11px]"
                : "h-9 px-2.5 text-xs",
              selected
                ? "bg-[var(--runtime-primary)] text-white shadow-[var(--runtime-shadow-card)]"
                : "text-[var(--runtime-fg-muted)] hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)]",
              studioRuntimeFocusRingClass,
            )}
            disabled={option.disabled}
            key={option.id}
            type="button"
            onClick={() => onValueChange(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
