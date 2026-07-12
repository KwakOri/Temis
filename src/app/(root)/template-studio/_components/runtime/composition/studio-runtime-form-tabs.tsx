import React from "react";

import { cn } from "@/lib/utils";
import { studioRuntimeFocusRingClass } from "../ui/studio-runtime-ui";

export interface StudioRuntimeFormTab<T extends string> {
  id: T;
  label: React.ReactNode;
  disabled?: boolean;
}

interface StudioRuntimeFormTabsProps<T extends string> {
  ariaLabel: string;
  tabs: StudioRuntimeFormTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
}

export function StudioRuntimeFormTabs<T extends string>({
  ariaLabel,
  tabs,
  value,
  onValueChange,
}: StudioRuntimeFormTabsProps<T>) {
  return (
    <div
      aria-label={ariaLabel}
      className="grid border-b border-[var(--runtime-border)] bg-[var(--runtime-card-bg)]"
      role="tablist"
      style={{
        gridTemplateColumns: `repeat(${Math.max(1, tabs.length)}, minmax(0, 1fr))`,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            aria-selected={selected}
            className={cn(
              "relative h-12 px-3 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-[var(--runtime-disabled-opacity)]",
              selected
                ? "text-[var(--runtime-primary)] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--runtime-primary)]"
                : "text-[var(--runtime-fg-muted)] hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)]",
              studioRuntimeFocusRingClass,
            )}
            disabled={tab.disabled}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => onValueChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
