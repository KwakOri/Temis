/**
 * P1 follow-up: negative tests for the plan-template relationship checks
 * added to POST /api/template-purchase-requests and the
 * approve_template_purchase_request RPC.
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const BUYER_ID = 9100601;
const BUYER_EMAIL = "plan-check-buyer@temis.com";

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

const upsertUser = async (id: number, email: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id,
      created_at: now,
      updated_at: now,
      name: `Plan Check ${id}`,
      email,
      password: "local-only",
      role: "user",
    },
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
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

const json = async <T>(
  response: NextResponse,
): Promise<{ status: number; body: T | null }> => {
  const body = await response.json().catch(() => null);
  return { status: response.status, body: body as T | null };
};

const base = "http://127.0.0.1/purchase-plan-validation-check";

const insertTemplate = async (overrides: {
  name: string;
  is_public?: boolean;
  status?: string;
}) => {
  const { data, error } = await supabaseAdminServer
    .from("templates")
    .insert({
      name: overrides.name,
      description: "Plan validation check fixture",
      template_engine: "legacy",
      is_public: overrides.is_public ?? true,
      status: overrides.status ?? "published",
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("template insert failed");
  return data.id as string;
};

const insertShopProductWithPlan = async (
  templateId: string,
  overrides: { is_shop_visible?: boolean } = {},
) => {
  const { data: shopTemplate, error: shopError } = await supabaseAdminServer
    .from("shop_templates")
    .insert({
      template_id: templateId,
      title: "Plan validation check product",
      is_shop_visible: overrides.is_shop_visible ?? true,
    })
    .select("id")
    .single();
  if (shopError || !shopTemplate)
    throw shopError ?? new Error("shop_templates insert failed");

  const { data: plan, error: planError } = await supabaseAdminServer
    .from("template_plans")
    .insert({ shop_template_id: shopTemplate.id, plan: "lite", price: 1000 })
    .select("id")
    .single();
  if (planError || !plan)
    throw planError ?? new Error("template_plans insert failed");

  return {
    shopTemplateId: shopTemplate.id as string,
    planId: plan.id as string,
  };
};

const main = async () => {
  assertLocalSupabaseUrl();

  const templateIds: string[] = [];
  const requestIds: string[] = [];
  const fixtureUserName = `Plan Check ${BUYER_ID}`;

  const requireNoCleanupError = (
    error: { message: string } | null,
    label: string,
  ) => {
    if (error) {
      throw new Error(`${label}: ${error.message}`);
    }
  };

  const cleanupFixture = async () => {
    for (const id of requestIds) {
      const { error } = await supabaseAdminServer
        .from("template_purchase_requests")
        .delete()
        .eq("id", id);
      requireNoCleanupError(error, `cleanup purchase request ${id}`);
    }

    for (const id of templateIds) {
      const { error: accessError } = await supabaseAdminServer
        .from("template_access")
        .delete()
        .eq("template_id", id);
      requireNoCleanupError(accessError, `cleanup template access ${id}`);

      const { error: requestError } = await supabaseAdminServer
        .from("template_purchase_requests")
        .delete()
        .eq("template_id", id);
      requireNoCleanupError(requestError, `cleanup template requests ${id}`);

      const { error: templateError } = await supabaseAdminServer
        .from("templates")
        .delete()
        .eq("id", id);
      requireNoCleanupError(templateError, `cleanup template ${id}`);
    }

    const { error: userError } = await supabaseAdminServer
      .from("users")
      .delete()
      .eq("id", BUYER_ID)
      .eq("email", BUYER_EMAIL)
      .eq("name", fixtureUserName);
    requireNoCleanupError(userError, "cleanup purchase plan fixture user");
  };

  const verifyFixtureCleanup = async () => {
    const { count: userCount, error: userError } = await supabaseAdminServer
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("id", BUYER_ID)
      .eq("email", BUYER_EMAIL)
      .eq("name", fixtureUserName);
    requireNoCleanupError(
      userError,
      "verify purchase plan fixture user cleanup",
    );
    assert(
      userCount === 0,
      `Purchase plan fixture cleanup left ${userCount ?? "unknown"} user row(s)`,
    );

    if (templateIds.length > 0) {
      const { count: templateCount, error: templateError } =
        await supabaseAdminServer
          .from("templates")
          .select("id", { count: "exact", head: true })
          .in("id", templateIds);
      requireNoCleanupError(
        templateError,
        "verify purchase plan fixture template cleanup",
      );
      assert(
        templateCount === 0,
        `Purchase plan fixture cleanup left ${templateCount ?? "unknown"} template row(s)`,
      );
    }
  };

  let checkError: unknown = null;
  try {
    const { data: existingUser, error: existingUserError } =
      await supabaseAdminServer
        .from("users")
        .select("id, email, name")
        .eq("id", BUYER_ID)
        .maybeSingle();
    if (existingUserError) throw existingUserError;

    if (existingUser) {
      assert(
        existingUser.email === BUYER_EMAIL &&
          existingUser.name === fixtureUserName,
        `Refusing to overwrite non-fixture user ${BUYER_ID}`,
      );
      const { error: staleUserError } = await supabaseAdminServer
        .from("users")
        .delete()
        .eq("id", BUYER_ID)
        .eq("email", BUYER_EMAIL)
        .eq("name", fixtureUserName);
      requireNoCleanupError(
        staleUserError,
        "cleanup stale purchase plan fixture user",
      );
    }

    const [purchaseRequestsRoute] = await Promise.all([
      import("../src/app/api/template-purchase-requests/route"),
    ]);
    const buyerToken = await signJWT(
      { userId: BUYER_ID, email: BUYER_EMAIL, role: "user" },
      "1h",
    );
    await upsertUser(BUYER_ID, BUYER_EMAIL);

    const templateA = await insertTemplate({
      name: `Plan Check Template A ${Date.now()}`,
    });
    templateIds.push(templateA);

    const templateB = await insertTemplate({
      name: `Plan Check Template B ${Date.now()}`,
    });
    templateIds.push(templateB);

    const { planId: planA } = await insertShopProductWithPlan(templateA);
    const { planId: planB } = await insertShopProductWithPlan(templateB);

    // 1. Plan from a different template is rejected.
    const mismatched = await json<{ error: string }>(
      await purchaseRequestsRoute.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateA,
            plan_id: planB,
            depositor_name: "Plan Check Buyer",
          }),
        }),
      ),
    );
    assert(
      mismatched.status === 400,
      `Expected 400 for mismatched plan/template, got ${mismatched.status}`,
    );

    // 2. Matching plan/template succeeds.
    const matched = await json<{ purchaseRequest: { id: string } }>(
      await purchaseRequestsRoute.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateA,
            plan_id: planA,
            depositor_name: "Plan Check Buyer",
          }),
        }),
      ),
    );
    assert(
      matched.status === 201,
      `Expected 201 for matched plan/template, got ${matched.status}`,
    );
    requestIds.push(matched.body!.purchaseRequest.id);

    // 3. Non-published template is rejected even with a valid plan.
    const templateC = await insertTemplate({
      name: `Plan Check Template C ${Date.now()}`,
      status: "draft",
    });
    templateIds.push(templateC);
    const { planId: planC } = await insertShopProductWithPlan(templateC);
    const draftRejected = await json<{ error: string }>(
      await purchaseRequestsRoute.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateC,
            plan_id: planC,
            depositor_name: "Plan Check Buyer",
          }),
        }),
      ),
    );
    assert(
      draftRejected.status === 400,
      `Expected 400 for draft template purchase, got ${draftRejected.status}`,
    );

    // 4. Not-yet-visible shop product is rejected.
    const templateD = await insertTemplate({
      name: `Plan Check Template D ${Date.now()}`,
    });
    templateIds.push(templateD);
    const { planId: planD } = await insertShopProductWithPlan(templateD, {
      is_shop_visible: false,
    });
    const hiddenRejected = await json<{ error: string }>(
      await purchaseRequestsRoute.POST(
        req(`${base}/api/template-purchase-requests`, buyerToken, {
          method: "POST",
          body: JSON.stringify({
            template_id: templateD,
            plan_id: planD,
            depositor_name: "Plan Check Buyer",
          }),
        }),
      ),
    );
    assert(
      hiddenRejected.status === 400,
      `Expected 400 for not-yet-visible product, got ${hiddenRejected.status}`,
    );

    // 5. RPC-level defense: a mismatched p_plan_id override is rejected even
    // if something calls the RPC directly (bypassing the API route).
    let rpcRejected = false;
    const { error: rpcError } = await supabaseAdminServer.rpc(
      "approve_template_purchase_request",
      {
        p_request_id: requestIds[0],
        p_admin_id: BUYER_ID,
        p_plan_id: planB,
      },
    );
    if (rpcError) {
      rpcRejected = true;
    }
    assert(
      rpcRejected,
      "RPC should reject a plan override that does not match the request's plan",
    );
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

  if (checkError && cleanupError) {
    throw new AggregateError(
      [checkError, cleanupError],
      "Purchase plan validation and fixture cleanup both failed",
    );
  }
  if (checkError) throw checkError;
  if (cleanupError) throw cleanupError;

  console.log("Purchase plan validation check passed.");
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
