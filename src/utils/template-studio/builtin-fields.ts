import {
  StudioBuiltinFieldDefinition,
  StudioBuiltinFieldId,
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
): string => {
  const day = context.dayId
    ? document.domains?.timetable?.days[context.dayId]
    : null;
  const entry = getContextEntry(values, context);
  const status = getStatusDefinition(document, values, context);
  const timetable = document.domains?.timetable;

  if (fieldId === "day.label") return day?.label ?? "";
  if (fieldId === "day.short_label") return day?.shortLabel ?? day?.label ?? "";
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
    return entry?.mainTitle ?? `Entry ${(context.entryIndex ?? 0) + 1}`;
  }

  if (fieldId === "entry.sub_title") return entry?.subTitle ?? "";
  if (fieldId === "entry.time") return entry?.time ?? "09:00";
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
