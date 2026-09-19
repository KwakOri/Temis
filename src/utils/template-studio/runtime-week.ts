import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioDatePartsWithDayOffset,
  parseStudioIsoDateParts,
} from "@/utils/template-studio/date-template";

const formatIsoDateParts = (
  parts: ReturnType<typeof parseStudioIsoDateParts>,
): string | null =>
  parts ? `${parts.year}-${parts.month}-${parts.day}` : null;

/** Return today's date or the closest Monday before it, formatted as local ISO. */
export const getStudioNearestPastMonday = (date = new Date()): string => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const shiftStudioIsoDate = (
  value: string | undefined,
  dayDelta: number,
): string | null =>
  formatIsoDateParts(getStudioDatePartsWithDayOffset(value, dayDelta));

export const getStudioRuntimeWeekStartDate = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
): string | null => {
  const runtimeDate = values.timetable.weekStartDate;
  if (parseStudioIsoDateParts(runtimeDate)) return runtimeDate ?? null;

  return document.domains?.timetable ? getStudioNearestPastMonday() : null;
};

export const getStudioRuntimeWeekEndDate = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
): string | null => {
  const startDate = getStudioRuntimeWeekStartDate(document, values);
  if (!startDate) return null;

  const dayCount = document.domains?.timetable?.dayIds.length ?? 0;
  return shiftStudioIsoDate(startDate, Math.max(0, dayCount - 1));
};

export const setStudioRuntimeWeekStartDate = (
  values: StudioRuntimeValues,
  weekStartDate: string,
): StudioRuntimeValues => {
  if (!parseStudioIsoDateParts(weekStartDate)) return values;

  return {
    ...values,
    timetable: {
      ...values.timetable,
      weekStartDate,
    },
  };
};

/**
 * Start each browser/editor session at the current week regardless of the
 * document or previously saved runtime date.
 */
export const withStudioCurrentRuntimeWeekStartDate = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  date = new Date(),
): StudioRuntimeValues => {
  if (!document.domains?.timetable) return values;

  return setStudioRuntimeWeekStartDate(
    values,
    getStudioNearestPastMonday(date),
  );
};

export const shiftStudioRuntimeWeek = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  weekDelta: number,
): StudioRuntimeValues => {
  const startDate = getStudioRuntimeWeekStartDate(document, values);
  const nextStartDate = shiftStudioIsoDate(
    startDate ?? undefined,
    weekDelta * 7,
  );
  return nextStartDate
    ? setStudioRuntimeWeekStartDate(values, nextStartDate)
    : values;
};
