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
import {
  v2_buildCardInstanceNodeHighlightTarget,
  type V2CardStatusGroupKey,
  v2_resolveCardStatusGroupKey,
} from "@/utils/v2/card-instance-highlight-target";

const v2_inferLayerIcon = (kind: string): V2TemplateLayerIconKey => {
  if (kind === "group") return "group";
  if (kind === "asset") return "image";
  if (kind === "cardCollection") return "grid";
  return "text";
};

const v2_inferSectionKeyFromSceneNode = (
  node: ReturnType<typeof v2_getRuntimeSceneNodes>[number]
): string | undefined => {
  if (node.kind === "group") return node.styleKey;
  if (node.kind === "asset") return node.styleKey;
  if (node.kind === "text" || node.kind === "flexibleText") {
    return node.containerStyleKey;
  }
  return undefined;
};

const v2_inferComponentKeyFromLayerId = (
  layerId: string
): V2TemplateLayerComponentKey | undefined => {
  if (layerId === "board") return "board";
  if (layerId === "frame") return "frame";
  if (layerId === "grid") return "grid";
  if (layerId === "grid-frame") return "grid";
  if (layerId === "week-flag") return "weekFlag";
  if (layerId === "top-object") return "topObject";
  if (layerId === "profile") return "profile";
  if (layerId === "artist") return "artist";
  if (layerId === "memo") return "memo";
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

const v2_getCardNodeEntryIndex = (node: V2TemplateCardNode): number => {
  if (
    node.binding.mode === "field" &&
    node.binding.scope === "entry" &&
    node.binding.entrySelector?.mode === "index" &&
    Number.isFinite(node.binding.entrySelector.index)
  ) {
    return Math.max(0, Math.floor(node.binding.entrySelector.index));
  }

  if (
    node.binding.mode === "computed" &&
    node.binding.entrySelector?.mode === "index" &&
    Number.isFinite(node.binding.entrySelector.index)
  ) {
    return Math.max(0, Math.floor(node.binding.entrySelector.index));
  }

  return 0;
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
  if (visibilityMode === "artistOnOnly") return "아티스트 ON";
  if (visibilityMode === "artistOffOnly") return "아티스트 OFF";
  if (visibilityMode === "memoOnOnly") return "메모 ON";
  if (visibilityMode === "memoOffOnly") return "메모 OFF";
  return visibilityMode;
};

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

const v2_buildCardInstanceChildLayerNodes = ({
  renderConfig,
  instanceLayerId,
  instanceId,
  componentId,
}: {
  renderConfig: V2TemplateRenderConfig;
  instanceLayerId: string;
  instanceId: string;
  componentId: string;
}): V2TemplateLayerNode[] => {
  const cardStructure = v2_getRuntimeCardStructureByComponentId(
    renderConfig,
    componentId
  );
  if (!cardStructure || cardStructure.nodeOrder.length === 0) return [];

  const groupedNodes = new Map<
    V2CardStatusGroupKey,
    {
      children: V2TemplateLayerNode[];
      entryGroupsByStyleKey: Map<string, V2TemplateLayerNode>;
    }
  >();
  v2_CARD_STATUS_GROUP_ORDER.forEach((groupKey) => {
    groupedNodes.set(groupKey, {
      children: [],
      entryGroupsByStyleKey: new Map<string, V2TemplateLayerNode>(),
    });
  });

  cardStructure.nodeOrder
    .map((nodeId) => cardStructure.nodes[nodeId])
    .filter((node): node is V2TemplateCardNode => Boolean(node))
    .forEach((node) => {
      const groupKey = v2_resolveCardStatusGroupKey(node.visibilityMode);
      const groupState = groupedNodes.get(groupKey);
      if (!groupState) return;
      const baseLayerId = v2_cardNodeLayerId(node);
      const visibilityLabel = v2_getVisibilityLabel(node.visibilityMode);
      const childLayerNode: V2TemplateLayerNode = {
        id: `${instanceLayerId}::status:${groupKey}::${baseLayerId}`,
        label: visibilityLabel ? `${node.label} (${visibilityLabel})` : node.label,
        kind: "component",
        icon: v2_getCardNodeLayerIcon(node),
        target: v2_buildCardInstanceNodeHighlightTarget({
          instanceId,
          statusGroupKey: groupKey,
          nodeLayerId: baseLayerId,
        }),
        sectionKey: node.containerStyleKey,
        visibilityMode: node.visibilityMode,
        isVirtual: true,
      };

      if (node.entryStyleKey && node.kind !== "image") {
        let entryGroupNode = groupState.entryGroupsByStyleKey.get(node.entryStyleKey);
        if (!entryGroupNode) {
          const entryIndex = v2_getCardNodeEntryIndex(node);
          entryGroupNode = {
            id: `${instanceLayerId}::status:${groupKey}::entry:${node.entryStyleKey}`,
            label: entryIndex > 0 ? `Entry ${entryIndex + 1}` : "Entry",
            kind: "group",
            icon: "group",
            sectionKey: node.entryStyleKey,
            visibilityMode: "always",
            isVirtual: true,
            children: [],
          };
          groupState.entryGroupsByStyleKey.set(node.entryStyleKey, entryGroupNode);
          groupState.children.push(entryGroupNode);
        }
        entryGroupNode.children = [...(entryGroupNode.children ?? []), childLayerNode];
        return;
      }

      groupState.children.push(childLayerNode);
    });

  return v2_CARD_STATUS_GROUP_ORDER.map((groupKey) => {
    const children = groupedNodes.get(groupKey)?.children ?? [];
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
          : node.styleKey
            ? { sectionKey: node.styleKey }
          : {}),
        visibilityMode: node.visibilityMode ?? "always",
        children: node.children.map((child) => mapSceneNodeToLayerNode(child)),
      };
    }

    if (node.kind === "cardCollection") {
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
      };
    }

    if (node.kind === "componentInstance") {
      const sectionKey = node.styleKey ?? graphNode?.meta?.layerSectionKey ?? "grid";
      const instanceLayerId = node.layerId ?? node.id;
      const instanceChildLayerNodes = v2_buildCardInstanceChildLayerNodes({
        renderConfig,
        instanceLayerId,
        instanceId: node.instanceId,
        componentId: node.componentId,
      });
      return {
        id: instanceLayerId,
        label: node.label,
        kind: "component",
        icon: "layers",
        target:
          graphNode?.meta?.layerTarget ??
          (node.styleKey ? `sceneNode:${node.id}` : `cardInstance:${node.instanceId}`),
        sectionKey,
        visibilityMode: node.visibilityMode ?? "always",
        ...(instanceChildLayerNodes.length > 0
          ? { children: instanceChildLayerNodes }
          : {}),
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

  const sceneChildren: V2TemplateLayerNode[] = [];
  const gridChildren = runtimeSceneNodes
    .filter(
      (node): node is Extract<(typeof runtimeSceneNodes)[number], { kind: "componentInstance" }> =>
        node.kind === "componentInstance"
    )
    .map((node) => mapSceneNodeToLayerNode(node));
  let hasInsertedGridGroup = false;

  const createGridGroup = (): V2TemplateLayerNode => ({
    id: "scene-grid",
    label: "Grid",
    kind: "component",
    componentKey: "grid",
    icon: "grid",
    target: "grid",
    sectionKey: "grid",
    visibilityMode: "always",
    children: [...gridChildren],
  });

  runtimeSceneNodes.forEach((node) => {
    if (node.kind === "componentInstance") {
      if (!hasInsertedGridGroup && gridChildren.length > 0) {
        sceneChildren.push(createGridGroup());
        hasInsertedGridGroup = true;
      }
      return;
    }

    const mappedNode = mapSceneNodeToLayerNode(node);
    sceneChildren.push(mappedNode);
  });

  if (!hasInsertedGridGroup && gridChildren.length > 0) {
    sceneChildren.push(createGridGroup());
  }

  return [
    {
      id: "scene-root",
      label: "Scene",
      kind: "group",
      icon: "group",
      visibilityMode: "always",
      isVirtual: true,
      children: sceneChildren,
    },
  ];
};
