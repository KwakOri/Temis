import {
  StudioBuiltinFieldDefinition,
  StudioBuiltinFieldId,
  StudioDayLabelFormat,
  StudioTimetableDayDefinition,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  formatStudioDateParts,
  getStudioDatePartsWithDayOffset,
  getStudioWeekEndParts,
  getStudioWeekStartParts,
  parseStudioIsoDateParts,
  resolveStudioWeekDateText,
} from "@/utils/template-studio/date-template";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";
import { isStudioTimetableCapabilityEnabled } from "@/utils/template-studio/timetable-capabilities";

export const STUDIO_BUILTIN_FIELDS: StudioBuiltinFieldDefinition[] = [
  {
    id: "day.label",
    type: "text",
    scope: "day",
    label: "Day Label",
  },
  {
    id: "day.short_label",
    type: "text",
    scope: "day",
    label: "Day Short Label",
  },
  {
    id: "day.date",
    type: "text",
    scope: "day",
    label: "Day Date",
  },
  {
    id: "day.offline_memo",
    type: "text",
    scope: "day",
    label: "Offline Memo",
    capabilityFlags: ["offlineMemo"],
  },
  {
    id: "day.is_offline",
    type: "boolean",
    scope: "day",
    label: "Day Offline",
  },
  {
    id: "week.date_range",
    type: "text",
    scope: "global",
    label: "Week Date Range",
  },
  {
    id: "week.start_date",
    type: "text",
    scope: "global",
    label: "Week Start Date",
  },
  {
    id: "week.end_date",
    type: "text",
    scope: "global",
    label: "Week End Date",
  },
  {
    id: "entry.main_title",
    type: "text",
    scope: "entry",
    label: "Main Title",
  },
  {
    id: "entry.sub_title",
    type: "text",
    scope: "entry",
    label: "Sub Title",
  },
  {
    id: "entry.time",
    type: "text",
    scope: "entry",
    label: "Time",
  },
  {
    id: "entry.status",
    type: "status",
    scope: "entry",
    label: "Entry Status",
  },
  {
    id: "entry.status_label",
    type: "text",
    scope: "entry",
    label: "Entry Status Label",
  },
  {
    id: "entry.is_offline",
    type: "boolean",
    scope: "entry",
    label: "Entry Offline",
  },
  {
    id: "entry.is_multi",
    type: "boolean",
    scope: "entry",
    label: "Entry Multi",
    capabilityFlags: ["multi"],
  },
  {
    id: "entry.is_offline_memo",
    type: "boolean",
    scope: "entry",
    label: "Entry Offline Memo",
    capabilityFlags: ["offlineMemo"],
  },
];

export const getStudioBuiltinField = (
  fieldId: StudioBuiltinFieldId,
): StudioBuiltinFieldDefinition | null =>
  STUDIO_BUILTIN_FIELDS.find((field) => field.id === fieldId) ?? null;

export const isStudioBuiltinFieldId = (
  fieldId: string,
): fieldId is StudioBuiltinFieldId =>
  STUDIO_BUILTIN_FIELDS.some((field) => field.id === fieldId);

export const isStudioBuiltinFieldAvailable = (
  document: StudioTemplateDocument,
  field: StudioBuiltinFieldDefinition,
): boolean =>
  (field.capabilityFlags ?? []).every((capabilityKey) =>
    isStudioTimetableCapabilityEnabled(
      document.domains?.timetable,
      capabilityKey,
    ),
  );

export const getStudioAvailableBuiltinFields = (
  document: StudioTemplateDocument,
): StudioBuiltinFieldDefinition[] =>
  STUDIO_BUILTIN_FIELDS.filter((field) =>
    isStudioBuiltinFieldAvailable(document, field),
  );

export const STUDIO_DAY_LABEL_FORMAT_OPTIONS: Array<{
  value: StudioDayLabelFormat;
  label: string;
  preview: string;
}> = [
  { value: "default", label: "Default", preview: "Document label" },
  { value: "long", label: "English long", preview: "Monday" },
  { value: "short", label: "English short", preview: "Mon" },
  { value: "shortUpper", label: "English short uppercase", preview: "MON" },
  { value: "shortLower", label: "English short lowercase", preview: "mon" },
  { value: "koreanLong", label: "Korean long", preview: "월요일" },
  { value: "koreanShort", label: "Korean short", preview: "월" },
];

const STUDIO_DAY_LABEL_FORMAT_VALUES = new Set<StudioDayLabelFormat>(
  STUDIO_DAY_LABEL_FORMAT_OPTIONS.map((option) => option.value),
);

const STUDIO_DAY_LABELS_BY_ID: Record<
  string,
  {
    long: string;
    short: string;
    koreanLong: string;
    koreanShort: string;
  }
> = {
  mon: {
    long: "Monday",
    short: "Mon",
    koreanLong: "월요일",
    koreanShort: "월",
  },
  tue: {
    long: "Tuesday",
    short: "Tue",
    koreanLong: "화요일",
    koreanShort: "화",
  },
  wed: {
    long: "Wednesday",
    short: "Wed",
    koreanLong: "수요일",
    koreanShort: "수",
  },
  thu: {
    long: "Thursday",
    short: "Thu",
    koreanLong: "목요일",
    koreanShort: "목",
  },
  fri: {
    long: "Friday",
    short: "Fri",
    koreanLong: "금요일",
    koreanShort: "금",
  },
  sat: {
    long: "Saturday",
    short: "Sat",
    koreanLong: "토요일",
    koreanShort: "토",
  },
  sun: {
    long: "Sunday",
    short: "Sun",
    koreanLong: "일요일",
    koreanShort: "일",
  },
};

const normalizeStudioDayKey = (
  day: StudioTimetableDayDefinition | null | undefined,
): string | null => {
  if (!day) return null;
  const rawKey = day.id || day.shortLabel || day.label;
  const normalized = rawKey.trim().toLowerCase();
  if (STUDIO_DAY_LABELS_BY_ID[normalized]) return normalized;

  const longMatch = Object.entries(STUDIO_DAY_LABELS_BY_ID).find(
    ([, labels]) => labels.long.toLowerCase() === normalized,
  );
  if (longMatch) return longMatch[0];

  const shortMatch = Object.entries(STUDIO_DAY_LABELS_BY_ID).find(
    ([, labels]) => labels.short.toLowerCase() === normalized,
  );
  return shortMatch?.[0] ?? null;
};

export const isStudioDayLabelBuiltinField = (
  fieldId: StudioBuiltinFieldId,
): boolean => fieldId === "day.label" || fieldId === "day.short_label";

export const normalizeStudioDayLabelFormat = (
  value: StudioDayLabelFormat | null | undefined,
): StudioDayLabelFormat =>
  value && STUDIO_DAY_LABEL_FORMAT_VALUES.has(value) ? value : "default";

export const formatStudioDayLabel = (
  day: StudioTimetableDayDefinition | null | undefined,
  fieldId: StudioBuiltinFieldId,
  format?: StudioDayLabelFormat | null,
): string => {
  const normalizedFormat = normalizeStudioDayLabelFormat(format);
  const defaultValue =
    fieldId === "day.short_label"
      ? (day?.shortLabel ?? day?.label)
      : day?.label;
  if (normalizedFormat === "default") return defaultValue ?? "";

  const dayKey = normalizeStudioDayKey(day);
  const labels = dayKey ? STUDIO_DAY_LABELS_BY_ID[dayKey] : null;
  const shortValue = labels?.short ?? day?.shortLabel ?? day?.label ?? "";

  if (normalizedFormat === "long") return labels?.long ?? day?.label ?? "";
  if (normalizedFormat === "short") return shortValue;
  if (normalizedFormat === "shortUpper") return shortValue.toUpperCase();
  if (normalizedFormat === "shortLower") return shortValue.toLowerCase();
  if (normalizedFormat === "koreanLong") {
    return labels?.koreanLong ?? defaultValue ?? "";
  }
  if (normalizedFormat === "koreanShort") {
    return labels?.koreanShort ?? defaultValue ?? "";
  }

  return defaultValue ?? "";
};

interface StudioBuiltinFieldResolveOptions {
  dayLabelFormat?: StudioDayLabelFormat;
}

const getContextEntry = (
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
) => {
  if (!context.dayId || context.entryIndex === undefined) return null;
  return (
    values.timetable.entriesByDay[context.dayId]?.[context.entryIndex] ?? null
  );
};

const getStatusDefinition = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
) => {
  const entry = getContextEntry(values, context);
  if (!entry) return null;
  return document.domains?.timetable?.statuses[entry.statusId] ?? null;
};

const getBooleanText = (value: boolean): string => (value ? "Yes" : "No");

const getDayDateParts = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
) => {
  const timetable = document.domains?.timetable;
  const day = context.dayId ? timetable?.days[context.dayId] : null;
  const runtimeWeekStartDate = values.timetable.weekStartDate;
  if (day && parseStudioIsoDateParts(runtimeWeekStartDate)) {
    return getStudioDatePartsWithDayOffset(runtimeWeekStartDate, day.order);
  }
  if (day?.date) return parseStudioIsoDateParts(day.date);

  if (!day || !timetable?.week?.startDate) return null;
  return getStudioDatePartsWithDayOffset(timetable.week.startDate, day.order);
};

export const resolveStudioBuiltinFieldValue = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  fieldId: StudioBuiltinFieldId,
  context: StudioRuntimeContext = {},
  options: StudioBuiltinFieldResolveOptions = {},
): string => {
  const day = context.dayId
    ? document.domains?.timetable?.days[context.dayId]
    : null;
  const entry = getContextEntry(values, context);
  const status = getStatusDefinition(document, values, context);
  const timetable = document.domains?.timetable;

  if (isStudioDayLabelBuiltinField(fieldId)) {
    return formatStudioDayLabel(day, fieldId, options.dayLabelFormat);
  }
  if (fieldId === "day.date") {
    return formatStudioDateParts(getDayDateParts(document, values, context), {
      includeYear: false,
    });
  }

  if (fieldId === "day.offline_memo") {
    return context.dayId
      ? (values.timetable.offlineMemoByDay?.[context.dayId] ?? "Offline memo")
      : "Offline memo";
  }

  if (fieldId === "day.is_offline") {
    const dayEntries = context.dayId
      ? (values.timetable.entriesByDay[context.dayId] ?? [])
      : [];
    const isOffline =
      dayEntries.length > 0 &&
      dayEntries.every((dayEntry) => {
        const dayEntryStatus =
          document.domains?.timetable?.statuses[dayEntry.statusId];
        return dayEntryStatus?.baseStatus === "offline";
      });

    return getBooleanText(isOffline);
  }

  if (fieldId === "week.start_date") {
    return formatStudioDateParts(
      getStudioWeekStartParts(document, values.timetable.weekStartDate),
      {
        includeYear: true,
      },
    );
  }

  if (fieldId === "week.end_date") {
    return formatStudioDateParts(
      getStudioWeekEndParts(document, values.timetable.weekStartDate),
      {
        includeYear: true,
      },
    );
  }

  if (fieldId === "week.date_range") {
    return resolveStudioWeekDateText(document, {
      startDate: values.timetable.weekStartDate,
    });
  }

  if (fieldId === "entry.main_title") {
    return entry?.mainTitle ?? "메인타이틀\n적는 곳";
  }

  if (fieldId === "entry.sub_title")
    return entry?.subTitle ?? "서브타이틀 적는 곳";
  if (fieldId === "entry.time") {
    return entry?.isGuerrilla ? "게릴라" : (entry?.time ?? "09:00");
  }
  if (fieldId === "entry.status") return entry?.statusId ?? "";
  if (fieldId === "entry.status_label")
    return status?.label ?? entry?.statusId ?? "";

  if (fieldId === "entry.is_offline") {
    return getBooleanText(status?.baseStatus === "offline");
  }

  if (fieldId === "entry.is_multi") {
    const isEnabled = isStudioTimetableCapabilityEnabled(timetable, "multi");
    return getBooleanText(isEnabled && entry?.statusId === "multi");
  }

  if (fieldId === "entry.is_offline_memo") {
    const isEnabled = isStudioTimetableCapabilityEnabled(
      timetable,
      "offlineMemo",
    );
    return getBooleanText(isEnabled && entry?.statusId === "offlineMemo");
  }

  return "";
};
