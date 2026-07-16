import {
  EngineBadge,
  ProductBadge,
  PublicationStatusBadge,
  SaleStatusBadge,
  SalesTypeBadge,
} from "@/components/admin/template-hub/template-hub-badges";
import {
  hasSaleConditionMismatch,
  resolveTemplateSaleStatus,
  type TemplateHubItem,
} from "@/types/template-hub";
import { AlertTriangle, LayoutList } from "lucide-react";
import type { ReactNode } from "react";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatArtists = (item: TemplateHubItem) => {
  if (item.linkedArtists.length === 0) return "미연결";

  const [first] = item.linkedArtists;
  return item.linkedArtists.length === 1
    ? first.name
    : `${first.name} 외 ${item.linkedArtists.length - 1}명`;
};

/**
 * 판매 중이지만 판매 조건이 깨진 데이터 이상 상태를 알린다. 배지는 실제 DB
 * 상태를 그대로 보여주고, 경고만 덧붙인다.
 */
const SaleMismatchWarning = ({ item }: { item: TemplateHubItem }) => {
  if (!hasSaleConditionMismatch(item)) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"
      title={item.saleReadiness.reasons.map((reason) => reason.message).join("\n")}
    >
      <AlertTriangle className="h-3 w-3" />
      판매 조건 불일치
    </span>
  );
};

const StatusCell = ({ item }: { item: TemplateHubItem }) => (
  <div className="flex flex-col items-start gap-1">
    <SaleStatusBadge status={resolveTemplateSaleStatus(item)} />
    <SaleMismatchWarning item={item} />
  </div>
);

export type TemplateHubListProps = {
  items: TemplateHubItem[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  hasFilters: boolean;
  onRetry: () => void;
  renderActions?: (item: TemplateHubItem) => ReactNode;
};

const EmptyState = ({ hasFilters }: { hasFilters: boolean }) => (
  <div className="px-6 py-12 text-center">
    <LayoutList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
    <p className="text-sm text-gray-500">
      {hasFilters
        ? "조건에 맞는 템플릿이 없습니다. 필터를 조정해 보세요."
        : "표시할 템플릿이 없습니다."}
    </p>
  </div>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) => (
  <div className="px-6 py-12 text-center">
    <p className="mb-3 text-sm text-red-700">
      {message || "템플릿 목록을 불러오지 못했습니다."}
    </p>
    <button
      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      type="button"
      onClick={onRetry}
    >
      다시 시도
    </button>
  </div>
);

const LoadingRows = () => (
  <div className="divide-y divide-gray-100">
    {Array.from({ length: 5 }).map((_, index) => (
      <div className="flex items-center gap-4 px-4 py-4" key={index}>
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-gray-100" />
      </div>
    ))}
  </div>
);

export const TemplateHubList = ({
  items,
  isLoading,
  isError,
  errorMessage,
  hasFilters,
  onRetry,
  renderActions,
}: TemplateHubListProps) => {
  const showActions = renderActions !== undefined;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <LoadingRows />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <ErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <EmptyState hasFilters={hasFilters} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-sm">
      {/* 데스크톱 테이블 뷰 */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                템플릿
              </th>
              <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                분류
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                상품
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                작가
              </th>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                판매
              </th>
              <th className="w-36 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                업데이트
              </th>
              {showActions && (
                <th className="w-[22rem] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  작업
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => (
              <tr className="hover:bg-gray-50" key={item.id}>
                <td className="px-4 py-4 align-top">
                  <div className="max-w-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900">
                        {item.name}
                      </span>
                      <EngineBadge engine={item.templateEngine} />
                    </div>
                    {item.description && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 truncate text-xs text-gray-400">{item.id}</p>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col items-start gap-1">
                    <PublicationStatusBadge status={item.publicationStatus} />
                    <SalesTypeBadge salesType={item.salesType} />
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <ProductBadge
                    hasProduct={item.hasProduct}
                    hasPurchasablePlan={item.hasPurchasablePlan}
                  />
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-500">
                  {formatArtists(item)}
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusCell item={item} />
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-500">
                  {formatDateTime(item.updatedAt)}
                </td>
                {showActions && (
                  <td className="px-4 py-4 align-top">{renderActions(item)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 뷰 — 데스크톱과 같은 정보를 제공한다 */}
      <div className="divide-y divide-gray-200 lg:hidden">
        {items.map((item) => (
          <div className="space-y-3 p-4" key={item.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-900">
                  {item.name}
                </span>
                <EngineBadge engine={item.templateEngine} />
              </div>
              {item.description && (
                <p className="mt-1 truncate text-xs text-gray-500">
                  {item.description}
                </p>
              )}
              <p className="mt-1 truncate text-xs text-gray-400">{item.id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <PublicationStatusBadge status={item.publicationStatus} />
              <SalesTypeBadge salesType={item.salesType} />
              <ProductBadge
                hasProduct={item.hasProduct}
                hasPurchasablePlan={item.hasPurchasablePlan}
              />
              <SaleStatusBadge status={resolveTemplateSaleStatus(item)} />
            </div>
            <SaleMismatchWarning item={item} />

            <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
              <span>작가 {formatArtists(item)}</span>
              <span>업데이트 {formatDateTime(item.updatedAt)}</span>
            </div>

            {showActions && renderActions(item)}
          </div>
        ))}
      </div>
    </div>
  );
};
