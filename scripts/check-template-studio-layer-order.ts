import assert from "node:assert/strict";

import {
  expandStudioCollapsedLayerId,
  getStudioDataDropPosition,
  getStudioLayerPanelOrder,
  getStudioPaintOrder,
  STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
} from "../src/utils/template-studio/layer-order";
import {
  createStudioProfileBlockPresetObjects,
  createStudioStructuredTextPresetObjects,
  getStudioTimetableObjectRenderableChildIds,
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

// 접힘 목록 규칙. 카드와 시간표 레이어 패널이 같은 함수를 쓴다.
const collapsedIds = ["dayCards", "profile"];
assert.deepEqual(
  expandStudioCollapsedLayerId(collapsedIds, "dayCards"),
  ["profile"],
  "펼친 레이어만 목록에서 빠진다.",
);
assert.equal(
  expandStudioCollapsedLayerId(collapsedIds, "board"),
  collapsedIds,
  "바뀐 것이 없으면 받은 배열을 그대로 돌려준다. 새 배열을 만들면 끌고 있는 동안 트리가 계속 다시 그려진다.",
);
assert.deepEqual(
  collapsedIds,
  ["dayCards", "profile"],
  "접힘 목록을 제자리에서 고치지 않는다.",
);
assert.equal(
  STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
  550,
  "자동 펼침까지 기다리는 시간은 두 편집기가 같아야 한다. 스치기만 해도 펼쳐지면 트리가 출렁여 놓을 자리를 못 찾는다.",
);

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
  const activeStateGroupId = getStudioTimetableObjectRenderableChildIds(
    structured.group,
  )[0];
  const objects = Object.fromEntries(
    [structured.group, ...structured.children].map((object) => [
      object.id,
      object,
    ]),
  );
  const activeStateGroup = objects[activeStateGroupId];
  const [backgroundId, textId] = activeStateGroup.childIds ?? [];

  assert.equal(objects[backgroundId].structuredRole, "background");
  assert.equal(objects[textId].structuredRole, "text");
  assert.deepEqual(
    getStudioPaintOrder(activeStateGroup.childIds ?? []),
    [backgroundId, textId],
    `${presetId} must paint its text above its background.`,
  );
  assert.deepEqual(
    getStudioLayerPanelOrder(activeStateGroup.childIds ?? []),
    [textId, backgroundId],
    `${presetId} must show its text above its background in the layer panel.`,
  );
}

console.log("Template Studio layer order checks passed.");
