import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.TEAM_STUDIO_TEST_URL ?? "http://localhost:3000";
const output = path.resolve("output/playwright/team-studio-v8");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
let phase = "startup",
  proxyCalls = 0,
  draft = null;
let created = false;
const errors = [];
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const id = "00000000-0000-4000-8000-000000000008";
  const template = {
    id,
    name: "Team Timetable",
    description: "",
    status: "draft",
    templateKind: "timetable",
    createdBy: 1,
    thumbnailUrl: null,
    studioPreviewUrl: null,
    createdAt: "2026-10-04T00:00:00Z",
    updatedAt: "2026-10-04T00:00:00Z",
  };
  let imageBytes;
  await context.route(`${base}/api/**`, async (route) => {
    const url = new URL(route.request().url()),
      request = route.request();
    if (url.pathname === "/api/auth/verify")
      return route.fulfill({
        json: {
          user: {
            id: "1",
            name: "Fixture admin",
            email: "fixture@example.invalid",
            role: "admin",
            isAdmin: true,
          },
        },
      });
    if (url.pathname.startsWith("/api/template-studio/assets/image")) {
      proxyCalls++;
      return route.fulfill({ body: imageBytes, contentType: "image/png" });
    }
    if (!url.pathname.startsWith("/api/admin/template-studio/templates"))
      return route.fulfill({ status: 404, json: {} });
    if (url.pathname.endsWith("/save-events"))
      return route.fulfill({ json: { success: true, event: {} } });
    if (url.pathname.endsWith("/draft") && request.method() === "PUT") {
      const body = request.postDataJSON();
      draft = {
        id: "fixture-draft",
        templateId: id,
        userId: 1,
        documentVersion: 8,
        document: body.document,
        runtimeValues: body.runtimeValues,
        baseRevisionNo: null,
        isAutosave: false,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
      return route.fulfill({
        json: {
          success: true,
          templateId: id,
          attemptId: body.attemptId,
          hasDraft: true,
          draft,
          diagnostics: [],
          migrationWarnings: [],
        },
      });
    }
    if (url.pathname.endsWith("/templates") && request.method() === "GET") {
      assert.equal(url.searchParams.get("kind"), "timetable");
      assert.ok(["team", "personal"].includes(url.searchParams.get("mode")));
      return route.fulfill({
        json: {
          success: true,
          templates:
            created && url.searchParams.get("mode") === "team"
              ? [template]
              : [],
        },
      });
    }
    if (request.method() === "POST" && url.pathname.endsWith("/templates")) {
      assert.equal(request.postDataJSON().templateMode, "team");
      created = true;
      return route.fulfill({ json: { success: true, template } });
    }
    if (request.method() === "GET")
      return route.fulfill({
        json: {
          success: true,
          templateId: id,
          template,
          document: null,
          draft,
          assets: [],
          latestRevisionNo: 0,
          source: draft ? "draft" : "empty",
        },
      });
    return route.fulfill({
      status: 400,
      json: { error: `Unexpected fixture endpoint: ${url.pathname}` },
    });
  });
  await context.route("https://team-studio-images.invalid/**", (route) =>
    route.request().resourceType() === "image"
      ? route.fulfill({ body: imageBytes, contentType: "image/png" })
      : route.abort("failed"),
  );
  phase = "team-list-and-create";
  await page.goto(`${base}/admin/team-timetable-studio`, { timeout: 120000 });
  await page
    .getByText("아직 생성된 Team Studio 템플릿이 없습니다.")
    .first()
    .waitFor();
  assert.equal(await page.locator("[data-team-controls]").count(), 0);
  await page.screenshot({ path: path.join(output, "list-empty.png") });
  await page.getByRole("link", { name: "새 템플릿", exact: true }).click();
  await page.getByLabel("이름", { exact: true }).fill(template.name);
  await page.getByRole("button", { name: "생성 후 편집", exact: true }).click();
  await page.waitForURL(`${base}/admin/team-timetable-studio/${id}/edit`);
  await page.locator("[data-team-controls]").waitFor({ timeout: 120000 });
  const canvas = page
    .locator("[data-studio-preview-canvas-root] [data-team-generator]")
    .first();
  assert.equal(await canvas.locator("[data-team-cell]").count(), 21);
  assert.ok(await canvas.boundingBox());
  phase = "layouts-and-history";
  for (const mode of ["day-grid", "member-rows", "day-columns"]) {
    await page.getByLabel("팀 배치", { exact: true }).selectOption(mode);
    assert.equal(await canvas.locator("[data-team-cell]").count(), 21);
    assert.equal(
      await canvas.evaluate((node) => {
        const parent = node.getBoundingClientRect();
        const cells = [...node.querySelectorAll("[data-team-cell]")].map((el) =>
          el.getBoundingClientRect(),
        );
        return (
          cells.every(
            (cell) =>
              cell.width > 0 &&
              cell.height > 0 &&
              cell.left >= parent.left - 1 &&
              cell.top >= parent.top - 1 &&
              cell.right <= parent.right + 1 &&
              cell.bottom <= parent.bottom + 1,
          ) &&
          !cells.some((a, i) =>
            cells.some(
              (b, j) =>
                i < j &&
                a.left < b.right - 1 &&
                b.left < a.right - 1 &&
                a.top < b.bottom - 1 &&
                b.top < a.bottom - 1,
            ),
          )
        );
      }),
      true,
    );
    await page.screenshot({ path: path.join(output, `${mode}-desktop.png`) });
  }
  await page
    .getByRole("button", { name: "멤버 슬롯 추가", exact: true })
    .click();
  assert.equal(await canvas.locator("[data-team-cell]").count(), 28);
  await page
    .locator("[data-team-controls]")
    .getByLabel("멤버 이름", { exact: true })
    .fill("NEW MEMBER");
  await page
    .locator("[data-team-controls]")
    .getByLabel("멤버 이름", { exact: true })
    .blur();
  await page.keyboard.press("Meta+z");
  assert.equal(await canvas.locator("[data-team-cell]").count(), 21);
  await page.keyboard.press("Meta+Shift+z");
  assert.equal(await canvas.locator("[data-team-cell]").count(), 28);
  await page.keyboard.press("Meta+z");
  await page.getByLabel("멤버 슬롯", { exact: true }).selectOption("member-a");
  await page.getByLabel("미리보기 요일", { exact: true }).selectOption("mon");
  await page.getByRole("button", { name: "방송 추가", exact: true }).click();
  assert.equal(
    await canvas
      .locator('[data-team-cell="member-a:mon"] [data-team-entry]')
      .count(),
    2,
  );
  phase = "remote-image-png";
  imageBytes = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, 0, 16, 16);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await page
    .getByLabel("멤버 이미지 URL", { exact: true })
    .fill("https://team-studio-images.invalid/member.png");
  await page.getByLabel("멤버 이미지 URL", { exact: true }).blur();
  const pngDownload = page.waitForEvent("download", { timeout: 120000 });
  await page.getByRole("button", { name: "PNG 다운로드", exact: true }).click();
  const png = await pngDownload,
    pngPath = path.join(output, "team.png");
  await png.saveAs(pngPath);
  assert.ok(
    proxyCalls > 0,
    "PNG preflight uses same-origin proxy after remote CORS failure",
  );
  const pixels = await page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let red = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (
        pixels[i] > 200 &&
        pixels[i + 1] < 100 &&
        pixels[i + 2] < 100 &&
        pixels[i + 3] > 200
      )
        red++;
    return { width: image.width, height: image.height, red };
  }, readFileSync(pngPath).toString("base64"));
  assert.equal(pixels.width, 1600);
  assert.equal(pixels.height, 1000);
  assert.ok(pixels.red > 20);
  phase = "shared-json-and-save";
  await page.getByTitle("Save draft to database", { exact: true }).click();
  await page
    .waitForFunction(
      () =>
        document.body.textContent.includes("Saved") ||
        document.body.textContent.includes("saved"),
      { timeout: 20000 },
    )
    .catch(() => {});
  assert.ok(draft);
  assert.equal(draft.document.version, 8);
  assert.ok(draft.document.domains.timetable.team);
  assert.equal(draft.document.domains.timetable.composition, undefined);
  await page.goto(`${base}/admin/template-studio/${id}/edit`, {
    timeout: 120000,
  });
  await page.locator("[data-team-controls]").waitFor({ timeout: 120000 });
  await page.getByRole("button", { name: "Timetable", exact: true }).click();
  assert.equal(await canvas.locator("[data-team-cell]").count(), 21);
  assert.equal(
    await canvas
      .locator('[data-team-cell="member-a:mon"] [data-team-entry]')
      .count(),
    2,
  );
  await page.getByTitle("Template settings", { exact: true }).click();
  await page.getByRole("tab", { name: /^Data/ }).click();
  const jsonDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const jsonFile = await jsonDownload;
  const exported = JSON.parse(readFileSync(await jsonFile.path(), "utf8"));
  assert.equal(exported.document.version, 8);
  assert.equal(exported.document.schema, "studio_template_document");
  assert.equal(
    exported.runtimeValues.team.members["member-a"].days.mon.entries.length,
    2,
  );
  assert.ok(!JSON.stringify(exported.document).includes("NEW MEMBER"));
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  phase = "mobile";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "속성", exact: true }).click();
  assert.ok(await page.getByLabel("팀 배치", { exact: true }).isVisible());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: path.join(output, "mobile-properties.png") });
  await page.getByRole("button", { name: "캔버스", exact: true }).click();
  await page.waitForFunction(() => {
    const bounds = document
      .querySelector("[data-studio-preview-canvas-root] [data-team-generator]")
      .getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= innerWidth && bounds.width > 0;
  });
  const saveButton = await page
    .getByTitle("Save draft to database", { exact: true })
    .boundingBox();
  const pngButton = await page
    .getByRole("button", { name: "PNG 다운로드", exact: true })
    .boundingBox();
  assert.ok(
    pngButton.x >= saveButton.x + saveButton.width,
    "mobile toolbar icons do not overlap",
  );
  await page.screenshot({ path: path.join(output, "mobile-canvas.png") });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  phase = "team-runtime-form";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/admin/team-timetable-studio/${id}/preview`, {
    timeout: 120000,
  });
  await page
    .locator('[data-testid="template-studio-team-runtime-form"]')
    .waitFor({ timeout: 120000 });
  assert.equal(
    await page.getByLabel("팀 배치", { exact: true }).count(),
    0,
    "runtime cannot modify template definition",
  );
  await page
    .getByLabel("멤버 일정 상태", { exact: true })
    .selectOption("offline");
  assert.equal(
    await page
      .locator('[data-team-cell="member-a:mon"]')
      .getAttribute("data-status"),
    "offline",
  );
  await page
    .getByLabel("멤버 일정 상태", { exact: true })
    .selectOption("online");
  assert.equal(
    await page
      .locator('[data-team-cell="member-a:mon"] [data-team-entry]')
      .count(),
    2,
  );
  await page.screenshot({ path: path.join(output, "runtime-desktop.png") });
  phase = "return-to-team-list";
  await page.getByRole("link", { name: "뒤로가기", exact: true }).click();
  await page.locator("[data-team-controls]").waitFor();
  await page.getByTitle("템플릿 목록으로", { exact: true }).click();
  await page.waitForURL(`${base}/admin/team-timetable-studio`);
  await page.getByText(template.name, { exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(output, "list-desktop.png") });
  await page
    .getByRole("button", { name: `${template.name} 작업 메뉴` })
    .first()
    .click();
  assert.equal(
    await page
      .getByRole("menuitem", { name: "정보 수정", exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page.getByRole("menuitem", { name: "복제", exact: true }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("menuitem", { name: "삭제", exact: true }).count(),
    1,
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, "list-mobile.png") });
  await page.getByRole("link", { name: "편집", exact: true }).last().click();
  await page.waitForURL(`${base}/admin/team-timetable-studio/${id}/edit`);
  await page.locator("[data-team-generator]").first().waitFor();
  assert.deepEqual(errors, []);
  console.log(
    `PASS Team list/create/edit/preview/return, desktop/mobile management, v8 layouts, undo/redo/save/reopen/JSON, remote PNG (${pixels.red} red pixels, ${proxyCalls} proxy calls), no page errors; API fixture only`,
  );
} catch (error) {
  console.error(`Team browser phase: ${phase}`);
  if (page) {
    console.error(
      await page
        .locator("[data-team-generator]")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const bounds = node.getBoundingClientRect();
            return {
              left: bounds.left,
              right: bounds.right,
              width: bounds.width,
              viewport: innerWidth,
            };
          }),
        )
        .catch(() => []),
    );
    await page
      .screenshot({ path: path.join(output, "failure.png") })
      .catch(() => {});
  }
  throw error;
} finally {
  await browser.close();
}
