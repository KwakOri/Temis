"use client";

import { useMemo, useState } from "react";

import { ConsumerTemplateCard } from "@/components/templates/consumer-template-card";
import type { UserTemplate } from "@/services/userService";
import type { ConsumerTemplateKind } from "@/utils/templates/consumer-template";

type TemplateFilter = "all" | ConsumerTemplateKind;
type TemplateSectionSource = "purchase" | "artist";

interface UserTemplateSectionProps {
  title: string;
  source: TemplateSectionSource;
  templates: UserTemplate[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onRetry: () => void;
}

const filters: Array<{ value: TemplateFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "timetable", label: "시간표" },
  { value: "thumbnail", label: "썸네일" },
];

const emptyMessage = (source: TemplateSectionSource) =>
  source === "artist"
    ? "아직 연결된 작가 작업물이 없습니다."
    : "아직 구매하거나 이용 권한을 받은 템플릿이 없습니다.";

function TemplateGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-label="템플릿을 불러오는 중"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border border-tertiary bg-timetable-card-bg"
        >
          <div className="aspect-video animate-pulse bg-timetable-input-bg" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-2/3 animate-pulse rounded bg-tertiary" />
            <div className="h-4 w-full animate-pulse rounded bg-tertiary/70" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-tertiary/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UserTemplateSection({
  title,
  source,
  templates,
  isLoading,
  isFetching,
  error,
  onRetry,
}: UserTemplateSectionProps) {
  const [filter, setFilter] = useState<TemplateFilter>("all");
  const filteredTemplates = useMemo(
    () =>
      filter === "all"
        ? templates
        : templates.filter((template) => template.consumer.kind === filter),
    [filter, templates],
  );

  return (
    <section className="mb-8" aria-labelledby={`${source}-template-heading`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2
            id={`${source}-template-heading`}
            className="text-lg font-semibold text-dark-gray md:text-xl"
          >
            {title}
          </h2>
          {isFetching && !isLoading ? (
            <span className="text-xs text-dark-gray/60" role="status">
              새로고침 중…
            </span>
          ) : null}
        </div>

        <div
          className="flex max-w-full flex-wrap gap-2"
          aria-label={`${title} 종류 필터`}
          role="group"
        >
          {filters.map((item) => {
            const selected = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-tertiary bg-timetable-card-bg text-dark-gray hover:border-primary/50"
                }`}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? <TemplateGridSkeleton /> : null}

      {!isLoading && error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center"
          role="alert"
        >
          <p className="text-sm font-medium text-red-800">
            {error.message || "템플릿 목록을 불러오지 못했습니다."}
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={onRetry}
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {!isLoading && !error && templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-tertiary px-4 py-12 text-center md:py-20">
          <h3 className="text-base font-medium text-dark-gray md:text-lg">
            템플릿이 없습니다
          </h3>
          <p className="mt-2 text-sm text-dark-gray/60 md:text-base">
            {emptyMessage(source)}
          </p>
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      templates.length > 0 &&
      filteredTemplates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-tertiary px-4 py-12 text-center">
          <h3 className="text-base font-medium text-dark-gray">
            선택한 종류의 템플릿이 없습니다
          </h3>
          <p className="mt-2 text-sm text-dark-gray/60">
            전체 또는 다른 종류 필터를 선택해 보세요.
          </p>
        </div>
      ) : null}

      {!isLoading && !error && filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((template) => (
            <ConsumerTemplateCard
              key={`${template.consumer.id}-${template.id}`}
              template={template.consumer}
              state={source === "purchase" ? "purchased" : "available"}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
