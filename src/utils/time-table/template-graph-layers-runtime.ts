import {
  V2TemplateCardNode,
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateNodeBindingRef,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import {
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";

const v2_collectLayerNodesById = (
  nodes: V2TemplateLayerNode[],
  map: Map<string, V2TemplateLayerNode> = new Map()
): Map<string, V2TemplateLayerNode> => {
  nodes.forEach((node) => {
    map.set(node.id, node);
    if (node.children?.length) {
      v2_collectLayerNodesById(node.children, map);
    }
  });
  return map;
};

const v2_inferLayerIconFromBinding = (binding?: V2TemplateNodeBindingRef): V2TemplateLayerIconKey => {
  if (!binding) return "text";
  if (binding.mode === "computed") return "calendar";
  return "text";
};

const v2_inferLayerIcon = (kind: string): V2TemplateLayerIconKey => {
  if (kind === "group") return "group";
  if (kind === "asset") return "image";
  if (kind === "cardCollection") return "grid";
  return "text";
};

const v2_inferSectionKeyFromSceneNode = (
  node: ReturnType<typeof v2_getRuntimeSceneNodes>[number]
): string | undefined => {
  if (node.kind === "asset") return node.styleKey;
  if (node.kind === "text" || node.kind === "flexibleText") {
    return node.containerStyleKey;
  }
  return undefined;
};

const v2_inferComponentKeyFromLayerId = (
  layerId: string
): V2TemplateLayerComponentKey | undefined => {
  if (layerId === "grid") return "grid";
  if (layerId === "week-flag") return "weekFlag";
  if (layerId === "top-object") return "topObject";
  if (layerId === "profile") return "profile";
  return undefined;
};

export const v2_getRuntimeLayerTree = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateLayerNode[] => {
  const fallbackLayers = renderConfig.structure.layers;
  const fallbackById = v2_collectLayerNodesById(fallbackLayers);
  const runtimeSceneNodes = v2_getRuntimeSceneNodes(renderConfig);
  const runtimeCardStructure = v2_getRuntimeCardStructure(renderConfig);

  const cardLayerNodes: V2TemplateLayerNode[] = runtimeCardStructure.nodeOrder
    .map((nodeId) => runtimeCardStructure.nodes[nodeId])
    .filter((node): node is V2TemplateCardNode => Boolean(node))
    .map((node) => {
      const fallback = fallbackById.get(node.layerId);
      const next: V2TemplateLayerNode = {
        id: node.layerId,
        label: fallback?.label ?? node.label,
        kind: "component",
        icon: fallback?.icon ?? v2_inferLayerIconFromBinding(node.binding),
        target: fallback?.target ?? node.highlightTarget,
        sectionKey: fallback?.sectionKey ?? node.containerStyleKey,
        visibilityMode: node.visibilityMode ?? fallback?.visibilityMode ?? "always",
      };

      return next;
    });

  const cardRootLayerId = runtimeCardStructure.containerLayerId;
  const cardRootFallback = fallbackById.get(cardRootLayerId);
  const cardRootLayerNode: V2TemplateLayerNode = {
    id: cardRootLayerId,
    label: cardRootFallback?.label ?? "Card",
    kind: "group",
    isTemplateComponent: true,
    icon: cardRootFallback?.icon ?? "group",
    target:
      cardRootFallback?.target ??
      runtimeCardStructure.containerHighlightTarget,
    sectionKey:
      cardRootFallback?.sectionKey ??
      runtimeCardStructure.containerStyleKey,
    visibilityMode: cardRootFallback?.visibilityMode ?? "always",
    children: cardLayerNodes,
  };

  const mapSceneNodeToLayerNode = (
    node: ReturnType<typeof v2_getRuntimeSceneNodes>[number]
  ): V2TemplateLayerNode => {
    const layerId = node.layerId ?? node.id;
    const fallback = fallbackById.get(layerId);

    if (node.kind === "group") {
      return {
        id: layerId,
        label: fallback?.label ?? node.label,
        kind: "group",
        icon: fallback?.icon ?? "group",
        ...(fallback?.target ? { target: fallback.target } : {}),
        ...(fallback?.sectionKey ? { sectionKey: fallback.sectionKey } : {}),
        visibilityMode: node.visibilityMode ?? fallback?.visibilityMode ?? "always",
        children: node.children.map((child) => mapSceneNodeToLayerNode(child)),
      };
    }

    if (node.kind === "cardCollection") {
      const next: V2TemplateLayerNode = {
        id: layerId,
        label: fallback?.label ?? node.label,
        kind: "component",
        componentKey:
          fallback?.componentKey ?? v2_inferComponentKeyFromLayerId(layerId),
        icon: fallback?.icon ?? "grid",
        target: fallback?.target ?? "grid",
        sectionKey: fallback?.sectionKey ?? "grid",
        visibilityMode: node.visibilityMode ?? fallback?.visibilityMode ?? "always",
        children: [cardRootLayerNode],
      };

      return next;
    }

    const inferredSectionKey = v2_inferSectionKeyFromSceneNode(node);
    const inferredTarget =
      (node.kind === "text" || node.kind === "flexibleText") &&
      node.highlightTarget
        ? node.highlightTarget
        : undefined;

    return {
      id: layerId,
      label: fallback?.label ?? node.label,
      kind: "component",
      componentKey:
        fallback?.componentKey ?? v2_inferComponentKeyFromLayerId(layerId),
      icon: fallback?.icon ?? v2_inferLayerIcon(node.kind),
      ...(fallback?.target || inferredTarget
        ? { target: fallback?.target ?? inferredTarget }
        : {}),
      ...(fallback?.sectionKey || inferredSectionKey
        ? { sectionKey: fallback?.sectionKey ?? inferredSectionKey }
        : {}),
      visibilityMode: node.visibilityMode ?? fallback?.visibilityMode ?? "always",
    };
  };

  return runtimeSceneNodes.map((node) => mapSceneNodeToLayerNode(node));
};
