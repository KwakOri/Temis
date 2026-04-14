"use client";

import {
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_graphAppendChild,
  v2_graphInsertSiblingAfter,
} from "@/utils/time-table/template-graph-editor";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import { v2_getRuntimeSceneNodes } from "@/utils/time-table/template-graph-runtime";
import {
  v2_createCardCollectionInstanceGraphNode,
  v2_getPreferredCardCollectionComponentId,
  v2_sceneNodeToGraphNode,
} from "../model/scene-node-graph-utils";
import {
  v2_collectLayerNodeIds,
  v2_collectSceneNodeIds,
  v2_createUniqueNodeId,
  v2_findSceneNodeContextById,
} from "../model/structure-utils";
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from "../model/text-node-defaults";

interface UseTemplateSceneStructureActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  setSelectedPropertiesLayerId: (layerId: string) => void;
  setSelectedPropertiesTarget: (target: V2TemplateHighlightTarget) => void;
  setActiveHighlightTarget: (target: V2TemplateHighlightTarget | null) => void;
  sceneCustomNodeIdPrefix: string;
  sceneCustomLayerIdPrefix: string;
}

const v2_DEFAULT_CARD_INSTANCE_COUNT = 7;

const useTemplateSceneStructureActions = ({
  safeUpdateConfig,
  setSelectedPropertiesLayerId,
  setSelectedPropertiesTarget,
  setActiveHighlightTarget,
  sceneCustomNodeIdPrefix,
  sceneCustomLayerIdPrefix,
}: UseTemplateSceneStructureActionsParams) => {
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
  } | null => {
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
      const componentId = v2_getPreferredCardCollectionComponentId(prev);
      if (!componentId) return null;
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `CardCollection ${ordinal}`,
          kind: "cardCollection",
          layerId,
          componentId,
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
          assetRole: "general",
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
      if (!payload) return prev;
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;

      const nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
      let nextGraph = v2_graphInsertSiblingAfter({
        graph: prev.graph,
        anchorNodeId,
        newNode: nextGraphNode,
      });
      if (sceneNode.kind === "cardCollection") {
        const componentId = sceneNode.componentId;
        if (!componentId) return prev;
        const existingIds = new Set(Object.keys(nextGraph.nodes));
        for (let index = 0; index < v2_DEFAULT_CARD_INSTANCE_COUNT; index += 1) {
          const instanceId = String(index);
          let instanceNodeId = `${sceneNode.id}:instance:${instanceId}`;
          let suffix = 1;
          while (existingIds.has(instanceNodeId)) {
            instanceNodeId = `${sceneNode.id}:instance:${instanceId}:${suffix}`;
            suffix += 1;
          }
          existingIds.add(instanceNodeId);
          nextGraph = v2_graphAppendChild({
            graph: nextGraph,
            parentId: sceneNode.id,
            newNode: v2_createCardCollectionInstanceGraphNode({
              nodeId: instanceNodeId,
              collectionNodeId: sceneNode.id,
              collectionLayerId: sceneNode.layerId,
              componentId,
              instanceId,
            }),
          });
        }
      }
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
      if (!payload) return prev;
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;

      const nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
      let nextGraph = v2_graphAppendChild({
        graph: prev.graph,
        parentId: parentNodeId,
        newNode: nextGraphNode,
      });
      if (sceneNode.kind === "cardCollection") {
        const componentId = sceneNode.componentId;
        if (!componentId) return prev;
        const existingIds = new Set(Object.keys(nextGraph.nodes));
        for (let index = 0; index < v2_DEFAULT_CARD_INSTANCE_COUNT; index += 1) {
          const instanceId = String(index);
          let instanceNodeId = `${sceneNode.id}:instance:${instanceId}`;
          let suffix = 1;
          while (existingIds.has(instanceNodeId)) {
            instanceNodeId = `${sceneNode.id}:instance:${instanceId}:${suffix}`;
            suffix += 1;
          }
          existingIds.add(instanceNodeId);
          nextGraph = v2_graphAppendChild({
            graph: nextGraph,
            parentId: sceneNode.id,
            newNode: v2_createCardCollectionInstanceGraphNode({
              nodeId: instanceNodeId,
              collectionNodeId: sceneNode.id,
              collectionLayerId: sceneNode.layerId,
              componentId,
              instanceId,
            }),
          });
        }
      }
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

  return {
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
  };
};

export default useTemplateSceneStructureActions;
