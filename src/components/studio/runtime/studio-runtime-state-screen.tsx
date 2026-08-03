import React from "react";

import { StudioRuntimeActionButton } from "./ui/studio-runtime-action-button";

interface StudioRuntimeStateScreenProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StudioRuntimeStateScreen({
  title,
  message,
  actionLabel,
  onAction,
}: StudioRuntimeStateScreenProps) {
  return (
    <main className="studio-runtime-theme flex min-h-screen items-center justify-center bg-[var(--runtime-form-bg)] px-4 text-[var(--runtime-fg)]">
      <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] p-6 text-center shadow-[var(--runtime-shadow-card)]">
        <h1 className="text-base font-black">{title}</h1>
        {message ? (
          <p className="text-sm font-semibold text-[var(--runtime-fg-muted)]">
            {message}
          </p>
        ) : null}
        {actionLabel && onAction ? (
          <StudioRuntimeActionButton
            className="mx-auto"
            size="compact"
            variant="secondary"
            onClick={onAction}
          >
            {actionLabel}
          </StudioRuntimeActionButton>
        ) : null}
      </div>
    </main>
  );
}
