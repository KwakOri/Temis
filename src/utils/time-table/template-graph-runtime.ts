import {
  v2_TEMPLATE_COLOR_KEYS,
  V2TemplateCardNode,
  V2TemplateCardStructure,
  V2TemplateGraphNode,
  V2TemplateNodeBindingRef,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateSceneNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";

const v2_COLOR_KEY_SET = new Set(v2_TEMPLATE_COLOR_KEYS);
const v2_VISIBILITY_MODE_SET = new Set(["always", "onlineOnly", "offlineOnly"]);

const v2_toVisibilityMode = (value: unknown): V2TemplateVisibilityMode | undefined => {
  if (typeof value !== "string") return undefined;
  return v2_VISIBILITY_MODE_SET.has(value) ? (value as V2TemplateVisibilityMode) : undefined;
};

const v2_toSceneAssetFit = (value: unknown): V2TemplateSceneAssetFit | undefined => {
  if (value === "cover" || value === "contain" || value === "fill") return value;
  return undefined;
};

const v2_toBinding = (
  node: V2TemplateGraphNode,
  fallback?: V2TemplateNodeBindingRef
): V2TemplateNodeBindingRef => {
  if (node.binding) return node.binding;
  if (fallback) return fallback;
  return {
    mode: "literal",
    value: "",
  };
};

const v2_toCardNode = (
  graphNode: V2TemplateGraphNode,
  fallbackNode?: V2TemplateCardNode
): V2TemplateCardNode | null => {
  if (graphNode.type !== "text" && graphNode.type !== "flexibleText") return null;

  const containerStyleKey =
    graphNode.styles?.containerStyleKey ?? fallbackNode?.containerStyleKey;
  if (!containerStyleKey) return null;

  const colorKey =
    graphNode.meta?.colorKey && v2_COLOR_KEY_SET.has(graphNode.meta.colorKey)
      ? graphNode.meta.colorKey
      : fallbackNode?.colorKey ?? "SUB_TITLE";
  const fontKey =
    graphNode.meta?.fontKey && v2_COLOR_KEY_SET.has(graphNode.meta.fontKey)
      ? graphNode.meta.fontKey
      : fallbackNode?.fontKey ?? "SUB_TITLE";

  return {
    id: graphNode.id,
    label: graphNode.label || fallbackNode?.label || graphNode.id,
    kind: graphNode.type === "flexibleText" ? "flexibleText" : "text",
    layerId: graphNode.layerId ?? fallbackNode?.layerId ?? graphNode.id,
    highlightTarget:
      (graphNode.highlightTarget ??
        fallbackNode?.highlightTarget ??
        "cardContainer") as V2TemplateCardNode["highlightTarget"],
    binding: v2_toBinding(graphNode, fallbackNode?.binding),
    visibilityMode:
      v2_toVisibilityMode(graphNode.visibilityMode) ??
      fallbackNode?.visibilityMode ??
      "always",
    containerStyleKey,
    ...(graphNode.styles?.textStyleKey
      ? { textStyleKey: graphNode.styles.textStyleKey }
      : fallbackNode?.textStyleKey
        ? { textStyleKey: fallbackNode.textStyleKey }
        : {}),
    ...(graphNode.styles?.wrapperStyleKey
      ? { wrapperStyleKey: graphNode.styles.wrapperStyleKey }
      : fallbackNode?.wrapperStyleKey
        ? { wrapperStyleKey: fallbackNode.wrapperStyleKey }
        : {}),
    ...(graphNode.styles?.optionsKey
      ? { optionsKey: graphNode.styles.optionsKey }
      : fallbackNode?.optionsKey
        ? { optionsKey: fallbackNode.optionsKey }
        : {}),
    colorKey,
    fontKey,
    ...(fallbackNode?.containerClassName
      ? { containerClassName: fallbackNode.containerClassName }
      : {}),
    ...(fallbackNode?.textClassName ? { textClassName: fallbackNode.textClassName } : {}),
  };
};

const v2_collectSceneNodeById = (
  nodes: V2TemplateSceneNode[]
): Map<string, V2TemplateSceneNode> => {
  const next = new Map<string, V2TemplateSceneNode>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    next.set(node.id, node);
    if (node.kind === "group" && node.children.length > 0) {
      stack.unshift(...node.children);
    }
  }
  return next;
};

const v2_buildSceneNodeFromGraph = ({
  graphNode,
  graphNodes,
  fallbackById,
  visited,
}: {
  graphNode: V2TemplateGraphNode;
  graphNodes: Record<string, V2TemplateGraphNode>;
  fallbackById: Map<string, V2TemplateSceneNode>;
  visited: Set<string>;
}): V2TemplateSceneNode | null => {
  if (visited.has(graphNode.id)) return null;
  visited.add(graphNode.id);
  const fallbackNode = fallbackById.get(graphNode.id);

  const base = {
    id: graphNode.id,
    label: fallbackNode?.label ?? graphNode.label,
    ...(fallbackNode?.layerId
      ? { layerId: fallbackNode.layerId }
      : graphNode.layerId
        ? { layerId: graphNode.layerId }
        : {}),
    ...(fallbackNode?.visibilityMode
      ? { visibilityMode: fallbackNode.visibilityMode }
      : v2_toVisibilityMode(graphNode.visibilityMode)
        ? { visibilityMode: v2_toVisibilityMode(graphNode.visibilityMode) }
      : {}),
  } as const;

  if (graphNode.type === "group") {
    const children = graphNode.childIds
      .map((childId) => graphNodes[childId])
      .filter((childNode): childNode is V2TemplateGraphNode => Boolean(childNode))
      .map((childNode) =>
        v2_buildSceneNodeFromGraph({
          graphNode: childNode,
          graphNodes,
          fallbackById,
          visited,
        })
      )
      .filter((childNode): childNode is V2TemplateSceneNode => childNode !== null);

    return {
      ...base,
      kind: "group",
      children,
    };
  }

  if (graphNode.type === "image") {
    if (fallbackNode?.kind === "asset") {
      return {
        ...fallbackNode,
        id: graphNode.id,
      };
    }
    if (!graphNode.meta?.assetKey) return null;

    return {
      ...base,
      kind: "asset",
      assetKey: graphNode.meta.assetKey,
      ...(graphNode.styles?.styleKey ? { styleKey: graphNode.styles.styleKey } : {}),
      ...(v2_toSceneAssetFit(graphNode.meta.fit) ? { fit: graphNode.meta.fit } : {}),
      ...(typeof graphNode.meta.alt === "string" ? { alt: graphNode.meta.alt } : {}),
    };
  }

  if (graphNode.type === "cardCollection") {
    if (fallbackNode?.kind === "cardCollection") {
      return {
        ...fallbackNode,
        id: graphNode.id,
      };
    }
    return {
      ...base,
      kind: "cardCollection",
      source: "card",
    };
  }

  if (graphNode.type === "text" || graphNode.type === "flexibleText") {
    if (
      fallbackNode &&
      (fallbackNode.kind === "text" || fallbackNode.kind === "flexibleText")
    ) {
      return {
        ...fallbackNode,
        id: graphNode.id,
      };
    }
    if (!graphNode.styles?.containerStyleKey) return null;
    const colorKey =
      graphNode.meta?.colorKey && v2_COLOR_KEY_SET.has(graphNode.meta.colorKey)
        ? graphNode.meta.colorKey
        : "SUB_TITLE";
    const fontKey =
      graphNode.meta?.fontKey && v2_COLOR_KEY_SET.has(graphNode.meta.fontKey)
        ? graphNode.meta.fontKey
        : "SUB_TITLE";

    return {
      ...base,
      kind: graphNode.type,
      binding: v2_toBinding(graphNode),
      containerStyleKey: graphNode.styles.containerStyleKey,
      ...(graphNode.styles.textStyleKey ? { textStyleKey: graphNode.styles.textStyleKey } : {}),
      ...(graphNode.styles.wrapperStyleKey
        ? { wrapperStyleKey: graphNode.styles.wrapperStyleKey }
        : {}),
      ...(graphNode.styles.optionsKey ? { optionsKey: graphNode.styles.optionsKey } : {}),
      ...(graphNode.highlightTarget
        ? {
            highlightTarget:
              graphNode.highlightTarget as V2TemplateCardNode["highlightTarget"],
          }
        : {}),
      colorKey,
      fontKey,
    };
  }

  return null;
};

export const v2_getRuntimeSceneNodes = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateSceneNode[] => {
  const fallbackNodes = renderConfig.structure.sceneNodes;
  const fallbackById = v2_collectSceneNodeById(fallbackNodes);
  const graph = renderConfig.graph;
  if (!graph || !graph.nodes || !Array.isArray(graph.rootNodeIds)) {
    return fallbackNodes;
  }

  const sceneRoots = graph.rootNodeIds
    .map((rootId) => graph.nodes[rootId])
    .filter((rootNode): rootNode is V2TemplateGraphNode => Boolean(rootNode));

  if (sceneRoots.length === 0) return fallbackNodes;

  const visited = new Set<string>();
  const parsedSceneNodes = sceneRoots
    .map((rootNode) =>
      v2_buildSceneNodeFromGraph({
        graphNode: rootNode,
        graphNodes: graph.nodes,
        fallbackById,
        visited,
      })
    )
    .filter((node): node is V2TemplateSceneNode => node !== null);

  return parsedSceneNodes.length > 0 ? parsedSceneNodes : fallbackNodes;
};

export const v2_getRuntimeCardStructure = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateCardStructure => {
  const fallbackCard = renderConfig.structure.card;
  const graph = renderConfig.graph;
  const cardDefinition = graph?.componentDefinitions?.card;
  if (!cardDefinition) return fallbackCard;

  const cardRootNode = graph.nodes[cardDefinition.rootNodeId];
  if (!cardRootNode) return fallbackCard;

  const nextNodes: Record<string, V2TemplateCardNode> = {
    ...fallbackCard.nodes,
  };
  const nextNodeOrder: string[] = [];

  cardRootNode.childIds.forEach((childId) => {
    const graphNode = graph.nodes[childId];
    if (!graphNode) return;
    const nextCardNode =
      fallbackCard.nodes[childId] ?? v2_toCardNode(graphNode, fallbackCard.nodes[childId]);
    if (!nextCardNode) return;
    nextNodes[nextCardNode.id] = nextCardNode;
    nextNodeOrder.push(nextCardNode.id);
  });

  if (nextNodeOrder.length === 0) return fallbackCard;

  return {
    containerLayerId: fallbackCard.containerLayerId,
    containerHighlightTarget: fallbackCard.containerHighlightTarget,
    containerStyleKey: fallbackCard.containerStyleKey,
    instanceMode: fallbackCard.instanceMode,
    instanceTransforms: fallbackCard.instanceTransforms,
    nodeOrder: nextNodeOrder,
    nodes: nextNodes,
  };
};
