import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
assert.ok(args.includes("--allow-local-mode-changes"));
const base = new URL(
  process.env.LOCAL_ASSET_TEST_URL ?? "http://localhost:3000",
);
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname));
const output = path.join(root, "output/playwright/local-r2-assets");
mkdirSync(output, { recursive: true });
nextEnv.loadEnvConfig(root, true, { info() {}, error() {} });
const status = spawnSync("supabase", ["status", "-o", "env"], {
  cwd: root,
  encoding: "utf8",
});
assert.equal(status.status, 0, "Local Supabase must be running");
const env = Object.fromEntries(
  status.stdout.split("\n").flatMap((line) => {
    const match = /^([A-Z_]+)="(.*)"$/.exec(line.trim());
    return match ? [[match[1], match[2]]] : [];
  }),
);
const api = env.API_URL ?? env.KONG_URL;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(api).hostname));
const db = createClient(api, env.SECRET_KEY, {
  auth: { persistSession: false },
});
const localAdmin = await db
  .from("users")
  .select("id")
  .eq("email", "admin@admin.com")
  .eq("role", "admin")
  .single();
assert.equal(localAdmin.error, null);
const token = await new SignJWT({
  userId: localAdmin.data.id,
  email: "admin@admin.com",
  name: "Local Test Admin",
  role: "admin",
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const headers = { Cookie: `token=${token}` };
const get = async (route) => {
  const response = await fetch(new URL(route, base), { headers });
  assert.equal(response.status, 200, `Local API ${route}: ${response.status}`);
  return response.json();
};
const urlFor = (set, admin = true) =>
  `/api/${admin ? "admin/" : ""}legacy-template-assets/${set.ownerKind}/${set.templateId}?purpose=${set.purpose}`;
const setMode = async (set, mode) => {
  const detail = await get(urlFor(set));
  if (detail.set.mode === mode) return;
  const response = await fetch(new URL(urlFor(set), base), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "mode",
      mode,
      expectedRevisionId: detail.set.active_revision_id,
    }),
  });
  assert.equal(response.status, 200, "Local mode change failed");
};
// A fresh local-only revision must be visible through the app before any API writes.
const probeSet = await db
  .from("legacy_template_asset_sets")
  .select("id,active_revision_id,mode")
  .eq("purpose", "runtime")
  .limit(1)
  .single();
assert.equal(probeSet.error, null);
const probeRevision = await db
  .from("legacy_template_asset_revisions")
  .select("bindings")
  .eq("id", probeSet.data.active_revision_id)
  .single();
assert.equal(probeRevision.error, null);
const probe = await db.rpc("apply_legacy_template_asset_revision", {
  p_set_id: probeSet.data.id,
  p_expected_revision_id: probeSet.data.active_revision_id,
  p_bindings: probeRevision.data.bindings,
  p_actor_id: localAdmin.data.id,
  p_note: "Local connection verification",
  p_mode: probeSet.data.mode,
});
assert.equal(probe.error, null);
assert.ok(probe.data);
const all = (await get("/api/admin/legacy-template-assets")).sets;
assert.equal(all.length, 197);
assert.equal(
  all.find((set) => set.id === probeSet.data.id)?.active_revision_id,
  probe.data,
  "App server is not connected to the local DB; refusing API writes",
);
const localRows = await db
  .from("legacy_template_asset_sets")
  .select("id,mode,active_revision_id");
assert.equal(localRows.error, null);
assert.deepEqual(
  all.map((set) => [set.id, set.mode, set.active_revision_id]).sort(),
  localRows.data
    .map((set) => [set.id, set.mode, set.active_revision_id])
    .sort(),
);
const ids = [
  "0c10c964-b83c-4309-a81b-76550aba17b0",
  "28c2b9fb-9d7e-4aaa-822d-96909d384032",
  "8f9bb89d-34f5-45c1-b923-16366197af33",
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
let phase = "configuration";
const captures = [];
let proxyCalls = 0;
let forceProxy = false;
let blockedWrites = 0;
const errors = [];
let page;
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await context.addCookies([
    {
      name: "token",
      value: token,
      url: base.origin,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const guard = async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      forceProxy &&
      request.resourceType() === "fetch" &&
      url.origin === new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).origin
    )
      return route.abort();
    if (url.pathname === "/api/template-studio/assets/image") proxyCalls++;
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const allowed =
        url.origin === base.origin &&
        url.pathname.startsWith("/api/admin/legacy-template-assets/") &&
        request.method() === "POST" &&
        request.postDataJSON()?.action === "mode";
      if (!allowed) {
        blockedWrites++;
        return route.abort();
      }
    }
    await route.continue();
  };
  await context.route("**/*", guard);
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((values) => {
    for (const id of values)
      localStorage.setItem(
        `selectedOptions-${id}`,
        JSON.stringify(["memo", "profile"]),
      );
  }, ids);
  const settle = async () => {
    await page.locator("#timetable").waitFor({ timeout: 180000 });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("#timetable img")].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      undefined,
      { timeout: 90000 },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Match the existing post-font comparison policy without claiming a font fix.
      const parents = [
        ...new Set(
          [...document.querySelectorAll("#timetable p")].map(
            (el) => el.parentElement,
          ),
        ),
      ];
      const widths = parents.map((parent) => parent.style.width);
      const frame = () =>
        new Promise((resolve) => requestAnimationFrame(resolve));
      parents.forEach((parent) => {
        parent.style.width = `${parent.clientWidth + 1}px`;
      });
      await frame();
      await frame();
      parents.forEach((parent, index) => {
        parent.style.width = widths[index];
      });
      await frame();
      await frame();
    });
  };
  const capture = async (name) => {
    await page
      .getByRole("button", { name: "이미지로 저장", exact: true })
      .click();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 180000 }),
      page.getByRole("button", { name: "저장하기", exact: true }).click(),
    ]);
    const file = path.join(output, `${name}.png`);
    await download.saveAs(file);
    return page.evaluate(async (bytes) => {
      const image = new Image();
      image.src = `data:image/png;base64,${bytes}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", pixels),
      );
      return {
        width: canvas.width,
        height: canvas.height,
        hash: Array.from(digest)
          .map((v) => v.toString(16).padStart(2, "0"))
          .join(""),
      };
    }, readFileSync(file).toString("base64"));
  };
  for (const id of ids) {
    const set = all.find(
      (item) => item.templateId === id && item.purpose === "runtime",
    );
    assert.ok(set);
    phase = `local:${id}`;
    await setMode(set, "local");
    await page.goto(new URL(`/time-table/${id}`, base).href, {
      timeout: 180000,
    });
    await settle();
    await page.reload({ timeout: 180000 });
    await settle();
    assert.equal(
      await page
        .locator("#timetable img")
        .evaluateAll((images) =>
          images.some((img) =>
            img.src.includes("legacy-template-assets/production/"),
          ),
        ),
      false,
    );
    const local = await capture(`${id}-local`);
    phase = `admin-r2-toggle:${id}`;
    await page.goto(
      new URL(
        `/admin/legacy-template-assets/timetable/${id}?purpose=runtime`,
        base,
      ).href,
      { timeout: 180000, waitUntil: "domcontentloaded" },
    );
    const checkbox = page.getByRole("checkbox", {
      name: "R2 적용",
      exact: true,
    });
    await checkbox.waitFor({ timeout: 180000 });
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(urlFor(set).split("?")[0]) &&
          response.request().method() === "POST" &&
          response.ok(),
      ),
      checkbox.click(),
    ]);
    await page.waitForFunction(() =>
      [...document.querySelectorAll("label")].some(
        (label) =>
          label.textContent.trim() === "R2 적용" &&
          label.querySelector("input")?.checked,
      ),
    );
    assert.equal((await get(urlFor(set))).set.mode, "r2");
    phase = `r2:${id}`;
    await page.goto(new URL(`/time-table/${id}`, base).href, {
      timeout: 180000,
    });
    await settle();
    const sources = await page
      .locator("#timetable img")
      .evaluateAll((images) => images.map((img) => img.src));
    assert.ok(sources.length > 0);
    assert.ok(
      sources.every((src) =>
        src.includes("legacy-template-assets/production/"),
      ),
      "Template still renders local imported images",
    );
    const remote = await capture(`${id}-r2`);
    assert.deepEqual(remote, local, `Local/R2 PNG pixels differ: ${id}`);
    captures.push({ templateId: id, ...remote });
    if (id === ids[0]) {
      phase = "forced-image-proxy";
      const beforeProxy = proxyCalls;
      forceProxy = true;
      try {
        const fallback = await capture(`${id}-r2-proxy`);
        assert.deepEqual(fallback, local, "Proxy PNG pixels differ from local");
        assert.ok(
          proxyCalls > beforeProxy,
          "Failed direct fetch did not use the image proxy",
        );
      } finally {
        forceProxy = false;
      }
    }
    console.log(
      JSON.stringify({
        stage: "timetable-png",
        templateId: id,
        width: remote.width,
        height: remote.height,
        exactPixelMatch: true,
      }),
    );
    await page.screenshot({ path: path.join(output, `${id}-desktop.png`) });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: path.join(output, `${id}-mobile.png`) });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  phase = "local-activation-all";
  for (const set of all)
    await setMode(set, set.purpose === "site" ? "local" : "r2");
  console.log(
    "Local runtime/cover R2 activated; homepage stays local; remote database unchanged",
  );
  const active = (await get("/api/admin/legacy-template-assets")).sets;
  assert.ok(
    active.every(
      (set) => set.mode === (set.purpose === "site" ? "local" : "r2"),
    ),
  );
  const localAfter = await db
    .from("legacy_template_asset_sets")
    .select("id,mode,active_revision_id");
  assert.equal(localAfter.error, null);
  assert.deepEqual(
    active.map((set) => [set.id, set.mode, set.active_revision_id]).sort(),
    localAfter.data
      .map((set) => [set.id, set.mode, set.active_revision_id])
      .sort(),
  );
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await anonymous.route("**/*", guard);
  const manifestResponse = await anonymous.request.get(
    new URL("/api/project-assets", base).href,
  );
  assert.equal(manifestResponse.status(), 200);
  const manifest = await manifestResponse.json();
  assert.equal(Object.keys(manifest.covers).length, 97);
  assert.equal(manifest.homepage.mode, "local");
  assert.equal(
    Object.values(manifest.homepage.images).flatMap(Object.values).length,
    0,
  );
  phase = "all-runtime-manifests";
  const runtimeSets = active.filter((set) => set.purpose === "runtime");
  assert.equal(runtimeSets.length, 99);
  const assetUrls = new Set(
    Object.values(manifest.covers).map((image) => image.src),
  );
  for (const image of Object.values(manifest.homepage.images).flatMap(
    Object.values,
  ))
    assetUrls.add(image.src);
  for (const set of runtimeSets) {
    const runtime = await get(urlFor(set, false));
    assert.equal(runtime.mode, "r2");
    const images = Object.values(runtime.images).flatMap(Object.values);
    assert.ok(images.length > 0);
    for (const image of images) assetUrls.add(image.src);
  }
  const expectedOrigin = new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).origin;
  assert.ok(
    [...assetUrls].every((src) => new URL(src).origin === expectedOrigin),
  );
  phase = "remote-asset-heads";
  const queue = [...assetUrls];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const src = queue.pop();
        const response = await fetch(src, {
          method: "HEAD",
          signal: AbortSignal.timeout(45000),
        });
        assert.equal(
          response.status,
          200,
          "A registered R2 image is not available",
        );
        assert.match(response.headers.get("content-type") ?? "", /^image\//);
      }
    }),
  );
  assert.equal(
    (
      await anonymous.request.get(
        new URL("/api/admin/legacy-template-assets", base).href,
      )
    ).status(),
    401,
  );
  phase = "anonymous-homepage";
  const home = await anonymous.newPage();
  home.on("pageerror", (error) => errors.push(error.message));
  let homeManifestRequests = 0;
  await home.route("**/api/project-assets", async (route) => {
    homeManifestRequests++;
    await route.fulfill({
      status: 503,
      json: { error: "Manifest unavailable for homepage verification" },
    });
  });
  await home.goto(base.href, { timeout: 180000 });
  await home.waitForFunction(
    () => {
      const images = [...document.images].filter((image) =>
        new URL(image.src).pathname.startsWith("/landing/"),
      );
      return (
        images.length > 0 &&
        images.every((image) => image.complete && image.naturalWidth > 0)
      );
    },
    undefined,
    { timeout: 90000 },
  );
  assert.equal(
    await home
      .locator('img[src*="legacy-template-assets/production/"]')
      .count(),
    0,
  );
  assert.equal(
    await home
      .locator("#timetable img")
      .evaluateAll((images) =>
        images.every((image) => new URL(image.src).origin === location.origin),
      ),
    true,
  );
  await home.screenshot({
    path: path.join(output, "homepage-desktop.png"),
    fullPage: true,
  });
  await home.setViewportSize({ width: 390, height: 844 });
  await home.getByAltText("Sample", { exact: true }).waitFor();
  assert.equal(
    await home.getByAltText("Sample", { exact: true }).getAttribute("src"),
    "/landing/sample.png",
  );
  assert.equal(homeManifestRequests, 0);
  assert.equal(
    await home.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await home.screenshot({
    path: path.join(output, "homepage-mobile.png"),
    fullPage: true,
  });
  await anonymous.close();
  assert.ok(proxyCalls > 0);
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    localDbOnly: true,
    r2Writes: 0,
    activeSets: active.length,
    runtimeSets: runtimeSets.length,
    remoteAssetsChecked: assetUrls.size,
    covers: 97,
    homepageMode: "local",
    homeManifestRequests,
    proxyCalls,
    blockedWrites,
    captures,
  };
  writeFileSync(
    path.join(output, "report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(`Local R2 verification phase: ${phase}`);
  await page
    ?.screenshot({ path: path.join(output, "failure.png"), fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
