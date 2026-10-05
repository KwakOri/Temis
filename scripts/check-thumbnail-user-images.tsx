import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import {
  applyThumbnailUserImagesPreset,
  expandThumbnailUserImages,
  moveThumbnailAddonImage,
  reorderThumbnailAddonImage,
  dropThumbnailAddonImage,
  upgradeThumbnailUserImages,
  type ThumbnailAddonImage,
} from "../src/utils/thumbnail-studio/user-images";
import { createThumbnailRuntimeImageOverrides } from "../src/utils/thumbnail-studio/runtime-image-transform";
import { StudioExportRoot } from "../src/components/studio/runtime/studio-export-root";
import { ThumbnailRuntimeForm } from "../src/app/(root)/thumbnail/_components/thumbnail-runtime-form";

const document = createThumbnailStudioDocument();
const nodeId = applyThumbnailUserImagesPreset(document);
const node = document.graph.nodes[nodeId];
assert.equal(node.binding?.kind, "inputImage");
if (node.binding?.kind !== "inputImage") throw new Error("missing binding");
const inputId = node.binding.inputId;
const input = document.inputs[inputId];
assert.equal(input.type, "image");
assert.equal(Object.keys(document.graph.nodes).length, 1);
assert.equal(applyThumbnailUserImagesPreset(document, nodeId), nodeId);
assert.equal(
  Object.keys(document.inputs).length,
  1,
  "converting twice reuses the input",
);
assert.equal(
  validateStudioDocument(document).some(
    (diagnostic) => diagnostic.severity === "error",
  ),
  false,
);
const migrated = migrateStudioTemplateDocument(document);
assert.equal(migrated.ok, true);
if (migrated.ok)
  assert.equal(
    (migrated.document.inputs[inputId] as typeof input).type,
    "image",
  );

document.inputs.title = {
  id: "title",
  type: "text",
  scope: "global",
  label: "main_title",
};
document.graph.nodes.frame = {
  id: "frame",
  type: "shape",
  parentId: null,
  childIds: [],
  label: "FRAME",
};
document.graph.rootNodeIds.push("frame");
const values = createStudioInitialRuntimeValues(document);
values.global[inputId] = "https://example.test/background.png";
const images: ThumbnailAddonImage[] = Array.from({ length: 60 }, (_, i) => ({
  id: `addon-${i}`,
  inputId,
  name: `레이어 ${i + 1}`,
  src: `https://example.test/${i}.png`,
  blob: new Blob(),
  intrinsicSize: { width: 120 + i, height: 80 + i },
}));
const original = JSON.stringify(document);
const overrides = createThumbnailRuntimeImageOverrides(document);
const expanded = expandThumbnailUserImages(document, values, images, overrides);
assert.equal(
  JSON.stringify(document),
  original,
  "runtime expansion must never modify the published document",
);
assert.deepEqual(
  expanded.document.graph.rootNodeIds,
  document.graph.rootNodeIds,
);
assert.equal(expanded.document.graph.nodes[nodeId].type, "group");
assert.equal(
  expanded.document.graph.nodes[nodeId].childIds[0],
  `${nodeId}:background`,
);
assert.equal(expanded.document.graph.nodes[nodeId].childIds.length, 61);
assert.equal(expanded.runtimeImageOverrides[inputId].fit, "cover");
assert.equal(expanded.runtimeImageOverrides[images[0].id].fit, undefined);
const markup = renderToStaticMarkup(<StudioExportRoot {...expanded} />);
assert.match(markup, /isolation:isolate/);
assert.match(markup, /overflow:hidden/);
assert.match(markup, /width:120px;height:80px/);
assert.ok(
  markup.indexOf('src="https://example.test/background.png"') <
    markup.indexOf('src="https://example.test/0.png"'),
);
assert.ok(
  markup.indexOf('src="https://example.test/59.png"') <
    markup.indexOf('data-node-id="frame"'),
);
const withoutBackground = expandThumbnailUserImages(document, values, images, {
  ...overrides,
  [inputId]: { removed: true },
});
assert.doesNotMatch(
  renderToStaticMarkup(<StudioExportRoot {...withoutBackground} />),
  /No image|background.png/,
);
const reordered = moveThumbnailAddonImage(images, "addon-0", 1);
assert.equal(reordered[1].id, "addon-0");
assert.equal(
  moveThumbnailAddonImage(images, "addon-0", -1),
  images,
  "addons cannot move below the background",
);
assert.equal(moveThumbnailAddonImage(images, "missing", 1), images);
const dragged = reorderThumbnailAddonImage(images, "addon-0", "addon-4");
assert.deepEqual(
  dragged.slice(0, 5).map((image) => image.id),
  ["addon-1", "addon-2", "addon-3", "addon-4", "addon-0"],
);
assert.equal(dragged[4].name, "레이어 1", "reordering retains layer names");
const otherGroup = { ...images[0], id: "other-group", inputId: "other" };
const interleaved = [images[0], otherGroup, images[1], images[2]];
assert.deepEqual(
  reorderThumbnailAddonImage(interleaved, images[0].id, images[2].id),
  [images[1], otherGroup, images[2], images[0]],
);
assert.equal(
  reorderThumbnailAddonImage(interleaved, images[0].id, otherGroup.id),
  interleaved,
  "cannot drag into another authored group",
);
assert.equal(
  reorderThumbnailAddonImage(images, images[0].id, inputId),
  images,
  "background is never a reorder target",
);
assert.equal(
  reorderThumbnailAddonImage(images, "missing", images[0].id),
  images,
);
const stack = images.slice(0, 3);
const panelOrder = (items: ThumbnailAddonImage[]) =>
  items.map((image) => image.id).reverse();
assert.deepEqual(
  panelOrder(dropThumbnailAddonImage(stack, "addon-2", "addon-1", "after")),
  ["addon-1", "addon-2", "addon-0"],
);
assert.deepEqual(
  panelOrder(dropThumbnailAddonImage(stack, "addon-0", "addon-2", "before")),
  ["addon-0", "addon-2", "addon-1"],
);
assert.deepEqual(
  panelOrder(dropThumbnailAddonImage(stack, "addon-0", "addon-2", "after")),
  ["addon-2", "addon-0", "addon-1"],
);
assert.deepEqual(
  panelOrder(dropThumbnailAddonImage(stack, "addon-1", "addon-0", "after")),
  ["addon-2", "addon-0", "addon-1"],
);
assert.equal(
  dropThumbnailAddonImage(stack, "addon-2", "addon-1", "before"),
  stack,
  "dropping back into the original position is a no-op",
);
assert.equal(
  dropThumbnailAddonImage(interleaved, images[0].id, otherGroup.id, "before"),
  interleaved,
  "drop target must belong to the same authored image group",
);
assert.equal(
  dropThumbnailAddonImage(stack, "addon-0", inputId, "after"),
  stack,
  "the background cannot be a drop target",
);
assert.deepEqual(
  dropThumbnailAddonImage(interleaved, images[0].id, images[2].id, "after"),
  [images[1], otherGroup, images[0], images[2]],
);
assert.deepEqual(
  dropThumbnailAddonImage(interleaved, images[0].id, images[2].id, "before"),
  [images[1], otherGroup, images[2], images[0]],
);
assert.equal(
  expanded.document.graph.nodes[`${nodeId}:addon-0`].label,
  "레이어 1",
);

const form = renderToStaticMarkup(
  <ThumbnailRuntimeForm
    document={document}
    initialRuntimeValues={values}
    runtimeValues={values}
    setRuntimeValues={() => {}}
    runtimeImageOverrides={overrides}
    setRuntimeImageOverrides={() => {}}
    addonImages={images.slice(0, 2)}
    setAddonImages={() => {}}
    activeImage={{ inputId: images[0].id, nodeId: `${nodeId}:${images[0].id}` }}
    onAdjustImage={() => {}}
    templateId="test"
    storageOwnerId="owner"
    templateName="test"
    revisionNo={1}
    exportDisabled={false}
    isExporting={false}
    onExport={() => {}}
    onReset={() => {}}
  />,
);
assert.match(form, /data-thumbnail-user-images=/);
assert.match(form, /aria-label="user_images 이미지 추가"/);
assert.doesNotMatch(form, /애드온 이미지 추가/);
assert.match(form, /aria-label="애드온 이미지 변경 완료"/);
assert.match(form, /aria-label="애드온 이미지 위치 조정"/);
assert.match(form, /aria-label="레이어 1 레이어 순서 변경"/);
assert.match(form, /aria-label="레이어 1 레이어 이름 변경"/);
assert.match(form, /aria-label="레이어 1 레이어 메뉴"/);
assert.doesNotMatch(
  form,
  /애드온 이미지 앞으로|애드온 이미지 뒤로|직접 배치|h-28 w-full/,
);
assert.doesNotMatch(form, /이미지 자르기/);
assert.equal(
  (form.match(/>채우기<\/button>/g) ?? []).length,
  0,
  "background fill is automatic instead of a separate action",
);
assert.match(form, /data-thumbnail-background-row/);
assert.match(form, /aria-label="배경 이미지 위치 조정"/);
assert.match(form, /aria-label="배경 이미지 레이어 메뉴"/);
assert.doesNotMatch(
  form,
  /user_images 이미지 제거|user_images 배치 재설정|>user_images<|>USER_IMAGE</,
);
assert.ok(
  form.indexOf("main_title") < form.indexOf("data-thumbnail-user-images"),
);
assert.ok(
  form.indexOf("data-thumbnail-addon") <
    form.indexOf("data-thumbnail-background"),
);

if (input.type === "image") {
  delete input.preset;
  input.label = "USER_IMAGE";
}
assert.equal(upgradeThumbnailUserImages(document), true);
assert.equal(
  upgradeThumbnailUserImages(document),
  false,
  "legacy upgrade is idempotent",
);
const staticDocument = createThumbnailStudioDocument();
staticDocument.assets.photo = {
  id: "photo",
  src: "https://example.test/static.png",
  label: "photo",
};
staticDocument.graph.nodes.photo = {
  id: "photo",
  type: "image",
  label: "photo",
  parentId: null,
  childIds: [],
  styleId: "photo",
  binding: { kind: "staticAsset", assetId: "photo" },
};
staticDocument.styles.photo = {
  left: 31,
  top: 42,
  width: 160,
  height: 100,
  rotateDeg: -13.5,
};
staticDocument.graph.rootNodeIds = ["photo"];
const staticBefore = JSON.stringify(staticDocument.styles);
assert.equal(applyThumbnailUserImagesPreset(staticDocument, "photo"), "photo");
assert.equal(
  JSON.stringify(staticDocument.styles),
  staticBefore,
  "conversion must preserve authored position, size and rotation",
);
assert.deepEqual(staticDocument.graph.nodes.photo.meta?.bindingFallback, {
  kind: "staticAsset",
  assetId: "photo",
});
const invalidInput =
  staticDocument.inputs[Object.keys(staticDocument.inputs)[0]];
(invalidInput as unknown as { preset: string }).preset = "invalid";
assert.ok(
  validateStudioDocument(staticDocument).some(
    (diagnostic) => diagnostic.id === `input-preset-invalid:${invalidInput.id}`,
  ),
);
console.log(
  "Thumbnail user_images preset checks passed (60 addons, ordering, isolation, original pixel size, migration and form).",
);
