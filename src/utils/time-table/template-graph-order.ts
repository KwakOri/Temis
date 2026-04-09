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
  const validNodeIds = new Set(Object.keys(graph.nodes));
  const byParent: Record<string, string[]> = {};
  const placed = new Set<string>();

  const pushUnique = (parentKey: string, nodeId: string) => {
    if (!validNodeIds.has(nodeId)) return;
    const current = byParent[parentKey] ?? [];
    if (current.includes(nodeId)) return;
    byParent[parentKey] = [...current, nodeId];
    placed.add(nodeId);
  };

  graph.rootNodeIds.forEach((nodeId) => {
    const node = graph.nodes[nodeId];
    if (!node || node.parentId !== null) return;
    pushUnique(v2_ROOT_PARENT_KEY, nodeId);
  });

  Object.values(graph.nodes).forEach((parentNode) => {
    const validChildren = parentNode.childIds.filter((childId) => {
      const childNode = graph.nodes[childId];
      return Boolean(childNode && childNode.parentId === parentNode.id);
    });

    validChildren.forEach((childId) => {
      pushUnique(parentNode.id, childId);
    });
  });

  Object.values(graph.nodes).forEach((node) => {
    if (placed.has(node.id)) return;
    pushUnique(v2_toParentKey(node.parentId), node.id);
  });

  return byParent;
};

const v2_buildOrderedIdsFromPointer = ({
  siblingIds,
  nodeById,
}: {
  siblingIds: string[];
  nodeById: Record<string, V2TemplateGraphNode>;
}): string[] => {
  const validSiblingIds = siblingIds.filter((id) => Boolean(nodeById[id]));
  if (validSiblingIds.length === 0) return [];

  const siblingIdSet = new Set(validSiblingIds);
  const nextByPrev = new Map<string | null, string[]>();

  validSiblingIds.forEach((id) => {
    const node = nodeById[id];
    const rawPrev = node.order?.prevSiblingId ?? null;
    const prevSiblingId =
      rawPrev !== null && siblingIdSet.has(rawPrev) ? rawPrev : null;
    const current = nextByPrev.get(prevSiblingId) ?? [];
    nextByPrev.set(prevSiblingId, [...current, id]);
  });

  const ordered: string[] = [];
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    ordered.push(id);
    const nextIds = nextByPrev.get(id) ?? [];
    nextIds.forEach((nextId) => walk(nextId));
  };

  (nextByPrev.get(null) ?? []).forEach((headId) => walk(headId));
  validSiblingIds.forEach((id) => {
    if (!visited.has(id)) {
      walk(id);
    }
  });

  return ordered;
};

export const v2_convertPointerOrderToOrderKeyInGraph = (
  graph: V2TemplateNodeGraph
): V2TemplateNodeGraph => {
  const normalizedGraph = v2_normalizePointerOrderInGraph(graph);
  const siblingIdsByParent = v2_getSiblingIdsByParentFromGraph(normalizedGraph);
  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...normalizedGraph.nodes,
  };
  let nextRootNodeIds = [...normalizedGraph.rootNodeIds];
  let hasChanges = false;

  Object.entries(siblingIdsByParent).forEach(([parentKey, siblingIds]) => {
    const existingNodes = siblingIds
      .map((id) => normalizedGraph.nodes[id])
      .filter((node): node is V2TemplateGraphNode => Boolean(node));
    if (existingNodes.length === 0) return;

    const allOrderKey = existingNodes.every(
      (node) =>
        node.order?.model === "orderKey" &&
        typeof node.order.orderKey === "string" &&
        node.order.orderKey.trim().length > 0
    );

    const orderedIds = allOrderKey
      ? existingNodes
          .sort((a, b) => {
            const aKey = a.order?.orderKey ?? "";
            const bKey = b.order?.orderKey ?? "";
            if (aKey === bKey) {
              return siblingIds.indexOf(a.id) - siblingIds.indexOf(b.id);
            }
            return aKey < bKey ? -1 : 1;
          })
          .map((node) => node.id)
      : v2_buildOrderedIdsFromPointer({
          siblingIds,
          nodeById: normalizedGraph.nodes,
        });

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

    const parentId = v2_toParentId(parentKey);
    if (parentId === null) {
      const rootChanged =
        nextRootNodeIds.length !== orderedIds.length ||
        nextRootNodeIds.some((id, index) => id !== orderedIds[index]);
      if (rootChanged) {
        nextRootNodeIds = [...orderedIds];
        hasChanges = true;
      }
      return;
    }

    const parentNode = nextNodes[parentId];
    if (!parentNode) return;
    const childChanged =
      parentNode.childIds.length !== orderedIds.length ||
      parentNode.childIds.some((id, index) => id !== orderedIds[index]);
    if (!childChanged) return;
    nextNodes[parentId] = {
      ...parentNode,
      childIds: orderedIds,
    };
    hasChanges = true;
  });

  if (!hasChanges) return normalizedGraph;
  return {
    ...normalizedGraph,
    nodes: nextNodes,
    rootNodeIds: nextRootNodeIds,
  };
};

export interface V2OrderKeyGraphValidationResult {
  valid: boolean;
  issues: string[];
}

export const v2_validateOrderKeyGraph = (
  graph: V2TemplateNodeGraph
): V2OrderKeyGraphValidationResult => {
  const siblingIdsByParent = v2_getSiblingIdsByParentFromGraph(graph);
  const issues: string[] = [];

  Object.entries(siblingIdsByParent).forEach(([parentKey, siblingIds]) => {
    const seenOrderKeys = new Set<string>();
    let previousOrderKey: string | null = null;
    let previousNodeId: string | null = null;

    siblingIds.forEach((nodeId) => {
      const node = graph.nodes[nodeId];
      if (!node) {
        issues.push(`[${parentKey}] missing node: ${nodeId}`);
        return;
      }

      if (node.order?.model !== "orderKey") {
        issues.push(`[${parentKey}] ${nodeId} is not orderKey model`);
        previousNodeId = nodeId;
        return;
      }

      const orderKey = node.order.orderKey;
      if (!orderKey) {
        issues.push(`[${parentKey}] ${nodeId} missing orderKey`);
      } else {
        if (seenOrderKeys.has(orderKey)) {
          issues.push(`[${parentKey}] duplicate orderKey: ${orderKey}`);
        } else {
          seenOrderKeys.add(orderKey);
        }

        if (previousOrderKey !== null && orderKey <= previousOrderKey) {
          issues.push(
            `[${parentKey}] non-monotonic orderKey: ${previousOrderKey} -> ${orderKey}`
          );
        }
        previousOrderKey = orderKey;
      }

      const expectedPrevSiblingId = previousNodeId;
      const actualPrevSiblingId =
        node.order.prevSiblingId === undefined ? null : node.order.prevSiblingId;
      if (actualPrevSiblingId !== expectedPrevSiblingId) {
        issues.push(
          `[${parentKey}] ${nodeId} prevSiblingId mismatch: expected ${String(
            expectedPrevSiblingId
          )}, got ${String(actualPrevSiblingId)}`
        );
      }

      previousNodeId = nodeId;
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
};
