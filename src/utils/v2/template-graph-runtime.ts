import {
  v2_TEMPLATE_COMPUTED_BINDING_KEYS,
  V2TemplateAssetRef,
  V2TemplateComponentInstanceBindingOverrides,
  v2_TEMPLATE_COLOR_KEYS,
  V2TemplateCardNode,
  V2TemplateCardStructure,
  V2TemplateComputedBindingKey,
  V2TemplateGraphNode,
  V2TemplateNodeBindingRef,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateSceneAssetRole,
  V2TemplateSceneNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_dayKeyFromIndex,
  v2_parseDayKey,
} from "@/utils/v2/template-render-config";

const v2_COLOR_KEY_SET = new Set(v2_TEMPLATE_COLOR_KEYS);
const v2_VISIBILITY_MODE_SET = new Set([
  "always",
  "onlineOnly",
  "offlineOnly",
  "onlineSingleOnly",
  "onlineMultipleOnly",
  "offlineMemoOnly",
  "offlineNoMemoOnly",
]);
const v2_COMPUTED_KEY_SET = new Set<string>(v2_TEMPLATE_COMPUTED_BINDING_KEYS);
const v2_INVALID_COMPONENT_ID = "__invalid_component__";

const v2_stripTailwindZClasses = (
  className: unknown
): string | undefined => {
  if (typeof className !== "string") return undefined;
  const sanitized = className
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !/^(-?z-\d+|z-\[[^\]]+\])$/.test(token))
    .join(" ");
  return sanitized.length > 0 ? sanitized : undefined;
};

const v2_toVisibilityMode = (value: unknown): V2TemplateVisibilityMode | undefined => {
  if (typeof value !== "string") return undefined;
  return v2_VISIBILITY_MODE_SET.has(value) ? (value as V2TemplateVisibilityMode) : undefined;
};

const v2_toSceneAssetFit = (value: unknown): V2TemplateSceneAssetFit | undefined => {
  if (value === "cover" || value === "contain" || value === "fill") return value;
  return undefined;
};

const v2_toSceneAssetRole = (value: unknown): V2TemplateSceneAssetRole | undefined => {
  if (
    value === "general" ||
    value === "background" ||
    value === "guideOverlay" ||
    value === "profileImage" ||
    value === "profileFrame"
  ) {
    return value;
  }
  return undefined;
};

const v2_toAssetRef = (graphNode: V2TemplateGraphNode): V2TemplateAssetRef | undefined => {
  const metaAssetRef = graphNode.meta?.assetRef;
  if (metaAssetRef?.source === "builtin" && typeof metaAssetRef.key === "string") {
    return {
      source: "builtin",
      key: metaAssetRef.key,
    };
  }
  if (
    metaAssetRef?.source === "extra" &&
    typeof metaAssetRef.key === "string" &&
    metaAssetRef.key.trim().length > 0
  ) {
    return {
      source: "extra",
      key: metaAssetRef.key.trim(),
    };
  }
  return undefined;
};

const v2_toBinding = (node: V2TemplateGraphNode): V2TemplateCardNode["binding"] => {
  if (node.binding) return node.binding;
  return {
    mode: "literal",
    value: "",
  };
};

const v2_toBindingRef = (candidate: unknown): V2TemplateNodeBindingRef => {
  if (!candidate || typeof candidate !== "object") {
    return {
      mode: "literal",
      value: "",
    };
  }
  const record = candidate as Record<string, unknown>;
  const mode = typeof record.mode === "string" ? record.mode : "";

  if (mode === "field") {
    const key = typeof record.key === "string" ? record.key.trim() : "";
    if (!key) {
      return {
        mode: "literal",
        value: "",
      };
    }
    const scope =
      record.scope === "card" || record.scope === "global"
        ? record.scope
        : "entry";
    const entrySelector =
      scope === "entry" &&
      record.entrySelector &&
      typeof record.entrySelector === "object" &&
      (record.entrySelector as Record<string, unknown>).mode === "index" &&
      Number.isFinite(Number((record.entrySelector as Record<string, unknown>).index))
        ? {
            mode: "index" as const,
            index: Math.max(
              0,
              Math.floor(Number((record.entrySelector as Record<string, unknown>).index))
            ),
          }
        : undefined;
    return {
      mode: "field",
      scope,
      key,
      ...(entrySelector ? { entrySelector } : {}),
    };
  }

  if (mode === "computed" && typeof record.key === "string" && v2_COMPUTED_KEY_SET.has(record.key)) {
    return {
      mode: "computed",
      key: record.key as V2TemplateComputedBindingKey,
    };
  }

  if (mode === "literal") {
    return {
      mode: "literal",
      value: typeof record.value === "string" ? record.value : "",
    };
  }

  return {
    mode: "literal",
    value: "",
  };
};

const v2_toComponentInstanceBindingOverrides = (
  candidate: unknown
): V2TemplateComponentInstanceBindingOverrides | undefined => {
  if (!candidate || typeof candidate !== "object") return undefined;
  const record = candidate as Record<string, unknown>;
  const next: V2TemplateComponentInstanceBindingOverrides = {};

  Object.entries(record).forEach(([nodeId, rawBinding]) => {
    const trimmedNodeId = nodeId.trim();
    if (!trimmedNodeId) return;
    next[trimmedNodeId] = v2_toBindingRef(rawBinding);
  });

  return Object.keys(next).length > 0 ? next : undefined;
};

const v2_toCardNode = (graphNode: V2TemplateGraphNode): V2TemplateCardNode | null => {
  if (
    graphNode.type !== "text" &&
    graphNode.type !== "flexibleText" &&
    graphNode.type !== "image"
  ) {
    return null;
  }

  const containerStyleKey = graphNode.styles?.containerStyleKey;
  if (!containerStyleKey) return null;

  if (graphNode.type === "image") {
    const sanitizedContainerClassName = v2_stripTailwindZClasses(
      graphNode.meta?.containerClassName
    );
    const assetRef = v2_toAssetRef(graphNode);
    const fit = v2_toSceneAssetFit(graphNode.meta?.fit);

    return {
      id: graphNode.id,
      label: graphNode.label || graphNode.id,
      kind: "image",
      layerId: graphNode.layerId ?? graphNode.id,
      highlightTarget:
        (graphNode.highlightTarget ??
          graphNode.meta?.layerTarget ??
          "cardContainer") as V2TemplateCardNode["highlightTarget"],
      binding: {
        mode: "literal",
        value: "",
      },
      visibilityMode: v2_toVisibilityMode(graphNode.visibilityMode) ?? "always",
      containerStyleKey,
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      ...(assetRef ? { assetRef } : {}),
      ...(graphNode.meta?.assetRefByDayKey
        ? { assetRefByDayKey: graphNode.meta.assetRefByDayKey }
        : {}),
      ...(fit ? { fit } : {}),
      ...(typeof graphNode.meta?.alt === "string" ? { alt: graphNode.meta.alt } : {}),
      ...(sanitizedContainerClassName
        ? {
            containerClassName: sanitizedContainerClassName,
          }
        : {}),
    };
  }

  const colorKey =
    graphNode.meta?.colorKey && v2_COLOR_KEY_SET.has(graphNode.meta.colorKey)
      ? graphNode.meta.colorKey
      : "SUB_TITLE";
  const fontKey =
    graphNode.meta?.fontKey && v2_COLOR_KEY_SET.has(graphNode.meta.fontKey)
      ? graphNode.meta.fontKey
      : "SUB_TITLE";
  const sanitizedContainerClassName = v2_stripTailwindZClasses(
    graphNode.meta?.containerClassName
  );

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
    ...(sanitizedContainerClassName
      ? {
          containerClassName: sanitizedContainerClassName,
        }
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
    const assetRef = v2_toAssetRef(graphNode);
    const fit = v2_toSceneAssetFit(graphNode.meta?.fit);
    const assetRole = v2_toSceneAssetRole(graphNode.meta?.assetRole);
    const alt = typeof graphNode.meta?.alt === "string" ? graphNode.meta.alt : undefined;

    return {
      ...base,
      kind: "asset",
      ...(assetRef ? { assetRef } : {}),
      ...(assetRole ? { assetRole } : {}),
      ...(graphNode.styles?.styleKey ? { styleKey: graphNode.styles.styleKey } : {}),
      ...(fit ? { fit } : {}),
      ...(alt ? { alt } : {}),
    };
  }

  if (graphNode.type === "cardCollection") {
    const componentIdCandidate =
      typeof graphNode.meta?.componentId === "string"
        ? graphNode.meta.componentId.trim()
        : "";
    const componentId =
      componentIdCandidate && validComponentIdSet.has(componentIdCandidate)
        ? componentIdCandidate
        : undefined;
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
        const resolvedComponentId =
          childComponentId || componentId || v2_INVALID_COMPONENT_ID;
        visited.add(childNode.id);
        const instanceId =
          typeof childNode.meta?.instanceId === "string"
            ? childNode.meta.instanceId
            : String(index);
        const dayKey =
          v2_parseDayKey(childNode.meta?.dayKey) ?? v2_dayKeyFromIndex(index);
        const bindingOverrides = v2_toComponentInstanceBindingOverrides(
          childNode.meta?.bindingOverrides
        );
        return {
          id: childNode.id,
          label: childNode.label || `Card ${index + 1}`,
          kind: "componentInstance" as const,
          ...(childNode.layerId ? { layerId: childNode.layerId } : {}),
          ...(v2_toVisibilityMode(childNode.visibilityMode)
            ? { visibilityMode: v2_toVisibilityMode(childNode.visibilityMode) }
            : {}),
          componentId: resolvedComponentId,
          instanceId,
          dayKey,
          ...(childNode.styles?.styleKey
            ? { styleKey: childNode.styles.styleKey }
            : {}),
          ...(bindingOverrides ? { bindingOverrides } : {}),
        };
      });

    return {
      ...base,
      kind: "cardCollection",
      ...(componentId ? { componentId } : {}),
      children,
    };
  }

  if (graphNode.type === "componentInstance") {
    const componentIdCandidate =
      typeof graphNode.meta?.componentId === "string"
        ? graphNode.meta.componentId.trim()
        : "";
    const componentId =
      componentIdCandidate && validComponentIdSet.has(componentIdCandidate)
        ? componentIdCandidate
        : componentIdCandidate || v2_INVALID_COMPONENT_ID;
    const bindingOverrides = v2_toComponentInstanceBindingOverrides(
      graphNode.meta?.bindingOverrides
    );
    return {
      ...base,
      kind: "componentInstance",
      componentId,
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
      ...(bindingOverrides ? { bindingOverrides } : {}),
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
    const sanitizedContainerClassName = v2_stripTailwindZClasses(
      graphNode.meta?.containerClassName
    );

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
      ...(sanitizedContainerClassName
        ? {
            containerClassName: sanitizedContainerClassName,
          }
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
  containerStyleKey: "container",
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
