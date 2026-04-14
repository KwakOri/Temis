"use client";

import {
  V2TemplateAssetRef,
  V2TemplateColorKey,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetNode,
  V2TemplateSceneAssetRole,
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
    assetRef,
    assetRole,
    fit,
    alt,
  }: {
    nodeId: string;
    assetRef?: V2TemplateAssetRef | null;
    assetRole?: V2TemplateSceneAssetRole | null;
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
      const shouldUpdateAssetRef = assetRef !== undefined;
      const shouldUpdateAssetRole = assetRole !== undefined;
      const nextAssetRef = assetRef
        ? assetRef.source === "builtin"
          ? ({
              source: "builtin",
              key: assetRef.key,
            } as const)
          : ({
              source: "extra",
              key: assetRef.key.trim(),
            } as const)
        : undefined;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => {
        const nextMeta = {
          ...(node.meta ?? {}),
        };
        if (shouldUpdateAssetRef) {
          if (nextAssetRef) {
            nextMeta.assetRef = nextAssetRef;
          } else {
            delete nextMeta.assetRef;
          }
        }
        if (shouldUpdateAssetRole) {
          if (assetRole) {
            nextMeta.assetRole = assetRole;
          } else {
            delete nextMeta.assetRole;
          }
        }
        if (fit) {
          nextMeta.fit = fit;
        }
        if (nextAlt !== undefined) {
          nextMeta.alt = nextAlt;
        }
        return {
          ...node,
          meta: nextMeta,
        };
      });
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
