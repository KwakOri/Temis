import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioExportRoot } from "../src/components/studio/runtime/studio-export-root";
import { ThumbnailRuntimeForm } from "../src/app/(root)/thumbnail/_components/thumbnail-runtime-form";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { createThumbnailStudioPreviewValues } from "../src/utils/thumbnail-studio/input-preview";
import {
  fromRuntimeImageTransform,
  getRuntimeImageFitGeometry,
  getThumbnailRuntimeImageNodes,
  toRuntimeImageTransform,
} from "../src/utils/thumbnail-studio/runtime-image-transform";
import {
  anchorStudioRotatedResize,
  resolveStudioResizeGeometry,
  rotateStudioDelta,
} from "../src/utils/template-studio/transform-commands";

const slot = { width: 400, height: 200 };
assert.deepEqual(
  getRuntimeImageFitGeometry({
    ...slot,
    naturalWidth: 100,
    naturalHeight: 100,
    fit: "cover",
  }),
  {
    left: 0,
    top: -100,
    width: 400,
    height: 400,
  },
);
assert.deepEqual(
  getRuntimeImageFitGeometry({
    ...slot,
    naturalWidth: 100,
    naturalHeight: 100,
    fit: "contain",
    objectPosition: "25% 75%",
  }),
  {
    left: 50,
    top: 0,
    width: 200,
    height: 200,
  },
);
assert.deepEqual(
  getRuntimeImageFitGeometry({
    ...slot,
    naturalWidth: 100,
    naturalHeight: 100,
    fit: "fill",
  }),
  {
    left: 0,
    top: 0,
    width: 400,
    height: 200,
  },
);
const geometry = { left: -80, top: 25, width: 600, height: 300 };
const transform = toRuntimeImageTransform(geometry, slot, 35);
assert.deepEqual(fromRuntimeImageTransform(transform, slot), geometry);
assert.deepEqual(
  fromRuntimeImageTransform(transform, { width: 800, height: 400 }),
  {
    left: -160,
    top: 50,
    width: 1200,
    height: 600,
  },
  "normalized transforms must follow a resized template slot",
);

// Resizing a rotated rectangle must keep the opposite corner stationary.
const start = { left: 30, top: 40, width: 120, height: 80 };
const corner = (rect: typeof start, x: number, y: number, angle: number) => {
  const delta = rotateStudioDelta({
    deltaX: (x - 0.5) * rect.width,
    deltaY: (y - 0.5) * rect.height,
    rotateDeg: -angle,
  });
  return {
    x: rect.left + rect.width / 2 + delta.deltaX,
    y: rect.top + rect.height / 2 + delta.deltaY,
  };
};
for (const angle of [0, 35, -90, 165]) {
  const resized = anchorStudioRotatedResize(
    start,
    resolveStudioResizeGeometry({
      start,
      handle: "se",
      deltaX: 50,
      lockAspectRatio: true,
    }),
    angle,
  );
  const before = corner(start, 0, 0, angle);
  const after = corner(resized, 0, 0, angle);
  assert.ok(
    Math.abs(before.x - after.x) < 1e-8 && Math.abs(before.y - after.y) < 1e-8,
  );
  assert.ok(Math.abs(resized.width / resized.height - 1.5) < 1e-8);
}

const document = createThumbnailStudioDocument();
for (const id of ["photo1", "photo2", "photo3"]) {
  document.inputs[id] = {
    id,
    type: "image",
    scope: "global",
    label: id,
    defaultUrl: "data:image/png;base64,photo",
  };
  document.graph.nodes[id] = {
    id,
    label: id,
    type: "image",
    parentId: null,
    childIds: [],
    styleId: id,
    binding: { kind: "inputImage", inputId: id },
  };
  document.styles[id] = {
    left: 0,
    top: 0,
    width: 400,
    height: 200,
    borderRadius: 16,
  };
  document.graph.rootNodeIds.push(id);
}
document.graph.nodes.copy = {
  ...document.graph.nodes.photo1,
  id: "copy",
  label: "Copy",
};
document.graph.rootNodeIds.push("copy");
document.graph.nodes.hidden = {
  ...document.graph.nodes.photo1,
  id: "hidden",
  hidden: true,
};
document.graph.rootNodeIds.push("hidden");
document.graph.nodes.group = {
  id: "group",
  type: "group",
  label: "Hidden group",
  parentId: null,
  childIds: ["hiddenChild"],
  hidden: true,
};
document.graph.nodes.hiddenChild = {
  ...document.graph.nodes.photo1,
  id: "hiddenChild",
  parentId: "group",
};
document.graph.rootNodeIds.push("group");
document.graph.nodes.orphan = { ...document.graph.nodes.photo1, id: "orphan" };
assert.deepEqual(
  getThumbnailRuntimeImageNodes(document, "photo1").map((node) => node.id),
  ["photo1", "copy"],
);

const original = JSON.stringify(document);
const runtimeValues = createThumbnailStudioPreviewValues(document);
const overrides = { photo1: { transforms: { photo1: transform } } };
const markup = renderToStaticMarkup(
  <StudioExportRoot
    document={document}
    runtimeValues={runtimeValues}
    runtimeImageOverrides={overrides}
  />,
);
assert.match(
  markup,
  /left:-20%;top:12.5%;width:150%;height:150%[^\"]*rotate\(35deg\)/,
);
assert.equal(
  (markup.match(/rotate\(35deg\)/g) ?? []).length,
  1,
  "the same input's other consumers and other images must remain unchanged",
);
assert.match(markup, /overflow-hidden[^>]*border-radius:16px/);
assert.doesNotMatch(
  markup,
  /data-studio-selection-overlay|data-studio-resize-handle/,
);
assert.equal(
  JSON.stringify(document),
  original,
  "runtime transformations must not mutate the source template",
);

const formProps = {
  document,
  initialRuntimeValues: runtimeValues,
  runtimeValues,
  runtimeImageOverrides: overrides,
  setRuntimeImageOverrides: () => {},
  setRuntimeValues: () => {},
  templateId: "fixture",
  storageOwnerId: "fixture",
  templateName: "Fixture",
  revisionNo: 1,
  exportDisabled: false,
  isExporting: false,
  onExport: () => {},
  onReset: () => {},
  onAdjustImage: () => {},
  onResetImageAdjustment: () => {},
};
const form = renderToStaticMarkup(
  <ThumbnailRuntimeForm
    {...formProps}
    activeImage={{ inputId: "photo1", nodeId: "copy" }}
  />,
);
assert.match(form, /photo1 조정 완료/);
assert.match(form, /photo2 위치·크기·회전 조정/);
assert.match(form, /photo3 위치·크기·회전 조정/);
assert.match(form, /<option value="copy" selected="">Copy<\/option>/);
assert.doesNotMatch(form, / x 초점| y 초점/);
document.inputs.photo3 = {
  ...document.inputs.photo3,
  type: "image",
  policy: {
    allowReplace: true,
    allowFitChange: false,
    allowFocusChange: false,
    allowCrop: false,
  },
};
const restrictedForm = renderToStaticMarkup(
  <ThumbnailRuntimeForm {...formProps} />,
);
assert.doesNotMatch(restrictedForm, /photo3 위치·크기·회전 조정/);

console.log("Thumbnail runtime image transform checks passed.");
