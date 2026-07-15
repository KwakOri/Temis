/**
 * P2 follow-up: the pilot (check:pilot-e2e) only exercises a general-sale
 * (is_public=true) Studio template through the shop/purchase flow.
 * Personalized (is_public=false) templates skip the shop entirely — access
 * is granted directly to a specific user via POST /api/admin/template-access.
 * This script walks that path end to end: create -> publish -> personal
 * grant -> designated user can run/save/reload -> a different user is
 * denied everywhere, including the bulk template-access list.
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { deleteTemplateStudioTemplate } from "../src/services/server/templateStudioPersistenceService";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const ADMIN_ID = 9100901;
const ADMIN_EMAIL = "personal-check-admin@temis.com";
const DESIGNATED_USER_ID = 9100902;
const DESIGNATED_USER_EMAIL = "personal-check-designated@temis.com";
const OTHER_USER_ID = 9100903;
const OTHER_USER_EMAIL = "personal-check-other@temis.com";

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

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

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    { id, created_at: now, updated_at: now, name: `Personal Check ${id}`, email, password: "local-only", role },
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

const base = "http://127.0.0.1/personalized-template-flow-check";

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(ADMIN_ID, ADMIN_EMAIL, "admin");
  await upsertUser(DESIGNATED_USER_ID, DESIGNATED_USER_EMAIL, "user");
  await upsertUser(OTHER_USER_ID, OTHER_USER_EMAIL, "user");

  const [
    studioTemplates,
    studioDraft,
    studioPublish,
    templateAccessRoute,
    runtimeRoute,
    userTemplateAccessRoute,
  ] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
    import("../src/app/api/admin/template-access/route"),
    import("../src/app/api/user/templates/[id]/runtime/route"),
    import("../src/app/api/user/template-access/route"),
  ]);

  const adminToken = await signJWT({ userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" }, "1h");
  const designatedToken = await signJWT(
    { userId: DESIGNATED_USER_ID, email: DESIGNATED_USER_EMAIL, role: "user" },
    "1h",
  );
  const otherToken = await signJWT(
    { userId: OTHER_USER_ID, email: OTHER_USER_EMAIL, role: "user" },
    "1h",
  );

  let templateId: string | null = null;

  try {
    // 1. Admin creates a personalized (is_public=false) Studio template.
    const created = await json<{ template: { id: string } }>(
      await studioTemplates.POST(
        req(`${base}/api/admin/template-studio/templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({
            name: "Personalized Flow Check",
            description: "P2 verification only",
          }),
        }),
      ),
    );
    assert(created.status === 200, `create failed: ${created.status}`);
    templateId = created.body!.template.id;
    const ctx = { params: Promise.resolve({ id: templateId }) };

    const { data: templateRow } = await supabaseAdminServer
      .from("templates")
      .select("is_public")
      .eq("id", templateId)
      .single();
    assert(
      templateRow?.is_public === false,
      "Studio templates should default to is_public=false (personalized)",
    );

    const document = createSampleStudioDocument();
    document.metadata.name = "Personalized Flow Check";
    const runtimeValues = createInitialStudioRuntimeValues(document);

    await (studioDraft.PUT as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/draft`, adminToken, {
        method: "PUT",
        body: JSON.stringify({ document, runtimeValues, isAutosave: true }),
      }),
      ctx,
    );
    const publishResp = await (studioPublish.POST as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/publish`, adminToken, {
        method: "POST",
        body: JSON.stringify({ document, runtimeValues }),
      }),
      ctx,
    );
    assert(publishResp.status === 200, `publish failed: ${publishResp.status}`);

    // 2. Admin grants access to exactly one designated user (no shop/plan involved).
    const grantResp = await templateAccessRoute.POST(
      req(`${base}/api/admin/template-access`, adminToken, {
        method: "POST",
        body: JSON.stringify({
          templateId,
          userId: DESIGNATED_USER_ID,
          accessLevel: "write",
        }),
      }),
    );
    assert(grantResp.status === 200, `grant failed: ${grantResp.status}`);

    // 3. The designated user can run, save, and reload.
    const runtimeCtx = { params: Promise.resolve({ id: templateId }) };
    const firstRun = await json<{ runtimeValues: typeof runtimeValues }>(
      await (runtimeRoute.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, designatedToken),
        runtimeCtx,
      ),
    );
    assert(firstRun.status === 200, `designated user run failed: ${firstRun.status}`);

    const firstDayId = document.domains!.timetable!.dayIds[0];
    const edited = JSON.parse(JSON.stringify(firstRun.body!.runtimeValues)) as typeof runtimeValues;
    edited.timetable.entriesByDay[firstDayId][0].mainTitle = "Personalized value";

    const saveResp = await (runtimeRoute.PUT as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, designatedToken, {
        method: "PUT",
        body: JSON.stringify({ runtimeValues: edited }),
      }),
      runtimeCtx,
    );
    assert(saveResp.status === 200, `designated user save failed: ${saveResp.status}`);

    const reload = await json<{ runtimeValues: typeof runtimeValues }>(
      await (runtimeRoute.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, designatedToken),
        runtimeCtx,
      ),
    );
    assert(
      reload.body!.runtimeValues.timetable.entriesByDay[firstDayId][0].mainTitle ===
        "Personalized value",
      "saved personalized value did not survive reload",
    );

    const designatedAccessIds = await json<{ templateIds: string[] }>(
      await userTemplateAccessRoute.GET(
        req(`${base}/api/user/template-access`, designatedToken),
      ),
    );
    assert(
      designatedAccessIds.body!.templateIds.includes(templateId),
      "designated user's access list should include the personalized template",
    );

    // 4. A different user (no grant) is denied on every surface.
    const otherRun = await (runtimeRoute.GET as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, otherToken),
      runtimeCtx,
    );
    assert(otherRun.status === 403, `expected 403 for other user, got ${otherRun.status}`);

    const otherAccessIds = await json<{ templateIds: string[] }>(
      await userTemplateAccessRoute.GET(req(`${base}/api/user/template-access`, otherToken)),
    );
    assert(
      !otherAccessIds.body!.templateIds.includes(templateId),
      "other user's access list leaked the personalized template",
    );

    console.log("Personalized template flow check passed.");
  } finally {
    await supabaseAdminServer
      .from("template_access")
      .delete()
      .in("user_id", [DESIGNATED_USER_ID, OTHER_USER_ID]);
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
