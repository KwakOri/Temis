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

  const documentDate = document.domains?.timetable?.week?.startDate;
  return parseStudioIsoDateParts(documentDate) ? (documentDate ?? null) : null;
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
