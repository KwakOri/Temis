import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/utils";
import { studioRuntimeFocusRingClass } from "./studio-runtime-ui";

const studioRuntimeActionButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 font-semibold transition",
    "disabled:cursor-not-allowed disabled:opacity-[var(--runtime-disabled-opacity)]",
    studioRuntimeFocusRingClass,
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--runtime-primary)] text-white hover:bg-[var(--runtime-primary-hover)]",
        secondary:
          "border border-[var(--runtime-border)] bg-[var(--runtime-card-bg)] text-[var(--runtime-fg)] hover:border-[var(--runtime-border-strong)] hover:bg-[var(--runtime-input-hover)]",
        ghost:
          "bg-transparent text-[var(--runtime-fg-muted)] hover:bg-[var(--runtime-input-hover)] hover:text-[var(--runtime-fg)]",
        danger:
          "bg-[var(--runtime-danger)] text-white hover:bg-[var(--runtime-danger-hover)]",
      },
      size: {
        compact: "h-8 rounded-lg px-2.5 text-xs",
        default: "h-10 rounded-xl px-4 text-sm",
        icon: "size-8 rounded-lg text-xs",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
    },
  },
);

export interface StudioRuntimeActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof studioRuntimeActionButtonVariants> {}

export function StudioRuntimeActionButton({
  className,
  variant,
  size,
  fullWidth,
  type = "button",
  ...props
}: StudioRuntimeActionButtonProps) {
  return (
    <button
      className={cn(
        studioRuntimeActionButtonVariants({ variant, size, fullWidth }),
        className,
      )}
      type={type}
      {...props}
    />
  );
}
