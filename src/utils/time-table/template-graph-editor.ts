import {
  V2TemplateGraphNode,
  V2TemplateNodeGraph,
} from "@/types/time-table/template-render-config";
import { v2_normalizePointerOrderInGraph } from "@/utils/time-table/template-graph-order";

const v2_cloneGraphNodes = (
  nodes: Record<string, V2TemplateGraphNode>
): Record<string, V2TemplateGraphNode> => {
  const next: Record<string, V2TemplateGraphNode> = {};
  Object.entries(nodes).forEach(([id, node]) => {
    next[id] = {
      ...node,
      childIds: [...node.childIds],
      ...(node.order ? { order: { ...node.order } } : {}),
      ...(node.styles ? { styles: { ...node.styles } } : {}),
      ...(node.meta ? { meta: { ...node.meta } } : {}),
      ...(node.binding ? { binding: { ...node.binding } } : {}),
    };
  });
  return next;
};

const v2_finalizeGraph = (graph: V2TemplateNodeGraph): V2TemplateNodeGraph => {
  return v2_normalizePointerOrderInGraph(graph);
};

const v2_clampIndex = (value: number, maxLength: number): number => {
  if (!Number.isFinite(value)) return maxLength;
  if (value < 0) return 0;
  if (value > maxLength) return maxLength;
  return Math.floor(value);
};

const v2_isDescendantNode = ({
  graph,
  ancestorId,
  nodeId,
}: {
  graph: V2TemplateNodeGraph;
  ancestorId: string;
  nodeId: string;
}): boolean => {
  if (ancestorId === nodeId) return true;

  const queue = [ancestorId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = graph.nodes[currentId];
    if (!currentNode) continue;
    if (currentNode.childIds.includes(nodeId)) return true;

    currentNode.childIds.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  return false;
};

const v2_detachFromCurrentParent = (
  graph: V2TemplateNodeGraph,
  nodeId: string
): V2TemplateNodeGraph => {
  const node = graph.nodes[nodeId];
  if (!node) return graph;
  if (node.parentId === null) {
    return {
      ...graph,
      rootNodeIds: graph.rootNodeIds.filter((id) => id !== nodeId),
    };
  }

  const parent = graph.nodes[node.parentId];
  if (!parent) return graph;
  return {
    ...graph,
    nodes: {
      ...graph.nodes,
      [parent.id]: {
        ...parent,
        childIds: parent.childIds.filter((id) => id !== nodeId),
      },
    },
  };
};

export const v2_graphUpdateNode = (
  graph: V2TemplateNodeGraph,
  nodeId: string,
  updater: (node: V2TemplateGraphNode) => V2TemplateGraphNode
): V2TemplateNodeGraph => {
  const current = graph.nodes[nodeId];
  if (!current) return graph;
  const nextNode = updater(current);
  if (nextNode === current) return graph;
  return v2_finalizeGraph({
    ...graph,
    nodes: {
      ...graph.nodes,
      [nodeId]: nextNode,
    },
  });
};

export const v2_graphInsertSiblingAfter = ({
  graph,
  anchorNodeId,
  newNode,
}: {
  graph: V2TemplateNodeGraph;
  anchorNodeId: string;
  newNode: V2TemplateGraphNode;
}): V2TemplateNodeGraph => {
  const anchor = graph.nodes[anchorNodeId];
  if (!anchor) return graph;
  if (graph.nodes[newNode.id]) return graph;

  const nextNodes = {
    ...graph.nodes,
    [newNode.id]: {
      ...newNode,
      parentId: anchor.parentId,
      childIds: [...newNode.childIds],
    },
  };

  if (anchor.parentId === null) {
    const index = graph.rootNodeIds.indexOf(anchorNodeId);
    const nextRootNodeIds = [...graph.rootNodeIds];
    nextRootNodeIds.splice(index + 1, 0, newNode.id);
    return v2_finalizeGraph({
      ...graph,
      nodes: nextNodes,
      rootNodeIds: nextRootNodeIds,
    });
  }

  const parent = graph.nodes[anchor.parentId];
  if (!parent) return graph;
  const index = parent.childIds.indexOf(anchorNodeId);
  const nextChildIds = [...parent.childIds];
  nextChildIds.splice(index + 1, 0, newNode.id);

  return v2_finalizeGraph({
    ...graph,
    nodes: {
      ...nextNodes,
      [parent.id]: {
        ...parent,
        childIds: nextChildIds,
      },
    },
  });
};

export const v2_graphAppendChild = ({
  graph,
  parentId,
  newNode,
}: {
  graph: V2TemplateNodeGraph;
  parentId: string;
  newNode: V2TemplateGraphNode;
}): V2TemplateNodeGraph => {
  const parent = graph.nodes[parentId];
  if (!parent) return graph;
  if (graph.nodes[newNode.id]) return graph;

  return v2_finalizeGraph({
    ...graph,
    nodes: {
      ...graph.nodes,
      [parent.id]: {
        ...parent,
        childIds: [...parent.childIds, newNode.id],
      },
      [newNode.id]: {
        ...newNode,
        parentId,
        childIds: [...newNode.childIds],
      },
    },
  });
};

export const v2_graphReorderNodeWithinParent = ({
  graph,
  nodeId,
  direction,
}: {
  graph: V2TemplateNodeGraph;
  nodeId: string;
  direction: "up" | "down";
}): V2TemplateNodeGraph => {
  const node = graph.nodes[nodeId];
  if (!node) return graph;

  if (node.parentId === null) {
    const currentIndex = graph.rootNodeIds.indexOf(nodeId);
    if (currentIndex < 0) return graph;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= graph.rootNodeIds.length) return graph;
    const nextRootNodeIds = [...graph.rootNodeIds];
    const [moved] = nextRootNodeIds.splice(currentIndex, 1);
    if (!moved) return graph;
    nextRootNodeIds.splice(targetIndex, 0, moved);
    return v2_finalizeGraph({
      ...graph,
      rootNodeIds: nextRootNodeIds,
    });
  }

  const parent = graph.nodes[node.parentId];
  if (!parent) return graph;
  const currentIndex = parent.childIds.indexOf(nodeId);
  if (currentIndex < 0) return graph;
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= parent.childIds.length) return graph;
  const nextChildIds = [...parent.childIds];
  const [moved] = nextChildIds.splice(currentIndex, 1);
  if (!moved) return graph;
  nextChildIds.splice(targetIndex, 0, moved);
  return v2_finalizeGraph({
    ...graph,
    nodes: {
      ...graph.nodes,
      [parent.id]: {
        ...parent,
        childIds: nextChildIds,
      },
    },
  });
};

export const v2_graphMoveNode = ({
  graph,
  nodeId,
  targetParentId,
  targetIndex,
}: {
  graph: V2TemplateNodeGraph;
  nodeId: string;
  targetParentId: string | null;
  targetIndex?: number;
}): V2TemplateNodeGraph => {
  const currentNode = graph.nodes[nodeId];
  if (!currentNode) return graph;

  if (targetParentId !== null) {
    const targetParent = graph.nodes[targetParentId];
    if (!targetParent) return graph;
    if (targetParent.id === nodeId) return graph;
    if (
      v2_isDescendantNode({
        graph,
        ancestorId: nodeId,
        nodeId: targetParent.id,
      })
    ) {
      return graph;
    }
  }

  const nextGraph = v2_detachFromCurrentParent(graph, nodeId);
  const detachedNode = nextGraph.nodes[nodeId];
  if (!detachedNode) return graph;

  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...nextGraph.nodes,
  };

  if (targetParentId === null) {
    const nextRootNodeIds = [...nextGraph.rootNodeIds];
    const insertIndex = v2_clampIndex(targetIndex ?? nextRootNodeIds.length, nextRootNodeIds.length);
    nextRootNodeIds.splice(insertIndex, 0, nodeId);
    nextNodes[nodeId] = {
      ...detachedNode,
      parentId: null,
    };
    return v2_finalizeGraph({
      ...nextGraph,
      nodes: nextNodes,
      rootNodeIds: nextRootNodeIds,
    });
  }

  const targetParent = nextNodes[targetParentId];
  if (!targetParent) return graph;

  const nextChildIds = [...targetParent.childIds];
  const insertIndex = v2_clampIndex(targetIndex ?? nextChildIds.length, nextChildIds.length);
  nextChildIds.splice(insertIndex, 0, nodeId);

  nextNodes[targetParent.id] = {
    ...targetParent,
    childIds: nextChildIds,
  };
  nextNodes[nodeId] = {
    ...detachedNode,
    parentId: targetParent.id,
  };

  return v2_finalizeGraph({
    ...nextGraph,
    nodes: nextNodes,
  });
};

export const v2_graphRemoveNodeSubtree = (
  graph: V2TemplateNodeGraph,
  nodeId: string
): V2TemplateNodeGraph => {
  if (!graph.nodes[nodeId]) return graph;

  const nextNodes = v2_cloneGraphNodes(graph.nodes);
  const nextComponentDefinitions = { ...graph.componentDefinitions };

  const queue = [nodeId];
  const nodeIdsToDelete = new Set<string>();
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;
    const current = nextNodes[currentId];
    if (!current) continue;
    nodeIdsToDelete.add(currentId);
    queue.push(...current.childIds);
  }

  const detached = v2_detachFromCurrentParent(
    {
      ...graph,
      nodes: nextNodes,
      componentDefinitions: nextComponentDefinitions,
    },
    nodeId
  );

  nodeIdsToDelete.forEach((id) => {
    delete nextNodes[id];
  });
  Object.entries(nextComponentDefinitions).forEach(([componentId, definition]) => {
    if (nodeIdsToDelete.has(definition.rootNodeId)) {
      delete nextComponentDefinitions[componentId];
    }
  });

  return v2_finalizeGraph({
    ...detached,
    nodes: nextNodes,
    componentDefinitions: nextComponentDefinitions,
  });
};
