import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import timetableFactory from "../src/utils/template-studio/timetable-graph-document.ts";
import thumbnailFactory from "../src/utils/thumbnail-studio/document-factory.ts";
import inputValues from "../src/utils/template-studio/input-values.ts";

const { createStudioTimetableGraphDocument } = timetableFactory;
const { createThumbnailStudioDocument } = thumbnailFactory;
const { createStudioInitialRuntimeValues } = inputValues;

const base = process.env.STUDIO_FONT_TEST_URL ?? "http://localhost:3000";
const output = "output/playwright/studio-default-font";
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
    await context.route(`${base}/api/**`, async (route) => {
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
    // Reuse a local font so this check never depends on a font CDN.
    const fontBytes = readFileSync(
      process.env.STUDIO_FONT_TEST_FONT ??
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    );
    await context.route("https://studio-fonts.invalid/font.ttf", (route) =>
      route.fulfill({
        body: fontBytes,
        contentType: "font/ttf",
        headers: { "access-control-allow-origin": "*" },
      }),
    );
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
    const checkFamily = async (expected) => {
      await page.waitForFunction(
        ({ expected }) => {
          const node = window.document.querySelector(
            '[data-node-id="fontTest"]',
          );
          return (
            node &&
            getComputedStyle(node).fontFamily.replaceAll('"', "") === expected
          );
        },
        { expected },
      );
    };
    await checkFamily("Inter");
    await node.click();
    await page.screenshot({ path: `${output}/${kind}-selected.png` });
    const fontSelect = page.getByRole("combobox", { name: /^Font\b/ });
    await fontSelect.waitFor();
    assert.equal(await fontSelect.inputValue(), "");
    assert.deepEqual(await fontSelect.locator("option").allTextContents(), [
      "none",
    ]);
    const openSettings = async () => {
      await page
        .getByRole("button", {
          name:
            kind === "thumbnail" ? "Thumbnail settings" : "Template settings",
          exact: true,
        })
        .click();
      await page.getByRole("tab", { name: /Web Fonts/ }).click();
    };
    await openSettings();
    const defaultSelect = page.getByLabel("Default Font");
    assert.equal(await defaultSelect.inputValue(), "");
    await page
      .getByPlaceholder("Paste one or more @font-face blocks")
      .fill(
        ["Brand Sans", "Brand Serif"]
          .map(
            (family) =>
              `@font-face { font-family: '${family}'; src: url('https://studio-fonts.invalid/font.ttf') format('truetype'); font-weight: 400; }`,
          )
          .join("\n"),
      );
    await page.getByRole("button", { name: "Add font", exact: true }).click();
    await defaultSelect.selectOption("Brand Sans");
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await checkFamily("Brand Sans");
    assert.equal(
      await fontSelect.inputValue(),
      "",
      "Inherited text remains none in the object selector",
    );
    assert.deepEqual(await fontSelect.locator("option").allTextContents(), [
      "none",
      "Brand Sans",
      "Brand Serif",
    ]);
    await fontSelect.selectOption("Brand Serif");
    await checkFamily("Brand Serif");
    await openSettings();
    await defaultSelect.selectOption("Brand Serif");
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await fontSelect.selectOption("");
    await checkFamily("Brand Serif");
    await openSettings();
    await defaultSelect.selectOption("Brand Sans");
    await page
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await checkFamily("Brand Sans");
    await page
      .getByRole("button", {
        name:
          kind === "thumbnail"
            ? "Save thumbnail draft"
            : "Save draft to database",
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () => !window.document.querySelector('[role="dialog"]'),
    );
    for (let attempt = 0; saveCount === 0 && attempt < 40; attempt++)
      await page.waitForTimeout(100);
    assert.ok(saveCount > 0, "Draft was saved through the mocked endpoint");
    assert.equal(document.resources.defaultFontFamily, "Brand Sans");
    assert.equal(document.styles.fontTestStyle.fontFamily, undefined);
    await page.reload();
    await node.waitFor({ state: "visible" });
    await checkFamily("Brand Sans");
    await node.click();
    assert.equal(await fontSelect.inputValue(), "");
    await page.screenshot({ path: `${output}/${kind}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `${kind}: none, source registration, inherited default, override, clearing, save/reload passed`,
    );
    await context.close();
  }
} catch (error) {
  if (currentPage) {
    await currentPage.screenshot({ path: `${output}/failure.png` });
    console.error(
      (await currentPage.locator("body").innerText()).slice(0, 2500),
    );
  }
  throw error;
} finally {
  await browser.close();
}
