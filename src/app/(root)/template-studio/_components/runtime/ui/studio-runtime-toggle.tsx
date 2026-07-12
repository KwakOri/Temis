import React from "react";

import { cn } from "@/lib/utils";
import {
  studioRuntimeDescriptionClass,
  studioRuntimeFocusRingClass,
} from "./studio-runtime-ui";

interface StudioRuntimeToggleProps {
  checked: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  ariaLabel: string;
  className?: string;
  title?: string;
  onCheckedChange: (checked: boolean) => void;
}

export function StudioRuntimeToggle({
  checked,
  disabled = false,
  label,
  description,
  ariaLabel,
  className,
  title,
  onCheckedChange,
}: StudioRuntimeToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      {label || description ? (
        <div className="min-w-0">
          {label ? (
            <div className="text-xs font-bold text-[var(--runtime-fg)]">
              {label}
            </div>
          ) : null}
          {description ? (
            <div className={cn("mt-0.5", studioRuntimeDescriptionClass)}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        aria-checked={checked}
        aria-label={ariaLabel}
        className={cn(
          "relative h-7 w-16 shrink-0 rounded-full p-0.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition",
          checked ? "bg-[var(--runtime-primary)]" : "bg-[var(--runtime-fg)]",
          "disabled:cursor-not-allowed disabled:opacity-[var(--runtime-disabled-opacity)]",
          studioRuntimeFocusRingClass,
        )}
        disabled={disabled}
        role="switch"
        title={title}
        type="button"
        onClick={() => onCheckedChange(!checked)}
      >
        <span
          className={cn(
            "absolute left-1 top-1 size-5 rounded-full bg-[#ffe0bd] shadow-[0_4px_4px_rgba(0,0,0,0.25)] transition-transform",
            checked ? "translate-x-9" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
