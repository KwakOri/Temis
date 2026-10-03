import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { convertLegacyNextImages } from "./lib/legacy-template-image-compat";
import {
  legacyAssetStoragePath,
  mergeLegacyAssetChanges,
  parseLegacyAssetOwner,
  parseLegacyAssetUpload,
  validateLegacyAssetBindings,
} from "../src/utils/legacy-template-assets/contracts";

async function main() {
  const owner = parseLegacyAssetOwner(
    "timetable",
    "00000000-0000-4000-8000-000000000001",
  );
  const hash = "a".repeat(64);
  const upload = {
    assetId: hash,
    contentHash: "b".repeat(64),
    mimeType: "image/png",
    byteSize: 100,
    originalFilename: "oldCamel.PNG",
  };
  assert.equal(
    legacyAssetStoragePath(owner, "local", upload),
    `legacy-template-assets/local/timetable/${owner.templateId}/assets/${hash}/${upload.contentHash}.png`,
  );
  assert.throws(() => legacyAssetStoragePath(owner, "../prod", upload));
  assert.throws(() => parseLegacyAssetOwner("studio", owner.templateId));
  assert.throws(() =>
    parseLegacyAssetUpload({ ...upload, assetId: "../../other" }),
  );
  assert.throws(() =>
    parseLegacyAssetUpload({ ...upload, mimeType: "image/svg+xml" }),
  );
  assert.throws(() =>
    parseLegacyAssetUpload({ ...upload, byteSize: 33 * 1024 * 1024 }),
  );
  const original = {
    first: { profileBG: "v1", onlineCard: "v2" },
    second: { profileBG: "v1" },
  };
  const expected = {
    first: ["profileBG", "onlineCard"],
    second: ["profileBG"],
  };
  const valid = new Set(["v1", "v2", "v3"]);
  const merged = mergeLegacyAssetChanges(
    original,
    expected,
    [{ theme: "first", key: "profileBG", versionId: "v3" }],
    valid,
  );
  assert.equal(original.first.profileBG, "v1");
  assert.equal(merged.first.profileBG, "v3");
  assert.equal(merged.second.profileBG, "v1");
  assert.throws(() =>
    mergeLegacyAssetChanges(
      original,
      expected,
      [{ theme: "first", key: "profile_bg", versionId: "v3" }],
      valid,
    ),
  );
  assert.throws(() =>
    mergeLegacyAssetChanges(
      original,
      expected,
      [{ theme: "first", key: "profileBG", versionId: "foreign-version" }],
      valid,
    ),
  );
  assert.throws(() =>
    mergeLegacyAssetChanges(
      original,
      expected,
      [
        { theme: "first", key: "profileBG", versionId: "v3" },
        { theme: "first", key: "profileBG", versionId: "v2" },
      ],
      valid,
    ),
  );
  assert.throws(() =>
    validateLegacyAssetBindings({ first: original.first }, expected, valid),
  );
  const special = JSON.parse('{"__proto__":{"constructor":"v1"}}');
  const specialExpected = JSON.parse('{"__proto__":["constructor"]}');
  const specialMerged = mergeLegacyAssetChanges(
    special,
    specialExpected,
    [{ theme: "__proto__", key: "constructor", versionId: "v3" }],
    valid,
  );
  assert.equal(
    Object.getOwnPropertyDescriptor(specialMerged, "__proto__")?.value
      .constructor,
    "v3",
  );
  assert.equal(({} as Record<string, string>).polluted, undefined);

  // Validate image bytes without accessing any external service.
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture_only";
  const { verifyLegacyImageBytes } =
    await import("../src/services/server/legacyTemplateAssetUploadService");
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  );
  const fixture = {
    ...upload,
    byteSize: bytes.length,
    contentHash: createHash("sha256").update(bytes).digest("hex"),
  };
  assert.deepEqual(verifyLegacyImageBytes(bytes, fixture), {
    width: 1,
    height: 1,
  });
  assert.throws(() =>
    verifyLegacyImageBytes(bytes, { ...fixture, contentHash: hash }),
  );
  assert.throws(() =>
    verifyLegacyImageBytes(bytes, { ...fixture, mimeType: "image/jpeg" }),
  );
  assert.throws(() =>
    verifyLegacyImageBytes(bytes.subarray(0, 12), { ...fixture, byteSize: 12 }),
  );

  const baseIndex = process.argv.indexOf("--base-ref");
  const baseRef = baseIndex === -1 ? "HEAD" : process.argv[baseIndex + 1];
  assert.ok(baseRef, "Pass a git ref after --base-ref");
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", baseRef, "--", "src/app"],
    { encoding: "utf8" },
  )
    .trim()
    .split("\n")
    .filter((file) => /\/[a-f0-9-]{36}\//.test(file) && file.endsWith(".tsx"));
  let checked = 0;
  for (const file of changed) {
    const before = convertLegacyNextImages(
      execFileSync("git", ["show", `${baseRef}:${file}`], { encoding: "utf8" }),
      file,
    );
    let after = readFileSync(file, "utf8");
    if (!after.includes("useLegacyTemplateImages")) continue;
    checked++;
    after = after
      .replace(
        /import\s*\{\s*useLegacyTemplateImages\s*\}\s*from\s*["']@\/contexts\/LegacyTemplateAssetsContext["'];?/,
        "",
      )
      .replace(/const\s+Imgs\s*=\s*useLegacyTemplateImages\(LocalImgs\);/g, "")
      .replace(/Imgs\s+as\s+LocalImgs/g, "Imgs");
    if (!/^\s*["']use client["'];/.test(before))
      after = after.replace(/^\s*["']use client["'];/, "");
    assert.equal(
      after.replace(/\s/g, ""),
      before.replace(/\s/g, ""),
      `Unexpected legacy layout/key/condition change: ${file}`,
    );
  }
  console.log(
    `Legacy asset checks passed: contracts, shared-slot isolation, malicious inputs, file bytes; ${checked} legacy layouts/keys/conditions compared against ${baseRef}.`,
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
