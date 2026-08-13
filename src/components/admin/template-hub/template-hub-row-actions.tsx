"use client";

import {
  useUpdateTemplateSale,
  useUpdateTemplateSalesType,
} from "@/hooks/query/useTemplateHub";
import { cn } from "@/lib/utils";
import { TemplateHubRequestError } from "@/services/admin/templateHubService";
import type { TemplateHubItem } from "@/types/template-hub";
import {
  ArrowUpRight,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const actionButton =
  "inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** 서버가 내려준 관리자용 message(및 SALE_NOT_READY의 전체 사유)를 그대로 보여준다. */
const describeError = (error: unknown): string => {
  if (error instanceof TemplateHubRequestError) {
    if (error.reasons && error.reasons.length > 0) {
      return [
        error.message,
        ...error.reasons.map((reason) => `- ${reason.message}`),
      ].join("\n");
    }
    return error.message;
  }

  return error instanceof Error
    ? error.message
    : "요청 처리 중 오류가 발생했습니다.";
};

export const TemplateHubRowActions = ({ item }: { item: TemplateHubItem }) => {
  const [copied, setCopied] = useState(false);
  const updateSalesType = useUpdateTemplateSalesType();
  const updateSale = useUpdateTemplateSale();

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(item.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없는 환경 — 조용히 무시한다.
    }
  };

  const handleSalesTypeChange = (salesType: "general" | "custom") => {
    updateSalesType.mutate(
      { templateId: item.id, salesType },
      { onError: (error) => alert(describeError(error)) },
    );
  };

  const handleSaleToggle = (visible: boolean) => {
    if (
      !visible &&
      !confirm(`"${item.name}" 템플릿의 판매를 중지하시겠습니까?`)
    ) {
      return;
    }

    updateSale.mutate(
      { templateId: item.id, visible },
      { onError: (error) => alert(describeError(error)) },
    );
  };

  const previewDisabled =
    item.templateEngine === "studio" && item.publicationStatus !== "published";
  const previewDisabledReason = "게시된 템플릿만 미리볼 수 있습니다.";
  const readinessTooltip = item.saleReadiness.reasons
    .map((reason) => reason.message)
    .join("\n");
  // 상품이 없는 맞춤 제작 템플릿은 상품 생성 API가 is_public=false를 거부하므로
  // 진입시키지 않는다. 이미 상품이 있는 경우(과거 일반 판매였던 이력)는 기존
  // 데이터를 계속 편집할 수 있어야 하므로 링크를 막지 않는다.
  const productLinkBlocked = item.salesType === "custom" && !item.hasProduct;
  const studioAdminPath =
    item.templateKind === "thumbnail"
      ? `/admin/thumbnail-studio/${item.id}`
      : `/admin/template-studio/${item.id}`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {item.templateEngine === "studio" ? (
        <>
          <Link
            className={cn(
              actionButton,
              "bg-blue-50 text-blue-600 hover:bg-blue-100",
            )}
            href={`${studioAdminPath}/edit`}
          >
            <Edit className="h-3.5 w-3.5" />
            수정
          </Link>
          {previewDisabled ? (
            <span
              className={cn(
                actionButton,
                "cursor-not-allowed bg-gray-50 text-gray-400",
              )}
              title={previewDisabledReason}
            >
              <Eye className="h-3.5 w-3.5" />
              미리보기
            </span>
          ) : (
            <Link
              className={cn(
                actionButton,
                "bg-[#F5F0ED] text-[#2d2d2d] hover:bg-[#EDE5E0]",
              )}
              href={`${studioAdminPath}/preview`}
            >
              <Eye className="h-3.5 w-3.5" />
              미리보기
            </Link>
          )}
        </>
      ) : (
        <Link
          className={cn(
            actionButton,
            "bg-blue-50 text-blue-600 hover:bg-blue-100",
          )}
          href={`/time-table/${item.id}`}
          target="_blank"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          실행
        </Link>
      )}

      {productLinkBlocked ? (
        <span
          className={cn(
            actionButton,
            "cursor-not-allowed bg-gray-50 text-gray-400",
          )}
          title="맞춤 제작 템플릿은 상품을 등록할 수 없습니다. 먼저 일반 판매로 전환해 주세요."
        >
          <ExternalLink className="h-3.5 w-3.5" />
          상품 등록
        </span>
      ) : (
        <Link
          className={cn(
            actionButton,
            "border border-gray-300 text-gray-700 hover:bg-gray-50",
          )}
          href={`/admin/template-products/${item.id}`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {item.hasProduct ? "상품 정보" : "상품 등록"}
        </Link>
      )}

      <button
        className={cn(
          actionButton,
          "border border-gray-300 text-gray-600 hover:bg-gray-50",
        )}
        type="button"
        onClick={() => void handleCopyId()}
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "복사됨" : "ID 복사"}
      </button>

      {item.salesType === "custom" ? (
        <button
          className={cn(
            actionButton,
            "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
          )}
          disabled={updateSalesType.isPending}
          type="button"
          onClick={() => handleSalesTypeChange("general")}
        >
          {updateSalesType.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          일반 판매로 변경
        </button>
      ) : (
        <button
          className={cn(
            actionButton,
            "border border-gray-300 text-gray-600 hover:bg-gray-50",
          )}
          disabled={updateSalesType.isPending || item.isShopVisible}
          title={item.isShopVisible ? "판매를 먼저 중지해 주세요." : undefined}
          type="button"
          onClick={() => handleSalesTypeChange("custom")}
        >
          {updateSalesType.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          맞춤 제작으로 변경
        </button>
      )}

      {item.isShopVisible ? (
        <button
          className={cn(
            actionButton,
            "bg-red-50 text-red-600 hover:bg-red-100",
          )}
          disabled={updateSale.isPending}
          type="button"
          onClick={() => handleSaleToggle(false)}
        >
          {updateSale.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          판매 중지
        </button>
      ) : (
        <button
          className={cn(
            actionButton,
            "bg-green-50 text-green-700 hover:bg-green-100",
          )}
          disabled={updateSale.isPending || !item.saleReadiness.ready}
          title={!item.saleReadiness.ready ? readinessTooltip : undefined}
          type="button"
          onClick={() => handleSaleToggle(true)}
        >
          {updateSale.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          판매 시작
        </button>
      )}
    </div>
  );
};
