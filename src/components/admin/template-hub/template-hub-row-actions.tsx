"use client";

import { useUpdateTemplateSale } from "@/hooks/query/useTemplateHub";
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
import { cva } from "class-variance-authority";

const actionButton = cva(
  "inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      tone: {
        primary: "bg-primary text-white hover:bg-secondary",
        neutral: "border border-gray-300 text-gray-600 hover:bg-gray-50",
        muted: "cursor-not-allowed bg-gray-50 text-gray-400",
        success: "bg-green-50 text-green-700 hover:bg-green-100",
        danger: "bg-red-50 text-red-600 hover:bg-red-100",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

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
  const studioAdminPath =
    item.templateKind === "thumbnail"
      ? `/admin/thumbnail-studio/${item.id}`
      : item.templateCategory === "team-timetable"
        ? `/admin/team-timetable-studio/${item.id}`
        : `/admin/template-studio/${item.id}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className={actionButton({ tone: "primary" })}
          href={`/admin/template-products/${item.id}?returnTo=template-hub`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {item.hasProduct ? "상품·가격 편집" : "상품 등록"}
        </Link>
        <button
          className={actionButton({
            tone: item.isShopVisible ? "danger" : "success",
          })}
          disabled={
            updateSale.isPending ||
            (!item.isShopVisible && !item.saleReadiness.ready)
          }
          title={
            !item.isShopVisible && !item.saleReadiness.ready
              ? readinessTooltip
              : undefined
          }
          type="button"
          onClick={() => handleSaleToggle(!item.isShopVisible)}
        >
          {updateSale.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {item.isShopVisible ? "판매 중지" : "판매 시작"}
        </button>
      </div>
      <details className="text-xs text-gray-500">
        <summary className="w-fit cursor-pointer select-none hover:text-gray-700">
          템플릿 작업
        </summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.templateEngine === "studio" ? (
            <>
              <Link className={actionButton()} href={`${studioAdminPath}/edit`}>
                <Edit className="h-3.5 w-3.5" />
                제작 화면
              </Link>
              {previewDisabled ? (
                <span
                  className={actionButton({ tone: "muted" })}
                  title={previewDisabledReason}
                >
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </span>
              ) : (
                <Link
                  className={actionButton()}
                  href={`${studioAdminPath}/preview`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </Link>
              )}
            </>
          ) : (
            <Link
              className={actionButton()}
              href={`/time-table/${item.id}`}
              target="_blank"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              템플릿 보기
            </Link>
          )}

          <button
            className={actionButton()}
            type="button"
            onClick={() => void handleCopyId()}
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "복사됨" : "ID 복사"}
          </button>
        </div>
      </details>
    </div>
  );
};
