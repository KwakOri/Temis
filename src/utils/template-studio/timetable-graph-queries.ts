import type {
  StudioAssetSlot,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type {
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "@/types/studio-timetable-graph";
import { getStudioRuntimeInputValue } from "./input-values";
import type { StudioRuntimeValues } from "@/types/template-studio";
import { requireStudioTimetableGraphDocument } from "./timetable-graph-commands";

/** Read referenced records without allocating or changing the document. */
export const getStudioTimetableNodeStyle = (
  document: StudioTemplateDocument,
  node: StudioTimetableGraphNode,
): StudioStyleRecord => document.styles[node.styleId ?? ""] ?? {};

export const getStudioTimetableNodeExtension = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioTimetableNodeExtension =>
  requireStudioTimetableGraphDocument(document).domains.timetable
    .nodeExtensions[nodeId] ?? {};

export const getStudioTimetableNodeAsset = (
  node: StudioTimetableGraphNode,
): StudioAssetSlot | undefined => {
  if (node.type !== "image") return node.assetSlots?.inlineDecoration;
  if (node.binding?.kind === "inputImage")
    return { inputId: node.binding.inputId, fit: node.fit };
  if (node.binding?.kind === "staticAsset")
    return { assetId: node.binding.assetId, fit: node.fit };
  return node.fit ? { fit: node.fit } : undefined;
};

export const getStudioTimetableNodeChildIds = (
  node: StudioTimetableGraphNode,
  value?: string | null,
): string[] => {
  const variants = node.variantSet;
  if (!variants) return node.childIds;
  const selected = variants.options.some((option) => option.value === value)
    ? value!
    : variants.defaultValue;
  const root = variants.rootByValue[selected];
  return root ? [root] : [];
};

export const getStudioTimetableNodeRuntimeVariant = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  node: StudioTimetableGraphNode,
): string | null => {
  const variants = node.variantSet;
  if (!variants) return null;
  if (variants.mode === "always")
    return variants.options.some((option) => option.value === "on")
      ? "on"
      : variants.defaultValue;
  const input = variants.inputId
    ? document.inputs[variants.inputId]
    : undefined;
  const value = input
    ? getStudioRuntimeInputValue(input, values)
    : variants.defaultValue;
  return variants.options.some((option) => option.value === value)
    ? String(value)
    : variants.defaultValue;
};

export const getStudioTimetableNodeIds = (
  document: StudioTemplateDocument,
): Set<string> => {
  if (document.version !== 8) return new Set();
  const graph = requireStudioTimetableGraphDocument(document);
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    graph.graph.nodes[id]?.childIds.forEach(visit);
  };
  graph.domains.timetable.rootNodeIds.forEach(visit);
  return ids;
};

export const getStudioCardsRootNodeIds = (
  document: StudioTemplateDocument,
): string[] => {
  const weeklyIds = getStudioTimetableNodeIds(document);
  return document.graph.rootNodeIds.filter((id) => !weeklyIds.has(id));
};
