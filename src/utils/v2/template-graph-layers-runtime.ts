import {
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import {
  v2_getRuntimeSceneNodes,
} from "@/utils/v2/template-graph-runtime";

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
  const runtimeSceneNodes = v2_getRuntimeSceneNodes(renderConfig);

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
      const instanceLayerNodes = (node.children ?? []).map((instanceNode, index) => {
        const instanceId =
          typeof instanceNode.instanceId === "string"
            ? instanceNode.instanceId
            : String(index);
        const layerId = instanceNode.layerId ?? instanceNode.id;
        return {
          id: layerId,
          label: instanceNode.label,
          kind: "component" as const,
          icon: "layers" as const,
          target: `cardInstance:${instanceId}`,
          sectionKey: "grid",
          visibilityMode: instanceNode.visibilityMode ?? "always",
        };
      });
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
        children: instanceLayerNodes,
      };
    }

    if (node.kind === "componentInstance") {
      const sectionKey = node.styleKey ?? graphNode?.meta?.layerSectionKey ?? "grid";
      return {
        id: layerId,
        label: node.label,
        kind: "component",
        icon: "layers",
        target:
          graphNode?.meta?.layerTarget ??
          (node.styleKey ? `sceneNode:${node.id}` : `cardInstance:${node.instanceId}`),
        sectionKey,
        visibilityMode: node.visibilityMode ?? "always",
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
