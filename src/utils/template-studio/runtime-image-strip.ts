import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

/**
 * Removes every value keyed by a document `image`-type input from the
 * global/day/entry string maps. Runtime images live only in the browser's
 * IndexedDB (see templateStudioRuntimeImageStorage.ts) — the server never
 * reads or writes them, so any image-input key reaching here (legacy saved
 * state, a stale/compromised client) is dropped rather than persisted.
 */
export const stripStudioRuntimeImageValues = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues
): { values: StudioRuntimeValues; changed: boolean } => {
  const imageInputIds = new Set(
    Object.values(document.inputs)
      .filter((input) => input.type === "image")
      .map((input) => input.id)
  );

  let changed = false;

  const stripRecord = (
    record: Record<string, string> | undefined
  ): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(record ?? {})) {
      if (imageInputIds.has(key)) {
        changed = true;
        continue;
      }
      result[key] = value;
    }
    return result;
  };

  const global = stripRecord(values.global);

  const days: StudioRuntimeValues["days"] = {};
  for (const [dayId, dayValues] of Object.entries(values.days ?? {})) {
    days[dayId] = stripRecord(dayValues);
  }

  const entries: StudioRuntimeValues["entries"] = {};
  for (const [dayId, entryList] of Object.entries(values.entries ?? {})) {
    entries[dayId] = (entryList ?? []).map((entry) => stripRecord(entry));
  }

  if (imageInputIds.size === 0) {
    // No image inputs declared at all — nothing to strip, keep the original
    // reference so callers can cheaply check `changed === false`.
    return { values, changed: false };
  }

  return {
    values: { ...values, global, days, entries },
    changed,
  };
};
