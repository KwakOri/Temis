/**
 * Template Hub 판매 규칙의 순수 판정 로직.
 *
 * DB client·Next.js 서버 런타임을 import하지 않는다(remediation 02단계).
 * `templateHubService.ts`가 이 모듈을 재사용해 mutation을 수행하고,
 * `scripts/check-template-hub-sale-readiness.ts`는 이 모듈만 import해
 * Supabase 환경변수 없이 규칙을 단위 테스트한다.
 */
import {
  PURCHASABLE_PLAN_TYPES,
  type TemplateHubLinkedArtist,
  type TemplatePublicationStatus,
  type TemplateSaleBlockReason,
  type TemplateSaleReadiness,
  type TemplateSalesType,
} from "@/types/template-hub";

export type TemplateSaleReadinessInput = {
  publicationStatus: TemplatePublicationStatus;
  salesType: TemplateSalesType;
  shopProductId: string | null;
  purchasablePlanCount: number;
  linkedArtists: TemplateHubLinkedArtist[];
  /** 템플릿 전용 또는 작가 기본 로열티 규칙이 확인된 작가 id. */
  artistIdsWithRoyalty: ReadonlySet<string>;
};

/**
 * 판매를 시작할 수 있는지 판정한다. 엔진은 판정에 관여하지 않는다.
 *
 * 누락된 관계는 예외가 아니라 차단 사유로 변환한다. 목록 여러 건과 단건
 * mutation이 같은 함수를 사용해 UI와 서버 판정이 어긋나지 않게 한다.
 */
export const evaluateTemplateSaleReadiness = (
  input: TemplateSaleReadinessInput
): TemplateSaleReadiness => {
  const reasons: TemplateSaleBlockReason[] = [];

  if (input.publicationStatus !== "published") {
    reasons.push({
      code: "NOT_PUBLISHED",
      message: "템플릿을 먼저 게시해 주세요.",
    });
  }

  if (input.salesType !== "general") {
    reasons.push({
      code: "NOT_GENERAL_SALE",
      message: "맞춤 제작 템플릿은 판매할 수 없습니다. 일반 판매로 변경해 주세요.",
    });
  }

  if (!input.shopProductId) {
    reasons.push({
      code: "PRODUCT_MISSING",
      message: "상점 상품 정보를 먼저 등록해 주세요.",
    });
  } else if (input.purchasablePlanCount <= 0) {
    // 상품이 없으면 plan도 있을 수 없으므로 중복 사유를 만들지 않는다.
    reasons.push({
      code: "PLAN_MISSING",
      message: "구매 가능한 가격 플랜을 먼저 등록해 주세요.",
    });
  }

  if (input.linkedArtists.length === 0) {
    reasons.push({
      code: "ARTIST_MISSING",
      message:
        "작가 미연결 상태에서는 판매할 수 없습니다. '테미스' 또는 실제 작가를 연결해 주세요.",
    });
  } else {
    const missingRoyaltyArtists = input.linkedArtists.filter(
      (artist) => !input.artistIdsWithRoyalty.has(artist.id)
    );

    if (missingRoyaltyArtists.length > 0) {
      const names = missingRoyaltyArtists
        .map((artist) => artist.name)
        .filter((name) => name.length > 0);

      reasons.push({
        code: "ROYALTY_MISSING",
        message:
          names.length > 0
            ? `로열티가 설정되지 않은 작가가 있습니다: ${names.join(", ")}`
            : "로열티가 설정되지 않은 작가가 있습니다.",
        artistIds: missingRoyaltyArtists.map((artist) => artist.id),
      });
    }
  }

  return { ready: reasons.length === 0, reasons };
};

/** plan 한 건이 실제로 구매 가능한지 판정한다. 무료(0원) 판매를 허용한다. */
export const isPurchasablePlan = (plan: {
  shop_template_id: string | null;
  plan: string | null;
  price: number | null;
}, shopProductId: string): boolean => {
  if (plan.shop_template_id !== shopProductId) return false;
  if (plan.price === null || plan.price === undefined) return false;
  if (plan.price < 0) return false;
  if (!plan.plan || !PURCHASABLE_PLAN_TYPES.includes(plan.plan)) return false;
  return true;
};

export type TemplateSalesTypeTransitionResult =
  | { allowed: true }
  | { allowed: false; code: "SALE_MUST_STOP_FIRST"; message: string };

/**
 * 일반 판매 → 맞춤 제작 전환 불변식.
 *
 * `is_public=true → false`는 판매 중(`isShopVisible=true`)인 상태에서 허용하지
 * 않는다. 자동으로 판매를 먼저 중지시키지 않고, 운영자가 판매 중지를 먼저
 * 명시적으로 수행하도록 요구한다. 그 외 전환(맞춤 제작 → 일반 판매, 또는
 * 판매 중이 아닌 일반 판매 → 맞춤 제작)은 항상 허용한다.
 */
export const evaluateTemplateSalesTypeTransition = (input: {
  nextSalesType: TemplateSalesType;
  isShopVisible: boolean;
}): TemplateSalesTypeTransitionResult => {
  if (input.nextSalesType === "custom" && input.isShopVisible) {
    return {
      allowed: false,
      code: "SALE_MUST_STOP_FIRST",
      message: "맞춤 제작으로 변경하려면 먼저 판매를 중지해 주세요.",
    };
  }

  return { allowed: true };
};

export type TemplateSaleVisibilityChangeResult =
  | { allowed: true }
  | { allowed: false; code: "SALE_NOT_READY"; reasons: TemplateSaleBlockReason[] };

/**
 * 판매 시작·중지 불변식.
 *
 * 판매 중지(`requestedVisible=false`)는 readiness와 무관하게 항상 허용한다 —
 * 데이터가 이상 상태(판매 중인데 조건 불일치)여도 운영자가 즉시 중지할 수
 * 있어야 한다. 판매 시작은 `evaluateTemplateSaleReadiness`의 결과가
 * `ready=true`일 때만 허용한다.
 */
export const evaluateTemplateSaleVisibilityChange = (input: {
  requestedVisible: boolean;
  readiness: TemplateSaleReadiness;
}): TemplateSaleVisibilityChangeResult => {
  if (!input.requestedVisible) {
    return { allowed: true };
  }

  if (!input.readiness.ready) {
    return {
      allowed: false,
      code: "SALE_NOT_READY",
      reasons: input.readiness.reasons,
    };
  }

  return { allowed: true };
};
