import {
  V2TemplateGraphNode,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
  V2TemplateStyleRecord,
} from "@/types/time-table/template-render-config";
import {
  ROOT_LAYER_PARENT_ID,
  SectionStyleResolverMap,
  TemplateLayoutShape,
  collectLayerNodeMap,
  getStyleRecordBySectionKey,
  setStyleRecordBySectionKey,
} from "./style-section-resolver";
import {
  V2PointerOrderNode,
  v2_pointerOrderAdapter,
} from "./order-adapter";

const v2_ORDER_KEY_STEP = 1024;

const parseZIndex = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

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
  const getSectionZIndex = (sectionKey?: string): number | undefined => {
    if (!sectionKey) return undefined;
    const style = getStyleRecordBySectionKey(layout, sectionKey, resolverMap);
    return parseZIndex(style?.zIndex);
  };

  const zIndexCache = new Map<string, number>();
  const getNodeZIndex = (node: V2TemplateLayerNode): number => {
    const cached = zIndexCache.get(node.id);
    if (cached !== undefined) return cached;

    const own = getSectionZIndex(node.sectionKey);
    let value = own ?? Number.NEGATIVE_INFINITY;

    if (node.children?.length) {
      node.children.forEach((child) => {
        value = Math.max(value, getNodeZIndex(child));
      });
    }

    const normalizedValue = Number.isFinite(value) ? value : 0;
    zIndexCache.set(node.id, normalizedValue);
    return normalizedValue;
  };

  const sortNodes = (nodes: V2TemplateLayerNode[]): V2TemplateLayerNode[] => {
    return [...nodes].sort((a, b) => {
      const aZ = getNodeZIndex(a);
      const bZ = getNodeZIndex(b);
      if (aZ === bZ) {
        return nodes.indexOf(a) - nodes.indexOf(b);
      }
      return bZ - aZ;
    });
  };

  const graphNodeByLayerId = v2_buildGraphNodeByLayerId(graph);
  const getOrderedIdsByGraph = (
    parentId: string,
    nodes: V2TemplateLayerNode[]
  ): string[] | null => {
    const parentGraphId =
      parentId === ROOT_LAYER_PARENT_ID
        ? null
        : graphNodeByLayerId.get(parentId)?.id;
    if (parentId !== ROOT_LAYER_PARENT_ID && parentGraphId === undefined) return null;

    const defaultIds = nodes.map((node) => node.id);
    const entries = defaultIds
      .map((layerId, index) => {
        const graphNode = graphNodeByLayerId.get(layerId);
        if (!graphNode || graphNode.parentId !== parentGraphId) return null;
        return {
          layerId,
          index,
          graphNode,
        };
      })
      .filter(
        (
          entry
        ): entry is {
          layerId: string;
          index: number;
          graphNode: V2TemplateGraphNode;
        } => Boolean(entry)
      );

    if (entries.length === 0) return null;

    const allOrderKey = entries.every(
      (entry) =>
        entry.graphNode.order?.model === "orderKey" &&
        typeof entry.graphNode.order.orderKey === "string" &&
        entry.graphNode.order.orderKey.trim().length > 0
    );
    if (allOrderKey) {
      const orderedByOrderKey = [...entries]
        .sort((a, b) => {
          const aKey = a.graphNode.order?.orderKey ?? "";
          const bKey = b.graphNode.order?.orderKey ?? "";
          if (aKey === bKey) return a.index - b.index;
          return aKey < bKey ? -1 : 1;
        })
        .map((entry) => entry.layerId);
      const orderedSet = new Set(orderedByOrderKey);
      const remaining = defaultIds.filter((id) => !orderedSet.has(id));
      return [...orderedByOrderKey, ...remaining];
    }

    const allPointer = entries.every(
      (entry) => entry.graphNode.order?.model === "pointer"
    );
    if (allPointer) {
      const pointerNodes: V2PointerOrderNode[] = entries.map((entry) => ({
        id: entry.graphNode.id,
        parentId: parentId,
        prevSiblingId: entry.graphNode.order?.prevSiblingId ?? null,
      }));
      const orderedGraphNodeIds =
        v2_pointerOrderAdapter.buildOrderedIdsByParent(pointerNodes)[parentId] ?? [];
      const layerIdByGraphNodeId = new Map(
        entries.map((entry) => [entry.graphNode.id, entry.layerId])
      );
      const orderedByPointer = orderedGraphNodeIds
        .map((graphNodeId) => layerIdByGraphNodeId.get(graphNodeId))
        .filter((layerId): layerId is string => Boolean(layerId));
      const orderedSet = new Set(orderedByPointer);
      const remaining = defaultIds.filter((id) => !orderedSet.has(id));
      return [...orderedByPointer, ...remaining];
    }

    const siblingSequence =
      parentGraphId === null
        ? graph.rootNodeIds
        : parentGraphId
          ? (graph.nodes[parentGraphId]?.childIds ?? [])
          : [];
    const orderedByGraphSequence = [...entries]
      .sort((a, b) => {
        const indexA = siblingSequence.indexOf(a.graphNode.id);
        const indexB = siblingSequence.indexOf(b.graphNode.id);
        const normalizedA = indexA >= 0 ? indexA : Number.MAX_SAFE_INTEGER;
        const normalizedB = indexB >= 0 ? indexB : Number.MAX_SAFE_INTEGER;
        if (normalizedA === normalizedB) return a.index - b.index;
        return normalizedA - normalizedB;
      })
      .map((entry) => entry.layerId);
    const orderedSet = new Set(orderedByGraphSequence);
    const remaining = defaultIds.filter((id) => !orderedSet.has(id));
    return [...orderedByGraphSequence, ...remaining];
  };

  const orderedMap: Record<string, string[]> = {};
  const buildOrder = (nodes: V2TemplateLayerNode[], parentId: string) => {
    const orderedByGraph = getOrderedIdsByGraph(parentId, nodes);
    const sorted = orderedByGraph
      ? orderedByGraph
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter((node): node is V2TemplateLayerNode => Boolean(node))
      : sortNodes(nodes);

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
    parentId === ROOT_LAYER_PARENT_ID ? null : graphNodeByLayerId.get(parentId)?.id;
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

  const existingSiblingGraphNodeIds =
    parentGraphId == null
      ? graph.rootNodeIds
      : (graph.nodes[parentGraphId]?.childIds ?? []);
  const nextSiblingGraphNodeIds = v2_reorderSubsetPreservingOthers({
    existingIds: existingSiblingGraphNodeIds,
    reorderedSubsetIds: orderedGraphNodeIds,
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

export const applyReorderedLayerZIndex = ({
  layout,
  layers,
  resolverMap,
  parentId,
  orderedIds,
}: {
  layout: TemplateLayoutShape;
  layers: V2TemplateLayerNode[];
  resolverMap: SectionStyleResolverMap;
  parentId: string;
  orderedIds: string[];
}): TemplateLayoutShape => {
  if (orderedIds.length === 0) return layout;

  const normalizedOrderedIds = v2_toUnique(orderedIds);

  const zMap = new Map<string, number>();
  normalizedOrderedIds.forEach((id, index) => {
    zMap.set(id, (normalizedOrderedIds.length - index) * 10);
  });

  let nextLayout: TemplateLayoutShape = {
    ...layout,
    card: {
      ...layout.card,
    },
  };
  const layerNodeMap = collectLayerNodeMap(layers);
  const parentNode =
    parentId === ROOT_LAYER_PARENT_ID ? null : layerNodeMap.get(parentId) ?? null;
  const siblings =
    parentId === ROOT_LAYER_PARENT_ID
      ? layers
      : (parentNode?.children ?? []);
  const siblingIdSet = new Set(siblings.map((sibling) => sibling.id));

  const setStyleZIndex = (
    style: V2TemplateStyleRecord | undefined,
    zIndex: number
  ): V2TemplateStyleRecord => {
    return {
      ...(style ?? {}),
      zIndex,
    };
  };

  const setSectionZIndex = (sectionKey: string, zIndex: number) => {
    const currentStyle = getStyleRecordBySectionKey(nextLayout, sectionKey, resolverMap);
    nextLayout = setStyleRecordBySectionKey(
      nextLayout,
      sectionKey,
      setStyleZIndex(currentStyle, zIndex),
      resolverMap
    );
  };

  const applyNodeZIndex = (node: V2TemplateLayerNode, zIndex: number) => {
    if (node.sectionKey) {
      setSectionZIndex(node.sectionKey, zIndex);
      return;
    }
    if (node.children?.length) {
      node.children.forEach((child) => applyNodeZIndex(child, zIndex));
    }
  };

  normalizedOrderedIds.forEach((nodeId) => {
    if (!siblingIdSet.has(nodeId)) return;
    const zIndex = zMap.get(nodeId);
    if (zIndex === undefined) return;
    const node = layerNodeMap.get(nodeId);
    if (!node) return;
    applyNodeZIndex(node, zIndex);
  });

  return nextLayout;
};
