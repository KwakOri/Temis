/**
 * Doc 12 (browser-only runtime image storage) server-side verification:
 * - runtime GET response carries `storageOwnerId`.
 * - legacy image Data URIs saved before this migration are stripped from
 *   every scope (global/day/entry) on GET, without touching other values,
 *   and the cleanup is persisted (not just filtered in the response).
 * - the batch `cleanup-legacy-runtime-image-data.ts` script strips rows
 *   nobody has re-opened yet, previews in dry-run, and only writes on --apply.
 */
import { execFileSync } from "node:child_process";

import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { deleteTemplateStudioTemplate } from "../src/services/server/templateStudioPersistenceService";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";
import type { StudioRuntimeValues } from "../src/types/template-studio";

// template_studio_* tables aren't in the generated Supabase types yet
// (src/types/supabase.ts), so this is typed loosely rather than through the
// generated `Database` union.
type StudioQueryResult<T> = { data: T | null; error: { message: string } | null };
type StudioQuery<T> = PromiseLike<StudioQueryResult<T>> & {
  select(columns?: string): StudioQuery<T>;
  eq(column: string, value: unknown): StudioQuery<T>;
  single(): Promise<StudioQueryResult<T>>;
  upsert(
    value: unknown,
    options?: { onConflict?: string }
  ): StudioQuery<T>;
};
type StudioTablesClient = {
  from<T>(table: string): StudioQuery<T>;
};
const studioClient = supabaseAdminServer as unknown as StudioTablesClient;

const ADMIN_ID = 9100801;
const ADMIN_EMAIL = "image-strip-check-admin@temis.com";
const BUYER_ID = 9100802;
const BUYER_EMAIL = "image-strip-check-buyer@temis.com";
const OTHER_BUYER_ID = 9100803;
const OTHER_BUYER_EMAIL = "image-strip-check-buyer-2@temis.com";

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error("Refusing to run against a non-local Supabase URL.");
  }
};

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    { id, created_at: now, updated_at: now, name: `Image Strip Check ${id}`, email, password: "local-only", role },
    { onConflict: "id" },
  );
  if (error) throw error;
};

const req = (
  url: string,
  token: string,
  init: { body?: BodyInit | null; method?: string } = {},
): NextRequest =>
  new NextRequest(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

const json = async <T>(response: NextResponse): Promise<{ status: number; body: T | null }> => {
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as T | null };
};

const base = "http://127.0.0.1/runtime-image-strip-check";

const LEGACY_IMAGE_DATA_URI = "data:image/png;base64,aGVsbG8=";
const NOTE_VALUE = "kept text value";
const DAY_NOTE_VALUE = "kept day text value";

const buildLegacyRuntimeValues = (
  base: StudioRuntimeValues,
  dayId: string,
): StudioRuntimeValues => ({
  ...base,
  global: {
    ...base.global,
    input_profile: LEGACY_IMAGE_DATA_URI,
    input_note: NOTE_VALUE,
  },
  days: {
    ...base.days,
    [dayId]: {
      ...base.days?.[dayId],
      input_day_banner: LEGACY_IMAGE_DATA_URI,
      input_day_note: DAY_NOTE_VALUE,
    },
  },
  entries: {
    ...base.entries,
    [dayId]: [
      {
        ...(base.entries?.[dayId]?.[0] ?? {}),
        input_entry_photo: LEGACY_IMAGE_DATA_URI,
      },
    ],
  },
});

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(ADMIN_ID, ADMIN_EMAIL, "admin");
  await upsertUser(BUYER_ID, BUYER_EMAIL, "user");
  await upsertUser(OTHER_BUYER_ID, OTHER_BUYER_EMAIL, "user");

  const [draftRoutes, publishRoutes, runtimeRoutes] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
    import("../src/app/api/user/templates/[id]/runtime/route"),
  ]);
  const templateRoutes = await import("../src/app/api/admin/template-studio/templates/route");

  const adminToken = await signJWT({ userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" }, "1h");
  const buyerToken = await signJWT({ userId: BUYER_ID, email: BUYER_EMAIL, role: "user" }, "1h");

  let templateId: string | null = null;

  try {
    const created = await json<{ template: { id: string } }>(
      await templateRoutes.POST(
        req(`${base}/api/admin/template-studio/templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({ name: "Image Strip Check", description: "Doc 12 verification only" }),
        }),
      ),
    );
    assert(created.status === 200, `create failed: ${created.status}`);
    templateId = created.body!.template.id;
    const ctx = { params: Promise.resolve({ id: templateId }) };

    const document = createSampleStudioDocument();
    document.metadata.name = "Image Strip Check";
    document.inputs = {
      input_profile: { id: "input_profile", type: "image", scope: "global", label: "Profile" },
      input_note: { id: "input_note", type: "text", scope: "global", label: "Note" },
      input_day_banner: { id: "input_day_banner", type: "image", scope: "day", label: "Day banner" },
      input_day_note: { id: "input_day_note", type: "text", scope: "day", label: "Day note" },
      input_entry_photo: { id: "input_entry_photo", type: "image", scope: "entry", label: "Entry photo" },
    };
    const initialRuntimeValues = createInitialStudioRuntimeValues(document);
    const firstDayId = document.domains!.timetable!.dayIds[0];

    await (draftRoutes.PUT as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/draft`, adminToken, {
        method: "PUT",
        body: JSON.stringify({ document, runtimeValues: initialRuntimeValues, isAutosave: true }),
      }),
      ctx,
    );
    const publishResp = await json<{ document: { publishedRevisionNo: number | null } }>(
      await (publishRoutes.POST as RouteHandler)(
        req(`${base}/api/admin/template-studio/templates/${templateId}/publish`, adminToken, {
          method: "POST",
          body: JSON.stringify({ document, runtimeValues: initialRuntimeValues }),
        }),
        ctx,
      ),
    );
    assert(publishResp.status === 200, `publish failed: ${publishResp.status}`);

    await supabaseAdminServer.from("template_access").upsert(
      [
        { template_id: templateId, user_id: BUYER_ID, access_level: "write", granted_by: ADMIN_ID },
        { template_id: templateId, user_id: OTHER_BUYER_ID, access_level: "write", granted_by: ADMIN_ID },
      ],
      { onConflict: "template_id,user_id" },
    );

    // Read back the published document row so the legacy state we seed
    // shares its base_revision_no, keeping reconciliation a pass-through
    // and isolating the assertions below to the new strip step.
    const { data: documentRow, error: documentRowError } = await studioClient
      .from<{ published_revision_no: number | null }>("template_studio_documents")
      .select("published_revision_no")
      .eq("template_id", templateId)
      .single();
    if (documentRowError) throw documentRowError;
    const publishedRevisionNo = documentRow!.published_revision_no;

    const legacyRuntimeValues = buildLegacyRuntimeValues(initialRuntimeValues, firstDayId);

    // Seed "legacy" state directly in the DB, bypassing the app's PUT route
    // entirely, to simulate a row saved before this migration existed.
    const seedLegacyRow = async (userId: number) => {
      const { error } = await studioClient.from("template_studio_user_states").upsert(
        {
          template_id: templateId,
          user_id: userId,
          base_revision_no: publishedRevisionNo,
          runtime_values: legacyRuntimeValues,
        },
        { onConflict: "template_id,user_id" },
      );
      if (error) throw error;
    };
    await seedLegacyRow(BUYER_ID);
    await seedLegacyRow(OTHER_BUYER_ID);

    // 1. GET strips every scope's image key and reports storageOwnerId.
    const runtimeCtx = { params: Promise.resolve({ id: templateId }) };
    const firstGet = await json<{ runtimeValues: StudioRuntimeValues; storageOwnerId: string }>(
      await (runtimeRoutes.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken),
        runtimeCtx,
      ),
    );
    assert(firstGet.status === 200, `GET failed: ${firstGet.status}`);
    assert(
      firstGet.body!.storageOwnerId === String(BUYER_ID),
      `expected storageOwnerId=${BUYER_ID}, got ${firstGet.body!.storageOwnerId}`,
    );
    const cleaned = firstGet.body!.runtimeValues;
    assert(!("input_profile" in cleaned.global), "expected input_profile stripped from global");
    assert(cleaned.global.input_note === NOTE_VALUE, "expected input_note preserved in global");
    assert(
      !("input_day_banner" in (cleaned.days[firstDayId] ?? {})),
      "expected input_day_banner stripped from day scope",
    );
    assert(
      cleaned.days[firstDayId]?.input_day_note === DAY_NOTE_VALUE,
      "expected input_day_note preserved in day scope",
    );
    assert(
      !("input_entry_photo" in (cleaned.entries[firstDayId]?.[0] ?? {})),
      "expected input_entry_photo stripped from entry scope",
    );

    // 2. The cleanup was persisted, not just filtered in the response.
    const { data: persistedRow, error: persistedRowError } = await studioClient
      .from<{ runtime_values: StudioRuntimeValues }>("template_studio_user_states")
      .select("runtime_values")
      .eq("template_id", templateId)
      .eq("user_id", BUYER_ID)
      .single();
    if (persistedRowError) throw persistedRowError;
    const persistedValues = persistedRow!.runtime_values as StudioRuntimeValues;
    assert(
      !("input_profile" in persistedValues.global),
      "expected persisted row to have input_profile stripped",
    );
    assert(
      persistedValues.global.input_note === NOTE_VALUE,
      "expected persisted row to keep input_note",
    );

    // 3. PUT also strips image values defensively, even if a stale client
    // sends them back.
    const putWithImage = await (runtimeRoutes.PUT as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken, {
        method: "PUT",
        body: JSON.stringify({
          runtimeValues: {
            ...cleaned,
            global: { ...cleaned.global, input_profile: LEGACY_IMAGE_DATA_URI },
          },
        }),
      }),
      runtimeCtx,
    );
    const putBody = await json<{ runtimeValues: StudioRuntimeValues }>(putWithImage);
    assert(putBody.status === 200, `expected 200 for PUT with image value, got ${putBody.status}`);
    assert(
      !("input_profile" in putBody.body!.runtimeValues.global),
      "expected PUT response to have input_profile stripped",
    );

    // 4. OTHER_BUYER_ID's row was never opened via GET, so it should still
    // carry the legacy image values — the batch cleanup script is what
    // reaches rows like this.
    const { data: untouchedRow, error: untouchedRowError } = await studioClient
      .from<{ runtime_values: StudioRuntimeValues }>("template_studio_user_states")
      .select("runtime_values")
      .eq("template_id", templateId)
      .eq("user_id", OTHER_BUYER_ID)
      .single();
    if (untouchedRowError) throw untouchedRowError;
    assert(
      "input_profile" in (untouchedRow!.runtime_values as StudioRuntimeValues).global,
      "expected the never-opened row to still carry the legacy image value before cleanup",
    );

    // 5. Dry-run reports the candidate row and count, and does not write.
    const dryRunOutput = execFileSync(
      "npx",
      ["tsx", "scripts/cleanup-legacy-runtime-image-data.ts", "--template-id", templateId],
      { cwd: process.cwd(), env: process.env, encoding: "utf8" },
    );
    assert(dryRunOutput.includes("mode=dry-run"), "expected dry-run output to report dry-run mode");
    assert(
      dryRunOutput.includes(`user=${OTHER_BUYER_ID}`),
      "expected dry-run preview to mention the untouched row's user id",
    );
    assert(
      /rows needing cleanup=[1-9]/.test(dryRunOutput),
      "expected dry-run to report at least one row needing cleanup",
    );

    const { data: stillLegacyRow, error: stillLegacyRowError } = await studioClient
      .from<{ runtime_values: StudioRuntimeValues }>("template_studio_user_states")
      .select("runtime_values")
      .eq("template_id", templateId)
      .eq("user_id", OTHER_BUYER_ID)
      .single();
    if (stillLegacyRowError) throw stillLegacyRowError;
    assert(
      "input_profile" in (stillLegacyRow!.runtime_values as StudioRuntimeValues).global,
      "expected dry-run to leave the row unchanged",
    );

    // 6. --apply actually writes the stripped values.
    const applyOutput = execFileSync(
      "npx",
      ["tsx", "scripts/cleanup-legacy-runtime-image-data.ts", "--template-id", templateId, "--apply"],
      { cwd: process.cwd(), env: process.env, encoding: "utf8" },
    );
    assert(applyOutput.includes("mode=apply"), "expected apply output to report apply mode");
    assert(/updated=[1-9]/.test(applyOutput), "expected apply run to report at least one updated row");

    const { data: appliedRow, error: appliedRowError } = await studioClient
      .from<{ runtime_values: StudioRuntimeValues }>("template_studio_user_states")
      .select("runtime_values")
      .eq("template_id", templateId)
      .eq("user_id", OTHER_BUYER_ID)
      .single();
    if (appliedRowError) throw appliedRowError;
    const appliedValues = appliedRow!.runtime_values as StudioRuntimeValues;
    assert(!("input_profile" in appliedValues.global), "expected apply to strip input_profile");
    assert(appliedValues.global.input_note === NOTE_VALUE, "expected apply to preserve input_note");
    assert(
      !("input_day_banner" in (appliedValues.days[firstDayId] ?? {})),
      "expected apply to strip input_day_banner",
    );
    assert(
      appliedValues.days[firstDayId]?.input_day_note === DAY_NOTE_VALUE,
      "expected apply to preserve input_day_note",
    );
    assert(
      !("input_entry_photo" in (appliedValues.entries[firstDayId]?.[0] ?? {})),
      "expected apply to strip input_entry_photo",
    );

    console.log("Runtime image strip check passed.");
  } finally {
    await supabaseAdminServer.from("template_access").delete().in("user_id", [BUYER_ID, OTHER_BUYER_ID]);
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
