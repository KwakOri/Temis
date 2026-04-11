"use client";

import {
  V2TemplateAssetMap,
  V2TemplateColorKey,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { v2_graphUpdateNode } from "@/utils/time-table/template-graph-editor";
import { v2_getRuntimeSceneNodes } from "@/utils/time-table/template-graph-runtime";
import { v2_findSceneNodeContextById } from "../model/structure-utils";

interface UseTemplateSceneBindingActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
  templateColorKeys: readonly V2TemplateColorKey[];
}

const useTemplateSceneBindingActions = ({
  safeUpdateConfig,
  templateColorKeys,
}: UseTemplateSceneBindingActionsParams) => {
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
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  };
};

export default useTemplateSceneBindingActions;
