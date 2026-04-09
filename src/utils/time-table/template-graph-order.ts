import {
  V2TemplateGraphNode,
  V2TemplateGraphNodeOrder,
  V2TemplateNodeGraph,
} from "@/types/time-table/template-render-config";

const v2_ROOT_PARENT_KEY = "__root__";

const v2_toParentKey = (parentId: string | null): string => {
  return parentId === null ? v2_ROOT_PARENT_KEY : parentId;
};

const v2_toParentId = (parentKey: string): string | null => {
  return parentKey === v2_ROOT_PARENT_KEY ? null : parentKey;
};

const v2_isOrderEqual = (
  a: V2TemplateGraphNodeOrder | undefined,
  b: V2TemplateGraphNodeOrder
): boolean => {
  if (!a) return false;
  return (
    a.model === b.model &&
    a.prevSiblingId === b.prevSiblingId &&
    a.orderKey === b.orderKey
  );
};

const v2_createPointerOrder = (
  prevSiblingId: string | null
): V2TemplateGraphNodeOrder => {
  return {
    model: "pointer",
    prevSiblingId,
  };
};

const v2_ORDER_KEY_STEP = 1024;

const v2_createOrderKey = (index: number): string => {
  return String((index + 1) * v2_ORDER_KEY_STEP).padStart(10, "0");
};

export const v2_normalizePointerOrderInGraph = (
  graph: V2TemplateNodeGraph
): V2TemplateNodeGraph => {
  const validNodeIds = new Set(Object.keys(graph.nodes));
  if (validNodeIds.size === 0) return graph;

  const orderedIdsByParent = new Map<string, string[]>();
  const pushSequence = (parentId: string | null, ids: string[]) => {
    if (ids.length === 0) return;
    const parentKey = v2_toParentKey(parentId);
    const current = orderedIdsByParent.get(parentKey) ?? [];
    const next = [...current];
    const seen = new Set(current);

    ids.forEach((id) => {
      if (!validNodeIds.has(id) || seen.has(id)) return;
      seen.add(id);
      next.push(id);
    });

    orderedIdsByParent.set(parentKey, next);
  };

  pushSequence(
    null,
    graph.rootNodeIds.filter((id) => {
      const node = graph.nodes[id];
      return Boolean(node && node.parentId === null);
    })
  );

  Object.values(graph.nodes).forEach((parentNode) => {
    pushSequence(
      parentNode.id,
      parentNode.childIds.filter((childId) => {
        const childNode = graph.nodes[childId];
        return Boolean(childNode && childNode.parentId === parentNode.id);
      })
    );
  });

  const alreadyPlacedIds = new Set<string>();
  orderedIdsByParent.forEach((ids) => {
    ids.forEach((id) => alreadyPlacedIds.add(id));
  });

  const fallbackIdsByParent = new Map<string, string[]>();
  Object.values(graph.nodes).forEach((node) => {
    if (alreadyPlacedIds.has(node.id)) return;
    const parentKey = v2_toParentKey(node.parentId);
    const current = fallbackIdsByParent.get(parentKey) ?? [];
    current.push(node.id);
    fallbackIdsByParent.set(parentKey, current);
  });

  fallbackIdsByParent.forEach((ids, parentKey) => {
    pushSequence(parentKey === v2_ROOT_PARENT_KEY ? null : parentKey, [...ids].sort());
  });

  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...graph.nodes,
  };
  let hasChanges = false;

  orderedIdsByParent.forEach((ids) => {
    ids.forEach((id, index) => {
      const node = graph.nodes[id];
      if (!node) return;

      const currentOrder = node.order;
      const hasValidOrderKey =
        currentOrder?.model === "orderKey" &&
        typeof currentOrder.orderKey === "string" &&
        currentOrder.orderKey.trim().length > 0;

      const nextOrder = hasValidOrderKey
        ? {
            model: "orderKey" as const,
            orderKey: currentOrder.orderKey,
            ...(currentOrder.prevSiblingId !== undefined
              ? { prevSiblingId: currentOrder.prevSiblingId }
              : {}),
          }
        : v2_createPointerOrder(index === 0 ? null : (ids[index - 1] ?? null));

      if (v2_isOrderEqual(currentOrder, nextOrder)) return;

      nextNodes[id] = {
        ...node,
        order: nextOrder,
      };
      hasChanges = true;
    });
  });

  if (!hasChanges) return graph;
  return {
    ...graph,
    nodes: nextNodes,
  };
};

export const v2_getSiblingIdsByParentFromGraph = (
  graph: V2TemplateNodeGraph
): Record<string, string[]> => {
  const byParent: Record<string, string[]> = {};
  Object.values(graph.nodes).forEach((node) => {
    const parentId = v2_toParentId(v2_toParentKey(node.parentId));
    const key = parentId ?? v2_ROOT_PARENT_KEY;
    const current = byParent[key] ?? [];
    current.push(node.id);
    byParent[key] = current;
  });
  return byParent;
};

export const v2_convertPointerOrderToOrderKeyInGraph = (
  graph: V2TemplateNodeGraph
): V2TemplateNodeGraph => {
  const normalizedGraph = v2_normalizePointerOrderInGraph(graph);
  const siblingIdsByParent = v2_getSiblingIdsByParentFromGraph(normalizedGraph);
  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...normalizedGraph.nodes,
  };
  let hasChanges = false;

  Object.entries(siblingIdsByParent).forEach(([, siblingIds]) => {
    const orderedIds = siblingIds
      .map((id) => normalizedGraph.nodes[id])
      .filter((node): node is V2TemplateGraphNode => Boolean(node))
      .sort((a, b) => {
        const aOrder = a.order;
        const bOrder = b.order;
        if (!aOrder && !bOrder) return 0;
        if (!aOrder) return 1;
        if (!bOrder) return -1;
        if (aOrder.model === "orderKey" && bOrder.model === "orderKey") {
          const aKey = aOrder.orderKey ?? "";
          const bKey = bOrder.orderKey ?? "";
          if (aKey === bKey) return 0;
          return aKey < bKey ? -1 : 1;
        }
        if (aOrder.model === "orderKey") return -1;
        if (bOrder.model === "orderKey") return 1;

        const indexA = siblingIds.indexOf(a.id);
        const indexB = siblingIds.indexOf(b.id);
        return indexA - indexB;
      })
      .map((node) => node.id);

    orderedIds.forEach((nodeId, index) => {
      const node = normalizedGraph.nodes[nodeId];
      if (!node) return;
      const prevSiblingId = index === 0 ? null : (orderedIds[index - 1] ?? null);
      const nextOrder: V2TemplateGraphNodeOrder = {
        model: "orderKey",
        orderKey: v2_createOrderKey(index),
        prevSiblingId,
      };
      if (v2_isOrderEqual(node.order, nextOrder)) return;

      nextNodes[nodeId] = {
        ...node,
        order: nextOrder,
      };
      hasChanges = true;
    });
  });

  if (!hasChanges) return normalizedGraph;
  return {
    ...normalizedGraph,
    nodes: nextNodes,
  };
};
