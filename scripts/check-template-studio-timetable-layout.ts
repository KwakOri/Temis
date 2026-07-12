import assert from "node:assert/strict";

import type {
  StudioTimetableDayCardsLayout,
  StudioTimetableDayDefinition,
} from "../src/types/template-studio";
import {
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardHeight,
  getStudioTimetableEntrySlotGeometries,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";

const layout: StudioTimetableDayCardsLayout = {
  left: 0,
  top: 0,
  dayWidth: 360,
  gridPreset: "7x1",
  columns: 1,
  rows: 2,
  dayGap: 20,
  columnGap: 20,
  rowGap: 20,
  fillOrder: "row",
  alignLastRow: "start",
  padding: 0,
  headerHeight: 0,
  entryPreviewWidth: 360,
  entryPreviewHeight: 212,
  entryGap: 24,
};
const entryCardSize = { width: 360, height: 212 };

assert.equal(getStudioTimetableDayCardHeight(layout, 1, entryCardSize), 212);
assert.equal(getStudioTimetableDayCardHeight(layout, 2, entryCardSize), 212);
assert.equal(getStudioTimetableDayCardHeight(layout, 3, entryCardSize), 212);

const twoEntrySlots = getStudioTimetableEntrySlotGeometries(
  layout,
  2,
  entryCardSize,
);
assert.deepEqual(twoEntrySlots, [
  { top: 0, width: 360, height: 94 },
  { top: 118, width: 360, height: 94 },
]);
assert.equal(
  twoEntrySlots[1].top + twoEntrySlots[1].height,
  entryCardSize.height,
);

const threeEntrySlots = getStudioTimetableEntrySlotGeometries(
  layout,
  3,
  entryCardSize,
);
assert.equal(threeEntrySlots.length, 3);
assert.equal(threeEntrySlots[0].top, 0);
assert.equal(
  Math.round(
    (threeEntrySlots[2].top + threeEntrySlots[2].height) * 1000,
  ) / 1000,
  entryCardSize.height,
);
assert.ok(
  threeEntrySlots.every(
    (slot, index) =>
      index === 0 ||
      slot.top >=
        threeEntrySlots[index - 1].top +
          threeEntrySlots[index - 1].height,
  ),
);

const days: StudioTimetableDayDefinition[] = [
  { id: "mon", label: "Monday", order: 0 },
  { id: "tue", label: "Tuesday", order: 1 },
];
const singleEntryGeometries = getStudioTimetableDayCardGeometries(
  layout,
  days,
  () => 1,
  entryCardSize,
);
const mixedEntryGeometries = getStudioTimetableDayCardGeometries(
  layout,
  days,
  (dayId) => (dayId === "mon" ? 3 : 1),
  entryCardSize,
);
assert.deepEqual(
  mixedEntryGeometries,
  singleEntryGeometries,
  "Entry count must not change day-card bounds or neighboring positions.",
);

console.log("Template Studio timetable layout checks passed.");
