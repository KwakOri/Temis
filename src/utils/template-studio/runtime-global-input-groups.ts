import { getStudioTimetableNodeIds } from "./timetable-graph-queries";
import type { StudioTimetableGraphNode } from "@/types/studio-timetable-graph";
import type {
  StudioInputDefinition,
  StudioSelectInputDefinition,
  StudioTemplateDocument,
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

export const getStudioRuntimeSuppressedInputIds = (
  document: StudioTemplateDocument,
): ReadonlySet<string> => {
  const suppressedInputIds = new Set<string>();
  const nodes: Record<string, StudioTimetableGraphNode> =
    document.version === 8
      ? Object.fromEntries(
          [...getStudioTimetableNodeIds(document)].map((id) => [
            id,
            document.graph.nodes[id] as StudioTimetableGraphNode,
          ]),
        )
      : {};

  Object.values(nodes).forEach((node) => {
    if (node.variantSet?.mode === "always" && node.variantSet.inputId) {
      suppressedInputIds.add(node.variantSet.inputId);
    }
  });

  return suppressedInputIds;
};

const collectNodeInputIds = ({
  nodeId,
  nodes,
  visited,
  inputIds,
}: {
  nodeId: string;
  nodes: Record<string, StudioTimetableGraphNode>;
  visited: Set<string>;
  inputIds: Set<string>;
}) => {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);

  const node = nodes[nodeId];
  if (!node) return;

  const binding = node.binding;
  if (binding && "inputId" in binding) inputIds.add(binding.inputId);

  Object.values(node.assetSlots ?? {}).forEach((slot) => {
    if (slot.inputId) inputIds.add(slot.inputId);
  });

  if (node.variantSet?.inputId) inputIds.add(node.variantSet.inputId);
  Object.values(node.variantSet?.rootByValue ?? {}).forEach((rootId) => {
    if (!rootId) return;
    collectNodeInputIds({ nodeId: rootId, nodes, visited, inputIds });
  });

  (node.childIds ?? []).forEach((childId) =>
    collectNodeInputIds({ nodeId: childId, nodes, visited, inputIds }),
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
  const suppressedInputIds = getStudioRuntimeSuppressedInputIds(document);
  const groups: StudioRuntimeGlobalInputGroup[] = [];
  const nodes: Record<string, StudioTimetableGraphNode> =
    document.version === 8
      ? Object.fromEntries(
          [...getStudioTimetableNodeIds(document)].map((id) => [
            id,
            document.graph.nodes[id] as StudioTimetableGraphNode,
          ]),
        )
      : {};

  Object.values(nodes).forEach((node) => {
    if (node.variantSet?.mode === "always") {
      if (node.variantSet.inputId) {
        assignedInputIds.add(node.variantSet.inputId);
      }
      return;
    }

    const toggleInputId = node.variantSet?.inputId;
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
    Object.values(node.variantSet?.rootByValue ?? {}).forEach((rootId) => {
      if (!rootId) return;
      collectNodeInputIds({
        nodeId: rootId,
        nodes,
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
      id: `timetable:${node.id}`,
      label: node.label || stripStatusSuffix(toggleInput.label),
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
    if (assignedInputIds.has(input.id) || suppressedInputIds.has(input.id)) {
      return;
    }

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
