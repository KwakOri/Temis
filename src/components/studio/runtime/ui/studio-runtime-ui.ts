import { cva } from "class-variance-authority";

export const studioRuntimeFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--runtime-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--runtime-form-bg)]";

export const studioRuntimeControlVariants = cva(
  [
    "w-full border bg-[var(--runtime-input-bg)] text-[var(--runtime-fg)]",
    "transition placeholder:text-[var(--runtime-fg-subtle)]",
    "hover:bg-[var(--runtime-input-hover)]",
    "disabled:cursor-not-allowed disabled:opacity-[var(--runtime-disabled-opacity)]",
    studioRuntimeFocusRingClass,
  ].join(" "),
  {
    variants: {
      size: {
        compact: "h-10 rounded-lg px-3 text-sm",
        default: "min-h-10 rounded-xl px-3 py-2.5 text-sm",
      },
      state: {
        default: "border-transparent",
        error: "border-[var(--runtime-danger)]",
      },
    },
    defaultVariants: { size: "compact", state: "default" },
  },
);

export const studioRuntimeLabelClass =
  "text-[11px] font-bold text-[var(--runtime-fg-muted)]";

export const studioRuntimeDescriptionClass =
  "text-[11px] font-medium leading-snug text-[var(--runtime-fg-subtle)]";
