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

console.log("Template Studio timetable layout checks passed.");
