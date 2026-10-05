import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const directory = mkdtempSync(path.join(tmpdir(), "legacy-asset-cli-"));
const owner = {
  ownerKind: "timetable",
  templateId: "e3053d98-d745-4adf-8b32-ce9210b9ee37",
};
const run = (args: string[]) =>
  spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/migrate-legacy-template-assets.ts", ...args],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        SUPABASE_URL: "http://127.0.0.1:1",
        SUPABASE_SECRET_KEY: "",
        CLOUDFLARE_R2_ENDPOINT: "http://127.0.0.1:1",
        CLOUDFLARE_R2_ACCESS_KEY_ID: "",
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: "",
      },
    },
  );
const selected = [
  "--owner-kind",
  owner.ownerKind,
  "--template-id",
  owner.templateId,
];
try {
  const catalog = path.join(directory, "catalog.json");
  const selection = path.join(directory, "selection.json");
  const invalid = path.join(directory, "null.json");
  const unknown = path.join(directory, "unknown.json");
  writeFileSync(catalog, JSON.stringify([owner]));
  writeFileSync(selection, JSON.stringify([owner]));
  writeFileSync(invalid, "null");
  writeFileSync(
    unknown,
    JSON.stringify([
      { ...owner, templateId: "00000000-0000-4000-8000-000000000000" },
    ]),
  );
  const dryRun = run([
    ...selected,
    "--catalog",
    catalog,
    "--selection",
    selection,
    "--concurrency",
    "3",
    "--env-dir",
    path.join(directory, "missing-env"),
  ]);
  assert.equal(dryRun.error, undefined);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  const result = JSON.parse(dryRun.stdout);
  assert.equal(result.dryRun, true);
  assert.equal(result.selectedTemplates, 1);
  assert.equal(result.templates[0].slots, 15);
  assert.equal(result.templates[0].templateId, owner.templateId);
  const projectRun = run(["--project-assets", "--all"]);
  assert.equal(projectRun.status, 0, projectRun.stderr);
  const project = JSON.parse(projectRun.stdout);
  assert.equal(project.selectedTemplates, 97);
  assert.equal(project.selectedAssets, 97);
  assert.equal(
    project.templates.filter(
      (item: { purpose: string }) => item.purpose === "cover",
    ).length,
    97,
  );
  assert.equal(
    project.templates.some(
      (item: { purpose: string }) => item.purpose === "site",
    ),
    false,
  );
  const removedCovers = run(["--project-assets", "--all", "--apply"]);
  assert.notEqual(removedCovers.status, 0);
  assert.match(removedCovers.stderr, /로컬 원본이 제거된/);
  assert.equal(removedCovers.stdout, "");
  const failures = [
    ["--concurrency", "0"],
    ["--concurrency", "5"],
    ["--concurrency", "1.5"],
    ["--concurrency"],
    ["--unexpected"],
    ["--project-assets"],
    ["--project-assets", "--all", "--activate"],
    ["--project-assets", "--all", ...selected],
    [...selected, "--catalog", invalid],
    [...selected, "--selection", invalid],
    [...selected, "--selection", unknown],
    ["--template-id", "00000000-0000-4000-8000-000000000000"],
  ];
  for (const args of failures) {
    const failed = run(args);
    assert.equal(failed.error, undefined);
    assert.notEqual(
      failed.status,
      0,
      `Invalid CLI options accepted: ${args.join(" ")}`,
    );
    assert.equal(failed.stdout, "");
  }
  console.log(
    JSON.stringify({
      passed: true,
      dryRun: true,
      invalidOptions: failures.length,
      remoteWrites: false,
    }),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
