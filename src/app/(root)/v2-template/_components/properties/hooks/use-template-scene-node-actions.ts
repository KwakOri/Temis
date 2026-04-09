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
import {
  v2_collectLayerNodeIds,
  v2_collectSceneNodeIds,
  v2_collectSceneNodeStyleKeys,
  v2_createUniqueNodeId,
  v2_findLayerNodeContextById,
  v2_findSceneNodeContextById,
  v2_updateLayerNodeLabelById,
  v2_updateLayerNodeListByParentId,
  v2_updateSceneNodeById,
  v2_updateSceneNodeListByParentId,
  v2_updateSceneTextNodeById,
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
      childIds: [],
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
      meta: {
        source: sceneNode.source,
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
      const { nodes: nextSceneNodes, updated } = v2_updateSceneNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => ({
          ...node,
          visibilityMode,
        }),
      });

      if (!updated) return prev;

      return {
        ...prev,
        graph: v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
          ...node,
          visibilityMode,
        })),
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  const updateSceneNodeLabel = (nodeId: string, rawLabel: string) => {
    const nextLabel = rawLabel.trim();
    if (!nextLabel) return;

    safeUpdateConfig((prev) => {
      const { nodes: nextSceneNodes, updated, matchedNode } =
        v2_updateSceneNodeById({
          nodes: prev.structure.sceneNodes,
          nodeId,
          updater: (node) => ({
            ...node,
            label: nextLabel,
          }),
        });

      if (!updated) return prev;

      const nextLayers = matchedNode?.layerId
        ? v2_updateLayerNodeLabelById(
            prev.structure.layers,
            matchedNode.layerId,
            nextLabel
          )
        : prev.structure.layers;

      return {
        ...prev,
        graph: v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
          ...node,
          label: nextLabel,
        })),
        structure: {
          ...prev.structure,
          layers: nextLayers,
          sceneNodes: nextSceneNodes,
        },
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
      const { nodes: nextSceneNodes, updated } = v2_updateSceneNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => {
          if (node.kind !== "asset") return node;
          const nextAlt = typeof alt === "string" ? alt.trim() : undefined;
          return {
            ...node,
            ...(assetKey ? { assetKey } : {}),
            ...(fit ? { fit } : {}),
            ...(nextAlt !== undefined ? { alt: nextAlt } : {}),
          };
        },
      });

      if (!updated) return prev;

      return {
        ...prev,
        graph: v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
          ...node,
          meta: {
            ...(node.meta ?? {}),
            ...(assetKey ? { assetKey } : {}),
            ...(fit ? { fit } : {}),
            ...(typeof alt === "string" ? { alt: alt.trim() } : {}),
          },
        })),
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
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
    const existingSceneNodeIds = v2_collectSceneNodeIds(prev.structure.sceneNodes);
    const existingLayerNodeIds = v2_collectLayerNodeIds(prev.structure.layers);
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
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `CardCollection ${ordinal}`,
          kind: "cardCollection",
          layerId,
          source: "card",
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
      const anchorContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId: anchorNodeId,
      });
      if (!anchorContext) return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;
      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: anchorContext.parentId,
          updater: (siblings) => {
            const nextSiblings = [...siblings];
            nextSiblings.splice(anchorContext.index + 1, 0, sceneNode);
            return nextSiblings;
          },
        });
      if (!sceneUpdated) return prev;

      const anchorLayerId = anchorContext.node.layerId;
      let nextLayers = prev.structure.layers;
      if (anchorLayerId) {
        const layerContext = v2_findLayerNodeContextById({
          nodes: prev.structure.layers,
          nodeId: anchorLayerId,
        });
        if (layerContext) {
          const { nodes: updatedLayers } = v2_updateLayerNodeListByParentId({
            nodes: prev.structure.layers,
            parentId: layerContext.parentId,
            updater: (siblings) => {
              const nextSiblings = [...siblings];
              nextSiblings.splice(layerContext.index + 1, 0, layerNode);
              return nextSiblings;
            },
          });
          nextLayers = updatedLayers;
        }
      }

      const nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
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
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
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
      const parentContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId: parentNodeId,
      });
      if (!parentContext || parentContext.node.kind !== "group") return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;
      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: parentNodeId,
          updater: (siblings) => [...siblings, sceneNode],
        });
      if (!sceneUpdated) return prev;

      const parentLayerId = parentContext.node.layerId ?? null;
      const { nodes: nextLayers } = v2_updateLayerNodeListByParentId({
        nodes: prev.structure.layers,
        parentId: parentLayerId,
        updater: (siblings) => [...siblings, layerNode],
      });

      const nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
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
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
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
      const context = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId,
      });
      if (!context) return prev;
      const targetIndex = direction === "up" ? context.index - 1 : context.index + 1;

      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: context.parentId,
          updater: (siblings) => {
            if (targetIndex < 0 || targetIndex >= siblings.length) return siblings;
            const nextSiblings = [...siblings];
            const [moved] = nextSiblings.splice(context.index, 1);
            if (!moved) return siblings;
            nextSiblings.splice(targetIndex, 0, moved);
            return nextSiblings;
          },
        });
      if (!sceneUpdated) return prev;

      const layerId = context.node.layerId;
      if (!layerId) {
        return {
          ...prev,
          graph: v2_graphReorderNodeWithinParent({
            graph: prev.graph,
            nodeId,
            direction,
          }),
          structure: {
            ...prev.structure,
            sceneNodes: nextSceneNodes,
          },
        };
      }

      const layerContext = v2_findLayerNodeContextById({
        nodes: prev.structure.layers,
        nodeId: layerId,
      });
      if (!layerContext) {
        return {
          ...prev,
          graph: v2_graphReorderNodeWithinParent({
            graph: prev.graph,
            nodeId,
            direction,
          }),
          structure: {
            ...prev.structure,
            sceneNodes: nextSceneNodes,
          },
        };
      }

      const { nodes: nextLayers } = v2_updateLayerNodeListByParentId({
        nodes: prev.structure.layers,
        parentId: layerContext.parentId,
        updater: (siblings) => {
          const nextSiblings = [...siblings];
          const currentIndex = nextSiblings.findIndex((item) => item.id === layerId);
          if (currentIndex < 0) return siblings;
          const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0 || nextIndex >= nextSiblings.length) return siblings;
          const [moved] = nextSiblings.splice(currentIndex, 1);
          if (!moved) return siblings;
          nextSiblings.splice(nextIndex, 0, moved);
          return nextSiblings;
        },
      });

      return {
        ...prev,
        graph: v2_graphReorderNodeWithinParent({
          graph: prev.graph,
          nodeId,
          direction,
        }),
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
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
      const sourceContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId,
      });
      if (!sourceContext) return prev;

      if (targetParentId === nodeId) return prev;

      const targetParentContext =
        targetParentId === null
          ? null
          : v2_findSceneNodeContextById({
              nodes: prev.structure.sceneNodes,
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

      const { nodes: afterRemovalNodes, updated: removalUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: sourceParentId,
          updater: (siblings) => siblings.filter((sibling) => sibling.id !== nodeId),
        });
      if (!removalUpdated) return prev;

      const { nodes: nextSceneNodes, updated: insertUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: afterRemovalNodes,
          parentId: targetParentId,
          updater: (siblings) => {
            const nextSiblings = [...siblings];
            const insertAt = Number.isFinite(effectiveTargetIndex)
              ? Math.max(0, Math.min(nextSiblings.length, effectiveTargetIndex))
              : nextSiblings.length;
            nextSiblings.splice(insertAt, 0, sourceContext.node);
            return nextSiblings;
          },
        });
      if (!insertUpdated) return prev;

      let nextLayers = prev.structure.layers;
      const sourceLayerId = sourceContext.node.layerId ?? null;
      if (sourceLayerId) {
        const sourceLayerContext = v2_findLayerNodeContextById({
          nodes: prev.structure.layers,
          nodeId: sourceLayerId,
        });
        if (sourceLayerContext) {
          const targetLayerParentId =
            targetParentId === null
              ? null
              : (targetParentContext?.node.layerId ?? null);

          const { nodes: nextLayerAfterRemoval, updated: layerRemovalUpdated } =
            v2_updateLayerNodeListByParentId({
              nodes: prev.structure.layers,
              parentId: sourceLayerContext.parentId,
              updater: (siblings) =>
                siblings.filter((sibling) => sibling.id !== sourceLayerId),
            });

          if (layerRemovalUpdated) {
            const sourceLayerIndex = sourceLayerContext.index;
            const effectiveLayerIndex =
              sourceLayerContext.parentId === targetLayerParentId &&
              desiredIndex > sourceLayerIndex
                ? desiredIndex - 1
                : desiredIndex;

            const { nodes: updatedLayers, updated: layerInsertUpdated } =
              v2_updateLayerNodeListByParentId({
                nodes: nextLayerAfterRemoval,
                parentId: targetLayerParentId,
                updater: (siblings) => {
                  const nextSiblings = [...siblings];
                  const insertAt = Number.isFinite(effectiveLayerIndex)
                    ? Math.max(0, Math.min(nextSiblings.length, effectiveLayerIndex))
                    : nextSiblings.length;
                  nextSiblings.splice(insertAt, 0, sourceLayerContext.node);
                  return nextSiblings;
                },
              });

            if (layerInsertUpdated) {
              nextLayers = updatedLayers;
            }
          }
        }
      }

      return {
        ...prev,
        graph: v2_graphMoveNode({
          graph: prev.graph,
          nodeId,
          targetParentId,
          targetIndex: Number.isFinite(effectiveTargetIndex)
            ? effectiveTargetIndex
            : undefined,
        }),
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
      };
    });
  };

  const removeSceneNode = (nodeId: string) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const targetContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId,
      });
      if (!targetContext) return prev;
      if (!isSceneCustomNode(targetContext.node.id)) return prev;

      if (targetContext.parentId) {
        const parentSceneContext = v2_findSceneNodeContextById({
          nodes: prev.structure.sceneNodes,
          nodeId: targetContext.parentId,
        });
        if (parentSceneContext?.node.layerId) {
          const parentLayerContext = v2_findLayerNodeContextById({
            nodes: prev.structure.layers,
            nodeId: parentSceneContext.node.layerId,
          });
          if (parentLayerContext) {
            nextFocusLayerId = parentLayerContext.node.id;
            nextFocusTarget = parentLayerContext.node.target ?? null;
          }
        }
      } else if (prev.structure.layers.length > 0) {
        nextFocusLayerId = prev.structure.layers[0].id;
        nextFocusTarget = prev.structure.layers[0].target ?? null;
      }

      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: targetContext.parentId,
          updater: (siblings) =>
            siblings.filter((sibling) => sibling.id !== targetContext.node.id),
        });
      if (!sceneUpdated) return prev;

      const styleKeysToDelete = v2_collectSceneNodeStyleKeys(targetContext.node);
      const nextSceneLayout = {
        ...prev.layout.scene,
      };
      styleKeysToDelete.forEach((styleKey) => {
        if (styleKey in nextSceneLayout) {
          delete nextSceneLayout[styleKey];
        }
      });

      const targetLayerId = targetContext.node.layerId;
      const nextLayers = targetLayerId
        ? (() => {
            const layerContext = v2_findLayerNodeContextById({
              nodes: prev.structure.layers,
              nodeId: targetLayerId,
            });
            if (!layerContext) return prev.structure.layers;
            return v2_updateLayerNodeListByParentId({
              nodes: prev.structure.layers,
              parentId: layerContext.parentId,
              updater: (siblings) =>
                siblings.filter((sibling) => sibling.id !== targetLayerId),
            }).nodes;
          })()
        : prev.structure.layers;

      return {
        ...prev,
        graph: v2_graphRemoveNodeSubtree(prev.graph, nodeId),
        layout: {
          ...prev.layout,
          scene: nextSceneLayout,
        },
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
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
      const { nodes: nextSceneNodes, updated } = v2_updateSceneTextNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => ({
          ...node,
          binding,
        }),
      });

      if (!updated) return prev;

      return {
        ...prev,
        graph: v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
          ...node,
          binding,
          meta: {
            ...(node.meta ?? {}),
            layerIcon: binding.mode === "computed" ? "calendar" : "text",
          },
        })),
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
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

      const { nodes: nextSceneNodes, updated, matchedNode } =
        v2_updateSceneTextNodeById({
          nodes: prev.structure.sceneNodes,
          nodeId,
          updater: (node) => ({
            ...node,
            ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
            ...(nextColorKey ? { colorKey: nextColorKey } : {}),
            ...(nextFontKey ? { fontKey: nextFontKey } : {}),
          }),
        });

      if (!updated) return prev;

      const nextLayers =
        nextLabel && nextLabel.length > 0 && matchedNode?.layerId
          ? v2_updateLayerNodeLabelById(
              prev.structure.layers,
              matchedNode.layerId,
              nextLabel
            )
          : prev.structure.layers;

      return {
        ...prev,
        graph: v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
          ...node,
          ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
          meta: {
            ...(node.meta ?? {}),
            ...(nextColorKey ? { colorKey: nextColorKey } : {}),
            ...(nextFontKey ? { fontKey: nextFontKey } : {}),
          },
        })),
        structure: {
          ...prev.structure,
          layers: nextLayers,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  return {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
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
