import { supabaseAdminServer as supabase } from "@/lib/supabase-admin-server";
import {
  TEMPLATE_ENGINES,
  TEMPLATE_PUBLICATION_STATUSES,
  TEMPLATE_SALES_TYPES,
  TEMPLATE_SALE_STATUSES,
  resolveTemplateSaleStatus,
  type TemplateEngine,
  type TemplateHubItem,
  type TemplateHubLinkedArtist,
  type TemplateHubListParams,
  type TemplateHubListResponse,
  type TemplatePublicationStatus,
  type TemplateSaleBlockReason,
  type TemplateSaleStatus,
  type TemplateSalesType,
} from "@/types/template-hub";

// 순수 판정 로직은 DB client를 import하지 않는 별도 모듈에 있다(remediation
// 02단계) — `scripts/check-template-hub-sale-readiness.ts`가 Supabase
// 환경변수 없이 이 규칙만 단위 테스트할 수 있게 하기 위함이다. 여기서는 mutation
// 구현에 재사용하고, 기존 소비자를 위해 그대로 re-export한다.
export {
  evaluateTemplateSaleReadiness,
  evaluateTemplateSalesTypeTransition,
  evaluateTemplateSaleVisibilityChange,
  isPurchasablePlan,
  type TemplateSaleReadinessInput,
  type TemplateSalesTypeTransitionResult,
  type TemplateSaleVisibilityChangeResult,
} from "./templateHubSaleRules";
import {
  evaluateTemplateSaleReadiness,
  evaluateTemplateSalesTypeTransition,
  evaluateTemplateSaleVisibilityChange,
  isPurchasablePlan,
} from "./templateHubSaleRules";

export const TEMPLATE_HUB_DEFAULT_LIMIT = 20;
export const TEMPLATE_HUB_MAX_LIMIT = 100;

/**
 * `saleStatus` 필터는 로열티까지 포함한 readiness 계산이 필요해 SQL만으로
 * 판정할 수 없다. 이 경우 다른 필터로 좁힌 집합을 서버에서 계산한 뒤
 * 잘라내므로, 계산 대상이 무한히 커지지 않도록 상한을 둔다.
 */
const READINESS_FILTER_SCAN_LIMIT = 1000;

// ---------------------------------------------------------------------------
// 파라미터 정규화
// ---------------------------------------------------------------------------

export class TemplateHubParamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateHubParamError";
  }
}

const parseIntParam = (
  raw: string | null,
  name: string,
  { min, max }: { min: number; max: number }
): number | undefined => {
  if (raw === null || raw.trim() === "") return undefined;

  if (!/^\d+$/.test(raw.trim())) {
    throw new TemplateHubParamError(`${name} 파라미터는 정수여야 합니다.`);
  }

  const value = Number.parseInt(raw, 10);

  if (value < min || value > max) {
    throw new TemplateHubParamError(
      `${name} 파라미터는 ${min} 이상 ${max} 이하여야 합니다.`
    );
  }

  return value;
};

const parseEnumParam = <T extends string>(
  raw: string | null,
  name: string,
  allowed: readonly T[]
): T | undefined => {
  if (raw === null || raw.trim() === "") return undefined;

  if (!allowed.includes(raw as T)) {
    throw new TemplateHubParamError(
      `${name} 파라미터는 ${allowed.join(", ")} 중 하나여야 합니다.`
    );
  }

  return raw as T;
};

const parseBooleanParam = (
  raw: string | null,
  name: string
): boolean | undefined => {
  if (raw === null || raw.trim() === "") return undefined;

  if (raw !== "true" && raw !== "false") {
    throw new TemplateHubParamError(
      `${name} 파라미터는 true 또는 false여야 합니다.`
    );
  }

  return raw === "true";
};

/** query string을 목록 파라미터로 정규화한다. 잘못된 값은 400으로 이어진다. */
export const parseTemplateHubListParams = (
  searchParams: URLSearchParams
): Required<Pick<TemplateHubListParams, "limit" | "offset">> &
  TemplateHubListParams => {
  const limit =
    parseIntParam(searchParams.get("limit"), "limit", {
      min: 1,
      max: TEMPLATE_HUB_MAX_LIMIT,
    }) ?? TEMPLATE_HUB_DEFAULT_LIMIT;

  const offset =
    parseIntParam(searchParams.get("offset"), "offset", {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
    }) ?? 0;

  const search = searchParams.get("search")?.trim() || undefined;

  return {
    limit,
    offset,
    search,
    engine: parseEnumParam(searchParams.get("engine"), "engine", TEMPLATE_ENGINES),
    publicationStatus: parseEnumParam(
      searchParams.get("publicationStatus"),
      "publicationStatus",
      TEMPLATE_PUBLICATION_STATUSES
    ),
    salesType: parseEnumParam(
      searchParams.get("salesType"),
      "salesType",
      TEMPLATE_SALES_TYPES
    ),
    saleStatus: parseEnumParam(
      searchParams.get("saleStatus"),
      "saleStatus",
      TEMPLATE_SALE_STATUSES
    ),
    hasProduct: parseBooleanParam(searchParams.get("hasProduct"), "hasProduct"),
  };
};

/**
 * PostgREST `or` 필터에 넣을 검색 조건을 만든다.
 *
 * LIKE wildcard(`%`, `_`)를 먼저 escape한 뒤 값 전체를 큰따옴표로 감싸,
 * 쉼표·괄호 같은 PostgREST 예약문자가 필터 문법을 깨지 않게 한다.
 */
export const buildSearchOrFilter = (search: string): string => {
  const escapedForLike = search.replace(/[\\%_]/g, "\\$&");
  const quoted = `"%${escapedForLike.replace(/["\\]/g, "\\$&")}%"`;

  return `name.ilike.${quoted},description.ilike.${quoted}`;
};

// ---------------------------------------------------------------------------
// 조회
// ---------------------------------------------------------------------------

type TemplateHubRow = {
  id: string;
  name: string | null;
  description: string | null;
  template_engine: string | null;
  status: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
  shop_templates:
    | Array<{
        id: string;
        is_shop_visible: boolean | null;
        template_plans:
          | Array<{
              id: string;
              plan: string | null;
              price: number | null;
              shop_template_id: string | null;
            }>
          | null;
      }>
    | null;
  template_artists:
    | Array<{
        artist_id: string;
        is_primary: boolean | null;
        display_order: number | null;
        artist: { id: string; name: string | null } | null;
      }>
    | null;
};

const TEMPLATE_HUB_SELECT = `
  id,
  name,
  description,
  template_engine,
  status,
  is_public,
  created_at,
  updated_at,
  shop_templates (
    id,
    is_shop_visible,
    template_plans (
      id,
      plan,
      price,
      shop_template_id
    )
  ),
  template_artists (
    artist_id,
    is_primary,
    display_order,
    artist:artists (
      id,
      name
    )
  )
`;

const normalizeEngine = (value: string | null): TemplateEngine =>
  value === "studio" ? "studio" : "legacy";

const normalizePublicationStatus = (
  value: string | null
): TemplatePublicationStatus =>
  value === "published" || value === "archived" ? value : "draft";

const normalizeLinkedArtists = (
  row: TemplateHubRow
): TemplateHubLinkedArtist[] =>
  (row.template_artists ?? [])
    .slice()
    .sort((a, b) => {
      const aPrimary = a.is_primary ?? false;
      const bPrimary = b.is_primary ?? false;
      if (aPrimary !== bPrimary) return aPrimary ? -1 : 1;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    })
    .map((relation) => ({
      id: relation.artist_id,
      name: relation.artist?.name?.trim() || "이름 없는 작가",
      isPrimary: relation.is_primary ?? false,
    }));

/**
 * 각 (템플릿, 작가) 쌍에 적용 가능한 로열티 규칙이 있는지 조회한다.
 *
 * 우선순위는 템플릿 전용 규칙 → 작가 기본 규칙(`template_id is null`)이다.
 * 다른 템플릿에만 걸린 규칙은 계산에 넣지 않는다.
 */
const fetchRoyaltyCoverage = async (
  rows: TemplateHubRow[]
): Promise<Map<string, Set<string>>> => {
  const coverage = new Map<string, Set<string>>();
  for (const row of rows) {
    coverage.set(row.id, new Set<string>());
  }

  const artistIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        (row.template_artists ?? []).map((relation) => relation.artist_id)
      )
    )
  );

  if (artistIds.length === 0) {
    return coverage;
  }

  const templateIds = rows.map((row) => row.id);

  const { data, error } = await supabase
    .from("artist_royalty_rules")
    .select("artist_id, template_id")
    .in("artist_id", artistIds);

  if (error) throw error;

  const templateIdSet = new Set(templateIds);
  const defaultRuleArtists = new Set<string>();
  const templateRuleArtists = new Map<string, Set<string>>();

  for (const rule of data ?? []) {
    if (rule.template_id === null) {
      defaultRuleArtists.add(rule.artist_id);
      continue;
    }

    if (!templateIdSet.has(rule.template_id)) continue;

    const bucket = templateRuleArtists.get(rule.template_id) ?? new Set<string>();
    bucket.add(rule.artist_id);
    templateRuleArtists.set(rule.template_id, bucket);
  }

  for (const row of rows) {
    const covered = coverage.get(row.id);
    if (!covered) continue;

    const templateRules = templateRuleArtists.get(row.id);

    for (const relation of row.template_artists ?? []) {
      if (
        templateRules?.has(relation.artist_id) ||
        defaultRuleArtists.has(relation.artist_id)
      ) {
        covered.add(relation.artist_id);
      }
    }
  }

  return coverage;
};

const toHubItem = (
  row: TemplateHubRow,
  artistIdsWithRoyalty: ReadonlySet<string>
): TemplateHubItem => {
  // shop_templates는 템플릿당 한 건 사용한다. 여러 건이 있어도 첫 행을 기준으로
  // 삼아 관계 데이터 때문에 목록이 깨지지 않게 한다.
  const shopTemplate = row.shop_templates?.[0] ?? null;
  const shopProductId = shopTemplate?.id ?? null;

  const purchasablePlanCount = shopProductId
    ? (shopTemplate?.template_plans ?? []).filter((plan) =>
        isPurchasablePlan(plan, shopProductId)
      ).length
    : 0;

  const linkedArtists = normalizeLinkedArtists(row);
  const publicationStatus = normalizePublicationStatus(row.status);
  const salesType: TemplateSalesType = row.is_public ? "general" : "custom";

  const saleReadiness = evaluateTemplateSaleReadiness({
    publicationStatus,
    salesType,
    shopProductId,
    purchasablePlanCount,
    linkedArtists,
    artistIdsWithRoyalty,
  });

  return {
    id: row.id,
    name: row.name ?? "",
    description: row.description ?? "",
    templateEngine: normalizeEngine(row.template_engine),
    publicationStatus,
    salesType,
    shopProductId,
    hasProduct: shopProductId !== null,
    hasPurchasablePlan: purchasablePlanCount > 0,
    isShopVisible: shopTemplate?.is_shop_visible ?? false,
    linkedArtists,
    saleReadiness,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Supabase query builder 중 이 서비스가 사용하는 필터 메서드만 추린 최소 형태.
 *
 * 메서드 축약 문법을 쓰면 TypeScript가 인자를 이변성(bivariant)으로 검사하므로,
 * builder마다 다른 `eq` 값 타입을 그대로 받으면서도 `select` 결과 타입을 잃지
 * 않는다.
 */
type FilterableQuery<T> = {
  or(filter: string): T;
  eq(column: string, value: string | boolean): T;
  is(column: string, value: null): T;
};

const applySqlFilters = <T extends FilterableQuery<T>>(
  query: T,
  params: TemplateHubListParams
): T => {
  let next = query;

  if (params.search) {
    next = next.or(buildSearchOrFilter(params.search));
  }
  if (params.engine) {
    next = next.eq("template_engine", params.engine);
  }
  if (params.publicationStatus) {
    next = next.eq("status", params.publicationStatus);
  }
  if (params.salesType) {
    next = next.eq("is_public", params.salesType === "general");
  }
  if (params.saleStatus === "selling") {
    next = next.eq("shop_templates.is_shop_visible", true);
  }
  // `hasProduct=true`는 select의 inner join이 담당한다. `false`는 연결된
  // shop_templates가 없는 템플릿을 고르는 embedded null 필터를 사용한다.
  if (params.hasProduct === false) {
    next = next.is("shop_templates", null);
  }

  return next;
};

/**
 * `shop_templates` 컬럼을 조건으로 쓰거나 상품 보유를 요구하는 필터는 해당
 * 관계를 inner join으로 바꿔야 상품이 없는 템플릿이 제외된다.
 */
const needsShopTemplateInnerJoin = (params: TemplateHubListParams): boolean =>
  params.saleStatus === "selling" || params.hasProduct === true;

const countWithSearch = async (
  search: string | undefined,
  narrow?: { column: string; value: string | boolean }
): Promise<number> => {
  let query = supabase
    .from("templates")
    .select("id", { count: "exact", head: true });

  if (search) query = query.or(buildSearchOrFilter(search));
  if (narrow) query = query.eq(narrow.column, narrow.value);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
};

/**
 * facet 카운트는 검색어만 반영하고 나머지 필터는 반영하지 않는다. 필터를 바꿔도
 * 각 선택지의 규모를 볼 수 있게 하기 위함이며, 검색어가 없으면 전체 기준
 * 집계와 같아진다.
 */
const fetchCounts = async (
  search: string | undefined
): Promise<TemplateHubListResponse["counts"]> => {
  const sellingQuery = () => {
    let query = supabase
      .from("templates")
      .select("id, shop_templates!inner(id)", { count: "exact", head: true })
      .eq("shop_templates.is_shop_visible", true);

    if (search) query = query.or(buildSearchOrFilter(search));
    return query;
  };

  const [all, legacy, studio, general, custom, selling] = await Promise.all([
    countWithSearch(search),
    countWithSearch(search, { column: "template_engine", value: "legacy" }),
    countWithSearch(search, { column: "template_engine", value: "studio" }),
    countWithSearch(search, { column: "is_public", value: true }),
    countWithSearch(search, { column: "is_public", value: false }),
    (async () => {
      const { count, error } = await sellingQuery();
      if (error) throw error;
      return count ?? 0;
    })(),
  ]);

  return { all, legacy, studio, general, custom, selling };
};

/**
 * `saleStatus`가 readiness에 의존하는지 여부.
 *
 * `selling`은 `shop_templates.is_shop_visible`만 보면 되므로 SQL로 처리할 수
 * 있지만, 나머지는 로열티까지 계산해야 판정된다.
 */
const needsReadinessScan = (saleStatus?: TemplateSaleStatus): boolean =>
  saleStatus !== undefined && saleStatus !== "selling";

const buildSelect = (params: TemplateHubListParams): string =>
  needsShopTemplateInnerJoin(params)
    ? TEMPLATE_HUB_SELECT.replace("shop_templates (", "shop_templates!inner (")
    : TEMPLATE_HUB_SELECT;

const fetchRows = async (
  params: TemplateHubListParams,
  range: { from: number; to: number } | null
): Promise<TemplateHubRow[]> => {
  let query = applySqlFilters(
    supabase.from("templates").select(buildSelect(params)),
    params
  );

  // 같은 updated_at을 가진 행이 페이지마다 뒤바뀌지 않도록 id를 보조 정렬 기준으로 쓴다.
  query = query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });

  query = range
    ? query.range(range.from, range.to)
    : query.limit(READINESS_FILTER_SCAN_LIMIT);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as unknown as TemplateHubRow[];
};

const countRows = async (params: TemplateHubListParams): Promise<number> => {
  const select = needsShopTemplateInnerJoin(params)
    ? "id, shop_templates!inner(id)"
    : "id, shop_templates(id)";

  const { count, error } = await applySqlFilters(
    supabase.from("templates").select(select, { count: "exact", head: true }),
    params
  );

  if (error) throw error;
  return count ?? 0;
};

const buildItems = async (rows: TemplateHubRow[]): Promise<TemplateHubItem[]> => {
  if (rows.length === 0) return [];

  const royaltyCoverage = await fetchRoyaltyCoverage(rows);

  return rows.map((row) =>
    toHubItem(row, royaltyCoverage.get(row.id) ?? new Set<string>())
  );
};

export const listTemplateHubTemplates = async (
  params: TemplateHubListParams & { limit: number; offset: number }
): Promise<TemplateHubListResponse> => {
  const counts = await fetchCounts(params.search);

  // readiness에 의존하지 않는 필터 조합은 SQL 페이지네이션을 그대로 사용한다.
  if (!needsReadinessScan(params.saleStatus)) {
    const [total, rows] = await Promise.all([
      countRows(params),
      fetchRows(params, {
        from: params.offset,
        to: params.offset + params.limit - 1,
      }),
    ]);

    return {
      items: await buildItems(rows),
      pagination: { limit: params.limit, offset: params.offset, total },
      counts,
    };
  }

  // readiness 기반 필터는 SQL로 좁힌 집합 전체를 계산한 뒤 잘라낸다.
  const scannedRows = await fetchRows(params, null);
  const scannedItems = await buildItems(scannedRows);

  const filtered = scannedItems.filter(
    (item) => resolveTemplateSaleStatus(item) === params.saleStatus
  );

  return {
    items: filtered.slice(params.offset, params.offset + params.limit),
    pagination: {
      limit: params.limit,
      offset: params.offset,
      total: filtered.length,
    },
    counts,
  };
};

/** 단건 Hub item. mutation 응답과 readiness 재검증에 사용한다. */
export const getTemplateHubItem = async (
  templateId: string
): Promise<TemplateHubItem | null> => {
  const { data, error } = await supabase
    .from("templates")
    .select(TEMPLATE_HUB_SELECT)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as TemplateHubRow;
  const items = await buildItems([row]);

  return items[0] ?? null;
};

// ---------------------------------------------------------------------------
// mutation (04단계)
//
// 여기서는 새 판정 로직을 만들지 않는다. 03단계의
// evaluateTemplateSalesTypeTransition / evaluateTemplateSaleVisibilityChange를
// 그대로 재사용하고, 서버가 판정한 결과만 canonical 테이블에 반영한다.
// ---------------------------------------------------------------------------

export class TemplateHubNotFoundError extends Error {
  constructor(message = "템플릿을 찾을 수 없습니다.") {
    super(message);
    this.name = "TemplateHubNotFoundError";
  }
}

export class TemplateHubSaleMustStopFirstError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateHubSaleMustStopFirstError";
  }
}

export class TemplateHubSaleNotReadyError extends Error {
  readonly reasons: TemplateSaleBlockReason[];

  constructor(reasons: TemplateSaleBlockReason[]) {
    super("판매를 시작하려면 먼저 아래 조건을 해결해 주세요.");
    this.name = "TemplateHubSaleNotReadyError";
    this.reasons = reasons;
  }
}

/** `template_hub_set_sales_type`/`template_hub_set_sale_visibility` RPC가 던지는 커스텀 SQLSTATE. */
const TEMPLATE_HUB_RPC_ERRCODE = {
  TEMPLATE_NOT_FOUND: "X0001",
  SALE_MUST_STOP_FIRST: "X0002",
  SALE_NOT_READY: "X0003",
} as const;

const rpcErrorCode = (error: { code?: string | null } | null): string | null =>
  error?.code ?? null;

/**
 * 일반 판매/맞춤 제작 분류를 변경한다.
 *
 * 최종 판정과 쓰기는 `template_hub_set_sales_type` DB 함수가 하나의 트랜잭션
 * 안에서 수행한다(01단계 수정사항). 여기서는 애플리케이션 판정 함수로 빠른
 * 실패만 시도하고, DB 함수의 응답을 최종 권위로 삼아 동일한 예외 계약으로
 * 변환한다 — 동시 요청이 조회 이후 상태를 바꿨더라도 DB가 다시 거부한다.
 */
export const updateTemplateSalesType = async (
  templateId: string,
  salesType: TemplateSalesType
): Promise<TemplateHubItem> => {
  const current = await getTemplateHubItem(templateId);
  if (!current) throw new TemplateHubNotFoundError();

  const decision = evaluateTemplateSalesTypeTransition({
    nextSalesType: salesType,
    isShopVisible: current.isShopVisible,
  });

  if (!decision.allowed) {
    throw new TemplateHubSaleMustStopFirstError(decision.message);
  }

  const { error } = await supabase.rpc("template_hub_set_sales_type", {
    p_template_id: templateId,
    p_sales_type: salesType,
  });

  if (error) {
    const code = rpcErrorCode(error);
    if (code === TEMPLATE_HUB_RPC_ERRCODE.TEMPLATE_NOT_FOUND) {
      throw new TemplateHubNotFoundError();
    }
    if (code === TEMPLATE_HUB_RPC_ERRCODE.SALE_MUST_STOP_FIRST) {
      throw new TemplateHubSaleMustStopFirstError(
        error.message || "맞춤 제작으로 변경하려면 먼저 판매를 중지해 주세요."
      );
    }
    throw error;
  }

  const updated = await getTemplateHubItem(templateId);
  if (!updated) throw new TemplateHubNotFoundError();
  return updated;
};

/**
 * 판매 시작·중지.
 *
 * 최종 판정과 쓰기는 `template_hub_set_sale_visibility` DB 함수가 하나의
 * 트랜잭션 안에서 수행한다(01단계 수정사항). 애플리케이션의
 * `evaluateTemplateSaleVisibilityChange`로 먼저 빠르게 걸러내되, DB가 다시
 * 거부하면(조회 이후 조건이 바뀐 경우) 그 시점의 최신 상태를 다시 조회해
 * 상세 사유(`reasons`)를 재계산한다 — DB는 최종 허용 여부만 판정하고, 사용자
 * 대면 사유 메시지는 기존 TS 판정 로직을 그대로 재사용한다.
 */
export const updateTemplateSaleVisibility = async (
  templateId: string,
  visible: boolean
): Promise<TemplateHubItem> => {
  const current = await getTemplateHubItem(templateId);
  if (!current) throw new TemplateHubNotFoundError();

  const decision = evaluateTemplateSaleVisibilityChange({
    requestedVisible: visible,
    readiness: current.saleReadiness,
  });

  if (!decision.allowed) {
    throw new TemplateHubSaleNotReadyError(decision.reasons);
  }

  const { error } = await supabase.rpc("template_hub_set_sale_visibility", {
    p_template_id: templateId,
    p_visible: visible,
  });

  if (error) {
    const code = rpcErrorCode(error);
    if (code === TEMPLATE_HUB_RPC_ERRCODE.TEMPLATE_NOT_FOUND) {
      throw new TemplateHubNotFoundError();
    }
    if (code === TEMPLATE_HUB_RPC_ERRCODE.SALE_NOT_READY) {
      const latest = await getTemplateHubItem(templateId);
      throw new TemplateHubSaleNotReadyError(
        latest?.saleReadiness.reasons ?? []
      );
    }
    throw error;
  }

  const updated = await getTemplateHubItem(templateId);
  if (!updated) throw new TemplateHubNotFoundError();
  return updated;
};
