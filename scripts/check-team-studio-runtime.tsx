import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";
import {
  createTeamStudioRuntimeService,
  TeamStudioRuntimeError,
} from "../src/services/server/teamStudioRuntimeService";
import { createStudioTeamDocument } from "../src/utils/template-studio/team-timetable";
import {
  addStudioTimetableGraphPreset,
  createStudioTimetableGraphDocument,
} from "../src/utils/template-studio/timetable-graph-document";
import {
  createConnectedTeamStudioValues,
  getDefaultTeamStudioBindings,
  isTeamStudioMonday,
} from "../src/utils/template-studio/team-runtime";
import { TemplateStudioRuntimeShell } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { teamStudioRuntimeKeys } from "../src/hooks/query/useTeamStudioRuntime";

async function main() {
  const id = "00000000-0000-4000-8000-000000000008";
  const teamId = "00000000-0000-4000-8000-000000000009";
  assert.notDeepEqual(
    teamStudioRuntimeKeys.options("7"),
    teamStudioRuntimeKeys.options("8"),
  );
  assert.notDeepEqual(
    teamStudioRuntimeKeys.week("7", id, teamId, "2026-09-21"),
    teamStudioRuntimeKeys.week("8", id, teamId, "2026-09-21"),
  );
  const actor = { userId: "7", email: "fixture@example.invalid", role: "user" };
  const document = createStudioTeamDocument();
  const events: Array<{
    table: string;
    select: string;
    filters: Array<[string, unknown]>;
  }> = [];
  let entitled = true,
    member = true,
    active = true,
    published = true,
    revision: number | null = 1,
    source = document;
  const days = Array.from({ length: 7 }, (_, day) => ({
    day,
    isOffline: day === 1,
    entries: [
      { time: "18:00", mainTitle: "FIRST", subTitle: "", isGuerrilla: false },
      { time: "21:00", mainTitle: "SECOND", subTitle: "", isGuerrilla: false },
    ],
  }));
  function database() {
    return {
      from(table: string) {
        const event = {
          table,
          select: "",
          filters: [] as Array<[string, unknown]>,
        };
        events.push(event);
        const result = () => {
          let data: unknown[] = [];
          if (table === "template_access") data = [{ template_id: id }];
          if (table === "template_artists") data = [];
          if (table === "templates")
            data = [
              {
                id,
                name: "Team Studio",
                description: "",
                template_engine: "studio",
                template_kind: "timetable",
                status: "published",
                created_by: 7,
                created_at: "2026-10-04T00:00:00Z",
                updated_at: "2026-10-04T00:00:00Z",
              },
            ];
          if (table === "template_studio_documents")
            data = [
              {
                template_id: id,
                team: document.domains.timetable.team,
                id: "fixture-document",
                document: source,
                runtime_values: createStudioInitialRuntimeValues(source),
                document_version: 8,
                published_revision_no: 1,
                created_at: "2026-10-04T00:00:00Z",
                updated_at: "2026-10-04T00:00:00Z",
              },
            ];
          if (table === "teams")
            data = active ? [{ id: teamId, name: "Real Team" }] : [];
          if (table === "team_members")
            data =
              event.select === "id"
                ? member
                  ? [{ id: "membership" }]
                  : []
                : event.select === "team_id"
                  ? member
                    ? [{ team_id: teamId }]
                    : []
                  : [
                      { user_id: 7, users: { id: 7, name: "Artist 1" } },
                      { user_id: 8, users: { id: 8, name: "Artist 2" } },
                      { user_id: 9, users: { id: 9, name: "Artist 3" } },
                      { user_id: 10, users: { id: 10, name: "Artist 4" } },
                    ];
          if (table === "team_schedules")
            data = [
              {
                id: "schedule",
                user_id: 7,
                week_start_date: "2026-09-21",
                schedule_data: days,
                created_at: null,
                updated_at: null,
              },
            ];
          return { data, error: null };
        };
        const query = {
          select(value: string) {
            event.select = value;
            return query;
          },
          eq(key: string, value: unknown) {
            event.filters.push([key, value]);
            return query;
          },
          in(key: string, value: unknown) {
            event.filters.push([key, value]);
            return query;
          },
          not(key: string, _op: string, value: unknown) {
            event.filters.push([key, value]);
            return query;
          },
          order() {
            return query;
          },
          limit() {
            return query;
          },
          maybeSingle() {
            const value = result();
            return Promise.resolve({ ...value, data: value.data[0] ?? null });
          },
          then(
            resolve: (value: unknown) => unknown,
            reject: (error: unknown) => unknown,
          ) {
            return Promise.resolve(result()).then(resolve, reject);
          },
        };
        return query;
      },
    } as unknown as SupabaseClient<Database>;
  }
  let documentReads = 0;
  const service = createTeamStudioRuntimeService({
    db: database(),
    entitlement: async () => ({ hasAccess: entitled, isAdmin: false }),
    template: async () => ({
      name: "Team Studio",
      status: published ? "published" : "draft",
      templateKind: "timetable",
    }),
    document: async () => {
      documentReads++;
      return { document: source, publishedRevisionNo: revision };
    },
  });
  const fail = async (status: number, request: Promise<unknown>) =>
    assert.rejects(
      request,
      (error: unknown) =>
        error instanceof TeamStudioRuntimeError && error.status === status,
    );
  for (const date of ["2026-09-21", "2026-09-28"])
    assert.equal(isTeamStudioMonday(date), true);
  for (const date of ["2026-09-22", "2026-02-30", "bad", "2026-9-21"])
    assert.equal(isTeamStudioMonday(date), false);
  await fail(400, service.week(actor, id, teamId, "2026-09-22"));
  entitled = false;
  await fail(403, service.week(actor, id, teamId, "2026-09-21"));
  assert.equal(events.length, 0);
  assert.equal(documentReads, 0);
  entitled = true;
  member = false;
  await fail(403, service.week(actor, id, teamId, "2026-09-21"));
  assert.equal(
    documentReads,
    0,
    "membership checked before graph or schedules",
  );
  assert.equal(
    events.filter((row) => row.table === "team_schedules").length,
    0,
  );
  member = true;
  published = false;
  await fail(404, service.week(actor, id, teamId, "2026-09-21"));
  published = true;
  revision = null;
  await fail(404, service.week(actor, id, teamId, "2026-09-21"));
  revision = 1;
  source = createStudioTimetableGraphDocument();
  await fail(404, service.week(actor, id, teamId, "2026-09-21"));
  source = document;
  active = false;
  await fail(404, service.week(actor, id, teamId, "2026-09-21"));
  active = true;
  const options = await service.options(actor);
  assert.equal(options.templates[0].memberSlotCount, 3);
  assert.equal(options.teams[0].id, teamId);
  const week = await service.week(actor, id, teamId, "2026-09-21");
  assert.equal(week.members.length, 4);
  assert.equal(week.schedules[1].success, false);
  assert.ok(!JSON.stringify(week).includes("email"));
  const query = events.findLast((row) => row.table === "team_schedules")!;
  assert.deepEqual(query.filters, [
    ["user_id", [7, 8, 9, 10]],
    ["week_start_date", "2026-09-21"],
  ]);
  assert.ok(!query.select.includes("*"));
  const bindings = getDefaultTeamStudioBindings(week.document, week.members);
  const connected = createConnectedTeamStudioValues(week, bindings);
  assert.equal(connected.values.timetable.weekStartDate, "2026-09-21");
  assert.equal(
    connected.values.team?.members["member-a"].days.mon.entries.length,
    2,
  );
  assert.equal(
    connected.values.team?.members["member-a"].days.tue.status,
    "offline",
  );
  assert.equal(
    connected.values.team?.members["member-b"].days.mon.status,
    "missing",
  );
  assert.equal(connected.unassigned[0].userId, 10);
  const invalid = createConnectedTeamStudioValues(
    week,
    { "member-a": 999, "member-b": 7, "member-c": 7 },
    { 7: "javascript:alert(1)" },
  );
  assert.equal(Object.keys(invalid.values.team!.members).length, 1);
  assert.equal(invalid.values.team!.members["member-b"].image, "");
  const html = renderToStaticMarkup(
    <TemplateStudioRuntimeShell
      document={addStudioTimetableGraphPreset(document, "weekDates").document}
      initialRuntimeValues={connected.values}
      preserveInitialWeek
      source="published"
      renderForm={() => <aside data-testid="readonly-team-form" />}
    />,
  );
  assert.ok(html.includes("readonly-team-form"));
  assert.ok(!html.includes("멤버 일정 상태"));
  assert.ok(html.includes("FIRST") && html.includes("SECOND"));
  assert.equal((html.match(/data-team-cell=/g) ?? []).length, 21);
  assert.ok(
    html.includes("2026.09.21"),
    "shared runtime preserves the requested historical week",
  );
  // Execute the real handlers with a signed fixture JWT and in-memory DB methods.
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_local_fixture_only";
  process.env.JWT_SECRET =
    "team-studio-runtime-test-only-secret-not-a-live-key";
  const { supabaseAdminServer } =
    await import("../src/lib/supabase-admin-server");
  const { TemplateService } = await import("../src/lib/templates");
  const { signJWT } = await import("../src/lib/auth/jwt");
  const { NextRequest } = await import("next/server");
  const client = supabaseAdminServer as unknown as {
    from: (table: string) => unknown;
  };
  const originalFrom = client.from,
    originalEntitlement = TemplateService.resolveEntitlement;
  client.from = (table) => database().from(table as "templates");
  TemplateService.resolveEntitlement = async () => ({
    hasAccess: entitled,
    isAdmin: false,
    reason: entitled ? "template_access" : "no_access",
  });
  try {
    const optionsRoute =
      await import("../src/app/api/user/team-studio/options/route");
    const weekRoute =
      await import("../src/app/api/user/team-studio/[id]/week/route");
    const runtimeRoute =
      await import("../src/app/api/user/templates/[id]/runtime/route");
    const token = await signJWT(
      { userId: 7, role: "user", email: actor.email },
      "1h",
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const url = `http://localhost/api/user/team-studio/${id}/week?teamId=${teamId}&weekStartDate=2026-09-21`;
    const context = { params: Promise.resolve({ id }) };
    assert.equal(
      (
        await optionsRoute.GET(
          new NextRequest("http://localhost/api/user/team-studio/options"),
        )
      ).status,
      401,
    );
    assert.equal(
      (await weekRoute.GET(new NextRequest(url), context)).status,
      401,
    );
    member = false;
    assert.equal(
      (await weekRoute.GET(new NextRequest(url, { headers }), context)).status,
      403,
    );
    member = true;
    const weekResponse = await weekRoute.GET(
      new NextRequest(url, { headers }),
      context,
    );
    assert.equal(weekResponse.status, 200);
    assert.equal(
      weekResponse.headers.get("Cache-Control"),
      "private, no-store",
    );
    const before = events.length;
    const response = await runtimeRoute.GET(
      new NextRequest(`http://localhost/api/user/templates/${id}/runtime`, {
        headers,
      }),
      context,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).hasSavedState, false);
    const put = await runtimeRoute.PUT(
      new NextRequest(`http://localhost/api/user/templates/${id}/runtime`, {
        headers,
        method: "PUT",
        body: JSON.stringify({ runtimeValues: connected.values }),
      }),
      context,
    );
    assert.equal(
      put.status,
      405,
      "generic user-state API cannot write other members' team schedules",
    );
    assert.ok(
      events
        .slice(before)
        .every((event) =>
          ["templates", "template_studio_documents"].includes(event.table),
        ),
      "team GET/PUT never read or mutate per-user runtime state",
    );
    source = createStudioTimetableGraphDocument();
    const personalStart = events.length;
    const personal = await runtimeRoute.GET(
      new NextRequest(`http://localhost/api/user/templates/${id}/runtime`, {
        headers,
      }),
      context,
    );
    assert.equal(personal.status, 200);
    assert.ok(
      events
        .slice(personalStart)
        .some((event) => event.table === "template_studio_user_states"),
      "personal runtime retains the existing user-state flow",
    );
    source = document;
  } finally {
    client.from = originalFrom;
    TemplateService.resolveEntitlement = originalEntitlement;
  }
  console.log(
    "PASS connected Team Studio: entitlement + membership gates, published-only catalog, scoped schedule queries, no email/writes, stable bindings, multiple broadcasts, missing/offline, provided week and shared runtime shell",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
