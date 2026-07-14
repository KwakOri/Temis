import assert from "node:assert/strict";

import {
  getStudioTimetableDayCardGeometries,
  getStudioTimetableEntryCardSize,
  getStudioTimetableThreeByThreeEmptySlotIndexes,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  applyStudioTimetableComponentFrames,
  getStudioTimetableComponentFrame,
} from "../src/utils/template-studio/entry-groups";

const document = createSampleStudioDocument();
const timetable = document.domains?.timetable;
assert.ok(timetable);
const component = timetable.components[timetable.entryComponentId];
assert.ok(component);
const frame = getStudioTimetableComponentFrame(document, component);
const entryCardSize = getStudioTimetableEntryCardSize(document, component);

assert.deepEqual(entryCardSize, { width: frame.width, height: frame.height });
assert.deepEqual(frame, {
  left: 160,
  top: 120,
  width: 780,
  height: 500,
});

const days = timetable.dayIds.slice(0, 2).map((dayId) => timetable.days[dayId]);
const layout = timetable.dayCardsLayout!;
const singleEntryGeometries = getStudioTimetableDayCardGeometries(
  layout,
  days,
  () => 1,
  entryCardSize,
);
const multiEntryGeometries = getStudioTimetableDayCardGeometries(
  layout,
  days,
  (dayId) => (dayId === days[0].id ? 2 : 1),
  entryCardSize,
);

assert.deepEqual(
  multiEntryGeometries,
  singleEntryGeometries,
  "Entry count must not change the shared frame or neighboring day positions.",
);
assert.equal(
  singleEntryGeometries[days[0].id].height,
  frame.height,
  "Day geometry must use the component frame height.",
);

const mixedDays = timetable.dayIds
  .slice(0, 3)
  .map((dayId) => timetable.days[dayId]);
const mixedLayout = {
  ...layout,
  left: 100,
  top: 200,
  columns: 2,
  rows: 2,
  columnGap: 10,
  rowGap: 20,
  slots: [],
};
const mixedSizes = {
  [mixedDays[0].id]: { width: 100, height: 50 },
  [mixedDays[1].id]: { width: 200, height: 80 },
  [mixedDays[2].id]: { width: 120, height: 40 },
};
const mixedGeometries = getStudioTimetableDayCardGeometries(
  mixedLayout,
  mixedDays,
  () => 1,
  (dayId) => mixedSizes[dayId],
);
assert.deepEqual(mixedGeometries[mixedDays[0].id], {
  left: 100,
  top: 200,
  width: 100,
  height: 50,
});
assert.deepEqual(mixedGeometries[mixedDays[1].id], {
  left: 230,
  top: 200,
  width: 200,
  height: 80,
});
assert.deepEqual(mixedGeometries[mixedDays[2].id], {
  left: 100,
  top: 300,
  width: 120,
  height: 40,
});

const fillParentDocument = createSampleStudioDocument();
fillParentDocument.canvas.width = 640;
fillParentDocument.canvas.height = 660;
const fillParentTimetable = fillParentDocument.domains?.timetable;
assert.ok(fillParentTimetable);
const fillParentComponent =
  fillParentTimetable.components[fillParentTimetable.entryComponentId];
assert.ok(fillParentComponent);
Object.values(fillParentComponent.variants).forEach((variant) => {
  const root = fillParentDocument.graph.nodes[variant.rootNodeId];
  assert.ok(root);
  root.layoutMode = "fillParent";
});

assert.deepEqual(
  getStudioTimetableComponentFrame(fillParentDocument, fillParentComponent),
  { left: 0, top: 0, width: 640, height: 660 },
  "A fill-parent card component must follow the current Cards canvas size.",
);

applyStudioTimetableComponentFrames(fillParentDocument);
assert.deepEqual(fillParentComponent.frame, {
  left: 0,
  top: 0,
  width: 640,
  height: 660,
});
Object.values(fillParentComponent.variants).forEach((variant) => {
  const root = fillParentDocument.graph.nodes[variant.rootNodeId];
  const style = root.styleId
    ? fillParentDocument.styles[root.styleId]
    : undefined;
  assert.equal(style?.left, 0);
  assert.equal(style?.top, 0);
  assert.equal(style?.width, 640);
  assert.equal(style?.height, 660);
});

const fillParentLayout = {
  ...fillParentTimetable.dayCardsLayout!,
  left: 0,
  top: 0,
  gridPreset: "3x3" as const,
  columns: 3,
  rows: 3,
  dayGap: 0,
  columnGap: 0,
  rowGap: 0,
  slots: undefined,
};
const fillParentDays = fillParentTimetable.dayIds.map(
  (dayId) => fillParentTimetable.days[dayId],
);
const fillParentGeometries = getStudioTimetableDayCardGeometries(
  fillParentLayout,
  fillParentDays,
  () => 1,
  getStudioTimetableEntryCardSize(fillParentDocument, fillParentComponent),
);
assert.deepEqual(fillParentGeometries[fillParentDays[0].id], {
  left: 0,
  top: 0,
  width: 640,
  height: 660,
});
assert.deepEqual(fillParentGeometries[fillParentDays[2].id], {
  left: 1280,
  top: 0,
  width: 640,
  height: 660,
});
assert.deepEqual(fillParentGeometries[fillParentDays[6].id], {
  left: 0,
  top: 1320,
  width: 640,
  height: 660,
});

const emptyCellLayout = {
  ...fillParentLayout,
  emptySlotIndexes: [0, 4],
};
assert.deepEqual(
  getStudioTimetableThreeByThreeEmptySlotIndexes(
    emptyCellLayout,
    fillParentDays.length,
  ),
  [0, 4],
);
const emptyCellGeometries = getStudioTimetableDayCardGeometries(
  emptyCellLayout,
  fillParentDays,
  () => 1,
  getStudioTimetableEntryCardSize(fillParentDocument, fillParentComponent),
);
assert.deepEqual(emptyCellGeometries[fillParentDays[0].id], {
  left: 640,
  top: 0,
  width: 640,
  height: 660,
});
assert.deepEqual(emptyCellGeometries[fillParentDays[2].id], {
  left: 0,
  top: 660,
  width: 640,
  height: 660,
});
assert.deepEqual(emptyCellGeometries[fillParentDays[6].id], {
  left: 1280,
  top: 1320,
  width: 640,
  height: 660,
});

const normalizedEmptyCellLayout = {
  ...fillParentLayout,
  emptySlotIndexes: [4, 4, -1, 12],
};
assert.deepEqual(
  getStudioTimetableThreeByThreeEmptySlotIndexes(
    normalizedEmptyCellLayout,
    fillParentDays.length,
  ),
  [8, 4],
  "Invalid and duplicate empty cells must fall back to a valid two-cell selection.",
);

const fixedFrameDocument = createSampleStudioDocument();
fixedFrameDocument.canvas.width = 640;
fixedFrameDocument.canvas.height = 660;
const fixedFrameTimetable = fixedFrameDocument.domains?.timetable;
assert.ok(fixedFrameTimetable);
const fixedFrameComponent =
  fixedFrameTimetable.components[fixedFrameTimetable.entryComponentId];
assert.deepEqual(
  getStudioTimetableComponentFrame(fixedFrameDocument, fixedFrameComponent),
  { left: 160, top: 120, width: 780, height: 500 },
  "A fixed card component must keep its explicit shared frame.",
);

console.log("Template Studio timetable layout checks passed.");
