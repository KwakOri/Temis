import {
  StudioBuiltinFieldDefinition,
  StudioBuiltinFieldId,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";

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
    id: "day.is_offline",
    type: "boolean",
    scope: "day",
    label: "Day Offline",
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
];

export const getStudioBuiltinField = (
  fieldId: StudioBuiltinFieldId,
): StudioBuiltinFieldDefinition | null =>
  STUDIO_BUILTIN_FIELDS.find((field) => field.id === fieldId) ?? null;

export const isStudioBuiltinFieldId = (
  fieldId: string,
): fieldId is StudioBuiltinFieldId =>
  STUDIO_BUILTIN_FIELDS.some((field) => field.id === fieldId);

const getContextEntry = (
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
) => {
  if (!context.dayId || context.entryIndex === undefined) return null;
  return values.timetable.entriesByDay[context.dayId]?.[context.entryIndex] ?? null;
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

  if (fieldId === "day.label") return day?.label ?? "";
  if (fieldId === "day.short_label") return day?.shortLabel ?? day?.label ?? "";

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

  if (fieldId === "entry.main_title") {
    return entry?.mainTitle ?? `Entry ${(context.entryIndex ?? 0) + 1}`;
  }

  if (fieldId === "entry.sub_title") return entry?.subTitle ?? "";
  if (fieldId === "entry.status") return entry?.statusId ?? "";
  if (fieldId === "entry.status_label") return status?.label ?? entry?.statusId ?? "";

  if (fieldId === "entry.is_offline") {
    return getBooleanText(status?.baseStatus === "offline");
  }

  return "";
};
