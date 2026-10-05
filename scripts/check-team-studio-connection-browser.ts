import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
} from "../src/utils/template-studio/team-timetable";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import type { TeamStudioConnection } from "../src/types/team-studio-runtime";

async function main() {
  const base = process.env.TEAM_STUDIO_TEST_URL ?? "http://localhost:3000";
  const output = path.resolve("output/playwright/team-studio-connection");
  mkdirSync(output, { recursive: true });
  const id = "00000000-0000-4000-8000-000000000008";
  const teamId = "00000000-0000-4000-8000-000000000009";
  const otherTeam = "00000000-0000-4000-8000-000000000010";
  const document = createStudioTeamDocument();
  const values = createStudioInitialRuntimeValues(document);
  values.team = createStudioTeamPreview(document);
  const state: { connection: TeamStudioConnection | null } = {
    connection: null,
  };
  let failSave = false;
  let excluded = false;
  const names = ["ALPHA", "BETA", "GAMMA"];
  let draft = { document, runtimeValues: values };
  const template = {
    id,
    name: "Connected Team Fixture",
    description: "",
    status: "published",
    templateKind: "timetable",
    createdBy: 7,
    createdAt: "2026-10-05T00:00:00Z",
    updatedAt: "2026-10-05T00:00:00Z",
  };
  const writes: string[] = [],
    errors: string[] = [];
  let phase = "startup";
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Browser page error:", error.message);
  });
  const snapshot = (weekStartDate: string) => ({
    team: { id: teamId, name: "Real fixture team" },
    weekStartDate,
    members: names.flatMap((name, index) =>
      excluded && index === 0 ? [] : [{ userId: 7 + index, name }],
    ),
    schedules: names.map((_, index) => ({
      user_id: 7 + index,
      success: index !== 2,
      schedule:
        index === 2
          ? null
          : {
              id: `fixture-schedule-${index}`,
              user_id: 7 + index,
              week_start_date: weekStartDate,
              created_at: null,
              updated_at: null,
              schedule_data: Array.from({ length: 7 }, (_, day) => ({
                day,
                isOffline: day === 1,
                entries: [
                  {
                    time: "18:00",
                    mainTitle: `${names[index]} LIVE ${weekStartDate}`,
                    subTitle: "",
                    isGuerrilla: false,
                  },
                ],
              })),
            },
    })),
  });
  await context.route(`${base}/api/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      method = request.method();
    if (method !== "GET") writes.push(url.pathname);
    if (url.pathname === "/api/auth/verify")
      return route.fulfill({
        json: {
          user: {
            id: "7",
            name: "Fixture admin",
            email: "fixture@example.invalid",
            role: "admin",
            isAdmin: true,
          },
        },
      });
    if (url.pathname === "/api/admin/teams")
      return route.fulfill({
        json: {
          success: true,
          teams: [
            { id: teamId, name: "Real fixture team", is_active: true },
            { id: otherTeam, name: "Other fixture team", is_active: true },
          ],
        },
      });
    if (url.pathname.endsWith("/team-connection/week"))
      return route.fulfill({
        json: snapshot(url.searchParams.get("weekStartDate")!),
      });
    if (url.pathname.endsWith("/team-connection")) {
      if (method === "PUT") {
        if (failSave)
          return route.fulfill({
            status: 503,
            json: { error: "테스트 저장 오류" },
          });
        state.connection = { templateId: id, ...request.postDataJSON() };
      }
      if (method === "DELETE") state.connection = null;
      return route.fulfill({ json: { connection: state.connection } });
    }
    if (url.pathname.endsWith("/draft") && method === "PUT") {
      draft = request.postDataJSON();
      return route.fulfill({
        json: { success: true, draft, diagnostics: [], migrationWarnings: [] },
      });
    }
    if (url.pathname.endsWith("/save-events"))
      return route.fulfill({ json: { success: true } });
    if (url.pathname === `/api/admin/template-studio/templates/${id}`)
      return route.fulfill({
        json: {
          success: true,
          template,
          draft,
          document: { document, runtimeValues: values },
          assets: [],
          latestRevisionNo: 1,
        },
      });
    if (url.pathname === "/api/user/team-studio/options")
      return route.fulfill({
        json: {
          templates: [
            {
              id,
              name: template.name,
              memberSlotCount: 3,
              ...(state.connection
                ? { connectedTeamId: state.connection.teamId }
                : {}),
            },
          ],
          // Deliberately list another team first to catch accidental default selection.
          teams: [
            { id: otherTeam, name: "Other fixture team" },
            { id: teamId, name: "Real fixture team" },
          ],
        },
      });
    if (url.pathname === `/api/user/team-studio/${id}/week`) {
      assert.equal(url.searchParams.get("teamId"), teamId);
      return route.fulfill({
        json: {
          ...snapshot(url.searchParams.get("weekStartDate")!),
          template: { id, name: template.name },
          document,
          revisionNo: 1,
          connection: state.connection,
        },
      });
    }
    return route.fulfill({
      status: 404,
      json: { error: "Unexpected fixture endpoint" },
    });
  });
  async function settings() {
    await page.getByTitle("Template settings", { exact: true }).click();
    await page.getByRole("tab", { name: /팀 연결/ }).click();
  }
  try {
    phase = "connect-and-preview";
    await page.goto(`${base}/admin/team-timetable-studio/${id}/edit`, {
      timeout: 120000,
    });
    await page.locator("[data-team-controls]").waitFor({ timeout: 120000 });
    await settings();
    await page.getByLabel("연결할 팀", { exact: true }).selectOption(teamId);
    await page
      .getByLabel("연결 멤버 슬롯 1", { exact: true })
      .selectOption("9");
    await page
      .getByLabel("연결 멤버 슬롯 2", { exact: true })
      .selectOption("7");
    await page
      .getByLabel("연결 멤버 슬롯 3", { exact: true })
      .selectOption("8");
    await page
      .getByLabel("연결 팀 주 시작일", { exact: true })
      .fill("2026-09-21");
    await page
      .getByRole("button", { name: "실제 일정 미리보기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "팀 연결 저장", exact: true })
      .click();
    await page
      .getByText("팀 연결과 멤버 배치를 저장했습니다.", { exact: true })
      .waitFor();
    assert.deepEqual(state.connection?.memberBindings, {
      "member-a": 9,
      "member-b": 7,
      "member-c": 8,
    });
    await page.screenshot({ path: path.join(output, "settings-desktop.png") });
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    phase = "reopen-and-error";
    await page.reload();
    await page.locator("[data-team-controls]").waitFor();
    await page.getByLabel("멤버 이름", { exact: true }).waitFor();
    await page
      .locator('[data-team-cell="member-a:mon"]')
      .filter({ hasText: "GAMMA" })
      .first()
      .waitFor();
    assert.equal(
      await page.getByLabel("멤버 이름", { exact: true }).inputValue(),
      "GAMMA",
    );
    await settings();
    assert.equal(
      await page.getByLabel("연결할 팀", { exact: true }).inputValue(),
      teamId,
    );
    assert.equal(
      await page.getByLabel("연결 멤버 슬롯 1", { exact: true }).inputValue(),
      "9",
    );
    failSave = true;
    await page
      .getByRole("button", { name: "팀 연결 저장", exact: true })
      .click();
    await page.getByText("테스트 저장 오류", { exact: true }).waitFor();
    assert.equal(state.connection?.memberBindings["member-a"], 9);
    failSave = false;
    phase = "mobile-settings";
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => window.document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const mobilePanel = await page
      .getByTestId("studio-team-connection")
      .boundingBox();
    assert.ok(
      mobilePanel && mobilePanel.width > 250,
      "mobile team fields use the available width",
    );
    await page.screenshot({ path: path.join(output, "settings-mobile.png") });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    phase = "configured-user-runtime";
    await page.goto(`${base}/team-time-table/studio`, { timeout: 120000 });
    await page
      .getByText("에디터에서 저장한 팀과 멤버 배치를 사용합니다.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.getByLabel("실제 팀", { exact: true }).inputValue(),
      teamId,
    );
    assert.ok(await page.getByLabel("실제 팀", { exact: true }).isDisabled());
    assert.equal(
      await page.getByLabel("멤버 슬롯 1", { exact: true }).inputValue(),
      "9",
    );
    assert.ok(
      await page.getByLabel("멤버 슬롯 1", { exact: true }).isDisabled(),
    );
    await page.getByLabel("팀 주 시작일", { exact: true }).fill("2026-09-21");
    await page
      .locator('[data-team-cell="member-b:mon"]')
      .filter({ hasText: "ALPHA LIVE 2026-09-21" })
      .first()
      .waitFor();
    await page.screenshot({ path: path.join(output, "connected-runtime.png") });
    phase = "member-removal-and-disconnect";
    excluded = true;
    await page.goto(`${base}/admin/team-timetable-studio/${id}/edit`, {
      timeout: 120000,
    });
    await page.locator("[data-team-controls]").waitFor();
    await settings();
    await page
      .getByRole("option", { name: "팀에서 제외된 유저 (7)", exact: true })
      .waitFor({ state: "attached" });
    await page.getByRole("button", { name: "연결 해제", exact: true }).click();
    await page
      .getByText("팀 연결을 해제했습니다. 현재 미리보기는 유지됩니다.", {
        exact: true,
      })
      .waitFor();
    assert.equal(state.connection, null);
    await page.reload();
    await page.locator("[data-team-controls]").waitFor();
    await settings();
    assert.equal(
      await page.getByLabel("연결할 팀", { exact: true }).inputValue(),
      "",
    );
    assert.ok(
      writes.every((url) => url.includes("/template-studio/templates/")),
      "no team/member/schedule writes",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS Team Studio connection browser: settings, reordered user IDs, preview, save/reopen, save failure, mobile, configured runtime/historical week, removed member and disconnect; mocked APIs only",
    );
  } catch (error) {
    console.error(`Team Studio connection browser phase: ${phase}`);
    await page
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
