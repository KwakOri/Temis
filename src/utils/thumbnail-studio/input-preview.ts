import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  createStudioInitialRuntimeValues,
  getStudioInputDefaultValue,
  setStudioRuntimeInputValue,
} from "@/utils/template-studio/input-values";
import { getThumbnailStudioInputDefinitions } from "@/utils/thumbnail-studio/input-order";

export type ThumbnailPreviewMode = "defaults" | "session";

const getThumbnailGlobalDefaults = (
  document: StudioTemplateDocument,
): Record<string, string> =>
  Object.fromEntries(
    getThumbnailStudioInputDefinitions(document).map((input) => [
      input.id,
      getStudioInputDefaultValue(input),
    ]),
  );

/** Thumbnail 세션을 위한 공용 StudioRuntimeValues를 만든다. 편집 값은 global만 사용한다. */
export const createThumbnailStudioPreviewValues = (
  document: StudioTemplateDocument,
): StudioRuntimeValues => createStudioInitialRuntimeValues(document);

/** document 변경 뒤에도 살아 있는 session 값은 보존하고 새 input은 default로 채운다. */
export const syncThumbnailStudioPreviewValues = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  editedInputIds: readonly string[] = [],
): StudioRuntimeValues => {
  const defaults = getThumbnailGlobalDefaults(document);
  const editedInputIdSet = new Set(editedInputIds);
  const global = Object.fromEntries(
    Object.entries(defaults).map(([inputId, defaultValue]) => [
      inputId,
      editedInputIdSet.has(inputId)
        ? (values.global?.[inputId] ?? defaultValue)
        : defaultValue,
    ]),
  );

  return {
    ...values,
    global,
    days: {},
    entries: {},
    timetable: {
      weekStartDate: undefined,
      entriesByDay: {},
      offlineMemoByDay: {},
    },
  };
};

/** 관리자 preview 값을 바꾼다. global 이외의 input은 변경하지 않는다. */
export const setThumbnailStudioPreviewInputValue = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  inputId: string,
  value: string,
): StudioRuntimeValues => {
  const input = document.inputs[inputId];
  if (!input || input.scope !== "global") return values;
  return setStudioRuntimeInputValue(document, values, inputId, value);
};

/** 한 input 또는 전체 global input을 최신 default로 되돌린다. */
export const resetThumbnailStudioPreviewValues = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  inputId?: string,
): StudioRuntimeValues => {
  const next = syncThumbnailStudioPreviewValues(
    document,
    values,
    Object.keys(values.global ?? {}),
  );
  const defaults = getThumbnailGlobalDefaults(document);
  if (!inputId || !(inputId in defaults)) {
    return !inputId ? { ...next, global: defaults } : next;
  }

  return {
    ...next,
    global: {
      ...next.global,
      [inputId]: defaults[inputId],
    },
  };
};
