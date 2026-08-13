import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { GET as userTemplatesGET } from "../src/app/api/user/templates/route";
import { GET as templateAccessGET } from "../src/app/api/template-access/route";
import {
  GET as runtimeGET,
  PUT as runtimePUT,
} from "../src/app/api/user/templates/[id]/runtime/route";
import { POST as purchaseRequestPOST } from "../src/app/api/template-purchase-requests/route";
import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";

const FIXTURE_PREFIX = "[01 baseline] user-template-ui";

const ADMIN_USER_ID = 9190101;
const BUYER_USER_ID = 9190102;
const ARTIST_USER_ID = 9190103;
const NO_ACCESS_USER_ID = 9190104;

const ADMIN_EMAIL = "user-template-ui-baseline-admin@temis.local";
const BUYER_EMAIL = "user-template-ui-baseline-buyer@temis.local";
const ARTIST_EMAIL = "user-template-ui-baseline-artist@temis.local";
const NO_ACCESS_EMAIL = "user-template-ui-baseline-no-access@temis.local";

const FIXTURE_USER_IDS = [
  ADMIN_USER_ID,
  BUYER_USER_ID,
  ARTIST_USER_ID,
  NO_ACCESS_USER_ID,
];

const routeBaseUrl = "http://127.0.0.1/user-template-ui-baseline";

interface DbError {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

type DbQuery<T = unknown> = PromiseLike<DbResult<T>> & {
  delete(): DbQuery<T>;
  eq(column: string, value: unknown): DbQuery<T>;
  in(column: string, values: unknown[]): DbQuery<T>;
  insert(value: unknown): DbQuery<T>;
  like(column: string, pattern: string): DbQuery<T>;
  limit(count: number): DbQuery<T>;
  maybeSingle(): Promise<DbResult<T | null>>;
  order(column: string, options?: { ascending?: boolean }): DbQuery<T>;
  select(columns?: string): DbQuery<T>;
  single(): Promise<DbResult<T>>;
  update(value: unknown): DbQuery<T>;
  upsert(value: unknown, options?: { onConflict?: string }): DbQuery<T>;
};

type DbClient = {
  from<T = unknown>(table: string): DbQuery<T>;
  rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<DbResult<T>>;
};

const db = supabaseAdminServer as unknown as DbClient;

type RouteContext = { params: Promise<{ id: string }> };
type RuntimeRouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

type TemplateSummary = {
  id: string;
  name: string;
  thumbnail_url: string;
  template_engine: "legacy" | "studio" | string;
  template_kind: "timetable" | "thumbnail" | null;
  status: "draft" | "published" | "archived" | string;
  use_href: string;
};

type UserTemplateRow = {
  templates: TemplateSummary;
};

type UserTemplatesResponse = {
  purchase_templates: UserTemplateRow[];
  artist_templates: UserTemplateRow[];
  total_purchase: number;
  total_artist: number;
  total: number;
};

type Fixture = {
  legacyTemplateId: string;
  timetableTemplateId: string;
  thumbnailTemplateId: string;
  draftTemplateId: string;
  archivedTemplateId: string;
  artistTemplateId: string;
  legacyPlanId: string;
  artistPlanId: string;
  buyerArtistId: string;
  artistProfileId: string;
  timetableDocument: StudioTemplateDocument;
  thumbnailDocument: StudioTemplateDocument;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function formatDbError(error: DbError | null): string {
  if (!error) return "unknown database error";
  return `${error.code ? `[${error.code}] ` : ""}${error.message}`;
}

function requireNoDbError(
  result: { error: DbError | null },
  label: string,
): void {
  if (result.error) {
    throw new Error(`${label}: ${formatDbError(result.error)}`);
  }
}

function requireData<T>(result: DbResult<T>, label: string): T {
  requireNoDbError(result, label);
  if (result.data === null) throw new Error(`${label}: no data returned`);
  return result.data;
}

function assertLocalSupabaseUrl(): void {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run user-template UI baseline against a non-local Supabase URL.",
    );
  }
}

async function getRows<T>(
  query: DbQuery<unknown>,
  label: string,
): Promise<T[]> {
  const result = await query;
  requireNoDbError(result, label);
  if (!result.data) return [];
  return Array.isArray(result.data) ? (result.data as T[]) : [result.data as T];
}

async function deleteWhereIn(
  table: string,
  column: string,
  values: unknown[],
): Promise<void> {
  if (values.length === 0) return;
  const result = await db.from(table).delete().in(column, values);
  requireNoDbError(result, `cleanup ${table}.${column}`);
}

async function upsertFixtureUser(
  id: number,
  email: string,
  role: "admin" | "user",
): Promise<void> {
  const now = new Date().toISOString();
  const result = await db.from("users").upsert(
    {
      id,
      created_at: now,
      updated_at: now,
      name: `${FIXTURE_PREFIX} ${role} ${id}`,
      email,
      password: "fixture-only",
      role,
    },
    { onConflict: "id" },
  );
  requireNoDbError(result, `upsert fixture user ${id}`);
}

async function insertTemplate(input: {
  name: string;
  templateEngine: "legacy" | "studio";
  templateKind: "timetable" | "thumbnail" | null;
  status: "draft" | "published" | "archived";
  isPublic?: boolean;
  createdBy: number;
}): Promise<string> {
  const row = requireData(
    await db
      .from("templates")
      .insert({
        name: input.name,
        description: `${FIXTURE_PREFIX} fixture`,
        thumbnail_url: "",
        template_engine: input.templateEngine,
        template_kind: input.templateKind,
        status: input.status,
        is_public: input.isPublic ?? true,
        created_by: input.createdBy,
      })
      .select("id")
      .single(),
    `insert template ${input.name}`,
  ) as { id: string };
  return row.id;
}

async function insertArtist(userId: number, suffix: string): Promise<string> {
  const row = requireData(
    await db
      .from("artists")
      .insert({
        name: `${FIXTURE_PREFIX} artist ${suffix}`,
        slug: `user-template-ui-baseline-${suffix}`,
        user_id: userId,
        is_active: true,
      })
      .select("id")
      .single(),
    `insert artist ${suffix}`,
  ) as { id: string };
  return row.id;
}

async function grantAccess(templateId: string, userId: number): Promise<void> {
  const result = await db.from("template_access").insert({
    template_id: templateId,
    user_id: userId,
    access_level: "read",
    granted_by: ADMIN_USER_ID,
  });
  requireNoDbError(result, `grant access ${templateId}/${userId}`);
}

async function insertShopProductWithPlan(
  templateId: string,
  plan: "lite" | "pro",
): Promise<{ shopTemplateId: string; planId: string }> {
  const shopTemplate = requireData(
    await db
      .from("shop_templates")
      .insert({
        template_id: templateId,
        title: `${FIXTURE_PREFIX} product`,
        is_shop_visible: true,
      })
      .select("id")
      .single(),
    `insert shop product ${templateId}`,
  ) as { id: string };

  const planRow = requireData(
    await db
      .from("template_plans")
      .insert({
        shop_template_id: shopTemplate.id,
        plan,
        price: plan === "pro" ? 5000 : 1000,
      })
      .select("id")
      .single(),
    `insert plan ${templateId}`,
  ) as { id: string };

  return { shopTemplateId: shopTemplate.id, planId: planRow.id };
}

function createThumbnailFixtureDocument(): StudioTemplateDocument {
  return {
    schema: "studio_template_document",
    version: 7,
    metadata: {
      editor: "template-studio",
      kind: "thumbnail",
      name: `${FIXTURE_PREFIX} thumbnail document`,
      description: "Minimal thumbnail runtime fixture.",
    },
    canvas: {
      width: 1200,
      height: 630,
      background: "#ffffff",
    },
    graph: {
      rootNodeIds: [],
      nodes: {},
    },
    inputs: {},
    styles: {},
    assets: {},
    domains: {
      thumbnail: {
        version: 1,
        export: {
          defaultFormat: "png",
          transparentBackground: false,
        },
      },
    },
  };
}

async function publishStudioDocument(
  templateId: string,
  document: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
): Promise<void> {
  const result = await db.rpc("publish_template_studio_document", {
    p_template_id: templateId,
    p_document_version: document.version,
    p_document: document,
    p_runtime_values: runtimeValues,
    p_created_by: ADMIN_USER_ID,
    p_source: "publish",
  });
  requireNoDbError(result, `publish Studio document ${templateId}`);
}

async function createFixture(): Promise<Fixture> {
  await upsertFixtureUser(ADMIN_USER_ID, ADMIN_EMAIL, "admin");
  await upsertFixtureUser(BUYER_USER_ID, BUYER_EMAIL, "user");
  await upsertFixtureUser(ARTIST_USER_ID, ARTIST_EMAIL, "user");
  await upsertFixtureUser(NO_ACCESS_USER_ID, NO_ACCESS_EMAIL, "user");

  const buyerArtistId = await insertArtist(BUYER_USER_ID, "buyer");
  const artistProfileId = await insertArtist(ARTIST_USER_ID, "artist");

  const legacyTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Legacy timetable`,
    templateEngine: "legacy",
    templateKind: null,
    status: "published",
    createdBy: ARTIST_USER_ID,
  });
  const timetableTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Studio timetable`,
    templateEngine: "studio",
    templateKind: "timetable",
    status: "published",
    createdBy: ARTIST_USER_ID,
  });
  const thumbnailTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Studio thumbnail`,
    templateEngine: "studio",
    templateKind: "thumbnail",
    status: "published",
    createdBy: ARTIST_USER_ID,
  });
  const draftTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Studio thumbnail draft`,
    templateEngine: "studio",
    templateKind: "thumbnail",
    status: "draft",
    createdBy: ARTIST_USER_ID,
  });
  const archivedTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Studio timetable archived`,
    templateEngine: "studio",
    templateKind: "timetable",
    status: "archived",
    createdBy: ARTIST_USER_ID,
  });
  const artistTemplateId = await insertTemplate({
    name: `${FIXTURE_PREFIX} Artist linked timetable`,
    templateEngine: "studio",
    templateKind: "timetable",
    status: "published",
    createdBy: ARTIST_USER_ID,
  });

  const timetableDocument = createSampleStudioDocument();
  timetableDocument.metadata.name = `${FIXTURE_PREFIX} timetable document`;
  const timetableRuntimeValues =
    createInitialStudioRuntimeValues(timetableDocument);
  await publishStudioDocument(
    timetableTemplateId,
    timetableDocument,
    timetableRuntimeValues,
  );

  const thumbnailDocument = createThumbnailFixtureDocument();
  const thumbnailRuntimeValues =
    createStudioInitialRuntimeValues(thumbnailDocument);
  await publishStudioDocument(
    thumbnailTemplateId,
    thumbnailDocument,
    thumbnailRuntimeValues,
  );

  const draftResult = await db.from("template_studio_document_drafts").insert({
    template_id: timetableTemplateId,
    user_id: ADMIN_USER_ID,
    document_version: timetableDocument.version,
    document: timetableDocument,
    runtime_values: timetableRuntimeValues,
    base_revision_no: 1,
    is_autosave: true,
  });
  requireNoDbError(draftResult, "insert Studio draft fixture");

  const assetResult = await db.from("template_studio_assets").insert({
    template_id: thumbnailTemplateId,
    asset_id: "fixture-cover",
    storage_path: "user-template-ui-baseline/fixture-cover.png",
    mime_type: "image/png",
    width: 1,
    height: 1,
    byte_size: 0,
    created_by: ADMIN_USER_ID,
  });
  requireNoDbError(assetResult, "insert Studio asset fixture");

  await grantAccess(legacyTemplateId, BUYER_USER_ID);
  await grantAccess(timetableTemplateId, BUYER_USER_ID);
  await grantAccess(thumbnailTemplateId, BUYER_USER_ID);
  await grantAccess(draftTemplateId, BUYER_USER_ID);
  await grantAccess(archivedTemplateId, BUYER_USER_ID);

  const buyerArtistLinkResult = await db.from("template_artists").insert({
    template_id: timetableTemplateId,
    artist_id: buyerArtistId,
    role: "creator",
    is_primary: true,
  });
  requireNoDbError(buyerArtistLinkResult, "link buyer artist to timetable");

  const artistLinkResult = await db.from("template_artists").insert({
    template_id: artistTemplateId,
    artist_id: artistProfileId,
    role: "creator",
    is_primary: true,
  });
  requireNoDbError(artistLinkResult, "link artist-owned template");

  const legacyProduct = await insertShopProductWithPlan(
    legacyTemplateId,
    "lite",
  );
  const artistProduct = await insertShopProductWithPlan(
    artistTemplateId,
    "pro",
  );

  return {
    legacyTemplateId,
    timetableTemplateId,
    thumbnailTemplateId,
    draftTemplateId,
    archivedTemplateId,
    artistTemplateId,
    legacyPlanId: legacyProduct.planId,
    artistPlanId: artistProduct.planId,
    buyerArtistId,
    artistProfileId,
    timetableDocument,
    thumbnailDocument,
  };
}

async function cleanupFixture(): Promise<void> {
  const namedTemplates = await getRows<{ id: string }>(
    db.from("templates").select("id").like("name", `${FIXTURE_PREFIX}%`),
    "find named fixture templates",
  );
  const ownedTemplates = await getRows<{ id: string }>(
    db.from("templates").select("id").in("created_by", FIXTURE_USER_IDS),
    "find fixture-owned templates",
  );
  const templateIds = [
    ...new Set([...namedTemplates, ...ownedTemplates].map((row) => row.id)),
  ];

  const requestByTemplate = templateIds.length
    ? await getRows<{ id: string }>(
        db
          .from("template_purchase_requests")
          .select("id")
          .in("template_id", templateIds),
        "find fixture purchase requests by template",
      )
    : [];
  const requestByUser = await getRows<{ id: string }>(
    db
      .from("template_purchase_requests")
      .select("id")
      .in("user_id", FIXTURE_USER_IDS),
    "find fixture purchase requests by user",
  );
  const requestIds = [
    ...new Set([...requestByTemplate, ...requestByUser].map((row) => row.id)),
  ];

  const salesByTemplate = templateIds.length
    ? await getRows<{ id: string }>(
        db.from("template_sales").select("id").in("template_id", templateIds),
        "find fixture sales by template",
      )
    : [];
  const salesByRequest = requestIds.length
    ? await getRows<{ id: string }>(
        db
          .from("template_sales")
          .select("id")
          .in("purchase_request_id", requestIds),
        "find fixture sales by request",
      )
    : [];
  const salesIds = [
    ...new Set([...salesByTemplate, ...salesByRequest].map((row) => row.id)),
  ];

  await deleteWhereIn("template_sales", "id", salesIds);
  await deleteWhereIn("template_purchase_requests", "id", requestIds);
  await deleteWhereIn("template_access", "template_id", templateIds);
  await deleteWhereIn("template_access", "user_id", FIXTURE_USER_IDS);
  await deleteWhereIn("template_artists", "template_id", templateIds);
  await deleteWhereIn(
    "template_studio_user_states",
    "template_id",
    templateIds,
  );
  await deleteWhereIn(
    "template_studio_user_states",
    "user_id",
    FIXTURE_USER_IDS,
  );
  await deleteWhereIn(
    "template_studio_document_drafts",
    "template_id",
    templateIds,
  );
  await deleteWhereIn("template_studio_assets", "template_id", templateIds);
  await deleteWhereIn(
    "template_studio_document_revisions",
    "template_id",
    templateIds,
  );
  await deleteWhereIn("template_studio_documents", "template_id", templateIds);

  const shopRows = templateIds.length
    ? await getRows<{ id: string }>(
        db.from("shop_templates").select("id").in("template_id", templateIds),
        "find fixture shop products",
      )
    : [];
  const shopTemplateIds = shopRows.map((row) => row.id);
  await deleteWhereIn("template_plans", "shop_template_id", shopTemplateIds);
  await deleteWhereIn("shop_templates", "id", shopTemplateIds);

  await deleteWhereIn("templates", "id", templateIds);
  await deleteWhereIn("artists", "user_id", FIXTURE_USER_IDS);
  await deleteWhereIn("users", "id", FIXTURE_USER_IDS);
}

async function verifyFixtureCleanup(): Promise<void> {
  const remainingTemplates = await getRows<{ id: string }>(
    db.from("templates").select("id").like("name", `${FIXTURE_PREFIX}%`),
    "verify fixture template cleanup",
  );
  const remainingUsers = await getRows<{ id: number }>(
    db.from("users").select("id").in("id", FIXTURE_USER_IDS),
    "verify fixture user cleanup",
  );
  const remainingArtists = await getRows<{ id: string }>(
    db.from("artists").select("id").in("user_id", FIXTURE_USER_IDS),
    "verify fixture artist cleanup",
  );
  assert(
    remainingTemplates.length === 0,
    `Fixture cleanup left ${remainingTemplates.length} template row(s).`,
  );
  assert(
    remainingUsers.length === 0,
    `Fixture cleanup left ${remainingUsers.length} user row(s).`,
  );
  assert(
    remainingArtists.length === 0,
    `Fixture cleanup left ${remainingArtists.length} artist row(s).`,
  );
}

async function checkSchema(): Promise<void> {
  const requiredColumns: Array<{ table: string; columns: string[] }> = [
    {
      table: "templates",
      columns: [
        "id",
        "name",
        "thumbnail_url",
        "is_public",
        "template_engine",
        "template_kind",
        "status",
        "created_by",
      ],
    },
    {
      table: "template_access",
      columns: [
        "id",
        "template_id",
        "user_id",
        "access_level",
        "granted_at",
        "granted_by",
        "template_plan_id",
      ],
    },
    {
      table: "template_studio_documents",
      columns: [
        "id",
        "template_id",
        "document_version",
        "document",
        "runtime_values",
        "published_revision_no",
      ],
    },
    {
      table: "template_studio_document_revisions",
      columns: [
        "id",
        "template_id",
        "revision_no",
        "document_version",
        "document",
        "runtime_values",
        "source",
        "created_by",
      ],
    },
    {
      table: "template_studio_document_drafts",
      columns: [
        "id",
        "template_id",
        "user_id",
        "document_version",
        "document",
        "runtime_values",
        "base_revision_no",
        "is_autosave",
      ],
    },
    {
      table: "template_studio_assets",
      columns: [
        "id",
        "template_id",
        "asset_id",
        "storage_provider",
        "storage_path",
        "public_url",
        "content_hash",
        "mime_type",
        "width",
        "height",
        "byte_size",
        "created_by",
        "last_synced_at",
      ],
    },
    {
      table: "template_studio_user_states",
      columns: [
        "id",
        "template_id",
        "user_id",
        "base_revision_no",
        "runtime_values",
        "version",
        "created_at",
        "updated_at",
      ],
    },
    {
      table: "shop_templates",
      columns: ["id", "template_id", "is_shop_visible"],
    },
    {
      table: "template_purchase_requests",
      columns: ["id", "template_id", "user_id", "plan_id", "status"],
    },
  ];

  for (const schema of requiredColumns) {
    const result = await db
      .from(schema.table)
      .select(schema.columns.join(","))
      .limit(0);
    requireNoDbError(result, `schema ${schema.table}`);
  }

  const rpcProbe = await db.rpc("approve_template_purchase_request", {
    p_request_id: randomUUID(),
    p_admin_id: ADMIN_USER_ID,
  });
  assert(
    Boolean(rpcProbe.error),
    "Approval RPC probe unexpectedly succeeded for a random request.",
  );
  const rpcErrorText = formatDbError(rpcProbe.error);
  assert(
    !/pgrst202|function .*approve_template_purchase_request|could not find the function/i.test(
      rpcErrorText,
    ),
    `Approval RPC is not installed: ${rpcErrorText}`,
  );
}

function assertUniqueViolation(error: DbError | null, label: string): void {
  assert(
    error,
    `${label} unexpectedly succeeded; unique constraint is missing.`,
  );
  const text = formatDbError(error);
  assert(
    error.code === "23505" || /duplicate key|unique constraint/i.test(text),
    `${label} failed for a reason other than uniqueness: ${text}`,
  );
}

async function checkUniqueConstraints(fixture: Fixture): Promise<void> {
  const duplicateAccess = await db.from("template_access").insert({
    template_id: fixture.legacyTemplateId,
    user_id: BUYER_USER_ID,
    access_level: "read",
    granted_by: ADMIN_USER_ID,
  });
  assertUniqueViolation(
    duplicateAccess.error,
    "template_access(template_id,user_id) duplicate",
  );

  const duplicateShop = await db
    .from("shop_templates")
    .insert({
      template_id: fixture.legacyTemplateId,
      title: `${FIXTURE_PREFIX} duplicate product`,
      is_shop_visible: true,
    })
    .select("id")
    .maybeSingle();
  if (!duplicateShop.error && duplicateShop.data) {
    await deleteWhereIn("shop_templates", "id", [
      (duplicateShop.data as { id: string }).id,
    ]);
  }
  assertUniqueViolation(
    duplicateShop.error,
    "shop_templates(template_id) duplicate",
  );
}

function createRequest(
  url: string,
  token: string,
  init: { body?: BodyInit | null; method?: string } = {},
): NextRequest {
  return new NextRequest(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

async function readResponse<T>(
  response: NextResponse,
): Promise<{ status: number; body: T | null }> {
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as T | null };
}

async function createTokens(): Promise<{
  admin: string;
  buyer: string;
  artist: string;
  noAccess: string;
}> {
  const [admin, buyer, artist, noAccess] = await Promise.all([
    signJWT({ userId: ADMIN_USER_ID, email: ADMIN_EMAIL, role: "admin" }, "1h"),
    signJWT({ userId: BUYER_USER_ID, email: BUYER_EMAIL, role: "user" }, "1h"),
    signJWT(
      { userId: ARTIST_USER_ID, email: ARTIST_EMAIL, role: "user" },
      "1h",
    ),
    signJWT(
      { userId: NO_ACCESS_USER_ID, email: NO_ACCESS_EMAIL, role: "user" },
      "1h",
    ),
  ]);
  return { admin, buyer, artist, noAccess };
}

async function getUserTemplates(token: string): Promise<UserTemplatesResponse> {
  const response = await userTemplatesGET(
    createRequest(`${routeBaseUrl}/api/user/templates`, token),
  );
  const result = await readResponse<UserTemplatesResponse>(response);
  assert(
    result.status === 200,
    `User template list returned ${result.status}.`,
  );
  assert(result.body, "User template list returned an empty body.");
  return result.body;
}

function assertTemplateSummary(
  summary: TemplateSummary,
  expected: {
    id: string;
    engine: "legacy" | "studio";
    kind: "timetable" | "thumbnail" | null;
    href: string;
  },
): void {
  assert(summary.id === expected.id, `Unexpected template id ${summary.id}.`);
  assert(
    summary.template_engine === expected.engine,
    `${summary.id} returned engine ${summary.template_engine}.`,
  );
  assert(
    summary.template_kind === expected.kind,
    `${summary.id} returned kind ${String(summary.template_kind)}.`,
  );
  assert(summary.status === "published", `${summary.id} is not published.`);
  assert(
    Object.prototype.hasOwnProperty.call(summary, "thumbnail_url"),
    `${summary.id} omitted thumbnail_url.`,
  );
  assert(
    summary.use_href === expected.href,
    `${summary.id} returned use_href ${summary.use_href}, expected ${expected.href}.`,
  );
}

async function checkUserTemplateList(
  fixture: Fixture,
  tokens: { buyer: string; artist: string; noAccess: string },
): Promise<void> {
  const buyerList = await getUserTemplates(tokens.buyer);
  const buyerRows = [
    ...buyerList.purchase_templates,
    ...buyerList.artist_templates,
  ];
  const buyerTemplateIds = buyerRows.map((row) => row.templates.id);
  assert(
    new Set(buyerTemplateIds).size === buyerTemplateIds.length,
    "Buyer list contains a duplicate template across purchase and artist sections.",
  );
  assert(
    buyerList.total === 3,
    `Expected 3 buyer templates, got ${buyerList.total}.`,
  );
  assert(
    buyerList.total_purchase === 2 && buyerList.total_artist === 1,
    `Unexpected buyer list split: ${buyerList.total_purchase}/${buyerList.total_artist}.`,
  );
  assert(
    !buyerTemplateIds.includes(fixture.draftTemplateId) &&
      !buyerTemplateIds.includes(fixture.archivedTemplateId),
    "Draft or archived templates leaked into the buyer list.",
  );

  const summaries = new Map(
    buyerRows.map((row) => [row.templates.id, row.templates]),
  );
  assertTemplateSummary(summaries.get(fixture.legacyTemplateId)!, {
    id: fixture.legacyTemplateId,
    engine: "legacy",
    kind: null,
    href: `/time-table/${fixture.legacyTemplateId}`,
  });
  assertTemplateSummary(summaries.get(fixture.timetableTemplateId)!, {
    id: fixture.timetableTemplateId,
    engine: "studio",
    kind: "timetable",
    href: `/template-studio/${fixture.timetableTemplateId}`,
  });
  assertTemplateSummary(summaries.get(fixture.thumbnailTemplateId)!, {
    id: fixture.thumbnailTemplateId,
    engine: "studio",
    kind: "thumbnail",
    href: `/thumbnail/${fixture.thumbnailTemplateId}`,
  });
  assert(
    buyerList.artist_templates.some(
      (row) => row.templates.id === fixture.timetableTemplateId,
    ),
    "The access+artist duplicate was not classified as an artist template.",
  );
  assert(
    !buyerList.purchase_templates.some(
      (row) => row.templates.id === fixture.timetableTemplateId,
    ),
    "The access+artist duplicate remained in the purchase section.",
  );

  const artistList = await getUserTemplates(tokens.artist);
  assert(
    artistList.total === 1 &&
      artistList.artist_templates[0]?.templates.id === fixture.artistTemplateId,
    "Artist-linked template did not appear in the artist user's list.",
  );
  assert(
    artistList.artist_templates[0]?.templates.use_href ===
      `/template-studio/${fixture.artistTemplateId}`,
    "Artist-linked template returned the wrong use_href.",
  );

  const noAccessList = await getUserTemplates(tokens.noAccess);
  assert(noAccessList.total === 0, "No-access user received template rows.");
}

async function checkEntitlement(
  fixture: Fixture,
  tokens: { admin: string; buyer: string; artist: string; noAccess: string },
): Promise<void> {
  const check = async (templateId: string, token: string) => {
    const response = await templateAccessGET(
      createRequest(
        `${routeBaseUrl}/api/template-access?templateId=${templateId}`,
        token,
      ),
    );
    const result = await readResponse<{
      hasAccess: boolean;
      isAdmin: boolean;
      reason: string;
    }>(response);
    assert(result.status === 200, `Access route returned ${result.status}.`);
    assert(result.body, "Access route returned an empty body.");
    return result.body;
  };

  const buyerAccess = await check(fixture.timetableTemplateId, tokens.buyer);
  assert(
    buyerAccess.hasAccess && buyerAccess.reason === "template_access",
    "Buyer access was denied.",
  );

  const artistAccess = await check(fixture.artistTemplateId, tokens.artist);
  assert(
    artistAccess.hasAccess && artistAccess.reason === "template_access",
    "Artist access was denied.",
  );

  const noAccess = await check(fixture.timetableTemplateId, tokens.noAccess);
  assert(
    !noAccess.hasAccess && noAccess.reason === "no_access",
    "No-access user was allowed.",
  );

  const draftAccess = await check(fixture.draftTemplateId, tokens.buyer);
  const archivedAccess = await check(fixture.archivedTemplateId, tokens.buyer);
  assert(
    !draftAccess.hasAccess,
    "Draft template was allowed through entitlement.",
  );
  assert(
    !archivedAccess.hasAccess,
    "Archived template was allowed through entitlement.",
  );

  const adminAccess = await check(fixture.thumbnailTemplateId, tokens.admin);
  assert(
    adminAccess.hasAccess &&
      adminAccess.isAdmin &&
      adminAccess.reason === "admin_access",
    "Admin entitlement bypass did not work.",
  );
}

async function checkRuntime(
  fixture: Fixture,
  tokens: { buyer: string; noAccess: string },
): Promise<void> {
  const timetableContext: RouteContext = {
    params: Promise.resolve({ id: fixture.timetableTemplateId }),
  };
  const thumbnailContext: RouteContext = {
    params: Promise.resolve({ id: fixture.thumbnailTemplateId }),
  };
  const getRuntime = runtimeGET as RuntimeRouteHandler;
  const putRuntime = runtimePUT as RuntimeRouteHandler;

  const forbidden = await readResponse(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.timetableTemplateId}/runtime`,
        tokens.noAccess,
      ),
      timetableContext,
    ),
  );
  assert(
    forbidden.status === 403,
    `Unauthorized timetable runtime returned ${forbidden.status}.`,
  );

  const timetableResponse = await readResponse<{
    kind: string;
    revisionNo: number;
    runtimeValues: StudioRuntimeValues;
  }>(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.timetableTemplateId}/runtime`,
        tokens.buyer,
      ),
      timetableContext,
    ),
  );
  assert(
    timetableResponse.status === 200,
    `Timetable GET returned ${timetableResponse.status}.`,
  );
  assert(
    timetableResponse.body?.kind === "timetable",
    "Timetable GET returned the wrong kind.",
  );
  assert(
    timetableResponse.body?.revisionNo === 1,
    "Timetable fixture revision is not 1.",
  );

  const runtimeValues = JSON.parse(
    JSON.stringify(timetableResponse.body?.runtimeValues),
  ) as StudioRuntimeValues;
  const firstDayId = Object.keys(runtimeValues.timetable.entriesByDay)[0];
  assert(firstDayId, "Timetable runtime did not return a day.");
  const firstEntry = runtimeValues.timetable.entriesByDay[firstDayId]?.[0];
  assert(firstEntry, "Timetable runtime did not return an entry.");
  firstEntry.mainTitle = `${FIXTURE_PREFIX} edited runtime value`;

  const putResponse = await readResponse(
    await putRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.timetableTemplateId}/runtime`,
        tokens.buyer,
        {
          method: "PUT",
          body: JSON.stringify({ runtimeValues }),
        },
      ),
      timetableContext,
    ),
  );
  assert(
    putResponse.status === 200,
    `Timetable PUT returned ${putResponse.status}.`,
  );

  const stateRows = await getRows<{ id: string }>(
    db
      .from("template_studio_user_states")
      .select("id")
      .eq("template_id", fixture.timetableTemplateId)
      .eq("user_id", BUYER_USER_ID),
    "read timetable user state",
  );
  assert(
    stateRows.length === 1,
    `Expected one timetable user state, got ${stateRows.length}.`,
  );

  const thumbnailForbidden = await readResponse(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.thumbnailTemplateId}/runtime?kind=thumbnail`,
        tokens.noAccess,
      ),
      thumbnailContext,
    ),
  );
  assert(
    thumbnailForbidden.status === 403,
    `Unauthorized thumbnail runtime returned ${thumbnailForbidden.status}.`,
  );

  const thumbnailResponse = await readResponse<{
    kind: string;
    runtimeValues: StudioRuntimeValues;
  }>(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.thumbnailTemplateId}/runtime?kind=thumbnail`,
        tokens.buyer,
      ),
      thumbnailContext,
    ),
  );
  assert(
    thumbnailResponse.status === 200,
    `Thumbnail GET returned ${thumbnailResponse.status}.`,
  );
  assert(
    thumbnailResponse.body?.kind === "thumbnail",
    "Thumbnail GET returned the wrong kind.",
  );

  const thumbnailPut = await readResponse(
    await putRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.thumbnailTemplateId}/runtime`,
        tokens.buyer,
        {
          method: "PUT",
          body: JSON.stringify({
            runtimeValues: thumbnailResponse.body?.runtimeValues,
          }),
        },
      ),
      thumbnailContext,
    ),
  );
  assert(
    thumbnailPut.status === 405,
    `Thumbnail PUT returned ${thumbnailPut.status}, expected 405.`,
  );

  const mismatchedKind = await readResponse(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.thumbnailTemplateId}/runtime?kind=timetable`,
        tokens.buyer,
      ),
      thumbnailContext,
    ),
  );
  assert(
    mismatchedKind.status === 404,
    `Mismatched kind returned ${mismatchedKind.status}, expected 404.`,
  );

  const invalidKind = await readResponse(
    await getRuntime(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${fixture.thumbnailTemplateId}/runtime?kind=invalid`,
        tokens.buyer,
      ),
      thumbnailContext,
    ),
  );
  assert(
    invalidKind.status === 400,
    `Unknown kind returned ${invalidKind.status}, expected 400.`,
  );
}

async function checkPurchasePlanAndApproval(
  fixture: Fixture,
  buyerToken: string,
): Promise<string> {
  const mismatchedResponse = await readResponse<{ error: string }>(
    await purchaseRequestPOST(
      createRequest(
        `${routeBaseUrl}/api/template-purchase-requests`,
        buyerToken,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: fixture.legacyTemplateId,
            plan_id: fixture.artistPlanId,
            depositor_name: `${FIXTURE_PREFIX} mismatch`,
          }),
        },
      ),
    ),
  );
  assert(
    mismatchedResponse.status === 400,
    `Mismatched plan/template request returned ${mismatchedResponse.status}.`,
  );

  const matchedResponse = await readResponse<{
    purchaseRequest: { id: string };
  }>(
    await purchaseRequestPOST(
      createRequest(
        `${routeBaseUrl}/api/template-purchase-requests`,
        buyerToken,
        {
          method: "POST",
          body: JSON.stringify({
            template_id: fixture.artistTemplateId,
            plan_id: fixture.artistPlanId,
            depositor_name: `${FIXTURE_PREFIX} buyer`,
          }),
        },
      ),
    ),
  );
  assert(
    matchedResponse.status === 201,
    `Matching purchase request returned ${matchedResponse.status}.`,
  );
  const requestId = matchedResponse.body?.purchaseRequest.id;
  assert(requestId, "Matching purchase request did not return an id.");

  const mismatchedRpc = await db.rpc("approve_template_purchase_request", {
    p_request_id: requestId,
    p_admin_id: ADMIN_USER_ID,
    p_plan_id: fixture.legacyPlanId,
  });
  assert(
    Boolean(mismatchedRpc.error),
    "Approval RPC accepted a plan belonging to another template.",
  );

  const pendingRequest = requireData(
    await db
      .from("template_purchase_requests")
      .select("status")
      .eq("id", requestId)
      .single(),
    "read pending purchase request",
  ) as { status: string };
  assert(
    pendingRequest.status === "pending",
    "Failed RPC changed the request status.",
  );
  const accessBeforeApproval = await getRows<{ id: string }>(
    db
      .from("template_access")
      .select("id")
      .eq("template_id", fixture.artistTemplateId)
      .eq("user_id", BUYER_USER_ID),
    "read access before approval",
  );
  assert(
    accessBeforeApproval.length === 0,
    "Failed RPC partially granted access.",
  );

  const firstApproval = await db.rpc("approve_template_purchase_request", {
    p_request_id: requestId,
    p_admin_id: ADMIN_USER_ID,
  });
  requireNoDbError(firstApproval, "first purchase approval RPC");

  const secondApproval = await db.rpc("approve_template_purchase_request", {
    p_request_id: requestId,
    p_admin_id: ADMIN_USER_ID,
  });
  requireNoDbError(secondApproval, "idempotent purchase approval RPC retry");

  const completedRequest = requireData(
    await db
      .from("template_purchase_requests")
      .select("status")
      .eq("id", requestId)
      .single(),
    "read completed purchase request",
  ) as { status: string };
  assert(
    completedRequest.status === "completed",
    "Approved request is not completed.",
  );

  const accessAfterApproval = await getRows<{
    id: string;
    template_plan_id: string | null;
  }>(
    db
      .from("template_access")
      .select("id, template_plan_id")
      .eq("template_id", fixture.artistTemplateId)
      .eq("user_id", BUYER_USER_ID),
    "read access after approval",
  );
  assert(
    accessAfterApproval.length === 1,
    `Expected one access row after retry, got ${accessAfterApproval.length}.`,
  );
  assert(
    accessAfterApproval[0]?.template_plan_id === fixture.artistPlanId,
    "Approval stored a plan other than the request's plan.",
  );

  return requestId;
}

async function checkPostApprovalList(
  fixture: Fixture,
  buyerToken: string,
): Promise<void> {
  const list = await getUserTemplates(buyerToken);
  assert(
    list.total === 4,
    `Expected approved template in list, got ${list.total}.`,
  );
  assert(
    [...list.purchase_templates, ...list.artist_templates].some(
      (row) => row.templates.id === fixture.artistTemplateId,
    ),
    "Approved template did not appear in the user template list.",
  );
}

async function main(): Promise<void> {
  assertLocalSupabaseUrl();
  await checkSchema();

  let checkError: unknown = null;
  try {
    await cleanupFixture();
    const fixture = await createFixture();
    const tokens = await createTokens();

    await checkUniqueConstraints(fixture);
    await checkUserTemplateList(fixture, {
      buyer: tokens.buyer,
      artist: tokens.artist,
      noAccess: tokens.noAccess,
    });
    await checkEntitlement(fixture, tokens);
    await checkRuntime(fixture, {
      buyer: tokens.buyer,
      noAccess: tokens.noAccess,
    });
    await checkPurchasePlanAndApproval(fixture, tokens.buyer);
    await checkPostApprovalList(fixture, tokens.buyer);

    console.log("User template UI local DB/API baseline check passed.");
  } catch (error) {
    checkError = error;
  }

  let cleanupError: unknown = null;
  try {
    await cleanupFixture();
    await verifyFixtureCleanup();
  } catch (error) {
    cleanupError = error;
  }

  if (checkError) throw checkError;
  if (cleanupError) throw cleanupError;
  console.log("Fixture cleanup verified for reserved 01단계 identifiers.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
