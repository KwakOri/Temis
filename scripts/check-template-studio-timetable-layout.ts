import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardGeometry,
  StudioTimetablePreview,
  getStudioTimetableDayCardsBounds,
  getStudioTimetableEntryCardSize,
  getStudioTimetableRotatedRectangleBounds,
  getStudioTimetableThreeByThreeEmptySlotIndexes,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { createInitialStudioRuntimeValues } from "../src/utils/template-studio/sample-document";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import {
  applyStudioTimetableComponentFrames,
  getStudioTimetableComponentFrame,
} from "../src/utils/template-studio/entry-groups";

const document = createStudioTimetableGraphDocument();
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
  width: 650,
  height: 600,
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
  gridPreset: "4x2" as const,
  emptySlotIndexes: undefined,
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

assert.deepEqual(
  getStudioTimetableRotatedRectangleBounds(
    { left: 10, top: 20, width: 100, height: 50 },
    0,
  ),
  { left: 10, top: 20, width: 100, height: 50 },
  "A zero-degree card keeps its logical visual bounds.",
);
const ninetyDegreeBounds = getStudioTimetableRotatedRectangleBounds(
  { left: 10, top: 20, width: 100, height: 50 },
  90,
);
assert.ok(Math.abs(ninetyDegreeBounds.left - 35) < 1e-9);
assert.ok(Math.abs(ninetyDegreeBounds.top - -5) < 1e-9);
assert.ok(Math.abs(ninetyDegreeBounds.width - 50) < 1e-9);
assert.ok(Math.abs(ninetyDegreeBounds.height - 100) < 1e-9);
const negativeFortyFiveBounds = getStudioTimetableRotatedRectangleBounds(
  { left: 10, top: 20, width: 100, height: 50 },
  -45,
);
assert.ok(Math.abs(negativeFortyFiveBounds.left - 6.966991411008934) < 1e-9);
assert.ok(Math.abs(negativeFortyFiveBounds.top - -8.033008588991066) < 1e-9);
assert.ok(Math.abs(negativeFortyFiveBounds.width - 106.06601717798213) < 1e-9);
assert.ok(Math.abs(negativeFortyFiveBounds.height - 106.06601717798213) < 1e-9);

const mixedRotationLayout = {
  ...mixedLayout,
  dayOffsets: {
    [mixedDays[0].id]: { left: 0, top: 0, rotateDeg: 0 },
    [mixedDays[1].id]: { left: 0, top: 0, rotateDeg: 90 },
    [mixedDays[2].id]: { left: 0, top: 0, rotateDeg: -45 },
  },
};
assert.deepEqual(
  mixedGeometries,
  getStudioTimetableDayCardGeometries(
    mixedRotationLayout,
    mixedDays,
    () => 1,
    (dayId) => mixedSizes[dayId],
  ),
  "Per-card rotation must not alter logical drag geometry.",
);
const mixedRotationBounds = getStudioTimetableDayCardsBounds(
  mixedRotationLayout,
  mixedDays,
  () => 1,
  (dayId) => mixedSizes[dayId],
);
assert.ok(Math.abs(mixedRotationBounds.left - 100) < 1e-9);
assert.ok(Math.abs(mixedRotationBounds.top - 140) < 1e-9);
assert.ok(Math.abs(mixedRotationBounds.width - 270) < 1e-9);
assert.ok(Math.abs(mixedRotationBounds.height - 236.5685424949238) < 1e-9);

const fillParentDocument = createStudioTimetableGraphDocument();
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
  emptySlotIndexes: [7, 8],
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

const fixedFrameDocument = createStudioTimetableGraphDocument();
fixedFrameDocument.canvas.width = 640;
fixedFrameDocument.canvas.height = 660;
const fixedFrameTimetable = fixedFrameDocument.domains?.timetable;
assert.ok(fixedFrameTimetable);
const fixedFrameComponent =
  fixedFrameTimetable.components[fixedFrameTimetable.entryComponentId];
assert.deepEqual(
  getStudioTimetableComponentFrame(fixedFrameDocument, fixedFrameComponent),
  { left: 160, top: 120, width: 650, height: 600 },
  "A fixed card component must keep its explicit shared frame.",
);



// Custom ignores the previous grid, group origin, spacing and slot map.
const customLayout = { ...mixedLayout, gridPreset: "custom" as const, dayOffsets: {}, slots: [mixedDays[2].id, mixedDays[0].id, mixedDays[1].id] };
const customGeometries = getStudioTimetableDayCardGeometries(customLayout, mixedDays, () => 1, dayId => mixedSizes[dayId]);
for (const day of mixedDays) {
  assert.equal(customGeometries[day.id].left, 0);
  assert.equal(customGeometries[day.id].top, 0);
}
const absoluteLayout = { ...customLayout, dayOffsets: { [mixedDays[1].id]: { left: 143, top: -29, rotateDeg: 25 } } };
assert.deepEqual(getStudioTimetableDayCardGeometry(absoluteLayout, mixedDays[1].id, 1, 1, mixedSizes[mixedDays[1].id]), { left: 143, top: -29, ...mixedSizes[mixedDays[1].id] });
const canvas = {width: 1600, height: 900};
assert.deepEqual(getStudioTimetableDayCardsBounds(absoluteLayout, mixedDays, () => 1, dayId => mixedSizes[dayId], canvas), {left: 0, top: 0, ...canvas}, "Custom's group stays canvas-sized even with moved or rotated cards");
assert.deepEqual(getStudioTimetableDayCardsBounds(absoluteLayout, [], () => 1, entryCardSize, canvas), {left: 0, top: 0, ...canvas});

timetable.canvas = {...timetable.canvas, ...canvas};
timetable.dayCardsLayout = absoluteLayout;
const customMarkup = renderToStaticMarkup(React.createElement(StudioTimetablePreview, {document, runtimeValues: createInitialStudioRuntimeValues(document)}));
assert.match(customMarkup, /data-node-id="day-cards"[^>]*left:0;top:0;width:1600px;height:900px/);
assert.match(customMarkup, new RegExp(`data-node-id="day-card:${mixedDays[1].id}"[^>]*left:143px;top:-29px;`));
assert.match(customMarkup, /rotate\(25deg\)/);

console.log("Template Studio timetable layout checks passed.");
