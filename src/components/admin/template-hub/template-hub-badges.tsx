import { cn } from "@/lib/utils";
import {
  type TemplateEngine,
  type TemplatePublicationStatus,
  type TemplateSaleStatus,
  type TemplateSalesType,
} from "@/types/template-hub";
import { cva, type VariantProps } from "class-variance-authority";

const badge = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-slate-100 text-slate-700",
        info: "bg-blue-100 text-blue-800",
        warning: "bg-yellow-100 text-yellow-800",
        success: "bg-green-100 text-green-800",
        danger: "bg-red-100 text-red-700",
        muted: "bg-gray-100 text-gray-500",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

type BadgeTone = NonNullable<VariantProps<typeof badge>["tone"]>;

const ENGINE_LABELS: Record<TemplateEngine, string> = {
  legacy: "Legacy",
  studio: "Studio",
};

export const EngineBadge = ({ engine }: { engine: TemplateEngine }) => (
  <span className={badge({ tone: "neutral" })}>{ENGINE_LABELS[engine]}</span>
);

const PUBLICATION_LABELS: Record<TemplatePublicationStatus, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

const PUBLICATION_TONES: Record<TemplatePublicationStatus, BadgeTone> = {
  draft: "warning",
  published: "success",
  archived: "muted",
};

export const PublicationStatusBadge = ({
  status,
}: {
  status: TemplatePublicationStatus;
}) => (
  <span className={badge({ tone: PUBLICATION_TONES[status] })}>
    {PUBLICATION_LABELS[status]}
  </span>
);

/**
 * `is_public`은 공개 접근 여부가 아니라 상품 분류이므로 "공개/비공개"가 아니라
 * "일반 판매/맞춤 제작"으로 표시한다.
 */
const SALES_TYPE_LABELS: Record<TemplateSalesType, string> = {
  general: "일반 판매",
  custom: "맞춤 제작",
};

export const SalesTypeBadge = ({ salesType }: { salesType: TemplateSalesType }) => (
  <span className={badge({ tone: salesType === "general" ? "info" : "neutral" })}>
    {SALES_TYPE_LABELS[salesType]}
  </span>
);

export const SALE_STATUS_LABELS: Record<TemplateSaleStatus, string> = {
  selling: "판매 중",
  ready: "판매 준비 완료",
  blocked: "판매 불가",
  unconfigured: "상품 미구성",
};

const SALE_STATUS_TONES: Record<TemplateSaleStatus, BadgeTone> = {
  selling: "success",
  ready: "info",
  blocked: "danger",
  unconfigured: "muted",
};

export const SaleStatusBadge = ({
  status,
  className,
}: {
  status: TemplateSaleStatus;
  className?: string;
}) => (
  <span className={cn(badge({ tone: SALE_STATUS_TONES[status] }), className)}>
    {SALE_STATUS_LABELS[status]}
  </span>
);

export const ProductBadge = ({
  hasProduct,
  hasPurchasablePlan,
}: {
  hasProduct: boolean;
  hasPurchasablePlan: boolean;
}) => {
  if (!hasProduct) {
    return <span className={badge({ tone: "muted" })}>상품 없음</span>;
  }

  return (
    <span
      className={badge({ tone: hasPurchasablePlan ? "success" : "warning" })}
    >
      {hasPurchasablePlan ? "상품·가격 있음" : "가격 없음"}
    </span>
  );
};
