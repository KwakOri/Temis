"use client";

import AdminTabHeader from "@/components/admin/AdminTabHeader";
import {
  DEFAULT_FILTERS,
  TemplateHubFilters,
  type TemplateHubFilterState,
} from "@/components/admin/template-hub/template-hub-filters";
import { TemplateHubList } from "@/components/admin/template-hub/template-hub-list";
import { TemplateHubPagination } from "@/components/admin/template-hub/template-hub-pagination";
import { TemplateHubRowActions } from "@/components/admin/template-hub/template-hub-row-actions";
import { useTemplateHubTemplates } from "@/hooks/query/useTemplateHub";
import { cn } from "@/lib/utils";
import type { TemplateHubListParams } from "@/types/template-hub";
import { ShoppingBag, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function TemplateHubClient() {
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] =
    useState<TemplateHubFilterState>(DEFAULT_FILTERS);
  const [offset, setOffset] = useState(0);

  // 검색어는 debounce해 서버 요청 수를 줄이고, 확정된 값만 query key에 넣는다.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) =>
        prev.search === searchInput ? prev : { ...prev, search: searchInput },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // 필터가 바뀌면 지금 페이지가 결과 범위 밖일 수 있으므로 첫 페이지로 돌린다.
  useEffect(() => {
    setOffset(0);
  }, [
    filters.search,
    filters.engine,
    filters.publicationStatus,
    filters.category,
    filters.saleStatus,
    filters.hasProduct,
  ]);

  const params = useMemo<TemplateHubListParams>(
    () => ({
      limit: PAGE_SIZE,
      offset,
      search: filters.search || undefined,
      engine: filters.engine,
      publicationStatus: filters.publicationStatus,
      salesType: "general",
      category: filters.category,
      saleStatus: filters.saleStatus,
      hasProduct: filters.hasProduct,
    }),
    [filters, offset],
  );

  const templatesQuery = useTemplateHubTemplates(params);
  const data = templatesQuery.data;

  const hasFilters =
    Boolean(filters.search) ||
    filters.engine !== undefined ||
    filters.publicationStatus !== undefined ||
    filters.category !== undefined ||
    filters.saleStatus !== undefined ||
    filters.hasProduct !== undefined;

  const handleReset = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminTabHeader
        description="기성품 템플릿의 상품 정보, 가격과 판매 상태를 관리하세요."
        icon={ShoppingBag}
        title="템플릿 판매 관리"
      >
        <div className="rounded-lg border bg-quaternary px-3 py-1.5 sm:px-4 sm:py-2">
          <span className="text-sm font-semibold text-[#F4FDFF] sm:text-base">
            조회 {data?.pagination.total ?? 0}개
          </span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          disabled={templatesQuery.isFetching}
          type="button"
          onClick={() => void templatesQuery.refetch()}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4",
              templatesQuery.isFetching && "animate-spin",
            )}
          />
          새로고침
        </button>
      </AdminTabHeader>

      <TemplateHubFilters
        filters={filters}
        searchInput={searchInput}
        onChange={setFilters}
        onReset={handleReset}
        onSearchInputChange={setSearchInput}
      />

      <TemplateHubList
        errorMessage={
          templatesQuery.error instanceof Error
            ? templatesQuery.error.message
            : undefined
        }
        hasFilters={hasFilters}
        isError={templatesQuery.isError}
        // placeholderData 덕분에 페이지 이동 중에는 이전 목록이 유지된다.
        // 최초 로드에만 skeleton을 보여준다.
        isLoading={templatesQuery.isLoading}
        items={data?.items ?? []}
        renderActions={(item) => <TemplateHubRowActions item={item} />}
        onRetry={() => void templatesQuery.refetch()}
      />

      {data && (
        <TemplateHubPagination
          isFetching={templatesQuery.isFetching}
          limit={data.pagination.limit}
          offset={data.pagination.offset}
          total={data.pagination.total}
          onPageChange={setOffset}
        />
      )}
    </div>
  );
}
