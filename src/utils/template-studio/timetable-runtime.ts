import {
  StudioDiagnostic,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableComponentVariant,
  StudioTimetableDayId,
  StudioTimetableRuntimeEntry,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { createStudioRuntimeDefaultsForScope } from "@/utils/template-studio/input-values";
import {
  isStudioTimetableCapabilityEnabled,
  isStudioTimetableStatusAvailable,
} from "@/utils/template-studio/timetable-capabilities";
import { STUDIO_MULTI_ENTRY_SLOT_COUNT } from "@/utils/template-studio/entry-groups";

export interface StudioTimetableVariantResolution {
  requestedStatusId: StudioTimetableStatusId;
  resolvedStatusId: StudioTimetableStatusId;
  variant: StudioTimetableComponentVariant;
  isFallback: boolean;
}

export type StudioTimetableEditableEntryField = keyof Pick<
  StudioTimetableRuntimeEntry,
  "mainTitle" | "subTitle" | "time"
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isStudioRuntimeValuesLike = (
  value: unknown,
): value is StudioRuntimeValues => {
  if (
    !isRecord(value) ||
    !isRecord(value.global) ||
    !isRecord(value.days) ||
    !isRecord(value.entries) ||
    !isRecord(value.timetable) ||
    !isRecord(value.timetable.entriesByDay) ||
    (value.timetable.offlineMemoByDay !== undefined &&
      !isRecord(value.timetable.offlineMemoByDay))
  ) {
    return false;
  }

  const dayValuesAreValid = Object.values(value.days).every(isRecord);
  const customEntriesAreValid = Object.values(value.entries).every(
    (entries) => Array.isArray(entries) && entries.every(isRecord),
  );
  const timetableEntriesAreValid = Object.values(
    value.timetable.entriesByDay,
  ).every(
    (entries) =>
      Array.isArray(entries) &&
      entries.every(
        (entry) =>
          isRecord(entry) &&
          typeof entry.id === "string" &&
          typeof entry.statusId === "string" &&
          [entry.mainTitle, entry.subTitle, entry.time].every(
            (field) => field === undefined || typeof field === "string",
          ),
      ),
  );
  const offlineMemoValuesAreValid = Object.values(
    value.timetable.offlineMemoByDay ?? {},
  ).every((memo) => typeof memo === "string");

  return (
    dayValuesAreValid &&
    customEntriesAreValid &&
    timetableEntriesAreValid &&
    offlineMemoValuesAreValid
  );
};

export const setStudioTimetableOfflineMemo = (
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  value: string,
): StudioRuntimeValues => ({
  ...values,
  timetable: {
    ...values.timetable,
    offlineMemoByDay: {
      ...(values.timetable.offlineMemoByDay ?? {}),
      [dayId]: value,
    },
  },
});

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

export const getStudioTimetableMaxEntriesPerDay = (): number =>
  STUDIO_MULTI_ENTRY_SLOT_COUNT;

export const getStudioTimetableEffectiveMaxEntriesPerDay = (
  document: StudioTemplateDocument,
): number =>
  isStudioTimetableCapabilityEnabled(document.domains?.timetable, "multi")
    ? getStudioTimetableMaxEntriesPerDay()
    : 1;

export const getStudioTimetableAddEntryDisabledReason = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
): string | null => {
  const entryCount = getStudioTimetableEntriesForDay(
    document,
    values,
    dayId,
  ).length;

  if (entryCount === 0) return null;

  if (
    !isStudioTimetableCapabilityEnabled(document.domains?.timetable, "multi")
  ) {
    return "Enable Multi Status to add entries";
  }

  if (entryCount >= getStudioTimetableMaxEntriesPerDay()) {
    return "Maximum entries reached";
  }

  return null;
};

export const getStudioTimetableDaysWithMultipleEntries = (
  values: StudioRuntimeValues,
): StudioTimetableDayId[] =>
  Object.entries(values.timetable.entriesByDay)
    .filter(([, entries]) => entries.length > 1)
    .map(([dayId]) => dayId);

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
  if (
    currentEntries.length >=
    getStudioTimetableEffectiveMaxEntriesPerDay(document)
  ) {
    return values;
  }

  const inputDefaults = createStudioRuntimeDefaultsForScope(document, "entry");
  const useMultiStatus =
    currentEntries.length >= 1 &&
    Boolean(document.domains?.timetable?.statuses.multi) &&
    isStudioTimetableStatusAvailable(document.domains?.timetable, "multi");
  const nextCurrentEntries = useMultiStatus
    ? currentEntries.map((entry) => ({ ...entry, statusId: "multi" }))
    : currentEntries;
  const nextEntry = createEntryInstance(document, entryId);
  if (useMultiStatus && nextEntry.statusId === "online") {
    nextEntry.statusId = "multi";
  }

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
        [dayId]: [...nextCurrentEntries, nextEntry],
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
  const remainingEntries = currentEntries.filter(
    (_, index) => index !== entryIndex,
  );
  const normalizedEntries =
    remainingEntries.length <= 1
      ? remainingEntries.map((entry) =>
          entry.statusId === "multi" ? { ...entry, statusId: "online" } : entry,
        )
      : remainingEntries;

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
        [dayId]: normalizedEntries,
      },
    },
  };
};

export const setStudioTimetableDayBaseStatus = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  baseStatus: "online" | "offline",
): StudioRuntimeValues => {
  const currentEntries = getStudioTimetableEntriesForDay(
    document,
    values,
    dayId,
  );
  const firstEntry = currentEntries[0];
  if (!firstEntry) return values;

  const useMultiStatus =
    baseStatus === "online" &&
    currentEntries.length > 1 &&
    isStudioTimetableStatusAvailable(
      document.domains?.timetable,
      "multi",
    );
  const nextEntries = useMultiStatus
    ? currentEntries.map((entry) => ({ ...entry, statusId: "multi" }))
    : [{ ...firstEntry, statusId: baseStatus }];

  return {
    ...values,
    entries: {
      ...values.entries,
      [dayId]: useMultiStatus
        ? [...(values.entries[dayId] ?? [])]
        : (values.entries[dayId] ?? []).slice(0, 1),
    },
    timetable: {
      ...values.timetable,
      entriesByDay: {
        ...(values.timetable?.entriesByDay ?? {}),
        [dayId]: nextEntries,
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
  if (currentEntries.length > 1) {
    if (statusId !== "multi") return values;
    return {
      ...values,
      timetable: {
        ...values.timetable,
        entriesByDay: {
          ...(values.timetable?.entriesByDay ?? {}),
          [dayId]: currentEntries.map((entry) => ({
            ...entry,
            statusId: "multi",
          })),
        },
      },
    };
  }

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

export const setStudioTimetableEntryField = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: StudioTimetableDayId,
  entryIndex: number,
  field: StudioTimetableEditableEntryField,
  value: string,
): StudioRuntimeValues => {
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
          index === entryIndex ? { ...entry, [field]: value } : entry,
        ),
      },
    },
  };
};

export const validateStudioRuntimeValuesForDocument = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
): StudioDiagnostic[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];
  const diagnostics: StudioDiagnostic[] = [];
  const multiEnabled = isStudioTimetableCapabilityEnabled(timetable, "multi");

  timetable.dayIds.forEach((dayId) => {
    const entries = values.timetable.entriesByDay[dayId] ?? [];
    if (entries.length > STUDIO_MULTI_ENTRY_SLOT_COUNT) {
      diagnostics.push({
        id: `runtime-entry-limit:${dayId}`,
        severity: "error",
        title: "Too many timetable entries",
        detail: `${dayId} has ${entries.length} entries, but Multi supports exactly two slots.`,
      });
    }
    if (!multiEnabled && entries.length > 1) {
      diagnostics.push({
        id: `runtime-multi-disabled:${dayId}`,
        severity: "error",
        title: "Multiple entries require Multi",
        detail: `${dayId} contains multiple entries while Multi is disabled.`,
      });
    }
    if (
      entries.length > 1 &&
      entries.some((entry) => entry.statusId !== "multi")
    ) {
      diagnostics.push({
        id: `runtime-multi-status:${dayId}`,
        severity: "error",
        title: "Invalid Multi runtime status",
        detail: `${dayId} has two entries, so both entries must use the Multi layout status.`,
      });
    }
    if (entries.length <= 1 && entries[0]?.statusId === "multi") {
      diagnostics.push({
        id: `runtime-single-multi-status:${dayId}`,
        severity: "error",
        title: "Invalid single-entry Multi status",
        detail: `${dayId} has one entry, so it cannot use the Multi layout status.`,
      });
    }
    entries.forEach((entry, entryIndex) => {
      if (!timetable.statuses[entry.statusId]) {
        diagnostics.push({
          id: `runtime-status-missing:${dayId}:${entryIndex}`,
          severity: "error",
          title: "Unknown runtime status",
          detail: `${dayId} entry ${entryIndex + 1} uses missing status ${entry.statusId}.`,
        });
      } else if (!isStudioTimetableStatusAvailable(timetable, entry.statusId)) {
        diagnostics.push({
          id: `runtime-status-disabled:${dayId}:${entryIndex}`,
          severity: "error",
          title: "Unavailable runtime status",
          detail: `${dayId} entry ${entryIndex + 1} uses disabled status ${entry.statusId}.`,
        });
      }
    });
  });

  return diagnostics;
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
