/**
 * Template Hub 05단계: Hub 전용 회귀 스크립트.
 *
 * 05단계 문서 6절이 요구하는 항목을 커버한다.
 *   - 목록 filter/count 정합성
 *   - readiness reason 조합 (04단계 문서 4절의 표본 매트릭스)
 *   - sales type mutation
 *   - sale start/stop mutation
 *   - 관리자 인증
 *   - (remediation 01) 판매 시작/맞춤 제작 전환 동시 요청의 원자성
 *   - (remediation 06) 템플릿당 상품 1개 불변식(동시 생성 요청)
 *
 * 로컬 복제 DB에는 Studio 템플릿이 draft 1건뿐이라(published+상품 구성,
 * 판매 중 등 표본 조합이 없음), 이 스크립트가 직접 synthetic 템플릿을 만들어
 * 검증한 뒤 finally에서 전부 삭제한다. `templates` 삭제는
 * shop_templates/template_plans/template_artists/(템플릿 전용)
 * artist_royalty_rules까지 CASCADE되므로 정리 대상은 templates row만 추적하면
 * 된다(마이그레이션에서 FK ON DELETE CASCADE 확인 완료).
 */
import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import type { JWTPayload } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { GET as listTemplatesRoute } from "../src/app/api/admin/template-hub/templates/route";
import { PATCH as saleRoute } from "../src/app/api/admin/template-hub/templates/[id]/sale/route";
import { PATCH as salesTypeRoute } from "../src/app/api/admin/template-hub/templates/[id]/sales-type/route";
import { POST as createShopTemplateRoute } from "../src/app/api/admin/shop-templates/route";
import type {
  TemplateHubErrorResponse,
  TemplateHubItemResponse,
  TemplateHubListResponse,
} from "../src/types/template-hub";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error("Refusing to run against a non-local Supabase URL.");
  }
};

const TEMIS_ARTIST_ID = "e5441051-86eb-418c-8051-efd0836a97c6";
// 실행마다 고유한 접두사를 써서, 병렬/연속 실행이 서로의 fixture와 충돌하지
// 않게 한다(remediation 05).
const RUN_ID = randomUUID().slice(0, 8);
const FIXTURE_PREFIX = `[hub-qa-${RUN_ID}]`;

/**
 * 생성에 성공한 템플릿 id를 즉시 기록하는 registry(remediation 05).
 *
 * 과거에는 fixture 5개를 만드는 도중 하나라도 실패하면 `createFixtures()`가
 * reject하고 호출부의 `fixtures` 변수는 끝까지 빈 객체로 남아, 이미 insert된
 * 앞쪽 fixture들이 정리되지 않고 로컬 복제 DB에 남을 수 있었다. 이제 각
 * 템플릿 insert가 성공하는 즉시(연결 데이터를 만들기 전에) 이 registry에
 * 기록하고, 정리는 registry를 기준으로 수행한다.
 */
const trackedTemplateIds = new Set<string>();

const base = "http://127.0.0.1/hub-api-check";

const req = (
  url: string,
  token: string,
  init: { body?: unknown; method?: string } = {}
): NextRequest =>
  new NextRequest(url, {
    method: init.method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

const json = async <T>(response: NextResponse): Promise<{ status: number; body: T }> => ({
  status: response.status,
  body: (await response.json()) as T,
});

let passed = 0;
const check = async (label: string, fn: () => Promise<void>) => {
  await fn();
  passed += 1;
  console.log(`  ok  ${label}`);
};

// ---------------------------------------------------------------------------
// synthetic 템플릿 픽스처
// ---------------------------------------------------------------------------

type FixtureSpec = {
  key: string;
  name: string;
  status: "draft" | "published" | "archived";
  is_public: boolean;
  withProduct?: { plan: "pro" | "lite"; price: number; visible: boolean };
  withArtist?: boolean;
};

const FIXTURES: FixtureSpec[] = [
  { key: "studioDraft", name: `${FIXTURE_PREFIX} Studio draft`, status: "draft", is_public: false },
  {
    key: "studioPublishedNoProduct",
    name: `${FIXTURE_PREFIX} Studio published, 상품 없음`,
    status: "published",
    is_public: true,
  },
  {
    key: "studioReadyNotSelling",
    name: `${FIXTURE_PREFIX} Studio published, 상품 구성, 판매 대기`,
    status: "published",
    is_public: true,
    withProduct: { plan: "pro", price: 10000, visible: false },
    withArtist: true,
  },
  {
    key: "studioSelling",
    name: `${FIXTURE_PREFIX} Studio published, 판매 중`,
    status: "published",
    is_public: true,
    withProduct: { plan: "pro", price: 15000, visible: true },
    withArtist: true,
  },
  {
    key: "archived",
    name: `${FIXTURE_PREFIX} archived`,
    status: "archived",
    is_public: true,
  },
];

type CreatedFixture = { id: string; shopTemplateId: string | null };

const createFixtures = async (): Promise<Record<string, CreatedFixture>> => {
  const created: Record<string, CreatedFixture> = {};

  for (const fixture of FIXTURES) {
    const now = new Date().toISOString();
    const { data: template, error: templateError } = await supabaseAdminServer
      .from("templates")
      .insert({
        name: fixture.name,
        description: "",
        thumbnail_url: "",
        template_engine: "studio",
        status: fixture.status,
        is_public: fixture.is_public,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (templateError || !template) {
      throw templateError ?? new Error("템플릿 생성 실패");
    }

    trackedTemplateIds.add(template.id);

    let shopTemplateId: string | null = null;

    if (fixture.withProduct) {
      const { data: shopTemplate, error: shopError } = await supabaseAdminServer
        .from("shop_templates")
        .insert({
          template_id: template.id,
          title: fixture.name,
          is_shop_visible: fixture.withProduct.visible,
        })
        .select("id")
        .single();

      if (shopError || !shopTemplate) throw shopError ?? new Error("상품 생성 실패");
      shopTemplateId = shopTemplate.id;

      const { error: planError } = await supabaseAdminServer.from("template_plans").insert({
        shop_template_id: shopTemplateId,
        plan: fixture.withProduct.plan,
        price: fixture.withProduct.price,
      });
      if (planError) throw planError;
    }

    if (fixture.withArtist) {
      const { error: artistLinkError } = await supabaseAdminServer
        .from("template_artists")
        .insert({
          template_id: template.id,
          artist_id: TEMIS_ARTIST_ID,
          role: "creator",
          is_primary: true,
          display_order: 0,
        });
      if (artistLinkError) throw artistLinkError;
    }

    created[fixture.key] = { id: template.id, shopTemplateId };
  }

  return created;
};

/** registry에 남아 있는 모든 템플릿을 정리한다. 개별 정리(성공 시 registry에서 제거)와 최종 안전망 역할을 겸한다. */
const deleteFixtures = async () => {
  const ids = Array.from(trackedTemplateIds);
  if (ids.length === 0) return;

  const { error } = await supabaseAdminServer.from("templates").delete().in("id", ids);
  if (error) {
    console.error("픽스처 정리 실패 — 수동 확인 필요. 아래 id를 직접 삭제하세요:", ids, error.message);
    throw error;
  }

  for (const id of ids) trackedTemplateIds.delete(id);
};

const assertNoResidueFromPriorRuns = async () => {
  // FIXTURE_PREFIX 자체는 이번 실행의 RUN_ID를 포함해 항상 비어 있는 게
  // 당연하므로, 접두사 공통부(run id 앞부분)로 과거 실행이 정리에 실패해
  // 남긴 잔여물이 있는지 함께 확인한다.
  const { count, error } = await supabaseAdminServer
    .from("templates")
    .select("id", { count: "exact", head: true })
    .ilike("name", "[hub-qa-%");
  if (error) throw error;

  if ((count ?? 0) > 0) {
    console.warn(
      `경고: 이전 실행이 정리하지 못한 [hub-qa-*] 템플릿이 ${count}건 남아 있습니다. 수동으로 확인하세요.`
    );
  }
};

(async () => {
  assertLocalSupabaseUrl();
  await assertNoResidueFromPriorRuns();

  const adminToken = await signJWT(
    { userId: "1", email: "hub-qa-admin@temis.local", role: "admin" } satisfies JWTPayload,
    "1h"
  );
  const userToken = await signJWT(
    { userId: "2", email: "hub-qa-user@temis.local", role: "user" } satisfies JWTPayload,
    "1h"
  );

  let fixtures: Record<string, CreatedFixture> = {};
  let testError: unknown;

  try {
    fixtures = await createFixtures();

    // -------------------------------------------------------------------
    // 관리자 인증
    // -------------------------------------------------------------------
    await check("미인증 요청 401", async () => {
      const res = await listTemplatesRoute(new NextRequest(`${base}/templates`));
      assert(res.status === 401, `expected 401, got ${res.status}`);
    });

    await check("일반 사용자 403", async () => {
      const res = await listTemplatesRoute(req(`${base}/templates`, userToken));
      assert(res.status === 403, `expected 403, got ${res.status}`);
    });

    await check("관리자 200", async () => {
      const res = await listTemplatesRoute(req(`${base}/templates`, adminToken));
      assert(res.status === 200, `expected 200, got ${res.status}`);
    });

    // -------------------------------------------------------------------
    // 목록 filter/count 정합성 — 직접 DB 집계와 Hub API 응답을 대조한다.
    // -------------------------------------------------------------------
    const countTemplates = async (column?: string, value?: string | boolean) => {
      let query = supabaseAdminServer
        .from("templates")
        .select("id", { count: "exact", head: true });
      if (column !== undefined) query = query.eq(column, value as never);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    };

    const totalDirect = await countTemplates();
    const legacyDirect = await countTemplates("template_engine", "legacy");
    const studioDirect = await countTemplates("template_engine", "studio");
    const generalDirect = await countTemplates("is_public", true);
    const customDirect = await countTemplates("is_public", false);

    await check("전체/엔진/판매유형 카운트가 직접 DB 집계와 일치", async () => {
      const { status, body } = await json<TemplateHubListResponse>(
        await listTemplatesRoute(req(`${base}/templates?limit=1`, adminToken))
      );
      assert(status === 200, `expected 200, got ${status}`);
      assert(body.counts.all === totalDirect, `all: ${body.counts.all} !== ${totalDirect}`);
      assert(body.counts.legacy === legacyDirect, `legacy: ${body.counts.legacy} !== ${legacyDirect}`);
      assert(body.counts.studio === studioDirect, `studio: ${body.counts.studio} !== ${studioDirect}`);
      assert(body.counts.general === generalDirect, `general: ${body.counts.general} !== ${generalDirect}`);
      assert(body.counts.custom === customDirect, `custom: ${body.counts.custom} !== ${customDirect}`);
    });

    await check("engine=studio 필터가 studio 엔진 행만 반환", async () => {
      const { body } = await json<TemplateHubListResponse>(
        await listTemplatesRoute(req(`${base}/templates?engine=studio&limit=100`, adminToken))
      );
      assert(body.pagination.total === studioDirect, `total ${body.pagination.total} !== ${studioDirect}`);
      assert(
        body.items.every((item) => item.templateEngine === "studio"),
        "studio가 아닌 행이 섞여 있다"
      );
    });

    await check("잘못된 filter 값은 400", async () => {
      const res = await listTemplatesRoute(req(`${base}/templates?engine=bogus`, adminToken));
      const body = (await res.json()) as TemplateHubErrorResponse;
      assert(res.status === 400, `expected 400, got ${res.status}`);
      assert(body.code === "INVALID_PARAM", `expected INVALID_PARAM, got ${body.code}`);
    });

    // -------------------------------------------------------------------
    // readiness reason 조합 — 04단계 문서 4절 표본 매트릭스
    // -------------------------------------------------------------------
    const findFixtureItem = async (templateId: string) => {
      const { body } = await json<TemplateHubListResponse>(
        await listTemplatesRoute(req(`${base}/templates?search=${encodeURIComponent(FIXTURE_PREFIX)}&limit=50`, adminToken))
      );
      const item = body.items.find((i) => i.id === templateId);
      if (!item) throw new Error(`fixture item ${templateId} not found in list response`);
      return item;
    };

    await check("표본: Studio draft → unconfigured, 여러 사유", async () => {
      const item = await findFixtureItem(fixtures.studioDraft.id);
      assert(item.publicationStatus === "draft", "draft여야 한다");
      assert(!item.saleReadiness.ready, "ready가 아니어야 한다");
      assert(!item.hasProduct, "상품이 없어야 한다");
      const codes = item.saleReadiness.reasons.map((r) => r.code);
      assert(codes.includes("NOT_PUBLISHED"), "NOT_PUBLISHED 포함");
      assert(codes.includes("PRODUCT_MISSING"), "PRODUCT_MISSING 포함");
    });

    await check("표본: Studio published·상품 없음 → unconfigured", async () => {
      const item = await findFixtureItem(fixtures.studioPublishedNoProduct.id);
      assert(item.publicationStatus === "published", "published여야 한다");
      assert(!item.hasProduct, "상품이 없어야 한다");
      assert(!item.saleReadiness.ready, "ready가 아니어야 한다");
      const codes = item.saleReadiness.reasons.map((r) => r.code);
      assert(codes.includes("PRODUCT_MISSING"), "PRODUCT_MISSING 포함");
      assert(codes.includes("ARTIST_MISSING"), "ARTIST_MISSING 포함");
    });

    await check("표본: Studio published·상품 구성·판매 대기 → ready", async () => {
      const item = await findFixtureItem(fixtures.studioReadyNotSelling.id);
      assert(item.hasProduct, "상품이 있어야 한다");
      assert(item.hasPurchasablePlan, "plan이 있어야 한다");
      assert(!item.isShopVisible, "판매 중이 아니어야 한다");
      assert(item.saleReadiness.ready, `ready여야 한다: ${JSON.stringify(item.saleReadiness.reasons)}`);
    });

    await check("표본: Studio published·판매 중 → selling", async () => {
      const item = await findFixtureItem(fixtures.studioSelling.id);
      assert(item.isShopVisible, "판매 중이어야 한다");
      assert(item.saleReadiness.ready, "ready여야 한다");
    });

    await check("표본: archived → NOT_PUBLISHED", async () => {
      const item = await findFixtureItem(fixtures.archived.id);
      assert(item.publicationStatus === "archived", "archived여야 한다");
      assert(!item.saleReadiness.ready, "ready가 아니어야 한다");
      assert(
        item.saleReadiness.reasons.some((r) => r.code === "NOT_PUBLISHED"),
        "NOT_PUBLISHED 포함"
      );
    });

    // -------------------------------------------------------------------
    // sales type mutation
    // -------------------------------------------------------------------
    await check("sales-type: 판매 중 맞춤 제작 전환 거부(409)", async () => {
      const res = await salesTypeRoute(
        req(`${base}/sales-type`, adminToken, { body: { salesType: "custom" }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioSelling.id }) }
      );
      const body = (await res.json()) as TemplateHubErrorResponse;
      assert(res.status === 409, `expected 409, got ${res.status}`);
      assert(body.code === "SALE_MUST_STOP_FIRST", `expected SALE_MUST_STOP_FIRST, got ${body.code}`);
    });

    await check("sales-type: 판매 대기 항목은 custom 전환 허용", async () => {
      const res = await salesTypeRoute(
        req(`${base}/sales-type`, adminToken, { body: { salesType: "custom" }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      const { body } = await json<TemplateHubItemResponse>(res as unknown as NextResponse);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(body.item.salesType === "custom", "custom으로 바뀌어야 한다");
    });

    await check("sales-type: custom → general 복구", async () => {
      const res = await salesTypeRoute(
        req(`${base}/sales-type`, adminToken, { body: { salesType: "general" }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      const { body } = await json<TemplateHubItemResponse>(res as unknown as NextResponse);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(body.item.salesType === "general", "general로 복구되어야 한다");
    });

    await check("sales-type: 잘못된 값 400", async () => {
      const res = await salesTypeRoute(
        req(`${base}/sales-type`, adminToken, { body: { salesType: "bogus" }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      assert(res.status === 400, `expected 400, got ${res.status}`);
    });

    await check("sales-type: 존재하지 않는 템플릿 404", async () => {
      const res = await salesTypeRoute(
        req(`${base}/sales-type`, adminToken, { body: { salesType: "general" }, method: "PATCH" }),
        { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) }
      );
      assert(res.status === 404, `expected 404, got ${res.status}`);
    });

    // -------------------------------------------------------------------
    // sale start/stop mutation
    // -------------------------------------------------------------------
    await check("sale: 미구성 템플릿 판매 시작 거부(409 SALE_NOT_READY + 전체 사유)", async () => {
      const res = await saleRoute(
        req(`${base}/sale`, adminToken, { body: { visible: true }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioPublishedNoProduct.id }) }
      );
      const body = (await res.json()) as TemplateHubErrorResponse;
      assert(res.status === 409, `expected 409, got ${res.status}`);
      assert(body.code === "SALE_NOT_READY", `expected SALE_NOT_READY, got ${body.code}`);
      assert((body.reasons?.length ?? 0) >= 2, "차단 사유가 여러 건이어야 한다");
    });

    await check("sale: ready 항목 판매 시작 성공", async () => {
      const res = await saleRoute(
        req(`${base}/sale`, adminToken, { body: { visible: true }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      const { body } = await json<TemplateHubItemResponse>(res as unknown as NextResponse);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(body.item.isShopVisible, "판매 중이어야 한다");
    });

    await check("sale: 판매 중지는 항상 허용", async () => {
      const res = await saleRoute(
        req(`${base}/sale`, adminToken, { body: { visible: false }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      const { body } = await json<TemplateHubItemResponse>(res as unknown as NextResponse);
      assert(res.status === 200, `expected 200, got ${res.status}`);
      assert(!body.item.isShopVisible, "판매 중지되어야 한다");
    });

    await check("sale: visible이 boolean이 아니면 400", async () => {
      const res = await saleRoute(
        req(`${base}/sale`, adminToken, { body: { visible: "yes" }, method: "PATCH" }),
        { params: Promise.resolve({ id: fixtures.studioReadyNotSelling.id }) }
      );
      assert(res.status === 400, `expected 400, got ${res.status}`);
    });

    // -------------------------------------------------------------------
    // 01단계 수정사항: 판매 상태 변경의 원자성. "판매 시작"과 "맞춤 제작
    // 전환"을 동시에 요청해도 selling+custom 불변식 위반 상태가 생기지
    // 않아야 한다. DB 함수가 최종 권위를 갖는지 검증하기 위해 실제로
    // 동시 요청을 여러 차례 반복한다.
    // -------------------------------------------------------------------
    const createConcurrencyFixture = async (label: string): Promise<CreatedFixture> => {
      const now = new Date().toISOString();
      const { data: template, error: templateError } = await supabaseAdminServer
        .from("templates")
        .insert({
          name: `${FIXTURE_PREFIX} 동시성 검증 ${label}`,
          description: "",
          thumbnail_url: "",
          template_engine: "studio",
          status: "published",
          is_public: true,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (templateError || !template) throw templateError ?? new Error("템플릿 생성 실패");
      trackedTemplateIds.add(template.id);

      const { data: shopTemplate, error: shopError } = await supabaseAdminServer
        .from("shop_templates")
        .insert({ template_id: template.id, title: `${FIXTURE_PREFIX} 동시성 검증`, is_shop_visible: false })
        .select("id")
        .single();
      if (shopError || !shopTemplate) throw shopError ?? new Error("상품 생성 실패");

      const { error: planError } = await supabaseAdminServer.from("template_plans").insert({
        shop_template_id: shopTemplate.id,
        plan: "pro",
        price: 20000,
      });
      if (planError) throw planError;

      const { error: artistLinkError } = await supabaseAdminServer.from("template_artists").insert({
        template_id: template.id,
        artist_id: TEMIS_ARTIST_ID,
        role: "creator",
        is_primary: true,
        display_order: 0,
      });
      if (artistLinkError) throw artistLinkError;

      return { id: template.id, shopTemplateId: shopTemplate.id };
    };

    const assertNoSaleInvariantViolation = async (context: string) => {
      const { data, error } = await supabaseAdminServer
        .from("shop_templates")
        .select("id, is_shop_visible, templates!inner(id, is_public, status)")
        .eq("is_shop_visible", true);
      if (error) throw error;

      const violations = (data ?? []).filter((row) => {
        const template = row.templates as unknown as { is_public: boolean; status: string } | null;
        return !template || template.is_public === false || template.status !== "published";
      });

      assert(
        violations.length === 0,
        `${context}: is_shop_visible=true인데 is_public=false 또는 status!=published인 행이 있다 (${JSON.stringify(violations)})`
      );
    };

    const CONCURRENCY_ITERATIONS = 5;

    for (let i = 0; i < CONCURRENCY_ITERATIONS; i += 1) {
      const fixture = await createConcurrencyFixture(`#${i}`);

      await check(`동시 요청 반복 ${i}: 판매 시작 vs 맞춤 제작 전환 — 불변식 유지`, async () => {
        const [saleResult, salesTypeResult] = await Promise.allSettled([
          saleRoute(
            req(`${base}/sale`, adminToken, { body: { visible: true }, method: "PATCH" }),
            { params: Promise.resolve({ id: fixture.id }) }
          ),
          salesTypeRoute(
            req(`${base}/sales-type`, adminToken, { body: { salesType: "custom" }, method: "PATCH" }),
            { params: Promise.resolve({ id: fixture.id }) }
          ),
        ]);

        for (const result of [saleResult, salesTypeResult]) {
          assert(result.status === "fulfilled", `route가 예외를 던지면 안 된다: ${JSON.stringify(result)}`);
        }

        const saleRes = saleResult as PromiseFulfilledResult<NextResponse>;
        const salesTypeRes = salesTypeResult as PromiseFulfilledResult<NextResponse>;
        assert(
          [200, 409].includes(saleRes.value.status),
          `sale 응답은 200 또는 409여야 한다: ${saleRes.value.status}`
        );
        assert(
          [200, 409].includes(salesTypeRes.value.status),
          `sales-type 응답은 200 또는 409여야 한다: ${salesTypeRes.value.status}`
        );

        await assertNoSaleInvariantViolation(`반복 ${i}`);
      });

      const { error: cleanupError } = await supabaseAdminServer
        .from("templates")
        .delete()
        .eq("id", fixture.id);
      if (cleanupError) throw cleanupError;
      trackedTemplateIds.delete(fixture.id);
    }

    // -------------------------------------------------------------------
    // 06단계 수정사항: 템플릿당 상품 1개 불변식. 상품이 없는 published
    // 템플릿에 동시 생성 요청 두 건을 보내면 하나만 성공(201)하고 나머지는
    // DB unique 제약(`shop_templates_template_id_unique`)에 막혀 409를
    // 받아야 한다.
    // -------------------------------------------------------------------
    for (let i = 0; i < CONCURRENCY_ITERATIONS; i += 1) {
      const now = new Date().toISOString();
      const { data: template, error: templateError } = await supabaseAdminServer
        .from("templates")
        .insert({
          name: `${FIXTURE_PREFIX} 상품 생성 동시성 #${i}`,
          description: "",
          thumbnail_url: "",
          template_engine: "studio",
          status: "published",
          is_public: true,
          created_at: now,
          updated_at: now,
        })
        .select("id")
        .single();
      if (templateError || !template) throw templateError ?? new Error("템플릿 생성 실패");
      trackedTemplateIds.add(template.id);

      await check(`동시 상품 생성 반복 ${i}: 하나만 성공하고 나머지는 409`, async () => {
        const shopTemplateBody = {
          template_id: template.id,
          title: `${FIXTURE_PREFIX} 동시 생성 상품`,
        };

        const results = await Promise.allSettled([
          createShopTemplateRoute(req(`${base}/shop-templates`, adminToken, { body: shopTemplateBody, method: "POST" })),
          createShopTemplateRoute(req(`${base}/shop-templates`, adminToken, { body: shopTemplateBody, method: "POST" })),
        ]);

        for (const result of results) {
          assert(result.status === "fulfilled", `route가 예외를 던지면 안 된다: ${JSON.stringify(result)}`);
        }

        const statuses = (results as PromiseFulfilledResult<NextResponse>[]).map((r) => r.value.status);
        const succeeded = statuses.filter((s) => s === 201).length;
        const conflicted = statuses.filter((s) => s === 409).length;

        assert(succeeded === 1, `정확히 하나만 201이어야 한다: ${JSON.stringify(statuses)}`);
        assert(conflicted === 1, `나머지 하나는 409여야 한다: ${JSON.stringify(statuses)}`);

        const { count, error: countError } = await supabaseAdminServer
          .from("shop_templates")
          .select("id", { count: "exact", head: true })
          .eq("template_id", template.id);
        if (countError) throw countError;
        assert(count === 1, `shop_templates 행이 정확히 1개여야 한다: ${count}`);
      });

      const { error: cleanupError } = await supabaseAdminServer
        .from("templates")
        .delete()
        .eq("id", template.id);
      if (cleanupError) throw cleanupError;
      trackedTemplateIds.delete(template.id);
    }
  } catch (error) {
    testError = error;
    throw error;
  } finally {
    try {
      await deleteFixtures();
    } catch (cleanupError) {
      // 원래 테스트가 이미 실패한 상태라면 그 실패를 정리 실패로 덮어쓰지
      // 않는다 — 다만 정리 실패 자체도 눈에 띄게 남긴다(remediation 05).
      console.error("픽스처 정리 실패:", cleanupError);
      if (!testError) throw cleanupError;
    }
  }

  console.log(`\nTemplate Hub API 회귀 테스트 통과 (${passed}건). 픽스처 정리 완료.`);
})().catch((error) => {
  console.error("FAIL:", error);
  process.exit(1);
});
