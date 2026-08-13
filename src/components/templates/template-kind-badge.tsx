import React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import type { ConsumerTemplateKind } from "@/utils/templates/consumer-template";

const templateKindBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      kind: {
        timetable: "border-primary/30 bg-primary/10 text-primary",
        thumbnail: "border-secondary/30 bg-secondary/10 text-secondary",
      },
    },
    defaultVariants: {
      kind: "timetable",
    },
  },
);

export interface TemplateKindBadgeProps extends VariantProps<
  typeof templateKindBadgeVariants
> {
  kind: ConsumerTemplateKind;
  className?: string;
}

export function TemplateKindBadge({ kind, className }: TemplateKindBadgeProps) {
  return (
    <span
      className={templateKindBadgeVariants({ kind, className })}
      aria-label={`템플릿 종류: ${kind === "timetable" ? "시간표" : "썸네일"}`}
    >
      {kind === "timetable" ? "시간표" : "썸네일"}
    </span>
  );
}
