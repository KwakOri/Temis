import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import fixtureHelper from "./lib/legacy-template-assets-browser-fixture.cjs";

const base = "http://127.0.0.1:3107";
const fixturePath = process.argv[2];
if (!fixturePath) throw new Error("Pass a generated browser fixture file.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
mkdirSync("output/playwright", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) =>
    console.error("Browser error:", error.message),
  );
  const fixture = await fixtureHelper.install(page, fixturePath);
  await page.goto(`${base}/admin/legacy-template-assets`);
  await page
    .getByRole("link", { name: "Legacy asset verification", exact: true })
    .waitFor();
  await page.screenshot({
    path: "output/playwright/legacy-assets-list-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Legacy asset verification", exact: true })
    .click();
  await page.getByLabel("이미지 키 검색").fill("bg");
  await page.getByRole("checkbox", { name: "bg", exact: true }).check();
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("교체 이미지 업로드")
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes, "base64"),
    });
  await page.getByRole("button", { name: "1개 적용", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "시간표 미리보기", exact: true })
    .click();
  const frame = page.frameLocator('iframe[title="교체 후보 시간표"]');
  try {
    await frame.locator("#timetable").waitFor({ timeout: 30000 });
  } catch (error) {
    await page.screenshot({
      path: "output/playwright/legacy-preview-error.png",
      fullPage: true,
    });
    for (const item of page.frames())
      console.log((await item.locator("body").innerText()).slice(0, 3000));
    throw error;
  }
  assert.match(
    await frame
      .locator("#timetable")
      .evaluate((node) => node.style.backgroundImage),
    /replacement/,
  );
  await page.screenshot({
    path: "output/playwright/legacy-assets-detail-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "output/playwright/legacy-assets-detail-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Mobile page overflows horizontally",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "1개 적용", exact: true }).click();
  await page.getByText("#2", { exact: true }).first().waitFor();
  assert.equal(fixture.stats.applied, 1);
  await page.getByRole("button", { name: "복원", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "복원", exact: true })
    .click();
  await page.getByText("#3", { exact: true }).first().waitFor();
  assert.equal(fixture.stats.restored, 1);
  // Apply the red root background again for a pixel-level PNG check.
  const active = fixture.detail.revisions[0];
  active.bindings.first.bg = "00000000-0000-4000-8000-000000000999";
  await page.goto(`${base}/time-table/${fixture.owner.templateId}`);
  await page.locator("#timetable").waitFor({ timeout: 120000 });
  await page
    .getByRole("button", { name: "이미지로 저장", exact: true })
    .click();
  const downloaded = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  const download = await downloaded;
  const pngPath = "output/playwright/legacy-remote-root-background.png";
  await download.saveAs(pngPath);
  const png = readFileSync(pngPath).toString("base64");
  const pixels = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    return {
      width: canvas.width,
      height: canvas.height,
      rootPixel: [...ctx.getImageData(5, 5, 1, 1).data],
    };
  }, png);
  assert.ok(pixels.width >= 1280 && pixels.height >= 720);
  assert.deepEqual(
    pixels.rootPixel,
    [255, 0, 0, 255],
    "Remote root background disappeared from PNG",
  );
  assert.ok(
    fixture.stats.proxyFetches > 0,
    "CORS-free export never used the proxy",
  );
  console.log(
    JSON.stringify({
      passed: true,
      applied: fixture.stats.applied,
      restored: fixture.stats.restored,
      proxyFetches: fixture.stats.proxyFetches,
      png: pixels,
      desktopAndMobile: true,
    }),
  );
} finally {
  await browser.close();
}
