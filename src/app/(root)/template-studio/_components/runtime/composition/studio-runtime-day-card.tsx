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
  settings,
  children,
  offlineContent,
  onOnlineChange,
  onMemoEnabledChange,
}: StudioRuntimeDayCardProps) {
  return (
    <StudioRuntimeCard
      aria-labelledby={`runtime-day-${dayId}`}
      className="grid gap-4"
      density="default"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3
            className="truncate text-sm font-extrabold text-[var(--runtime-fg)]"
            id={`runtime-day-${dayId}`}
          >
            {label}
          </h3>
          {online && multi ? (
            <span className="rounded-lg bg-[var(--runtime-primary-soft)] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[var(--runtime-primary-hover)]">
              Multi
            </span>
          ) : null}
        </div>
        <StudioRuntimeToggle
          ariaLabel={`${String(label)} online`}
          checked={online}
          label={online ? "Online" : "Offline"}
          onCheckedChange={onOnlineChange}
        />
      </header>

      {settings ? <div className="grid gap-3">{settings}</div> : null}

      {online ? (
        <div className="grid gap-3">{children}</div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-2xl border border-[var(--runtime-border)] bg-[var(--runtime-input-bg)] px-3 py-2.5">
            <StudioRuntimeToggle
              ariaLabel={`${String(label)} offline memo`}
              checked={memoEnabled}
              description="Use the offline memo card"
              disabled={!memoAvailable}
              label="Memo"
              title={
                memoAvailable
                  ? "Toggle offline memo"
                  : "Offline Memo is disabled for this template"
              }
              onCheckedChange={onMemoEnabledChange}
            />
          </div>
          {memoEnabled ? offlineContent : null}
        </div>
      )}
    </StudioRuntimeCard>
  );
}
