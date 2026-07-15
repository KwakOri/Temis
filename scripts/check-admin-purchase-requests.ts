import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const LOCAL_ADMIN_USER_ID = 9100201;
const LOCAL_ADMIN_EMAIL = "purchase-check-admin@temis.com";
const LOCAL_BUYER_USER_ID = 9100202;
const LOCAL_BUYER_EMAIL = "purchase-check-buyer@temis.com";
const LOCAL_OTHER_USER_ID = 9100203;
const LOCAL_OTHER_EMAIL = "purchase-check-other@temis.com";

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (
    !supabaseUrl.startsWith("http://127.0.0.1:") &&
    !supabaseUrl.startsWith("http://localhost:")
  ) {
    throw new Error(
      "Refusing to run admin purchase-requests check against a non-local Supabase URL.",
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
      name: `Purchase Check ${id}`,
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
  await upsertUser(LOCAL_BUYER_USER_ID, LOCAL_BUYER_EMAIL, "user");
  await upsertUser(LOCAL_OTHER_USER_ID, LOCAL_OTHER_EMAIL, "user");

  const [listRoute, itemRoute, approveRoute] = await Promise.all([
    import("../src/app/api/admin/purchase-requests/route"),
    import("../src/app/api/admin/purchase-requests/[id]/route"),
    import("../src/app/api/admin/purchase-requests/[id]/approve/route"),
  ]);

  const adminToken = await signJWT(
    { userId: LOCAL_ADMIN_USER_ID, email: LOCAL_ADMIN_EMAIL, role: "admin" },
    "1h",
  );
  const otherUserToken = await signJWT(
    { userId: LOCAL_OTHER_USER_ID, email: LOCAL_OTHER_EMAIL, role: "user" },
    "1h",
  );

  const routeBaseUrl = "http://127.0.0.1/admin-purchase-requests-check";
  const seededRequestIds: string[] = [];
  const seededTemplateIds: string[] = [];

  try {
    const { data: template, error: templateError } = await supabaseAdminServer
      .from("templates")
      .insert({
        name: "Purchase Check Fixture",
        description: "Local admin purchase-requests API verification only.",
        template_engine: "legacy",
        status: "published",
        is_public: false,
      })
      .select("id")
      .single();
    if (templateError || !template) throw templateError ?? new Error("template insert failed");
    seededTemplateIds.push(template.id);

    const { data: purchaseRequest, error: requestError } =
      await supabaseAdminServer
        .from("template_purchase_requests")
        .insert({
          template_id: template.id,
          user_id: LOCAL_BUYER_USER_ID,
          status: "pending",
        })
        .select("id")
        .single();
    if (requestError || !purchaseRequest)
      throw requestError ?? new Error("purchase request insert failed");
    seededRequestIds.push(purchaseRequest.id);

    // 1. Non-admin is rejected by every route.
    const forbiddenList = await listRoute.GET(
      createRequest(`${routeBaseUrl}/api/admin/purchase-requests`, otherUserToken),
    );
    assert(forbiddenList.status === 403, `Expected 403 for list, got ${forbiddenList.status}`);

    const forbiddenApprove = await (approveRoute.POST as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/purchase-requests/${purchaseRequest.id}/approve`,
        otherUserToken,
        { method: "POST", body: JSON.stringify({}) },
      ),
      { params: Promise.resolve({ id: purchaseRequest.id }) },
    );
    assert(
      forbiddenApprove.status === 403,
      `Expected 403 for approve, got ${forbiddenApprove.status}`,
    );

    // 2. Admin sees the seeded request in the list.
    const listResp = await parseRouteResponse<{
      requests: Array<{ id: string }>;
    }>(
      await listRoute.GET(
        createRequest(`${routeBaseUrl}/api/admin/purchase-requests`, adminToken),
      ),
    );
    assert(listResp.status === 200, `List failed: ${listResp.status}`);
    assert(
      listResp.body!.requests.some((r) => r.id === purchaseRequest.id),
      "Seeded request missing from admin list.",
    );

    // 3. Approve: grants access, marks completed, records the *actual* acting admin.
    const approveContext = { params: Promise.resolve({ id: purchaseRequest.id }) };
    const approveResp = await (approveRoute.POST as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/purchase-requests/${purchaseRequest.id}/approve`,
        adminToken,
        { method: "POST", body: JSON.stringify({}) },
      ),
      approveContext,
    );
    assert(approveResp.status === 200, `Approve failed: ${approveResp.status}`);

    const { data: accessRows } = await supabaseAdminServer
      .from("template_access")
      .select("id, granted_by")
      .eq("template_id", template.id)
      .eq("user_id", LOCAL_BUYER_USER_ID);
    assert((accessRows ?? []).length === 1, "Expected exactly one access row after approval.");
    assert(
      accessRows![0].granted_by === LOCAL_ADMIN_USER_ID,
      `Expected granted_by=${LOCAL_ADMIN_USER_ID}, got ${accessRows![0].granted_by}`,
    );

    const { data: requestAfterApprove } = await supabaseAdminServer
      .from("template_purchase_requests")
      .select("status")
      .eq("id", purchaseRequest.id)
      .single();
    assert(
      requestAfterApprove?.status === "completed",
      `Expected status completed, got ${requestAfterApprove?.status}`,
    );

    // 4. Retry is idempotent: no duplicate access row.
    const retryResp = await (approveRoute.POST as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/purchase-requests/${purchaseRequest.id}/approve`,
        adminToken,
        { method: "POST", body: JSON.stringify({}) },
      ),
      approveContext,
    );
    assert(retryResp.status === 200, `Retry approve failed: ${retryResp.status}`);

    const { data: accessRowsAfterRetry } = await supabaseAdminServer
      .from("template_access")
      .select("id")
      .eq("template_id", template.id)
      .eq("user_id", LOCAL_BUYER_USER_ID);
    assert(
      (accessRowsAfterRetry ?? []).length === 1,
      `Retry must not duplicate access rows, got ${(accessRowsAfterRetry ?? []).length}`,
    );

    // 5. Reject path via generic PATCH.
    const { data: secondRequest, error: secondRequestError } =
      await supabaseAdminServer
        .from("template_purchase_requests")
        .insert({
          template_id: template.id,
          user_id: LOCAL_OTHER_USER_ID,
          status: "pending",
        })
        .select("id")
        .single();
    if (secondRequestError || !secondRequest)
      throw secondRequestError ?? new Error("second request insert failed");
    seededRequestIds.push(secondRequest.id);

    const rejectResp = await (itemRoute.PATCH as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/purchase-requests/${secondRequest.id}`,
        adminToken,
        { method: "PATCH", body: JSON.stringify({ status: "rejected" }) },
      ),
      { params: Promise.resolve({ id: secondRequest.id }) },
    );
    assert(rejectResp.status === 200, `Reject failed: ${rejectResp.status}`);

    const { data: requestAfterReject } = await supabaseAdminServer
      .from("template_purchase_requests")
      .select("status")
      .eq("id", secondRequest.id)
      .single();
    assert(
      requestAfterReject?.status === "rejected",
      `Expected status rejected, got ${requestAfterReject?.status}`,
    );

    // 6. Invalid status values are rejected.
    const badPatch = await (itemRoute.PATCH as RouteHandler)(
      createRequest(
        `${routeBaseUrl}/api/admin/purchase-requests/${secondRequest.id}`,
        adminToken,
        { method: "PATCH", body: JSON.stringify({ status: "not-a-real-status" }) },
      ),
      { params: Promise.resolve({ id: secondRequest.id }) },
    );
    assert(badPatch.status === 400, `Expected 400 for bad status, got ${badPatch.status}`);

    console.log("Admin purchase-requests API check passed.");
  } finally {
    await supabaseAdminServer
      .from("template_access")
      .delete()
      .in("user_id", [LOCAL_BUYER_USER_ID, LOCAL_OTHER_USER_ID]);
    for (const id of seededRequestIds) {
      await supabaseAdminServer.from("template_purchase_requests").delete().eq("id", id);
    }
    for (const id of seededTemplateIds) {
      await supabaseAdminServer.from("templates").delete().eq("id", id);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
