import { Minus } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";
import { StudioRuntimeActionButton } from "../ui/studio-runtime-action-button";

interface StudioRuntimeEntryCardProps {
  index: number;
  showIndex: boolean;
  removable: boolean;
  entryLabel: string;
  removeLabel: string;
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

export function StudioRuntimeEntryCard({
  index,
  showIndex,
  removable,
  entryLabel,
  removeLabel,
  children,
  className,
  onRemove,
}: StudioRuntimeEntryCardProps) {
  return (
    <section className={cn("relative grid gap-3", className)}>
      {showIndex ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-lg bg-[var(--runtime-card-bg)] text-[11px] font-extrabold text-[var(--runtime-fg-muted)]">
            {index + 1}
          </span>
          <span
            aria-label={`${entryLabel} ${index + 1}`}
            className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--runtime-fg-subtle)]"
          >
            {entryLabel}
          </span>
        </div>
      ) : null}

      <div className="grid gap-3">{children}</div>

      {removable ? (
        <StudioRuntimeActionButton
          aria-label={removeLabel}
          className="justify-self-end"
          size="icon"
          title={removeLabel}
          variant="danger"
          onClick={onRemove}
        >
          <Minus size={14} />
        </StudioRuntimeActionButton>
      ) : null}
    </section>
  );
}
