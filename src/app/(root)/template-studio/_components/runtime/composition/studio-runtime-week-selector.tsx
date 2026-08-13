import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";

import { StudioRuntimeActionButton } from "../ui/studio-runtime-action-button";
import { StudioRuntimeCard } from "../ui/studio-runtime-card";

interface StudioRuntimeWeekSelectorProps {
  label: string;
  value: string;
  previousLabel: string;
  nextLabel: string;
  disabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function StudioRuntimeWeekSelector({
  label,
  value,
  previousLabel,
  nextLabel,
  disabled = false,
  onPrevious,
  onNext,
}: StudioRuntimeWeekSelectorProps) {
  return (
    <StudioRuntimeCard className="flex h-12 items-center gap-2 border-2 px-3 py-0">
      <span className="mr-auto shrink-0 text-sm font-bold text-[var(--runtime-fg)]">
        {label}
      </span>
      <StudioRuntimeActionButton
        aria-label={previousLabel}
        className="size-8"
        disabled={disabled}
        size="icon"
        title={previousLabel}
        variant="ghost"
        onClick={onPrevious}
      >
        <ChevronLeft size={18} />
      </StudioRuntimeActionButton>
      <span className="min-w-0 max-w-[180px] flex-1 truncate text-center text-xs font-extrabold text-[var(--runtime-fg)]">
        {value}
      </span>
      <StudioRuntimeActionButton
        aria-label={nextLabel}
        className="size-8"
        disabled={disabled}
        size="icon"
        title={nextLabel}
        variant="ghost"
        onClick={onNext}
      >
        <ChevronRight size={18} />
      </StudioRuntimeActionButton>
    </StudioRuntimeCard>
  );
}
