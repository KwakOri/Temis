import React from "react";

import { cn } from "@/lib/utils";
import { StudioRuntimeCard } from "../ui/studio-runtime-card";

interface StudioRuntimeSettingRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}

export function StudioRuntimeSettingRow({
  label,
  description,
  control,
  className,
}: StudioRuntimeSettingRowProps) {
  return (
    <StudioRuntimeCard
      className={cn("flex items-center justify-between gap-4", className)}
    >
      <div className="min-w-0">
        <div className="text-sm font-bold text-[var(--runtime-fg)]">
          {label}
        </div>
        {description ? (
          <div className="mt-0.5 text-[11px] font-medium text-[var(--runtime-fg-subtle)]">
            {description}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 shrink-0">{control}</div>
    </StudioRuntimeCard>
  );
}
