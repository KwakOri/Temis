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
        : {
            model: "orderKey" as const,
            orderKey: v2_createOrderKey(index),
            prevSiblingId: index === 0 ? null : (ids[index - 1] ?? null),
          };

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

    const orderedIds = existingNodes
      .sort((a, b) => {
        const aKey = a.order?.orderKey ?? "";
        const bKey = b.order?.orderKey ?? "";
        if (aKey === bKey) {
          return siblingIds.indexOf(a.id) - siblingIds.indexOf(b.id);
        }
        return aKey < bKey ? -1 : 1;
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
  const nodeIds = new Set(Object.keys(graph.nodes));

  graph.rootNodeIds.forEach((rootId) => {
    const rootNode = graph.nodes[rootId];
    if (!rootNode) {
      issues.push(`[${v2_ROOT_PARENT_KEY}] missing root node: ${rootId}`);
      return;
    }
    if (rootNode.parentId !== null) {
      issues.push(
        `[${v2_ROOT_PARENT_KEY}] root ${rootId} parentId is not null (${String(
          rootNode.parentId
        )})`
      );
    }
  });

  Object.values(graph.nodes).forEach((node) => {
    if (node.parentId !== null) {
      const parentNode = graph.nodes[node.parentId];
      if (!parentNode) {
        issues.push(`[${node.id}] missing parent: ${node.parentId}`);
      } else if (!parentNode.childIds.includes(node.id)) {
        issues.push(
          `[${node.id}] parent ${node.parentId} does not include child reference`
        );
      }
    }

    node.childIds.forEach((childId) => {
      if (!nodeIds.has(childId)) {
        issues.push(`[${node.id}] missing child node: ${childId}`);
        return;
      }
      const childNode = graph.nodes[childId];
      if (childNode.parentId !== node.id) {
        issues.push(
          `[${node.id}] child ${childId} parent mismatch: ${String(
            childNode.parentId
          )}`
        );
      }
    });
  });

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

export interface V2OrderKeyRegressionCheckResult {
  valid: boolean;
  issues: string[];
}

const v2_cloneGraph = (graph: V2TemplateNodeGraph): V2TemplateNodeGraph => {
  return JSON.parse(JSON.stringify(graph)) as V2TemplateNodeGraph;
};

export const v2_runOrderKeyRegressionChecks = (): V2OrderKeyRegressionCheckResult => {
  const cases: Array<{
    name: string;
    graph: V2TemplateNodeGraph;
    expectedRootNodeIds?: string[];
    expectedChildIdsByParent?: Record<string, string[]>;
  }> = [
    {
      name: "root-sequence-priority",
      graph: {
        rootNodeIds: ["c", "a", "b"],
        componentDefinitions: {},
        nodes: {
          a: {
            id: "a",
            type: "group",
            label: "A",
            parentId: null,
            childIds: [],
            order: { model: "pointer", prevSiblingId: null },
          },
          b: {
            id: "b",
            type: "group",
            label: "B",
            parentId: null,
            childIds: [],
            order: { model: "pointer", prevSiblingId: "a" },
          },
          c: {
            id: "c",
            type: "group",
            label: "C",
            parentId: null,
            childIds: [],
            order: { model: "pointer", prevSiblingId: "b" },
          },
        },
      },
      expectedRootNodeIds: ["c", "a", "b"],
    },
    {
      name: "child-sequence-priority",
      graph: {
        rootNodeIds: ["p"],
        componentDefinitions: {},
        nodes: {
          p: {
            id: "p",
            type: "group",
            label: "Parent",
            parentId: null,
            childIds: ["z", "x", "y"],
            order: { model: "pointer", prevSiblingId: null },
          },
          x: {
            id: "x",
            type: "text",
            label: "X",
            parentId: "p",
            childIds: [],
            order: { model: "pointer", prevSiblingId: null },
          },
          y: {
            id: "y",
            type: "text",
            label: "Y",
            parentId: "p",
            childIds: [],
            order: { model: "pointer", prevSiblingId: "x" },
          },
          z: {
            id: "z",
            type: "text",
            label: "Z",
            parentId: "p",
            childIds: [],
            order: { model: "pointer", prevSiblingId: "y" },
          },
        },
      },
      expectedChildIdsByParent: {
        p: ["z", "x", "y"],
      },
    },
    {
      name: "duplicate-order-key-rebalance",
      graph: {
        rootNodeIds: ["a", "b", "c"],
        componentDefinitions: {},
        nodes: {
          a: {
            id: "a",
            type: "group",
            label: "A",
            parentId: null,
            childIds: [],
            order: { model: "orderKey", orderKey: "0000001024", prevSiblingId: null },
          },
          b: {
            id: "b",
            type: "group",
            label: "B",
            parentId: null,
            childIds: [],
            order: { model: "orderKey", orderKey: "0000001024", prevSiblingId: "a" },
          },
          c: {
            id: "c",
            type: "group",
            label: "C",
            parentId: null,
            childIds: [],
            order: { model: "orderKey", orderKey: "0000001024", prevSiblingId: "b" },
          },
        },
      },
      expectedRootNodeIds: ["a", "b", "c"],
    },
  ];

  const issues: string[] = [];

  cases.forEach((testCase) => {
    const converted = v2_convertPointerOrderToOrderKeyInGraph(
      v2_cloneGraph(testCase.graph)
    );
    const validation = v2_validateOrderKeyGraph(converted);
    if (!validation.valid) {
      validation.issues.forEach((issue) => {
        issues.push(`[${testCase.name}] ${issue}`);
      });
    }

    if (testCase.expectedRootNodeIds) {
      const expected = testCase.expectedRootNodeIds.join(",");
      const actual = converted.rootNodeIds.join(",");
      if (expected !== actual) {
        issues.push(
          `[${testCase.name}] root order mismatch: expected ${expected}, got ${actual}`
        );
      }
    }

    if (testCase.expectedChildIdsByParent) {
      Object.entries(testCase.expectedChildIdsByParent).forEach(
        ([parentId, expectedChildIds]) => {
          const actualChildIds = converted.nodes[parentId]?.childIds ?? [];
          if (expectedChildIds.join(",") !== actualChildIds.join(",")) {
            issues.push(
              `[${testCase.name}] child order mismatch (${parentId}): expected ${expectedChildIds.join(
                ","
              )}, got ${actualChildIds.join(",")}`
            );
          }
        }
      );
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
};
