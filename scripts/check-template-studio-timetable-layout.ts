import assert from "node:assert/strict";

import {
  getStudioTimetableDayCardGeometries,
  getStudioTimetableEntryCardSize,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { getStudioTimetableComponentFrame } from "../src/utils/template-studio/entry-groups";

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

console.log("Template Studio timetable layout checks passed.");
