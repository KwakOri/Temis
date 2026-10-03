import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { loadEnvConfig } from "@next/env";
import { chromium } from "playwright";

let phase = "configuration";
async function main() {
  if (!process.argv.includes("--allow-test-upload"))
    throw new Error("Explicit --allow-test-upload authorization is required.");
  const envDirectory = process.argv[process.argv.indexOf("--env-dir") + 1];
  const fixtureFile = process.argv[process.argv.indexOf("--fixture") + 1];
  if (
    !process.argv.includes("--env-dir") ||
    !process.argv.includes("--fixture")
  )
    throw new Error("Pass --env-dir and --fixture.");
  loadEnvConfig(envDirectory, true, { info: () => {}, error: () => {} });
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture_only";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_fixture_only";
  process.env.LEGACY_TEMPLATE_ASSET_ENV = "verification";
  process.env.NEXT_PUBLIC_LEGACY_TEMPLATE_R2_ENABLED = "true";
  process.env.NEXT_TELEMETRY_DISABLED = "1";
  const r2 = await import("../src/lib/r2");
  const { verifyLegacyImageBytes } =
    await import("../src/services/server/legacyTemplateAssetUploadService");
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const version = fixture.detail.versions.find(
    (v: { id: string }) =>
      v.id === fixture.detail.revisions[0].bindings.first.bg,
  );
  const bytes = Buffer.from(fixture.assets[version.asset_id].bytes, "base64");
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const identity = randomUUID();
  const stagingKey = `legacy-template-asset-uploads/verification/${identity}`;
  const canonicalKey = `legacy-template-assets/verification/${identity}/${contentHash}.png`;
  const cleanup: string[] = [];
  let server: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    phase = "presigned-upload";
    const signed = await r2.createPresignedUploadUrlForKey(
      stagingKey,
      "image/png",
      60,
    );
    cleanup.push(stagingKey);
    const uploaded = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: new Uint8Array(bytes),
    });
    assert.ok(uploaded.ok, `Presigned upload failed (${uploaded.status})`);
    const staged = await r2.downloadFileFromR2(stagingKey, 32 * 1024 * 1024);
    const dimensions = verifyLegacyImageBytes(staged.buffer, {
      assetId: version.asset_id,
      contentHash,
      mimeType: "image/png",
      byteSize: bytes.length,
      originalFilename: "verification.png",
    });
    assert.deepEqual(staged.buffer, bytes);
    cleanup.push(canonicalKey);
    const promoted = await r2.uploadFileToR2Key(
      staged.buffer,
      canonicalKey,
      "image/png",
    );
    assert.deepEqual(
      (await r2.downloadFileFromR2(canonicalKey, 32 * 1024 * 1024)).buffer,
      bytes,
    );
    phase = "server-start";
    server = spawn(
      "npm",
      ["run", "dev:next", "--", "--port", "3108", "--hostname", "127.0.0.1"],
      {
        cwd: process.cwd(),
        env: process.env,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let ready = false;
    const watch = (chunk: Buffer) => {
      if (chunk.toString().includes("Ready in")) ready = true;
    };
    server.stdout?.on("data", watch);
    server.stderr?.on("data", watch);
    for (let attempt = 0; attempt < 90 && !ready; attempt++) {
      if (server.exitCode !== null)
        throw new Error("Verification server could not start.");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.ok(ready, "Verification server startup timed out.");
    phase = "browser-navigation";
    const require = createRequire(`${process.cwd()}/package.json`);
    const helper =
      require("./scripts/lib/legacy-template-assets-browser-fixture.cjs") as {
        install: (
          page: unknown,
          file: string,
        ) => Promise<{
          detail: typeof fixture.detail;
          stats: { proxyFetches: number };
          owner: { templateId: string };
        }>;
      };
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const installed = await helper.install(page, fixtureFile);
    const current = installed.detail.versions.find(
      (v: { id: string }) =>
        v.id === installed.detail.revisions[0].bindings.first.bg,
    );
    current.public_url = promoted.url;
    await page.route("**/api/template-studio/assets/image?*", async (route) => {
      const source = new URL(route.request().url()).searchParams.get("url");
      if (source === promoted.url) await route.continue();
      else await route.fallback();
    });
    await page.goto(
      `http://127.0.0.1:3108/time-table/${installed.owner.templateId}`,
    );
    await page.locator("#timetable").waitFor({ timeout: 120000 });
    phase = "real-image-display";
    await page.waitForFunction(
      (url) =>
        getComputedStyle(
          document.querySelector("#timetable")!,
        ).backgroundImage.includes(url),
      promoted.url,
    );
    const displayed = await page.evaluate(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return image.naturalWidth > 0 && image.naturalHeight > 0;
    }, promoted.url);
    assert.ok(displayed, "Real R2 image could not load in the browser.");
    phase = "browser-put";
    const browserSigned = await r2.createPresignedUploadUrlForKey(
      stagingKey,
      "image/png",
      300,
    );
    const browserPut = await page.evaluate(
      async ({ url, data }) => {
        try {
          const buffer = Uint8Array.from(atob(data), (char) =>
            char.charCodeAt(0),
          );
          return (
            await fetch(url, {
              method: "PUT",
              headers: { "Content-Type": "image/png" },
              body: buffer,
            })
          ).ok;
        } catch {
          return false;
        }
      },
      { url: browserSigned.uploadUrl, data: bytes.toString("base64") },
    );
    mkdirSync("output/playwright", { recursive: true });
    await page.screenshot({
      path: "output/playwright/legacy-real-r2-screen.png",
      fullPage: true,
    });
    phase = "png-export";
    await page
      .getByRole("button", { name: "이미지로 저장", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page.getByRole("button", { name: "저장하기", exact: true }).click();
    const download = await downloadPromise;
    await download.saveAs("output/playwright/legacy-real-r2.png");
    phase = "png-pixels";
    const data = readFileSync("output/playwright/legacy-real-r2.png").toString(
      "base64",
    );
    const result = await page.evaluate(
      async ({ source, captured }) => {
        const images = [];
        for (const png of [source, captured]) {
          const image = new Image();
          image.src = `data:image/png;base64,${png}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(image, 0, 0);
          images.push({
            width: canvas.width,
            height: canvas.height,
            pixel: [...ctx.getImageData(5, 5, 1, 1).data],
          });
        }
        return { source: images[0], captured: images[1] };
      },
      { source: bytes.toString("base64"), captured: data },
    );
    assert.deepEqual(
      result.captured.pixel,
      result.source.pixel,
      "Real R2 root background was lost in PNG.",
    );
    assert.equal(result.captured.width, 1280);
    assert.equal(result.captured.height, 720);
    console.log(
      JSON.stringify({
        passed: true,
        actualR2: true,
        presignedPut: true,
        browserPutCors: browserPut,
        displayed,
        byteVerifiedPromotion: true,
        sourceDimensions: dimensions,
        captured: result.captured,
        remoteDbWrites: false,
      }),
    );
  } finally {
    if (browser) await browser.close();
    if (server) {
      // Next's dev runner has a child process; stop this process group only.
      if (server.pid && server.exitCode === null)
        process.kill(-server.pid, "SIGTERM");
      await new Promise<void>((resolve) => {
        if (server!.exitCode !== null) resolve();
        else server!.once("exit", () => resolve());
      });
    }
    let removed = 0;
    for (const key of cleanup) {
      try {
        await r2.deleteFileFromR2(key);
        removed++;
      } catch {
        console.error(`Could not remove verification object: ${key}`);
      }
    }
    console.log(
      `Removed ${removed}/${cleanup.length} verification-only R2 objects.`,
    );
    assert.equal(
      removed,
      cleanup.length,
      "Verification object cleanup was incomplete.",
    );
  }
}
main().catch((error: unknown) => {
  console.error(
    `R2 verification failed at ${phase} (${error instanceof Error ? error.name : "unknown"}). No remote DB changes were made.`,
  );
  if (phase === "png-pixels" && error instanceof Error)
    console.error(error.message.replace(/https?:\/\/\S+/g, "[redacted-url]"));
  process.exitCode = 1;
});
