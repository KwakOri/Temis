import {
  V2TemplateGraphNode,
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";

const v2_LAYER_COMPONENT_KEY_SET = new Set<V2TemplateLayerComponentKey>([
  "grid",
  "weekFlag",
  "topObject",
  "profile",
]);

const v2_inferLayerIconFromGraphNode = (
  node: V2TemplateGraphNode
): V2TemplateLayerIconKey => {
  if (node.type === "group") return "group";
  if (node.type === "image") return "image";
  if (node.type === "cardCollection") return "grid";
  if (node.type === "componentInstance") return "layers";
  if (node.type === "text" || node.type === "flexibleText") {
    return node.binding?.mode === "computed" ? "calendar" : "text";
  }
  return "layers";
};

const v2_getLayerSectionKeyFromGraphNode = (
  node: V2TemplateGraphNode
): string | undefined => {
  if (typeof node.meta?.layerSectionKey === "string" && node.meta.layerSectionKey) {
    return node.meta.layerSectionKey;
  }
  if (
    typeof node.styles?.containerStyleKey === "string" &&
    node.styles.containerStyleKey
  ) {
    return node.styles.containerStyleKey;
  }
  if (typeof node.styles?.styleKey === "string" && node.styles.styleKey) {
    return node.styles.styleKey;
  }
  if (typeof node.styles?.textStyleKey === "string" && node.styles.textStyleKey) {
    return node.styles.textStyleKey;
  }
  if (
    typeof node.styles?.wrapperStyleKey === "string" &&
    node.styles.wrapperStyleKey
  ) {
    return node.styles.wrapperStyleKey;
  }
  return undefined;
};

const v2_toComponentLayerNode = ({
  graphNodes,
  nodeId,
  visiting,
}: {
  graphNodes: Record<string, V2TemplateGraphNode>;
  nodeId: string;
  visiting: Set<string>;
}): V2TemplateLayerNode | null => {
  const graphNode = graphNodes[nodeId];
  if (!graphNode) return null;
  if (visiting.has(nodeId)) return null;

  visiting.add(nodeId);
  const childLayerNodes = graphNode.childIds
    .map((childId) =>
      v2_toComponentLayerNode({
        graphNodes,
        nodeId: childId,
        visiting,
      })
    )
    .filter((node): node is V2TemplateLayerNode => Boolean(node));
  visiting.delete(nodeId);

  const layerId =
    typeof graphNode.layerId === "string" && graphNode.layerId.trim().length > 0
      ? graphNode.layerId
      : graphNode.id;
  const componentKeyCandidate = graphNode.meta?.layerComponentKey;
  const componentKey =
    componentKeyCandidate && v2_LAYER_COMPONENT_KEY_SET.has(componentKeyCandidate)
      ? componentKeyCandidate
      : undefined;
  const sectionKey = v2_getLayerSectionKeyFromGraphNode(graphNode);
  const target =
    graphNode.meta?.layerTarget ??
    (typeof graphNode.highlightTarget === "string"
      ? graphNode.highlightTarget
      : undefined);

  return {
    id: layerId,
    label: graphNode.label,
    kind: graphNode.type === "group" ? "group" : "component",
    ...(componentKey ? { componentKey } : {}),
    icon: graphNode.meta?.layerIcon ?? v2_inferLayerIconFromGraphNode(graphNode),
    ...(target ? { target } : {}),
    ...(sectionKey ? { sectionKey } : {}),
    ...(graphNode.visibilityMode ? { visibilityMode: graphNode.visibilityMode } : {}),
    ...(graphNode.meta?.isTemplateComponent ? { isTemplateComponent: true } : {}),
    ...(childLayerNodes.length > 0 ? { children: childLayerNodes } : {}),
  };
};

export const v2_getRuntimeComponentLayerTreeByComponentId = (
  renderConfig: V2TemplateRenderConfig
): Record<string, V2TemplateLayerNode | null> => {
  const graphNodes = renderConfig.graph?.nodes ?? {};
  const componentDefinitions = renderConfig.graph?.componentDefinitions ?? {};
  const next: Record<string, V2TemplateLayerNode | null> = {};

  Object.values(componentDefinitions).forEach((componentDefinition) => {
    const rootNodeId = componentDefinition.rootNodeId;
    if (!rootNodeId) {
      next[componentDefinition.id] = null;
      return;
    }
    next[componentDefinition.id] = v2_toComponentLayerNode({
      graphNodes,
      nodeId: rootNodeId,
      visiting: new Set<string>(),
    });
  });

  return next;
};

export const v2_getRuntimeComponentLayerTreeNodes = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateLayerNode[] => {
  return Object.values(
    v2_getRuntimeComponentLayerTreeByComponentId(renderConfig)
  ).filter((node): node is V2TemplateLayerNode => Boolean(node));
};

