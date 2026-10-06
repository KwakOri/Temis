import { TEMPLATE_CATEGORY_LABELS } from "@/types/template-hub";
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
  type TemplateSaleBlockReasonCode,
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
      title={item.saleReadiness.reasons
        .map((reason) => reason.message)
        .join("\n")}
    >
      <AlertTriangle className="h-3 w-3" />
      판매 조건 불일치
    </span>
  );
};

const preparationLabels: Record<TemplateSaleBlockReasonCode, string> = {
  NOT_PUBLISHED: "게시 필요",
  NOT_GENERAL_SALE: "기성품 전환",
  PRODUCT_MISSING: "상품 등록",
  PLAN_MISSING: "가격 설정",
  ARTIST_MISSING: "작가 연결",
  ROYALTY_MISSING: "로열티 설정",
};

const StatusCell = ({ item }: { item: TemplateHubItem }) => (
  <div className="flex flex-col items-start gap-1">
    <SaleStatusBadge status={resolveTemplateSaleStatus(item)} />
    <SaleMismatchWarning item={item} />
    {item.saleReadiness.reasons.length > 0 && (
      <div
        aria-label="판매 준비 항목"
        className="mt-1 flex max-w-56 flex-wrap gap-1"
      >
        {item.saleReadiness.reasons.map((reason) => (
          <span
            key={reason.code}
            title={reason.message}
            className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800"
          >
            {preparationLabels[reason.code]}
          </span>
        ))}
      </div>
    )}
  </div>
);

const ProductCell = ({ item }: { item: TemplateHubItem }) => (
  <div className="space-y-2">
    <ProductBadge
      hasProduct={item.hasProduct}
      hasPurchasablePlan={item.hasPurchasablePlan}
    />
    {(item.pricePlans ?? []).map(({ plan, price }) => (
      <p key={plan} className="whitespace-nowrap text-xs text-gray-500">
        {plan.toUpperCase()}{" "}
        <span className="ml-1 font-semibold text-gray-800">
          {price.toLocaleString("ko-KR")}원
        </span>
      </p>
    ))}
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
                템플릿 / 분류
              </th>
              <th className="w-40 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                상품 / 가격
              </th>
              <th className="w-56 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                판매 상태 / 준비 항목
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                작가
              </th>
              {showActions && (
                <th className="w-64 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  판매 관리
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
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {TEMPLATE_CATEGORY_LABELS[item.templateCategory]}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <PublicationStatusBadge status={item.publicationStatus} />
                      <SalesTypeBadge salesType={item.salesType} />
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      수정 {formatDateTime(item.updatedAt)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <ProductCell item={item} />
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusCell item={item} />
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-500">
                  {formatArtists(item)}
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
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <PublicationStatusBadge status={item.publicationStatus} />
              <span className="text-xs text-gray-500">
                {TEMPLATE_CATEGORY_LABELS[item.templateCategory]}
              </span>
              <SalesTypeBadge salesType={item.salesType} />
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
              <div>
                <p className="mb-2 text-xs text-gray-500">상품 / 가격</p>
                <ProductCell item={item} />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500">판매 상태</p>
                <StatusCell item={item} />
              </div>
            </div>

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
