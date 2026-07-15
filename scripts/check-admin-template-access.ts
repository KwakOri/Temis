import { NextRequest } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const LOCAL_ADMIN_USER_ID = 9100301;
const LOCAL_ADMIN_EMAIL = "template-access-check-admin@temis.com";
const LOCAL_TARGET_USER_ID = 9100302;
const LOCAL_TARGET_EMAIL = "template-access-check-target@temis.com";

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
      "Refusing to run admin template-access check against a non-local Supabase URL.",
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
      name: `Template Access Check ${id}`,
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

const main = async () => {
  assertLocalSupabaseUrl();
  await upsertUser(LOCAL_ADMIN_USER_ID, LOCAL_ADMIN_EMAIL, "admin");
  await upsertUser(LOCAL_TARGET_USER_ID, LOCAL_TARGET_EMAIL, "user");

  const routes = await import("../src/app/api/admin/template-access/route");
  const adminToken = await signJWT(
    { userId: LOCAL_ADMIN_USER_ID, email: LOCAL_ADMIN_EMAIL, role: "admin" },
    "1h",
  );
  const routeBaseUrl = "http://127.0.0.1/admin-template-access-check";
  let templateId: string | null = null;

  try {
    const { data: template, error: templateError } = await supabaseAdminServer
      .from("templates")
      .insert({
        name: "Admin Template Access Check Fixture",
        description: "Local admin template-access API verification only.",
        template_engine: "legacy",
        status: "published",
        is_public: false,
      })
      .select("id")
      .single();
    if (templateError || !template) throw templateError ?? new Error("template insert failed");
    templateId = template.id;

    // POST: grant access.
    const grantResp = await routes.POST(
      createRequest(
        `${routeBaseUrl}/api/admin/template-access`,
        adminToken,
        {
          method: "POST",
          body: JSON.stringify({
            templateId,
            userId: LOCAL_TARGET_USER_ID,
            accessLevel: "read",
          }),
        },
      ),
    );
    assert(grantResp.status === 200, `Grant failed: ${grantResp.status}`);

    const { data: accessAfterGrant } = await supabaseAdminServer
      .from("template_access")
      .select("access_level, granted_by")
      .eq("template_id", templateId)
      .eq("user_id", LOCAL_TARGET_USER_ID)
      .single();
    assert(accessAfterGrant?.access_level === "read", "Access level not persisted.");
    assert(
      accessAfterGrant?.granted_by === LOCAL_ADMIN_USER_ID,
      "granted_by should be the acting admin.",
    );

    // GET: list access for the template.
    const listResp = await routes.GET(
      createRequest(
        `${routeBaseUrl}/api/admin/template-access?templateId=${templateId}`,
        adminToken,
      ),
    );
    assert(listResp.status === 200, `List failed: ${listResp.status}`);
    const listBody = await listResp.json();
    assert(
      listBody.accessList?.some(
        (row: { user_id: number }) => row.user_id === LOCAL_TARGET_USER_ID,
      ),
      "Granted user missing from access list.",
    );

    // PUT: update access level.
    const updateResp = await routes.PUT(
      createRequest(
        `${routeBaseUrl}/api/admin/template-access`,
        adminToken,
        {
          method: "PUT",
          body: JSON.stringify({
            templateId,
            userId: LOCAL_TARGET_USER_ID,
            accessLevel: "write",
          }),
        },
      ),
    );
    assert(updateResp.status === 200, `Update failed: ${updateResp.status}`);

    const { data: accessAfterUpdate } = await supabaseAdminServer
      .from("template_access")
      .select("access_level")
      .eq("template_id", templateId)
      .eq("user_id", LOCAL_TARGET_USER_ID)
      .single();
    assert(
      accessAfterUpdate?.access_level === "write",
      `Expected access_level write, got ${accessAfterUpdate?.access_level}`,
    );

    // DELETE: revoke access.
    const deleteResp = await routes.DELETE(
      createRequest(
        `${routeBaseUrl}/api/admin/template-access?templateId=${templateId}&userId=${LOCAL_TARGET_USER_ID}`,
        adminToken,
        { method: "DELETE" },
      ),
    );
    assert(deleteResp.status === 200, `Delete failed: ${deleteResp.status}`);

    const { data: accessAfterDelete } = await supabaseAdminServer
      .from("template_access")
      .select("id")
      .eq("template_id", templateId)
      .eq("user_id", LOCAL_TARGET_USER_ID);
    assert(
      (accessAfterDelete ?? []).length === 0,
      "Access row should be gone after revoke.",
    );

    console.log("Admin template-access API check passed.");
  } finally {
    await supabaseAdminServer
      .from("template_access")
      .delete()
      .eq("user_id", LOCAL_TARGET_USER_ID);
    if (templateId) {
      await supabaseAdminServer.from("templates").delete().eq("id", templateId);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
