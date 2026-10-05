import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const arg = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
assert.ok(args.includes("--allow-local-read-only"));
const envDir = path.resolve(arg("--env-dir", "."));
const base = new URL(arg("--base-url", "http://localhost:3108"));
const baseline = new URL(arg("--baseline-url", "http://localhost:3000"));
for (const url of [base, baseline])
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "output/playwright/r2-source-removal");
mkdirSync(output, { recursive: true });
nextEnv.loadEnvConfig(envDir, true, { info() {}, error() {} });
const status = spawnSync(
  "supabase",
  ["status", "-o", "env", "--workdir", envDir],
  { encoding: "utf8" },
);
assert.equal(status.status, 0);
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
const admin = await db
  .from("users")
  .select("id")
  .eq("email", "admin@admin.com")
  .eq("role", "admin")
  .single();
assert.equal(admin.error, null);
const token = await new SignJWT({ userId: admin.data.id, role: "admin" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("2h")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const owners = JSON.parse(
  readFileSync(
    path.join(root, "src/utils/legacy-template-assets/r2-only-owners.json"),
    "utf8",
  ),
);
const source = JSON.parse(
  readFileSync(
    path.join(root, "scripts/data/legacy-template-removed-sources.json"),
    "utf8",
  ),
);
// Audit every declared slot through the real local API before opening the editor.
let verifiedSlots = 0;
for (const owner of owners) {
  const response = await fetch(
    new URL(
      `/api/legacy-template-assets/${owner.ownerKind}/${owner.templateId}`,
      base,
    ),
    { headers: { Cookie: `token=${token}` } },
  );
  assert.equal(response.status, 200, `${owner.ownerKind}/${owner.templateId}`);
  const runtime = await response.json();
  assert.equal(runtime.mode, "r2");
  const saved = source.find(
    (row) =>
      row.ownerKind === owner.ownerKind && row.templateId === owner.templateId,
  );
  assert.deepEqual(
    Object.keys(runtime.images).sort(),
    Object.keys(saved.bindings).sort(),
  );
  for (const [theme, slots] of Object.entries(saved.bindings)) {
    assert.deepEqual(
      Object.keys(runtime.images[theme]).sort(),
      Object.keys(slots).sort(),
    );
    for (const key of Object.keys(slots)) {
      const image = runtime.images[theme][key];
      assert.match(image.src, /^https:\/\//);
      assert.ok(image.width > 0 && image.height > 0);
      verifiedSlots++;
    }
  }
}
console.log(
  `Verified ${owners.length} runtime APIs and ${verifiedSlots} slots`,
);

const cases = [
  { route: "time-table", id: "39fc5668-36d2-4031-9ea5-6cae8b5f2cc6" },
  { route: "time-table", id: "0c10c964-b83c-4309-a81b-76550aba17b0" },
  { route: "team-time-table", id: "34d14470-65c6-4e46-a76b-dec8e16c20e9" },
  { route: "thumbnails", id: "3e94a961-d6de-4c59-aa6e-0375c4b75954" },
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
let blockedWrites = 0;
let proxyCalls = 0;
const comparisons = [];
const errors = [];
let phase = "start";
try {
  const run = async (origin, item, label, forceProxy = false) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    await context.addCookies([
      {
        name: "token",
        value: token,
        url: origin.origin,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        blockedWrites++;
        return route.abort();
      }
      if (url.pathname === "/api/template-studio/assets/image") proxyCalls++;
      if (
        forceProxy &&
        request.resourceType() === "fetch" &&
        url.origin === new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL).origin
      )
        return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      errors.push({ phase, message: error.message }),
    );
    phase = `${label}:${item.route}:${item.id}`;
    console.log(`Checking ${phase}`);
    try {
      await page.goto(new URL(`/${item.route}/${item.id}`, origin).href, {
        timeout: 120000,
      });
      await page.locator("#timetable").waitFor({ timeout: 120000 });
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
        const parents = [
          ...new Set(
            [...document.querySelectorAll("#timetable p")].map(
              (element) => element.parentElement,
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
      const layout = await page.locator("#timetable").evaluate((element) => ({
        width: element.style.width,
        height: element.style.height,
        background: element.style.backgroundImage,
        images: [...element.querySelectorAll("img")].map((image) => ({
          src: image.src,
          width: image.naturalWidth,
          height: image.naturalHeight,
        })),
      }));
      assert.ok(
        JSON.stringify(layout).includes("legacy-template-assets/production/"),
      );
      assert.ok(!JSON.stringify(layout).includes("r2-slot:"));
      await page.screenshot({
        path: path.join(output, `${item.id}-${label}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "이미지로 저장", exact: true })
        .click();
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 120000 }),
        page.getByRole("button", { name: "저장하기", exact: true }).click(),
      ]);
      const file = path.join(output, `${item.id}-${label}-download.png`);
      await download.saveAs(file);
      const pixels = await page.evaluate(async (bytes) => {
        const image = new Image();
        image.src = `data:image/png;base64,${bytes}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const digest = new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            ctx.getImageData(0, 0, canvas.width, canvas.height).data,
          ),
        );
        return {
          width: canvas.width,
          height: canvas.height,
          hash: [...digest]
            .map((value) => value.toString(16).padStart(2, "0"))
            .join(""),
        };
      }, readFileSync(file).toString("base64"));
      assert.ok(pixels.width > 0 && pixels.height > 0);
      return { layout, pixels };
    } catch (error) {
      await page.screenshot({
        path: path.join(output, "failure.png"),
        fullPage: true,
      });
      throw error;
    } finally {
      await context.close();
    }
  };
  for (const item of cases) {
    const before = await run(baseline, item, "before");
    const after = await run(base, item, "after", true);
    assert.deepEqual(after.layout, before.layout, `Layout changed: ${item.id}`);
    assert.deepEqual(
      after.pixels,
      before.pixels,
      `PNG pixels changed: ${item.id}`,
    );
    comparisons.push({ ...item, png: after.pixels });
  }
  assert.ok(proxyCalls > 0, "PNG proxy fallback was not exercised");
  assert.equal(errors.length, 0, "Editor runtime errors");
  writeFileSync(
    path.join(output, "result.json"),
    JSON.stringify(
      {
        runtimeApis: owners.length,
        verifiedSlots,
        comparisons,
        blockedWrites,
        proxyCalls,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `R2-only editor comparisons passed: ${comparisons.length} pages, exact PNG pixels; ${proxyCalls} proxy reads; no DB writes.`,
  );
} catch (error) {
  writeFileSync(
    path.join(output, "failure.json"),
    JSON.stringify(
      { phase, message: error.message, blockedWrites, proxyCalls, errors },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await browser.close();
}
