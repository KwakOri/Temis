import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";

async function main() {
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture_only";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture_only";
  process.env.JWT_SECRET = randomBytes(32).toString("hex");
  process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://legacy-assets.invalid";
  const savedFetch = globalThis.fetch;
  const id = "00000000-0000-4000-8000-000000000001";
  const setId = "00000000-0000-4000-8000-000000000002";
  const revisionId = "00000000-0000-4000-8000-000000000003";
  const versionId = "00000000-0000-4000-8000-000000000004";
  const rows: Record<string, unknown> = {
    users: { id: 1 },
    templates: { name: "fixture", template_engine: "legacy" },
    legacy_template_asset_sets: {
      id: setId,
      template_id: id,
      team_template_id: null,
      thumbnail_id: null,
      mode: "r2",
      expected_slots: { first: ["profileBG"] },
      active_revision_id: revisionId,
      updated_at: "2026-10-04",
    },
    legacy_template_asset_versions: [
      {
        id: versionId,
        asset_set_id: setId,
        asset_id: "a".repeat(64),
        content_hash: "b".repeat(64),
        storage_path: "legacy-template-assets/fixture/image.png",
        mime_type: "image/png",
        byte_size: 100,
        width: 10,
        height: 10,
        original_filename: "profileBG.png",
        created_at: "2026-10-04",
      },
    ],
    legacy_template_asset_revisions: [
      {
        id: revisionId,
        asset_set_id: setId,
        revision_no: 1,
        bindings: { first: { profileBG: versionId } },
        note: "initial",
        created_at: "2026-10-04",
        created_by: 1,
      },
    ],
  };
  let calls = 0;
  let conflict = false;
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? input.toString()
        : input.url,
    );
    assert.equal(
      url.origin,
      "http://127.0.0.1:1",
      "Test attempted an external request",
    );
    if (url.pathname.includes("/rpc/"))
      return new Response(
        JSON.stringify(
          conflict
            ? { code: "40001", message: "fixture" }
            : "00000000-0000-4000-8000-000000000005",
        ),
        {
          status: conflict ? 409 : 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    const table = url.pathname.split("/").pop()!;
    assert.ok(Object.hasOwn(rows, table), `Unexpected table ${table}`);
    assert.ok(
      !init?.method || init.method === "GET",
      "Unexpected write outside RPC",
    );
    const data = rows[table];
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const limit = Number(url.searchParams.get("limit") ?? "1000");
    return new Response(
      JSON.stringify(
        Array.isArray(data) ? data.slice(offset, offset + limit) : data,
      ),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  try {
    const admin =
      await import("../src/app/api/admin/legacy-template-assets/[ownerKind]/[id]/route");
    const runtime =
      await import("../src/app/api/legacy-template-assets/[ownerKind]/[id]/route");
    const { signJWT } = await import("../src/lib/auth/jwt");
    const adminToken = await signJWT({ userId: 1, role: "admin" });
    const userToken = await signJWT({ userId: 2, role: "user" });
    const context = { params: Promise.resolve({ ownerKind: "timetable", id }) };
    const request = (token?: string, body?: unknown) =>
      new NextRequest(
        `http://localhost/api/admin/legacy-template-assets/timetable/${id}`,
        {
          ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        },
      );
    assert.equal((await admin.GET(request(), context)).status, 401);
    assert.equal((await admin.GET(request(userToken), context)).status, 403);
    assert.equal((await runtime.GET(request(), context)).status, 401);
    assert.equal(calls, 0);
    assert.equal(
      (
        await admin.GET(request(adminToken), {
          params: Promise.resolve({ ownerKind: "studio", id }),
        })
      ).status,
      400,
    );
    const response = await runtime.GET(request(adminToken), context);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(
      (await response.json()).images.first.profileBG.src,
      "https://legacy-assets.invalid/legacy-template-assets/fixture/image.png",
    );
    const changes = [{ theme: "first", key: "profileBG", versionId }];
    const originalVersions = rows.legacy_template_asset_versions;
    rows.legacy_template_asset_versions = Array.from(
      { length: 501 },
      () => (originalVersions as unknown[])[0],
    );
    const history = await admin.GET(request(adminToken), context);
    assert.equal(history.status, 200);
    assert.equal(
      (await history.json()).versions.length,
      501,
      "History was truncated at a database page boundary",
    );
    rows.legacy_template_asset_versions = originalVersions;
    const valid = { action: "apply", expectedRevisionId: revisionId, changes };
    assert.equal(
      (
        await admin.POST(
          request(adminToken, { ...valid, expectedRevisionId: null }),
          context,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await admin.POST(
          request(adminToken, {
            ...valid,
            changes: [{ ...changes[0], versionId: "foreign" }],
          }),
          context,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await admin.POST(
          request(adminToken, { action: "preview", changes }),
          context,
        )
      ).status,
      200,
    );
    assert.equal(
      (await admin.POST(request(adminToken, valid), context)).status,
      200,
    );
    conflict = true;
    assert.equal(
      (await admin.POST(request(adminToken, valid), context)).status,
      409,
    );
    assert.equal(
      (
        await admin.POST(
          request(adminToken, { action: "verify", ticket: "tampered" }),
          context,
        )
      ).status,
      400,
    );
    console.log(
      "Legacy asset API checks passed: unauthenticated/role rejection, owner validation, private runtime response, candidate validation and transaction conflict propagation.",
    );
  } finally {
    globalThis.fetch = savedFetch;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
