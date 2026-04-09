"use client";

import {
  V2TemplateCardInstanceTransform,
  V2TemplateCardNode,
  V2TemplateCardNodeKind,
  V2TemplateGraphNode,
  V2TemplateCardOptionsKey,
  V2TemplateColorKey,
  V2TemplateRenderConfig,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_graphAppendChild,
  v2_graphRemoveNodeSubtree,
  v2_graphUpdateNode,
} from "@/utils/time-table/template-graph-editor";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from "../model/text-node-defaults";

interface UseTemplateCardNodeActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  templateColorKeys: readonly V2TemplateColorKey[];
  fixedCardNodeIds: Set<string>;
}

const useTemplateCardNodeActions = ({
  safeUpdateConfig,
  templateColorKeys,
  fixedCardNodeIds,
}: UseTemplateCardNodeActionsParams) => {
  const v2_cardNodeToGraphNode = (node: V2TemplateCardNode): V2TemplateGraphNode => {
    return {
      id: node.id,
      type: node.kind === "flexibleText" ? "flexibleText" : "text",
      label: node.label,
      parentId: null,
      childIds: [],
      layerId: node.layerId,
      highlightTarget: node.highlightTarget,
      visibilityMode: node.visibilityMode,
      binding: node.binding,
      styles: {
        containerStyleKey: node.containerStyleKey,
        ...(node.textStyleKey ? { textStyleKey: node.textStyleKey } : {}),
        ...(node.wrapperStyleKey ? { wrapperStyleKey: node.wrapperStyleKey } : {}),
        ...(node.optionsKey ? { optionsKey: node.optionsKey } : {}),
      },
      meta: {
        colorKey: node.colorKey,
        fontKey: node.fontKey,
        layerTarget: node.highlightTarget,
        layerSectionKey: node.containerStyleKey,
        layerIcon: node.binding.mode === "computed" ? "calendar" : "text",
        ...(node.containerClassName
          ? { containerClassName: node.containerClassName }
          : {}),
        ...(node.textClassName ? { textClassName: node.textClassName } : {}),
      },
    };
  };

  const updateCardOptions = (
    optionKey: V2TemplateCardOptionsKey,
    patch: { maxFontSize?: number; multiline?: boolean }
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        card: {
          ...prev.layout.card,
          [optionKey]: {
            ...(prev.layout.card[optionKey] ?? {}),
            ...patch,
          },
        },
      },
    }));
  };

  const updateCardNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const prevNode = runtimeCard.nodes[nodeId];
      if (!prevNode) return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        visibilityMode,
      }));
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const updateCardNodeBinding = (
    nodeId: string,
    binding: V2TemplateCardNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const prevNode = runtimeCard.nodes[nodeId];
      if (!prevNode) return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        binding,
        meta: {
          ...(node.meta ?? {}),
          layerIcon: binding.mode === "computed" ? "calendar" : "text",
        },
      }));
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };
      return {
        ...prev,
        graph: nextGraph,
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const updateCardNodeMeta = ({
    nodeId,
    label,
    colorKey,
    fontKey,
  }: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateCardNode["colorKey"];
    fontKey?: V2TemplateCardNode["fontKey"];
  }) => {
    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const prevNode = runtimeCard.nodes[nodeId];
      if (!prevNode) return prev;

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
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
        meta: {
          ...(node.meta ?? {}),
          ...(nextColorKey ? { colorKey: nextColorKey } : {}),
          ...(nextFontKey ? { fontKey: nextFontKey } : {}),
        },
      }));
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const appendCardNode = (kind: V2TemplateCardNodeKind) => {
    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const existingIds = new Set(Object.keys(runtimeCard.nodes));
      let nextIndex = 1;
      let nodeId = `card-node-${nextIndex}`;
      while (existingIds.has(nodeId)) {
        nextIndex += 1;
        nodeId = `card-node-${nextIndex}`;
      }

      const label = `Object${nextIndex}`;
      const layerId = nodeId;
      const target = `cardNode:${nodeId}`;
      const containerStyleKey = `cardNode:${nodeId}:container`;
      const textStyleKey = `cardNode:${nodeId}:text`;
      const wrapperStyleKey = `cardNode:${nodeId}:wrapper`;
      const optionsKey = `cardNode:${nodeId}:options`;

      const nextNode: V2TemplateCardNode = {
        id: nodeId,
        label,
        kind,
        layerId,
        highlightTarget: target,
        binding: {
          mode: "literal",
          value: label,
        },
        visibilityMode: "always",
        containerStyleKey,
        textStyleKey,
        ...(kind === "flexibleText" ? { wrapperStyleKey, optionsKey } : {}),
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        containerClassName: v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
        ...(kind === "flexibleText"
          ? { textClassName: v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME }
          : {}),
      };

      const nextCardLayout = {
        ...prev.layout.card,
        ...v2_createDefaultTextNodeLayoutPatch({
          containerStyleKey,
          textStyleKey,
          wrapperStyleKey,
          optionsKey,
          isFlexibleText: kind === "flexibleText",
        }),
      };

      const cardRootNodeId =
        prev.graph.componentDefinitions.card?.rootNodeId ?? "component-card-root";
      const nextGraphNode = v2_cardNodeToGraphNode(nextNode);
      const nextGraph = v2_graphAppendChild({
        graph: prev.graph,
        parentId: cardRootNodeId,
        newNode: nextGraphNode,
      });
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const removeCardNode = (nodeId: string) => {
    if (fixedCardNodeIds.has(nodeId)) return;

    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const targetNode = runtimeCard.nodes[nodeId];
      if (!targetNode) return prev;

      const nextCardLayout = {
        ...prev.layout.card,
      };
      delete nextCardLayout[targetNode.containerStyleKey];
      if (targetNode.textStyleKey) delete nextCardLayout[targetNode.textStyleKey];
      if (targetNode.wrapperStyleKey)
        delete nextCardLayout[targetNode.wrapperStyleKey];
      if (targetNode.optionsKey) delete nextCardLayout[targetNode.optionsKey];
      const nextGraph = v2_graphRemoveNodeSubtree(prev.graph, nodeId);
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const updateCardInstanceMode = (instanceMode: "component" | "detached") => {
    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const graphCardDefinition = prev.graph.componentDefinitions.card;
      const currentMode =
        graphCardDefinition?.instanceMode ?? runtimeCard.instanceMode ?? "component";
      if (currentMode === instanceMode) return prev;

      if (currentMode === "detached" && instanceMode === "component") {
        window.alert(
          "개별 인스턴스로 분해한 Card 컴포넌트는 다시 공통 컴포넌트 모드로 되돌릴 수 없습니다."
        );
        return prev;
      }

      if (currentMode === "component" && instanceMode === "detached") {
        const confirmed = window.confirm(
          "Card 컴포넌트를 개별 인스턴스로 분해하면 되돌릴 수 없습니다. 계속할까요?"
        );
        if (!confirmed) return prev;
      }

      const nextGraph = {
        ...prev.graph,
        componentDefinitions: {
          ...prev.graph.componentDefinitions,
          card: {
            ...(prev.graph.componentDefinitions.card ?? {
              id: "card",
              label: "Card",
              rootNodeId: "component-card-root",
              kind: "template",
            }),
            ...(instanceMode === "detached"
              ? {
                  instanceMode: "detached" as const,
                  detachedAt:
                    prev.graph.componentDefinitions.card?.detachedAt ??
                    new Date().toISOString(),
                }
              : {
                  instanceMode: "component" as const,
                }),
            instanceTransforms:
              prev.graph.componentDefinitions.card?.instanceTransforms ??
              runtimeCard.instanceTransforms,
          },
        },
      };
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  const updateCardInstanceTransform = (
    index: number,
    key: keyof V2TemplateCardInstanceTransform,
    value: number
  ) => {
    if (!Number.isFinite(value)) return;

    safeUpdateConfig((prev) => {
      const runtimeCard = v2_getRuntimeCardStructure(prev);
      const transformKey = String(index);
      const prevTransforms =
        prev.graph.componentDefinitions.card?.instanceTransforms ??
        runtimeCard.instanceTransforms ??
        {};
      const prevTransform = prevTransforms[transformKey] ?? {};
      const nextTransform: V2TemplateCardInstanceTransform = {
        ...prevTransform,
      };

      if (key === "offsetX" || key === "offsetY") {
        const rounded = Math.round(value);
        if (rounded === 0) {
          delete nextTransform[key];
        } else {
          nextTransform[key] = rounded;
        }
      }

      if (key === "rotateDeg") {
        const rounded = Math.round(value * 10) / 10;
        if (rounded === 0) {
          delete nextTransform.rotateDeg;
        } else {
          nextTransform.rotateDeg = rounded;
        }
      }

      if (key === "scale") {
        const rounded = Math.round(Math.max(0.1, value) * 100) / 100;
        if (rounded === 1) {
          delete nextTransform.scale;
        } else {
          nextTransform.scale = rounded;
        }
      }

      if (key === "opacity") {
        const clamped = Math.min(1, Math.max(0, value));
        const rounded = Math.round(clamped * 100) / 100;
        if (rounded === 1) {
          delete nextTransform.opacity;
        } else {
          nextTransform.opacity = rounded;
        }
      }

      const nextTransforms = {
        ...prevTransforms,
      };

      if (Object.keys(nextTransform).length === 0) {
        delete nextTransforms[transformKey];
      } else {
        nextTransforms[transformKey] = nextTransform;
      }

      const nextGraph = {
        ...prev.graph,
        componentDefinitions: {
          ...prev.graph.componentDefinitions,
          card: {
            ...(prev.graph.componentDefinitions.card ?? {
              id: "card",
              label: "Card",
              rootNodeId: "component-card-root",
              kind: "template",
            }),
            instanceTransforms: nextTransforms,
          },
        },
      };
      const nextRuntimeConfig: V2TemplateRenderConfig = {
        ...prev,
        graph: nextGraph,
      };

      return {
        ...prev,
        graph: nextGraph,
        structure: {
          ...prev.structure,
          card: v2_getRuntimeCardStructure(nextRuntimeConfig),
          layers: v2_getRuntimeLayerTree(nextRuntimeConfig),
          sceneNodes: v2_getRuntimeSceneNodes(nextRuntimeConfig),
        },
      };
    });
  };

  return {
    updateCardOptions,
    updateCardNodeVisibilityMode,
    updateCardNodeBinding,
    updateCardNodeMeta,
    appendCardNode,
    removeCardNode,
    updateCardInstanceMode,
    updateCardInstanceTransform,
  };
};

export default useTemplateCardNodeActions;
