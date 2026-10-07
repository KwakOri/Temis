import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";
const { createStudioTeamDocument } = createRequire(import.meta.url)(
  "../src/utils/template-studio/team-timetable.ts",
);

const base = process.env.TEAM_STUDIO_TEST_URL ?? "http://localhost:3000";
const output = path.resolve("output/playwright/team-studio-runtime");
mkdirSync(output, { recursive: true });
const id = "00000000-0000-4000-8000-000000000008",
  teamId = "00000000-0000-4000-8000-000000000009",
  largeTeamId = "00000000-0000-4000-8000-000000000010";
const document = createStudioTeamDocument(3);
const names = ["ALPHA", "BETA", "GAMMA", "DELTA"];
let phase = "startup",
  proxyCalls = 0;
const writes = [],
  errors = [],
  weeks = [];
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  // Fixture-only remote image, verified by exported PNG pixels below.
  const imageBytes = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 0, 16, 16);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await context.route("https://team-runtime-images.invalid/**", (route) =>
    route.request().resourceType() === "image"
      ? route.fulfill({ body: imageBytes, contentType: "image/png" })
      : route.abort("failed"),
  );
  await context.route(`${base}/api/**`, async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (request.method() !== "GET") {
      writes.push(url.pathname);
      return route.fulfill({
        status: 405,
        json: { error: "Read-only fixture" },
      });
    }
    if (url.pathname === "/api/auth/verify")
      return route.fulfill({
        json: {
          user: {
            id: "7",
            name: "Fixture member",
            email: "fixture@example.invalid",
            role: "user",
            isAdmin: false,
          },
        },
      });
    if (url.pathname === "/api/user/team-studio/options")
      return route.fulfill({
        json: {
          templates: [
            { id, name: "Published Team Studio", memberSlotCount: 3 },
          ],
          teams: [
            { id: teamId, name: "Three members" },
            { id: largeTeamId, name: "Four members" },
          ],
        },
      });
    if (url.pathname === `/api/user/team-studio/${id}/week`) {
      const weekStartDate = url.searchParams.get("weekStartDate"),
        team = url.searchParams.get("teamId");
      weeks.push(weekStartDate);
      const members = names
        .slice(0, team === largeTeamId ? 4 : 3)
        .map((name, index) => ({ userId: 7 + index, name }));
      return route.fulfill({
        json: {
          document,
          revisionNo: 1,
          template: { id, name: "Published Team Studio" },
          team: { id: team, name: "Actual Team" },
          weekStartDate,
          members,
          schedules: members.map((member) => ({
            user_id: member.userId,
            success: member.userId !== 8,
            schedule:
              member.userId === 8
                ? null
                : {
                    id: `schedule-${member.userId}`,
                    user_id: member.userId,
                    week_start_date: weekStartDate,
                    created_at: null,
                    updated_at: null,
                    schedule_data: Array.from({ length: 7 }, (_, day) => ({
                      day,
                      isOffline: day === 1,
                      entries: [
                        {
                          mainTitle: `${member.name} FIRST`,
                          subTitle: weekStartDate,
                          time: "18:00",
                          isGuerrilla: false,
                        },
                        {
                          mainTitle: `${member.name} SECOND`,
                          subTitle: "",
                          time: "21:00",
                          isGuerrilla: false,
                        },
                      ],
                    })),
                  },
          })),
        },
      });
    }
    if (url.pathname.startsWith("/api/template-studio/assets/image")) {
      proxyCalls++;
      return route.fulfill({ body: imageBytes, contentType: "image/png" });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto(`${base}/team-time-table/studio`, { timeout: 180000 });
  await page
    .locator('[data-testid="team-studio-connected-form"]')
    .waitFor({ timeout: 120000 });
  const canvas = page.locator(
    '[data-testid="template-studio-preview-area"] [data-team-generator]',
  );
  await canvas.waitFor();
  assert.equal(await canvas.locator("[data-team-cell]").count(), 21);
  assert.equal(
    await canvas
      .locator('[data-team-cell="member-a:mon"] [data-team-entry]')
      .count(),
    2,
  );
  assert.equal(
    await canvas
      .locator('[data-team-cell="member-b:mon"]')
      .getAttribute("data-status"),
    "missing",
  );
  assert.equal(
    await canvas
      .locator('[data-team-cell="member-a:tue"]')
      .getAttribute("data-status"),
    "offline",
  );
  assert.equal(
    await page.getByLabel("멤버 일정 상태", { exact: true }).count(),
    0,
    "actual schedules cannot be edited here",
  );
  phase = "week-and-mapping";
  await page.getByLabel("팀 주 시작일", { exact: true }).fill("2026-09-21");
  await page.waitForFunction(() =>
    document
      .querySelector('[data-team-cell="member-a:mon"]')
      ?.textContent.includes("2026-09-21"),
  );
  assert.ok(weeks.includes("2026-09-21"));
  await page.getByLabel("멤버 슬롯 1", { exact: true }).selectOption("9");
  await page.waitForFunction(() =>
    document
      .querySelector('[data-team-cell="member-a:mon"]')
      ?.textContent.includes("GAMMA FIRST"),
  );
  assert.ok(
    await page
      .getByRole("button", { name: "팀 PNG 다운로드", exact: true })
      .isDisabled(),
    "moving an already mapped member exposes an unassigned member",
  );
  await page.getByLabel("멤버 슬롯 3", { exact: true }).selectOption("7");
  assert.ok(
    await page
      .getByRole("button", { name: "팀 PNG 다운로드", exact: true })
      .isEnabled(),
  );
  phase = "remote-image-png";
  await page
    .getByLabel("멤버 이미지 1", { exact: true })
    .fill("https://team-runtime-images.invalid/profile.png");
  await page.getByLabel("멤버 이미지 1", { exact: true }).blur();
  await page
    .getByRole("button", { name: "팀 PNG 다운로드", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await modal.waitFor();
  const [file] = await Promise.all([
    page.waitForEvent("download", { timeout: 90000 }),
    modal
      .getByRole("button", { name: /^(다운로드|Download image|ダウンロード)$/ })
      .click(),
  ]);
  const pngPath = path.join(output, "connected-team.png");
  await file.saveAs(pngPath);
  const pixels = await page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let red = 0;
    for (let i = 0; i < data.length; i += 4)
      if (
        data[i] > 180 &&
        data[i + 1] < 80 &&
        data[i + 2] < 80 &&
        data[i + 3] > 200
      )
        red++;
    return { width: image.width, height: image.height, red };
  }, readFileSync(pngPath).toString("base64"));
  assert.ok(pixels.red > 20);
  assert.ok(proxyCalls > 0);
  assert.ok(pixels.width > 0 && pixels.height > 0);
  await page.screenshot({ path: path.join(output, "desktop.png") });
  phase = "slot-capacity-and-mobile";
  await page.getByLabel("실제 팀", { exact: true }).selectOption(largeTeamId);
  await page.getByText("미연결 멤버: DELTA", { exact: true }).waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "팀 PNG 다운로드", exact: true })
      .isDisabled(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, "mobile.png") });
  names[3] = "L".repeat(80);
  const refresh = page.getByRole("button", {
    name: "일정 새로고침",
    exact: true,
  });
  await refresh.focus();
  await refresh.press("Enter");
  const warning = page.getByText(`미연결 멤버: ${names[3]}`, { exact: true });
  await warning.waitFor();
  assert.ok(
    await warning.evaluate((node) => node.scrollWidth <= node.clientWidth),
    "long member names wrap in mobile warnings",
  );
  assert.deepEqual(writes, []);
  assert.deepEqual(errors, []);
  console.log(
    `PASS connected Team Studio browser: actual protected route, live-data adapter, week change, slot remapping, missing/offline, capacity warning, read-only schedules, remote PNG (${pixels.red} red pixels, ${proxyCalls} proxy calls), mobile; mocked APIs only`,
  );
} catch (error) {
  console.error(`Connected Team Studio phase: ${phase}`);
  await page
    ?.screenshot({ path: path.join(output, "failure.png") })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
