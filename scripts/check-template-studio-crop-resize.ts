import assert from "node:assert/strict";

import {
  fitStudioCropFrame,
  getStudioContainRect,
  resizeStudioCropFrame,
} from "../src/utils/template-studio/crop-resize";
import { getStudioRuntimeProfileImageCropTarget } from "../src/utils/template-studio/runtime-image-crop";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { getStudioTimetableComposition } from "../src/utils/template-studio/timetable-composition";

const fitted = fitStudioCropFrame({ width: 1000, height: 600 }, 16 / 9);
assert.equal(fitted.width, 952);
assert.equal(Number(fitted.height.toFixed(2)), 535.5);

assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 1000, height: 600 },
    "right",
    25,
  ),
  { width: 450, height: 300 },
);
assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 1000, height: 600 },
    "top",
    -200,
  ),
  { width: 400, height: 80 },
);
assert.deepEqual(
  resizeStudioCropFrame(
    { width: 400, height: 300 },
    { width: 500, height: 400 },
    "left",
    200,
  ),
  { width: 452, height: 300 },
);

assert.deepEqual(
  getStudioContainRect(
    { width: 4096, height: 2304 },
    { width: 4637, height: 2304 },
  ),
  {
    left: 270.5,
    top: 0,
    width: 4096,
    height: 2304,
  },
);

const runtimeDocument = createSampleStudioDocument();
const runtimeTimetable = runtimeDocument.domains?.timetable;
assert.ok(runtimeTimetable);
const runtimeComposition = getStudioTimetableComposition(runtimeTimetable);
runtimeComposition.rootObjectIds.push("profile-block");
runtimeComposition.objects["profile-block"] = {
  id: "profile-block",
  kind: "group",
  label: "Profile Block",
  presetId: "profileBlock",
  parentId: null,
  childIds: ["profile-image"],
  style: { left: 100, top: 120, width: 900, height: 1100 },
};
runtimeComposition.objects["profile-image"] = {
  id: "profile-image",
  kind: "image",
  label: "user_image_object",
  parentId: "profile-block",
  profileRole: "userImage",
  style: { left: 40, top: 50, width: 640, height: 800 },
  assetSlots: { asset: { inputId: "profile-image-input", fit: "cover" } },
};
runtimeTimetable.composition = runtimeComposition;

assert.deepEqual(
  getStudioRuntimeProfileImageCropTarget(
    runtimeDocument,
    "profile-image-input",
  ),
  { objectId: "profile-image", width: 640, height: 800 },
);
assert.equal(
  getStudioRuntimeProfileImageCropTarget(runtimeDocument, "other-image-input"),
  null,
  "Only profile image inputs should use the fixed runtime crop modal.",
);

console.log("Template Studio crop resize checks passed.");
