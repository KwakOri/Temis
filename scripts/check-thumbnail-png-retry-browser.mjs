import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import thumbnailFactory from "../src/utils/thumbnail-studio/document-factory.ts";
import inputValues from "../src/utils/template-studio/input-values.ts";

// Run with node --import tsx against a local development server; every API is mocked.
const base = new URL(
  process.env.THUMBNAIL_PNG_TEST_URL ?? "http://localhost:3000",
);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const id = "00000000-0000-4000-8000-000000000018";
const document = thumbnailFactory.createThumbnailStudioDocument({
  width: 320,
  height: 180,
});
document.inputs.title = {
  id: "title",
  type: "text",
  scope: "global",
  label: "Required title",
  required: true,
  defaultValue: "PNG retry fixture",
};
document.inputs.photo = {
  id: "photo",
  type: "image",
  scope: "global",
  label: "Fixture photo",
  required: true,
  defaultUrl: `${base.origin}/png-retry-image.svg`,
};
document.graph.nodes.photo = {
  id: "photo",
  type: "image",
  label: "Fixture photo",
  parentId: null,
  childIds: [],
  styleId: "photo",
  binding: { kind: "inputImage", inputId: "photo" },
};
document.styles.photo = { left: 0, top: 0, width: 320, height: 180 };
document.graph.rootNodeIds = ["photo"];
const runtimeValues = inputValues.createStudioInitialRuntimeValues(document);
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#2563eb"/></svg>';
const output = "output/playwright/thumbnail-png-retry";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let failExport = true;
  let exportRequests = 0;
  let releaseImages;
  const imagesHeld = new Promise((resolve) => {
    releaseImages = resolve;
  });
  let releaseExport;
  let exportHeld = new Promise((resolve) => {
    releaseExport = resolve;
  });
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== base.origin) return route.abort();
    if (url.pathname === "/png-retry-image.svg") {
      if (request.resourceType() === "image") await imagesHeld;
      if (request.resourceType() === "fetch") {
        exportRequests++;
        await exportHeld;
        if (failExport) return route.fulfill({ status: 503, body: "retry" });
      }
      return route.fulfill({ body: svg, contentType: "image/svg+xml" });
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    assert.equal(request.method(), "GET", "The fixture must not mutate an API");
    if (url.pathname === "/api/auth/verify")
      return route.fulfill({
        json: {
          user: {
            id: "18",
            name: "PNG retry fixture",
            email: "fixture@example.invalid",
          },
        },
      });
    if (url.pathname === "/api/template-access")
      return route.fulfill({
        json: {
          hasAccess: true,
          isAdmin: false,
          reason: "template_access",
        },
      });
    if (url.pathname === `/api/user/templates/${id}/runtime`)
      return route.fulfill({
        json: {
          template: { id, name: "PNG retry fixture", kind: "thumbnail" },
          kind: "thumbnail",
          revisionNo: 1,
          document,
          runtimeValues,
          baseRevisionNo: 1,
          hasSavedState: false,
          storageOwnerId: "png-retry-fixture",
        },
      });
    if (url.pathname === "/api/template-studio/assets/image")
      return route.fulfill({ status: 503, body: "retry" });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto(`${base.origin}/thumbnail/${id}`, { timeout: 120000 });
  const form = page.getByTestId("thumbnail-runtime-form");
  await form.waitFor({ state: "visible", timeout: 120000 });
  const button = form.getByRole("button", { name: "PNG 저장", exact: true });
  assert.equal(
    await button.isDisabled(),
    true,
    "Images must load before export",
  );
  const title = form.getByRole("textbox").first();
  await title.fill("");
  releaseImages();
  await page.waitForFunction(() => {
    const images = [
      ...window.document.querySelectorAll('[data-node-id="photo"] img'),
    ];
    return (
      images.length > 0 &&
      images.every((image) => image.complete && image.naturalWidth > 0)
    );
  });
  assert.equal(
    await button.isDisabled(),
    true,
    "Required inputs still block export",
  );
  await title.fill("PNG retry fixture");
  await button.waitFor({ state: "visible" });
  await page.waitForFunction(() =>
    [...window.document.querySelectorAll("button")].some(
      (button) => button.textContent.includes("PNG 저장") && !button.disabled,
    ),
  );

  await button.click();
  const generating = form.getByRole("button", {
    name: "생성 중…",
    exact: true,
  });
  await generating.waitFor();
  assert.equal(
    await generating.isDisabled(),
    true,
    "In-flight export must block repeated clicks",
  );
  releaseExport();
  const error = form.getByText(/PNG에 필요한 .*다시 시도해 주세요\./);
  await error.waitFor();
  assert.equal(
    await button.isEnabled(),
    true,
    "A failed PNG must allow retry without reloading",
  );
  await page.screenshot({ path: `${output}/failed-export-retry-enabled.png` });
  await title.fill("");
  assert.equal(
    await button.isDisabled(),
    true,
    "A PNG error must not bypass required inputs",
  );
  await title.fill("PNG retry fixture");
  failExport = false;
  const download = page.waitForEvent("download");
  await button.click();
  const png = await download;
  assert.match(png.suggestedFilename(), /\.png$/);
  await png.saveAs(`${output}/retried.png`);
  await page.waitForFunction(() =>
    [...window.document.querySelectorAll("button")].some(
      (button) => button.textContent.includes("PNG 저장") && !button.disabled,
    ),
  );
  assert.equal(
    await error.count(),
    0,
    "A successful retry must clear the previous export error",
  );
  assert.equal(
    exportRequests,
    2,
    "One attempt and one retry should issue two export image requests",
  );

  failExport = true;
  exportHeld = Promise.resolve();
  await button.click();
  await error.waitFor();
  await form.getByRole("button", { name: "초기화", exact: true }).click();
  assert.equal(await error.count(), 0, "Reset must clear the export error");
  await page.waitForFunction(() =>
    [...window.document.querySelectorAll("button")].some(
      (button) => button.textContent.includes("PNG 저장") && !button.disabled,
    ),
  );
  assert.deepEqual(pageErrors, []);
  console.log(
    "Thumbnail PNG failure → retry/download, required input, image readiness, in-flight, and reset checks passed.",
  );
  await context.close();
} finally {
  await browser.close();
}
