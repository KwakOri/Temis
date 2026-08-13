import type {
  StudioInputDefinition,
  StudioInputScope,
  StudioInputType,
  StudioSelectOption,
  StudioTemplateDocument,
  StudioTimetableComposition,
} from "@/types/template-studio";
import { getStudioBindingInputId } from "@/utils/template-studio/binding-resolver";
import { createStudioId } from "@/utils/template-studio/id";

/** 입력 종류의 표시 이름. */
export const getStudioInputTypeLabel = (type: StudioInputType): string => {
  if (type === "text") return "Text";
  if (type === "image") return "Image";
  return "Select";
};

/** 에셋 자리 이름을 사람이 읽는 형태로 바꾼다. */
export const formatStudioSlotName = (slotName: string): string =>
  slotName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

/** 새 입력 정의. 종류마다 눈에 보이는 기본값으로 시작한다. */
export const createStudioInputDefinition = (
  type: StudioInputType,
  scope: StudioInputScope,
): StudioInputDefinition => {
  const base = {
    id: createStudioId("input"),
    scope,
    label: `New ${getStudioInputTypeLabel(type)} Input`,
  };

  if (type === "text") {
    return {
      ...base,
      type: "text",
      placeholder: "Enter text",
      defaultValue: "New value",
      maxLength: 48,
    };
  }

  if (type === "image") {
    return {
      ...base,
      type: "image",
      placeholder: "Paste image URL",
      defaultUrl: "",
    };
  }

  return {
    ...base,
    type: "select",
    defaultValue: "option-a",
    options: [
      { value: "option-a", label: "Option A" },
      { value: "option-b", label: "Option B" },
    ],
  };
};

/**
 * select 옵션의 값을 바꾼다.
 *
 * 옵션 값은 런타임 값과 노드의 옵션별 에셋 지도에서 키로 쓰인다. 그래서 값을
 * 바꿀 때 기본값과 에셋 지도의 키도 함께 옮겨야 한다. 이전 값을 준다.
 */
export const applyStudioSelectOptionValue = (
  draft: StudioTemplateDocument,
  inputId: string,
  optionIndex: number,
  value: string,
): { previousValue: string } | null => {
  const input = draft.inputs[inputId];
  if (!input || input.type !== "select") return null;

  const currentOption = input.options[optionIndex];
  if (!currentOption) return null;

  const previousValue = currentOption.value;
  const nextValue = value.trim();
  if (
    !nextValue ||
    input.options.some(
      (option, index) => index !== optionIndex && option.value === nextValue,
    )
  ) {
    return null;
  }
  if (previousValue === nextValue) return { previousValue };
  input.options = input.options.map((option, index) =>
    index === optionIndex ? { ...option, value: nextValue } : option,
  );

  if (input.defaultValue === previousValue) input.defaultValue = nextValue;

  Object.values(draft.graph.nodes).forEach((node) => {
    if (
      node.binding?.kind !== "selectAsset" ||
      node.binding.inputId !== inputId
    ) {
      return;
    }

    const mappedAssetId = node.binding.assetByOption[previousValue];
    delete node.binding.assetByOption[previousValue];
    node.binding.assetByOption[nextValue] = mappedAssetId ?? null;
  });

  return { previousValue };
};

/** select 옵션을 하나 더한다. 옵션별 에셋 지도에도 빈 자리를 만든다. */
export const applyStudioAddSelectOption = (
  draft: StudioTemplateDocument,
  inputId: string,
): StudioSelectOption | null => {
  const input = draft.inputs[inputId];
  if (!input || input.type !== "select") return null;

  const optionNumber = input.options.length + 1;
  const option: StudioSelectOption = {
    label: `Option ${optionNumber}`,
    value: `option-${optionNumber}`,
  };
  input.options = [...input.options, option];

  Object.values(draft.graph.nodes).forEach((node) => {
    if (
      node.binding?.kind === "selectAsset" &&
      node.binding.inputId === inputId
    ) {
      node.binding.assetByOption[option.value] = null;
    }
  });

  return option;
};

/**
 * select 옵션을 지운다.
 *
 * 마지막 하나는 남긴다. 지운 값이 기본값이었으면 첫 옵션으로 옮긴다. 런타임
 * 값을 옮길 수 있도록 지운 값과 새 기본값을 준다.
 */
export const applyStudioRemoveSelectOption = (
  draft: StudioTemplateDocument,
  inputId: string,
  optionIndex: number,
): { removedValue: string; nextDefaultValue: string } | null => {
  const input = draft.inputs[inputId];
  if (!input || input.type !== "select" || input.options.length <= 1) {
    return null;
  }

  const currentOption = input.options[optionIndex];
  if (!currentOption) return null;

  const removedValue = currentOption.value;
  const nextOptions = input.options.filter((_, index) => index !== optionIndex);
  input.options = nextOptions;

  if (!nextOptions.some((option) => option.value === input.defaultValue)) {
    input.defaultValue = nextOptions[0]?.value ?? "";
  }

  Object.values(draft.graph.nodes).forEach((node) => {
    if (
      node.binding?.kind === "selectAsset" &&
      node.binding.inputId === inputId
    ) {
      delete node.binding.assetByOption[removedValue];
    }
  });

  return {
    removedValue,
    nextDefaultValue: input.defaultValue ?? nextOptions[0]?.value ?? "",
  };
};

export interface StudioInputConsumerReference {
  id: string;
  workspaceMode: "cards" | "timetable";
  targetId: string;
  label: string;
  detail: string;
}

/**
 * 입력을 쓰는 곳 목록.
 *
 * 카드 그래프와 시간표 composition을 모두 훑어서 바인딩, 에셋 자리, 객체 상태
 * 세 경로를 모은다. 입력을 지우기 전에 어디서 쓰는지 보여주는 데 쓴다.
 */
export const collectStudioInputConsumers = (
  document: StudioTemplateDocument,
  composition: StudioTimetableComposition,
): Record<string, StudioInputConsumerReference[]> => {
  const consumers: Record<string, StudioInputConsumerReference[]> = {};

  const add = (inputId: string, reference: StudioInputConsumerReference) => {
    consumers[inputId] = [...(consumers[inputId] ?? []), reference];
  };

  Object.values(document.graph.nodes).forEach((node) => {
    const inputId = getStudioBindingInputId(node.binding);
    if (inputId) {
      add(inputId, {
        id: `cards:${node.id}:binding`,
        workspaceMode: "cards",
        targetId: node.id,
        label: node.label,
        detail: "Cards · Binding",
      });
    }

    Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
      if (!slot.inputId) return;
      add(slot.inputId, {
        id: `cards:${node.id}:slot:${slotName}`,
        workspaceMode: "cards",
        targetId: node.id,
        label: node.label,
        detail: `Cards · ${formatStudioSlotName(slotName)}`,
      });
    });
  });

  Object.values(composition.objects).forEach((object) => {
    if (object.variantSet?.inputId) {
      add(object.variantSet.inputId, {
        id: `timetable:${object.id}:variant`,
        workspaceMode: "timetable",
        targetId: object.id,
        label: object.label,
        detail: "Timetable · Object State",
      });
    }

    const inputId = getStudioBindingInputId(object.binding);
    if (inputId) {
      add(inputId, {
        id: `timetable:${object.id}:binding`,
        workspaceMode: "timetable",
        targetId: object.id,
        label: object.label,
        detail: "Timetable · Binding",
      });
    }

    Object.entries(object.assetSlots ?? {}).forEach(([slotName, slot]) => {
      if (!slot.inputId) return;
      add(slot.inputId, {
        id: `timetable:${object.id}:slot:${slotName}`,
        workspaceMode: "timetable",
        targetId: object.id,
        label: object.label,
        detail: `Timetable · ${formatStudioSlotName(slotName)}`,
      });
    });
  });

  return consumers;
};
