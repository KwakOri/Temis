import type {
  StudioInputDefinition,
  StudioSelectInputDefinition,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";

export interface StudioRuntimeGlobalInputGroup {
  id: string;
  label: string;
  toggleInput?: StudioSelectInputDefinition;
  contentInputs: StudioInputDefinition[];
  firstInputIndex: number;
}

export interface StudioRuntimeOnOffOptionValues {
  onValue: string;
  offValue: string;
}

export const getStudioRuntimeOnOffOptionValues = (
  input: StudioInputDefinition,
): StudioRuntimeOnOffOptionValues | null => {
  if (input.type !== "select" || input.options.length !== 2) return null;

  const optionByNormalizedValue = new Map(
    input.options.map((option) => [option.value.trim().toLowerCase(), option]),
  );
  const onOption = optionByNormalizedValue.get("on");
  const offOption = optionByNormalizedValue.get("off");
  if (!onOption || !offOption) return null;

  return {
    onValue: onOption.value,
    offValue: offOption.value,
  };
};

const collectObjectInputIds = ({
  objectId,
  objects,
  visited,
  inputIds,
}: {
  objectId: string;
  objects: Record<string, StudioTimetableCompositionObject>;
  visited: Set<string>;
  inputIds: Set<string>;
}) => {
  if (visited.has(objectId)) return;
  visited.add(objectId);

  const object = objects[objectId];
  if (!object) return;

  const binding = object.binding;
  if (binding && "inputId" in binding) inputIds.add(binding.inputId);

  Object.values(object.assetSlots ?? {}).forEach((slot) => {
    if (slot.inputId) inputIds.add(slot.inputId);
  });

  if (object.variantSet?.inputId) inputIds.add(object.variantSet.inputId);
  Object.values(object.variantSet?.rootByValue ?? {}).forEach((rootId) => {
    if (!rootId) return;
    collectObjectInputIds({ objectId: rootId, objects, visited, inputIds });
  });

  (object.childIds ?? []).forEach((childId) =>
    collectObjectInputIds({ objectId: childId, objects, visited, inputIds }),
  );
};

const stripStatusSuffix = (label: string): string =>
  label.replace(/\s+status$/i, "").trim();

export const getStudioRuntimeGlobalInputGroups = (
  document: StudioTemplateDocument,
): StudioRuntimeGlobalInputGroup[] => {
  const globalInputs = Object.values(document.inputs).filter(
    (input) => input.scope === "global",
  );
  const inputIndex = new Map(
    globalInputs.map((input, index) => [input.id, index]),
  );
  const assignedInputIds = new Set<string>();
  const groups: StudioRuntimeGlobalInputGroup[] = [];
  const objects = document.domains?.timetable?.composition?.objects ?? {};

  Object.values(objects).forEach((object) => {
    const toggleInputId = object.variantSet?.inputId;
    if (!toggleInputId || assignedInputIds.has(toggleInputId)) return;

    const toggleInput = document.inputs[toggleInputId];
    if (
      !toggleInput ||
      toggleInput.scope !== "global" ||
      toggleInput.type !== "select" ||
      !getStudioRuntimeOnOffOptionValues(toggleInput)
    ) {
      return;
    }

    const relatedInputIds = new Set<string>();
    const visited = new Set<string>();
    Object.values(object.variantSet?.rootByValue ?? {}).forEach((rootId) => {
      if (!rootId) return;
      collectObjectInputIds({
        objectId: rootId,
        objects,
        visited,
        inputIds: relatedInputIds,
      });
    });
    relatedInputIds.delete(toggleInputId);

    const contentInputs = globalInputs.filter(
      (input) =>
        relatedInputIds.has(input.id) && !assignedInputIds.has(input.id),
    );
    const groupInputIndexes = [toggleInput, ...contentInputs].map(
      (input) => inputIndex.get(input.id) ?? Number.MAX_SAFE_INTEGER,
    );

    groups.push({
      id: `composition:${object.id}`,
      label: object.label || stripStatusSuffix(toggleInput.label),
      toggleInput,
      contentInputs,
      firstInputIndex: Math.min(...groupInputIndexes),
    });
    assignedInputIds.add(toggleInput.id);
    contentInputs.forEach((input) => assignedInputIds.add(input.id));
  });

  globalInputs.forEach((input) => {
    if (
      assignedInputIds.has(input.id) ||
      input.type !== "select" ||
      !getStudioRuntimeOnOffOptionValues(input)
    ) {
      return;
    }

    const baseLabel = stripStatusSuffix(input.label);
    if (baseLabel === input.label) return;

    const contentInput = globalInputs.find(
      (candidate) =>
        !assignedInputIds.has(candidate.id) &&
        candidate.id !== input.id &&
        candidate.label.trim().toLocaleLowerCase() ===
          baseLabel.toLocaleLowerCase(),
    );
    if (!contentInput) return;

    groups.push({
      id: `label:${input.id}:${contentInput.id}`,
      label: contentInput.label,
      toggleInput: input,
      contentInputs: [contentInput],
      firstInputIndex: Math.min(
        inputIndex.get(input.id) ?? Number.MAX_SAFE_INTEGER,
        inputIndex.get(contentInput.id) ?? Number.MAX_SAFE_INTEGER,
      ),
    });
    assignedInputIds.add(input.id);
    assignedInputIds.add(contentInput.id);
  });

  globalInputs.forEach((input) => {
    if (assignedInputIds.has(input.id)) return;

    const onOffValues = getStudioRuntimeOnOffOptionValues(input);
    groups.push({
      id: `input:${input.id}`,
      label: onOffValues ? stripStatusSuffix(input.label) : input.label,
      toggleInput: input.type === "select" && onOffValues ? input : undefined,
      contentInputs: onOffValues ? [] : [input],
      firstInputIndex: inputIndex.get(input.id) ?? Number.MAX_SAFE_INTEGER,
    });
    assignedInputIds.add(input.id);
  });

  return groups.sort((left, right) => {
    const leftPriority = left.contentInputs.some(
      (input) => input.type === "image",
    )
      ? 0
      : 1;
    const rightPriority = right.contentInputs.some(
      (input) => input.type === "image",
    )
      ? 0
      : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.firstInputIndex - right.firstInputIndex;
  });
};
