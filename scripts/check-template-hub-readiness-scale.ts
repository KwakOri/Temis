/**
 * Template Hub remediation 03: readiness 필터 1,000건 상한 제거 검증.
 *
 * 과거에는 `saleStatus=ready|blocked|unconfigured` 필터가 서버에서 최대
 * 1,000건만 읽어 메모리에서 계산했다. 대상이 1,000건을 넘으면 뒤쪽 행이
 * 사라지고 count/페이지네이션도 실제보다 작게 나왔다. 이 스크립트는 1,205건
 * 이상의 synthetic 템플릿을 만들어 그 상한을 실제로 넘긴 뒤, 목록 API가
 * DB view(`template_hub_list`) 기준으로 여전히 정확한 필터·count·페이지네이션을
 * 내는지 검증한다.
 *
 * 무거운 검증(1,200여 건 insert/delete)이라 기본 Hub API 회귀 스크립트와
 * 분리했다. 모든 synthetic 템플릿은 `[hub-scale-qa]` 접두사를 쓰고, finally에서
 * 전부 삭제한다.
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import type { JWTPayload } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { GET as listTemplatesRoute } from "../src/app/api/admin/template-hub/templates/route";
import type { TemplateHubListResponse } from "../src/types/template-hub";

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
const FIXTURE_PREFIX = "[hub-scale-qa]";
const UNCONFIGURED_COUNT = 1205;

const base = "http://127.0.0.1/hub-readiness-scale-check";

const req = (url: string, token: string): NextRequest =>
  new NextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
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
// synthetic 픽스처
// ---------------------------------------------------------------------------

const createdTemplateIds: string[] = [];

const insertUnconfiguredBatch = async (count: number, offset: number): Promise<string[]> => {
  const now = new Date().toISOString();
  const rows = Array.from({ length: count }, (_, i) => {
    const n = offset + i;
    return {
      name: `${FIXTURE_PREFIX} unconfigured #${n}`,
      description: "",
      thumbnail_url: "",
      template_engine: n % 2 === 0 ? "studio" : "legacy",
      status: (["draft", "published", "archived"] as const)[n % 3],
      is_public: n % 2 === 0,
      created_at: now,
      updated_at: now,
    };
  });

  const { data, error } = await supabaseAdminServer.from("templates").insert(rows).select("id");
  if (error) throw error;
  return (data ?? []).map((row) => row.id);
};

type ConfiguredSpec = {
  label: string;
  visible: boolean;
  linkArtist: boolean;
};

const createConfiguredFixture = async (spec: ConfiguredSpec): Promise<string> => {
  const now = new Date().toISOString();
  const { data: template, error: templateError } = await supabaseAdminServer
    .from("templates")
    .insert({
      name: `${FIXTURE_PREFIX} ${spec.label}`,
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

  const { data: shopTemplate, error: shopError } = await supabaseAdminServer
    .from("shop_templates")
    .insert({
      template_id: template.id,
      title: `${FIXTURE_PREFIX} ${spec.label}`,
      is_shop_visible: spec.visible,
    })
    .select("id")
    .single();
  if (shopError || !shopTemplate) throw shopError ?? new Error("상품 생성 실패");

  const { error: planError } = await supabaseAdminServer.from("template_plans").insert({
    shop_template_id: shopTemplate.id,
    plan: "pro",
    price: 10000,
  });
  if (planError) throw planError;

  if (spec.linkArtist) {
    const { error: artistLinkError } = await supabaseAdminServer.from("template_artists").insert({
      template_id: template.id,
      artist_id: TEMIS_ARTIST_ID,
      role: "creator",
      is_primary: true,
      display_order: 0,
    });
    if (artistLinkError) throw artistLinkError;
  }

  return template.id;
};

const deleteAllFixtures = async () => {
  if (createdTemplateIds.length === 0) return;
  // id 목록을 `in(...)` 쿼리 파라미터로 보내면 수백~천 건 규모에서 URI 길이
  // 제한에 걸린다. 모든 fixture가 공통 접두사를 쓰므로 이름 패턴으로 한 번에
  // 지운다.
  const { error } = await supabaseAdminServer
    .from("templates")
    .delete()
    .ilike("name", `%${FIXTURE_PREFIX}%`);
  if (error) {
    console.error("픽스처 정리 실패 — 수동 확인 필요. 접두사:", FIXTURE_PREFIX, error.message);
    throw error;
  }
};

(async () => {
  assertLocalSupabaseUrl();

  const adminToken = await signJWT(
    { userId: "1", email: "hub-scale-qa-admin@temis.local", role: "admin" } satisfies JWTPayload,
    "1h"
  );

  try {
    console.log(`  준비: unconfigured 템플릿 ${UNCONFIGURED_COUNT}건 생성 중...`);
    const batchSize = 200;
    for (let offset = 0; offset < UNCONFIGURED_COUNT; offset += batchSize) {
      const count = Math.min(batchSize, UNCONFIGURED_COUNT - offset);
      const ids = await insertUnconfiguredBatch(count, offset);
      createdTemplateIds.push(...ids);
    }
    assert(
      createdTemplateIds.length === UNCONFIGURED_COUNT,
      `unconfigured 템플릿이 ${UNCONFIGURED_COUNT}건 생성되어야 한다: ${createdTemplateIds.length}`
    );

    const readyIds = await Promise.all(
      [0, 1, 2].map((i) =>
        createConfiguredFixture({ label: `ready #${i}`, visible: false, linkArtist: true })
      )
    );
    createdTemplateIds.push(...readyIds);

    const blockedIds = await Promise.all(
      [0, 1, 2].map((i) =>
        createConfiguredFixture({ label: `blocked #${i}`, visible: false, linkArtist: false })
      )
    );
    createdTemplateIds.push(...blockedIds);

    const sellingIds = await Promise.all(
      [0, 1].map((i) =>
        createConfiguredFixture({ label: `selling #${i}`, visible: true, linkArtist: true })
      )
    );
    createdTemplateIds.push(...sellingIds);

    console.log(`  준비 완료: 총 ${createdTemplateIds.length}건`);

    const search = encodeURIComponent(FIXTURE_PREFIX);

    const directCount = async (saleStatus: string): Promise<number> => {
      const { count, error } = await supabaseAdminServer
        .from("template_hub_list")
        .select("id", { count: "exact", head: true })
        .eq("sale_status", saleStatus)
        .ilike("name", `%${FIXTURE_PREFIX}%`);
      if (error) throw error;
      return count ?? 0;
    };

    // -------------------------------------------------------------------
    // saleStatus별 전체 건수가 1,000건 상한 없이 DB 직접 집계와 일치하는지
    // -------------------------------------------------------------------
    await check("unconfigured 총 건수가 1,000건 초과 후보 전체를 반영", async () => {
      const directTotal = await directCount("unconfigured");
      assert(directTotal === UNCONFIGURED_COUNT, `직접 집계가 ${UNCONFIGURED_COUNT}여야 한다: ${directTotal}`);

      const { status, body } = await json<TemplateHubListResponse>(
        await listTemplatesRoute(
          req(`${base}/templates?search=${search}&saleStatus=unconfigured&limit=1`, adminToken)
        )
      );
      assert(status === 200, `expected 200, got ${status}`);
      assert(
        body.pagination.total === UNCONFIGURED_COUNT,
        `pagination.total(${body.pagination.total})이 직접 집계(${UNCONFIGURED_COUNT})와 같아야 한다 — 1,000건 상한이 남아 있으면 이 값이 작게 나온다`
      );
    });

    await check("ready/blocked/selling 총 건수도 정확", async () => {
      for (const [status, expected] of [
        ["ready", 3],
        ["blocked", 3],
        ["selling", 2],
      ] as const) {
        const { body } = await json<TemplateHubListResponse>(
          await listTemplatesRoute(
            req(`${base}/templates?search=${search}&saleStatus=${status}&limit=1`, adminToken)
          )
        );
        assert(
          body.pagination.total === expected,
          `saleStatus=${status} total은 ${expected}이어야 한다: ${body.pagination.total}`
        );
      }
    });

    // -------------------------------------------------------------------
    // 페이지네이션: 첫 페이지 / 중간(50번째) 페이지 / 마지막 페이지 / 범위 밖 offset
    // -------------------------------------------------------------------
    const PAGE_LIMIT = 20;
    const totalPages = Math.ceil(UNCONFIGURED_COUNT / PAGE_LIMIT);
    const lastPageIndex = totalPages - 1; // 0-based
    const lastPageOffset = lastPageIndex * PAGE_LIMIT;
    const lastPageSize = UNCONFIGURED_COUNT - lastPageOffset;

    const fetchPage = async (offset: number) =>
      json<TemplateHubListResponse>(
        await listTemplatesRoute(
          req(
            `${base}/templates?search=${search}&saleStatus=unconfigured&limit=${PAGE_LIMIT}&offset=${offset}`,
            adminToken
          )
        )
      );

    await check("첫 페이지: 정확히 limit만큼 반환하고 total 유지", async () => {
      const { body } = await fetchPage(0);
      assert(body.items.length === PAGE_LIMIT, `items.length(${body.items.length}) !== ${PAGE_LIMIT}`);
      assert(body.pagination.total === UNCONFIGURED_COUNT, `total(${body.pagination.total}) !== ${UNCONFIGURED_COUNT}`);
      assert(
        body.items.every((item) => !item.hasProduct && !item.saleReadiness.ready),
        "모든 항목이 unconfigured 조건(상품 없음)을 만족해야 한다"
      );
    });

    await check("52번째 페이지: 옛 1,000건 상한을 넘는 offset에서도 정상 반환", async () => {
      const offset = 51 * PAGE_LIMIT; // 1-indexed 52번째 페이지, offset=1020
      assert(offset > 1000, "이 테스트는 옛 1,000건 상한을 넘는 offset이어야 의미가 있다");
      const { body } = await fetchPage(offset);
      assert(body.items.length === PAGE_LIMIT, `items.length(${body.items.length}) !== ${PAGE_LIMIT}`);
      assert(body.pagination.total === UNCONFIGURED_COUNT, `total(${body.pagination.total}) !== ${UNCONFIGURED_COUNT}`);
    });

    await check("마지막 페이지: 나머지 건수만큼만 반환", async () => {
      const { body } = await fetchPage(lastPageOffset);
      assert(
        body.items.length === lastPageSize,
        `마지막 페이지 items.length(${body.items.length}) !== ${lastPageSize}`
      );
      assert(body.pagination.total === UNCONFIGURED_COUNT, `total(${body.pagination.total}) !== ${UNCONFIGURED_COUNT}`);
    });

    await check("범위 밖 offset: 빈 배열이지만 total은 유지", async () => {
      const { status, body } = await fetchPage(UNCONFIGURED_COUNT + 10_000);
      assert(status === 200, `expected 200, got ${status}`);
      assert(body.items.length === 0, `items가 비어 있어야 한다: ${body.items.length}`);
      assert(body.pagination.total === UNCONFIGURED_COUNT, `total(${body.pagination.total}) !== ${UNCONFIGURED_COUNT}`);
    });

    // -------------------------------------------------------------------
    // 다른 필터(검색어 + saleStatus)와 결합해도 정확한지
    // -------------------------------------------------------------------
    await check("search + saleStatus 결합 시 결과 정확", async () => {
      const { body } = await json<TemplateHubListResponse>(
        await listTemplatesRoute(
          req(
            `${base}/templates?search=${encodeURIComponent(`${FIXTURE_PREFIX} ready`)}&saleStatus=ready&limit=100`,
            adminToken
          )
        )
      );
      assert(body.pagination.total === 3, `total은 3이어야 한다: ${body.pagination.total}`);
      assert(
        body.items.every((item) => item.saleReadiness.ready && !item.isShopVisible),
        "모든 항목이 ready 조건을 만족해야 한다"
      );
    });
  } finally {
    console.log(`  정리: ${createdTemplateIds.length}건 삭제 중...`);
    await deleteAllFixtures();

    const { count: remaining, error: remainingError } = await supabaseAdminServer
      .from("templates")
      .select("id", { count: "exact", head: true })
      .ilike("name", `%${FIXTURE_PREFIX}%`);
    if (remainingError) throw remainingError;
    assert(remaining === 0, `정리 후 잔여 fixture가 없어야 한다: ${remaining}`);
  }

  console.log(`\nTemplate Hub readiness 대용량 검증 통과 (${passed}건). 픽스처 정리 완료.`);
})().catch((error) => {
  console.error("FAIL:", error);
  process.exit(1);
});
