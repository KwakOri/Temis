import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ThumbnailAssetPanel } from "../src/app/(root)/admin/thumbnail-studio/_components/thumbnail-layer-tabs";
import {
  applyThumbnailStudioAddAssets,
  applyThumbnailStudioAddImageNodeForAsset,
  applyThumbnailStudioCropImageAsset,
  applyThumbnailStudioDeleteUnusedAsset,
  applyThumbnailStudioRemoveUnusedAssets,
  applyThumbnailStudioRenameAsset,
  applyThumbnailStudioReplaceImageAsset,
} from "../src/utils/thumbnail-studio/asset-commands";
import { collectThumbnailStudioAssetConsumers } from "../src/utils/thumbnail-studio/asset-consumers";
import {
  createThumbnailStudioLocalAsset,
  getThumbnailStudioAssetStorageStatus,
  THUMBNAIL_STUDIO_ASSET_MAX_BYTES,
  validateThumbnailStudioAssetFile,
} from "../src/utils/thumbnail-studio/asset-policy";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { planStudioNodeInsertion } from "../src/utils/thumbnail-studio/node-defaults";

assert.equal(
  validateThumbnailStudioAssetFile({
    name: "hero.png",
    type: "image/png",
    size: 1024,
  }),
  null,
);
assert.ok(
  validateThumbnailStudioAssetFile({
    name: "hero.svg",
    type: "image/svg+xml",
    size: 1024,
  }),
);
assert.ok(
  validateThumbnailStudioAssetFile({
    name: "huge.webp",
    type: "image/webp",
    size: THUMBNAIL_STUDIO_ASSET_MAX_BYTES + 1,
  }),
);

const usedAssetIds = new Set<string>(["asset_existing"]);
const localAsset = createThumbnailStudioLocalAsset({
  file: { name: "Hero image.png", type: "image/png", size: 2048 },
  src: "data:image/png;base64,aGVybw==",
  dimensions: { width: 1600, height: 900 },
  usedAssetIds,
});
assert.equal(localAsset.label, "Hero image");
assert.equal(localAsset.width, 1600);
assert.equal(localAsset.height, 900);
assert.equal(localAsset.byteSize, 2048);
assert.equal(getThumbnailStudioAssetStorageStatus(localAsset), "local");

const document = createThumbnailStudioDocument();
assert.deepEqual(applyThumbnailStudioAddAssets(document, [localAsset]), [
  localAsset.id,
]);
assert.deepEqual(
  applyThumbnailStudioAddAssets(document, [localAsset]),
  [],
  "Asset IDs cannot overwrite an existing document asset",
);

const plan = planStudioNodeInsertion({
  document,
  type: "image",
  selectedNode: null,
  viewportCenter: { x: 500, y: 300 },
});
const imageNode = applyThumbnailStudioAddImageNodeForAsset({
  draft: document,
  assetId: localAsset.id,
  nodeId: "asset-image-node",
  styleId: "asset-image-style",
  plan,
});
assert.ok(imageNode);
assert.deepEqual(imageNode?.binding, {
  kind: "staticAsset",
  assetId: localAsset.id,
});
assert.ok(document.graph.rootNodeIds.includes("asset-image-node"));

document.graph.nodes["other-image-node"] = {
  id: "other-image-node",
  type: "image",
  label: "Other image",
  parentId: null,
  childIds: [],
  binding: { kind: "staticAsset", assetId: localAsset.id },
};
document.inputs.choice = {
  id: "choice",
  type: "select",
  scope: "global",
  label: "Choice",
  options: [{ value: "hero", label: "Hero" }],
};
document.graph.nodes["select-image-node"] = {
  id: "select-image-node",
  type: "image",
  label: "Select image",
  parentId: null,
  childIds: [],
  binding: {
    kind: "selectAsset",
    inputId: "choice",
    assetByOption: { hero: localAsset.id },
  },
};

const originalAssetSnapshot = structuredClone(document.assets[localAsset.id]);
assert.equal(
  applyThumbnailStudioCropImageAsset(document, {
    nodeId: "asset-image-node",
    sourceAssetId: localAsset.id,
    derivedAssetId: "cropped-asset",
    croppedImageSrc: "data:image/png;base64,Y3JvcHBlZA==",
    width: 400,
    height: 300,
  }),
  true,
);
assert.deepEqual(
  document.assets[localAsset.id],
  originalAssetSnapshot,
  "cropping must not mutate the source asset",
);
assert.deepEqual(document.graph.nodes["asset-image-node"]?.binding, {
  kind: "staticAsset",
  assetId: "cropped-asset",
});
assert.deepEqual(document.graph.nodes["other-image-node"]?.binding, {
  kind: "staticAsset",
  assetId: localAsset.id,
});
assert.deepEqual(
  document.graph.nodes["select-image-node"]?.binding,
  {
    kind: "selectAsset",
    inputId: "choice",
    assetByOption: { hero: localAsset.id },
  },
  "crop must not change select asset mappings",
);
assert.deepEqual(
  document.assets["cropped-asset"],
  {
    id: "cropped-asset",
    label: "Hero image crop",
    src: "data:image/png;base64,Y3JvcHBlZA==",
    width: 400,
    height: 300,
    mimeType: "image/png",
  },
  "crop must create a derived PNG asset",
);

document.styles["asset-image-style"] = {
  ...document.styles["asset-image-style"],
  objectPosition: "25% 75%",
  borderRadius: 18,
};
const originalStyle = structuredClone(document.styles["asset-image-style"]);
document.assets.replacement = {
  id: "replacement",
  label: "Replacement",
  src: "https://example.com/replacement.png",
  storageProvider: "remote",
};
assert.equal(
  applyThumbnailStudioReplaceImageAsset(
    document,
    "asset-image-node",
    "replacement",
  ),
  true,
);
assert.deepEqual(document.styles["asset-image-style"], originalStyle);
assert.equal(document.graph.nodes["asset-image-node"]?.fit, "cover");

document.graph.nodes["asset-image-node"]!.locked = true;
assert.equal(
  applyThumbnailStudioReplaceImageAsset(
    document,
    "asset-image-node",
    localAsset.id,
  ),
  false,
);
document.graph.nodes["asset-image-node"]!.locked = false;

document.graph.nodes["asset-image-node"]!.meta = {
  bindingFallback: { kind: "staticAsset", assetId: localAsset.id },
};
document.graph.nodes["asset-image-node"]!.assetSlots = {
  overlay: { assetId: localAsset.id },
};
document.domains!.thumbnail!.guide = { assetId: localAsset.id };
const consumers = collectThumbnailStudioAssetConsumers(document);
assert.equal(consumers.replacement?.length, 1);
assert.equal(consumers[localAsset.id]?.length, 5);
assert.equal(
  applyThumbnailStudioDeleteUnusedAsset(document, localAsset.id),
  false,
  "A referenced asset cannot be deleted",
);

assert.equal(
  applyThumbnailStudioRenameAsset(document, "replacement", "  Renamed  "),
  true,
);
assert.equal(document.assets.replacement?.label, "Renamed");

document.assets.unused = {
  id: "unused",
  label: "Unused",
  src: "data:image/png;base64,dW51c2Vk",
};
assert.deepEqual(applyThumbnailStudioRemoveUnusedAssets(document), [
  "cropped-asset",
  "unused",
]);
assert.equal(document.assets.unused, undefined);

const markup = renderToStaticMarkup(
  <ThumbnailAssetPanel
    assets={Object.values(document.assets)}
    consumers={collectThumbnailStudioAssetConsumers(document)}
    selectedImageNode={document.graph.nodes["asset-image-node"] ?? null}
    onAddNode={() => {}}
    onDelete={() => {}}
    onImport={() => {}}
    onLocate={() => {}}
    onRemoveUnused={() => {}}
    onRename={() => {}}
    onReplaceSelected={() => {}}
  />,
);
assert.ok(markup.includes('accept="image/png,image/jpeg,image/webp"'));
assert.ok(markup.includes("Import"));
assert.ok(markup.includes("Remove unused"));
assert.ok(markup.includes('data-thumbnail-asset-id="replacement"'));

console.log("Thumbnail Studio asset checks passed.");
