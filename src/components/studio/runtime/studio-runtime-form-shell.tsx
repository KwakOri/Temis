import React from "react";

interface StudioRuntimeFormShellProps {
  eyebrow: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  testId?: string;
}

export function StudioRuntimeFormShell({
  eyebrow,
  title,
  meta,
  children,
  footer,
  headerAction,
  testId,
}: StudioRuntimeFormShellProps) {
  return (
    <aside
      className="flex h-[44vh] min-h-[320px] w-full shrink-0 flex-col border-t border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] md:h-full md:w-[380px] md:border-l md:border-t-0"
      data-testid={testId}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--runtime-border)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--runtime-fg-muted)]">
            {eyebrow}
          </p>
          <h2 className="truncate text-sm font-black text-[var(--runtime-fg)]">
            {title}
          </h2>
          {meta ? (
            <div className="mt-1 truncate text-[10px] font-semibold text-[var(--runtime-fg-subtle)]">
              {meta}
            </div>
          ) : null}
        </div>
        {headerAction}
      </header>
      <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {children}
      </div>
      {footer ? (
        <footer className="shrink-0 border-t border-[var(--runtime-border)] bg-[var(--runtime-form-bg)] p-4">
          {footer}
        </footer>
      ) : null}
    </aside>
  );
}
