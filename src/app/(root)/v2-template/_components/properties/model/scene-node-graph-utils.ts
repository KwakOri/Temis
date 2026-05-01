import {
  V2TemplateGraphNode,
  V2TemplateSceneNode,
} from "@/types/time-table/template-render-config";

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
      ...(sceneNode.styleKey
        ? {
            styles: {
              styleKey: sceneNode.styleKey,
            },
          }
        : {}),
      meta: {
        layerIcon: "group",
        ...(sceneNode.styleKey
          ? {
              layerTarget: `sceneNode:${sceneNode.id}`,
              layerSectionKey: sceneNode.styleKey,
            }
          : {}),
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
        ...(sceneNode.assetRef ? { assetRef: sceneNode.assetRef } : {}),
        ...(sceneNode.assetRole ? { assetRole: sceneNode.assetRole } : {}),
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
      childIds: [],
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      meta: {
        ...(sceneNode.componentId ? { componentId: sceneNode.componentId } : {}),
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
        ...(sceneNode.bindingOverrides
          ? { bindingOverrides: sceneNode.bindingOverrides }
          : {}),
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
  if (ancestorNode.kind !== "group" || !ancestorNode.children) {
    return false;
  }
  const queue = [...ancestorNode.children];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.id === targetNodeId) return true;
    if (current.kind === "group" && current.children) {
      queue.push(...current.children);
    }
  }

  return false;
};
