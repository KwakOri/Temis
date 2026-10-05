import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";
import { createTeamStudioConnectionService } from "../src/services/server/teamStudioConnectionService";
import { TeamStudioRuntimeError } from "../src/services/server/teamStudioDataService";
import { createStudioTeamDocument } from "../src/utils/template-studio/team-timetable";

async function main() {
  const templateId = "00000000-0000-4000-8000-000000000008";
  const teamId = "00000000-0000-4000-8000-000000000009";
  const document = createStudioTeamDocument();
  let hasDocument = true,
    active = true,
    missingStorage = false;
  let connection: Record<string, unknown> | null = null;
  let memberIds = [7, 8, 9];
  const writes: string[] = [];
  const scheduleFilters: Array<[string, unknown]> = [];
  const from = (table: string) => {
    let operation = "read",
      payload: Record<string, unknown> | null = null;
    const filters: Array<[string, unknown]> = [];
    const result = () => {
      if (table === "team_studio_connections") {
        if (missingStorage) return { data: null, error: { code: "PGRST205" } };
        if (operation === "upsert") {
          connection = payload;
          writes.push(table);
        }
        if (operation === "delete") {
          connection = null;
          writes.push(table);
        }
        return { data: connection ? [connection] : [], error: null };
      }
      if (table === "teams")
        return {
          data: active ? [{ id: teamId, name: "Fixture team" }] : [],
          error: null,
        };
      if (table === "team_members")
        return {
          data: memberIds.map((user_id) => ({
            user_id,
            users: { id: user_id, name: `MEMBER ${user_id}` },
          })),
          error: null,
        };
      if (table === "users") return { data: [{ id: 7 }], error: null };
      if (table === "team_schedules") {
        scheduleFilters.push(...filters);
        return { data: [], error: null };
      }
      return { data: [], error: null };
    };
    const query = {
      select() {
        return query;
      },
      eq(key: string, value: unknown) {
        filters.push([key, value]);
        return query;
      },
      in(key: string, value: unknown) {
        filters.push([key, value]);
        return query;
      },
      order() {
        return query;
      },
      limit() {
        return query;
      },
      upsert(value: Record<string, unknown>) {
        operation = "upsert";
        payload = value;
        return query;
      },
      delete() {
        operation = "delete";
        return query;
      },
      maybeSingle() {
        const value = result();
        return Promise.resolve({ ...value, data: value.data?.[0] ?? null });
      },
      then(
        resolve: (value: unknown) => unknown,
        reject: (error: unknown) => unknown,
      ) {
        return Promise.resolve(result()).then(resolve, reject);
      },
    };
    return query;
  };
  const service = createTeamStudioConnectionService({
    db: { from } as unknown as SupabaseClient<Database>,
    document: async () => (hasDocument ? document : null),
  });
  const fail = async (status: number, promise: Promise<unknown>) =>
    assert.rejects(
      promise,
      (error: unknown) =>
        error instanceof TeamStudioRuntimeError && error.status === status,
    );
  assert.equal(await service.get(templateId, 7), null);
  await fail(400, service.get("bad", 7));
  hasDocument = false;
  await fail(404, service.save(templateId, 7, { teamId, memberBindings: {} }));
  hasDocument = true;
  for (const body of [
    null,
    [],
    {},
    { teamId: "bad", memberBindings: {} },
    { teamId, memberBindings: [] },
    { teamId, memberBindings: { "member-a": 999 } },
    { teamId, memberBindings: { "member-a": "7" } },
    { teamId, memberBindings: { "member-a": 7, "member-b": 7 } },
    { teamId, memberBindings: { "unknown-slot": 7 } },
  ])
    await fail(400, service.save(templateId, 7, body));
  assert.equal(writes.length, 0, "invalid bindings must not write");
  active = false;
  await fail(404, service.save(templateId, 7, { teamId, memberBindings: {} }));
  active = true;
  const bindings = { "member-a": 9, "member-b": 7, "member-c": 8 };
  const saved = await service.save(templateId, 7, {
    teamId,
    memberBindings: bindings,
  });
  assert.deepEqual(saved, { templateId, teamId, memberBindings: bindings });
  assert.deepEqual(
    await service.get(templateId, 7),
    saved,
    "saved mapping survives a fresh read",
  );
  assert.ok(!JSON.stringify(connection).includes("schedule_data"));
  const week = await service.preview(templateId, 7, teamId, "2026-09-21");
  assert.equal(week.members.length, 3);
  assert.ok(week.schedules.every((schedule) => !schedule.success));
  assert.deepEqual(scheduleFilters.slice(-2), [
    ["user_id", memberIds],
    ["week_start_date", "2026-09-21"],
  ]);
  await fail(400, service.preview(templateId, 7, teamId, "2026-09-22"));
  memberIds = [7, 8];
  await fail(
    400,
    service.save(templateId, 7, { teamId, memberBindings: bindings }),
  );
  await service.disconnect(templateId, 7);
  assert.equal(await service.get(templateId, 7), null);
  missingStorage = true;
  await fail(503, service.get(templateId, 7));
  await fail(503, service.save(templateId, 7, { teamId, memberBindings: {} }));
  missingStorage = false;

  // Real API authentication and handler wiring, using fixture-only clients.
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_local_fixture_only";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_local_fixture_only";
  process.env.JWT_SECRET = "team-studio-connection-test-only-secret";
  const { supabaseAdminServer } =
    await import("../src/lib/supabase-admin-server");
  const { supabase } = await import("../src/lib/supabase");
  const { service: routeService } =
    await import("../src/app/api/admin/template-studio/templates/[id]/team-connection/_service");
  const client = supabaseAdminServer as unknown as { from: typeof from };
  const lowClient = supabase as unknown as { from: typeof from };
  const original = client.from,
    originalLow = lowClient.from;
  const originalMethods = { ...routeService };
  client.from = from;
  lowClient.from = from;
  Object.assign(routeService, service);
  try {
    const route =
      await import("../src/app/api/admin/template-studio/templates/[id]/team-connection/route");
    const previewRoute =
      await import("../src/app/api/admin/template-studio/templates/[id]/team-connection/week/route");
    const { NextRequest } = await import("next/server");
    const { signJWT } = await import("../src/lib/auth/jwt");
    const url = `http://localhost/api/admin/template-studio/templates/${templateId}/team-connection`;
    const context = { params: Promise.resolve({ id: templateId }) };
    for (const method of ["GET", "PUT", "DELETE"] as const)
      assert.equal(
        (await route[method](new NextRequest(url, { method }), context)).status,
        401,
      );
    const userToken = await signJWT(
      { userId: 7, role: "user", email: "fixture@example.invalid" },
      "1h",
    );
    const userHeaders = { Authorization: `Bearer ${userToken}` };
    for (const method of ["GET", "PUT", "DELETE"] as const)
      assert.equal(
        (
          await route[method](
            new NextRequest(url, { method, headers: userHeaders }),
            context,
          )
        ).status,
        403,
      );
    assert.equal(
      (
        await previewRoute.GET(
          new NextRequest(`${url}/week`, { headers: userHeaders }),
          context,
        )
      ).status,
      403,
    );
    const token = await signJWT(
      { userId: 7, role: "admin", email: "fixture@example.invalid" },
      "1h",
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const response = await route.PUT(
      new NextRequest(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          teamId,
          memberBindings: { "member-a": 8, "member-b": 7 },
        }),
      }),
      context,
    );
    assert.equal(response.status, 200);
    const get = await route.GET(new NextRequest(url, { headers }), context);
    assert.equal(get.headers.get("cache-control"), "private, no-store");
    assert.equal((await get.json()).connection.memberBindings["member-a"], 8);
    assert.equal(
      (
        await route.PUT(
          new NextRequest(url, { method: "PUT", headers, body: "{" }),
          context,
        )
      ).status,
      400,
    );
    const preview = await previewRoute.GET(
      new NextRequest(`${url}/week?teamId=${teamId}&weekStartDate=2026-09-21`, {
        headers,
      }),
      context,
    );
    assert.equal(preview.status, 200);
    assert.equal(preview.headers.get("cache-control"), "private, no-store");
    assert.equal(
      (
        await route.DELETE(
          new NextRequest(url, { method: "DELETE", headers }),
          context,
        )
      ).status,
      200,
    );
    assert.equal(connection, null);
  } finally {
    client.from = original;
    lowClient.from = originalLow;
    Object.assign(routeService, originalMethods);
  }
  assert.ok(
    writes.every((table) => table === "team_studio_connections"),
    "no schedule, membership or legacy assignment writes",
  );
  console.log(
    "PASS Team Studio connections: persistence, disconnect, live membership/slot validation, week scoping, missing migration, real admin API 401/403 gates and malformed requests",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
