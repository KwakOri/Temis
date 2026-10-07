import { cn } from "@/lib/utils";
import type {
  TemplateEngine,
  TemplatePublicationStatus,
  TemplateSaleStatus,
  TemplateCategory,
} from "@/types/template-hub";
import { Search, X } from "lucide-react";
import { cva } from "class-variance-authority";

export type TemplateHubFilterState = {
  search: string;
  engine?: TemplateEngine;
  publicationStatus?: TemplatePublicationStatus;
  category?: TemplateCategory;
  saleStatus?: TemplateSaleStatus;
  hasProduct?: boolean;
};

export const DEFAULT_FILTERS: TemplateHubFilterState = {
  search: "",
  engine: "studio",
};

const engineButton = cva(
  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
  {
    variants: {
      active: {
        true: "bg-primary text-white shadow-sm",
        false: "text-gray-600 hover:bg-white",
      },
    },
  },
);

const selectClass =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none";

/** `<select>`의 문자열 값과 optional 필터 사이를 오가는 sentinel. */
const ALL = "__all__";

const toOptional = <T extends string>(value: string): T | undefined =>
  value === ALL ? undefined : (value as T);

type FilterSelectProps<T extends string> = {
  label: string;
  value: T | undefined;
  options: Array<{ value: T; label: string; count?: number }>;
  onChange: (value: T | undefined) => void;
};

const FilterSelect = <T extends string>({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps<T>) => (
  <label className="flex items-center gap-1.5 text-xs text-gray-500">
    <span className="whitespace-nowrap">{label}</span>
    <select
      aria-label={label}
      className={selectClass}
      value={value ?? ALL}
      onChange={(event) => onChange(toOptional<T>(event.target.value))}
    >
      <option value={ALL}>전체</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
          {option.count === undefined ? "" : ` (${option.count})`}
        </option>
      ))}
    </select>
  </label>
);

export const TemplateHubFilters = ({
  filters,
  searchInput,
  onSearchInputChange,
  onChange,
  onReset,
}: {
  filters: TemplateHubFilterState;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (next: TemplateHubFilterState) => void;
  onReset: () => void;
}) => {
  const patch = (partial: Partial<TemplateHubFilterState>) =>
    onChange({ ...filters, ...partial });

  const hasActiveFilter =
    searchInput.length > 0 ||
    filters.engine !== DEFAULT_FILTERS.engine ||
    filters.publicationStatus !== undefined ||
    filters.category !== undefined ||
    filters.saleStatus !== undefined ||
    filters.hasProduct !== undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          aria-label="템플릿 종류"
          role="group"
          className="flex w-fit flex-wrap gap-1 rounded-xl bg-gray-100 p-1"
        >
          {(
            [
              { value: "timetable", label: "시간표" },
              { value: "thumbnail", label: "썸네일" },
              { value: "team-timetable", label: "팀 시간표" },
              { value: undefined, label: "전체" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={filters.category === value}
              className={engineButton({ active: filters.category === value })}
              onClick={() => patch({ category: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          aria-label="템플릿 버전"
          role="group"
          className="ml-auto flex w-fit flex-wrap gap-1 rounded-xl bg-gray-100 p-1"
        >
          {(
            [
              { value: "studio", label: "스튜디오" },
              { value: "legacy", label: "레거시" },
              { value: undefined, label: "전체" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={filters.engine === value}
              className={engineButton({ active: filters.engine === value })}
              onClick={() => patch({ engine: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-9 text-sm focus:border-gray-400 focus:outline-none"
          aria-label="템플릿 검색"
          placeholder="판매할 템플릿 이름 또는 설명 검색"
          type="search"
          value={searchInput}
          onChange={(event) => onSearchInputChange(event.target.value)}
        />
        {searchInput.length > 0 && (
          <button
            aria-label="검색어 지우기"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            type="button"
            onClick={() => onSearchInputChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterSelect<TemplateSaleStatus>
          label="판매 상태"
          options={[
            { value: "selling", label: "판매 중" },
            { value: "ready", label: "판매 준비 완료" },
            { value: "blocked", label: "준비 필요" },
            { value: "unconfigured", label: "상품 미등록" },
          ]}
          value={filters.saleStatus}
          onChange={(saleStatus) => patch({ saleStatus })}
        />
        <FilterSelect<"configured" | "unconfigured">
          label="상품 등록"
          options={[
            { value: "configured", label: "등록됨" },
            { value: "unconfigured", label: "미등록" },
          ]}
          value={
            filters.hasProduct === undefined
              ? undefined
              : filters.hasProduct
                ? "configured"
                : "unconfigured"
          }
          onChange={(value) =>
            patch({
              hasProduct:
                value === undefined ? undefined : value === "configured",
            })
          }
        />
        <FilterSelect<TemplatePublicationStatus>
          label="게시 상태"
          options={[
            { value: "draft", label: "초안" },
            { value: "published", label: "게시됨" },
            { value: "archived", label: "보관됨" },
          ]}
          value={filters.publicationStatus}
          onChange={(publicationStatus) => patch({ publicationStatus })}
        />

        <button
          className={cn(
            "ml-auto rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            hasActiveFilter
              ? "text-gray-600 hover:bg-gray-100"
              : "pointer-events-none text-gray-300",
          )}
          type="button"
          disabled={!hasActiveFilter}
          onClick={onReset}
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
};
