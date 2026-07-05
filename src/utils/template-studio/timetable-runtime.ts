import {
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableComponentVariant,
  StudioTimetableDayId,
  StudioTimetableRuntimeEntry,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { createStudioRuntimeDefaultsForScope } from "@/utils/template-studio/input-values";
import { isStudioTimetableStatusAvailable } from "@/utils/template-studio/timetable-capabilities";

export interface StudioTimetableVariantResolution {
  requestedStatusId: StudioTimetableStatusId;
  resolvedStatusId: StudioTimetableStatusId;
  variant: StudioTimetableComponentVariant;
  isFallback: boolean;
}

const getDefaultEntryStatusId = (
  document: StudioTemplateDocument,
): StudioTimetableStatusId =>
  document.domains?.timetable?.defaultEntryStatusId ?? "online";

const createEntryInstance = (
  document: StudioTemplateDocument,
  id: string,
): StudioTimetableRuntimeEntry => ({
  id,
  statusId: getDefaultEntryStatusId(document),
});

export const getStudioTimetableEntriesForDay = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
): StudioTimetableRuntimeEntry[] => {
  const currentEntries = values.timetable?.entriesByDay?.[dayId];
  if (currentEntries) return currentEntries;

  const inputEntries = values.entries[dayId] ?? [];
  return inputEntries.map((_, index) =>
    createEntryInstance(document, `${dayId}-entry-${index + 1}`),
  );
};

export const getStudioTimetableMaxEntriesPerDay = (
  document: StudioTemplateDocument,
): number => Math.max(1, document.domains?.timetable?.maxEntriesPerDay ?? 1);

export const addStudioTimetableEntry = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  entryId: string,
): StudioRuntimeValues => {
  const currentEntries = getStudioTimetableEntriesForDay(
    document,
    values,
    dayId,
  );
  if (currentEntries.length >= getStudioTimetableMaxEntriesPerDay(document)) {
    return values;
  }

  const inputDefaults = createStudioRuntimeDefaultsForScope(document, "entry");

  return {
    ...values,
    entries: {
      ...values.entries,
      [dayId]: [...(values.entries[dayId] ?? []), { ...inputDefaults }],
    },
    timetable: {
      ...values.timetable,
      entriesByDay: {
        ...(values.timetable?.entriesByDay ?? {}),
        [dayId]: [...currentEntries, createEntryInstance(document, entryId)],
      },
    },
  };
};

export const removeStudioTimetableEntry = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  entryIndex: number,
): StudioRuntimeValues => {
  const currentEntries = getStudioTimetableEntriesForDay(
    document,
    values,
    dayId,
  );
  if (entryIndex < 0 || entryIndex >= currentEntries.length) return values;

  return {
    ...values,
    entries: {
      ...values.entries,
      [dayId]: (values.entries[dayId] ?? []).filter(
        (_, index) => index !== entryIndex,
      ),
    },
    timetable: {
      ...values.timetable,
      entriesByDay: {
        ...(values.timetable?.entriesByDay ?? {}),
        [dayId]: currentEntries.filter((_, index) => index !== entryIndex),
      },
    },
  };
};

export const setStudioTimetableEntryStatus = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  entryIndex: number,
  statusId: StudioTimetableStatusId,
): StudioRuntimeValues => {
  const timetable = document.domains?.timetable;
  if (!timetable?.statuses[statusId]) return values;
  if (!isStudioTimetableStatusAvailable(timetable, statusId)) return values;

  const currentEntries = getStudioTimetableEntriesForDay(
    document,
    values,
    dayId,
  );
  if (!currentEntries[entryIndex]) return values;

  return {
    ...values,
    timetable: {
      ...values.timetable,
      entriesByDay: {
        ...(values.timetable?.entriesByDay ?? {}),
        [dayId]: currentEntries.map((entry, index) =>
          index === entryIndex ? { ...entry, statusId } : entry,
        ),
      },
    },
  };
};

export const resolveStudioTimetableComponentVariant = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition | undefined,
  statusId: StudioTimetableStatusId,
): StudioTimetableVariantResolution | null => {
  if (!component) return null;

  const timetable = document.domains?.timetable;
  const effectiveStatusId = isStudioTimetableStatusAvailable(
    timetable,
    statusId,
  )
    ? statusId
    : component.defaultStatusId;
  const directVariant = component.variants[effectiveStatusId];
  if (directVariant) {
    return {
      requestedStatusId: statusId,
      resolvedStatusId: effectiveStatusId,
      variant: directVariant,
      isFallback: effectiveStatusId !== statusId,
    };
  }

  const status = timetable?.statuses[effectiveStatusId];
  const fallbackIds = [
    status?.kind === "derived" ? status.fallbackStatusId : undefined,
    status?.baseStatus,
    component.defaultStatusId,
  ].filter(Boolean) as StudioTimetableStatusId[];

  for (const fallbackId of fallbackIds) {
    const fallbackVariant = component.variants[fallbackId];
    if (fallbackVariant) {
      return {
        requestedStatusId: statusId,
        resolvedStatusId: fallbackId,
        variant: fallbackVariant,
        isFallback: true,
      };
    }
  }

  const firstVariant = Object.values(component.variants)[0];
  if (!firstVariant) return null;

  return {
    requestedStatusId: statusId,
    resolvedStatusId: firstVariant.statusId,
    variant: firstVariant,
    isFallback: firstVariant.statusId !== statusId,
  };
};
