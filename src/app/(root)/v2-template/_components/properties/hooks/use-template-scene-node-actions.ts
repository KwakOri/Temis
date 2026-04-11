"use client";

import {
  V2TemplateColorKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_graphInsertSiblingAfter,
  v2_graphMoveNode,
  v2_graphRemoveNodeSubtree,
  v2_graphReorderNodeWithinParent,
} from "@/utils/time-table/template-graph-editor";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import {
  v2_applyRelocatedComponentInstancePatch,
  v2_COMPONENT_INSTANCE_CLONE_LAYER_PREFIX,
  v2_COMPONENT_INSTANCE_CLONE_NODE_PREFIX,
  v2_createSceneComponentInstanceCloneNode,
} from "@/utils/time-table/template-scene-component-instance";
import { v2_SCENE_STRUCTURE_MESSAGES } from "@/utils/time-table/template-scene-structure-messages";
import {
  v2_collectLayerNodeIds,
  v2_collectSceneNodeIds,
  v2_collectSceneNodeStyleKeys,
  v2_createUniqueNodeId,
  v2_findLayerNodeContextById,
  v2_findSceneNodeContextById,
} from "../model/structure-utils";
import {
  v2_isSceneNodeDescendant,
} from "../model/scene-node-graph-utils";
import useTemplateSceneBindingActions from "./use-template-scene-binding-actions";
import useTemplateSceneComponentInstanceActions from "./use-template-scene-component-instance-actions";
import useTemplateSceneStructureActions from "./use-template-scene-structure-actions";

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

const useTemplateSceneNodeActions = ({
  safeUpdateConfig,
  setSelectedPropertiesLayerId,
  setSelectedPropertiesTarget,
  setActiveHighlightTarget,
  sceneCustomNodeIdPrefix,
  sceneCustomLayerIdPrefix,
  templateColorKeys,
}: UseTemplateSceneNodeActionsParams) => {
  const {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  } = useTemplateSceneBindingActions({
    safeUpdateConfig,
    templateColorKeys,
  });

  const {
    updateSceneCardCollectionComponentId,
    syncSceneCardCollectionChildComponentIds,
    updateSceneComponentInstanceDayKey,
    updateSceneComponentInstanceInstanceId,
    updateSceneComponentInstanceComponentId,
  } = useTemplateSceneComponentInstanceActions({
    safeUpdateConfig,
  });

  const {
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
  } = useTemplateSceneStructureActions({
    safeUpdateConfig,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
    setActiveHighlightTarget,
    sceneCustomNodeIdPrefix,
    sceneCustomLayerIdPrefix,
  });

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
              if (
                !parentContext ||
                (parentContext.node.kind !== "group" &&
                  parentContext.node.kind !== "cardCollection")
              ) {
                return 0;
              }
              return parentContext.node.children?.length ?? 0;
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

      if (targetParentId === nodeId) {
        window.alert(v2_SCENE_STRUCTURE_MESSAGES.DESCENDANT_BLOCKED);
        return prev;
      }

      const targetParentContext =
        targetParentId === null
          ? null
          : v2_findSceneNodeContextById({
              nodes: runtimeSceneNodes,
              nodeId: targetParentId,
            });
      const sourceIsComponentInstance =
        sourceContext.node.kind === "componentInstance";
      const targetParentKind =
        targetParentId === null ? "root" : targetParentContext?.node.kind ?? null;

      if (targetParentId !== null) {
        if (
          !targetParentContext ||
          (targetParentContext.node.kind !== "group" &&
            targetParentContext.node.kind !== "cardCollection")
        ) {
          window.alert(v2_SCENE_STRUCTURE_MESSAGES.INVALID_PARENT_KIND);
          return prev;
        }
        if (
          targetParentContext.node.kind === "cardCollection" &&
          !sourceIsComponentInstance
        ) {
          window.alert(
            v2_SCENE_STRUCTURE_MESSAGES.CARD_COLLECTION_ACCEPTS_COMPONENT_INSTANCE_ONLY
          );
          return prev;
        }
        if (
          v2_isSceneNodeDescendant({
            ancestorNode: sourceContext.node,
            targetNodeId: targetParentId,
          })
        ) {
          window.alert(v2_SCENE_STRUCTURE_MESSAGES.DESCENDANT_BLOCKED);
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
      return v2_applyRelocatedComponentInstancePatch({
        prev,
        nextGraph,
        nodeId,
        sourceIsComponentInstance,
        targetParentKind,
        fallbackInstanceId:
          sourceContext.node.kind === "componentInstance"
            ? sourceContext.node.instanceId
            : nodeId,
      });
    });
  };

  const extractSceneComponentInstanceCopy = ({
    nodeId,
    targetParentId,
    targetIndex,
  }: {
    nodeId: string;
    targetParentId?: string | null;
    targetIndex?: number;
  }) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const sourceContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!sourceContext || sourceContext.node.kind !== "componentInstance") {
        return prev;
      }

      const targetParent = targetParentId ?? null;
      if (targetParent !== null) {
        const targetParentContext = v2_findSceneNodeContextById({
          nodes: runtimeSceneNodes,
          nodeId: targetParent,
        });
        if (!targetParentContext || targetParentContext.node.kind !== "group") {
          return prev;
        }
      }

      const existingNodeIds = new Set(Object.keys(prev.graph.nodes));
      const cloneNodeId = v2_createUniqueNodeId(
        v2_COMPONENT_INSTANCE_CLONE_NODE_PREFIX,
        existingNodeIds
      );
      const existingLayerIds = v2_collectLayerNodeIds(v2_getRuntimeLayerTree(prev));
      const cloneLayerId = v2_createUniqueNodeId(
        v2_COMPONENT_INSTANCE_CLONE_LAYER_PREFIX,
        existingLayerIds
      );
      const sourceGraphNode = prev.graph.nodes[nodeId];
      if (!sourceGraphNode || sourceGraphNode.type !== "componentInstance") {
        return prev;
      }

      const { cloneNode, styleKey } = v2_createSceneComponentInstanceCloneNode({
        sourceNode: sourceGraphNode,
        cloneNodeId,
        cloneLayerId,
      });

      let nextGraph = v2_graphInsertSiblingAfter({
        graph: prev.graph,
        anchorNodeId: nodeId,
        newNode: cloneNode,
      });
      nextGraph = v2_graphMoveNode({
        graph: nextGraph,
        nodeId: cloneNodeId,
        targetParentId: targetParent,
        ...(typeof targetIndex === "number" ? { targetIndex } : {}),
      });

      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            [styleKey]:
              prev.layout.scene[styleKey] ??
              ({
                position: "absolute",
                top: 120,
                left: 120,
              } as NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>),
          },
        },
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

  return {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
    updateSceneCardCollectionComponentId,
    syncSceneCardCollectionChildComponentIds,
    updateSceneComponentInstanceDayKey,
    updateSceneComponentInstanceInstanceId,
    updateSceneComponentInstanceComponentId,
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
    moveSceneNode,
    relocateSceneNode,
    extractSceneComponentInstanceCopy,
    removeSceneNode,
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  };
};

export default useTemplateSceneNodeActions;
