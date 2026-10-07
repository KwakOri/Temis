import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import type { Database, Json } from "../src/types/supabase";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
} from "../src/utils/template-studio/team-timetable";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";

async function main() {
  assert.ok(
    process.argv.includes("--allow-local-fixtures"),
    "Explicit local fixture opt-in required",
  );
  const root = path.resolve(__dirname, "..");
  loadEnvConfig(root, true, { info() {}, error() {} });
  const base = new URL(
    process.env.TEAM_STUDIO_TEST_URL ?? "http://localhost:3000",
  );
  assert.ok(
    ["localhost", "127.0.0.1"].includes(base.hostname),
    "Only a local app is allowed",
  );
  const status = spawnSync(
    "supabase",
    ["status", "-o", "env", "--workdir", root],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: process.env.SB_TOKEN_TEMIS ?? "",
      },
    },
  );
  assert.equal(status.status, 0, "Local temis Supabase must be running");
  const env = Object.fromEntries(
    status.stdout.split("\n").flatMap((line) => {
      const match = /^([A-Z_]+)="(.*)"$/.exec(line.trim());
      return match ? [[match[1], match[2]]] : [];
    }),
  );
  const api = new URL(env.API_URL ?? env.KONG_URL);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(api.hostname) && api.port === "56321",
    "Only the configured temis local API is allowed",
  );
  assert.ok(env.SECRET_KEY?.startsWith("sb_secret_"));
  assert.ok(process.env.JWT_SECRET, "Local app JWT secret required");
  const db = createClient<Database>(api.href, env.SECRET_KEY, {
    auth: { persistSession: false },
  });
  const anon = createClient<Database>(api.href, env.PUBLISHABLE_KEY, {
    auth: { persistSession: false },
  });
  const admin = await db
    .from("users")
    .select("id")
    .eq("email", "admin@admin.com")
    .eq("role", "admin")
    .single();
  assert.equal(admin.error, null, "Existing local test admin required");
  const adminId = admin.data!.id;
  const nonce = randomUUID();
  const templateId = randomUUID(),
    secondTemplateId = randomUUID();
  const teamId = randomUUID(),
    otherTeamId = randomUUID();
  const templateIds = [templateId, secondTemplateId],
    teamIds = [teamId, otherTeamId];
  const userIds: number[] = [];
  const document = createStudioTeamDocument(3);
  const values = createStudioInitialRuntimeValues(document);
  values.team = createStudioTeamPreview(document);
  const week = "2026-09-21";
  const output = path.join(
    root,
    "output/playwright/team-studio-connection-local",
  );
  mkdirSync(output, { recursive: true });
  const token = (userId: number, role: string, email: string) =>
    new SignJWT({ userId, role, email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const adminToken = await token(adminId, "admin", "admin@admin.com");
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let phase = "fixtures";
  const request = async (
    url: string,
    auth: string | null = adminToken,
    init?: RequestInit,
  ) => {
    const response = await fetch(new URL(url, base), {
      ...init,
      headers: {
        ...(auth ? { Cookie: `token=${auth}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const data = await response.json();
    return { response, data };
  };
  const connectionPath = `/api/admin/template-studio/templates/${templateId}/team-connection`;
  const put = (body: unknown) =>
    request(connectionPath, adminToken, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  const assertDb = (
    error: { code?: string; message?: string } | null,
    operation: string,
  ) =>
    assert.equal(
      error?.code ?? null,
      null,
      `${operation} failed: ${error?.message ?? ""}`,
    );
  try {
    const fixtureUsers = ["ALPHA", "BETA", "GAMMA", "OUTSIDER"].map((name) => ({
      name: `LOCAL ${name}`,
      email: `${name.toLowerCase()}-${nonce}@fixture.invalid`,
      password: "disabled-local-fixture-login",
      role: "user",
      updated_at: new Date().toISOString(),
    }));
    for (const user of fixtureUsers) {
      const inserted = await db
        .from("users")
        .insert(user)
        .select("id")
        .single();
      assertDb(inserted.error, "Fixture user insert");
      userIds.push(inserted.data!.id);
    }
    assertDb(
      (
        await db.from("teams").insert(
          teamIds.map((id, index) => ({
            id,
            name: `Local team connection fixture ${nonce} ${index}`,
            created_by: adminId,
            is_active: true,
          })),
        )
      ).error,
      "Fixture team insert",
    );
    assertDb(
      (
        await db
          .from("team_members")
          .insert(
            userIds
              .slice(0, 3)
              .map((user_id) => ({ team_id: teamId, user_id })),
          )
      ).error,
      "Fixture membership insert",
    );
    assertDb(
      (
        await db.from("templates").insert(
          templateIds.map((id) => ({
            id,
            name: `Local Studio connection fixture ${nonce}`,
            template_engine: "studio",
            template_kind: "timetable",
            status: "published",
            created_by: adminId,
            is_public: false,
            is_shop_visible: false,
          })),
        )
      ).error,
      "Fixture template insert",
    );
    assertDb(
      (
        await db.from("template_studio_documents").insert(
          templateIds.map((template_id) => ({
            template_id,
            document: document as unknown as Json,
            runtime_values: values as unknown as Json,
            document_version: 8,
            published_revision_no: 1,
          })),
        )
      ).error,
      "Fixture document insert",
    );
    assertDb(
      (
        await db.from("template_access").insert(
          [userIds[0], userIds[3]].map((user_id) => ({
            template_id: templateId,
            user_id,
            granted_by: adminId,
          })),
        )
      ).error,
      "Fixture entitlement insert",
    );
    const schedule = Array.from({ length: 7 }, (_, day) => ({
      day,
      isOffline: day === 1,
      entries: [
        {
          time: "18:00",
          mainTitle: "LOCAL FIRST",
          subTitle: "DB integration",
          isGuerrilla: false,
        },
        {
          time: "21:00",
          mainTitle: "LOCAL SECOND",
          subTitle: "",
          isGuerrilla: true,
        },
      ],
    }));
    assertDb(
      (
        await db.from("team_schedules").insert({
          user_id: userIds[0],
          week_start_date: week,
          schedule_data: schedule,
        })
      ).error,
      "Fixture schedule insert",
    );
    phase = "prove-local-app";
    const probe = await request(
      `/api/admin/template-studio/templates/${templateId}`,
    );
    assert.equal(
      probe.response.status,
      200,
      `App must read the local-only fixture before any app mutation: ${probe.data.error ?? ""}`,
    );
    assert.equal(
      probe.data.template.name,
      `Local Studio connection fixture ${nonce}`,
    );
    console.log("PASS local-only app connection verified before writes");
    phase = "real-admin-api";
    assert.equal((await request(connectionPath, null)).response.status, 401);
    const userToken = await token(userIds[0], "user", fixtureUsers[0].email);
    const memberWithoutAccess = await token(
      userIds[1],
      "user",
      fixtureUsers[1].email,
    );
    const outsiderToken = await token(
      userIds[3],
      "user",
      fixtureUsers[3].email,
    );
    assert.equal(
      (await request(connectionPath, userToken)).response.status,
      403,
    );
    assert.equal(
      (await request(connectionPath, userToken, { method: "PUT", body: "{}" }))
        .response.status,
      403,
    );
    assert.equal((await request(connectionPath)).data.connection, null);
    const bindings = {
      "member-a": userIds[2],
      "member-b": userIds[0],
      "member-c": userIds[1],
    };
    const saved = await put({ teamId, memberBindings: bindings });
    assert.equal(saved.response.status, 200, saved.data.error);
    const stored = await db
      .from("team_studio_connections")
      .select("team_id,member_bindings")
      .eq("template_id", templateId)
      .single();
    assertDb(stored.error, "Connection readback");
    assert.deepEqual(stored.data, {
      team_id: teamId,
      member_bindings: bindings,
    });
    assert.deepEqual(
      (await request(connectionPath)).data.connection.memberBindings,
      bindings,
    );
    for (const memberBindings of [
      { "member-a": userIds[3] },
      { "member-a": userIds[0], "member-b": userIds[0] },
      { "unknown-slot": userIds[0] },
    ])
      assert.equal(
        (await put({ teamId, memberBindings })).response.status,
        400,
      );
    assert.equal(
      (await request(connectionPath, adminToken, { method: "PUT", body: "{" }))
        .response.status,
      400,
    );
    assert.deepEqual(
      (await request(connectionPath)).data.connection.memberBindings,
      bindings,
      "invalid writes preserve the saved mapping",
    );
    const preview = await request(
      `${connectionPath}/week?teamId=${teamId}&weekStartDate=${week}`,
    );
    assert.equal(preview.response.status, 200);
    assert.equal(
      preview.response.headers.get("cache-control"),
      "private, no-store",
    );
    assert.equal(
      preview.data.schedules.find(
        (item: { user_id: number }) => item.user_id === userIds[0],
      ).schedule.schedule_data[0].entries.length,
      2,
    );
    assert.equal(
      (
        await request(
          `${connectionPath}/week?teamId=${teamId}&weekStartDate=2026-09-22`,
        )
      ).response.status,
      400,
    );
    phase = "real-user-api";
    const options = await request("/api/user/team-studio/options", userToken);
    assert.equal(options.response.status, 200);
    assert.equal(
      options.data.templates.find(
        (item: { id: string }) => item.id === templateId,
      ).connectedTeamId,
      teamId,
    );
    const weekPath = `/api/user/team-studio/${templateId}/week?weekStartDate=${week}`;
    const connected = await request(weekPath, userToken);
    assert.equal(connected.response.status, 200);
    assert.deepEqual(connected.data.connection.memberBindings, bindings);
    assert.equal(connected.data.members.length, 3);
    assert.equal(
      connected.data.schedules.filter(
        (item: { success: boolean }) => !item.success,
      ).length,
      2,
    );
    assert.equal(
      (await request(`${weekPath}&teamId=${otherTeamId}`, userToken)).response
        .status,
      403,
    );
    assert.equal(
      (await request(`${weekPath}&teamId=${teamId}`, outsiderToken)).response
        .status,
      403,
    );
    assert.equal(
      (await request(`${weekPath}&teamId=${teamId}`, memberWithoutAccess))
        .response.status,
      403,
    );
    console.log(
      "PASS real local API: save/readback, invalid bindings, 401/403, team enforcement, live schedules and historical weeks",
    );
    phase = "database-constraints";
    assert.equal(
      (await anon.from("team_studio_connections").select("template_id")).error
        ?.code,
      "42501",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .insert({ template_id: templateId, team_id: teamId })
      ).error?.code,
      "23505",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .insert({ template_id: randomUUID(), team_id: teamId })
      ).error?.code,
      "23503",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .update({ team_id: randomUUID() })
          .eq("template_id", templateId)
      ).error?.code,
      "23503",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .update({ member_bindings: [] })
          .eq("template_id", templateId)
      ).error?.code,
      "23514",
    );
    assertDb(
      (
        await db
          .from("team_studio_connections")
          .insert({ template_id: secondTemplateId, team_id: teamId })
      ).error,
      "Cascade fixture insert",
    );
    assertDb(
      (await db.from("templates").delete().eq("id", secondTemplateId)).error,
      "Cascade template delete",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .select("template_id")
          .eq("template_id", secondTemplateId)
      ).data?.length,
      0,
    );
    console.log(
      "PASS actual DB: anon denied, unique assignment, both foreign keys, JSON object constraint and template cascade",
    );
    if (process.argv.includes("--browser")) {
      phase = "real-browser";
      browser = await chromium.launch({ channel: "chrome", headless: true });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
        acceptDownloads: true,
      });
      await context.addCookies([
        { name: "token", value: adminToken, url: base.href },
      ]);
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        new URL(`/admin/team-timetable-studio/${templateId}/edit`, base).href,
        { timeout: 120000 },
      );
      await page
        .getByTitle("Template settings", { exact: true })
        .waitFor({ timeout: 60000 });
      await page.getByTitle("Template settings", { exact: true }).click();
      await page.getByRole("tab", { name: /팀 연결/ }).click();
      await page.waitForFunction(
        (id) =>
          window.document.querySelector<HTMLSelectElement>(
            '[aria-label="연결할 팀"]',
          )?.value === id,
        teamId,
      );
      assert.equal(
        await page.getByLabel("연결할 팀", { exact: true }).inputValue(),
        teamId,
      );
      await page.getByLabel("연결 팀 주 시작일", { exact: true }).fill(week);
      await page
        .getByRole("button", { name: "실제 일정 미리보기", exact: true })
        .click();
      await page
        .getByRole("button", { name: "팀 연결 저장", exact: true })
        .click();
      await page
        .getByText("팀 연결과 멤버 배치를 저장했습니다.", { exact: true })
        .waitFor({ timeout: 60000 });
      await page.screenshot({
        path: path.join(output, "settings-desktop.png"),
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        (await page.getByTestId("studio-team-connection").boundingBox())!
          .width > 250,
      );
      await page.screenshot({ path: path.join(output, "settings-mobile.png") });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.reload();
      await page
        .locator('[data-team-cell="member-a:mon"]')
        .filter({ hasText: "LOCAL GAMMA" })
        .first()
        .waitFor();
      await context.clearCookies();
      await context.addCookies([
        { name: "token", value: userToken, url: base.href },
      ]);
      await page.goto(new URL("/team-time-table/studio", base).href, {
        timeout: 120000,
      });
      await page
        .getByText("에디터에서 저장한 팀과 멤버 배치를 사용합니다.", {
          exact: true,
        })
        .waitFor({ timeout: 60000 });
      await page.waitForFunction(
        (id) =>
          window.document.querySelector<HTMLSelectElement>(
            '[aria-label="멤버 슬롯 1"]',
          )?.value === String(id),
        userIds[2],
      );
      assert.equal(
        await page.getByLabel("멤버 슬롯 1", { exact: true }).inputValue(),
        String(userIds[2]),
      );
      assert.ok(await page.getByLabel("실제 팀", { exact: true }).isDisabled());
      await page.getByLabel("팀 주 시작일", { exact: true }).fill(week);
      await page
        .locator('[data-team-cell="member-b:mon"]')
        .filter({ hasText: "LOCAL FIRST" })
        .first()
        .waitFor();
      assert.equal(
        await page
          .locator('[data-team-cell="member-b:tue"]')
          .first()
          .getAttribute("data-status"),
        "offline",
      );
      assert.equal(
        await page
          .locator('[data-team-cell="member-a:mon"]')
          .first()
          .getAttribute("data-status"),
        "missing",
      );
      await page.screenshot({ path: path.join(output, "runtime-desktop.png") });
      await page
        .getByRole("button", { name: "팀 PNG 다운로드", exact: true })
        .click();
      const modal = page.getByRole("dialog");
      await modal.waitFor();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60000 }),
        modal
          .getByRole("button", {
            name: /^(다운로드|Download image|ダウンロード)$/,
          })
          .click(),
      ]);
      await download.saveAs(path.join(output, "local-team.png"));
      assert.deepEqual(errors, []);
      console.log(
        "PASS actual local browser: admin save/reload, mobile, user mapping, live schedules, missing/offline and PNG; no mocked APIs",
      );
    }
    phase = "disconnect-and-team-cascade";
    assert.equal(
      (await request(connectionPath, adminToken, { method: "DELETE" })).response
        .status,
      200,
    );
    assert.equal((await request(connectionPath)).data.connection, null);
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .select("template_id")
          .eq("template_id", templateId)
      ).data?.length,
      0,
    );
    assert.equal(
      (await put({ teamId, memberBindings: bindings })).response.status,
      200,
    );
    assertDb(
      (await db.from("team_members").delete().eq("team_id", teamId)).error,
      "Fixture member cleanup before team cascade",
    );
    assertDb(
      (await db.from("teams").delete().eq("id", teamId)).error,
      "Team cascade delete",
    );
    assert.equal(
      (
        await db
          .from("team_studio_connections")
          .select("template_id")
          .eq("template_id", templateId)
      ).data?.length,
      0,
    );
    console.log("PASS actual local disconnect and team cascade");
  } catch (error) {
    console.error(`Local Team Studio integration failed during ${phase}`);
    throw error;
  } finally {
    await browser?.close();
    // Cleanup only this run's random fixtures, even if API/browser checks fail.
    for (const [table, column, ids] of [
      ["team_studio_connections", "template_id", templateIds],
      ["template_access", "template_id", templateIds],
      ["templates", "id", templateIds],
      ["team_members", "team_id", teamIds],
      ["teams", "id", teamIds],
    ] as const)
      assertDb(
        (
          await db
            .from(table)
            .delete()
            .in(column, [...ids])
        ).error,
        `Fixture ${table} cleanup`,
      );
    if (userIds.length) {
      assertDb(
        (await db.from("team_schedules").delete().in("user_id", userIds)).error,
        "Fixture schedule cleanup",
      );
      assertDb(
        (await db.from("users").delete().in("id", userIds)).error,
        "Fixture user cleanup",
      );
    }
    assert.equal(
      (await db.from("templates").select("id").in("id", templateIds)).data
        ?.length,
      0,
    );
    assert.equal(
      (await db.from("teams").select("id").in("id", teamIds)).data?.length,
      0,
    );
    assert.equal(
      userIds.length
        ? (await db.from("users").select("id").in("id", userIds)).data?.length
        : 0,
      0,
    );
    console.log("PASS all local test fixtures removed");
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
