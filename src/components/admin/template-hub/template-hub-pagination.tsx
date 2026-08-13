import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const buildPageWindow = (currentPage: number, totalPages: number): number[] => {
  const windowSize = Math.min(5, totalPages);
  const start = Math.max(
    1,
    Math.min(currentPage - Math.floor(windowSize / 2), totalPages - windowSize + 1)
  );

  return Array.from({ length: windowSize }, (_, index) => start + index);
};

export const TemplateHubPagination = ({
  total,
  limit,
  offset,
  isFetching,
  onPageChange,
}: {
  total: number;
  limit: number;
  offset: number;
  isFetching: boolean;
  onPageChange: (nextOffset: number) => void;
}) => {
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) return null;

  const currentPage = Math.floor(offset / limit) + 1;
  const goToPage = (page: number) => onPageChange((page - 1) * limit);

  const navButton =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-gray-500">
        전체 {total}개 중 {offset + 1}–{Math.min(offset + limit, total)}개
        {isFetching && <span className="ml-2 text-gray-400">불러오는 중...</span>}
      </p>

      <div className="flex items-center gap-1">
        <button
          aria-label="이전 페이지"
          className={navButton}
          disabled={currentPage <= 1}
          type="button"
          onClick={() => goToPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {buildPageWindow(currentPage, totalPages).map((page) => (
          <button
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-primary text-[#F4FDFF]"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            )}
            key={page}
            type="button"
            onClick={() => goToPage(page)}
          >
            {page}
          </button>
        ))}

        <button
          aria-label="다음 페이지"
          className={navButton}
          disabled={currentPage >= totalPages}
          type="button"
          onClick={() => goToPage(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
