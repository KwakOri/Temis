import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright";
import timetableFactory from "../src/utils/template-studio/timetable-graph-document.ts";
import thumbnailFactory from "../src/utils/thumbnail-studio/document-factory.ts";
import inputValues from "../src/utils/template-studio/input-values.ts";

const { createStudioTimetableGraphDocument } = timetableFactory;
const { createThumbnailStudioDocument } = thumbnailFactory;
const { createStudioInitialRuntimeValues } = inputValues;

const base = process.env.STUDIO_SAFETY_TEST_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = "output/playwright/studio-editor-safety";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
let currentPage;
try {
  for (const kind of ["thumbnail", "timetable"]) {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
    });
    const page = await context.newPage();
    currentPage = page;
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const id = "00000000-0000-4000-8000-000000000009";
    const template = {
      id,
      name: "Font Test",
      description: "",
      status: "draft",
      templateKind: kind,
      createdBy: 1,
      thumbnailUrl: null,
      studioPreviewUrl: null,
      createdAt: "2026-10-06T00:00:00Z",
      updatedAt: "2026-10-06T00:00:00Z",
    };
    let document =
      kind === "thumbnail"
        ? createThumbnailStudioDocument()
        : createStudioTimetableGraphDocument();
    document.styles.fontTestStyle = {
      position: "absolute",
      left: 30,
      top: 30,
      width: 300,
      height: 100,
      fontSize: 40,
      color: "#111827",
    };
    document.graph.nodes.fontTest = {
      id: "fontTest",
      type: "text",
      label: "Font Test",
      parentId: null,
      childIds: [],
      styleId: "fontTestStyle",
      binding: { kind: "staticText", value: "Font Test" },
    };
    if (kind === "timetable") {
      const timetable = document.domains.timetable;
      const component = timetable.components[timetable.entryComponentId];
      const rootId = component.variants.online.rootNodeId;
      document.graph.nodes[rootId].childIds.push("fontTest");
      document.graph.nodes.fontTest.parentId = rootId;
      Object.values(document.assets).forEach((asset) => {
        asset.src = "https://studio-fonts.invalid/placeholder.svg";
      });
    } else {
      document.graph.rootNodeIds.push("fontTest");
    }
    let runtimeValues = createStudioInitialRuntimeValues(document);
    let saveCount = 0;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
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
      if (!url.pathname.startsWith("/api/admin/template-studio/templates"))
        return route.fulfill({ status: 404, json: {} });
      if (url.pathname.endsWith("/save-events"))
        return route.fulfill({ json: { success: true, event: {} } });
      if (url.pathname.endsWith("/draft") && request.method() === "PUT") {
        const body = request.postDataJSON();
        document = body.document;
        runtimeValues = body.runtimeValues;
        saveCount++;
        return route.fulfill({
          json: {
            success: true,
            templateId: id,
            attemptId: body.attemptId,
            hasDraft: true,
            draft: {
              id: "fixture-draft",
              templateId: id,
              userId: 1,
              documentVersion: document.version,
              document,
              runtimeValues,
              baseRevisionNo: null,
              isAutosave: false,
              createdAt: template.createdAt,
              updatedAt: template.updatedAt,
            },
            diagnostics: [],
            migrationWarnings: [],
          },
        });
      }
      if (request.method() === "GET")
        return route.fulfill({
          json: {
            success: true,
            templateId: id,
            template,
            document: null,
            draft: {
              id: "fixture-draft",
              templateId: id,
              userId: 1,
              documentVersion: document.version,
              document,
              runtimeValues,
              baseRevisionNo: null,
              isAutosave: false,
              createdAt: template.createdAt,
              updatedAt: template.updatedAt,
            },
            assets: [],
            latestRevisionNo: 0,
            source: "draft",
          },
        });
      throw new Error(
        `Unexpected mutation ${request.method()} ${url.pathname}`,
      );
    });
    await context.route(
      "https://studio-fonts.invalid/placeholder.svg",
      (route) =>
        route.fulfill({
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>',
          contentType: "image/svg+xml",
        }),
    );
    const route = kind === "thumbnail" ? "thumbnail-studio" : "template-studio";
    await page.goto(`${base}/admin/${route}/${id}/edit`, { timeout: 120000 });
    const node = page.locator('[data-node-id="fontTest"]').first();
    await node.waitFor({ state: "visible", timeout: 120000 });
    await node.click();
    const settings = page.getByRole("button", {
      name: kind === "thumbnail" ? "Thumbnail settings" : "Template settings",
      exact: true,
    });
    await settings.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    const close = dialog.getByRole("button", {
      name: "Close settings",
      exact: true,
    });
    await close.focus();
    await page.keyboard.press("Delete");
    await page.keyboard.press("Meta+d");
    await page.keyboard.press("Meta+s");
    assert.equal(
      await page.locator('[data-node-id="fontTest"]').count(),
      1,
      "Modal keys must not delete or duplicate the background selection",
    );
    for (const key of ["Tab", "Shift+Tab"]) {
      await close.focus();
      for (let step = 0; step < 30; step++) {
        await page.keyboard.press(key);
        assert.ok(
          await dialog.evaluate((el) =>
            el.contains(window.document.activeElement),
          ),
          "Tab must stay in the settings dialog",
        );
      }
    }
    await page.getByRole("tab", { name: /^Canvas/ }).click();
    const number = dialog.locator('input[type="number"]').first();
    await number.fill("1234");
    assert.ok(
      await number.evaluate((el) => el === window.document.activeElement),
      "Editing settings must keep the field focused across renders",
    );
    await page.getByRole("tab", { name: /^Data/ }).click();
    assert.equal(
      saveCount,
      0,
      "Modal shortcuts must not save the background document",
    );
    assert.equal(
      await dialog.getByRole("button", { name: "Import JSON" }).count(),
      0,
    );
    assert.equal(
      await page.locator('input[accept="application/json,.json"]').count(),
      0,
    );
    assert.ok(
      await dialog.getByRole("button", { name: "Export JSON" }).isVisible(),
    );
    await close.focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 0);
    assert.ok(
      await settings.evaluate((el) => el === window.document.activeElement),
      "Closing settings must restore focus to its trigger",
    );
    assert.equal(await page.locator('[data-node-id="fontTest"]').count(), 1);
    await page.keyboard.press("Delete");
    assert.equal(
      await page.locator('[data-node-id="fontTest"]').count(),
      0,
      "Background shortcuts must still work after the dialog closes",
    );
    await page.keyboard.press("Meta+z");
    assert.equal(await page.locator('[data-node-id="fontTest"]').count(), 1);
    await page.screenshot({ path: `${output}/${kind}-desktop.png` });
    assert.deepEqual(errors, []);
    console.log(
      `${kind}: modal isolation, focus loop/restore, normal shortcuts and JSON import removal passed`,
    );
    await context.close();
  }
  const mobileDevices = [
    {
      name: "android-desktop-mode",
      options: {
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "iphone-landscape",
      options: { ...devices["iPhone 13 landscape"] },
    },
    {
      name: "android-tablet",
      options: {
        userAgent:
          "Mozilla/5.0 (Linux; Android 13; Tablet) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "ipad-desktop-mode",
      options: {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        viewport: { width: 1366, height: 1024 },
        hasTouch: true,
        isMobile: true,
      },
      ipad: true,
    },
  ];
  for (const device of mobileDevices) {
    const context = await browser.newContext(device.options);
    if (device.ipad)
      await context.addInitScript(() => {
        Object.defineProperty(window.navigator, "platform", {
          get: () => "MacIntel",
        });
        Object.defineProperty(window.navigator, "maxTouchPoints", {
          get: () => 5,
        });
      });
    let documentRequests = 0;
    await context.route("**/api/**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/verify")
        return route.fulfill({
          json: { user: { id: "1", role: "admin", isAdmin: true } },
        });
      if (url.pathname.includes("/template-studio/templates/"))
        documentRequests++;
      return route.fulfill({ status: 404, json: {} });
    });
    const page = await context.newPage();
    for (const route of [
      "thumbnail-studio",
      "template-studio",
      "team-timetable-studio",
    ]) {
      await page.goto(
        `${base}/admin/${route}/00000000-0000-4000-8000-000000000009/edit`,
        { timeout: 120000 },
      );
      await page
        .getByRole("heading", { name: "데스크톱에서 편집해 주세요" })
        .waitFor();
      assert.equal(
        await page
          .getByRole("link", { name: "템플릿 목록으로 돌아가기" })
          .getAttribute("href"),
        `/admin/${route}`,
      );
      assert.equal(await page.locator("[data-node-id]").count(), 0);
    }
    assert.equal(
      documentRequests,
      0,
      "Mobile must be blocked before mounting/querying the editor",
    );
    await page.screenshot({ path: `${output}/${device.name}.png` });
    console.log(
      `${device.name}: thumbnail, timetable and team editor blocked before document queries`,
    );
    await context.close();
  }
} catch (error) {
  if (currentPage && !currentPage.isClosed())
    await currentPage.screenshot({ path: `${output}/failure.png` });
  throw error;
} finally {
  await browser.close();
}
