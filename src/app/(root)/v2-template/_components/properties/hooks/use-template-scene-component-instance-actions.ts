"use client";

import {
  V2TemplateCardNodeBinding,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
} from "@/types/time-table/template-render-config";
import { v2_graphUpdateNode } from "@/utils/v2/template-graph-editor";
import { v2_getRuntimeSceneNodes } from "@/utils/v2/template-graph-runtime";
import { v2_findSceneNodeContextById } from "../model/structure-utils";

interface UseTemplateSceneComponentInstanceActionsParams {
  safeUpdateConfig: (
    updater: (prev: V2TemplateRenderConfig) => V2TemplateRenderConfig
  ) => void;
}

const useTemplateSceneComponentInstanceActions = ({
  safeUpdateConfig,
}: UseTemplateSceneComponentInstanceActionsParams) => {
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

  const syncSceneCardCollectionChildComponentIds = (nodeId: string) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "cardCollection") {
        return prev;
      }

      const componentId = nodeContext.node.componentId?.trim();
      if (!componentId) return prev;
      if (!prev.graph.componentDefinitions[componentId]) {
        return prev;
      }

      let hasChanges = false;
      const nextGraph = {
        ...prev.graph,
        nodes: {
          ...prev.graph.nodes,
        },
      };

      Object.values(prev.graph.nodes).forEach((graphNode) => {
        if (graphNode.type !== "componentInstance" || graphNode.parentId !== nodeId) {
          return;
        }
        if (graphNode.meta?.componentId === componentId) return;

        nextGraph.nodes[graphNode.id] = {
          ...graphNode,
          meta: {
            ...(graphNode.meta ?? {}),
            componentId,
          },
        };
        hasChanges = true;
      });

      if (!hasChanges) return prev;
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneComponentInstanceDayKey = (
    nodeId: string,
    dayKey: V2TemplateDayKey
  ) => {
    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "componentInstance") return prev;
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          dayKey,
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneComponentInstanceInstanceId = (
    nodeId: string,
    rawInstanceId: string
  ) => {
    const instanceId = rawInstanceId.trim();
    if (!instanceId) return;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "componentInstance") return prev;

      const prevGraphNode = prev.graph.nodes[nodeId];
      if (!prevGraphNode || prevGraphNode.type !== "componentInstance") return prev;
      const prevInstanceId =
        typeof prevGraphNode.meta?.instanceId === "string"
          ? prevGraphNode.meta.instanceId
          : nodeContext.node.instanceId;
      if (prevInstanceId === instanceId) return prev;

      const currentStyleKey = prevGraphNode.styles?.styleKey;
      const currentLayerTarget = prevGraphNode.meta?.layerTarget;
      const shouldUseCardInstanceTarget =
        typeof currentStyleKey !== "string" &&
        (typeof currentLayerTarget !== "string" ||
          currentLayerTarget.startsWith("cardInstance:"));

      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          instanceId,
          ...(shouldUseCardInstanceTarget
            ? { layerTarget: `cardInstance:${instanceId}` }
            : {}),
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const updateSceneComponentInstanceComponentId = (
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
      if (!nodeContext || nodeContext.node.kind !== "componentInstance") {
        return prev;
      }

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

  const updateSceneComponentInstanceBindingOverride = ({
    nodeId,
    cardNodeId,
    binding,
  }: {
    nodeId: string;
    cardNodeId: string;
    binding: V2TemplateCardNodeBinding;
  }) => {
    const normalizedCardNodeId = cardNodeId.trim();
    if (!normalizedCardNodeId) return;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "componentInstance") {
        return prev;
      }

      const prevGraphNode = prev.graph.nodes[nodeId];
      if (!prevGraphNode || prevGraphNode.type !== "componentInstance") {
        return prev;
      }

      const prevBindingOverrides = prevGraphNode.meta?.bindingOverrides ?? {};
      const nextBindingOverrides = {
        ...prevBindingOverrides,
        [normalizedCardNodeId]: binding,
      };
      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => ({
        ...node,
        meta: {
          ...(node.meta ?? {}),
          bindingOverrides: nextBindingOverrides,
        },
      }));
      return {
        ...prev,
        graph: nextGraph,
      };
    });
  };

  const removeSceneComponentInstanceBindingOverride = ({
    nodeId,
    cardNodeId,
  }: {
    nodeId: string;
    cardNodeId: string;
  }) => {
    const normalizedCardNodeId = cardNodeId.trim();
    if (!normalizedCardNodeId) return;

    safeUpdateConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const nodeContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId,
      });
      if (!nodeContext || nodeContext.node.kind !== "componentInstance") {
        return prev;
      }

      const prevGraphNode = prev.graph.nodes[nodeId];
      if (!prevGraphNode || prevGraphNode.type !== "componentInstance") {
        return prev;
      }
      const prevBindingOverrides = prevGraphNode.meta?.bindingOverrides;
      if (!prevBindingOverrides || !prevBindingOverrides[normalizedCardNodeId]) {
        return prev;
      }

      const nextBindingOverrides = {
        ...prevBindingOverrides,
      };
      delete nextBindingOverrides[normalizedCardNodeId];

      const nextGraph = v2_graphUpdateNode(prev.graph, nodeId, (node) => {
        const nextMeta = {
          ...(node.meta ?? {}),
        };
        if (Object.keys(nextBindingOverrides).length > 0) {
          nextMeta.bindingOverrides = nextBindingOverrides;
        } else {
          delete nextMeta.bindingOverrides;
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

  return {
    updateSceneCardCollectionComponentId,
    syncSceneCardCollectionChildComponentIds,
    updateSceneComponentInstanceDayKey,
    updateSceneComponentInstanceInstanceId,
    updateSceneComponentInstanceComponentId,
    updateSceneComponentInstanceBindingOverride,
    removeSceneComponentInstanceBindingOverride,
  };
};

export default useTemplateSceneComponentInstanceActions;
