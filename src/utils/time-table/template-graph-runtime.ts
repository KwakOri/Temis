import {
  v2_TEMPLATE_COLOR_KEYS,
  V2TemplateCardNode,
  V2TemplateCardStructure,
  V2TemplateGraphNode,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateSceneNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_dayKeyFromIndex,
  v2_parseDayKey,
} from "@/utils/time-table/template-render-config";

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

const v2_toBinding = (node: V2TemplateGraphNode): V2TemplateCardNode["binding"] => {
  if (node.binding) return node.binding;
  return {
    mode: "literal",
    value: "",
  };
};

const v2_toCardNode = (graphNode: V2TemplateGraphNode): V2TemplateCardNode | null => {
  if (graphNode.type !== "text" && graphNode.type !== "flexibleText") return null;

  const containerStyleKey = graphNode.styles?.containerStyleKey;
  if (!containerStyleKey) return null;

  const colorKey =
    graphNode.meta?.colorKey && v2_COLOR_KEY_SET.has(graphNode.meta.colorKey)
      ? graphNode.meta.colorKey
      : "SUB_TITLE";
  const fontKey =
    graphNode.meta?.fontKey && v2_COLOR_KEY_SET.has(graphNode.meta.fontKey)
      ? graphNode.meta.fontKey
      : "SUB_TITLE";

  return {
    id: graphNode.id,
    label: graphNode.label || graphNode.id,
    kind: graphNode.type === "flexibleText" ? "flexibleText" : "text",
    layerId: graphNode.layerId ?? graphNode.id,
    highlightTarget:
      (graphNode.highlightTarget ??
        graphNode.meta?.layerTarget ??
        "cardContainer") as V2TemplateCardNode["highlightTarget"],
    binding: v2_toBinding(graphNode),
    visibilityMode: v2_toVisibilityMode(graphNode.visibilityMode) ?? "always",
    containerStyleKey,
    ...(graphNode.styles?.textStyleKey
      ? { textStyleKey: graphNode.styles.textStyleKey }
      : {}),
    ...(graphNode.styles?.wrapperStyleKey
      ? { wrapperStyleKey: graphNode.styles.wrapperStyleKey }
      : {}),
    ...(graphNode.styles?.optionsKey ? { optionsKey: graphNode.styles.optionsKey } : {}),
    colorKey,
    fontKey,
    ...(typeof graphNode.meta?.containerClassName === "string"
      ? { containerClassName: graphNode.meta.containerClassName }
      : {}),
    ...(typeof graphNode.meta?.textClassName === "string"
      ? { textClassName: graphNode.meta.textClassName }
      : {}),
  };
};

const v2_buildSceneNodeFromGraph = ({
  graphNode,
  graphNodes,
  visited,
  validComponentIdSet,
}: {
  graphNode: V2TemplateGraphNode;
  graphNodes: Record<string, V2TemplateGraphNode>;
  visited: Set<string>;
  validComponentIdSet: Set<string>;
}): V2TemplateSceneNode | null => {
  if (visited.has(graphNode.id)) return null;
  visited.add(graphNode.id);

  const base = {
    id: graphNode.id,
    label: graphNode.label || graphNode.id,
    ...(graphNode.layerId ? { layerId: graphNode.layerId } : {}),
    ...(v2_toVisibilityMode(graphNode.visibilityMode)
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
          visited,
          validComponentIdSet,
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
    const componentIdCandidate =
      typeof graphNode.meta?.componentId === "string"
        ? graphNode.meta.componentId.trim()
        : "";
    if (!componentIdCandidate || !validComponentIdSet.has(componentIdCandidate)) {
      return null;
    }
    const componentId = componentIdCandidate;
    const children = graphNode.childIds
      .map((childId) => graphNodes[childId])
      .filter(
        (childNode): childNode is V2TemplateGraphNode =>
          Boolean(childNode && childNode.type === "componentInstance")
      )
      .map((childNode, index) => {
        const childComponentId =
          typeof childNode.meta?.componentId === "string"
            ? childNode.meta.componentId.trim()
            : "";
        if (!childComponentId || !validComponentIdSet.has(childComponentId)) {
          return null;
        }
        visited.add(childNode.id);
        const instanceId =
          typeof childNode.meta?.instanceId === "string"
            ? childNode.meta.instanceId
            : String(index);
        const dayKey =
          v2_parseDayKey(childNode.meta?.dayKey) ?? v2_dayKeyFromIndex(index);
        return {
          id: childNode.id,
          label: childNode.label || `Card ${index + 1}`,
          kind: "componentInstance" as const,
          ...(childNode.layerId ? { layerId: childNode.layerId } : {}),
          ...(v2_toVisibilityMode(childNode.visibilityMode)
            ? { visibilityMode: v2_toVisibilityMode(childNode.visibilityMode) }
            : {}),
          componentId: childComponentId,
          instanceId,
          dayKey,
          ...(childNode.styles?.styleKey
            ? { styleKey: childNode.styles.styleKey }
            : {}),
        };
      })
      .filter((childNode): childNode is NonNullable<typeof childNode> =>
        childNode !== null
      );

    return {
      ...base,
      kind: "cardCollection",
      componentId,
      children,
    };
  }

  if (graphNode.type === "componentInstance") {
    const componentIdCandidate =
      typeof graphNode.meta?.componentId === "string"
        ? graphNode.meta.componentId.trim()
        : "";
    if (!componentIdCandidate || !validComponentIdSet.has(componentIdCandidate)) {
      return null;
    }
    return {
      ...base,
      kind: "componentInstance",
      componentId: componentIdCandidate,
      instanceId:
        typeof graphNode.meta?.instanceId === "string"
          ? graphNode.meta.instanceId
          : graphNode.id,
      dayKey:
        v2_parseDayKey(graphNode.meta?.dayKey) ??
        v2_dayKeyFromIndex(Number.parseInt(graphNode.meta?.instanceId ?? "", 10)),
      ...(graphNode.styles?.styleKey
        ? { styleKey: graphNode.styles.styleKey }
        : {}),
    };
  }

  if (graphNode.type === "text" || graphNode.type === "flexibleText") {
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
      ...(graphNode.highlightTarget || graphNode.meta?.layerTarget
        ? {
            highlightTarget:
              (graphNode.highlightTarget ??
                graphNode.meta?.layerTarget) as V2TemplateCardNode["highlightTarget"],
          }
        : {}),
      colorKey,
      fontKey,
      ...(typeof graphNode.meta?.containerClassName === "string"
        ? { containerClassName: graphNode.meta.containerClassName }
        : {}),
      ...(typeof graphNode.meta?.textClassName === "string"
        ? { textClassName: graphNode.meta.textClassName }
        : {}),
    };
  }

  return null;
};

export const v2_getRuntimeSceneNodes = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateSceneNode[] => {
  const graph = renderConfig.graph;
  if (!graph || !graph.nodes || !Array.isArray(graph.rootNodeIds)) {
    return [];
  }
  const componentRootNodeIdSet = new Set(
    Object.values(graph.componentDefinitions ?? {}).map(
      (definition) => definition.rootNodeId
    )
  );

  const sceneRoots = graph.rootNodeIds
    .filter((rootId) => !componentRootNodeIdSet.has(rootId))
    .map((rootId) => graph.nodes[rootId])
    .filter((rootNode): rootNode is V2TemplateGraphNode => Boolean(rootNode));

  if (sceneRoots.length === 0) return [];

  const validComponentIdSet = new Set(
    Object.keys(graph.componentDefinitions ?? {})
  );
  const visited = new Set<string>();
  return sceneRoots
    .map((rootNode) =>
      v2_buildSceneNodeFromGraph({
        graphNode: rootNode,
        graphNodes: graph.nodes,
        visited,
        validComponentIdSet,
      })
    )
    .filter((node): node is V2TemplateSceneNode => node !== null);
};

const v2_EMPTY_CARD_STRUCTURE: V2TemplateCardStructure = {
  containerLayerId: "card",
  containerHighlightTarget: "cardContainer",
  containerStyleKey: "cardContainer",
  instanceMode: "component",
  instanceTransforms: {},
  nodeOrder: [],
  nodes: {},
};

export const v2_getRuntimeCardStructureByComponentId = (
  renderConfig: V2TemplateRenderConfig,
  componentId: string
): V2TemplateCardStructure => {
  const graph = renderConfig.graph;
  const componentDefinition = graph?.componentDefinitions?.[componentId];
  if (!componentDefinition) return v2_EMPTY_CARD_STRUCTURE;

  const cardRootNode = graph.nodes[componentDefinition.rootNodeId];
  if (!cardRootNode) {
    return {
      ...v2_EMPTY_CARD_STRUCTURE,
      instanceMode: componentDefinition.instanceMode ?? "component",
      instanceTransforms: componentDefinition.instanceTransforms ?? {},
    };
  }

  const nextNodes: Record<string, V2TemplateCardNode> = {};
  const nextNodeOrder: string[] = [];

  cardRootNode.childIds.forEach((childId) => {
    const graphNode = graph.nodes[childId];
    if (!graphNode) return;
    const nextCardNode = v2_toCardNode(graphNode);
    if (!nextCardNode) return;
    nextNodes[nextCardNode.id] = nextCardNode;
    nextNodeOrder.push(nextCardNode.id);
  });

  return {
    containerLayerId: cardRootNode.layerId ?? cardRootNode.id,
    containerHighlightTarget:
      (cardRootNode.highlightTarget ??
        cardRootNode.meta?.layerTarget ??
        "cardContainer") as V2TemplateCardStructure["containerHighlightTarget"],
    containerStyleKey:
      cardRootNode.styles?.containerStyleKey ??
      cardRootNode.meta?.layerSectionKey ??
      "cardContainer",
    instanceMode: componentDefinition.instanceMode ?? "component",
    instanceTransforms: componentDefinition.instanceTransforms ?? {},
    nodeOrder: nextNodeOrder,
    nodes: nextNodes,
  };
};
