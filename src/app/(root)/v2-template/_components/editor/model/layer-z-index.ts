import {
  V2TemplateGraphNode,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
} from "@/types/time-table/template-render-config";
import {
  ROOT_LAYER_PARENT_ID,
  SectionStyleResolverMap,
  TemplateLayoutShape,
} from "./style-section-resolver";

const v2_ORDER_KEY_STEP = 1024;
const v2_SCENE_ROOT_LAYER_ID = "scene-root";

const v2_toUnique = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  ids.forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    next.push(id);
  });
  return next;
};

const v2_createOrderKey = (index: number): string => {
  return String((index + 1) * v2_ORDER_KEY_STEP).padStart(10, "0");
};

const v2_buildGraphNodeByLayerId = (
  graph: V2TemplateNodeGraph
): Map<string, V2TemplateGraphNode> => {
  const next = new Map<string, V2TemplateGraphNode>();
  Object.values(graph.nodes).forEach((node) => {
    if (!node.layerId || next.has(node.layerId)) return;
    next.set(node.layerId, node);
  });
  return next;
};

const v2_reorderSubsetPreservingOthers = ({
  existingIds,
  reorderedSubsetIds,
}: {
  existingIds: string[];
  reorderedSubsetIds: string[];
}): string[] => {
  const normalizedSubsetIds = v2_toUnique(reorderedSubsetIds);
  const subsetSet = new Set(normalizedSubsetIds);
  let cursor = 0;
  const next = existingIds.map((id) => {
    if (!subsetSet.has(id)) return id;
    const replacement = normalizedSubsetIds[cursor];
    cursor += 1;
    return replacement ?? id;
  });

  normalizedSubsetIds.forEach((id) => {
    if (!next.includes(id)) {
      next.push(id);
    }
  });

  return next;
};

export const buildOrderedLayerIdsByParent = ({
  layers,
  layout,
  resolverMap,
  graph,
}: {
  layers: V2TemplateLayerNode[];
  layout: TemplateLayoutShape;
  resolverMap: SectionStyleResolverMap;
  graph: V2TemplateNodeGraph;
}): Record<string, string[]> => {
  void layout;

  const isVirtualOnlySiblings = (nodes: V2TemplateLayerNode[]): boolean =>
    nodes.length > 0 && nodes.every((node) => node.isVirtual === true);
  const hasCardLayerSibling = (nodes: V2TemplateLayerNode[]): boolean =>
    nodes.some((node) => {
      const sectionKey = node.sectionKey?.trim();
      return Boolean(sectionKey && resolverMap[sectionKey]?.scope === "card");
    });

  const getFallbackDisplayNodes = (
    nodes: V2TemplateLayerNode[]
  ): V2TemplateLayerNode[] => {
    if (isVirtualOnlySiblings(nodes) || hasCardLayerSibling(nodes)) {
      return [...nodes].reverse();
    }
    return [...nodes];
  };

  const graphNodeByLayerId = v2_buildGraphNodeByLayerId(graph);
  const getParentGraphId = (parentId: string): string | null | undefined => {
    if (parentId === ROOT_LAYER_PARENT_ID || parentId === v2_SCENE_ROOT_LAYER_ID) {
      return null;
    }
    return graphNodeByLayerId.get(parentId)?.id;
  };
  const getDisplayOrderedIdsByGraph = (
    parentId: string,
    nodes: V2TemplateLayerNode[]
  ): string[] | null => {
    if (isVirtualOnlySiblings(nodes)) return null;
    const parentGraphId = getParentGraphId(parentId);
    if (parentGraphId === undefined) return null;

    const layerNodeById = new Map(nodes.map((node) => [node.id, node]));
    const renderOrderedGraphNodeIds =
      parentGraphId === null
        ? graph.rootNodeIds
        : (graph.nodes[parentGraphId]?.childIds ?? []);
    const renderOrderedLayerIds = renderOrderedGraphNodeIds
      .map((graphNodeId) => graph.nodes[graphNodeId])
      .map((graphNode) => graphNode?.layerId ?? graphNode?.id)
      .filter((layerId): layerId is string => {
        return typeof layerId === "string" && layerNodeById.has(layerId);
      });

    if (renderOrderedLayerIds.length === 0) return null;

    const orderedSet = new Set(renderOrderedLayerIds);
    const remaining = nodes
      .map((node) => node.id)
      .filter((id) => !orderedSet.has(id));
    return [...renderOrderedLayerIds, ...remaining].reverse();
  };

  const orderedMap: Record<string, string[]> = {};
  const buildOrder = (nodes: V2TemplateLayerNode[], parentId: string) => {
    const orderedByGraph = getDisplayOrderedIdsByGraph(parentId, nodes);
    const sorted = orderedByGraph
      ? orderedByGraph
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter((node): node is V2TemplateLayerNode => Boolean(node))
      : getFallbackDisplayNodes(nodes);

    orderedMap[parentId] = sorted.map((node) => node.id);
    sorted.forEach((node) => {
      if (!node.children?.length) return;
      buildOrder(node.children, node.id);
    });
  };

  buildOrder(layers, ROOT_LAYER_PARENT_ID);
  return orderedMap;
};

export const applyReorderedLayerOrderKey = ({
  graph,
  parentId,
  orderedIds,
}: {
  graph: V2TemplateNodeGraph;
  parentId: string;
  orderedIds: string[];
}): V2TemplateNodeGraph => {
  const normalizedOrderedIds = v2_toUnique(orderedIds);
  if (normalizedOrderedIds.length === 0) return graph;

  const graphNodeByLayerId = v2_buildGraphNodeByLayerId(graph);
  const parentGraphId =
    parentId === ROOT_LAYER_PARENT_ID || parentId === v2_SCENE_ROOT_LAYER_ID
      ? null
      : graphNodeByLayerId.get(parentId)?.id;
  if (parentId !== ROOT_LAYER_PARENT_ID && parentGraphId === undefined) {
    return graph;
  }

  const orderedGraphNodeIds = normalizedOrderedIds
    .map((layerId) => graphNodeByLayerId.get(layerId))
    .filter(
      (node): node is V2TemplateGraphNode =>
        node !== undefined && node.parentId === parentGraphId
    )
    .map((node) => node.id);

  if (orderedGraphNodeIds.length === 0) return graph;
  const renderOrderedGraphNodeIds = [...orderedGraphNodeIds].reverse();

  const existingSiblingGraphNodeIds =
    parentGraphId == null
      ? graph.rootNodeIds
      : (graph.nodes[parentGraphId]?.childIds ?? []);
  const nextSiblingGraphNodeIds = v2_reorderSubsetPreservingOthers({
    existingIds: existingSiblingGraphNodeIds,
    reorderedSubsetIds: renderOrderedGraphNodeIds,
  });

  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...graph.nodes,
  };
  let hasNodeChanges = false;

  nextSiblingGraphNodeIds.forEach((graphNodeId, index) => {
    const node = graph.nodes[graphNodeId];
    if (!node) return;
    const prevSiblingId =
      index === 0 ? null : (nextSiblingGraphNodeIds[index - 1] ?? null);
    const nextOrder = {
      model: "orderKey" as const,
      orderKey: v2_createOrderKey(index),
      prevSiblingId,
    };
    if (
      node.order?.model === nextOrder.model &&
      node.order?.orderKey === nextOrder.orderKey &&
      node.order?.prevSiblingId === nextOrder.prevSiblingId
    ) {
      return;
    }
    nextNodes[graphNodeId] = {
      ...node,
      order: nextOrder,
    };
    hasNodeChanges = true;
  });

  if (parentGraphId == null) {
    const nextRootNodeIds = nextSiblingGraphNodeIds;
    const rootChanged =
      nextRootNodeIds.length !== graph.rootNodeIds.length ||
      nextRootNodeIds.some((id, index) => id !== graph.rootNodeIds[index]);
    if (!hasNodeChanges && !rootChanged) return graph;
    return {
      ...graph,
      nodes: nextNodes,
      rootNodeIds: rootChanged ? nextRootNodeIds : graph.rootNodeIds,
    };
  }

  const parentNode = graph.nodes[parentGraphId];
  if (!parentNode) {
    return hasNodeChanges
      ? {
          ...graph,
          nodes: nextNodes,
        }
      : graph;
  }

  const nextChildIds = nextSiblingGraphNodeIds;
  const childChanged =
    nextChildIds.length !== parentNode.childIds.length ||
    nextChildIds.some((id, index) => id !== parentNode.childIds[index]);

  if (!hasNodeChanges && !childChanged) return graph;

  return {
    ...graph,
    nodes: {
      ...nextNodes,
      [parentNode.id]: childChanged
        ? {
            ...parentNode,
            childIds: nextChildIds,
          }
        : nextNodes[parentNode.id] ?? parentNode,
    },
  };
};
