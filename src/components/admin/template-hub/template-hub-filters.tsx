import { cn } from "@/lib/utils";
import type {
  TemplateEngine,
  TemplateHubListResponse,
  TemplatePublicationStatus,
  TemplateSaleStatus,
  TemplateSalesType,
} from "@/types/template-hub";
import { Search, X } from "lucide-react";

export type TemplateHubFilterState = {
  search: string;
  engine?: TemplateEngine;
  publicationStatus?: TemplatePublicationStatus;
  salesType?: TemplateSalesType;
  saleStatus?: TemplateSaleStatus;
  hasProduct?: boolean;
};

export const EMPTY_FILTERS: TemplateHubFilterState = { search: "" };

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
  counts,
  searchInput,
  onSearchInputChange,
  onChange,
  onReset,
}: {
  filters: TemplateHubFilterState;
  counts?: TemplateHubListResponse["counts"];
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (next: TemplateHubFilterState) => void;
  onReset: () => void;
}) => {
  const patch = (partial: Partial<TemplateHubFilterState>) =>
    onChange({ ...filters, ...partial });

  const hasActiveFilter =
    searchInput.length > 0 ||
    filters.engine !== undefined ||
    filters.publicationStatus !== undefined ||
    filters.salesType !== undefined ||
    filters.saleStatus !== undefined ||
    filters.hasProduct !== undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-white p-3 shadow-sm sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-9 text-sm focus:border-gray-400 focus:outline-none"
          placeholder="템플릿 이름 또는 설명 검색"
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
        <FilterSelect<TemplateEngine>
          label="엔진"
          options={[
            { value: "legacy", label: "Legacy", count: counts?.legacy },
            { value: "studio", label: "Studio", count: counts?.studio },
          ]}
          value={filters.engine}
          onChange={(engine) => patch({ engine })}
        />
        <FilterSelect<TemplatePublicationStatus>
          label="게시"
          options={[
            { value: "draft", label: "초안" },
            { value: "published", label: "게시됨" },
            { value: "archived", label: "보관됨" },
          ]}
          value={filters.publicationStatus}
          onChange={(publicationStatus) => patch({ publicationStatus })}
        />
        <FilterSelect<TemplateSalesType>
          label="판매 유형"
          options={[
            { value: "general", label: "일반 판매", count: counts?.general },
            { value: "custom", label: "맞춤 제작", count: counts?.custom },
          ]}
          value={filters.salesType}
          onChange={(salesType) => patch({ salesType })}
        />
        <FilterSelect<"configured" | "unconfigured">
          label="상품"
          options={[
            { value: "configured", label: "구성됨" },
            { value: "unconfigured", label: "미구성" },
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
              hasProduct: value === undefined ? undefined : value === "configured",
            })
          }
        />
        <FilterSelect<TemplateSaleStatus>
          label="판매"
          options={[
            { value: "selling", label: "판매 중", count: counts?.selling },
            { value: "ready", label: "판매 준비 완료" },
            { value: "blocked", label: "판매 불가" },
            { value: "unconfigured", label: "상품 미구성" },
          ]}
          value={filters.saleStatus}
          onChange={(saleStatus) => patch({ saleStatus })}
        />

        <button
          className={cn(
            "ml-auto rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            hasActiveFilter
              ? "text-gray-600 hover:bg-gray-100"
              : "pointer-events-none text-gray-300"
          )}
          type="button"
          onClick={onReset}
        >
          필터 초기화
        </button>
      </div>
    </div>
  );
};
