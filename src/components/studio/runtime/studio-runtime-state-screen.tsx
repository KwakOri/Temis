import React from "react";
import Link from "next/link";

import { StudioRuntimeActionButton } from "./ui/studio-runtime-action-button";

interface StudioRuntimeStateScreenProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  backHref?: string;
}

export function StudioRuntimeStateScreen({
  title,
  message,
  actionLabel,
  onAction,
  backHref,
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
        {backHref ? (
          <Link
            href={backHref}
            className="mx-auto text-xs font-bold text-[var(--runtime-fg-muted)] underline-offset-4 hover:text-[var(--runtime-fg)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
          >
            마이페이지로 돌아가기
          </Link>
        ) : null}
      </div>
    </main>
  );
}
