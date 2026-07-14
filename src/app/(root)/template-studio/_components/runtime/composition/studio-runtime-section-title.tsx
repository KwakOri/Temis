import React from "react";

import { cn } from "@/lib/utils";

interface StudioRuntimeSectionTitleProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function StudioRuntimeSectionTitle({
  title,
  description,
  action,
  className,
}: StudioRuntimeSectionTitleProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="pl-1 text-lg font-bold text-[var(--runtime-fg)]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[var(--runtime-fg-subtle)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
