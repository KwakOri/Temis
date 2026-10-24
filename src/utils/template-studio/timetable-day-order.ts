import type { StudioTimetableDayDefinition } from "@/types/template-studio";

const WEEKDAY_IDS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Calendar position is independent of the editable layer order. */
export const getStudioTimetableWeekdayIndex = (
  day: StudioTimetableDayDefinition,
): number => {
  const index = WEEKDAY_IDS.indexOf(day.id);
  return index >= 0 ? index : day.order;
};

/** Keep custom day IDs compatible with their existing order. */
export const getStudioTimetableWeekdayOrder = (
  days: readonly StudioTimetableDayDefinition[],
): StudioTimetableDayDefinition[] =>
  [...days].sort(
    (left, right) =>
      getStudioTimetableWeekdayIndex(left) -
      getStudioTimetableWeekdayIndex(right),
  );
