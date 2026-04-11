import {
  V2TemplateGraphNode,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeSceneNodes } from "@/utils/time-table/template-graph-runtime";
import { v2_dayKeyFromIndex } from "@/utils/time-table/template-render-config";

export const v2_getPreferredCardCollectionComponentId = (
  config: V2TemplateRenderConfig
): string | null => {
  const componentDefinitions = config.graph.componentDefinitions ?? {};
  const validComponentIdSet = new Set(Object.keys(componentDefinitions));
  if (validComponentIdSet.size === 0) return null;

  const runtimeSceneNodes = v2_getRuntimeSceneNodes(config);
  const queue = [...runtimeSceneNodes];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.kind === "cardCollection") {
      const componentId = node.componentId?.trim();
      if (componentId && validComponentIdSet.has(componentId)) {
        return componentId;
      }
    }
    if (node.kind === "group") {
      queue.push(...node.children);
    }
  }

  const templateComponentDefinition = Object.values(componentDefinitions).find(
    (definition) => definition.kind === "template"
  );
  return templateComponentDefinition?.id ?? null;
};

export const v2_createCardCollectionInstanceGraphNode = ({
  nodeId,
  collectionNodeId,
  collectionLayerId,
  componentId,
  instanceId,
}: {
  nodeId: string;
  collectionNodeId: string;
  collectionLayerId?: string;
  componentId: string;
  instanceId: string;
}): V2TemplateGraphNode => {
  const parsed = Number.parseInt(instanceId, 10);
  const safeIndex = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const dayKey = v2_dayKeyFromIndex(safeIndex);

  return {
    id: nodeId,
    type: "componentInstance",
    label: `Card ${safeIndex + 1}`,
    parentId: collectionNodeId,
    childIds: [],
    layerId: `${collectionLayerId ?? collectionNodeId}-instance-${safeIndex + 1}`,
    visibilityMode: "always",
    meta: {
      componentId,
      instanceId,
      dayKey,
      layerTarget: `cardInstance:${instanceId}`,
      layerSectionKey: "grid",
      layerIcon: "layers",
    },
  };
};

export const v2_sceneNodeToGraphNode = (
  sceneNode: V2TemplateSceneNode
): V2TemplateGraphNode => {
  if (sceneNode.kind === "group") {
    return {
      id: sceneNode.id,
      type: "group",
      label: sceneNode.label,
      parentId: null,
      childIds: sceneNode.children.map((child) => child.id),
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      meta: {
        layerIcon: "group",
      },
    };
  }

  if (sceneNode.kind === "asset") {
    return {
      id: sceneNode.id,
      type: "image",
      label: sceneNode.label,
      parentId: null,
      childIds: [],
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      ...(sceneNode.styleKey ? { styles: { styleKey: sceneNode.styleKey } } : {}),
      meta: {
        assetKey: sceneNode.assetKey,
        ...(sceneNode.fit ? { fit: sceneNode.fit } : {}),
        ...(sceneNode.alt ? { alt: sceneNode.alt } : {}),
        ...(sceneNode.styleKey ? { layerSectionKey: sceneNode.styleKey } : {}),
        layerIcon: "image",
      },
    };
  }

  if (sceneNode.kind === "cardCollection") {
    return {
      id: sceneNode.id,
      type: "cardCollection",
      label: sceneNode.label,
      parentId: null,
      childIds: (sceneNode.children ?? []).map((child) => child.id),
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      meta: {
        componentId: sceneNode.componentId,
        layerTarget: "grid",
        layerSectionKey: "grid",
        layerIcon: "grid",
      },
    };
  }

  if (sceneNode.kind === "componentInstance") {
    return {
      id: sceneNode.id,
      type: "componentInstance",
      label: sceneNode.label,
      parentId: null,
      childIds: [],
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      ...(sceneNode.styleKey
        ? {
            styles: {
              styleKey: sceneNode.styleKey,
            },
          }
        : {}),
      meta: {
        componentId: sceneNode.componentId,
        instanceId: sceneNode.instanceId,
        dayKey: sceneNode.dayKey,
        layerTarget: sceneNode.styleKey
          ? `sceneNode:${sceneNode.id}`
          : `cardInstance:${sceneNode.instanceId}`,
        layerSectionKey: sceneNode.styleKey ?? "grid",
        layerIcon: "layers",
      },
    };
  }

  return {
    id: sceneNode.id,
    type: sceneNode.kind === "flexibleText" ? "flexibleText" : "text",
    label: sceneNode.label,
    parentId: null,
    childIds: [],
    ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
    ...(sceneNode.highlightTarget ? { highlightTarget: sceneNode.highlightTarget } : {}),
    ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
    binding: sceneNode.binding,
    styles: {
      containerStyleKey: sceneNode.containerStyleKey,
      ...(sceneNode.textStyleKey ? { textStyleKey: sceneNode.textStyleKey } : {}),
      ...(sceneNode.wrapperStyleKey ? { wrapperStyleKey: sceneNode.wrapperStyleKey } : {}),
      ...(sceneNode.optionsKey ? { optionsKey: sceneNode.optionsKey } : {}),
    },
    meta: {
      colorKey: sceneNode.colorKey,
      fontKey: sceneNode.fontKey,
      layerTarget: sceneNode.highlightTarget,
      layerSectionKey: sceneNode.containerStyleKey,
      layerIcon: sceneNode.binding.mode === "computed" ? "calendar" : "text",
      ...(sceneNode.containerClassName
        ? { containerClassName: sceneNode.containerClassName }
        : {}),
      ...(sceneNode.textClassName ? { textClassName: sceneNode.textClassName } : {}),
    },
  };
};

export const v2_isSceneNodeDescendant = ({
  ancestorNode,
  targetNodeId,
}: {
  ancestorNode: V2TemplateSceneNode;
  targetNodeId: string;
}): boolean => {
  if (
    (ancestorNode.kind !== "group" && ancestorNode.kind !== "cardCollection") ||
    !ancestorNode.children
  ) {
    return false;
  }
  const queue = [...ancestorNode.children];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.id === targetNodeId) return true;
    if (
      (current.kind === "group" || current.kind === "cardCollection") &&
      current.children
    ) {
      queue.push(...current.children);
    }
  }

  return false;
};
