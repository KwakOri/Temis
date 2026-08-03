import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/utils";

const variants = cva(
  "border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] text-[var(--runtime-fg)] transition",
  {
    variants: {
      density: { compact: "rounded-2xl p-3", default: "rounded-[28px] p-4" },
      elevation: {
        flat: "shadow-none",
        raised: "shadow-[var(--runtime-shadow-card)]",
      },
    },
    defaultVariants: { density: "compact", elevation: "raised" },
  },
);

export interface StudioRuntimeCardProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof variants> {
  as?: "section" | "div";
}

export function StudioRuntimeCard({
  as: Component = "section",
  className,
  density,
  elevation,
  ...props
}: StudioRuntimeCardProps) {
  return (
    <Component
      className={cn(variants({ density, elevation }), className)}
      {...props}
    />
  );
}
