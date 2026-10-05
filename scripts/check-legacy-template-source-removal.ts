import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";
import {
  legacyR2ImageSlot,
  requiresLegacyAssetR2,
  resolveLegacyTemplateImages,
} from "../src/utils/legacy-template-assets/source-policy";
import type { LegacyAssetDetail } from "../src/types/legacy-template-assets";
import publicCovers from "../src/utils/legacy-template-assets/public-project-covers.json";

async function main() {
  const root = process.cwd();
  const archive = JSON.parse(
    readFileSync(
      path.join(root, "scripts/data/legacy-template-removed-sources.json"),
      "utf8",
    ),
  ) as Array<{
    ownerKind: "timetable" | "team_timetable" | "thumbnail";
    templateId: string;
    manifestFile: string;
    bindings: Record<string, Record<string, string>>;
    assets: Array<{
      assetId: string;
      file: string;
      width: number;
      height: number;
      contentHash: string;
      byteSize: number;
    }>;
  }>;
  const inventory = createLegacyAssetInventory(root);
  assert.equal(archive.length, 99);
  assert.equal(inventory.templates.length, 99);
  assert.equal(inventory.summary.slots, 999);
  assert.equal(inventory.summary.removedTemplateImageFiles, 927);
  assert.equal(inventory.summary.removedTemplateBytes, 913633541);

  for (const saved of archive) {
    assert.ok(requiresLegacyAssetR2(saved));
    assert.equal(
      requiresLegacyAssetR2({ ...saved, purpose: "cover" }),
      publicCovers.some(
        (cover) =>
          cover.ownerKind === saved.ownerKind &&
          cover.templateId === saved.templateId,
      ),
    );
    const current = inventory.templates.find(
      (item) =>
        item.ownerKind === saved.ownerKind &&
        item.templateId === saved.templateId,
    )!;
    assert.ok(current);
    assert.deepEqual(
      JSON.parse(JSON.stringify(current.bindings)),
      saved.bindings,
      saved.templateId,
    );
    assert.equal(current.assets.length, saved.assets.length);
    for (const asset of saved.assets)
      assert.equal(existsSync(path.join(root, asset.file)), false, asset.file);

    // Reverse only the image declaration conversion and compare the entire source.
    const before = execFileSync(
      "git",
      ["show", `874232d2:${saved.manifestFile}`],
      { encoding: "utf8" },
    );
    let after = readFileSync(path.join(root, saved.manifestFile), "utf8");
    const original = ts.createSourceFile(
      saved.manifestFile,
      before,
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = new Map(
      original.statements
        .filter(ts.isImportDeclaration)
        .flatMap((node) =>
          node.importClause?.name
            ? [[node.importClause.name.text, node.getText(original)] as const]
            : [],
        ),
    );
    const source = ts.createSourceFile(
      saved.manifestFile,
      after,
      ts.ScriptTarget.Latest,
      true,
    );
    const edits: Array<{ start: number; end: number; text: string }> = [];
    for (const node of source.statements) {
      if (ts.isImportDeclaration(node)) {
        assert.doesNotMatch(
          node.moduleSpecifier.getText(source),
          /\.(png|jpe?g|webp|gif|avif|svg)["']$/i,
        );
        if (node.getText(source).includes("source-policy"))
          edits.push({ start: node.getStart(source), end: node.end, text: "" });
      }
      if (
        !ts.isVariableStatement(node) ||
        node.declarationList.declarations.length !== 1
      )
        continue;
      const declaration = node.declarationList.declarations[0];
      const call = declaration.initializer;
      if (
        !call ||
        !ts.isCallExpression(call) ||
        call.expression.getText(source) !== "legacyR2ImageSlot"
      )
        continue;
      assert.ok(ts.isIdentifier(declaration.name));
      assert.ok(ts.isStringLiteral(call.arguments[0]));
      const asset = saved.assets.find(
        (item) => item.assetId === (call.arguments[0] as ts.StringLiteral).text,
      );
      assert.ok(asset);
      assert.equal(Number(call.arguments[1].getText(source)), asset.width);
      assert.equal(Number(call.arguments[2].getText(source)), asset.height);
      const text = imports.get(declaration.name.text);
      assert.ok(text);
      edits.push({ start: node.getStart(source), end: node.end, text });
    }
    for (const edit of edits.sort((a, b) => b.start - a.start))
      after = after.slice(0, edit.start) + edit.text + after.slice(edit.end);
    assert.equal(
      after.replace(/\s/g, ""),
      before.replace(/\s/g, ""),
      saved.manifestFile,
    );
  }

  const slot = legacyR2ImageSlot("a".repeat(64), 100, 50);
  const descriptors = { first: { bg: slot }, second: { bg: slot } };
  assert.throws(() => resolveLegacyTemplateImages(descriptors, null));
  assert.throws(() =>
    resolveLegacyTemplateImages(descriptors, {
      mode: "local",
      revisionId: null,
      images: {},
    }),
  );
  const runtime = {
    mode: "r2" as const,
    revisionId: "fixture",
    images: {
      first: {
        bg: { src: "https://r2.invalid/changed.png", width: 200, height: 80 },
      },
      second: {
        bg: { src: "https://r2.invalid/original.png", width: 100, height: 50 },
      },
    },
  };
  const resolved = resolveLegacyTemplateImages(descriptors, runtime);
  assert.deepEqual(resolved, runtime.images);
  assert.equal(
    descriptors.first.bg.src,
    slot.src,
    "Resolution must not mutate shared descriptors",
  );
  assert.throws(() =>
    resolveLegacyTemplateImages(descriptors, {
      ...runtime,
      images: { first: runtime.images.first },
    }),
  );
  const sample = { first: { bg: { src: "/home.png", width: 10, height: 10 } } };
  assert.equal(
    resolveLegacyTemplateImages(sample, null),
    sample,
    "Homepage local rendering stays available",
  );
  assert.equal(
    requiresLegacyAssetR2({
      ownerKind: "site",
      templateId: "homepage",
      purpose: "site",
    }),
    false,
  );

  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_fixture_only";
  process.env.CLOUDFLARE_R2_PUBLIC_URL = "https://r2.invalid";
  globalThis.fetch = async () => {
    throw new Error(
      "Unexpected network call in source removal regression check",
    );
  };
  const { buildLegacyAssetRuntime, applyLegacyAssetRevision } =
    await import("../src/services/server/legacyTemplateAssetService");
  const detail = {
    set: {
      ...archive[0],
      id: "fixture-set",
      name: "fixture",
      mode: "local",
      expected_slots: { first: ["bg"] },
      active_revision_id: "revision",
      updated_at: "",
    },
    revisions: [
      {
        id: "revision",
        asset_set_id: "fixture-set",
        revision_no: 1,
        bindings: { first: { bg: "version" } },
        note: "",
        created_at: "",
        created_by: null,
      },
    ],
    versions: [
      {
        id: "version",
        asset_set_id: "fixture-set",
        asset_id: "a".repeat(64),
        content_hash: "b".repeat(64),
        storage_path: "legacy-template-assets/fixture.png",
        mime_type: "image/png",
        byte_size: 100,
        width: 10,
        height: 5,
        original_filename: "fixture.png",
        created_at: "",
      },
    ],
  } as LegacyAssetDetail;
  assert.throws(() => buildLegacyAssetRuntime(detail), /로컬 원본/);
  await assert.rejects(
    applyLegacyAssetRevision(
      detail,
      "revision",
      detail.revisions[0].bindings,
      1,
      "fixture",
      "local",
    ),
    /로컬 원본/,
  );
  const active = buildLegacyAssetRuntime({
    ...detail,
    set: { ...detail.set, mode: "r2" },
  });
  assert.equal(
    active.images.first.bg.src,
    "https://r2.invalid/legacy-template-assets/fixture.png",
  );
  assert.equal(
    buildLegacyAssetRuntime(detail, detail.revisions[0].bindings).mode,
    "r2",
    "Explicit admin previews remain available",
  );
  assert.throws(() =>
    buildLegacyAssetRuntime({
      ...detail,
      set: { ...detail.set, mode: "r2", active_revision_id: null },
    }),
  );
  console.log(
    "R2 source removal: 99 manifests, 999 slots, 927 removed files, dimensions, source parity, missing-image errors, local-mode guard and admin preview passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
