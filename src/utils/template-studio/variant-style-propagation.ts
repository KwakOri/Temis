import type {
  StudioGraphNode,
  StudioNodeId,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";
import { STUDIO_TEXT_WRAP_MODE_STYLE_KEY } from "@/utils/template-studio/text-wrap";

export type StudioVariantStyleScope =
  "layout" | "typography" | "appearance" | "visual" | "all";

const LAYOUT_STYLE_KEYS = new Set([
  "position",
  "left",
  "top",
  "right",
  "bottom",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "rotateDeg",
  "transformOrigin",
  "display",
  "alignItems",
  "justifyContent",
  "gap",
  "overflow",
  "objectPosition",
]);

const TYPOGRAPHY_STYLE_KEYS = new Set([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "justifyContent",
  "textDecoration",
  "textTransform",
  "whiteSpace",
  "wordBreak",
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
]);

export const pickStudioVariantStyleScope = (
  style: StudioStyleRecord,
  scope: StudioVariantStyleScope,
): StudioStyleRecord => {
  if (scope === "all") return { ...style };
  return Object.fromEntries(
    Object.entries(style).filter(([key]) => {
      if (scope === "layout") return LAYOUT_STYLE_KEYS.has(key);
      if (scope === "typography") return TYPOGRAPHY_STYLE_KEYS.has(key);
      if (scope === "visual") {
        return !LAYOUT_STYLE_KEYS.has(key) || TYPOGRAPHY_STYLE_KEYS.has(key);
      }
      return !LAYOUT_STYLE_KEYS.has(key) && !TYPOGRAPHY_STYLE_KEYS.has(key);
    }),
  );
};

const getSubtreeNodeIds = (
  document: StudioTemplateDocument,
  rootNodeId: StudioNodeId,
): StudioNodeId[] => {
  const result: StudioNodeId[] = [];
  const visited = new Set<StudioNodeId>();
  const visit = (nodeId: StudioNodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = document.graph.nodes[nodeId];
    if (!node) return;
    result.push(nodeId);
    node.childIds.forEach(visit);
  };
  visit(rootNodeId);
  return result;
};

const getEntrySlotIndex = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): 0 | 1 | null => {
  let current: StudioGraphNode | undefined = node;
  const visited = new Set<StudioNodeId>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.meta?.entrySlot) return current.meta.entrySlot.index;
    current = current.parentId
      ? document.graph.nodes[current.parentId]
      : undefined;
  }
  return null;
};

const getTargetNodes = ({
  applyToAllMultiSlots,
  document,
  sourceNode,
  sourceSlotIndex,
  targetRootNodeId,
  targetStatusId,
}: {
  applyToAllMultiSlots: boolean;
  document: StudioTemplateDocument;
  sourceNode: StudioGraphNode;
  sourceSlotIndex: 0 | 1 | null;
  targetRootNodeId: StudioNodeId;
  targetStatusId: StudioTimetableStatusId;
}): StudioGraphNode[] => {
  const syncKey = sourceNode.meta?.variantSyncKey;
  if (!syncKey) return [];
  return getSubtreeNodeIds(document, targetRootNodeId)
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter((candidate): candidate is StudioGraphNode => {
      if (!candidate || candidate.meta?.variantSyncKey !== syncKey)
        return false;
      const targetSlotIndex = getEntrySlotIndex(document, candidate);
      if (
        applyToAllMultiSlots &&
        targetStatusId === "multi" &&
        sourceSlotIndex !== null
      ) {
        return targetSlotIndex !== null;
      }
      return targetSlotIndex === sourceSlotIndex;
    });
};

export interface ApplyStudioVariantStyleOptions {
  component: StudioTimetableComponentDefinition;
  sourceNodeId: StudioNodeId;
  sourceStatusId: StudioTimetableStatusId;
  targetStatusIds: StudioTimetableStatusId[];
  scope: StudioVariantStyleScope;
  includeDescendants?: boolean;
  applyToAllMultiSlots?: boolean;
}

export interface ApplyStudioVariantStyleResult {
  appliedNodeCount: number;
  appliedStatusIds: StudioTimetableStatusId[];
  skippedStatusIds: StudioTimetableStatusId[];
}

export const applyStudioVariantStyle = (
  document: StudioTemplateDocument,
  options: ApplyStudioVariantStyleOptions,
): ApplyStudioVariantStyleResult => {
  const sourceVariant = options.component.variants[options.sourceStatusId];
  const sourceNode = document.graph.nodes[options.sourceNodeId];
  if (!sourceVariant || !sourceNode) {
    return {
      appliedNodeCount: 0,
      appliedStatusIds: [],
      skippedStatusIds: [...options.targetStatusIds],
    };
  }

  const sourceNodeIds = options.includeDescendants
    ? getSubtreeNodeIds(document, sourceNode.id)
    : [sourceNode.id];
  const appliedStatusIds = new Set<StudioTimetableStatusId>();
  const skippedStatusIds = new Set<StudioTimetableStatusId>();
  let appliedNodeCount = 0;

  options.targetStatusIds.forEach((targetStatusId) => {
    const targetVariant = options.component.variants[targetStatusId];
    if (!targetVariant || targetStatusId === options.sourceStatusId) {
      skippedStatusIds.add(targetStatusId);
      return;
    }
    let appliedForStatus = 0;

    sourceNodeIds.forEach((sourceNodeId) => {
      const currentSourceNode = document.graph.nodes[sourceNodeId];
      if (!currentSourceNode?.styleId) return;
      const sourceStyle = document.styles[currentSourceNode.styleId];
      if (!sourceStyle) return;
      const sourceSlotIndex = getEntrySlotIndex(document, currentSourceNode);
      const targetNodes = getTargetNodes({
        applyToAllMultiSlots:
          Boolean(options.applyToAllMultiSlots) && options.scope !== "layout",
        document,
        sourceNode: currentSourceNode,
        sourceSlotIndex,
        targetRootNodeId: targetVariant.rootNodeId,
        targetStatusId,
      });

      targetNodes.forEach((targetNode) => {
        if (!targetNode.styleId) {
          targetNode.styleId = createStudioId("style");
          document.styles[targetNode.styleId] = {};
        }
        const patch = pickStudioVariantStyleScope(sourceStyle, options.scope);
        document.styles[targetNode.styleId] = {
          ...(document.styles[targetNode.styleId] ?? {}),
          ...patch,
        };
        appliedNodeCount += 1;
        appliedForStatus += 1;
      });
    });

    if (appliedForStatus > 0) appliedStatusIds.add(targetStatusId);
    else skippedStatusIds.add(targetStatusId);
  });

  return {
    appliedNodeCount,
    appliedStatusIds: Array.from(appliedStatusIds),
    skippedStatusIds: Array.from(skippedStatusIds),
  };
};
