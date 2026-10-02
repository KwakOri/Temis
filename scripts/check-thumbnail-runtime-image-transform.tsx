import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioExportRoot } from "../src/components/studio/runtime/studio-export-root";
import { ThumbnailRuntimeForm } from "../src/app/(root)/thumbnail/_components/thumbnail-runtime-form";
import { StudioRuntimeImageCropModal } from "../src/app/(root)/template-studio/_components/runtime/ui/studio-runtime-image-crop-modal";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { createThumbnailStudioPreviewValues } from "../src/utils/thumbnail-studio/input-preview";
import { setStudioRuntimeInputValue } from "../src/utils/template-studio/input-values";
import {
  createThumbnailRuntimeImageOverrides,
  getThumbnailRuntimeImagePlacementMode,
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
for (const intrinsicSize of [
  { width: 120, height: 80 },
  { width: 1200, height: 800 },
]) {
  assert.deepEqual(
    getRuntimeImageFitGeometry({
      ...slot,
      naturalWidth: intrinsicSize.width,
      naturalHeight: intrinsicSize.height,
      fit: "cover",
      intrinsicSize,
    }),
    {
      left: (slot.width - intrinsicSize.width) / 2,
      top: (slot.height - intrinsicSize.height) / 2,
      ...intrinsicSize,
    },
    "uploaded image must keep its original pixels, whether smaller or larger than the slot",
  );
}
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
const defaultOverrides = createThumbnailRuntimeImageOverrides(document);
assert.equal(defaultOverrides.photo1.fit, "cover");
assert.equal(
  getThumbnailRuntimeImagePlacementMode(defaultOverrides.photo1),
  "cover",
);
assert.equal(getThumbnailRuntimeImagePlacementMode(), "cover");
assert.equal(
  getThumbnailRuntimeImagePlacementMode({ placementMode: "manual" }),
  "manual",
);
const runtimeValues = createThumbnailStudioPreviewValues(document);
const intrinsicMarkup = renderToStaticMarkup(
  <StudioExportRoot
    document={document}
    runtimeValues={runtimeValues}
    runtimeImageOverrides={{
      photo1: { intrinsicSize: { width: 120, height: 80 } },
    }}
  />,
);
assert.match(
  intrinsicMarkup,
  /left:50%;top:50%;width:120px;height:80px[^\"]*translate\(-50%, -50%\)/,
);
const fittedMarkup = renderToStaticMarkup(
  <StudioExportRoot
    document={document}
    runtimeValues={runtimeValues}
    runtimeImageOverrides={{
      photo1: {
        intrinsicSize: { width: 120, height: 80 },
        fit: "cover",
        objectPosition: "50% 50%",
      },
    }}
  />,
);
assert.match(fittedMarkup, /object-fit:cover;object-position:50% 50%/);
assert.doesNotMatch(fittedMarkup, /width:120px;height:80px/);
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
assert.match(form, /aria-label="photo1 직접 배치" aria-pressed="true"/);
assert.match(form, /aria-label="photo2 채우기" aria-pressed="true"/);
assert.match(form, /aria-label="photo3 채우기" aria-pressed="true"/);
assert.equal(
  (form.match(/aria-pressed="true"/g) ?? []).length,
  3,
  "Each image must have exactly one selected placement mode.",
);
assert.match(form, /<option value="copy" selected="">Copy<\/option>/);
assert.doesNotMatch(form, / x 초점| y 초점/);
assert.doesNotMatch(form, /이미지 자르기/);
assert.match(form, /photo1 배치 재설정/);
assert.doesNotMatch(form, /맞춰 넣기|늘이기/);
assert.doesNotMatch(form, /기본값 복원|사각형 손잡이로/);
assert.match(form, /photo1 이미지 선택/);
assert.match(form, /photo1 이미지 제거/);
assert.doesNotMatch(form, />(EDIT|CROP|FIT)<\/button>/);
document.inputs.photo3 = {
  ...document.inputs.photo3,
  type: "image",
  policy: {
    allowReplace: false,
    allowFitChange: false,
    allowFocusChange: false,
    allowCrop: false,
  },
};
const restrictedForm = renderToStaticMarkup(
  <ThumbnailRuntimeForm {...formProps} />,
);
assert.match(restrictedForm, /aria-label="photo3 직접 배치"[^>]*disabled=""/);
assert.match(restrictedForm, /aria-label="photo3 채우기"[^>]*disabled=""/);
assert.doesNotMatch(restrictedForm, /이미지 자르기/);
assert.match(restrictedForm, /aria-label="photo3 이미지 선택"[^>]*disabled=""/);
assert.doesNotMatch(restrictedForm, /photo3 이미지 제거/);
assert.equal(
  createThumbnailRuntimeImageOverrides(document).photo3,
  undefined,
  "Locked inputs must retain their authored placement.",
);

const emptyValues = setStudioRuntimeInputValue(
  document,
  runtimeValues,
  "photo1",
  "",
);
const emptyForm = renderToStaticMarkup(
  <ThumbnailRuntimeForm {...formProps} runtimeValues={emptyValues} />,
);
assert.doesNotMatch(emptyForm, /photo1 이미지 제거/);
assert.match(emptyForm, /photo2 이미지 제거/);
assert.doesNotMatch(
  emptyForm,
  /photo1 배치 방식|photo1 채우기|photo1 직접 배치|photo1 이미지 자르기|photo1 배치 재설정/,
);

const cropProps = {
  imageSrc: "data:image/png;base64,photo",
  locale: "ko" as const,
  targetWidth: 808,
  targetHeight: 508,
  onCancel: () => {},
  onApply: () => {},
};
const fixedCrop = renderToStaticMarkup(
  <StudioRuntimeImageCropModal {...cropProps} />,
);
assert.match(
  fixedCrop,
  /크롭 비율과 출력 크기는 에디터의 프로필 영역으로 고정됩니다/,
);
assert.doesNotMatch(fixedCrop, /자유 비율/);
const freeCrop = renderToStaticMarkup(
  <StudioRuntimeImageCropModal {...cropProps} allowFreeCrop />,
);
assert.match(freeCrop, /자유 비율/);
assert.match(freeCrop, /저장 크기/);
assert.doesNotMatch(freeCrop, /프로필 영역 비율|고정됩니다/);

console.log("Thumbnail runtime image transform checks passed.");
