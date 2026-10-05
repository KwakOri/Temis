import type {
  StudioInputDefinition,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type {
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "@/types/studio-timetable-graph";
import { getStudioBindingInputId } from "./binding-resolver";
import { getStudioBuiltinField } from "./builtin-fields";
import { resolveStudioTimetableDayComponent } from "./component-sets";
import { getStudioBindingFormatFeatures } from "./binding-format";
import { isStudioFillParentLayout } from "./object-layout";
import { resolveStudioTimetableLayerTarget } from "./timetable-commands";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "./timetable-graph-presets";
import {
  requireStudioTimetableGraphDocument,
  isStudioTimetableGraphNode,
} from "./timetable-graph-commands";
import {
  getStudioTimetableNodeStyle,
  getStudioTimetableNodeExtension,
} from "./timetable-graph-queries";
import {
  getStudioTimetableEditingVariantValue,
  type StudioTimetableEditingVariants,
  type StudioTimetableEditorFeatures,
} from "./timetable-selection";

export const getStudioTimetableGraphEditorFeatures = (
  node: StudioTimetableGraphNode | null,
  extension: StudioTimetableNodeExtension = {},
): StudioTimetableEditorFeatures => {
  const isPreset = (key: string) =>
    extension.presetId === key || node?.meta?.exception?.semanticKey === key;
  const formats = getStudioBindingFormatFeatures(node?.binding);
  const text = node?.type === "text" || node?.type === "flexibleText";
  const leaf = node && node.type !== "group";
  const assetSlots: StudioTimetableEditorFeatures["assetSlots"] = [];
  if (leaf && isPreset("weeklyMemo")) assetSlots.push("background");
  if (node?.type === "image" && extension.profileRole)
    assetSlots.push("profileChild");
  if (node?.type === "image" && extension.structuredRole === "background")
    assetSlots.push("structuredBackground");
  if (leaf && isPreset("artistProfileText"))
    assetSlots.push("artistProfileText");
  if (leaf && isPreset("topObject")) assetSlots.push("topObject");
  if (isPreset("board")) assetSlots.push("board");
  return {
    resizable: Boolean(node && !extension.generator),
    dateFormatMode: text ? formats.dateFormatMode : null,
    dayLabelFormat: Boolean(text && formats.dayLabelFormat),
    timeFormat: Boolean(text && formats.timeFormat),
    assetSlots,
    mask: node?.type === "image" && extension.profileRole === "userImage",
    assetLayout: Boolean(leaf && isPreset("artistProfileText")),
    runtimeMode: Boolean(node?.variantSet && isPreset("topObject")),
  };
};

export const resolveStudioTimetableGraphEditingState = (
  document: StudioTemplateDocument,
  node: StudioTimetableGraphNode | null,
  choices: StudioTimetableEditingVariants = {},
) => {
  const graph = requireStudioTimetableGraphDocument(document);
  const visited = new Set<string>();
  let current = node;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.variantSet) {
      const value = getStudioTimetableEditingVariantValue(current, choices)!;
      return {
        owner: current,
        extension: getStudioTimetableNodeExtension(graph, current.id),
        value,
        label:
          current.variantSet.options.find((option) => option.value === value)
            ?.label ?? value,
      };
    }
    current = current.parentId
      ? (graph.graph.nodes[current.parentId] ?? null)
      : null;
  }
  return null;
};

export const resolveStudioTimetableGraphSelection = (
  document: StudioTemplateDocument,
  selectedLayerId: string | null,
  choices: StudioTimetableEditingVariants = {},
) => {
  const graph = requireStudioTimetableGraphDocument(document);
  const object =
    selectedLayerId && isStudioTimetableGraphNode(graph, selectedLayerId)
      ? (graph.graph.nodes[selectedLayerId] ?? null)
      : null;
  const target = selectedLayerId
    ? resolveStudioTimetableLayerTarget(selectedLayerId)
    : null;
  const dayId = target?.kind === "dayCard" ? target.dayId : null;
  const textObject =
    object?.type === "text" || object?.type === "flexibleText" ? object : null;
  const inputId = textObject
    ? getStudioBindingInputId(textObject.binding)
    : null;
  const extension = object
    ? getStudioTimetableNodeExtension(graph, object.id)
    : {};
  return {
    object,
    style: object ? getStudioTimetableNodeStyle(graph, object) : {},
    extension,
    target,
    features: getStudioTimetableGraphEditorFeatures(object, extension),
    editingState: resolveStudioTimetableGraphEditingState(
      graph,
      object,
      choices,
    ),
    dayId,
    day: dayId ? (graph.domains.timetable.days[dayId] ?? null) : null,
    dayComponentResolution: dayId
      ? resolveStudioTimetableDayComponent(graph, dayId)
      : null,
    textObject,
    boundInput: inputId
      ? (graph.inputs[inputId] ?? null)
      : (null as StudioInputDefinition | null),
    builtinField:
      textObject?.binding?.kind === "builtinField"
        ? getStudioBuiltinField(textObject.binding.fieldId)
        : null,
    textValue:
      textObject?.binding?.kind === "staticText"
        ? textObject.binding.value
        : (textObject?.label ?? ""),
    isFitParent: isStudioFillParentLayout(object?.layoutMode),
    isDayCards: selectedLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  };
};

export type StudioTimetableGraphSelection = ReturnType<
  typeof resolveStudioTimetableGraphSelection
>;
