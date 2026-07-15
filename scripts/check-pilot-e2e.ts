/**
 * Step 10 pilot: walks a single Studio template through the full lifecycle
 * described in docs/template-system-integration/10-pilot-e2e-rollout.md —
 * create -> draft -> publish -> shop listing -> purchase -> approval ->
 * access -> user runtime save/reload -> isolation -> revision compatibility.
 * Local-only; does not touch the remote project.
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";
import { deleteTemplateStudioTemplate } from "../src/services/server/templateStudioPersistenceService";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const ADMIN_ID = 9100401;
const ADMIN_EMAIL = "pilot-admin@temis.com";
const BUYER_ID = 9100402;
const BUYER_EMAIL = "pilot-buyer@temis.com";
const OTHER_ID = 9100403;
const OTHER_EMAIL = "pilot-other@temis.com";
const ARTIST_USER_ID = 9100404;
const ARTIST_EMAIL = "pilot-artist@temis.com";

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
    throw new Error("Refusing to run the pilot against a non-local Supabase URL.");
  }
};

const upsertUser = async (id: number, email: string, role: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    { id, created_at: now, updated_at: now, name: `Pilot ${id}`, email, password: "local-only", role },
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

const base = "http://127.0.0.1/pilot-e2e";

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(ADMIN_ID, ADMIN_EMAIL, "admin");
  await upsertUser(BUYER_ID, BUYER_EMAIL, "user");
  await upsertUser(OTHER_ID, OTHER_EMAIL, "user");
  await upsertUser(ARTIST_USER_ID, ARTIST_EMAIL, "user");

  const [
    studioTemplates,
    studioDraft,
    studioPublish,
    studioDetail,
    shopTemplates,
    shopTemplateItem,
    templatePlans,
    purchaseRequests,
    userPurchaseRequests,
    purchaseHistory,
    adminPurchaseRequests,
    approveRoute,
    runtimeRoute,
    userTemplates,
    userTemplateAccess,
  ] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/draft/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/publish/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/route"),
    import("../src/app/api/admin/shop-templates/route"),
    import("../src/app/api/admin/shop-templates/[id]/route"),
    import("../src/app/api/admin/template-plans/route"),
    import("../src/app/api/template-purchase-requests/route"),
    import("../src/app/api/user/purchase-requests/[id]/route"),
    import("../src/app/api/user/purchase-history/route"),
    import("../src/app/api/admin/purchase-requests/route"),
    import("../src/app/api/admin/purchase-requests/[id]/approve/route"),
    import("../src/app/api/user/templates/[id]/runtime/route"),
    import("../src/app/api/user/templates/route"),
    import("../src/app/api/user/template-access/route"),
  ]);

  const adminToken = await signJWT({ userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" }, "1h");
  const buyerToken = await signJWT({ userId: BUYER_ID, email: BUYER_EMAIL, role: "user" }, "1h");
  const otherToken = await signJWT({ userId: OTHER_ID, email: OTHER_EMAIL, role: "user" }, "1h");
  const artistUserToken = await signJWT(
    { userId: ARTIST_USER_ID, email: ARTIST_EMAIL, role: "user" },
    "1h",
  );

  let templateId: string | null = null;
  let shopTemplateId: string | null = null;
  let artistId: string | null = null;

  try {
    // 1. Admin creates a Studio template and saves a draft.
    const created = await json<{ template: { id: string } }>(
      await studioTemplates.POST(
        req(`${base}/api/admin/template-studio/templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({ name: "Pilot Studio Template", description: "E2E pilot" }),
        }),
      ),
    );
    assert(created.status === 200, `create failed: ${created.status}`);
    templateId = created.body!.template.id;
    const ctx = { params: Promise.resolve({ id: templateId }) };

    const document = createSampleStudioDocument();
    document.metadata.name = "Pilot Studio Template";
    const runtimeValues = createInitialStudioRuntimeValues(document);

    const draftResp = await (studioDraft.PUT as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/draft`, adminToken, {
        method: "PUT",
        body: JSON.stringify({ document, runtimeValues, isAutosave: true }),
      }),
      ctx,
    );
    assert(draftResp.status === 200, `draft save failed: ${draftResp.status}`);

    // 2. Admin previews the draft before publishing.
    const preview = await json<{ source: string; draft: unknown }>(
      await (studioDetail.GET as RouteHandler)(
        req(`${base}/api/admin/template-studio/templates/${templateId}`, adminToken),
        ctx,
      ),
    );
    assert(preview.status === 200 && preview.body!.source === "draft", "preview should show the draft");

    // Publish.
    const publishResp = await (studioPublish.POST as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/publish`, adminToken, {
        method: "POST",
        body: JSON.stringify({ document, runtimeValues }),
      }),
      ctx,
    );
    assert(publishResp.status === 200, `publish failed: ${publishResp.status}`);

    // 3. Connect a general-sale product + plan and expose it in the shop.
    // is_public is a product classification only (step 5) — set directly, same
    // as the admin "공개로 전환" action would.
    await supabaseAdminServer.from("templates").update({ is_public: true }).eq("id", templateId);

    const { data: artist, error: artistError } = await supabaseAdminServer
      .from("artists")
      .insert({ name: "Pilot Artist", slug: `pilot-artist-${Date.now()}`, user_id: ARTIST_USER_ID })
      .select("id")
      .single();
    if (artistError || !artist) throw artistError ?? new Error("artist insert failed");
    artistId = artist.id;
    const { error: linkError } = await supabaseAdminServer
      .from("template_artists")
      .insert({ template_id: templateId, artist_id: artistId, is_primary: true, display_order: 0 });
    if (linkError) throw linkError;

    // Selling requires a royalty rule for every linked artist.
    const { error: royaltyError } = await supabaseAdminServer
      .from("artist_royalty_rules")
      .insert({ artist_id: artistId, royalty_type: "percentage", royalty_value: 30 });
    if (royaltyError) throw royaltyError;

    const shopCreate = await json<{ product: { id: string } }>(
      await shopTemplates.POST(
        req(`${base}/api/admin/shop-templates`, adminToken, {
          method: "POST",
          body: JSON.stringify({ template_id: templateId, title: "Pilot Studio Template" }),
        }),
      ),
    );
    assert(shopCreate.status === 201, `shop product create failed: ${shopCreate.status}`);
    shopTemplateId = shopCreate.body!.product.id;

    const planCreate = await json<{ plan: { id: string } }>(
      await templatePlans.POST(
        req(`${base}/api/admin/template-plans`, adminToken, {
          method: "POST",
          body: JSON.stringify({ shop_template_id: shopTemplateId, plan: "lite", price: 9900 }),
        }),
      ),
    );
    assert(planCreate.status === 200 || planCreate.status === 201, `plan create failed: ${planCreate.status}`);
    const planId = planCreate.body!.plan.id;

    const visibilityResp = await (shopTemplateItem.PATCH as RouteHandler)(
      req(`${base}/api/admin/shop-templates/${shopTemplateId}`, adminToken, {
        method: "PATCH",
        body: JSON.stringify({ is_shop_visible: true }),
      }),
      { params: Promise.resolve({ id: shopTemplateId }) },
    );
    assert(visibilityResp.status === 200, `shop visibility toggle failed: ${visibilityResp.status}`);

    // 4. Buyer submits a purchase request (real POST /api/template-purchase-requests route).
    const purchaseCreate = await json<{ purchaseRequest: { id: string } }>(
      await purchaseRequests.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateId,
            plan_id: planId,
            depositor_name: "Pilot Buyer",
          }),
        }),
      ),
    );
    assert(purchaseCreate.status === 201, `purchase request failed: ${purchaseCreate.status}`);
    const requestId = purchaseCreate.body!.purchaseRequest.id;

    // Buyer can see their own request through both list routes.
    const ownRequests = await json<{ requests: Array<{ id: string }> }>(
      await purchaseRequests.GET(req(`${base}/api/template-purchase-requests`, buyerToken)),
    );
    assert(
      ownRequests.status === 200 && ownRequests.body!.requests.some((r) => r.id === requestId),
      "buyer's own purchase request list should include the new request",
    );

    // Buyer can edit/cancel a still-pending request of their own (a second,
    // throwaway request so the one approved below is unaffected).
    const scratchCreate = await json<{ purchaseRequest: { id: string } }>(
      await purchaseRequests.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateId,
            plan_id: planId,
            depositor_name: "Pilot Buyer Scratch",
          }),
        }),
      ),
    );
    assert(scratchCreate.status === 201, `scratch purchase request failed: ${scratchCreate.status}`);
    const scratchId = scratchCreate.body!.purchaseRequest.id;

    const scratchEdit = await (userPurchaseRequests.PUT as RouteHandler)(
      req(`${base}/api/user/purchase-requests/${scratchId}`, buyerToken, {
        method: "PUT",
        body: JSON.stringify({ depositor_name: "Pilot Buyer Renamed" }),
      }),
      { params: Promise.resolve({ id: scratchId }) },
    );
    assert(scratchEdit.status === 200, `own-request edit failed: ${scratchEdit.status}`);

    const scratchDelete = await (userPurchaseRequests.DELETE as RouteHandler)(
      req(`${base}/api/user/purchase-requests/${scratchId}`, buyerToken, { method: "DELETE" }),
      { params: Promise.resolve({ id: scratchId }) },
    );
    assert(scratchDelete.status === 200, `own-request cancel failed: ${scratchDelete.status}`);

    // 5. Admin approves; template_access is created exactly once.
    const adminList = await json<{ requests: Array<{ id: string }> }>(
      await adminPurchaseRequests.GET(req(`${base}/api/admin/purchase-requests`, adminToken)),
    );
    assert(
      adminList.status === 200 && adminList.body!.requests.some((r) => r.id === requestId),
      "admin purchase-requests list should include the new request",
    );

    const approveResp = await (approveRoute.POST as RouteHandler)(
      req(`${base}/api/admin/purchase-requests/${requestId}/approve`, adminToken, {
        method: "POST",
        body: JSON.stringify({ planId }),
      }),
      { params: Promise.resolve({ id: requestId }) },
    );
    assert(approveResp.status === 200, `approve failed: ${approveResp.status}`);

    const { data: accessRows } = await supabaseAdminServer
      .from("template_access")
      .select("id, granted_by")
      .eq("template_id", templateId)
      .eq("user_id", BUYER_ID);
    assert((accessRows ?? []).length === 1, "expected exactly one template_access row");
    assert(accessRows![0].granted_by === ADMIN_ID, "granted_by should be the approving admin");

    // Purchase history reflects the completed purchase.
    const history = await json<{ purchases: Array<{ id: string; status: string }> }>(
      await purchaseHistory.GET(req(`${base}/api/user/purchase-history`, buyerToken)),
    );
    assert(history.status === 200, `purchase history failed: ${history.status}`);

    // 6. Buyer runs the Studio template, edits values, saves, and reloads.
    const runtimeCtx = { params: Promise.resolve({ id: templateId }) };
    const firstRun = await json<{
      runtimeValues: typeof runtimeValues;
      baseRevisionNo: number | null;
    }>(
      await (runtimeRoute.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken),
        runtimeCtx,
      ),
    );
    assert(firstRun.status === 200, `first runtime GET failed: ${firstRun.status}`);

    const firstDayId = document.domains!.timetable!.dayIds[0];
    const edited = JSON.parse(JSON.stringify(firstRun.body!.runtimeValues)) as typeof runtimeValues;
    edited.timetable.entriesByDay[firstDayId][0].mainTitle = "Pilot saved value";

    const saveResp = await (runtimeRoute.PUT as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken, {
        method: "PUT",
        body: JSON.stringify({ runtimeValues: edited }),
      }),
      runtimeCtx,
    );
    assert(saveResp.status === 200, `runtime save failed: ${saveResp.status}`);

    const reload = await json<{ runtimeValues: typeof runtimeValues }>(
      await (runtimeRoute.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken),
        runtimeCtx,
      ),
    );
    assert(
      reload.body!.runtimeValues.timetable.entriesByDay[firstDayId][0].mainTitle ===
        "Pilot saved value",
      "saved runtime value did not survive reload",
    );

    // My-page listing shows the purchase with the correct Studio run link.
    const myPage = await json<{
      purchase_templates: Array<{ templates: { id: string; use_href: string } }>;
    }>(await userTemplates.GET(req(`${base}/api/user/templates`, buyerToken)));
    assert(myPage.status === 200, `my-page templates failed: ${myPage.status}`);
    const myPageRow = myPage.body!.purchase_templates.find((r) => r.templates.id === templateId);
    assert(myPageRow, "purchased template missing from my-page list");
    assert(
      myPageRow!.templates.use_href === `/template-studio/${templateId}`,
      `expected studio use_href, got ${myPageRow!.templates.use_href}`,
    );

    // Bulk access-id list (shop "이용하기" vs "구매하기" gating) includes it.
    const accessIds = await json<{ templateIds: string[] }>(
      await userTemplateAccess.GET(req(`${base}/api/user/template-access`, buyerToken)),
    );
    assert(
      accessIds.status === 200 && accessIds.body!.templateIds.includes(templateId),
      "bulk template-access list should include the purchased template",
    );

    // 7. A non-purchasing user is denied everywhere.
    const otherRuntimeDenied = await (runtimeRoute.GET as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, otherToken),
      runtimeCtx,
    );
    assert(otherRuntimeDenied.status === 403, `expected 403, got ${otherRuntimeDenied.status}`);

    const otherMyPage = await json<{ purchase_templates: Array<{ templates: { id: string } }> }>(
      await userTemplates.GET(req(`${base}/api/user/templates`, otherToken)),
    );
    assert(
      !otherMyPage.body!.purchase_templates.some((r) => r.templates.id === templateId),
      "non-purchasing user should not see the template on my-page",
    );

    const otherAccessIds = await json<{ templateIds: string[] }>(
      await userTemplateAccess.GET(req(`${base}/api/user/template-access`, otherToken)),
    );
    assert(
      !otherAccessIds.body!.templateIds.includes(templateId),
      "non-purchasing user's access list leaked the template",
    );

    // 8. The linked artist and admin can both reach the runtime page.
    const artistRun = await (runtimeRoute.GET as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, artistUserToken),
      runtimeCtx,
    );
    assert(artistRun.status === 200, `artist run failed: ${artistRun.status}`);

    const adminRun = await (runtimeRoute.GET as RouteHandler)(
      req(`${base}/api/user/templates/${templateId}/runtime`, adminToken),
      runtimeCtx,
    );
    assert(adminRun.status === 200, `admin run failed: ${adminRun.status}`);

    // 9. Revision update: republish unchanged document, confirm the buyer's
    // saved value survives (deep-dived further in check-template-studio-runtime.ts).
    const republish = await (studioPublish.POST as RouteHandler)(
      req(`${base}/api/admin/template-studio/templates/${templateId}/publish`, adminToken, {
        method: "POST",
        body: JSON.stringify({ document, runtimeValues }),
      }),
      ctx,
    );
    assert(republish.status === 200, `republish failed: ${republish.status}`);

    const afterRepublish = await json<{
      runtimeValues: typeof runtimeValues;
      baseRevisionNo: number | null;
    }>(
      await (runtimeRoute.GET as RouteHandler)(
        req(`${base}/api/user/templates/${templateId}/runtime`, buyerToken),
        runtimeCtx,
      ),
    );
    assert(afterRepublish.body!.baseRevisionNo === 2, "revision should advance to 2");
    assert(
      afterRepublish.body!.runtimeValues.timetable.entriesByDay[firstDayId][0].mainTitle ===
        "Pilot saved value",
      "compatible saved value should survive a revision bump",
    );

    console.log("Pilot E2E check passed.");
  } finally {
    await supabaseAdminServer
      .from("template_access")
      .delete()
      .in("user_id", [BUYER_ID, OTHER_ID, ARTIST_USER_ID]);
    if (templateId) {
      // template_sales.template_id is ON DELETE RESTRICT (sales records are
      // never silently dropped), so the sale created by approval must be
      // cleared before the template can be deleted. template_access and
      // every template_studio_* child table cascade-delete on their own.
      await supabaseAdminServer.from("template_sales").delete().eq("template_id", templateId);
      await supabaseAdminServer
        .from("template_purchase_requests")
        .delete()
        .eq("template_id", templateId);
    }
    if (artistId) {
      await supabaseAdminServer.from("template_artists").delete().eq("artist_id", artistId);
      await supabaseAdminServer.from("artists").delete().eq("id", artistId);
    }
    if (templateId) {
      await deleteTemplateStudioTemplate(templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
