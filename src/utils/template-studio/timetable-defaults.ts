import type { StudioTimetableDayCardsLayout } from "@/types/template-studio";

// Approximate CASE_02 layout: portrait on the left, cards on the right,
// with the first row's two right cells reserved for the weekly heading.
export const STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT = {
  left: 1700,
  top: 120,
  dayWidth: 650,
  gridPreset: "3x3",
  columns: 3,
  rows: 3,
  emptySlotIndexes: [1, 2],
  dayGap: 70,
  columnGap: 70,
  rowGap: 50,
  fillOrder: "row",
  alignLastRow: "start",
  padding: 28,
  headerHeight: 100,
  entryPreviewWidth: 650,
  entryPreviewHeight: 600,
  entryGap: 24,
} satisfies StudioTimetableDayCardsLayout;
