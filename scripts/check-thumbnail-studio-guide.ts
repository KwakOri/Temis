import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { applyThumbnailStudioAddAssets } from "../src/utils/thumbnail-studio/asset-commands";
import { collectThumbnailStudioAssetConsumers } from "../src/utils/thumbnail-studio/asset-consumers";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  getThumbnailStudioGuide,
  setThumbnailStudioGuideAsset,
  setThumbnailStudioGuideOpacity,
  setThumbnailStudioGuideVisibility,
} from "../src/utils/thumbnail-studio/guide";
import { applyThumbnailStudioRemoveUnusedAssets } from "../src/utils/thumbnail-studio/asset-commands";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const document = createThumbnailStudioDocument();

assert.deepEqual(getThumbnailStudioGuide(document), {
  assetId: null,
  visible: false,
  opacity: 0.5,
});

const guideAsset = {
  id: "guide-a",
  label: "Guide A",
  src: "data:image/png;base64,guide-a",
  mimeType: "image/png",
};
const replacementAsset = {
  id: "guide-b",
  label: "Guide B",
  src: "data:image/jpeg;base64,guide-b",
  mimeType: "image/jpeg",
};
const unusedAsset = {
  id: "unused",
  label: "Unused",
  src: "data:image/webp;base64,unused",
  mimeType: "image/webp",
};

applyThumbnailStudioAddAssets(document, [
  guideAsset,
  replacementAsset,
  unusedAsset,
]);
setThumbnailStudioGuideAsset(document, guideAsset.id);
assert.deepEqual(getThumbnailStudioGuide(document), {
  assetId: guideAsset.id,
  visible: true,
  opacity: 0.5,
});

setThumbnailStudioGuideVisibility(document, false);
assert.equal(getThumbnailStudioGuide(document).visible, false);
setThumbnailStudioGuideVisibility(document, true);
setThumbnailStudioGuideOpacity(document, 2);
assert.equal(getThumbnailStudioGuide(document).opacity, 1);
setThumbnailStudioGuideOpacity(document, -1);
assert.equal(getThumbnailStudioGuide(document).opacity, 0);
setThumbnailStudioGuideOpacity(document, Number.NaN);
assert.equal(getThumbnailStudioGuide(document).opacity, 0.5);

setThumbnailStudioGuideAsset(document, replacementAsset.id);
assert.equal(getThumbnailStudioGuide(document).assetId, replacementAsset.id);
assert.ok(
  document.assets[guideAsset.id],
  "Replacing a guide keeps the old asset",
);
assert.equal(
  collectThumbnailStudioAssetConsumers(document)[replacementAsset.id]?.[0]?.id,
  "thumbnail-guide",
);
assert.deepEqual(applyThumbnailStudioRemoveUnusedAssets(document), [
  guideAsset.id,
  unusedAsset.id,
]);
assert.ok(document.assets[replacementAsset.id]);

setThumbnailStudioGuideAsset(document, null);
assert.equal(getThumbnailStudioGuide(document).visible, false);
assert.ok(
  document.assets[replacementAsset.id],
  "Removing a guide keeps its asset",
);
assert.deepEqual(applyThumbnailStudioRemoveUnusedAssets(document), [
  replacementAsset.id,
]);

const missingGuideDocument = createThumbnailStudioDocument();
missingGuideDocument.domains!.thumbnail!.guide = {
  assetId: "missing-guide",
  visible: true,
  opacity: 0.5,
};
assert.ok(
  validateStudioDocument(missingGuideDocument).some(
    (diagnostic) =>
      diagnostic.id === "thumbnail-guide-asset-missing:missing-guide",
  ),
);

const invalidGuideDocument = createThumbnailStudioDocument();
invalidGuideDocument.domains!.thumbnail!.guide = {
  visible: "yes" as never,
  opacity: Number.POSITIVE_INFINITY,
};
const invalidGuideDiagnostics = validateStudioDocument(invalidGuideDocument);
assert.ok(
  invalidGuideDiagnostics.some(
    (diagnostic) => diagnostic.id === "thumbnail-guide-visible-invalid",
  ),
);
assert.ok(
  invalidGuideDiagnostics.some(
    (diagnostic) => diagnostic.id === "thumbnail-guide-opacity-invalid",
  ),
);

const legacyGuideDocument = createThumbnailStudioDocument();
legacyGuideDocument.resources = {
  timetableGuide: { assetId: "legacy-guide" },
};
assert.ok(
  validateStudioDocument(legacyGuideDocument).some(
    (diagnostic) =>
      diagnostic.id === "thumbnail-resource-guide-forbidden:timetableGuide",
  ),
);
assert.equal(legacyGuideDocument.domains?.timetable, undefined);

const thumbnailClient = readFileSync(
  "src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx",
  "utf8",
);
const renderer = readFileSync(
  "src/components/studio/canvas/studio-renderer.tsx",
  "utf8",
);
const exportRoot = readFileSync(
  "src/components/studio/runtime/studio-export-root.tsx",
  "utf8",
);
const runtimeShell = readFileSync(
  "src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx",
  "utf8",
);

assert.match(thumbnailClient, /data-thumbnail-guide-overlay="true"/);
assert.match(thumbnailClient, /pointer-events-none absolute inset-0 z-10/);
assert.match(thumbnailClient, /StudioGuideControl/);
assert.match(thumbnailClient, /thumbnailGuideUploadError/);
assert.doesNotMatch(renderer, /thumbnailGuide|StudioGuide/);
assert.doesNotMatch(exportRoot, /thumbnailGuide|StudioGuide/);
assert.doesNotMatch(runtimeShell, /thumbnailGuide|StudioGuide/);

console.log("Thumbnail Studio guide checks passed.");
