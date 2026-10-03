import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createLegacyAssetInventory } from "./lib/legacy-template-asset-inventory";
const templateId = "e3053d98-d745-4adf-8b32-ce9210b9ee37";
const template = createLegacyAssetInventory(process.cwd(), {
  ownerKind: "timetable",
  templateId,
}).templates[0];
const setId = "00000000-0000-4000-8000-000000000001";
const revisionId = "00000000-0000-4000-8000-000000000002";
const versions = template.assets.map((asset, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
  asset_set_id: setId,
  asset_id: asset.assetId,
  content_hash: asset.contentHash,
  storage_path: `legacy-template-assets/fixture/${asset.assetId}.png`,
  public_url: `https://legacy-assets.invalid/${asset.assetId}.png`,
  mime_type: asset.mimeType,
  byte_size: asset.byteSize,
  width: asset.width,
  height: asset.height,
  original_filename: asset.originalFilename,
  created_at: "2026-10-04T00:00:00Z",
}));
const bindings = Object.fromEntries(
  Object.entries(template.bindings).map(([theme, slots]) => [
    theme,
    Object.fromEntries(
      Object.entries(slots).map(([key, assetId]) => [
        key,
        versions.find((version) => version.asset_id === assetId)!.id,
      ]),
    ),
  ]),
);
const fixture = {
  owner: { ownerKind: "timetable", templateId },
  detail: {
    set: {
      id: setId,
      ownerKind: "timetable",
      templateId,
      name: "Legacy asset verification",
      mode: "r2",
      expected_slots: Object.fromEntries(
        Object.entries(bindings).map(([theme, slots]) => [
          theme,
          Object.keys(slots),
        ]),
      ),
      active_revision_id: revisionId,
      updated_at: "2026-10-04T00:00:00Z",
    },
    versions,
    revisions: [
      {
        id: revisionId,
        asset_set_id: setId,
        revision_no: 1,
        bindings,
        note: "Initial fixture",
        created_at: "2026-10-04T00:00:00Z",
        created_by: 1,
      },
    ],
  },
  assets: Object.fromEntries(
    template.assets.map((asset) => [
      asset.assetId,
      {
        mimeType: asset.mimeType,
        bytes: readFileSync(path.resolve(asset.file)).toString("base64"),
      },
    ]),
  ),
};
const output = process.argv[2];
if (!output || !path.resolve(output).startsWith("/tmp/"))
  throw new Error("A new /tmp fixture output is required.");
writeFileSync(output, JSON.stringify(fixture), { flag: "wx" });
console.log(
  `Created browser fixture: ${versions.length} actual legacy images, original keys retained.`,
);
