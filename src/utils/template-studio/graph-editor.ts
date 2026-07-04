import {
  StudioNodeId,
  StudioTemplateDocument,
} from "@/types/template-studio";

export type StudioGraphDropPosition = "before" | "after" | "inside";

export interface StudioGraphMoveParams {
  sourceNodeIds: StudioNodeId[];
  targetNodeId: StudioNodeId;
  position: StudioGraphDropPosition;
  preserveCanvasPosition?: boolean;
}

export interface StudioGraphMoveValidation {
  ok: boolean;
  reason?: string;
  sourceNodeIds: StudioNodeId[];
  targetParentId: StudioNodeId | null;
}

const getSiblingIds = (
  document: StudioTemplateDocument,
  parentId: StudioNodeId | null,
): StudioNodeId[] | null => {
  if (!parentId) return document.graph.rootNodeIds;
  return document.graph.nodes[parentId]?.childIds ?? null;
};

const getGraphOrderIndex = (
  document: StudioTemplateDocument,
): Map<StudioNodeId, number> => {
  const orderIndex = new Map<StudioNodeId, number>();
  let index = 0;

  const visit = (nodeId: StudioNodeId) => {
    if (orderIndex.has(nodeId)) return;
    const node = document.graph.nodes[nodeId];
    if (!node) return;

    orderIndex.set(nodeId, index);
    index += 1;
    node.childIds.forEach(visit);
  };

  document.graph.rootNodeIds.forEach(visit);
  Object.keys(document.graph.nodes).forEach(visit);

  return orderIndex;
};

const getNodeStyleNumber = (
  document: StudioTemplateDocument,
  nodeId: StudioNodeId,
  key: "left" | "top",
): number => {
  const node = document.graph.nodes[nodeId];
  const value = node?.styleId ? document.styles[node.styleId]?.[key] : undefined;
  return typeof value === "number" ? value : 0;
};

const getParentCanvasOffset = (
  document: StudioTemplateDocument,
  parentId: StudioNodeId | null,
): { left: number; top: number } => {
  let currentId = parentId;
  const visited = new Set<StudioNodeId>();
  const offset = { left: 0, top: 0 };

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    offset.left += getNodeStyleNumber(document, currentId, "left");
    offset.top += getNodeStyleNumber(document, currentId, "top");
    currentId = document.graph.nodes[currentId]?.parentId ?? null;
  }

  return offset;
};

const getNodeCanvasOffset = (
  document: StudioTemplateDocument,
  nodeId: StudioNodeId,
): { left: number; top: number } => {
  const node = document.graph.nodes[nodeId];
  const parentOffset = getParentCanvasOffset(document, node?.parentId ?? null);

  return {
    left: parentOffset.left + getNodeStyleNumber(document, nodeId, "left"),
    top: parentOffset.top + getNodeStyleNumber(document, nodeId, "top"),
  };
};

export const isStudioGraphNodeDescendant = (
  document: StudioTemplateDocument,
  nodeId: StudioNodeId,
  ancestorId: StudioNodeId,
): boolean => {
  let current = document.graph.nodes[nodeId];
  const visited = new Set<StudioNodeId>();

  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    if (visited.has(current.parentId)) return false;
    visited.add(current.parentId);
    current = document.graph.nodes[current.parentId];
  }

  return false;
};

export const getStudioTopLevelGraphNodeIds = (
  document: StudioTemplateDocument,
  nodeIds: StudioNodeId[],
): StudioNodeId[] => {
  const requested = new Set(nodeIds);
  const orderIndex = getGraphOrderIndex(document);

  return Array.from(requested)
    .filter((nodeId) => {
      if (!document.graph.nodes[nodeId]) return false;
      return !Array.from(requested).some(
        (otherNodeId) =>
          otherNodeId !== nodeId &&
          isStudioGraphNodeDescendant(document, nodeId, otherNodeId),
      );
    })
    .sort(
      (a, b) =>
        (orderIndex.get(a) ?? Number.MAX_SAFE_INTEGER) -
        (orderIndex.get(b) ?? Number.MAX_SAFE_INTEGER),
    );
};

export const validateStudioGraphMove = (
  document: StudioTemplateDocument,
  params: StudioGraphMoveParams,
): StudioGraphMoveValidation => {
  const targetNode = document.graph.nodes[params.targetNodeId];
  const sourceNodeIds = getStudioTopLevelGraphNodeIds(
    document,
    params.sourceNodeIds,
  );

  if (sourceNodeIds.length === 0) {
    return {
      ok: false,
      reason: "No object selected",
      sourceNodeIds,
      targetParentId: null,
    };
  }

  if (!targetNode) {
    return {
      ok: false,
      reason: "Drop target is missing",
      sourceNodeIds,
      targetParentId: null,
    };
  }

  if (sourceNodeIds.includes(params.targetNodeId)) {
    return {
      ok: false,
      reason: "Cannot drop an object onto itself",
      sourceNodeIds,
      targetParentId: targetNode.parentId,
    };
  }

  if (params.position === "inside" && targetNode.type !== "group") {
    return {
      ok: false,
      reason: "Only groups can contain objects",
      sourceNodeIds,
      targetParentId: targetNode.id,
    };
  }

  if (params.position === "inside" && targetNode.locked) {
    return {
      ok: false,
      reason: "Cannot move objects into a locked group",
      sourceNodeIds,
      targetParentId: targetNode.id,
    };
  }

  const targetParentId =
    params.position === "inside" ? targetNode.id : targetNode.parentId;

  if (
    targetParentId &&
    sourceNodeIds.some(
      (sourceNodeId) =>
        targetParentId === sourceNodeId ||
        isStudioGraphNodeDescendant(document, targetParentId, sourceNodeId),
    )
  ) {
    return {
      ok: false,
      reason: "Cannot move an object inside itself or its children",
      sourceNodeIds,
      targetParentId,
    };
  }

  const targetSiblings = getSiblingIds(document, targetParentId);
  if (!targetSiblings) {
    return {
      ok: false,
      reason: "Target parent is missing",
      sourceNodeIds,
      targetParentId,
    };
  }

  if (params.position !== "inside" && !targetSiblings.includes(targetNode.id)) {
    return {
      ok: false,
      reason: "Drop target is not in its parent",
      sourceNodeIds,
      targetParentId,
    };
  }

  return {
    ok: true,
    sourceNodeIds,
    targetParentId,
  };
};

export const moveStudioGraphNodes = (
  document: StudioTemplateDocument,
  params: StudioGraphMoveParams,
): StudioGraphMoveValidation => {
  const validation = validateStudioGraphMove(document, params);
  if (!validation.ok) return validation;

  const sourceSet = new Set(validation.sourceNodeIds);
  const sourceCanvasOffsets = params.preserveCanvasPosition
    ? new Map(
        validation.sourceNodeIds.map((sourceNodeId) => [
          sourceNodeId,
          getNodeCanvasOffset(document, sourceNodeId),
        ]),
      )
    : null;
  const targetParentCanvasOffset = params.preserveCanvasPosition
    ? getParentCanvasOffset(document, validation.targetParentId)
    : null;

  document.graph.rootNodeIds = document.graph.rootNodeIds.filter(
    (nodeId) => !sourceSet.has(nodeId),
  );
  Object.values(document.graph.nodes).forEach((node) => {
    node.childIds = node.childIds.filter((childId) => !sourceSet.has(childId));
  });

  const targetSiblings = getSiblingIds(document, validation.targetParentId);
  if (!targetSiblings) {
    return {
      ...validation,
      ok: false,
      reason: "Target parent is missing",
    };
  }

  let insertIndex = targetSiblings.length;
  if (params.position !== "inside") {
    const targetIndex = targetSiblings.indexOf(params.targetNodeId);
    if (targetIndex < 0) {
      return {
        ...validation,
        ok: false,
        reason: "Drop target is not in its parent",
      };
    }
    insertIndex = params.position === "before" ? targetIndex : targetIndex + 1;
  }

  validation.sourceNodeIds.forEach((sourceNodeId) => {
    const sourceNode = document.graph.nodes[sourceNodeId];
    if (!sourceNode) return;
    sourceNode.parentId = validation.targetParentId;

    if (
      sourceNode.styleId &&
      sourceCanvasOffsets &&
      targetParentCanvasOffset
    ) {
      const style = document.styles[sourceNode.styleId];
      const sourceCanvasOffset = sourceCanvasOffsets.get(sourceNodeId);
      if (style && sourceCanvasOffset) {
        if (typeof style.left === "number") {
          style.left = sourceCanvasOffset.left - targetParentCanvasOffset.left;
        }
        if (typeof style.top === "number") {
          style.top = sourceCanvasOffset.top - targetParentCanvasOffset.top;
        }
      }
    }
  });
  targetSiblings.splice(insertIndex, 0, ...validation.sourceNodeIds);

  return validation;
};
