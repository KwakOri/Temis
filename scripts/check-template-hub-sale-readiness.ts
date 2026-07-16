/**
 * Template Hub 03단계: 판매 준비 상태 서버 규칙 단위 테스트.
 *
 * 순수 함수만 테스트하므로 DB나 서버 실행이 필요 없다. 04단계의 mutation
 * route는 이 파일이 검증하는 evaluateTemplateSaleReadiness /
 * evaluateTemplateSalesTypeTransition / evaluateTemplateSaleVisibilityChange를
 * 그대로 재사용해야 한다 — 새 판정 로직을 만들지 않는다.
 *
 * `templateHubService`가 아니라 `templateHubSaleRules`에서 직접 import한다
 * (remediation 02단계) — 서비스 모듈은 최상단에서 `supabase-admin-server`를
 * import하며 Supabase 환경변수가 없으면 즉시 throw하므로, 이 순수 단위
 * 테스트를 DB 없이 CI에서 돌리려면 DB 비의존 모듈만 import해야 한다.
 */
import {
  evaluateTemplateSaleReadiness,
  evaluateTemplateSaleVisibilityChange,
  evaluateTemplateSalesTypeTransition,
  isPurchasablePlan,
  type TemplateSaleReadinessInput,
} from "../src/services/server/templateHubSaleRules";
import type {
  TemplateHubLinkedArtist,
  TemplateSaleBlockReasonCode,
} from "../src/types/template-hub";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const artist = (id: string, name = `작가-${id}`): TemplateHubLinkedArtist => ({
  id,
  name,
  isPrimary: false,
});

const FULLY_READY_INPUT: TemplateSaleReadinessInput = {
  publicationStatus: "published",
  salesType: "general",
  shopProductId: "shop-1",
  purchasablePlanCount: 1,
  linkedArtists: [artist("artist-1")],
  artistIdsWithRoyalty: new Set(["artist-1"]),
};

const reasonCodes = (
  reasons: Array<{ code: TemplateSaleBlockReasonCode }>
): TemplateSaleBlockReasonCode[] => reasons.map((r) => r.code);

let passed = 0;
const check = (label: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// evaluateTemplateSaleReadiness — 조건별 단위 테스트 (03단계 문서 9절)
// ---------------------------------------------------------------------------

check("모든 조건 충족 → ready", () => {
  const result = evaluateTemplateSaleReadiness(FULLY_READY_INPUT);
  assert(result.ready === true, "ready여야 한다");
  assert(result.reasons.length === 0, `사유가 없어야 한다: ${JSON.stringify(result.reasons)}`);
});

check("draft 차단 → NOT_PUBLISHED", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    publicationStatus: "draft",
  });
  assert(!result.ready, "차단되어야 한다");
  assert(reasonCodes(result.reasons).includes("NOT_PUBLISHED"), "NOT_PUBLISHED 사유가 있어야 한다");
});

check("archived 차단 → NOT_PUBLISHED", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    publicationStatus: "archived",
  });
  assert(!result.ready, "차단되어야 한다");
  assert(reasonCodes(result.reasons).includes("NOT_PUBLISHED"), "NOT_PUBLISHED 사유가 있어야 한다");
});

check("맞춤 제작 차단 → NOT_GENERAL_SALE", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    salesType: "custom",
  });
  assert(!result.ready, "차단되어야 한다");
  assert(reasonCodes(result.reasons).includes("NOT_GENERAL_SALE"), "NOT_GENERAL_SALE 사유가 있어야 한다");
});

check("상품 없음 → PRODUCT_MISSING (PLAN_MISSING 중복 없음)", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    shopProductId: null,
    purchasablePlanCount: 0,
  });
  assert(!result.ready, "차단되어야 한다");
  const codes = reasonCodes(result.reasons);
  assert(codes.includes("PRODUCT_MISSING"), "PRODUCT_MISSING 사유가 있어야 한다");
  assert(!codes.includes("PLAN_MISSING"), "상품이 없으면 PLAN_MISSING을 중복 표시하지 않는다");
});

check("plan 없음 → PLAN_MISSING (상품은 있음)", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    purchasablePlanCount: 0,
  });
  assert(!result.ready, "차단되어야 한다");
  assert(reasonCodes(result.reasons).includes("PLAN_MISSING"), "PLAN_MISSING 사유가 있어야 한다");
});

check("작가 없음 → ARTIST_MISSING (ROYALTY_MISSING 중복 없음)", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    linkedArtists: [],
    artistIdsWithRoyalty: new Set(),
  });
  assert(!result.ready, "차단되어야 한다");
  const codes = reasonCodes(result.reasons);
  assert(codes.includes("ARTIST_MISSING"), "ARTIST_MISSING 사유가 있어야 한다");
  assert(!codes.includes("ROYALTY_MISSING"), "작가가 없으면 ROYALTY_MISSING을 중복 표시하지 않는다");
});

check("일부 작가만 로열티 없음 → ROYALTY_MISSING + 누락 작가 ID", () => {
  const result = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    linkedArtists: [artist("artist-1", "테미스"), artist("artist-2", "누락작가")],
    artistIdsWithRoyalty: new Set(["artist-1"]),
  });
  assert(!result.ready, "차단되어야 한다");
  const royaltyReason = result.reasons.find((r) => r.code === "ROYALTY_MISSING");
  assert(royaltyReason !== undefined, "ROYALTY_MISSING 사유가 있어야 한다");
  assert(
    JSON.stringify(royaltyReason?.artistIds) === JSON.stringify(["artist-2"]),
    `누락 작가 ID만 포함해야 한다: ${JSON.stringify(royaltyReason?.artistIds)}`
  );
  assert(
    royaltyReason?.message.includes("누락작가"),
    "message에 누락 작가 이름이 포함되어야 한다"
  );
});

check("여러 사유 동시 발생 시 전부 반환", () => {
  const result = evaluateTemplateSaleReadiness({
    publicationStatus: "draft",
    salesType: "custom",
    shopProductId: null,
    purchasablePlanCount: 0,
    linkedArtists: [],
    artistIdsWithRoyalty: new Set(),
  });
  const codes = reasonCodes(result.reasons);
  assert(codes.includes("NOT_PUBLISHED"), "NOT_PUBLISHED 포함");
  assert(codes.includes("NOT_GENERAL_SALE"), "NOT_GENERAL_SALE 포함");
  assert(codes.includes("PRODUCT_MISSING"), "PRODUCT_MISSING 포함");
  assert(codes.includes("ARTIST_MISSING"), "ARTIST_MISSING 포함");
});

// ---------------------------------------------------------------------------
// isPurchasablePlan — plan 판정 (03단계 문서 7절)
// ---------------------------------------------------------------------------

check("isPurchasablePlan: 정상 pro plan → true", () => {
  assert(
    isPurchasablePlan({ shop_template_id: "shop-1", plan: "pro", price: 25000 }, "shop-1"),
    "구매 가능해야 한다"
  );
});

check("isPurchasablePlan: 정상 lite plan → true", () => {
  assert(
    isPurchasablePlan({ shop_template_id: "shop-1", plan: "lite", price: 10000 }, "shop-1"),
    "구매 가능해야 한다"
  );
});

check("isPurchasablePlan: 무료(0원) → true", () => {
  assert(
    isPurchasablePlan({ shop_template_id: "shop-1", plan: "pro", price: 0 }, "shop-1"),
    "무료 판매를 허용해야 한다"
  );
});

check("isPurchasablePlan: 다른 상품의 plan → false", () => {
  assert(
    !isPurchasablePlan({ shop_template_id: "shop-2", plan: "pro", price: 25000 }, "shop-1"),
    "다른 상품의 plan은 구매 불가여야 한다"
  );
});

check("isPurchasablePlan: 가격 null → false", () => {
  assert(
    !isPurchasablePlan({ shop_template_id: "shop-1", plan: "pro", price: null }, "shop-1"),
    "가격이 없으면 구매 불가여야 한다"
  );
});

check("isPurchasablePlan: 음수 가격 → false", () => {
  assert(
    !isPurchasablePlan({ shop_template_id: "shop-1", plan: "pro", price: -1 }, "shop-1"),
    "음수 가격은 구매 불가여야 한다"
  );
});

check("isPurchasablePlan: 지원하지 않는 plan 종류 → false", () => {
  assert(
    !isPurchasablePlan({ shop_template_id: "shop-1", plan: "enterprise", price: 1000 }, "shop-1"),
    "지원하지 않는 plan 종류는 구매 불가여야 한다"
  );
});

// ---------------------------------------------------------------------------
// evaluateTemplateSaleVisibilityChange — 판매 시작/중지 불변식
// ---------------------------------------------------------------------------

check("판매 중지는 readiness와 무관하게 항상 허용", () => {
  const notReadyResult = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    publicationStatus: "draft",
  });
  const result = evaluateTemplateSaleVisibilityChange({
    requestedVisible: false,
    readiness: notReadyResult,
  });
  assert(result.allowed === true, "조건 불일치 상태에서도 판매 중지는 허용되어야 한다");
});

check("판매 시작은 ready=true일 때만 허용", () => {
  const readyResult = evaluateTemplateSaleReadiness(FULLY_READY_INPUT);
  const result = evaluateTemplateSaleVisibilityChange({
    requestedVisible: true,
    readiness: readyResult,
  });
  assert(result.allowed === true, "ready 상태에서는 판매 시작이 허용되어야 한다");
});

check("판매 시작 거부 시 SALE_NOT_READY + 전체 사유 반환", () => {
  const notReadyResult = evaluateTemplateSaleReadiness({
    ...FULLY_READY_INPUT,
    publicationStatus: "draft",
    linkedArtists: [],
    artistIdsWithRoyalty: new Set(),
  });
  const result = evaluateTemplateSaleVisibilityChange({
    requestedVisible: true,
    readiness: notReadyResult,
  });
  assert(result.allowed === false, "판매 시작이 거부되어야 한다");
  assert(!result.allowed && result.code === "SALE_NOT_READY", "SALE_NOT_READY 코드를 반환해야 한다");
  assert(
    !result.allowed && result.reasons.length === notReadyResult.reasons.length,
    "차단 사유 전체를 반환해야 한다 (첫 번째만이 아니라)"
  );
});

// ---------------------------------------------------------------------------
// evaluateTemplateSalesTypeTransition — 판매 유형 변경 불변식
// ---------------------------------------------------------------------------

check("판매 중 맞춤 제작 전환 거부 → SALE_MUST_STOP_FIRST", () => {
  const result = evaluateTemplateSalesTypeTransition({
    nextSalesType: "custom",
    isShopVisible: true,
  });
  assert(result.allowed === false, "판매 중에는 맞춤 제작 전환이 거부되어야 한다");
  assert(!result.allowed && result.code === "SALE_MUST_STOP_FIRST", "SALE_MUST_STOP_FIRST 코드를 반환해야 한다");
});

check("판매 중이 아니면 맞춤 제작 전환 허용", () => {
  const result = evaluateTemplateSalesTypeTransition({
    nextSalesType: "custom",
    isShopVisible: false,
  });
  assert(result.allowed === true, "판매 중이 아니면 맞춤 제작 전환이 허용되어야 한다");
});

check("일반 판매로의 전환은 판매 중 여부와 무관하게 항상 허용", () => {
  const whileSelling = evaluateTemplateSalesTypeTransition({
    nextSalesType: "general",
    isShopVisible: true,
  });
  const whileNotSelling = evaluateTemplateSalesTypeTransition({
    nextSalesType: "general",
    isShopVisible: false,
  });
  assert(whileSelling.allowed === true, "판매 중에도 일반 판매 전환은 허용되어야 한다");
  assert(whileNotSelling.allowed === true, "일반 판매 전환은 항상 허용되어야 한다");
});

console.log(`\n템플릿 Hub 판매 준비 상태 규칙 테스트 통과 (${passed}건)`);
