/**
 * 템플릿 통합 관리 Hub 전용 계약.
 *
 * 기존 관리 화면의 타입(`TemplateWithShopTemplateAndPlans` 등)을 재사용하지
 * 않는다. DB의 snake_case 행을 UI까지 그대로 흘려보내지 않고, server service가
 * 이 모듈의 camelCase 모델로 정규화한다.
 */

export type TemplateEngine = "legacy" | "studio";

export type TemplatePublicationStatus = "draft" | "published" | "archived";

/** `templates.is_public`의 UI 의미. true=general(일반 판매), false=custom(맞춤 제작). */
export type TemplateSalesType = "general" | "custom";

export type TemplateSaleStatus =
  | "selling"
  | "ready"
  | "blocked"
  | "unconfigured";

export const TEMPLATE_ENGINES: readonly TemplateEngine[] = ["legacy", "studio"];

export const TEMPLATE_PUBLICATION_STATUSES: readonly TemplatePublicationStatus[] =
  ["draft", "published", "archived"];

export const TEMPLATE_SALES_TYPES: readonly TemplateSalesType[] = [
  "general",
  "custom",
];

export const TEMPLATE_SALE_STATUSES: readonly TemplateSaleStatus[] = [
  "selling",
  "ready",
  "blocked",
  "unconfigured",
];

/** 구매 API가 받아들이는 plan 종류. DB `template_plans_plan_check`와 일치시킨다. */
export const PURCHASABLE_PLAN_TYPES: readonly string[] = ["lite", "pro"];

export type TemplateSaleBlockReasonCode =
  | "NOT_PUBLISHED"
  | "NOT_GENERAL_SALE"
  | "PRODUCT_MISSING"
  | "PLAN_MISSING"
  | "ARTIST_MISSING"
  | "ROYALTY_MISSING";

export type TemplateSaleBlockReason = {
  code: TemplateSaleBlockReasonCode;
  /** 관리자 UI에 그대로 표시할 수 있는 문장. UI 분기는 `code`로 한다. */
  message: string;
  artistIds?: string[];
};

export type TemplateSaleReadiness = {
  ready: boolean;
  reasons: TemplateSaleBlockReason[];
};

export type TemplateHubLinkedArtist = {
  id: string;
  name: string;
  isPrimary: boolean;
};

export type TemplateHubItem = {
  id: string;
  name: string;
  description: string;
  templateEngine: TemplateEngine;
  publicationStatus: TemplatePublicationStatus;
  salesType: TemplateSalesType;
  shopProductId: string | null;
  hasProduct: boolean;
  hasPurchasablePlan: boolean;
  isShopVisible: boolean;
  linkedArtists: TemplateHubLinkedArtist[];
  saleReadiness: TemplateSaleReadiness;
  createdAt: string;
  updatedAt: string;
};

export type TemplateHubListParams = {
  limit?: number;
  offset?: number;
  search?: string;
  engine?: TemplateEngine;
  publicationStatus?: TemplatePublicationStatus;
  salesType?: TemplateSalesType;
  saleStatus?: TemplateSaleStatus;
  /**
   * 상품 구성 여부 필터.
   *
   * `saleStatus="unconfigured"`와 `hasProduct=false`는 결과가 같지만(상품이
   * 없으면 판매 중일 수도, 판매 준비될 수도 없다), "구성됨"은 단일 saleStatus
   * 값으로 표현할 수 없어 별도 파라미터로 둔다.
   */
  hasProduct?: boolean;
};

export type TemplateHubListResponse = {
  items: TemplateHubItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
  counts: {
    all: number;
    legacy: number;
    studio: number;
    general: number;
    custom: number;
    selling: number;
  };
};

export type TemplateHubErrorCode =
  | "INVALID_PARAM"
  | "TEMPLATE_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "SALE_MUST_STOP_FIRST"
  | "SALE_NOT_READY"
  | "INTERNAL_ERROR";

export type TemplateHubErrorResponse = {
  code: TemplateHubErrorCode;
  message: string;
  /** `SALE_NOT_READY`일 때 해결해야 할 항목 전체. */
  reasons?: TemplateSaleBlockReason[];
};

export type TemplateHubItemResponse = {
  item: TemplateHubItem;
};

export type UpdateTemplateSalesTypeInput = {
  salesType: TemplateSalesType;
};

export type UpdateTemplateSaleInput = {
  visible: boolean;
};

/**
 * Hub 목록의 표시 상태. 03단계 문서의 우선순위를 그대로 따른다.
 *
 * `isShopVisible=true`인데 readiness가 false인 데이터 이상 상태에서도 실제 DB
 * 상태를 숨기지 않기 위해 `selling`을 최우선으로 판정한다.
 */
export const resolveTemplateSaleStatus = (
  item: Pick<TemplateHubItem, "isShopVisible" | "hasProduct" | "saleReadiness">
): TemplateSaleStatus => {
  if (item.isShopVisible) return "selling";
  if (item.saleReadiness.ready) return "ready";
  if (!item.hasProduct) return "unconfigured";
  return "blocked";
};

/** 판매 중이지만 판매 조건을 만족하지 않는 데이터 이상 상태. */
export const hasSaleConditionMismatch = (
  item: Pick<TemplateHubItem, "isShopVisible" | "saleReadiness">
): boolean => item.isShopVisible && !item.saleReadiness.ready;
