"use client";

import {
  V2TemplateAssetMap,
  V2TemplateColorKey,
  V2TemplateGraphNode,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_graphAppendChild,
  v2_graphInsertSiblingAfter,
  v2_graphMoveNode,
  v2_graphRemoveNodeSubtree,
  v2_graphReorderNodeWithinParent,
  v2_graphUpdateNode,
} from "@/utils/time-table/template-graph-editor";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getDefaultCardComponentId,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import {
  v2_collectLayerNodeIds,
  v2_collectSceneNodeIds,
  v2_collectSceneNodeStyleKeys,
  v2_createUniqueNodeId,
  v2_findLayerNodeContextById,
  v2_findSceneNodeContextById,
} from "../model/structure-utils";
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from "../model/text-node-defaults";

interface UseTemplateSceneNodeActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  setSelectedPropertiesLayerId: (layerId: string) => void;
  setSelectedPropertiesTarget: (target: V2TemplateHighlightTarget) => void;
  setActiveHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  sceneCustomNodeIdPrefix: string;
  sceneCustomLayerIdPrefix: string;
  templateColorKeys: readonly V2TemplateColorKey[];
}

const v2_sceneNodeToGraphNode = (
  sceneNode: V2TemplateSceneNode,
  defaultCardComponentId: string
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
      childIds: [],
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      meta: {
        componentId: sceneNode.componentId ?? defaultCardComponentId,
        layerTarget: "grid",
        layerSectionKey: "grid",
        layerIcon: "grid",
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

const v2_isSceneNodeDescendant = ({
  ancestorNode,
  targetNodeId,
}: {
  ancestorNode: V2TemplateSceneNode;
  targetNodeId: string;
}): boolean => {
  if (ancestorNode.kind !== "group") return false;
  const queue = [...ancestorNode.children];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.id === targetNodeId) return true;
    if (current.kind === "group") {
      queue.push(...current.children);
    }
  }

  return false;
};

const useTemplateSceneNodeActions = ({
  safeUpdateConfig,
  setSelectedPropertiesLayerId,
  setSelectedPropertiesTarget,
  setActiveHighlightTarget,
  sceneCustomNodeIdPrefix,
  sceneCustomLayerIdPrefix,
  templateColorKeys,
}: UseTemplateSceneNodeActionsParams) => {
  const updateSceneNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext) return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        visibilityMode,
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneNodeLabel = (nodeId: string, rawLabel: string) => {
    const nextLabel = rawLabel.trim();
    if (!nextLabel) return;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext) return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        label: nextLabel,
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneAssetNodeMeta = ({
    nodeId,
    assetKey,
    fit,
    alt,
  }: {
    nodeId: string;
    assetKey?: keyof V2TemplateAssetMap;
    fit?: V2TemplateSceneAssetNode["fit"];
    alt?: string;
  }) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "asset") return prev;
      const nextAlt = typeof alt === "string" ? alt.trim() : undefined;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          ...(assetKey ? { assetKey } : {}),
          ...(fit ? { fit } : {}),
          ...(nextAlt !== undefined ? { alt: nextAlt } : {}),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneCardCollectionComponentId = (
    nodeId: string,
    rawComponentId: string
  ) => {
    const componentId = rawComponentId.trim();
    if (!componentId) return;

    safeUpdateConfig((prev) => {
      if (!prev.graph.componentDefinitions[componentId]) {
        return prev;
      }

      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "cardCollection") return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          componentId,
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const isSceneCustomNode = (nodeId: string) =>
    nodeId.startsWith(sceneCustomNodeIdPrefix);

  const createCustomSceneNodePayload = (
    prev: V2TemplateRenderConfig,
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection"
  ): {
    sceneNode: V2TemplateSceneNode;
    layerNode: V2TemplateLayerNode;
    dynamicSceneLayoutPatch: Record<
      string,
      NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>
    >;
  } => {
    const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
    const runtimeLayerTree = v2_getRuntimeLayerTree(prev);
    const existingSceneNodeIds = v2_collectSceneNodeIds(runtimeSceneNodes);
    const existingLayerNodeIds = v2_collectLayerNodeIds(runtimeLayerTree);
    const baseSceneNodeId = v2_createUniqueNodeId(
      sceneCustomNodeIdPrefix,
      existingSceneNodeIds
    );
    const layerId = v2_createUniqueNodeId(
      sceneCustomLayerIdPrefix,
      existingLayerNodeIds
    );
    const ordinal = baseSceneNodeId.replace(sceneCustomNodeIdPrefix, "");

    if (kind === "group") {
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Group ${ordinal}`,
          kind: "group",
          layerId,
          visibilityMode: "always",
          children: [],
        },
        layerNode: {
          id: layerId,
          label: `Group ${ordinal}`,
          kind: "group",
          icon: "group",
          target: `sceneNode:${baseSceneNodeId}`,
          visibilityMode: "always",
          children: [],
        },
        dynamicSceneLayoutPatch: {},
      };
    }

    if (kind === "cardCollection") {
      const defaultCardComponentId = v2_getDefaultCardComponentId(prev);
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `CardCollection ${ordinal}`,
          kind: "cardCollection",
          layerId,
          componentId: defaultCardComponentId,
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `CardCollection ${ordinal}`,
          kind: "component",
          icon: "grid",
          target: `sceneNode:${baseSceneNodeId}`,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: {},
      };
    }

    if (kind === "asset") {
      const styleKey = `sceneNode:${baseSceneNodeId}:style`;
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Asset ${ordinal}`,
          kind: "asset",
          layerId,
          assetKey: "topObjectByTheme",
          styleKey,
          fit: "cover",
          alt: `asset-${ordinal}`,
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `Asset ${ordinal}`,
          kind: "component",
          icon: "image",
          target: `sceneNode:${baseSceneNodeId}`,
          sectionKey: styleKey,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: {
          [styleKey]: {
            position: "absolute",
            top: 0,
            left: 0,
            width: 240,
            height: 240,
          },
        },
      };
    }

    const containerStyleKey = `sceneNode:${baseSceneNodeId}:container`;
    const textStyleKey = `sceneNode:${baseSceneNodeId}:text`;
    if (kind === "text") {
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Text ${ordinal}`,
          kind: "text",
          layerId,
          binding: {
            mode: "literal",
            value: `Text ${ordinal}`,
          },
          containerStyleKey,
          textStyleKey,
          colorKey: "SUB_TITLE",
          fontKey: "SUB_TITLE",
          highlightTarget: `sceneNode:${baseSceneNodeId}`,
          containerClassName: v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
          textClassName: "text-center",
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `Text ${ordinal}`,
          kind: "component",
          icon: "text",
          target: `sceneNode:${baseSceneNodeId}`,
          sectionKey: containerStyleKey,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: v2_createDefaultTextNodeLayoutPatch({
          containerStyleKey,
          textStyleKey,
          isFlexibleText: false,
        }),
      };
    }

    const wrapperStyleKey = `sceneNode:${baseSceneNodeId}:wrapper`;
    const optionsKey = `sceneNode:${baseSceneNodeId}:options`;
    return {
      sceneNode: {
        id: baseSceneNodeId,
        label: `FlexibleText ${ordinal}`,
        kind: "flexibleText",
        layerId,
        binding: {
          mode: "literal",
          value: `FlexibleText ${ordinal}`,
        },
        containerStyleKey,
        wrapperStyleKey,
        textStyleKey,
        optionsKey,
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        highlightTarget: `sceneNode:${baseSceneNodeId}`,
        containerClassName: v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
        textClassName: v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
        visibilityMode: "always",
      },
      layerNode: {
        id: layerId,
        label: `FlexibleText ${ordinal}`,
        kind: "component",
        icon: "text",
        target: `sceneNode:${baseSceneNodeId}`,
        sectionKey: containerStyleKey,
        visibilityMode: "always",
      },
      dynamicSceneLayoutPatch: v2_createDefaultTextNodeLayoutPatch({
        containerStyleKey,
        textStyleKey,
        wrapperStyleKey,
        optionsKey,
        isFlexibleText: true,
      }),
    };
  };

  const addSceneSiblingNode = ({
    anchorNodeId,
    kind,
  }: {
    anchorNodeId: string;
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
  }) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const anchorContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId: anchorNodeId,
      });
      if (!anchorContext) return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;

      const nextGraphNode = v2_sceneNodeToGraphNode(
        sceneNode,
        v2_getDefaultCardComponentId(prev)
      );
      const nextGraph = v2_graphInsertSiblingAfter({
        graph: prev.graph,
        anchorNodeId,
        newNode: nextGraphNode,
      });
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            ...dynamicSceneLayoutPatch,
          },
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const addSceneChildNode = ({
    parentNodeId,
    kind,
  }: {
    parentNodeId: string;
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
  }) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const parentContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId: parentNodeId,
      });
      if (!parentContext || parentContext.node.kind !== "group") return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;

      const nextGraphNode = v2_sceneNodeToGraphNode(
        sceneNode,
        v2_getDefaultCardComponentId(prev)
      );
      const nextGraph = v2_graphAppendChild({
        graph: prev.graph,
        parentId: parentNodeId,
        newNode: nextGraphNode,
      });
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            ...dynamicSceneLayoutPatch,
          },
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const moveSceneNode = ({
    nodeId,
    direction,
  }: {
    nodeId: string;
    direction: "up" | "down";
  }) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const context = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!context) return prev;
      const targetIndex = direction === "up" ? context.index - 1 : context.index + 1;
      const siblingCount =
        context.parentId === null
          ? runtimeSceneNodes.length
          : (() => {
              const parentContext = v2_findSceneNodeContextById({
                nodes: runtimeSceneNodes,
                nodeId: context.parentId,
              });
              if (!parentContext || parentContext.node.kind !== "group") return 0;
              return parentContext.node.children.length;
            })();
      if (targetIndex < 0 || targetIndex >= siblingCount) return prev;

      const nextGraph = v2_graphReorderNodeWithinParent({
        graph: prev.graph,
        nodeId,
        direction,
      });
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const relocateSceneNode = ({
    nodeId,
    targetParentId,
    targetIndex,
  }: {
    nodeId: string;
    targetParentId: string | null;
    targetIndex?: number;
  }) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const sourceContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!sourceContext) return prev;

      if (targetParentId === nodeId) return prev;

      const targetParentContext =
        targetParentId === null
          ? null
          : v2_findSceneNodeContextById({
              nodes: runtimeSceneNodes,
              nodeId: targetParentId,
            });

      if (targetParentId !== null) {
        if (!targetParentContext || targetParentContext.node.kind !== "group") {
          return prev;
        }
        if (
          v2_isSceneNodeDescendant({
            ancestorNode: sourceContext.node,
            targetNodeId: targetParentId,
          })
        ) {
          return prev;
        }
      }

      const sourceParentId = sourceContext.parentId;
      const sourceIndex = sourceContext.index;
      const desiredIndex = Number.isFinite(targetIndex)
        ? Math.max(0, Math.floor(targetIndex as number))
        : Number.POSITIVE_INFINITY;
      const effectiveTargetIndex =
        sourceParentId === targetParentId && desiredIndex > sourceIndex
          ? desiredIndex - 1
          : desiredIndex;
      const nextGraph = v2_graphMoveNode({
        graph: prev.graph,
        nodeId,
        targetParentId,
        targetIndex: Number.isFinite(effectiveTargetIndex)
          ? effectiveTargetIndex
          : undefined,
      });
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const removeSceneNode = (nodeId: string) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const runtimeLayerTree = v2_getRuntimeLayerTree(prev);
      const targetContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!targetContext) return prev;
      if (!isSceneCustomNode(targetContext.node.id)) return prev;

      if (targetContext.parentId) {
        const parentSceneContext = v2_findSceneNodeContextById({
          nodes: runtimeSceneNodes,
          nodeId: targetContext.parentId,
        });
        if (parentSceneContext?.node.layerId) {
          const parentLayerContext = v2_findLayerNodeContextById({
            nodes: runtimeLayerTree,
            nodeId: parentSceneContext.node.layerId,
          });
          if (parentLayerContext) {
            nextFocusLayerId = parentLayerContext.node.id;
            nextFocusTarget = parentLayerContext.node.target ?? null;
          }
        }
      } else if (runtimeLayerTree.length > 0) {
        nextFocusLayerId = runtimeLayerTree[0].id;
        nextFocusTarget = runtimeLayerTree[0].target ?? null;
      }

      const styleKeysToDelete = v2_collectSceneNodeStyleKeys(targetContext.node);
      const nextSceneLayout = {
        ...prev.layout.scene,
      };
      styleKeysToDelete.forEach((styleKey) => {
        if (styleKey in nextSceneLayout) {
          delete nextSceneLayout[styleKey];
        }
      });
      const nextGraph = v2_graphRemoveNodeSubtree(prev.graph, nodeId);
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          scene: nextSceneLayout,
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const updateSceneTextNodeBinding = (
    nodeId: string,
    binding: V2TemplateSceneTextNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (
        !nodeContext ||
        (nodeContext.node.kind !== "text" && nodeContext.node.kind !== "flexibleText")
      ) {
        return prev;
      }
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        binding,
        meta: {
          ...(node.meta ?? {}),
          layerIcon: binding.mode === "computed" ? "calendar" : "text",
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneTextNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    updateSceneNodeVisibilityMode(nodeId, visibilityMode);
  };

  const updateSceneTextNodeMeta = ({
    nodeId,
    label,
    colorKey,
    fontKey,
  }: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateSceneTextNode["colorKey"];
    fontKey?: V2TemplateSceneTextNode["fontKey"];
  }) => {
    safeUpdateConfig((prev) => {
      const nextLabel = typeof label === "string" ? label.trim() : undefined;
      const nextColorKey =
        typeof colorKey === "string" && templateColorKeys.includes(colorKey)
          ? colorKey
          : undefined;
      const nextFontKey =
        typeof fontKey === "string" && templateColorKeys.includes(fontKey)
          ? fontKey
          : undefined;
      if (!nextLabel && !nextColorKey && !nextFontKey) return prev;
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (
        !nodeContext ||
        (nodeContext.node.kind !== "text" && nodeContext.node.kind !== "flexibleText")
      ) {
        return prev;
      }
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
        meta: {
          ...(node.meta ?? {}),
          ...(nextColorKey ? { colorKey: nextColorKey } : {}),
          ...(nextFontKey ? { fontKey: nextFontKey } : {}),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  return {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
    updateSceneCardCollectionComponentId,
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
    moveSceneNode,
    relocateSceneNode,
    removeSceneNode,
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  };
};

export default useTemplateSceneNodeActions;
