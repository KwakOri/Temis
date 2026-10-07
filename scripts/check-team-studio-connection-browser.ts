import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  createStudioTeamDocument,
  createStudioTeamPreview,
  STUDIO_TEAM_TIMETABLE_BACKGROUND_NODE_ID,
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
  const document = createStudioTeamDocument(3);
  // Simulate the default template saved before editable background layers existed.
  for (const status of ["online", "offline", "missing"] as const) {
    const root = document.graph.nodes[`team-${status}`];
    const background = document.graph.nodes[`team-${status}-background`];
    Object.assign(document.styles[root.styleId!], {
      backgroundColor: document.styles[background.styleId!].backgroundColor,
      borderRadius: document.styles[background.styleId!].borderRadius,
    });
    root.childIds = root.childIds.filter((id) => id !== background.id);
    delete document.graph.nodes[background.id];
    delete document.styles[background.styleId!];
    const imageId = `team-${status}-image`;
    document.graph.nodes[imageId] = {
      id: imageId,
      label: `${status}-image`,
      type: "image",
      parentId: root.id,
      childIds: [],
      styleId: `style_${imageId}`,
      binding: { kind: "inputImage", inputId: "team_member_image" },
    };
    document.styles[`style_${imageId}`] = {
      left: 154,
      top: 10,
      width: 36,
      height: 36,
    };
    root.childIds.push(imageId);
  }
  const backgroundId = STUDIO_TEAM_TIMETABLE_BACKGROUND_NODE_ID;
  const backgroundStyleId = document.graph.nodes[backgroundId].styleId!;
  document.domains.timetable.canvas!.backgroundColor = document.styles[
    backgroundStyleId
  ].backgroundColor as string;
  document.graph.rootNodeIds = document.graph.rootNodeIds.filter(
    (id) => id !== backgroundId,
  );
  document.domains.timetable.rootNodeIds =
    document.domains.timetable.rootNodeIds.filter((id) => id !== backgroundId);
  delete document.graph.nodes[backgroundId];
  delete document.domains.timetable.nodeExtensions[backgroundId];
  delete document.styles[backgroundStyleId];
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
          document: draft.document,
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
    await page
      .getByTitle("Template settings", { exact: true })
      .waitFor({ timeout: 120000 });
    for (const workspace of ["Cards", "Timetable"]) {
      await page.getByRole("button", { name: workspace, exact: true }).click();
      if (workspace === "Cards") {
        const cards = page.locator("[data-studio-preview-canvas-root]");
        assert.equal(
          await cards.locator('[data-node-id="team-online-image"]').count(),
          0,
        );
        assert.equal(
          await cards
            .locator('[data-node-id="team-online-background"]')
            .count(),
          1,
        );
        assert.equal(
          await cards.getByText("No image", { exact: true }).count(),
          0,
        );
      }
      assert.equal(await page.locator("[data-team-controls]").count(), 0);
      assert.equal(
        await page.getByLabel("팀 배치", { exact: true }).count(),
        0,
      );
      assert.equal(
        await page.getByLabel("멤버 이미지 URL", { exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByLabel("멤버 더미 이미지 업로드", { exact: true })
          .count(),
        0,
      );
    }
    await settings();
    assert.equal(await page.locator("[data-team-design-settings]").count(), 1);
    assert.equal(
      await page.getByLabel("멤버 이미지 URL", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page.getByLabel("멤버 더미 이미지 업로드", { exact: true }).count(),
      0,
    );
    await page
      .getByLabel("팀 배치", { exact: true })
      .selectOption("member-rows");
    await page
      .getByLabel("팀 배치", { exact: true })
      .selectOption("day-columns");
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
      "member-a": 7,
      "member-b": 8,
      "member-c": 9,
    });
    assert(draft.document.graph.nodes["team-online-background"]);
    assert(draft.document.graph.nodes[backgroundId]);
    assert.equal(
      draft.document.domains.timetable.canvas!.backgroundColor,
      "transparent",
    );
    assert.equal(draft.document.graph.nodes["team-online-image"], undefined);
    await page.screenshot({ path: path.join(output, "settings-desktop.png") });
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    phase = "fixed-dummy-toggle";
    await settings();
    const dummySwitch = page.getByRole("switch", {
      name: "팀 더미 데이터",
      exact: true,
    });
    assert.equal(await dummySwitch.getAttribute("aria-checked"), "false");
    await dummySwitch.click();
    assert.equal(await dummySwitch.getAttribute("aria-checked"), "true");
    assert.equal(
      await page.getByLabel("멤버 일정 상태", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "방송 추가", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    const dummyCell = page
      .locator(
        '[data-studio-preview-canvas-root] [data-team-cell="member-a:mon"]',
      )
      .first();
    await dummyCell.filter({ hasText: "발로란트 랭크" }).waitFor();
    assert.equal(
      await page
        .locator('[data-team-cell="member-c:mon"]')
        .first()
        .getAttribute("data-status"),
      "offline",
    );
    await page.getByRole("button", { name: "Cards", exact: true }).click();
    await settings();
    assert.equal(
      await dummySwitch.isChecked(),
      true,
      "reopening settings keeps dummy mode",
    );
    await page
      .getByLabel("멤버 슬롯", { exact: true })
      .selectOption("member-a");
    await page.getByLabel("미리보기 요일", { exact: true }).selectOption("mon");
    await page.getByLabel("팀 배치", { exact: true }).selectOption("day-grid");
    // A live-data refresh must not replace the fixed sample on screen.
    await page.getByRole("button", { name: "새로고침", exact: true }).click();
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await page
      .locator("[data-studio-preview-canvas-root]")
      .filter({ hasText: "발로란트 랭크" })
      .waitFor();
    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith("/draft") &&
        response.request().method() === "PUT",
    );
    await page.getByTitle("Save draft to database", { exact: true }).click();
    await saveResponse;
    assert.ok(
      draft.runtimeValues.team!.members[
        "member-a"
      ].days.mon.entries[0].mainTitle.startsWith("ALPHA LIVE"),
    );
    assert.ok(
      !JSON.stringify(draft.runtimeValues).includes("발로란트 랭크"),
      "dummy schedules never enter persisted runtime values",
    );
    assert.equal(
      draft.document.domains.timetable.team!.layout,
      "day-grid",
      "design edits still save during dummy mode",
    );
    await page.screenshot({ path: path.join(output, "fixed-dummy-cards.png") });
    await settings();
    await dummySwitch.click();
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await page.getByRole("button", { name: "Timetable", exact: true }).click();
    await dummyCell.filter({ hasText: "ALPHA LIVE 2026-09-21" }).waitFor();
    assert.equal(
      await page
        .locator('[data-team-cell="member-c:mon"]')
        .first()
        .getAttribute("data-status"),
      "missing",
    );
    phase = "reopen-and-error";
    await page.reload();
    await page.getByTitle("Template settings", { exact: true }).waitFor();
    await page
      .locator('[data-team-cell="member-c:mon"]')
      .filter({ hasText: "GAMMA" })
      .first()
      .waitFor();
    await settings();
    assert.ok(
      (
        await page
          .getByLabel("멤버 슬롯", { exact: true })
          .locator("option:checked")
          .textContent()
      )?.includes("GAMMA"),
    );
    assert.equal(
      await page.getByLabel("멤버 이름", { exact: true }).count(),
      0,
    );
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
    assert.equal(state.connection?.memberBindings["member-c"], 9);
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
      .locator('[data-team-cell="member-a:mon"]')
      .filter({ hasText: "ALPHA LIVE 2026-09-21" })
      .first()
      .waitFor();
    await page.screenshot({ path: path.join(output, "connected-runtime.png") });
    phase = "member-removal-and-disconnect";
    excluded = true;
    await page.goto(`${base}/admin/team-timetable-studio/${id}/edit`, {
      timeout: 120000,
    });
    await page.getByTitle("Template settings", { exact: true }).waitFor();
    await settings();
    assert.equal(await page.getByLabel(/연결 멤버 슬롯/).count(), 2);
    assert.equal(
      await page
        .getByRole("option", { name: "팀에서 제외된 유저 (7)", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "연결 해제", exact: true }).click();
    await page
      .getByText("팀 연결을 해제했습니다. 현재 미리보기는 유지됩니다.", {
        exact: true,
      })
      .waitFor();
    assert.equal(state.connection, null);
    await page.reload();
    await page.getByTitle("Template settings", { exact: true }).waitFor();
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
