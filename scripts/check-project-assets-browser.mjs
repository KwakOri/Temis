import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { chromium } from "playwright";
import fixtureHelper from "./lib/legacy-template-assets-browser-fixture.cjs";
const { loadEnvConfig } = nextEnv;

const args = process.argv.slice(2);
if (
  !args.includes("--allow-read-only-production") ||
  !args.includes("--env-dir")
)
  throw new Error(
    "Pass --allow-read-only-production --env-dir <temis-env-directory>.",
  );
const root = path.resolve(import.meta.dirname, "..");
const base = "http://127.0.0.1:3108";
const ids = [
  "0c10c964-b83c-4309-a81b-76550aba17b0",
  "28c2b9fb-9d7e-4aaa-822d-96909d384032",
  "8f9bb89d-34f5-45c1-b923-16366197af33",
];
const directory = mkdtempSync(path.join(tmpdir(), "temis-project-browser-"));
let server, browser;
let phase = "configuration";
let blockedWrites = 0;
let proxyFetches = 0;
try {
  loadEnvConfig(path.resolve(args[args.indexOf("--env-dir") + 1]), true, {
    info() {},
    error() {},
  });
  assert.equal(
    new URL(process.env.SUPABASE_URL).hostname,
    "ajlgjdwkjyayrnocdfpj.supabase.co",
  );
  const db = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false } },
  );
  let admin = await db
    .from("users")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (!admin.error && !admin.data && process.env.ADMIN_EMAILS)
    admin = await db
      .from("users")
      .select("id")
      .in(
        "email",
        process.env.ADMIN_EMAILS.split(",").map((value) => value.trim()),
      )
      .limit(1)
      .maybeSingle();
  assert.equal(admin.error, null);
  assert.ok(admin.data, "Verification admin required");
  const token = await new SignJWT({
    userId: admin.data.id,
    role: "admin",
    name: "Asset verification",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(3108, "127.0.0.1", () => probe.close(resolve));
  });
  phase = "server-start";
  server = spawn(
    "npm",
    ["run", "dev:next", "--", "--port", "3108", "--hostname", "127.0.0.1"],
    {
      cwd: root,
      env: {
        ...process.env,
        LEGACY_TEMPLATE_ASSET_ENV: "production",
        NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED: "true",
        NEXT_PUBLIC_PROJECT_ASSETS_R2_ENABLED: "true",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let ready = false;
  const watch = (chunk) => {
    if (chunk.toString().includes("Ready in")) ready = true;
  };
  server.stdout.on("data", watch);
  server.stderr.on("data", watch);
  for (let n = 0; n < 90 && !ready; n++) {
    assert.equal(server.exitCode, null);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, "Server readiness timeout");
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await context.addCookies([
    { name: "token", value: token, url: base, httpOnly: true, sameSite: "Lax" },
  ]);
  await context.route(`${base}/api/**`, async (route) => {
    const request = route.request();
    if (request.url().includes("/api/template-studio/assets/image?"))
      proxyFetches++;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const url = new URL(request.url());
      const preview =
        url.pathname.startsWith("/api/admin/legacy-template-assets/") &&
        request.postDataJSON()?.action === "preview";
      if (!preview) {
        blockedWrites++;
        return route.abort();
      }
    }
    await route.continue();
  });
  const get = async (url) => {
    const response = await context.request.get(`${base}${url}`, {
      timeout: 120000,
    });
    assert.ok(response.ok(), `Read-only API failed: ${url}`);
    return response.json();
  };
  const list = await get("/api/admin/legacy-template-assets");
  assert.equal(list.sets.length, 197);
  assert.ok(list.sets.every((set) => set.mode === "local"));
  const publicResponse = await browser.newContext();
  const publicManifest = await publicResponse.request.get(
    `${base}/api/project-assets`,
  );
  assert.equal(publicManifest.status(), 200);
  assert.deepEqual((await publicManifest.json()).covers, {});
  const adminRejection = await publicResponse.request.get(
    `${base}/api/admin/legacy-template-assets/site/homepage?purpose=site`,
  );
  assert.equal(adminRejection.status(), 401);
  await publicResponse.close();
  const details = new Map();
  for (const id of ids)
    details.set(
      id,
      await get(
        `/api/admin/legacy-template-assets/timetable/${id}?purpose=runtime`,
      ),
    );
  const homepage = await get(
    "/api/admin/legacy-template-assets/site/homepage?purpose=site",
  );
  assert.equal(homepage.set.mode, "local");
  assert.equal(homepage.versions.length, 14);
  const cover = await get(
    `/api/admin/legacy-template-assets/timetable/${ids[2]}?purpose=cover`,
  );
  mkdirSync(path.join(root, "output/playwright"), { recursive: true });
  const errors = [];
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((values) => {
    for (const id of values)
      localStorage.setItem(
        `selectedOptions-${id}`,
        JSON.stringify(["memo", "profile"]),
      );
  }, ids);
  const pngPixels = async (file) =>
    page.evaluate(async (bytes) => {
      const image = new Image();
      image.src = `data:image/png;base64,${bytes}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", pixels)),
      )
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      const samples = [];
      for (let y = 5; y < canvas.height; y += 37)
        for (let x = 5; x < canvas.width; x += 41)
          samples.push(...ctx.getImageData(x, y, 1, 1).data);
      return { width: canvas.width, height: canvas.height, hash, samples };
    }, readFileSync(file).toString("base64"));
  const capture = async (name) => {
    await page
      .getByRole("button", { name: "이미지로 저장", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download", { timeout: 90000 });
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    const download = await downloadPromise;
    const file = path.join(root, `output/playwright/${name}.png`);
    await download.saveAs(file);
    return pngPixels(file);
  };
  const captures = [];
  const settleTextLayout = async () => {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const parents = [
        ...new Set(
          [...document.querySelectorAll("#timetable p")].map(
            (el) => el.parentElement,
          ),
        ),
      ];
      const widths = parents.map((parent) => parent.style.width);
      // Existing AutoResizeText observes box size, not completed font loads.
      // Compare image migration under identical, post-font text measurements.
      parents.forEach((parent) => {
        parent.style.width = `${parent.clientWidth + 1}px`;
      });
      const frame = () =>
        new Promise((resolve) => requestAnimationFrame(resolve));
      await frame();
      await frame();
      parents.forEach((parent, index) => {
        parent.style.width = widths[index];
      });
      await frame();
      await frame();
    });
  };
  const textMetrics = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#timetable p")].map((el) => {
        const style = getComputedStyle(el);
        return {
          font: style.fontFamily,
          size: style.fontSize,
          width: el.parentElement.clientWidth,
          height: el.parentElement.clientHeight,
          loaded: document.fonts.check(`${style.fontSize} ${style.fontFamily}`),
        };
      }),
    );
  for (const id of ids) {
    phase = `local-png:${id}`;
    await page.goto(`${base}/time-table/${id}`, { timeout: 120000 });
    await page.locator("#timetable").waitFor({ timeout: 120000 });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#timetable img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    // Legacy AutoResizeText measures once before fonts load on a cold visit.
    // Warm the fonts and remount both comparisons under the same font state.
    await page.evaluate(() => document.fonts.ready);
    await page.reload({ timeout: 120000 });
    await page.locator("#timetable").waitFor({ timeout: 120000 });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#timetable img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    await settleTextLayout();
    const localMetrics = await textMetrics();
    const local = await capture(`held-${id}-local`);
    const detail = details.get(id);
    const revision = detail.revisions.find(
      (item) => item.id === detail.set.active_revision_id,
    );
    const [key, versionId] = Object.entries(revision.bindings.first)[0];
    const changes = [{ theme: "first", key, versionId }];
    phase = `r2-png:${id}`;
    await page.goto(
      `${base}/time-table/${id}?legacyAssetPreview=${encodeURIComponent(JSON.stringify(changes))}`,
      { timeout: 120000 },
    );
    await page.locator("#timetable").waitFor({ timeout: 120000 });
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll("#timetable img")];
      return (
        images.length > 0 &&
        images.every((image) => image.complete && image.naturalWidth > 0) &&
        images.some((image) =>
          image.src.includes("legacy-template-assets/production/"),
        )
      );
    });
    await settleTextLayout();
    const remoteMetrics = await textMetrics();
    assert.deepEqual(
      remoteMetrics,
      localMetrics,
      `Local/R2 text layout: ${id}`,
    );
    const remote = await capture(`held-${id}-r2`);
    assert.equal(remote.width, local.width);
    assert.equal(remote.height, local.height);
    assert.ok(remote.width >= 1280 && remote.height >= 720);
    const changed =
      remote.samples.filter(
        (value, index) => Math.abs(value - local.samples[index]) > 2,
      ).length / remote.samples.length;
    assert.ok(changed < 0.01, `Local/R2 PNG pixels diverged: ${changed}`);
    assert.ok(new Set(remote.samples).size > 8, "PNG appears blank");
    captures.push({
      id,
      width: remote.width,
      height: remote.height,
      exactPixelMatch: remote.hash === local.hash,
      changedSampleRatio: changed,
    });
    console.log(
      JSON.stringify({
        stage: "held-template-png",
        ...captures[captures.length - 1],
      }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(root, `output/playwright/held-${id}-mobile.png`),
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Mobile overflow: ${id}`,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  phase = "public-home-r2-preview";
  const sets = await db
    .from("legacy_template_asset_sets")
    .select("*")
    .in("purpose", ["cover", "site"]);
  assert.equal(sets.error, null);
  const revisions = await db
    .from("legacy_template_asset_revisions")
    .select("*")
    .in(
      "id",
      sets.data.map((set) => set.active_revision_id),
    );
  const versions = await db
    .from("legacy_template_asset_versions")
    .select("*")
    .in(
      "asset_set_id",
      sets.data.map((set) => set.id),
    );
  assert.equal(revisions.error, null);
  assert.equal(versions.error, null);
  const { buildProjectAssetManifest } =
    await import("../src/services/server/projectAssetManifestService.ts");
  const previewManifest = buildProjectAssetManifest(
    sets.data.map((set) => ({ ...set, mode: "r2" })),
    revisions.data,
    versions.data,
  );
  assert.equal(Object.keys(previewManifest.covers).length, 97);
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  let manifestRequests = 0;
  await anonymous.route(`${base}/api/project-assets`, (route) => {
    manifestRequests++;
    return route.fulfill({ json: previewManifest });
  });
  const home = await anonymous.newPage();
  home.on("pageerror", (error) => errors.push(error.message));
  await home.goto(base, { timeout: 120000 });
  await home.locator("#timetable").waitFor({ timeout: 120000 });
  await home.waitForFunction(() =>
    [...document.querySelectorAll("#timetable img")].every(
      (image) =>
        image.complete &&
        image.naturalWidth > 0 &&
        image.src.includes("legacy-template-assets/production/"),
    ),
  );
  await home.waitForFunction(
    () =>
      [...document.images].filter((image) =>
        image.src.includes("/site/homepage/site/"),
      ).length >= 4,
  );
  await home.waitForFunction(() =>
    [...document.images]
      .filter((image) => image.src.includes("/site/homepage/site/"))
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await home.screenshot({
    path: path.join(root, "output/playwright/project-home-desktop.png"),
    fullPage: true,
  });
  await home.setViewportSize({ width: 390, height: 844 });
  await home.getByAltText("Sample", { exact: true }).waitFor();
  await home.waitForFunction(() =>
    [...document.images].some(
      (image) =>
        image.alt === "Sample" &&
        image.src.includes("/site/homepage/site/") &&
        image.complete &&
        image.naturalWidth > 0,
    ),
  );
  await home.screenshot({
    path: path.join(root, "output/playwright/project-home-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await home.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(manifestRequests, 1, "Homepage duplicated manifest reads");
  await anonymous.close();
  phase = "management-cover-fixture";
  const fixtureFile = path.join(directory, "cover.json");
  writeFileSync(
    fixtureFile,
    JSON.stringify({
      owner: { ownerKind: "timetable", templateId: ids[2], purpose: "cover" },
      detail: cover,
      assets: {},
    }),
  );
  const management = await context.newPage();
  const fixture = await fixtureHelper.install(management, fixtureFile, {
    baseUrl: base,
  });
  await management.goto(
    `${base}/admin/legacy-template-assets/timetable/${ids[2]}?purpose=cover`,
    { timeout: 120000 },
  );
  await management
    .getByRole("checkbox", { name: "cover", exact: true })
    .check();
  const red = await management.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await management.getByLabel("교체 이미지 업로드").setInputFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: Buffer.from(red, "base64"),
  });
  await management
    .getByRole("button", { name: "1개 적용", exact: true })
    .waitFor();
  await management
    .getByRole("button", { name: "이미지 미리보기", exact: true })
    .click();
  await management.getByAltText("교체 후보 대표 썸네일").waitFor();
  await management
    .getByRole("button", { name: "1개 적용", exact: true })
    .click();
  await management.getByText("#2", { exact: true }).first().waitFor();
  await management.getByRole("button", { name: "복원", exact: true }).click();
  await management
    .getByRole("dialog")
    .getByRole("button", { name: "복원", exact: true })
    .click();
  await management.getByText("#3", { exact: true }).first().waitFor();
  assert.equal(fixture.stats.applied, 1);
  assert.equal(fixture.stats.restored, 1);
  await management
    .getByRole("checkbox", { name: "R2 적용", exact: true })
    .click();
  await management.getByText("#4", { exact: true }).first().waitFor();
  assert.equal(
    await management
      .getByRole("checkbox", { name: "R2 적용", exact: true })
      .isChecked(),
    false,
  );
  assert.equal(fixture.detail.set.mode, "local");
  await management.setViewportSize({ width: 390, height: 844 });
  await management.screenshot({
    path: path.join(root, "output/playwright/project-cover-manager-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await management.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  phase = "unchanged-production-state";
  const after = await get("/api/admin/legacy-template-assets");
  assert.ok(after.sets.every((set) => set.mode === "local"));
  for (const id of ids) {
    const current = await get(
      `/api/admin/legacy-template-assets/timetable/${id}?purpose=runtime`,
    );
    assert.equal(
      current.set.active_revision_id,
      details.get(id).set.active_revision_id,
    );
    assert.equal(current.revisions.length, 1);
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    JSON.stringify({
      passed: true,
      actualR2: true,
      adminSets: after.sets.length,
      heldTemplatePngs: captures,
      publicCovers: 97,
      homepageSlots: 14,
      anonymousHomepage: true,
      manifestRequests,
      fixtureApplied: 1,
      fixtureRestored: 1,
      desktopAndMobile: true,
      proxyFetches,
      blockedWrites,
      remoteDbWrites: false,
      allModesLocal: true,
      textComparison:
        "post-font box remeasurement; cold-font fitting not covered",
    }),
  );
} catch (error) {
  console.error(
    `Project asset browser verification failed: ${phase}: ${error.message}`,
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server?.pid && server.exitCode === null) {
    process.kill(-server.pid, "SIGTERM");
    await new Promise((resolve) => {
      if (server.exitCode !== null) resolve();
      else server.once("exit", resolve);
    });
  }
  rmSync(directory, { recursive: true, force: true });
}
