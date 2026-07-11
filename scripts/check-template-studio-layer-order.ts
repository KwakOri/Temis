import assert from "node:assert/strict";

import {
  getStudioDataDropPosition,
  getStudioLayerPanelOrder,
  getStudioPaintOrder,
} from "../src/utils/template-studio/layer-order";
import {
  createStudioProfileBlockPresetObjects,
  createStudioStructuredTextPresetObjects,
} from "../src/utils/template-studio/timetable-composition";

const storedChildIds = [
  "profile-block:back-plate-object",
  "profile-block:user-image-object",
  "profile-block:frame-object",
];

assert.deepEqual(
  getStudioPaintOrder(storedChildIds),
  storedChildIds,
  "Canvas paint order must match the stored back-to-front order.",
);
assert.deepEqual(
  getStudioLayerPanelOrder(storedChildIds),
  [...storedChildIds].reverse(),
  "The layer panel must show the front-most object first.",
);
assert.deepEqual(
  storedChildIds,
  [
    "profile-block:back-plate-object",
    "profile-block:user-image-object",
    "profile-block:frame-object",
  ],
  "Order helpers must not mutate stored arrays.",
);

assert.equal(getStudioDataDropPosition("before"), "after");
assert.equal(getStudioDataDropPosition("after"), "before");
assert.equal(getStudioDataDropPosition("inside"), "inside");

const { group } = createStudioProfileBlockPresetObjects(
  { rootObjectIds: [], objects: {} },
  {
    inputId: "profile-image-input",
    backPlateAssetId: "back-plate-asset",
    frameAssetId: "frame-asset",
  },
);

assert.deepEqual(
  getStudioPaintOrder(group.childIds ?? []),
  storedChildIds,
  "Profile preset children must be stored back-to-front.",
);
assert.deepEqual(
  getStudioLayerPanelOrder(group.childIds ?? []),
  [
    "profile-block:frame-object",
    "profile-block:user-image-object",
    "profile-block:back-plate-object",
  ],
  "Profile layers must show frame, user image, then back plate.",
);

for (const presetId of ["artistProfileText", "weeklyMemo"] as const) {
  const structured = createStudioStructuredTextPresetObjects(
    presetId,
    { rootObjectIds: [], objects: {} },
    { inputId: `${presetId}-input` },
  );
  const [backgroundId, textId] = structured.group.childIds ?? [];

  assert.equal(structured.children[0].structuredRole, "background");
  assert.equal(structured.children[1].structuredRole, "text");
  assert.deepEqual(
    getStudioPaintOrder(structured.group.childIds ?? []),
    [backgroundId, textId],
    `${presetId} must paint its text above its background.`,
  );
  assert.deepEqual(
    getStudioLayerPanelOrder(structured.group.childIds ?? []),
    [textId, backgroundId],
    `${presetId} must show its text above its background in the layer panel.`,
  );
}

console.log("Template Studio layer order checks passed.");
