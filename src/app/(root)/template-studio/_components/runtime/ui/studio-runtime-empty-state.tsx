import React from "react";

import { cn } from "@/lib/utils";

interface StudioRuntimeEmptyStateProps {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function StudioRuntimeEmptyState({
  children,
  className,
  compact = false,
}: StudioRuntimeEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[var(--runtime-border-strong)] bg-[var(--runtime-card-bg)] text-center text-xs font-semibold text-[var(--runtime-fg-subtle)]",
        compact ? "px-3 py-3" : "px-3 py-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
