import type {
  StudioInputDefinition,
  StudioTemplateDocument,
} from "@/types/template-studio";

export interface ThumbnailStudioInputGroup {
  /** 빈 문자열과 누락된 groupId는 null로 표현한다. */
  groupId: string | null;
  inputs: StudioInputDefinition[];
  /** 정렬된 전체 input 목록에서 첫 member가 차지하는 위치. */
  firstInputIndex: number;
}

/** presentation.order가 없거나 유효하지 않을 때 정렬의 뒤로 보낸다. */
export const getStudioInputPresentationOrder = (
  input: StudioInputDefinition,
): number => {
  const order = input.presentation?.order;
  return typeof order === "number" && Number.isFinite(order)
    ? order
    : Number.POSITIVE_INFINITY;
};

/** groupId가 없거나 공백뿐이면 ungrouped로 취급한다. */
export const getThumbnailStudioInputGroupId = (
  input: StudioInputDefinition,
): string | null => {
  const groupId = input.presentation?.groupId;
  if (typeof groupId !== "string") return null;

  const normalized = groupId.trim();
  return normalized.length > 0 ? normalized : null;
};

/** order가 같거나 없는 input은 ID로 안정 정렬한다. */
export const sortThumbnailStudioInputs = (
  inputs: readonly StudioInputDefinition[],
): StudioInputDefinition[] =>
  [...inputs].sort((left, right) => {
    const leftOrder = getStudioInputPresentationOrder(left);
    const rightOrder = getStudioInputPresentationOrder(right);
    if (leftOrder < rightOrder) return -1;
    if (leftOrder > rightOrder) return 1;
    return left.id.localeCompare(right.id);
  });

/** Thumbnail UI에 노출할 수 있는 global input만 순서대로 반환한다. */
export const getThumbnailStudioInputDefinitions = (
  document: StudioTemplateDocument,
): StudioInputDefinition[] =>
  sortThumbnailStudioInputs(
    Object.values(document.inputs).filter((input) => input.scope === "global"),
  );

/** 정렬된 member의 첫 위치를 기준으로 group 순서를 만든다. */
export const getThumbnailStudioInputGroups = (
  document: StudioTemplateDocument,
): ThumbnailStudioInputGroup[] => {
  const groups = new Map<string | null, StudioInputDefinition[]>();
  const inputs = getThumbnailStudioInputDefinitions(document);

  inputs.forEach((input) => {
    const groupId = getThumbnailStudioInputGroupId(input);
    groups.set(groupId, [...(groups.get(groupId) ?? []), input]);
  });

  return [...groups.entries()].map(([groupId, groupInputs]) => ({
    groupId,
    inputs: groupInputs,
    firstInputIndex: inputs.findIndex(
      (input) => input.id === groupInputs[0]?.id,
    ),
  }));
};

/**
 * Thumbnail global input의 presentation을 canonical order로 정리한다.
 *
 * 입력 정의 자체는 그대로 두고 표시 순서와 groupId만 정리한다. day/entry 입력은
 * validator가 거부할 수 있도록 문서에서 제거하지 않는다.
 */
export const normalizeThumbnailStudioInputPresentation = (
  document: StudioTemplateDocument,
): boolean => {
  const inputs = getThumbnailStudioInputDefinitions(document);
  let changed = false;

  inputs.forEach((input, index) => {
    const previousPresentation = input.presentation;
    const nextPresentation = {
      ...(previousPresentation ?? {}),
      order: index,
    };
    const groupId = getThumbnailStudioInputGroupId(input);

    if (groupId) {
      nextPresentation.groupId = groupId;
    } else {
      delete nextPresentation.groupId;
    }

    if (
      previousPresentation?.order !== nextPresentation.order ||
      previousPresentation?.groupId !== nextPresentation.groupId ||
      !previousPresentation
    ) {
      changed = true;
    }

    input.presentation = nextPresentation;
  });

  return changed;
};
