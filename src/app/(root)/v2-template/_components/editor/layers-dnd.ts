import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";

type V2LayerNode = V2TemplateLayerNode;

export const v2_ROOT_LAYER_PARENT_ID = "__root__" as const;
export type V2LayerParentId = typeof v2_ROOT_LAYER_PARENT_ID | string;
export type V2DropPosition = "before" | "after" | "inside";

const v2_toOrderMap = (
  parentId: V2LayerParentId,
  nodes: V2LayerNode[],
  map: Record<string, string[]>
) => {
  map[parentId] = nodes.map((node) => node.id);
  nodes.forEach((node) => {
    if (!node.children?.length) return;
    v2_toOrderMap(node.id, node.children, map);
  });
};

export const v2_createInitialOrderMap = (
  layerTree: V2LayerNode[]
): Record<string, string[]> => {
  const initialOrderMap: Record<string, string[]> = {};
  v2_toOrderMap(v2_ROOT_LAYER_PARENT_ID, layerTree, initialOrderMap);
  return initialOrderMap;
};

export const v2_findNodeById = (
  nodes: V2LayerNode[],
  nodeId: string
): V2LayerNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (!node.children?.length) continue;
    const found = v2_findNodeById(node.children, nodeId);
    if (found) return found;
  }
  return null;
};

export const v2_isDescendantLayer = ({
  nodes,
  ancestorId,
  targetId,
}: {
  nodes: V2LayerNode[];
  ancestorId: string;
  targetId: string;
}): boolean => {
  const ancestorNode = v2_findNodeById(nodes, ancestorId);
  if (!ancestorNode?.children?.length) return false;

  const queue = [...ancestorNode.children];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.id === targetId) return true;
    if (current.children?.length) {
      queue.push(...current.children);
    }
  }

  return false;
};

export const v2_moveLayerNode = (
  prevIds: string[],
  dragId: string,
  dropId: string,
  dropPosition: "before" | "after"
): string[] => {
  const dragIndex = prevIds.indexOf(dragId);
  const dropIndex = prevIds.indexOf(dropId);

  if (dragIndex < 0 || dropIndex < 0 || dragId === dropId) {
    return prevIds;
  }

  const nextIds = [...prevIds];
  nextIds.splice(dragIndex, 1);

  const targetIndex = nextIds.indexOf(dropId);
  if (targetIndex < 0) return prevIds;
  const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
  nextIds.splice(insertIndex, 0, dragId);

  return nextIds;
};

export const v2_moveLayerBlock = ({
  prevIds,
  draggedIds,
  dropId,
  dropPosition,
}: {
  prevIds: string[];
  draggedIds: string[];
  dropId: string;
  dropPosition: "before" | "after";
}): string[] => {
  if (draggedIds.length === 0) return prevIds;
  if (draggedIds.includes(dropId)) return prevIds;

  const draggedSet = new Set(draggedIds);
  const remaining = prevIds.filter((id) => !draggedSet.has(id));
  const targetIndex = remaining.indexOf(dropId);
  if (targetIndex < 0) return prevIds;

  const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
  const next = [...remaining];
  next.splice(insertIndex, 0, ...draggedIds);
  return next;
};

export const v2_getOrderedChildren = ({
  orderedNodeIdsByParent,
  parentId,
  nodes,
}: {
  orderedNodeIdsByParent: Record<string, string[]>;
  parentId: V2LayerParentId;
  nodes: V2LayerNode[];
}): V2LayerNode[] => {
  const orderedIds = orderedNodeIdsByParent[parentId];
  if (!orderedIds?.length) return nodes;

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const orderedNodes: V2LayerNode[] = [];

  orderedIds.forEach((id) => {
    const node = nodeMap.get(id);
    if (!node) return;
    orderedNodes.push(node);
    nodeMap.delete(id);
  });

  nodeMap.forEach((node) => {
    orderedNodes.push(node);
  });

  return orderedNodes;
};
