import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import {
  getStudioObjectRenderStyle,
  isStudioPlacedTimetableCompositionObject,
  resolveStudioGraphNodeGeometry,
  resolveStudioTimetableObjectGeometry,
} from "../src/utils/template-studio/object-layout";
import {
  createStudioStructuredTextPresetObjects,
  createStudioTimetablePresetObject,
  getStudioTimetableComposition,
} from "../src/utils/template-studio/timetable-composition";
import {
  getStudioPresetCreationRule,
  getStudioPresetGroups,
  STUDIO_PRESET_DEFINITIONS,
} from "../src/utils/template-studio/preset-registry";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  getStudioCardsGuide,
  getStudioTimetableGuide,
  setStudioCardsGuideAsset,
  setStudioCardsGuideOpacity,
  setStudioCardsGuideVisibility,
  setStudioTimetableGuideAsset,
  setStudioTimetableGuideOpacity,
  setStudioTimetableGuideVisibility,
} from "../src/utils/template-studio/timetable-guide";

const document = {
  canvas: { width: 1200, height: 800, background: "#fff" },
  graph: {
    rootNodeIds: ["root"],
    nodes: {
      root: {
        id: "root",
        type: "group",
        label: "Root",
        parentId: null,
        childIds: ["child"],
        styleId: "root-style",
        layoutMode: "fillParent",
      },
      child: {
        id: "child",
        type: "image",
        label: "Child",
        parentId: "root",
        childIds: [],
        styleId: "child-style",
        layoutMode: "fillParent",
      },
    },
  },
  styles: {
    "root-style": { left: 100, top: 100, width: 300, height: 200 },
    "child-style": { left: 20, top: 30, width: 80, height: 90 },
  },
  inputs: {},
  assets: {},
} as unknown as StudioTemplateDocument;

assert.deepEqual(resolveStudioGraphNodeGeometry(document, "root"), {
  left: 0,
  top: 0,
  width: 1200,
  height: 800,
});
assert.deepEqual(resolveStudioGraphNodeGeometry(document, "child"), {
  left: 0,
  top: 0,
  width: 1200,
  height: 800,
});
assert.deepEqual(
  getStudioObjectRenderStyle(document.styles["child-style"], "fillParent"),
  {
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
  },
);

const composition: StudioTimetableComposition = {
  rootObjectIds: ["group"],
  objects: {
    group: {
      id: "group",
      kind: "group",
      label: "Group",
      parentId: null,
      childIds: ["image"],
      layoutMode: "fixed",
      style: { left: 50, top: 60, width: 420, height: 360 },
    },
    image: {
      id: "image",
      kind: "image",
      label: "Image",
      parentId: "group",
      layoutMode: "fillParent",
      style: { left: 10, top: 20, width: 100, height: 100 },
    },
  },
};

assert.deepEqual(
  resolveStudioTimetableObjectGeometry(composition, "image", {
    width: 4000,
    height: 2250,
  }),
  { left: 0, top: 0, width: 420, height: 360 },
);

composition.objects.group.layoutMode = "fillParent";
assert.deepEqual(
  resolveStudioTimetableObjectGeometry(composition, "image", {
    width: 4000,
    height: 2250,
  }),
  { left: 0, top: 0, width: 4000, height: 2250 },
);

const board = createStudioTimetablePresetObject("board", composition, {
  assetId: "board-asset",
});
composition.objects[board.id] = board;

assert.equal(board.kind, "image");
assert.equal(board.layoutMode, "fillParent");
assert.equal(board.assetSlots?.asset?.assetId, "board-asset");
assert.equal(board.assetSlots?.asset?.inputId, undefined);
assert.equal(board.assetSlots?.asset?.fit, "cover");
assert.equal(board.meta?.exception?.semanticKey, "board");
assert.deepEqual(
  resolveStudioTimetableObjectGeometry(composition, board.id, {
    width: 4096,
    height: 2304,
  }),
  { left: 0, top: 0, width: 4096, height: 2304 },
  "Board must fill the current timetable canvas without a runtime input.",
);

const graphRootNodeIdsBeforeGuide = [...document.graph.rootNodeIds];
const timetableRootObjectIdsBeforeGuide = [...composition.rootObjectIds];

assert.deepEqual(getStudioTimetableGuide(document), {
  assetId: null,
  visible: false,
  opacity: 0.5,
});
assert.deepEqual(getStudioCardsGuide(document), {
  assetId: null,
  visible: false,
  opacity: 0.5,
});

setStudioCardsGuideAsset(document, "cards-guide-asset");
setStudioCardsGuideOpacity(document, 0.35);
setStudioCardsGuideVisibility(document, false);
assert.deepEqual(getStudioCardsGuide(document), {
  assetId: "cards-guide-asset",
  visible: false,
  opacity: 0.35,
});
assert.deepEqual(getStudioTimetableGuide(document), {
  assetId: null,
  visible: false,
  opacity: 0.5,
});

setStudioTimetableGuideAsset(document, "guide-asset");
assert.deepEqual(getStudioTimetableGuide(document), {
  assetId: "guide-asset",
  visible: true,
  opacity: 0.5,
});

setStudioTimetableGuideOpacity(document, 1.5);
assert.equal(getStudioTimetableGuide(document).opacity, 1);
setStudioTimetableGuideOpacity(document, -0.5);
assert.equal(getStudioTimetableGuide(document).opacity, 0);

setStudioTimetableGuideVisibility(document, false);
assert.equal(getStudioTimetableGuide(document).visible, false);
assert.deepEqual(getStudioCardsGuide(document), {
  assetId: "cards-guide-asset",
  visible: false,
  opacity: 0.35,
});
assert.deepEqual(document.graph.rootNodeIds, graphRootNodeIdsBeforeGuide);
assert.deepEqual(composition.rootObjectIds, timetableRootObjectIdsBeforeGuide);

const repeatableDocument = createSampleStudioDocument();
const repeatableTimetable = repeatableDocument.domains?.timetable;
assert.ok(repeatableTimetable);
const repeatableComposition =
  getStudioTimetableComposition(repeatableTimetable);
const weekDatesPreset = STUDIO_PRESET_DEFINITIONS.find(
  (preset) => preset.id === "weekDates",
);
assert.ok(weekDatesPreset);
assert.equal(weekDatesPreset.singleton, false);
assert.equal(getStudioPresetCreationRule(weekDatesPreset).mode, "repeatable");

const weekDatesObjects = Array.from({ length: 4 }, () => {
  const object = createStudioTimetablePresetObject(
    "weekDates",
    repeatableComposition,
  );
  repeatableComposition.objects[object.id] = object;
  repeatableComposition.rootObjectIds.push(object.id);
  return object;
});
repeatableTimetable.composition = repeatableComposition;

assert.deepEqual(
  weekDatesObjects.map((object) => object.id),
  ["week-dates", "week-dates-2", "week-dates-3", "week-dates-4"],
);
assert.deepEqual(
  weekDatesObjects.map((object) => object.label),
  ["Week Dates", "Week Dates 2", "Week Dates 3", "Week Dates 4"],
);
assert.ok(
  weekDatesObjects.every(
    (object) => object.meta?.exception?.singleton === false,
  ),
);

const weekDatesPresetItem = getStudioPresetGroups(
  repeatableDocument,
  "timetable",
)
  .flatMap((group) => group.presets)
  .find((item) => item.definition.id === "weekDates");
assert.ok(weekDatesPresetItem);
assert.equal(
  weekDatesPresetItem.existingTargetId,
  null,
  "Repeatable Week Dates must keep the preset add action available.",
);

weekDatesObjects[0].meta!.exception!.singleton = true;
const normalizedRepeatableComposition =
  getStudioTimetableComposition(repeatableTimetable);
assert.equal(
  normalizedRepeatableComposition.objects[weekDatesObjects[0].id].meta
    ?.exception?.singleton,
  false,
  "Legacy Week Dates metadata must normalize to repeatable.",
);

// --- 배치 가능 오브젝트 판정 ---

const asCompositionObject = (
  kind: StudioTimetableCompositionObject["kind"],
): StudioTimetableCompositionObject => ({
  id: `probe-${kind}`,
  kind,
  label: kind,
  style: {},
});

(
  [
    "group",
    "image",
    "text",
    "flexibleText",
    "profileBlock",
    "topObject",
  ] as const
).forEach((kind) => {
  assert.equal(
    isStudioPlacedTimetableCompositionObject(asCompositionObject(kind)),
    true,
    `${kind} must expose canvas placement controls.`,
  );
});

assert.equal(
  isStudioPlacedTimetableCompositionObject(
    asCompositionObject("generatedDayCards"),
  ),
  false,
  "Generated day cards use the day-cards layout path, not direct placement.",
);
assert.equal(isStudioPlacedTimetableCompositionObject(undefined), false);

// 실제 Artist 프리셋의 Auto Text 자식도 배치 가능해야 한다.
const artistPresetObjects = createStudioStructuredTextPresetObjects(
  "artistProfileText",
  { rootObjectIds: [], objects: {} },
);
const artistTextChildren = artistPresetObjects.children.filter(
  (object) => object.structuredRole === "text",
);
assert.ok(artistTextChildren.length > 0);
artistTextChildren.forEach((object) => {
  assert.equal(object.kind, "flexibleText");
  assert.equal(
    isStudioPlacedTimetableCompositionObject(object),
    true,
    "Artist Auto Text must keep Position, Rotate, and Fit Parent controls.",
  );
});

console.log("Template Studio object layout checks passed.");
