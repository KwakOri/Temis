import type {
  StudioInputId,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableDayId,
} from "@/types/template-studio";
import { createStudioInitialRuntimeValues } from "@/utils/template-studio/input-values";
import {
  isStudioRuntimeValuesLike,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";

const filterRecordByKeys = <T>(
  record: Record<string, T> | undefined,
  allowedKeys: Set<string>,
): Record<string, T> => {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record ?? {})) {
    if (allowedKeys.has(key)) {
      result[key] = value;
    }
  }
  return result;
};

/**
 * Drops runtime value entries that reference inputs or timetable days the
 * current document no longer defines (e.g. after a template revision removed
 * an input or a day). Keeps everything else untouched.
 */
export const pruneStudioRuntimeValuesForDocument = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
): StudioRuntimeValues => {
  const globalIds = new Set<StudioInputId>();
  const dayInputIds = new Set<StudioInputId>();
  const entryInputIds = new Set<StudioInputId>();

  Object.values(document.inputs).forEach((input) => {
    if (input.scope === "global") globalIds.add(input.id);
    if (input.scope === "day") dayInputIds.add(input.id);
    if (input.scope === "entry") entryInputIds.add(input.id);
  });

  const dayIds = new Set<string>(document.domains?.timetable?.dayIds ?? []);

  const days: StudioRuntimeValues["days"] = {};
  for (const [dayId, dayValues] of Object.entries(values.days ?? {})) {
    if (!dayIds.has(dayId)) continue;
    days[dayId as StudioTimetableDayId] = filterRecordByKeys(
      dayValues,
      dayInputIds,
    );
  }

  const entries: StudioRuntimeValues["entries"] = {};
  for (const [dayId, entryList] of Object.entries(values.entries ?? {})) {
    if (!dayIds.has(dayId)) continue;
    entries[dayId as StudioTimetableDayId] = (entryList ?? []).map((entry) =>
      filterRecordByKeys(entry, entryInputIds),
    );
  }

  const entriesByDay: StudioRuntimeValues["timetable"]["entriesByDay"] = {};
  for (const [dayId, dayEntries] of Object.entries(
    values.timetable?.entriesByDay ?? {},
  )) {
    if (!dayIds.has(dayId)) continue;
    entriesByDay[dayId as StudioTimetableDayId] = dayEntries;
  }

  const offlineMemoByDay: Record<string, string> = {};
  for (const [dayId, memo] of Object.entries(
    values.timetable?.offlineMemoByDay ?? {},
  )) {
    if (!dayIds.has(dayId)) continue;
    offlineMemoByDay[dayId] = memo;
  }

  return {
    global: filterRecordByKeys(values.global, globalIds),
    days,
    entries,
    timetable: {
      weekStartDate: values.timetable?.weekStartDate,
      entriesByDay,
      offlineMemoByDay,
    },
  };
};

/**
 * Resolves the runtime values a Studio run page should start from for a
 * given user: the user's saved state when it is still structurally and
 * semantically valid against the current published document, otherwise a
 * fresh default. Also reports whether the resolved value differs from what
 * was stored, so callers can decide whether to persist the reconciled state.
 */
export const reconcileStudioUserRuntimeValues = (
  document: StudioTemplateDocument,
  stored: {
    runtimeValues: unknown;
    baseRevisionNo: number | null;
  } | null,
  currentRevisionNo: number | null,
): { runtimeValues: StudioRuntimeValues; baseRevisionNo: number | null; changed: boolean } => {
  if (!stored) {
    return {
      runtimeValues: createStudioInitialRuntimeValues(document),
      baseRevisionNo: currentRevisionNo,
      changed: true,
    };
  }

  if (
    stored.baseRevisionNo === currentRevisionNo &&
    isStudioRuntimeValuesLike(stored.runtimeValues)
  ) {
    return {
      runtimeValues: stored.runtimeValues,
      baseRevisionNo: stored.baseRevisionNo,
      changed: false,
    };
  }

  if (isStudioRuntimeValuesLike(stored.runtimeValues)) {
    const pruned = pruneStudioRuntimeValuesForDocument(
      document,
      stored.runtimeValues,
    );
    const diagnostics = validateStudioRuntimeValuesForDocument(
      document,
      pruned,
    );
    const hasBlockingDiagnostics = diagnostics.some(
      (diagnostic) => diagnostic.severity === "error",
    );

    if (!hasBlockingDiagnostics) {
      return {
        runtimeValues: pruned,
        baseRevisionNo: currentRevisionNo,
        changed: true,
      };
    }
  }

  return {
    runtimeValues: createStudioInitialRuntimeValues(document),
    baseRevisionNo: currentRevisionNo,
    changed: true,
  };
};
