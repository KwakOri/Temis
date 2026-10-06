import type { StudioRuntimeImageContext } from "@/services/browser/templateStudioRuntimeImageStorage";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "./input-values";
import { getStudioTimetableEntriesForDay } from "./timetable-runtime";

// Capture an entry's identity before conversion, cropping or IndexedDB awaits.
export const getStudioRuntimeImageContext = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  context: StudioRuntimeContext,
): StudioRuntimeImageContext | null => {
  if (context.dayId && context.entryIndex !== undefined) {
    const entryId = getStudioTimetableEntriesForDay(
      document,
      values,
      context.dayId,
    )[context.entryIndex]?.id;
    return entryId ? { scope: "entry", dayId: context.dayId, entryId } : null;
  }
  return context.dayId
    ? { scope: "day", dayId: context.dayId }
    : { scope: "global" };
};

export const resolveStudioRuntimeImageContext = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  context: StudioRuntimeImageContext,
): StudioRuntimeContext | null => {
  if (context.scope === "global") return {};
  if (!context.dayId) return null;
  if (context.scope === "day") return { dayId: context.dayId };
  const entryIndex = getStudioTimetableEntriesForDay(
    document,
    values,
    context.dayId,
  ).findIndex((entry) => entry.id === context.entryId);
  return entryIndex < 0 ? null : { dayId: context.dayId, entryIndex };
};

export const setStudioRuntimeImageValue = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  inputId: string,
  value: string,
  context: StudioRuntimeImageContext,
): StudioRuntimeValues => {
  const resolved = resolveStudioRuntimeImageContext(document, values, context);
  return resolved
    ? setStudioRuntimeInputValue(document, values, inputId, value, resolved)
    : values;
};

export const replaceStudioRuntimeImageObjectUrl = (
  urls: Map<string, string>,
  key: string,
  nextUrl: string | null,
  revoke: (url: string) => void = (url) => URL.revokeObjectURL(url),
) => {
  const previous = urls.get(key);
  if (previous && previous !== nextUrl) revoke(previous);
  if (nextUrl) urls.set(key, nextUrl);
  else urls.delete(key);
};
