import {
  V2TemplateCardNode,
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateNodeBindingRef,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import {
  v2_getDefaultCardComponentId,
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";

const v2_inferLayerIconFromBinding = (
  binding?: V2TemplateNodeBindingRef
): V2TemplateLayerIconKey => {
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
  const graph = renderConfig.graph;
  const graphNodes = graph?.nodes ?? {};
  const defaultCardComponentId = v2_getDefaultCardComponentId(renderConfig);
  const runtimeSceneNodes = v2_getRuntimeSceneNodes(renderConfig);
  const componentLayerCache = new Map<string, V2TemplateLayerNode>();

  const createComponentLayerTree = (componentId: string): V2TemplateLayerNode => {
    const cached = componentLayerCache.get(componentId);
    if (cached) return cached;

    const runtimeCardStructure = v2_getRuntimeCardStructureByComponentId(
      renderConfig,
      componentId
    );
    const componentDefinition = graph?.componentDefinitions?.[componentId];
    const componentRootGraphNode = componentDefinition
      ? graphNodes[componentDefinition.rootNodeId]
      : undefined;

    const cardLayerNodes: V2TemplateLayerNode[] = runtimeCardStructure.nodeOrder
      .map((nodeId) => runtimeCardStructure.nodes[nodeId])
      .filter((node): node is V2TemplateCardNode => Boolean(node))
      .map((node) => {
        const graphNode = graphNodes[node.id];
        const next: V2TemplateLayerNode = {
          id: node.layerId,
          label: node.label,
          kind: "component",
          icon:
            node.binding.mode === "computed"
              ? "calendar"
              : graphNode?.meta?.layerIcon ?? v2_inferLayerIconFromBinding(node.binding),
          target:
            graphNode?.meta?.layerTarget ?? graphNode?.highlightTarget ?? node.highlightTarget,
          sectionKey: graphNode?.meta?.layerSectionKey ?? node.containerStyleKey,
          visibilityMode: node.visibilityMode ?? "always",
        };

        if (graphNode?.meta?.layerComponentKey) {
          next.componentKey = graphNode.meta.layerComponentKey;
        }

        return next;
      });

    const rootLayerNode: V2TemplateLayerNode = {
      id: runtimeCardStructure.containerLayerId,
      label: componentRootGraphNode?.label ?? componentDefinition?.label ?? componentId,
      kind: "group",
      isTemplateComponent: componentRootGraphNode?.meta?.isTemplateComponent ?? true,
      icon: componentRootGraphNode?.meta?.layerIcon ?? "group",
      target:
        componentRootGraphNode?.meta?.layerTarget ??
        componentRootGraphNode?.highlightTarget ??
        runtimeCardStructure.containerHighlightTarget,
      sectionKey:
        componentRootGraphNode?.meta?.layerSectionKey ??
        componentRootGraphNode?.styles?.containerStyleKey ??
        runtimeCardStructure.containerStyleKey,
      visibilityMode: componentRootGraphNode?.visibilityMode ?? "always",
      children: cardLayerNodes,
    };

    componentLayerCache.set(componentId, rootLayerNode);
    return rootLayerNode;
  };

  const mapSceneNodeToLayerNode = (
    node: ReturnType<typeof v2_getRuntimeSceneNodes>[number]
  ): V2TemplateLayerNode => {
    const layerId = node.layerId ?? node.id;
    const graphNode = graphNodes[node.id];

    if (node.kind === "group") {
      return {
        id: layerId,
        label: node.label,
        kind: "group",
        icon: graphNode?.meta?.layerIcon ?? "group",
        ...(graphNode?.meta?.layerTarget
          ? { target: graphNode.meta.layerTarget }
          : {}),
        ...(graphNode?.meta?.layerSectionKey
          ? { sectionKey: graphNode.meta.layerSectionKey }
          : {}),
        visibilityMode: node.visibilityMode ?? "always",
        children: node.children.map((child) => mapSceneNodeToLayerNode(child)),
      };
    }

    if (node.kind === "cardCollection") {
      const componentId =
        node.componentId ??
        graphNode?.meta?.componentId ??
        defaultCardComponentId;
      return {
        id: layerId,
        label: node.label,
        kind: "component",
        componentKey:
          graphNode?.meta?.layerComponentKey ?? v2_inferComponentKeyFromLayerId(layerId),
        icon: graphNode?.meta?.layerIcon ?? "grid",
        target: graphNode?.meta?.layerTarget ?? "grid",
        sectionKey: graphNode?.meta?.layerSectionKey ?? "grid",
        visibilityMode: node.visibilityMode ?? "always",
        children: [createComponentLayerTree(componentId)],
      };
    }

    const inferredSectionKey = v2_inferSectionKeyFromSceneNode(node);
    const inferredTarget =
      (node.kind === "text" || node.kind === "flexibleText") &&
      node.highlightTarget
        ? node.highlightTarget
        : undefined;

    return {
      id: layerId,
      label: node.label,
      kind: "component",
      componentKey:
        graphNode?.meta?.layerComponentKey ?? v2_inferComponentKeyFromLayerId(layerId),
      icon:
        node.kind === "text" || node.kind === "flexibleText"
          ? node.binding.mode === "computed"
            ? "calendar"
            : graphNode?.meta?.layerIcon ?? "text"
          : graphNode?.meta?.layerIcon ?? v2_inferLayerIcon(node.kind),
      ...(graphNode?.meta?.layerTarget || inferredTarget
        ? { target: graphNode?.meta?.layerTarget ?? inferredTarget }
        : {}),
      ...(graphNode?.meta?.layerSectionKey || inferredSectionKey
        ? { sectionKey: graphNode?.meta?.layerSectionKey ?? inferredSectionKey }
        : {}),
      visibilityMode: node.visibilityMode ?? "always",
    };
  };

  return runtimeSceneNodes.map((node) => mapSceneNodeToLayerNode(node));
};
