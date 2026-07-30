/**
 * P2 follow-up: confirms DELETE /api/admin/template-studio/templates/{id}
 * attempts R2 cleanup but does not block the DB delete when R2 is
 * unreachable/unconfigured (best-effort, matching the project's other
 * non-blocking storage operations).
 */
import { NextRequest, NextResponse } from "next/server";

import { signJWT } from "../src/lib/auth/jwt";
import { supabaseAdminServer } from "../src/lib/supabase-admin-server";

const ADMIN_ID = 9100801;
const ADMIN_EMAIL = "r2-cleanup-check-admin@temis.com";

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

const upsertUser = async (id: number, email: string) => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdminServer.from("users").upsert(
    {
      id,
      created_at: now,
      updated_at: now,
      name: `R2 Cleanup Check ${id}`,
      email,
      password: "local-only",
      role: "admin",
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

const base = "http://127.0.0.1/template-studio-delete-r2-cleanup-check";

const main = async () => {
  assertLocalSupabaseUrl();
  // Deliberately make sure R2 credentials are NOT present, so the delete
  // route's best-effort cleanup call is guaranteed to fail internally.
  delete process.env.CLOUDFLARE_R2_ENDPOINT;
  delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  delete process.env.CLOUDFLARE_R2_BUCKET_NAME;

  await upsertUser(ADMIN_ID, ADMIN_EMAIL);

  const [templatesRoute, templateItemRoute] = await Promise.all([
    import("../src/app/api/admin/template-studio/templates/route"),
    import("../src/app/api/admin/template-studio/templates/[id]/route"),
  ]);

  const adminToken = await signJWT(
    { userId: ADMIN_ID, email: ADMIN_EMAIL, role: "admin" },
    "1h",
  );

  const created = await json<{ template: { id: string } }>(
    await templatesRoute.POST(
      req(`${base}/api/admin/template-studio/templates`, adminToken, {
        method: "POST",
        body: JSON.stringify({
          name: "R2 Cleanup Check",
          description: "P2 verification only",
        }),
      }),
    ),
  );
  assert(created.status === 200, `create failed: ${created.status}`);
  const templateId = created.body!.template.id;

  const deleteResp = await (templateItemRoute.DELETE as RouteHandler)(
    req(
      `${base}/api/admin/template-studio/templates/${templateId}`,
      adminToken,
      {
        method: "DELETE",
      },
    ),
    { params: Promise.resolve({ id: templateId }) },
  );
  assert(
    deleteResp.status === 200,
    `delete should succeed even when R2 cleanup fails, got ${deleteResp.status}`,
  );

  const { data: remaining } = await supabaseAdminServer
    .from("templates")
    .select("id")
    .eq("id", templateId);
  assert(
    (remaining ?? []).length === 0,
    "template row should be gone after delete",
  );

  console.log(
    "Template Studio delete R2-cleanup-failure-tolerance check passed.",
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
