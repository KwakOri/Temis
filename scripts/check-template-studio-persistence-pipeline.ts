import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  createStudioPersistenceGate,
  mergeStudioSyncedAssetsIntoLatestDocument,
} from "../src/utils/template-studio/persistence-pipeline";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "../src/utils/template-studio/sample-document";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const testAssetSyncPreservesLatestDocument = () => {
  const baseDocument = createSampleStudioDocument();
  const latestDocument = clone(baseDocument);
  latestDocument.metadata.name = "Edited while asset sync was waiting";

  const asset = Object.values(latestDocument.assets)[0];
  assert.ok(asset, "The sample document should contain an asset fixture.");

  const result = mergeStudioSyncedAssetsIntoLatestDocument({
    latestDocument,
    patches: [
      {
        id: asset.id,
        label: asset.label,
        src: "https://cdn.example.com/profile.png",
        publicUrl: "https://cdn.example.com/profile.png",
        storagePath: "template-studio/profile.png",
        storageProvider: "r2",
        contentHash: "hash-1",
        mimeType: "image/png",
        byteSize: 128,
        uploaded: true,
      },
    ],
  });

  assert.equal(
    result.document.metadata.name,
    "Edited while asset sync was waiting",
    "Asset sync must not restore an older document snapshot.",
  );
  assert.equal(
    result.document.assets[asset.id]?.publicUrl,
    "https://cdn.example.com/profile.png",
  );
  assert.equal(result.changed, true);

  const runtimeValues = createInitialStudioRuntimeValues(result.document);
  assert.ok(runtimeValues, "The merged document remains runtime-compatible.");
};

const testPersistenceGateRejectsOverlappingOperations = async () => {
  const gate = createStudioPersistenceGate();
  let releaseFirst!: () => void;
  let secondOperationRan = false;
  const firstOperation = gate.runExclusive(
    () =>
      new Promise<string>((resolve) => {
        releaseFirst = () => resolve("first");
      }),
  );

  assert.equal(gate.isBusy(), true);

  const secondOperation = await gate.runExclusive(async () => {
    secondOperationRan = true;
    return "second";
  });

  assert.equal(secondOperation, undefined);
  assert.equal(secondOperationRan, false);

  releaseFirst();
  assert.equal(await firstOperation, "first");
  assert.equal(gate.isBusy(), false);
};

const testDraftSaveMigrationUsesRevisionLock = () => {
  const migrationPath = fileURLToPath(
    new URL(
      "../supabase/migrations/20260907010000_atomic_template_studio_draft_saves.sql",
      import.meta.url,
    ),
  );
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /save_template_studio_draft/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /base_revision_no/);
  assert.match(migration, /revision conflict/i);
};

const main = async () => {
  testAssetSyncPreservesLatestDocument();
  await testPersistenceGateRejectsOverlappingOperations();
  testDraftSaveMigrationUsesRevisionLock();
  console.log("Template Studio persistence pipeline checks passed.");
};

void main();
