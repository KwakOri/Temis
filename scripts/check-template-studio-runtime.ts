import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import {
  deleteTemplateStudioTemplate,
  TemplateStudioPersistenceClient,
} from "../src/services/server/templateStudioPersistenceService";

// template_studio_user_states is a local-only table not present in the
// generated (remote) Supabase types, so a loosely-typed client is used for
// the ad-hoc queries below (matching the existing Studio persistence pattern).
const studioClient =
  supabaseAdminServer as unknown as TemplateStudioPersistenceClient;
const untypedAdminClient = supabaseAdminServer as unknown as {
  from(table: string): {
    delete(): {
      in(column: string, values: unknown[]): Promise<{ error: unknown }>;
    };
  };
};
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";
import { reconcileStudioUserRuntimeValues } from "../src/utils/template-studio/runtime-state";

const LOCAL_ADMIN_USER_ID = 9100101;
const LOCAL_ADMIN_EMAIL = "runtime-check-admin@temis.com";
const LOCAL_APPROVED_USER_ID = 9100102;
const LOCAL_APPROVED_USER_EMAIL = "runtime-check-user@temis.com";
const LOCAL_OTHER_USER_ID = 9100103;
const LOCAL_OTHER_USER_EMAIL = "runtime-check-other@temis.com";

type RouteContext = { params: Promise<{ id: string }> };
type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const assertLocalSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run Template Studio runtime check against a non-local Supabase URL.",
    );
  }
};

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id,
      created_at: now,
      updated_at: now,
      name: `Runtime Check ${id}`,
      email,
      password: "local-only",
      role,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
};

const createRequest = (
  url: string,
  token: string,
  init: { body?: BodyInit | null; method?: string } = {},
): NextRequest =>
  new NextRequest(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

const parseRouteResponse = async <T>(
  response: NextResponse,
): Promise<{ status: number; body: T | null }> => {
  const result = await response.json().catch(() => null);
  return { status: response.status, body: result as T | null };
};

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(LOCAL_ADMIN_USER_ID, LOCAL_ADMIN_EMAIL, "admin");
  await upsertUser(LOCAL_APPROVED_USER_ID, LOCAL_APPROVED_USER_EMAIL, "user");
  await upsertUser(LOCAL_OTHER_USER_ID, LOCAL_OTHER_USER_EMAIL, "user");

  const [templateRoutes, draftRoutes, publishRoutes, runtimeRoutes] =
    await Promise.all([
      import("../src/app/api/admin/template-studio/templates/route"),
      import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
      import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
      import("../src/app/api/user/templates/[id]/runtime/route"),
    ]);

  const adminToken = await signJWT(
    { userId: LOCAL_ADMIN_USER_ID, email: LOCAL_ADMIN_EMAIL, role: "admin" },
    "1h",
  );
  const approvedUserToken = await signJWT(
    {
      userId: LOCAL_APPROVED_USER_ID,
      email: LOCAL_APPROVED_USER_EMAIL,
      role: "user",
    },
    "1h",
  );
  const otherUserToken = await signJWT(
    {
      userId: LOCAL_OTHER_USER_ID,
      email: LOCAL_OTHER_USER_EMAIL,
      role: "user",
    },
    "1h",
  );

  const routeBaseUrl = "http://127.0.0.1/template-studio-runtime-check";
  let templateId: string | null = null;

  try {
    const createResp = await templateRoutes.POST(
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates`,
        adminToken,
        {
          method: "POST",
          body: JSON.stringify({
            name: "Template Studio Runtime Check",
            description: "Local runtime API verification only.",
          }),
        },
      ),
    );
    const created = await parseRouteResponse<{
      template: { id: string };
    }>(createResp);
    assert(created.status === 200, "Template create failed.");
    templateId = created.body!.template.id;
    const context = { params: Promise.resolve({ id: templateId }) };

    const document = createSampleStudioDocument();
    document.metadata.name = "Template Studio Runtime Check";
    const runtimeValues = createInitialStudioRuntimeValues(document);

    const draftResp = await (draftRoutes.PUT as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/draft`,
        adminToken,
        {
          method: "PUT",
          body: JSON.stringify({ document, runtimeValues, isAutosave: true }),
        },
      ),
      context,
    );
    assert(draftResp.status === 200, "Draft save failed.");

    // 1. Not yet entitled: forbidden regardless of whether the template exists.
    const forbiddenGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
      ),
      context,
    );
    assert(
      forbiddenGet.status === 403,
      `Expected 403 before entitlement, got ${forbiddenGet.status}`,
    );

    // 2. Draft-only (not published) template: entitlement itself requires
    // status='published' (step 5), so a regular user is forbidden even with
    // a grant, before engine/status is ever re-checked.
    const { error: accessError } = await supabaseAdminServer
      .from("template_access")
      .upsert(
        {
          template_id: templateId,
          user_id: LOCAL_APPROVED_USER_ID,
          access_level: "write",
          granted_by: LOCAL_ADMIN_USER_ID,
        },
        { onConflict: "template_id,user_id" },
      );
    if (accessError) throw accessError;

    const notPublishedGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
      ),
      context,
    );
    assert(
      notPublishedGet.status === 403,
      `Expected 403 for unpublished template (regular user), got ${notPublishedGet.status}`,
    );

    // Admins bypass the entitlement check, so they reach the engine/status
    // gate directly: a draft template correctly reports 404 there.
    const notPublishedAdminGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        adminToken,
      ),
      context,
    );
    assert(
      notPublishedAdminGet.status === 404,
      `Expected 404 for unpublished template (admin), got ${notPublishedAdminGet.status}`,
    );

    const publishResp = await (publishRoutes.POST as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/publish`,
        adminToken,
        { method: "POST", body: JSON.stringify({ document, runtimeValues }) },
      ),
      context,
    );
    assert(publishResp.status === 200, "Publish failed.");

    // 3. Other (non-entitled) user still forbidden after publish.
    const otherForbidden = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        otherUserToken,
      ),
      context,
    );
    assert(
      otherForbidden.status === 403,
      `Expected 403 for non-entitled user, got ${otherForbidden.status}`,
    );

    // 4. First GET for the entitled user: defaults, not yet persisted.
    const firstGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
      ),
      context,
    );
    const firstGetBody = await parseRouteResponse<{
      hasSavedState: boolean;
      baseRevisionNo: number | null;
      runtimeValues: unknown;
    }>(firstGet);
    assert(firstGet.status === 200, `First GET failed: ${firstGet.status}`);
    assert(
      firstGetBody.body!.hasSavedState === false,
      "First GET should report no saved state.",
    );
    assert(
      firstGetBody.body!.baseRevisionNo === 1,
      `Expected baseRevisionNo 1, got ${firstGetBody.body!.baseRevisionNo}`,
    );

    const { data: rowsAfterFirstGet } = await studioClient
      .from<{ id: string }[]>("template_studio_user_states")
      .select("id")
      .eq("template_id", templateId)
      .eq("user_id", LOCAL_APPROVED_USER_ID);
    assert(
      (rowsAfterFirstGet ?? []).length === 0,
      "First GET must not persist a row for a brand-new user.",
    );

    // 5. PUT saves values scoped to the token's own user id only. The sample
    // document has no dynamic `inputs`, so exercise a timetable-native field
    // (entry mainTitle) instead of a document-defined input.
    const firstDayId = document.domains?.timetable?.dayIds[0];
    assert(
      firstDayId,
      "Sample document must expose at least one timetable day.",
    );
    const editedRuntimeValues = JSON.parse(
      JSON.stringify(firstGetBody.body!.runtimeValues),
    ) as typeof runtimeValues;
    const firstDayEntries =
      editedRuntimeValues.timetable.entriesByDay[firstDayId] ?? [];
    assert(
      firstDayEntries.length > 0,
      "Expected a default entry for the first day.",
    );
    firstDayEntries[0].mainTitle = "Runtime check edited value";

    const putResp = await (runtimeRoutes.PUT as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
        {
          method: "PUT",
          body: JSON.stringify({ runtimeValues: editedRuntimeValues }),
        },
      ),
      context,
    );
    assert(putResp.status === 200, `PUT failed: ${putResp.status}`);

    const secondGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
      ),
      context,
    );
    const secondGetBody = await parseRouteResponse<{
      hasSavedState: boolean;
      runtimeValues: typeof runtimeValues;
    }>(secondGet);
    assert(secondGetBody.body!.hasSavedState, "State should be saved now.");
    assert(
      secondGetBody.body!.runtimeValues.timetable.entriesByDay[firstDayId!]?.[0]
        ?.mainTitle === "Runtime check edited value",
      "Saved value was not returned on next GET.",
    );

    // 6. Malformed PUT payload is rejected.
    const badPut = await (runtimeRoutes.PUT as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
        {
          method: "PUT",
          body: JSON.stringify({ runtimeValues: { bogus: true } }),
        },
      ),
      context,
    );
    assert(
      badPut.status === 400,
      `Malformed payload should be rejected, got ${badPut.status}`,
    );

    // 7. Isolation: the other user never sees the approved user's saved value.
    const { error: accessError2 } = await supabaseAdminServer
      .from("template_access")
      .upsert(
        {
          template_id: templateId,
          user_id: LOCAL_OTHER_USER_ID,
          access_level: "write",
          granted_by: LOCAL_ADMIN_USER_ID,
        },
        { onConflict: "template_id,user_id" },
      );
    if (accessError2) throw accessError2;

    const otherUserGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        otherUserToken,
      ),
      context,
    );
    const otherUserGetBody = await parseRouteResponse<{
      runtimeValues: typeof runtimeValues;
    }>(otherUserGet);
    assert(
      otherUserGetBody.body!.runtimeValues.timetable.entriesByDay[
        firstDayId!
      ]?.[0]?.mainTitle !== "Runtime check edited value",
      "Runtime values leaked across users.",
    );

    // 8. Revision compatibility: republishing bumps the revision; unchanged
    // document keeps the user's saved values but refreshes baseRevisionNo.
    const republishResp = await (publishRoutes.POST as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/template-studio/templates/${templateId}/publish`,
        adminToken,
        { method: "POST", body: JSON.stringify({ document, runtimeValues }) },
      ),
      context,
    );
    assert(republishResp.status === 200, "Republish failed.");

    const thirdGet = await (runtimeRoutes.GET as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/user/templates/${templateId}/runtime`,
        approvedUserToken,
      ),
      context,
    );
    const thirdGetBody = await parseRouteResponse<{
      baseRevisionNo: number | null;
      runtimeValues: typeof runtimeValues;
    }>(thirdGet);
    assert(
      thirdGetBody.body!.baseRevisionNo === 2,
      `Expected baseRevisionNo to advance to 2, got ${thirdGetBody.body!.baseRevisionNo}`,
    );
    assert(
      thirdGetBody.body!.runtimeValues.timetable.entriesByDay[firstDayId!]?.[0]
        ?.mainTitle === "Runtime check edited value",
      "Compatible values should survive a revision bump.",
    );

    // 9. Reconciliation util: values that no longer validate reset to defaults.
    const strippedDocument = {
      ...document,
      domains: {
        ...document.domains,
        timetable: document.domains?.timetable
          ? {
              ...document.domains.timetable,
              dayIds: document.domains.timetable.dayIds.slice(0, 1),
            }
          : undefined,
      },
    };
    const staleValues = {
      global: {},
      days: { removedDay: { someInput: "x" } },
      entries: {},
      timetable: {
        entriesByDay: { removedDay: [] },
        offlineMemoByDay: {},
      },
    };
    const reconciled = reconcileStudioUserRuntimeValues(
      strippedDocument as typeof document,
      { runtimeValues: staleValues, baseRevisionNo: 1 },
      2,
    );
    assert(
      reconciled.runtimeValues.days.removedDay === undefined,
      "Reconciliation should drop values for days no longer in the document.",
    );

    console.log("Template Studio runtime API check passed.");
  } finally {
    await untypedAdminClient
      .from("template_studio_user_states")
      .delete()
      .in("user_id", [LOCAL_APPROVED_USER_ID, LOCAL_OTHER_USER_ID]);
    await supabaseAdminServer
      .from("template_access")
      .delete()
      .in("user_id", [LOCAL_APPROVED_USER_ID, LOCAL_OTHER_USER_ID]);
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
