"use client";

import {
  V2TemplateCardInstanceTransform,
  V2TemplateCardNode,
  V2TemplateCardNodeKind,
  V2TemplateCardOptionsKey,
  V2TemplateColorKey,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { v2_createBindingRefFromLegacyInput } from "@/utils/time-table/template-render-config";

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
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: {
                ...prevNode,
                visibilityMode,
              },
            },
          },
        },
      };
    });
  };

  const updateCardNodeBinding = (
    nodeId: string,
    binding: V2TemplateCardNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;
      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: {
                ...prevNode,
                binding,
              },
            },
          },
        },
      };
    });
  };

  const updateCardNodeMeta = ({
    nodeId,
    label,
    binding,
    colorKey,
    fontKey,
  }: {
    nodeId: string;
    label?: string;
    binding?: string;
    colorKey?: V2TemplateCardNode["colorKey"];
    fontKey?: V2TemplateCardNode["fontKey"];
  }) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;

      const nextLabel = typeof label === "string" ? label.trim() : undefined;
      const nextBinding = typeof binding === "string" ? binding.trim() : undefined;
      const nextColorKey =
        typeof colorKey === "string" && templateColorKeys.includes(colorKey)
          ? colorKey
          : undefined;
      const nextFontKey =
        typeof fontKey === "string" && templateColorKeys.includes(fontKey)
          ? fontKey
          : undefined;

      const nextNode: V2TemplateCardNode = {
        ...prevNode,
        ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
        ...(nextBinding && nextBinding.length > 0
          ? { binding: v2_createBindingRefFromLegacyInput(nextBinding) }
          : {}),
        ...(nextColorKey ? { colorKey: nextColorKey } : {}),
        ...(nextFontKey ? { fontKey: nextFontKey } : {}),
      };

      const updateLayerLabel = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes.map((node) => {
          if (node.id === prevNode.layerId) {
            return {
              ...node,
              ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
            };
          }
          if (!node.children?.length) return node;
          return {
            ...node,
            children: updateLayerLabel(node.children),
          };
        });
      };

      return {
        ...prev,
        structure: {
          ...prev.structure,
          layers: updateLayerLabel(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: nextNode,
            },
          },
        },
      };
    });
  };

  const appendCardNode = (kind: V2TemplateCardNodeKind) => {
    safeUpdateConfig((prev) => {
      const existingIds = new Set(Object.keys(prev.structure.card.nodes));
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
        binding: v2_createBindingRefFromLegacyInput(nodeId),
        visibilityMode: "always",
        containerStyleKey,
        textStyleKey,
        ...(kind === "flexibleText" ? { wrapperStyleKey, optionsKey } : {}),
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        containerClassName: "absolute flex justify-center items-center",
        ...(kind === "flexibleText"
          ? { textClassName: "leading-none text-center" }
          : {}),
      };

      const nextCardLayout = {
        ...prev.layout.card,
        [containerStyleKey]: {
          position: "absolute",
          top: 0,
          left: 0,
          width: 240,
          height: 64,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        [textStyleKey]: {
          fontSize: 32,
          lineHeight: 1.2,
          textAlign: "center",
          fontWeight: 500,
        },
        ...(kind === "flexibleText"
          ? {
              [wrapperStyleKey]: {
                justifyContent: "center",
                alignItems: "center",
              },
              [optionsKey]: {
                maxFontSize: 56,
                multiline: true,
              },
            }
          : {}),
      };

      const appendLayerNode = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes.map((node) => {
          if (node.id === prev.structure.card.containerLayerId) {
            return {
              ...node,
              children: [
                ...(node.children ?? []),
                {
                  id: layerId,
                  label,
                  kind: "component",
                  icon: "text",
                  target,
                  sectionKey: containerStyleKey,
                  visibilityMode: "always",
                },
              ],
            };
          }
          if (!node.children?.length) return node;
          return {
            ...node,
            children: appendLayerNode(node.children),
          };
        });
      };

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          layers: appendLayerNode(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodeOrder: [...prev.structure.card.nodeOrder, nodeId],
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: nextNode,
            },
          },
        },
      };
    });
  };

  const removeCardNode = (nodeId: string) => {
    if (fixedCardNodeIds.has(nodeId)) return;

    safeUpdateConfig((prev) => {
      const targetNode = prev.structure.card.nodes[nodeId];
      if (!targetNode) return prev;

      const nextNodes = {
        ...prev.structure.card.nodes,
      };
      delete nextNodes[nodeId];

      const nextNodeOrder = prev.structure.card.nodeOrder.filter(
        (id) => id !== nodeId
      );

      const nextCardLayout = {
        ...prev.layout.card,
      };
      delete nextCardLayout[targetNode.containerStyleKey];
      if (targetNode.textStyleKey) delete nextCardLayout[targetNode.textStyleKey];
      if (targetNode.wrapperStyleKey)
        delete nextCardLayout[targetNode.wrapperStyleKey];
      if (targetNode.optionsKey) delete nextCardLayout[targetNode.optionsKey];

      const removeLayerNode = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes
          .filter((node) => node.id !== targetNode.layerId)
          .map((node) => {
            if (!node.children?.length) return node;
            return {
              ...node,
              children: removeLayerNode(node.children),
            };
          });
      };

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          layers: removeLayerNode(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodeOrder: nextNodeOrder,
            nodes: nextNodes,
          },
        },
      };
    });
  };

  const updateCardInstanceMode = (instanceMode: "component" | "detached") => {
    safeUpdateConfig((prev) => {
      const currentMode = prev.structure.card.instanceMode ?? "component";
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

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            instanceMode,
          },
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
      const transformKey = String(index);
      const prevTransforms = prev.structure.card.instanceTransforms ?? {};
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

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            instanceTransforms: nextTransforms,
          },
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
