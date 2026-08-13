import React from "react";

import { cn } from "@/lib/utils";
import { StudioRuntimeCard } from "../ui/studio-runtime-card";
import { StudioRuntimeToggle } from "../ui/studio-runtime-toggle";

interface StudioRuntimeGlobalInputCardProps {
  label: React.ReactNode;
  enabled?: boolean;
  toggleAriaLabel?: string;
  children?: React.ReactNode;
  onEnabledChange?: (enabled: boolean) => void;
}

export function StudioRuntimeGlobalInputCard({
  label,
  enabled,
  toggleAriaLabel,
  children,
  onEnabledChange,
}: StudioRuntimeGlobalInputCardProps) {
  const hasToggle =
    enabled !== undefined &&
    Boolean(toggleAriaLabel) &&
    Boolean(onEnabledChange);
  const hasContent = React.Children.count(children) > 0;
  const showContent = !hasToggle || enabled;

  return (
    <StudioRuntimeCard className="grid gap-0 border-2 px-3 py-0">
      <header className="flex h-12 items-center justify-between gap-4">
        <h3 className="min-w-0 truncate pl-1 text-base font-semibold tracking-[-1px] text-[var(--runtime-fg)]">
          {label}
        </h3>
        {hasToggle ? (
          <StudioRuntimeToggle
            ariaLabel={toggleAriaLabel ?? String(label)}
            checked={Boolean(enabled)}
            onCheckedChange={onEnabledChange ?? (() => undefined)}
          />
        ) : null}
      </header>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          showContent && hasContent ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="grid gap-3 pb-3.5">{children}</div>
        </div>
      </div>
    </StudioRuntimeCard>
  );
}
