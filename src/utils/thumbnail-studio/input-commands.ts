import type {
  StudioInputDefinition,
  StudioInputType,
  StudioSelectInputDefinition,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { createStudioInputDefinition } from "@/utils/template-studio/input-commands";
import {
  getStudioInputPresentationOrder,
  getThumbnailStudioInputDefinitions,
  getThumbnailStudioInputGroupId,
  normalizeThumbnailStudioInputPresentation,
} from "@/utils/thumbnail-studio/input-order";
import { createStudioId } from "@/utils/template-studio/id";

const cloneStudioInputDefinition = (
  input: StudioInputDefinition,
): StudioInputDefinition => {
  if (input.type === "select") {
    return {
      ...input,
      options: input.options.map((option) => ({ ...option })),
      presentation: input.presentation ? { ...input.presentation } : undefined,
    };
  }

  if (input.type === "image") {
    return {
      ...input,
      policy: input.policy ? { ...input.policy } : undefined,
      presentation: input.presentation ? { ...input.presentation } : undefined,
    };
  }

  return {
    ...input,
    presentation: input.presentation ? { ...input.presentation } : undefined,
  };
};

const getNextThumbnailStudioInputOrder = (
  document: StudioTemplateDocument,
): number => {
  const orders = getThumbnailStudioInputDefinitions(document)
    .map(getStudioInputPresentationOrder)
    .filter(Number.isFinite);
  return orders.length > 0 ? Math.max(...orders) + 1 : 0;
};

/** Thumbnail에서만 생성하는 input은 공용 factory에 global scope를 명시한다. */
export const createThumbnailStudioInputDefinition = (
  document: StudioTemplateDocument,
  type: StudioInputType,
): StudioInputDefinition => {
  const input = createStudioInputDefinition(type, "global");
  input.presentation = { order: getNextThumbnailStudioInputOrder(document) };
  return input;
};

/** 새 global input을 추가하고 표시 순서를 canonicalize한다. */
export const applyThumbnailStudioAddInput = (
  draft: StudioTemplateDocument,
  type: StudioInputType,
): StudioInputDefinition => {
  const input = createThumbnailStudioInputDefinition(draft, type);
  draft.inputs[input.id] = input;
  normalizeThumbnailStudioInputPresentation(draft);
  return input;
};

/** input 속성을 수정하되 id와 Thumbnail의 global scope는 command가 보존한다. */
export const applyThumbnailStudioUpdateInput = (
  draft: StudioTemplateDocument,
  inputId: string,
  updater: (input: StudioInputDefinition) => StudioInputDefinition,
): StudioInputDefinition | null => {
  const current = draft.inputs[inputId];
  if (!current || current.scope !== "global") return null;

  const next = cloneStudioInputDefinition(
    updater(cloneStudioInputDefinition(current)),
  );
  next.id = inputId;
  next.scope = "global";
  draft.inputs[inputId] = next;
  normalizeThumbnailStudioInputPresentation(draft);
  return next;
};

/** input을 삭제한다. consumer 해제와 preview materialize는 후속 binding command가 담당한다. */
export const applyThumbnailStudioDeleteInput = (
  draft: StudioTemplateDocument,
  inputId: string,
): StudioInputDefinition | null => {
  const input = draft.inputs[inputId];
  if (!input || input.scope !== "global") return null;

  delete draft.inputs[inputId];
  normalizeThumbnailStudioInputPresentation(draft);
  return input;
};

const ensureUniqueSelectOptions = (
  input: StudioSelectInputDefinition,
): StudioSelectInputDefinition => {
  const usedValues = new Set<string>();
  const valueMap = new Map<string, string>();
  const options = input.options.map((option) => {
    const originalValue = option.value;
    let value = originalValue;
    let suffix = 2;
    while (usedValues.has(value)) {
      value = `${originalValue}-${suffix}`;
      suffix += 1;
    }
    usedValues.add(value);
    valueMap.set(originalValue, value);
    return { ...option, value };
  });

  const defaultValue = input.defaultValue
    ? (valueMap.get(input.defaultValue) ?? input.defaultValue)
    : undefined;

  return { ...input, options, defaultValue };
};

/** input을 복제하고 새 id를 발급한다. 기존 node binding은 복제하지 않는다. */
export const applyThumbnailStudioDuplicateInput = (
  draft: StudioTemplateDocument,
  inputId: string,
): StudioInputDefinition | null => {
  const current = draft.inputs[inputId];
  if (!current || current.scope !== "global") return null;

  let nextId = createStudioId("input");
  while (draft.inputs[nextId]) nextId = createStudioId("input");

  let duplicate = cloneStudioInputDefinition(current);
  duplicate.id = nextId;
  duplicate.label = `${current.label} Copy`;
  duplicate.presentation = {
    ...(current.presentation ?? {}),
    order: getNextThumbnailStudioInputOrder(draft),
  };
  if (duplicate.type === "select") {
    duplicate = ensureUniqueSelectOptions(duplicate);
  }

  draft.inputs[nextId] = duplicate;
  normalizeThumbnailStudioInputPresentation(draft);
  return duplicate;
};

const writeThumbnailStudioInputOrder = (
  draft: StudioTemplateDocument,
  orderedInputIds: readonly string[],
): boolean => {
  const inputs = getThumbnailStudioInputDefinitions(draft);
  if (inputs.length === 0) return false;

  const inputById = new Map(inputs.map((input) => [input.id, input]));
  const orderedIds = [
    ...orderedInputIds.filter(
      (inputId, index, ids) =>
        inputById.has(inputId) && ids.indexOf(inputId) === index,
    ),
    ...inputs
      .map((input) => input.id)
      .filter((inputId) => !orderedInputIds.includes(inputId)),
  ];

  orderedIds.forEach((inputId, order) => {
    const input = inputById.get(inputId);
    if (!input) return;
    input.presentation = { ...(input.presentation ?? {}), order };
  });

  return true;
};

/** drag 종료 시 전체 global input order를 한 번에 0부터 다시 쓴다. */
export const applyThumbnailStudioInputOrder = (
  draft: StudioTemplateDocument,
  orderedInputIds: readonly string[],
): boolean => writeThumbnailStudioInputOrder(draft, orderedInputIds);

/** 한 input을 원하는 표시 위치로 옮긴다. */
export const applyThumbnailStudioMoveInput = (
  draft: StudioTemplateDocument,
  inputId: string,
  targetIndex: number,
): boolean => {
  const inputIds = getThumbnailStudioInputDefinitions(draft).map(
    (input) => input.id,
  );
  const currentIndex = inputIds.indexOf(inputId);
  if (currentIndex < 0) return false;

  const nextIds = inputIds.filter((id) => id !== inputId);
  const boundedIndex = Math.max(0, Math.min(targetIndex, nextIds.length));
  nextIds.splice(boundedIndex, 0, inputId);
  return writeThumbnailStudioInputOrder(draft, nextIds);
};

/** input을 ungrouped 또는 지정 group으로 이동한다. */
export const applyThumbnailStudioSetInputGroup = (
  draft: StudioTemplateDocument,
  inputId: string,
  groupId: string | null,
): boolean => {
  const input = draft.inputs[inputId];
  if (!input || input.scope !== "global") return false;

  const normalizedGroupId = groupId?.trim() || null;
  input.presentation = { ...(input.presentation ?? {}) };
  if (normalizedGroupId) {
    input.presentation.groupId = normalizedGroupId;
  } else {
    delete input.presentation.groupId;
  }
  normalizeThumbnailStudioInputPresentation(draft);
  return true;
};

/** group 이름 변경은 모든 member를 한 command transaction에서 바꾼다. */
export const applyThumbnailStudioRenameInputGroup = (
  draft: StudioTemplateDocument,
  fromGroupId: string,
  toGroupId: string,
): number => {
  const from = fromGroupId.trim();
  const to = toGroupId.trim();
  if (!from || !to) return 0;

  let changedCount = 0;
  getThumbnailStudioInputDefinitions(draft).forEach((input) => {
    if (getThumbnailStudioInputGroupId(input) !== from) return;
    input.presentation = { ...(input.presentation ?? {}), groupId: to };
    changedCount += 1;
  });

  if (changedCount > 0) normalizeThumbnailStudioInputPresentation(draft);
  return changedCount;
};
