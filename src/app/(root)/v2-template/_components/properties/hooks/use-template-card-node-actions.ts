"use client";

import {
  V2TemplateAssetRef,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNode,
  V2TemplateCardNodeKind,
  V2TemplateDayKey,
  V2TemplateGraphNode,
  V2TemplateCardOptionsKey,
  V2TemplateColorKey,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateStyleRecord,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import {
  v2_graphAppendChild,
  v2_graphRemoveNodeSubtree,
  v2_graphUpdateNode,
} from "@/utils/v2/template-graph-editor";
import {
  v2_createDefaultFlexibleTextOptions,
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
  resolveActiveComponentId?: (config: V2TemplateRenderConfig) => string | null;
}

const useTemplateCardNodeActions = ({
  safeUpdateConfig,
  templateColorKeys,
  fixedCardNodeIds,
  resolveActiveComponentId,
}: UseTemplateCardNodeActionsParams) => {
  const v2_cardNodeToGraphNode = (node: V2TemplateCardNode): V2TemplateGraphNode => {
    if (node.kind === "image") {
      return {
        id: node.id,
        type: "image",
        label: node.label,
        parentId: null,
        childIds: [],
        layerId: node.layerId,
        highlightTarget: node.highlightTarget,
        visibilityMode: node.visibilityMode,
        binding: node.binding,
        styles: {
          containerStyleKey: node.containerStyleKey,
        },
        meta: {
          layerTarget: node.highlightTarget,
          layerSectionKey: node.containerStyleKey,
          layerIcon: "image",
          ...(node.assetRef ? { assetRef: node.assetRef } : {}),
          ...(node.assetRefByDayKey ? { assetRefByDayKey: node.assetRefByDayKey } : {}),
          ...(node.fit ? { fit: node.fit } : {}),
          ...(node.alt ? { alt: node.alt } : {}),
          ...(node.containerClassName
            ? { containerClassName: node.containerClassName }
            : {}),
        },
      };
    }

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
      textOptions: {
        ...prev.textOptions,
        [optionKey]: {
          ...(prev.textOptions[optionKey] ?? {}),
          ...patch,
        },
      },
    }));
  };

  const updateCardNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode) return prev;
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

  const updateCardNodeBinding = (
    nodeId: string,
    binding: V2TemplateCardNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode) return prev;
      if (graphNode.type === "image") return prev;
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
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode) return prev;

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
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateCardImageNodeAssetRef = ({
    nodeId,
    assetRef,
  }: {
    nodeId: string;
    assetRef: V2TemplateAssetRef | null;
  }) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode || graphNode.type !== "image") return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          ...(assetRef ? { assetRef } : { assetRef: undefined }),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateCardImageNodeAssetRefByDayKey = ({
    nodeId,
    dayKey,
    assetRef,
  }: {
    nodeId: string;
    dayKey: V2TemplateDayKey;
    assetRef: V2TemplateAssetRef | null;
  }) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode || graphNode.type !== "image") return prev;
      const prevByDay = graphNode.meta?.assetRefByDayKey ?? {};
      const nextByDay = {
        ...prevByDay,
      };
      if (assetRef) {
        nextByDay[dayKey] = assetRef;
      } else {
        delete nextByDay[dayKey];
      }
      const hasByDay = Object.keys(nextByDay).length > 0;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          ...(hasByDay
            ? { assetRefByDayKey: nextByDay }
            : { assetRefByDayKey: undefined }),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateCardImageNodeFit = ({
    nodeId,
    fit,
  }: {
    nodeId: string;
    fit: V2TemplateSceneAssetFit;
  }) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode || graphNode.type !== "image") return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          fit,
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateCardImageNodeAlt = ({
    nodeId,
    alt,
  }: {
    nodeId: string;
    alt: string;
  }) => {
    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode || graphNode.type !== "image") return prev;
      const normalizedAlt = alt.trim();
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          ...(normalizedAlt.length > 0 ? { alt: normalizedAlt } : { alt: undefined }),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const appendCardNode = (kind: V2TemplateCardNodeKind) => {
    safeUpdateConfig((prev) => {
      const componentIdCandidate = resolveActiveComponentId?.(prev);
      const componentId = componentIdCandidate?.trim();
      if (!componentId) return prev;
      const componentDefinition = prev.graph.componentDefinitions[componentId];
      if (!componentDefinition) return prev;

      const existingIds = new Set(Object.keys(prev.graph.nodes));
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
        ...(kind !== "image" ? { textStyleKey } : {}),
        ...(kind === "flexibleText" ? { optionsKey } : {}),
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        ...(kind === "image"
          ? {
              fit: "cover" as const,
              containerClassName: "absolute",
            }
          : {
              containerClassName: v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
            }),
        ...(kind === "flexibleText"
          ? { textClassName: v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME }
          : {}),
      };

      const nextCardLayout = {
        ...prev.layout.card,
        ...(kind === "image"
          ? {
              [containerStyleKey]: {
                position: "absolute",
                top: 0,
                left: 0,
                width: 720,
                height: 560,
              } as V2TemplateStyleRecord,
            }
          : v2_createDefaultTextNodeLayoutPatch({
              containerStyleKey,
              textStyleKey,
              optionsKey,
              isFlexibleText: kind === "flexibleText",
            })),
      };
      const nextTextOptions =
        kind === "flexibleText" && optionsKey
          ? {
              ...prev.textOptions,
              [optionsKey]: v2_createDefaultFlexibleTextOptions(),
            }
          : prev.textOptions;

      const nextGraphNode = v2_cardNodeToGraphNode(nextNode);
      const nextGraph = v2_graphAppendChild({
        graph: prev.graph,
        parentId: componentDefinition.rootNodeId,
        newNode: nextGraphNode,
      });
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        textOptions: nextTextOptions,
      };
    });
  };

  const removeCardNode = (nodeId: string) => {
    if (fixedCardNodeIds.has(nodeId)) return;

    safeUpdateConfig((prev) => {
      const graphNode = prev.graph.nodes[nodeId];
      if (!graphNode) return prev;
      const styleKeys = graphNode.styles ?? {};

      const nextCardLayout = {
        ...prev.layout.card,
      };
      if (typeof styleKeys.containerStyleKey === "string") {
        delete nextCardLayout[styleKeys.containerStyleKey];
      }
      if (typeof styleKeys.textStyleKey === "string") {
        delete nextCardLayout[styleKeys.textStyleKey];
      }
      if (typeof styleKeys.wrapperStyleKey === "string") {
        delete nextCardLayout[styleKeys.wrapperStyleKey];
      }
      if (typeof styleKeys.optionsKey === "string") {
        delete nextCardLayout[styleKeys.optionsKey];
      }
      const nextGraph = v2_graphRemoveNodeSubtree(prev.graph, nodeId);
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
      };
    });
  };

  const updateCardInstanceTransform = (
    rawInstanceId: string,
    key: keyof V2TemplateCardInstanceTransform,
    value: number
  ) => {
    if (!Number.isFinite(value)) return;
    const instanceId = rawInstanceId.trim();
    if (!instanceId) return;

    safeUpdateConfig((prev) => {
      const componentIdCandidate = resolveActiveComponentId?.(prev);
      const componentId = componentIdCandidate?.trim();
      if (!componentId) return prev;
      const graphCardDefinition = prev.graph.componentDefinitions[componentId];
      if (!graphCardDefinition) return prev;
      const prevTransforms =
        graphCardDefinition.instanceTransforms ?? {};
      const prevTransform = prevTransforms[instanceId] ?? {};
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
        delete nextTransforms[instanceId];
      } else {
        nextTransforms[instanceId] = nextTransform;
      }

      const nextGraph = {
        ...prev.graph,
        componentDefinitions: {
          ...prev.graph.componentDefinitions,
          [componentId]: {
            ...graphCardDefinition,
            instanceTransforms: nextTransforms,
          },
        },
      };
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  return {
    updateCardOptions,
    updateCardNodeVisibilityMode,
    updateCardNodeBinding,
    updateCardNodeMeta,
    updateCardImageNodeAssetRef,
    updateCardImageNodeAssetRefByDayKey,
    updateCardImageNodeFit,
    updateCardImageNodeAlt,
    appendCardNode,
    removeCardNode,
    updateCardInstanceTransform,
  };
};

export default useTemplateCardNodeActions;
