import {
  V2TemplateCardNode,
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_getRuntimeSceneNodes,
  v2_getRuntimeCardStructureByComponentId,
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

const v2_cardNodeLayerId = (node: V2TemplateCardNode): string =>
  typeof node.layerId === "string" && node.layerId.trim().length > 0
    ? node.layerId
    : node.id;

const v2_getCardNodeLayerIcon = (
  node: V2TemplateCardNode
): V2TemplateLayerIconKey => {
  if (node.kind === "image") return "image";
  if (node.binding.mode === "computed") return "calendar";
  return "text";
};

const v2_getVisibilityLabel = (
  visibilityMode: V2TemplateVisibilityMode | undefined
): string | null => {
  if (!visibilityMode || visibilityMode === "always") return null;
  if (visibilityMode === "onlineOnly") return "온라인";
  if (visibilityMode === "offlineOnly") return "오프라인";
  if (visibilityMode === "onlineSingleOnly") return "온라인/단회차";
  if (visibilityMode === "onlineMultipleOnly") return "온라인/다회차";
  if (visibilityMode === "offlineMemoOnly") return "오프라인/메모";
  if (visibilityMode === "offlineNoMemoOnly") return "오프라인/메모없음";
  return visibilityMode;
};

type V2CardStatusGroupKey =
  | "always"
  | "online"
  | "multi"
  | "offline"
  | "offlineMemo";

const v2_CARD_STATUS_GROUP_ORDER: V2CardStatusGroupKey[] = [
  "always",
  "online",
  "multi",
  "offline",
  "offlineMemo",
];

const v2_CARD_STATUS_GROUP_LABEL: Record<V2CardStatusGroupKey, string> = {
  always: "공통",
  online: "온라인",
  multi: "다회차",
  offline: "오프라인",
  offlineMemo: "오프라인 메모",
};

const v2_resolveCardStatusGroupKey = (
  visibilityMode: V2TemplateVisibilityMode | undefined
): V2CardStatusGroupKey => {
  if (!visibilityMode || visibilityMode === "always") return "always";
  if (visibilityMode === "onlineOnly" || visibilityMode === "onlineSingleOnly") {
    return "online";
  }
  if (visibilityMode === "onlineMultipleOnly") return "multi";
  if (visibilityMode === "offlineMemoOnly") return "offlineMemo";
  if (visibilityMode === "offlineOnly" || visibilityMode === "offlineNoMemoOnly") {
    return "offline";
  }
  return "always";
};

const v2_buildCardInstanceChildLayerNodes = ({
  renderConfig,
  instanceLayerId,
  componentId,
}: {
  renderConfig: V2TemplateRenderConfig;
  instanceLayerId: string;
  componentId: string;
}): V2TemplateLayerNode[] => {
  const cardStructure = v2_getRuntimeCardStructureByComponentId(
    renderConfig,
    componentId
  );
  if (!cardStructure || cardStructure.nodeOrder.length === 0) return [];

  const groupedNodes = new Map<V2CardStatusGroupKey, V2TemplateLayerNode[]>();
  v2_CARD_STATUS_GROUP_ORDER.forEach((groupKey) => {
    groupedNodes.set(groupKey, []);
  });

  cardStructure.nodeOrder
    .map((nodeId) => cardStructure.nodes[nodeId])
    .filter((node): node is V2TemplateCardNode => Boolean(node))
    .forEach((node) => {
      const groupKey = v2_resolveCardStatusGroupKey(node.visibilityMode);
      const groupNodes = groupedNodes.get(groupKey);
      if (!groupNodes) return;
      const baseLayerId = v2_cardNodeLayerId(node);
      const visibilityLabel = v2_getVisibilityLabel(node.visibilityMode);
      groupNodes.push({
        id: `${instanceLayerId}::status:${groupKey}::${baseLayerId}`,
        label: visibilityLabel ? `${node.label} (${visibilityLabel})` : node.label,
        kind: "component",
        icon: v2_getCardNodeLayerIcon(node),
        ...(node.highlightTarget ? { target: node.highlightTarget } : {}),
        sectionKey: node.containerStyleKey,
        visibilityMode: node.visibilityMode,
        isVirtual: true,
      });
    });

  return v2_CARD_STATUS_GROUP_ORDER.map((groupKey) => {
    const children = groupedNodes.get(groupKey) ?? [];
    return {
      id: `${instanceLayerId}::status:${groupKey}`,
      label: v2_CARD_STATUS_GROUP_LABEL[groupKey],
      kind: "group" as const,
      icon: "group" as const,
      visibilityMode: "always" as const,
      isVirtual: true,
      children,
    };
  }).filter((groupNode) => groupNode.children.length > 0);
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
        const instanceChildLayerNodes = v2_buildCardInstanceChildLayerNodes({
          renderConfig,
          instanceLayerId: layerId,
          componentId: instanceNode.componentId,
        });
        return {
          id: layerId,
          label: instanceNode.label,
          kind: "component" as const,
          icon: "layers" as const,
          target: `cardInstance:${instanceId}`,
          sectionKey: "grid",
          visibilityMode: instanceNode.visibilityMode ?? "always",
          ...(instanceChildLayerNodes.length > 0
            ? { children: instanceChildLayerNodes }
            : {}),
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
