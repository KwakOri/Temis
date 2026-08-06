import React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import type { ConsumerTemplateSummary } from "@/utils/templates/consumer-template";

import { TemplateCover } from "./template-cover";
import { TemplateKindBadge } from "./template-kind-badge";

const consumerTemplateCardVariants = cva(
  "group block overflow-hidden rounded-lg border transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      surface: {
        myPage: "border-tertiary bg-timetable-card-bg hover:shadow-md",
        shop: "border-timetable-card-border bg-white hover:shadow-lg",
      },
      state: {
        available: "",
        purchased: "ring-1 ring-secondary/20",
        pending: "opacity-80",
      },
    },
    defaultVariants: {
      surface: "myPage",
      state: "available",
    },
  },
);

export interface ConsumerTemplateCardProps extends VariantProps<
  typeof consumerTemplateCardVariants
> {
  template: ConsumerTemplateSummary;
  showEngineBadge?: boolean;
  showAccessSource?: boolean;
  className?: string;
}

const kindLabel = (kind: ConsumerTemplateSummary["kind"]) =>
  kind === "timetable" ? "시간표" : "썸네일";

export function ConsumerTemplateCard({
  template,
  surface = "myPage",
  state = "available",
  showEngineBadge = false,
  showAccessSource = true,
  className,
}: ConsumerTemplateCardProps) {
  const ctaLabel = `${kindLabel(template.kind)} 만들기`;
  const salesLabel = template.salesType === "general" ? "일반" : "맞춤";
  const accessLabel =
    template.accessSource === "artist" ? "작가 작업물" : "구매한 템플릿";

  return (
    <Link
      href={template.useHref}
      className={cn(
        consumerTemplateCardVariants({ surface, state }),
        className,
      )}
      aria-label={`${template.name} ${ctaLabel}`}
    >
      <TemplateCover
        src={template.coverUrl}
        alt={template.name}
        kind={template.kind}
        className="aspect-video rounded-t-lg"
      />

      <div className="space-y-3 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <TemplateKindBadge kind={template.kind} />
          {showEngineBadge && (
            <span className="inline-flex items-center rounded-full border border-dark-gray/20 px-2 py-0.5 text-xs font-medium text-dark-gray/70">
              {template.engine === "legacy" ? "Legacy" : "Studio"}
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-tertiary px-2 py-0.5 text-xs font-medium text-dark-gray/70">
            {salesLabel}
          </span>
          {showAccessSource && template.accessSource && (
            <span className="inline-flex items-center rounded-full border border-tertiary px-2 py-0.5 text-xs font-medium text-dark-gray/70">
              {accessLabel}
            </span>
          )}
          {template.plan && (
            <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
              {template.plan.toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-dark-gray md:text-lg">
            {template.name}
          </h3>
          {template.description && (
            <p className="mt-1 line-clamp-2 text-xs text-dark-gray/70 md:text-sm">
              {template.description}
            </p>
          )}
        </div>

        <span className="inline-flex text-sm font-semibold text-primary group-hover:underline">
          {ctaLabel}
          <span aria-hidden="true" className="ml-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
