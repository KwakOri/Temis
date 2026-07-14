import React from "react";

import { StudioRuntimeCard } from "../ui/studio-runtime-card";
import { StudioRuntimeToggle } from "../ui/studio-runtime-toggle";

interface StudioRuntimeDayCardProps {
  dayId: string;
  label: React.ReactNode;
  online: boolean;
  memoEnabled: boolean;
  memoAvailable: boolean;
  multi: boolean;
  onlineAriaLabel: string;
  multiLabel: string;
  memoLabel: string;
  memoDescription: string;
  memoToggleTitle: string;
  memoUnavailableTitle: string;
  settings?: React.ReactNode;
  children: React.ReactNode;
  offlineContent?: React.ReactNode;
  onOnlineChange: (online: boolean) => void;
  onMemoEnabledChange: (enabled: boolean) => void;
}

export function StudioRuntimeDayCard({
  dayId,
  label,
  online,
  memoEnabled,
  memoAvailable,
  multi,
  onlineAriaLabel,
  multiLabel,
  memoLabel,
  memoDescription,
  memoToggleTitle,
  memoUnavailableTitle,
  settings,
  children,
  offlineContent,
  onOnlineChange,
  onMemoEnabledChange,
}: StudioRuntimeDayCardProps) {
  return (
    <StudioRuntimeCard
      aria-labelledby={`runtime-day-${dayId}`}
      className="grid gap-0 border-2 px-3 py-0"
      density="compact"
    >
      <header className="flex h-12 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3
            className="truncate pl-1 text-base font-semibold tracking-[-1px] text-[var(--runtime-fg)]"
            id={`runtime-day-${dayId}`}
          >
            {label}
          </h3>
          {online && multi ? (
            <span className="rounded-lg bg-[var(--runtime-primary-soft)] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--runtime-primary-hover)]">
              {multiLabel}
            </span>
          ) : null}
        </div>
        <StudioRuntimeToggle
          ariaLabel={onlineAriaLabel}
          checked={online}
          onCheckedChange={onOnlineChange}
        />
      </header>

      {settings ? <div className="grid gap-3">{settings}</div> : null}

      {online ? (
        <div className="grid gap-3 pb-3.5">{children}</div>
      ) : (
        <div className="grid gap-3 pb-3.5">
          {memoAvailable ? (
            <div className="rounded-2xl border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-3 py-2.5">
              <StudioRuntimeToggle
                ariaLabel={`${String(label)} ${memoLabel}`}
                checked={memoEnabled}
                description={memoDescription}
                label={memoLabel}
                title={memoToggleTitle}
                onCheckedChange={onMemoEnabledChange}
              />
            </div>
          ) : null}
          {memoEnabled ? offlineContent : null}
        </div>
      )}
    </StudioRuntimeCard>
  );
}
