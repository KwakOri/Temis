import {
  StudioInputDefinition,
  StudioInputScope,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { STUDIO_MULTI_ENTRY_SLOT_COUNT } from "@/utils/template-studio/entry-groups";
import { isStudioTimetableCapabilityEnabled } from "@/utils/template-studio/timetable-capabilities";

export interface StudioRuntimeContext {
  dayId?: string;
  entryIndex?: number;
}

export const getStudioInputDefaultValue = (
  input: StudioInputDefinition,
): string => {
  if (input.type === "text") return input.defaultValue ?? "";
  if (input.type === "image") return input.defaultUrl ?? "";
  return input.defaultValue ?? input.options[0]?.value ?? "";
};

export const getStudioInputsForScope = (
  document: StudioTemplateDocument,
  scope: StudioInputScope,
): StudioInputDefinition[] =>
  Object.values(document.inputs).filter((input) => input.scope === scope);

export const createStudioRuntimeDefaultsForScope = (
  document: StudioTemplateDocument,
  scope: StudioInputScope,
): Record<string, string> =>
  getStudioInputsForScope(document, scope).reduce<Record<string, string>>(
    (acc, input) => {
      acc[input.id] = getStudioInputDefaultValue(input);
      return acc;
    },
    {},
  );

export const createStudioInitialRuntimeValues = (
  document: StudioTemplateDocument,
  options: { entryCountPerDay?: number } = {},
): StudioRuntimeValues => {
  const timetable = document.domains?.timetable;
  const dayIds = timetable?.dayIds ?? [];
  const requestedEntryCount = Math.max(1, options.entryCountPerDay ?? 1);
  const entryCountPerDay = Math.min(
    requestedEntryCount,
    isStudioTimetableCapabilityEnabled(timetable, "multi")
      ? STUDIO_MULTI_ENTRY_SLOT_COUNT
      : 1,
  );
  const dayDefaults = createStudioRuntimeDefaultsForScope(document, "day");
  const entryDefaults = createStudioRuntimeDefaultsForScope(document, "entry");
  const defaultStatusId = timetable?.defaultEntryStatusId ?? "online";

  return {
    global: createStudioRuntimeDefaultsForScope(document, "global"),
    days: Object.fromEntries(
      dayIds.map((dayId) => [dayId, { ...dayDefaults }]),
    ),
    entries: Object.fromEntries(
      dayIds.map((dayId) => [
        dayId,
        Array.from({ length: entryCountPerDay }, () => ({ ...entryDefaults })),
      ]),
    ),
    timetable: {
      entriesByDay: Object.fromEntries(
        dayIds.map((dayId) => [
          dayId,
          Array.from({ length: entryCountPerDay }, (_, index) => ({
            id: `${dayId}-entry-${index + 1}`,
            statusId: defaultStatusId,
          })),
        ]),
      ),
    },
  };
};

export const ensureStudioDayRuntimeValues = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: string,
): StudioRuntimeValues => {
  const dayDefaults = createStudioRuntimeDefaultsForScope(document, "day");
  const currentDayValues = values.days[dayId] ?? {};

  return {
    ...values,
    days: {
      ...values.days,
      [dayId]: {
        ...dayDefaults,
        ...currentDayValues,
      },
    },
  };
};

export const ensureStudioEntryRuntimeValues = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: string,
  entryIndex: number,
): StudioRuntimeValues => {
  const entryDefaults = createStudioRuntimeDefaultsForScope(document, "entry");
  const currentEntries = values.entries[dayId] ?? [];
  const nextEntries = [...currentEntries];

  while (nextEntries.length <= entryIndex) {
    nextEntries.push({ ...entryDefaults });
  }

  nextEntries[entryIndex] = {
    ...entryDefaults,
    ...(nextEntries[entryIndex] ?? {}),
  };

  return {
    ...values,
    entries: {
      ...values.entries,
      [dayId]: nextEntries,
    },
  };
};

export const setStudioRuntimeInputValue = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  inputId: string,
  value: string,
  context: StudioRuntimeContext = {},
): StudioRuntimeValues => {
  const input = document.inputs[inputId];
  if (!input) return values;

  if (input.scope === "global") {
    return {
      ...values,
      global: {
        ...values.global,
        [inputId]: value,
      },
    };
  }

  if (input.scope === "day" && context.dayId) {
    const nextValues = ensureStudioDayRuntimeValues(
      document,
      values,
      context.dayId,
    );

    return {
      ...nextValues,
      days: {
        ...nextValues.days,
        [context.dayId]: {
          ...nextValues.days[context.dayId],
          [inputId]: value,
        },
      },
    };
  }

  if (
    input.scope === "entry" &&
    context.dayId &&
    context.entryIndex !== undefined
  ) {
    const nextValues = ensureStudioEntryRuntimeValues(
      document,
      values,
      context.dayId,
      context.entryIndex,
    );
    const nextEntries = [...(nextValues.entries[context.dayId] ?? [])];

    nextEntries[context.entryIndex] = {
      ...(nextEntries[context.entryIndex] ?? {}),
      [inputId]: value,
    };

    return {
      ...nextValues,
      entries: {
        ...nextValues.entries,
        [context.dayId]: nextEntries,
      },
    };
  }

  return values;
};

export const getStudioRuntimeInputValue = (
  input: StudioInputDefinition,
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
): string => {
  if (input.scope === "global") {
    return values.global[input.id] ?? getStudioInputDefaultValue(input);
  }

  if (input.scope === "day" && context.dayId) {
    return (
      values.days[context.dayId]?.[input.id] ??
      getStudioInputDefaultValue(input)
    );
  }

  if (
    input.scope === "entry" &&
    context.dayId &&
    context.entryIndex !== undefined
  ) {
    return (
      values.entries[context.dayId]?.[context.entryIndex]?.[input.id] ??
      getStudioInputDefaultValue(input)
    );
  }

  return getStudioInputDefaultValue(input);
};
