import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TemplateDesignGuideProvider } from '@/contexts/v2/template-design-guide-context';
import { useTemplateRenderConfigContext } from '@/contexts/v2/template-render-config-context';
import { TemplateEditorRuntimeProvider } from '@/contexts/v2/template-editor-runtime-context';
import { TemplateEditorUIProvider } from '@/contexts/v2/template-editor-ui-context';
import { useTemplateEditor } from '@/hooks/v2/useTemplateEditor';
import { V2TemplateHighlightTarget } from '@/types/time-table/template-editor-ui';
import {
  V2TemplateGraphNode,
  V2TemplateGraphNodeStyleRefs,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
} from '@/types/time-table/template-render-config';
import { TTheme } from '@/types/time-table/theme';
import { v2_getRuntimeLayerTree } from '@/utils/time-table/template-graph-layers-runtime';
import { v2_getRuntimeComponentLayerTreeByComponentId } from '@/utils/time-table/template-graph-component-layers-runtime';
import {
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from '@/utils/time-table/template-graph-runtime';
import V2TemplateBuilderForm from '../properties/template-properties-panel';
import V2Loading from '../shared/loading-screen';
import {
  applyReorderedLayerOrderKey,
  applyReorderedLayerZIndex,
  buildOrderedLayerIdsByParent,
} from './model/layer-z-index';
import {
  ROOT_LAYER_PARENT_ID,
  collectStyleSectionResolverMapFromRuntime,
} from './model/style-section-resolver';
import V2MobileHeader from './mobile-toolbar';
import V2TimeTableLayersPanel from './layers-panel';
import V2TimeTableControls from './preview-toolbar';
import V2TimeTablePreview from './preview-canvas';
import {
  v2_graphAppendChild,
  v2_graphAppendRoot,
  v2_graphInsertSiblingAfter,
  v2_graphMoveNode,
  v2_graphRemoveNodeSubtree,
} from '@/utils/time-table/template-graph-editor';
import {
  v2_runOrderKeyRegressionChecks,
  v2_validateOrderKeyGraph,
} from '@/utils/time-table/template-graph-order';
import {
  v2_applyRelocatedComponentInstancePatch,
  v2_COMPONENT_INSTANCE_CLONE_LAYER_PREFIX,
  v2_COMPONENT_INSTANCE_CLONE_NODE_PREFIX,
  v2_createSceneComponentInstanceCloneNode,
} from '@/utils/time-table/template-scene-component-instance';
import { v2_normalizeTemplateRenderConfig } from '@/utils/time-table/template-render-config';
import {
  v2_collectSceneNodesByLayerId,
  v2_collectSceneNodeIds,
  v2_collectLayerNodeIds,
  v2_createUniqueNodeId,
  v2_findSceneNodeContextById,
} from '../properties/model/structure-utils';
import {
  v2_createCardCollectionInstanceGraphNode,
  v2_getPreferredCardCollectionComponentId,
  v2_sceneNodeToGraphNode,
} from '../properties/model/scene-node-graph-utils';
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from '../properties/model/text-node-defaults';

const useV2TemplateEditorSettings = () => {
  const { renderConfig, setRenderConfig } = useTemplateRenderConfigContext();

  const inputSchema = useMemo(() => renderConfig.formSchema, [renderConfig.formSchema]);
  const captureSize = renderConfig.templateSize;
  const defaultTheme = (renderConfig.defaultTheme || 'first') as TTheme;

  return {
    renderConfig,
    inputSchema,
    captureSize,
    defaultTheme,
    setRenderConfig,
  };
};

const v2_COMPONENT_NODE_PREFIX = "component-node-";
const v2_COMPONENT_LAYER_PREFIX = "component-layer-";
const v2_COMPONENT_ID_PREFIX = "component-";
const v2_COMPONENT_DEFAULT_LABEL_PREFIX = "Component";

type V2ComponentMutationResult = {
  ok: boolean;
  tone: "info" | "error";
  message: string;
  selectedComponentId?: string | null;
  selectedLayerId?: string | null;
};

const v2_GRAPH_STYLE_REF_KEYS: Array<keyof V2TemplateGraphNodeStyleRefs> = [
  "styleKey",
  "containerStyleKey",
  "textStyleKey",
  "wrapperStyleKey",
  "optionsKey",
];

const v2_cloneForStorage = <T,>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const v2_collectStyleKeysFromRefs = (
  refs: V2TemplateGraphNodeStyleRefs | undefined
): string[] => {
  if (!refs) return [];
  const keys: string[] = [];
  v2_GRAPH_STYLE_REF_KEYS.forEach((styleRefKey) => {
    const value = refs[styleRefKey];
    if (typeof value === "string" && value.trim().length > 0) {
      keys.push(value);
    }
  });
  return keys;
};

const v2_syncLayoutZIndexWithLayerOrder = ({
  layout,
  layers,
  resolverMap,
  graph,
}: {
  layout: ReturnType<typeof v2_normalizeTemplateRenderConfig>["layout"];
  layers: ReturnType<typeof v2_getRuntimeLayerTree>;
  resolverMap: ReturnType<typeof collectStyleSectionResolverMapFromRuntime>;
  graph: V2TemplateNodeGraph;
}) => {
  const orderedMap = buildOrderedLayerIdsByParent({
    layers,
    layout,
    resolverMap,
    graph,
  });

  let nextLayout = layout;
  Object.entries(orderedMap).forEach(([parentId, orderedIds]) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
    nextLayout = applyReorderedLayerZIndex({
      layout: nextLayout,
      layers,
      resolverMap,
      parentId,
      orderedIds,
    });
  });

  return nextLayout;
};

const v2_collectSubtreeNodeIds = ({
  graph,
  rootNodeId,
}: {
  graph: V2TemplateNodeGraph;
  rootNodeId: string;
}): string[] => {
  if (!graph.nodes[rootNodeId]) return [];
  const collected: string[] = [];
  const queue = [rootNodeId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visited.has(nodeId)) continue;
    const node = graph.nodes[nodeId];
    if (!node) continue;
    visited.add(nodeId);
    collected.push(nodeId);
    node.childIds.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  return collected;
};

const v2_collectGraphLayerIds = (graph: V2TemplateNodeGraph): Set<string> => {
  const layerIds = new Set<string>();
  Object.values(graph.nodes).forEach((node) => {
    if (typeof node.layerId === "string" && node.layerId.trim().length > 0) {
      layerIds.add(node.layerId);
    }
  });
  return layerIds;
};

const v2_createUniqueStyleKey = ({
  baseKey,
  existingKeys,
}: {
  baseKey: string;
  existingKeys: Set<string>;
}): string => {
  const trimmedBase = baseKey.trim().length > 0 ? baseKey.trim() : "style";
  let nextKey = trimmedBase;
  let index = 2;
  while (existingKeys.has(nextKey)) {
    nextKey = `${trimmedBase}-${index}`;
    index += 1;
  }
  existingKeys.add(nextKey);
  return nextKey;
};

const v2_SCENE_CUSTOM_NODE_ID_PREFIX = "scene-custom-";
const v2_SCENE_CUSTOM_LAYER_ID_PREFIX = "scene-custom-layer-";
const v2_DEFAULT_CARD_INSTANCE_COUNT = 7;

type V2LayerMenuCreateKind =
  | "text"
  | "flexibleText"
  | "asset"
  | "group"
  | "cardCollection";

const v2_createSceneNodePayloadForLayerMenu = ({
  config,
  kind,
}: {
  config: V2TemplateRenderConfig;
  kind: V2LayerMenuCreateKind;
}): {
  sceneNode: V2TemplateSceneNode;
  layerNode: V2TemplateLayerNode;
  dynamicSceneLayoutPatch: Record<
    string,
    NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>
  >;
} | null => {
  const runtimeSceneNodes = v2_getRuntimeSceneNodes(config);
  const runtimeLayerTree = v2_getRuntimeLayerTree(config);
  const existingSceneNodeIds = v2_collectSceneNodeIds(runtimeSceneNodes);
  const existingLayerNodeIds = v2_collectLayerNodeIds(runtimeLayerTree);
  const baseSceneNodeId = v2_createUniqueNodeId(
    v2_SCENE_CUSTOM_NODE_ID_PREFIX,
    existingSceneNodeIds
  );
  const layerId = v2_createUniqueNodeId(
    v2_SCENE_CUSTOM_LAYER_ID_PREFIX,
    existingLayerNodeIds
  );
  const ordinal = baseSceneNodeId.replace(v2_SCENE_CUSTOM_NODE_ID_PREFIX, "");

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
    const componentId = v2_getPreferredCardCollectionComponentId(config);
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

const V2TimeTableEditor: React.FC = () => {
  const { renderConfig, inputSchema, captureSize, defaultTheme, setRenderConfig } =
    useV2TemplateEditorSettings();

  const {
    state,
    actions,
    data,
    updateData,
    globalData,
    updateGlobalData,
    currentTheme,
    updateTheme,
    resetData,
    isInitialized,
  } = useTemplateEditor({
    inputSchema,
    defaultTheme,
    captureSize,
  });
  const [hoverHighlightTarget, setHoverHighlightTarget] =
    useState<V2TemplateHighlightTarget | null>(null);
  const [activeHighlightTarget, setActiveHighlightTarget] =
    useState<V2TemplateHighlightTarget | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const orderKeyRepairAttemptRef = useRef<string | null>(null);
  const orderKeyRegressionCheckedRef = useRef(false);
  const [propertiesFocusRequest, setPropertiesFocusRequest] = useState<{
    layerId: string;
    nonce: number;
    editorMode: "instance" | "master";
  } | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Record<string, boolean>>(
    {}
  );
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const componentInstanceMetaByLayerId = useMemo(() => {
    const next = new Map<
      string,
      {
        nodeId: string;
        canExtractCopy: boolean;
      }
    >();

    const visit = (
      nodes: typeof runtimeSceneNodes,
      parentKind: "root" | "group" | "cardCollection"
    ) => {
      nodes.forEach((node) => {
        if (node.kind === "componentInstance") {
          const layerId = node.layerId ?? node.id;
          next.set(layerId, {
            nodeId: node.id,
            canExtractCopy: parentKind === "cardCollection",
          });
          return;
        }

        if (
          (node.kind === "group" || node.kind === "cardCollection") &&
          node.children &&
          node.children.length > 0
        ) {
          visit(node.children, node.kind);
        }
      });
    };

    visit(runtimeSceneNodes, "root");
    return next;
  }, [runtimeSceneNodes]);
  const extractableComponentInstanceLayerIdSet = useMemo(() => {
    const next = new Set<string>();
    componentInstanceMetaByLayerId.forEach((meta, layerId) => {
      if (meta.canExtractCopy) {
        next.add(layerId);
      }
    });
    return next;
  }, [componentInstanceMetaByLayerId]);
  const runtimeComponentCatalog = useMemo(() => {
    const instanceStatsByComponentId: Record<
      string,
      { count: number; firstLayerId: string | null }
    > = {};
    const collectCardCollectionCounts = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.kind === "cardCollection") {
          const componentId = node.componentId?.trim();
          if (!componentId) return;
          const previous = instanceStatsByComponentId[componentId] ?? {
            count: 0,
            firstLayerId: null,
          };
          const instanceCount = Array.isArray(node.children)
            ? node.children.length
            : 0;
          const firstInstanceLayerId = Array.isArray(node.children)
            ? (node.children[0]?.layerId ?? node.children[0]?.id ?? null)
            : null;
          instanceStatsByComponentId[componentId] = {
            count: previous.count + instanceCount,
            firstLayerId:
              previous.firstLayerId ??
              firstInstanceLayerId ??
              node.layerId ??
              null,
          };
        }
        if (node.kind === "group") {
          collectCardCollectionCounts(node.children);
        }
      });
    };
    collectCardCollectionCounts(runtimeSceneNodes);

    const definitions = Object.values(renderConfig.graph.componentDefinitions ?? {});
    return definitions.map((definition) => {
      const rootNode = renderConfig.graph.nodes[definition.rootNodeId];
      return {
        id: definition.id,
        label: definition.label || definition.id,
        rootNodeId: definition.rootNodeId,
        rootLayerId: rootNode?.layerId ?? rootNode?.id ?? null,
        kind: definition.kind ?? "custom",
        instanceMode: definition.instanceMode ?? "component",
        instanceCount: instanceStatsByComponentId[definition.id]?.count ?? 0,
        firstInstanceLayerId:
          instanceStatsByComponentId[definition.id]?.firstLayerId ?? null,
      };
    });
  }, [
    renderConfig.graph.componentDefinitions,
    renderConfig.graph.nodes,
    runtimeSceneNodes,
  ]);
  const runtimeComponentLayerTreeByComponentId = useMemo(
    () => v2_getRuntimeComponentLayerTreeByComponentId(renderConfig),
    [renderConfig]
  );
  const runtimeCardStructures = useMemo(
    () =>
      Object.keys(renderConfig.graph.componentDefinitions ?? {}).map((componentId) =>
        v2_getRuntimeCardStructureByComponentId(renderConfig, componentId)
      ),
    [renderConfig]
  );
  const relocatableLayerIdSet = useMemo(() => {
    const next = new Set<string>();
    const visit = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.layerId) {
          next.add(node.layerId);
        }
        if (
          (node.kind === "group" || node.kind === "cardCollection") &&
          node.children
        ) {
          visit(node.children);
        }
      });
    };
    visit(runtimeSceneNodes);
    return next;
  }, [runtimeSceneNodes]);
  const runtimeStyleResolverMap = useMemo(
    () =>
      collectStyleSectionResolverMapFromRuntime({
        layers: runtimeLayerTree,
        cards: runtimeCardStructures,
        sceneNodes: runtimeSceneNodes,
      }),
    [runtimeCardStructures, runtimeLayerTree, runtimeSceneNodes]
  );

  const orderedIdsByParent = useMemo(() => {
    return buildOrderedLayerIdsByParent({
      layers: runtimeLayerTree,
      layout: renderConfig.layout,
      resolverMap: runtimeStyleResolverMap,
      graph: renderConfig.graph,
    });
  }, [renderConfig.graph, renderConfig.layout, runtimeLayerTree, runtimeStyleResolverMap]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (orderKeyRegressionCheckedRef.current) return;
    orderKeyRegressionCheckedRef.current = true;
    const regressionCheck = v2_runOrderKeyRegressionChecks();
    if (regressionCheck.valid) return;
    console.error(
      '[v2-template] orderKey regression checks failed',
      regressionCheck.issues
    );
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const validation = v2_validateOrderKeyGraph(renderConfig.graph);
    if (validation.valid) {
      orderKeyRepairAttemptRef.current = null;
      return;
    }

    const issueSignature = validation.issues.join("|");
    if (orderKeyRepairAttemptRef.current === issueSignature) return;
    orderKeyRepairAttemptRef.current = issueSignature;

    console.warn(
      '[v2-template] orderKey graph validation issues detected',
      validation.issues
    );
    if (!setRenderConfig) return;
    setRenderConfig((prev) => v2_normalizeTemplateRenderConfig(prev));
  }, [renderConfig.graph, setRenderConfig]);

  useEffect(() => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => {
      const prevRuntimeLayerTree = v2_getRuntimeLayerTree(prev);
      const prevRuntimeCards = Object.keys(
        prev.graph.componentDefinitions ?? {}
      ).map((componentId) =>
        v2_getRuntimeCardStructureByComponentId(prev, componentId)
      );
      const prevRuntimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const prevRuntimeResolverMap = collectStyleSectionResolverMapFromRuntime({
        layers: prevRuntimeLayerTree,
        cards: prevRuntimeCards,
        sceneNodes: prevRuntimeSceneNodes,
      });
      const syncedLayout = v2_syncLayoutZIndexWithLayerOrder({
        layout: prev.layout,
        layers: prevRuntimeLayerTree,
        resolverMap: prevRuntimeResolverMap,
        graph: prev.graph,
      });
      if (JSON.stringify(syncedLayout) === JSON.stringify(prev.layout)) {
        return prev;
      }
      return {
        ...prev,
        layout: syncedLayout,
      };
    });
  }, [renderConfig.graph, setRenderConfig]);

  const applyLayerZIndex = ({
    parentId,
    orderedIds,
  }: {
    parentId: string;
    orderedIds: string[];
  }) => {
    if (!setRenderConfig || orderedIds.length === 0) return;

    setRenderConfig((prev) => {
      const prevRuntimeLayerTree = v2_getRuntimeLayerTree(prev);
      const prevRuntimeCards = Object.keys(
        prev.graph.componentDefinitions ?? {}
      ).map((componentId) =>
        v2_getRuntimeCardStructureByComponentId(prev, componentId)
      );
      const prevRuntimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const prevRuntimeResolverMap = collectStyleSectionResolverMapFromRuntime({
        layers: prevRuntimeLayerTree,
        cards: prevRuntimeCards,
        sceneNodes: prevRuntimeSceneNodes,
      });
      return {
        ...prev,
        graph: applyReorderedLayerOrderKey({
          graph: prev.graph,
          parentId,
          orderedIds,
        }),
        layout: applyReorderedLayerZIndex({
          layout: prev.layout,
          layers: prevRuntimeLayerTree,
          resolverMap: prevRuntimeResolverMap,
          parentId,
          orderedIds,
        }),
      };
    });
  };
  const applyLayerRelocation = ({
    layerId,
    targetParentId,
    targetIndex,
  }: {
    layerId: string;
    targetParentId: string;
    targetIndex: number;
  }) => {
    if (!setRenderConfig) return;

    setRenderConfig((prev) => {
      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const sceneNodeByLayerId = v2_collectSceneNodesByLayerId(runtimeSceneNodes);
      const sourceSceneNode = sceneNodeByLayerId.get(layerId);

      if (!sourceSceneNode) {
        return prev;
      }
      const sourceSceneContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId: sourceSceneNode.id,
      });
      if (!sourceSceneContext) return prev;
      const sourceIsComponentInstance =
        sourceSceneContext.node.kind === "componentInstance";

      const targetLayerParentId =
        targetParentId === ROOT_LAYER_PARENT_ID ? null : targetParentId;
      const targetSceneParentNode =
        targetLayerParentId === null
          ? null
          : sceneNodeByLayerId.get(targetLayerParentId) ?? null;
      if (
        targetLayerParentId !== null &&
        (!targetSceneParentNode ||
          (targetSceneParentNode.kind !== "group" &&
            targetSceneParentNode.kind !== "cardCollection"))
      ) {
        return prev;
      }
      if (
        targetSceneParentNode?.kind === "cardCollection" &&
        !sourceIsComponentInstance
      ) {
        return prev;
      }
      const targetSceneParentId = targetSceneParentNode?.id ?? null;

      const desiredIndex = Math.max(0, Math.floor(targetIndex));
      const effectiveIndex =
        sourceSceneContext.parentId === targetSceneParentId &&
        desiredIndex > sourceSceneContext.index
          ? desiredIndex - 1
          : desiredIndex;

      const nextGraph = v2_graphMoveNode({
        graph: prev.graph,
        nodeId: sourceSceneNode.id,
        targetParentId: targetSceneParentId ?? null,
        targetIndex: effectiveIndex,
      });
      return v2_applyRelocatedComponentInstancePatch({
        prev,
        nextGraph,
        nodeId: sourceSceneNode.id,
        sourceIsComponentInstance,
        targetParentKind:
          targetSceneParentId === null
            ? "root"
            : targetSceneParentNode?.kind ?? null,
        fallbackInstanceId:
          sourceSceneContext.node.kind === "componentInstance"
            ? sourceSceneContext.node.instanceId
            : sourceSceneNode.id,
      });
    });
  };
  const createSceneNodeFromLayerMenu = ({
    kind,
    layerId,
  }: {
    kind: V2LayerMenuCreateKind;
    layerId?: string | null;
  }) => {
    if (!setRenderConfig) return;

    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    setRenderConfig((prev) => {
      const payload = v2_createSceneNodePayloadForLayerMenu({
        config: prev,
        kind,
      });
      if (!payload) return prev;

      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget =
        typeof layerNode.target === "string"
          ? (layerNode.target as V2TemplateHighlightTarget)
          : null;

      const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const sceneNodeByLayerId = v2_collectSceneNodesByLayerId(runtimeSceneNodes);
      const anchorSceneNode =
        typeof layerId === "string" && layerId.trim().length > 0
          ? sceneNodeByLayerId.get(layerId) ?? null
          : null;
      let nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
      nextGraphNode = {
        ...nextGraphNode,
        childIds: [],
      };

      let nextGraph = prev.graph;
      if (!anchorSceneNode) {
        nextGraph = v2_graphAppendRoot({
          graph: nextGraph,
          newNode: nextGraphNode,
        });
      } else if (anchorSceneNode.kind === "group") {
        nextGraph = v2_graphAppendChild({
          graph: nextGraph,
          parentId: anchorSceneNode.id,
          newNode: {
            ...nextGraphNode,
            parentId: anchorSceneNode.id,
          },
        });
      } else {
        nextGraph = v2_graphInsertSiblingAfter({
          graph: nextGraph,
          anchorNodeId: anchorSceneNode.id,
          newNode: {
            ...nextGraphNode,
            parentId: nextGraphNode.parentId ?? null,
          },
        });
      }

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
      setIsRightPanelOpen(true);
      setPropertiesFocusRequest({
        layerId: nextFocusLayerId,
        nonce: Date.now(),
        editorMode: "instance",
      });
    }
    if (nextFocusTarget) {
      setActiveHighlightTarget(nextFocusTarget);
    }
  };
  const createComponentMaster = (): V2ComponentMutationResult => {
    if (!setRenderConfig) {
      return {
        ok: false,
        tone: "error",
        message: "컴포넌트를 생성할 수 없습니다.",
      };
    }

    const existingComponentIds = new Set(
      Object.keys(renderConfig.graph.componentDefinitions ?? {})
    );
    const existingNodeIds = new Set(Object.keys(renderConfig.graph.nodes ?? {}));
    const existingLayerIds = v2_collectGraphLayerIds(renderConfig.graph);
    const existingStyleKeys = new Set(Object.keys(renderConfig.layout.card ?? {}));

    const componentId = v2_createUniqueNodeId(
      v2_COMPONENT_ID_PREFIX,
      existingComponentIds
    );
    const componentIndex = Object.keys(renderConfig.graph.componentDefinitions ?? {})
      .length + 1;
    const componentLabel = `${v2_COMPONENT_DEFAULT_LABEL_PREFIX} ${componentIndex}`;
    const rootNodeId = v2_createUniqueNodeId(
      v2_COMPONENT_NODE_PREFIX,
      existingNodeIds
    );
    const rootLayerId = v2_createUniqueNodeId(
      v2_COMPONENT_LAYER_PREFIX,
      existingLayerIds
    );
    const containerStyleKey = v2_createUniqueStyleKey({
      baseKey: `${componentId}-container`,
      existingKeys: existingStyleKeys,
    });

    setRenderConfig((prev) => {
      if (prev.graph.componentDefinitions[componentId]) return prev;
      if (prev.graph.nodes[rootNodeId]) return prev;

      const rootNode: V2TemplateGraphNode = {
        id: rootNodeId,
        type: "group",
        label: `${componentLabel} Root`,
        parentId: null,
        childIds: [],
        layerId: rootLayerId,
        highlightTarget: `component:${componentId}`,
        styles: {
          containerStyleKey,
        },
        meta: {
          layerIcon: "group",
          layerTarget: `component:${componentId}`,
          layerSectionKey: containerStyleKey,
          isTemplateComponent: true,
        },
      };

      return {
        ...prev,
        graph: {
          ...prev.graph,
          rootNodeIds: prev.graph.rootNodeIds.includes(rootNodeId)
            ? prev.graph.rootNodeIds
            : [...prev.graph.rootNodeIds, rootNodeId],
          nodes: {
            ...prev.graph.nodes,
            [rootNodeId]: rootNode,
          },
          componentDefinitions: {
            ...prev.graph.componentDefinitions,
            [componentId]: {
              id: componentId,
              label: componentLabel,
              rootNodeId,
              kind: "custom",
              instanceMode: "component",
              instanceTransforms: {},
            },
          },
        },
        layout: {
          ...prev.layout,
          card: {
            ...prev.layout.card,
            [containerStyleKey]:
              prev.layout.card[containerStyleKey] ?? {
                position: "relative",
                width: 312,
                height: 80,
              },
          },
        },
      };
    });

    return {
      ok: true,
      tone: "info",
      message: `${componentLabel} 컴포넌트를 생성했습니다.`,
      selectedComponentId: componentId,
      selectedLayerId: rootLayerId,
    };
  };
  const duplicateComponentMaster = (
    sourceComponentId: string
  ): V2ComponentMutationResult => {
    if (!setRenderConfig) {
      return {
        ok: false,
        tone: "error",
        message: "컴포넌트를 복제할 수 없습니다.",
      };
    }

    const sourceDefinition = renderConfig.graph.componentDefinitions[sourceComponentId];
    if (!sourceDefinition) {
      return {
        ok: false,
        tone: "error",
        message: "복제할 컴포넌트를 찾을 수 없습니다.",
      };
    }
    const sourceRootNode = renderConfig.graph.nodes[sourceDefinition.rootNodeId];
    if (!sourceRootNode) {
      return {
        ok: false,
        tone: "error",
        message: "복제할 컴포넌트 루트가 손상되었습니다.",
      };
    }

    const subtreeNodeIds = v2_collectSubtreeNodeIds({
      graph: renderConfig.graph,
      rootNodeId: sourceDefinition.rootNodeId,
    });
    if (subtreeNodeIds.length === 0) {
      return {
        ok: false,
        tone: "error",
        message: "복제할 컴포넌트 노드가 없습니다.",
      };
    }

    const existingComponentIds = new Set(
      Object.keys(renderConfig.graph.componentDefinitions ?? {})
    );
    const existingNodeIds = new Set(Object.keys(renderConfig.graph.nodes ?? {}));
    const existingLayerIds = v2_collectGraphLayerIds(renderConfig.graph);
    const existingStyleKeys = new Set(Object.keys(renderConfig.layout.card ?? {}));

    const duplicatedComponentId = v2_createUniqueNodeId(
      `${sourceComponentId}-copy-`,
      existingComponentIds
    );
    const duplicatedLabel = `${sourceDefinition.label} Copy`;
    const rootNodeId = v2_createUniqueNodeId(
      v2_COMPONENT_NODE_PREFIX,
      existingNodeIds
    );
    const rootLayerId = v2_createUniqueNodeId(
      v2_COMPONENT_LAYER_PREFIX,
      existingLayerIds
    );

    const nodeIdMap = new Map<string, string>();
    nodeIdMap.set(sourceDefinition.rootNodeId, rootNodeId);
    subtreeNodeIds.forEach((nodeId) => {
      if (nodeId === sourceDefinition.rootNodeId) return;
      const nextNodeId = v2_createUniqueNodeId(
        `${v2_COMPONENT_NODE_PREFIX}${duplicatedComponentId}-`,
        existingNodeIds
      );
      nodeIdMap.set(nodeId, nextNodeId);
    });

    const layerIdMap = new Map<string, string>();
    subtreeNodeIds.forEach((nodeId) => {
      const sourceNode = renderConfig.graph.nodes[nodeId];
      if (!sourceNode?.layerId) return;
      const nextLayerId =
        nodeId === sourceDefinition.rootNodeId
          ? rootLayerId
          : v2_createUniqueNodeId(
              `${v2_COMPONENT_LAYER_PREFIX}${duplicatedComponentId}-`,
              existingLayerIds
            );
      layerIdMap.set(sourceNode.layerId, nextLayerId);
    });

    const styleKeyMap = new Map<string, string>();
    subtreeNodeIds.forEach((nodeId) => {
      const sourceNode = renderConfig.graph.nodes[nodeId];
      if (!sourceNode) return;
      v2_collectStyleKeysFromRefs(sourceNode.styles).forEach((sourceStyleKey) => {
        if (styleKeyMap.has(sourceStyleKey)) return;
        const nextStyleKey = v2_createUniqueStyleKey({
          baseKey: `${duplicatedComponentId}-${sourceStyleKey}`,
          existingKeys: existingStyleKeys,
        });
        styleKeyMap.set(sourceStyleKey, nextStyleKey);
      });
    });

    setRenderConfig((prev) => {
      const nextNodes = {
        ...prev.graph.nodes,
      };
      subtreeNodeIds.forEach((sourceNodeId) => {
        const sourceNode = prev.graph.nodes[sourceNodeId];
        const duplicatedNodeId = nodeIdMap.get(sourceNodeId);
        if (!sourceNode || !duplicatedNodeId) return;

        const nextStyles = sourceNode.styles
          ? {
              ...sourceNode.styles,
            }
          : undefined;
        if (nextStyles) {
          v2_GRAPH_STYLE_REF_KEYS.forEach((styleRefKey) => {
            const sourceStyleKey = nextStyles[styleRefKey];
            if (
              typeof sourceStyleKey === "string" &&
              styleKeyMap.has(sourceStyleKey)
            ) {
              nextStyles[styleRefKey] = styleKeyMap.get(sourceStyleKey);
            }
          });
        }

        const nextMeta = sourceNode.meta
          ? {
              ...sourceNode.meta,
            }
          : undefined;
        if (
          nextMeta?.layerSectionKey &&
          styleKeyMap.has(nextMeta.layerSectionKey)
        ) {
          nextMeta.layerSectionKey = styleKeyMap.get(nextMeta.layerSectionKey);
        }
        if (sourceNodeId === sourceDefinition.rootNodeId) {
          if (!nextMeta) {
            nextNodes[duplicatedNodeId] = {
              ...sourceNode,
              id: duplicatedNodeId,
              label: `${duplicatedLabel} Root`,
              parentId: null,
              childIds: sourceNode.childIds
                .map((childId) => nodeIdMap.get(childId))
                .filter((childId): childId is string => Boolean(childId)),
              layerId: rootLayerId,
              highlightTarget: `component:${duplicatedComponentId}`,
              ...(nextStyles ? { styles: nextStyles } : {}),
              meta: {
                layerIcon: "group",
                layerTarget: `component:${duplicatedComponentId}`,
                layerSectionKey:
                  nextStyles?.containerStyleKey ??
                  sourceNode.meta?.layerSectionKey ??
                  `${duplicatedComponentId}-container`,
                isTemplateComponent: true,
              },
            };
            return;
          }
          nextMeta.layerIcon = "group";
          nextMeta.layerTarget = `component:${duplicatedComponentId}`;
          nextMeta.isTemplateComponent = true;
        }

        nextNodes[duplicatedNodeId] = {
          ...sourceNode,
          id: duplicatedNodeId,
          label:
            sourceNodeId === sourceDefinition.rootNodeId
              ? `${duplicatedLabel} Root`
              : sourceNode.label,
          parentId:
            sourceNode.parentId === null
              ? null
              : (nodeIdMap.get(sourceNode.parentId) ?? null),
          childIds: sourceNode.childIds
            .map((childId) => nodeIdMap.get(childId))
            .filter((childId): childId is string => Boolean(childId)),
          ...(sourceNode.layerId
            ? { layerId: layerIdMap.get(sourceNode.layerId) ?? sourceNode.layerId }
            : {}),
          ...(nextStyles ? { styles: nextStyles } : {}),
          ...(nextMeta ? { meta: nextMeta } : {}),
        };
      });

      const nextLayoutCard = {
        ...prev.layout.card,
      };
      styleKeyMap.forEach((nextStyleKey, sourceStyleKey) => {
        const sourceValue = prev.layout.card[sourceStyleKey];
        if (sourceValue === undefined) return;
        nextLayoutCard[nextStyleKey] = v2_cloneForStorage(sourceValue);
      });

      return {
        ...prev,
        graph: {
          ...prev.graph,
          rootNodeIds: prev.graph.rootNodeIds.includes(rootNodeId)
            ? prev.graph.rootNodeIds
            : [...prev.graph.rootNodeIds, rootNodeId],
          nodes: nextNodes,
          componentDefinitions: {
            ...prev.graph.componentDefinitions,
            [duplicatedComponentId]: {
              ...sourceDefinition,
              id: duplicatedComponentId,
              label: duplicatedLabel,
              rootNodeId,
              kind: sourceDefinition.kind ?? "custom",
              instanceMode: sourceDefinition.instanceMode ?? "component",
              instanceTransforms: {
                ...(sourceDefinition.instanceTransforms ?? {}),
              },
            },
          },
        },
        layout: {
          ...prev.layout,
          card: nextLayoutCard,
        },
      };
    });

    return {
      ok: true,
      tone: "info",
      message: `${sourceDefinition.label} 컴포넌트를 복제했습니다.`,
      selectedComponentId: duplicatedComponentId,
      selectedLayerId: rootLayerId,
    };
  };
  const deleteComponentMaster = (
    componentId: string
  ): V2ComponentMutationResult => {
    if (!setRenderConfig) {
      return {
        ok: false,
        tone: "error",
        message: "컴포넌트를 삭제할 수 없습니다.",
      };
    }

    const definition = renderConfig.graph.componentDefinitions[componentId];
    if (!definition) {
      return {
        ok: false,
        tone: "error",
        message: "삭제할 컴포넌트를 찾을 수 없습니다.",
      };
    }

    const referencedInstanceCount = Object.values(renderConfig.graph.nodes).reduce(
      (count, node) => {
        if (node.type !== "componentInstance") return count;
        const nodeComponentId =
          typeof node.meta?.componentId === "string"
            ? node.meta.componentId.trim()
            : "";
        return nodeComponentId === componentId ? count + 1 : count;
      },
      0
    );
    if (referencedInstanceCount > 0) {
      return {
        ok: false,
        tone: "error",
        message: `사용 중인 인스턴스 ${referencedInstanceCount}개가 있어 삭제할 수 없습니다.`,
      };
    }

    const subtreeNodeIds = v2_collectSubtreeNodeIds({
      graph: renderConfig.graph,
      rootNodeId: definition.rootNodeId,
    });
    if (subtreeNodeIds.length === 0) {
      return {
        ok: false,
        tone: "error",
        message: "삭제할 컴포넌트 루트를 찾을 수 없습니다.",
      };
    }

    const styleKeysToCleanup = new Set<string>();
    subtreeNodeIds.forEach((nodeId) => {
      const node = renderConfig.graph.nodes[nodeId];
      if (!node) return;
      v2_collectStyleKeysFromRefs(node.styles).forEach((styleKey) => {
        styleKeysToCleanup.add(styleKey);
      });
    });

    setRenderConfig((prev) => {
      const nextGraph = v2_graphRemoveNodeSubtree(prev.graph, definition.rootNodeId);
      const remainingStyleKeySet = new Set<string>();
      Object.values(nextGraph.nodes).forEach((node) => {
        v2_collectStyleKeysFromRefs(node.styles).forEach((styleKey) => {
          remainingStyleKeySet.add(styleKey);
        });
      });

      const nextLayoutCard = {
        ...prev.layout.card,
      };
      styleKeysToCleanup.forEach((styleKey) => {
        if (remainingStyleKeySet.has(styleKey)) return;
        delete nextLayoutCard[styleKey];
      });

      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextLayoutCard,
        },
      };
    });

    const remainingComponents = runtimeComponentCatalog.filter(
      (item) => item.id !== componentId && item.rootLayerId
    );
    const nextSelected = remainingComponents[0] ?? null;
    return {
      ok: true,
      tone: "info",
      message: `${definition.label} 컴포넌트를 삭제했습니다.`,
      selectedComponentId: nextSelected?.id ?? null,
      selectedLayerId: nextSelected?.rootLayerId ?? null,
    };
  };
  const detachComponentMaster = (componentId: string) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => {
      const definition = prev.graph.componentDefinitions[componentId];
      if (!definition) return prev;
      if (definition.instanceMode === "detached") return prev;

      return {
        ...prev,
        graph: {
          ...prev.graph,
          componentDefinitions: {
            ...prev.graph.componentDefinitions,
            [componentId]: {
              ...definition,
              instanceMode: "detached",
              detachedAt: new Date().toISOString(),
            },
          },
        },
      };
    });
  };
  const extractComponentInstanceLayerCopy = (layerId: string) => {
    const sourceMeta = componentInstanceMetaByLayerId.get(layerId);
    if (!sourceMeta) return;

    if (!setRenderConfig) return;
    setRenderConfig((prev) => {
      const runtimeScene = v2_getRuntimeSceneNodes(prev);
      const sourceContext = v2_findSceneNodeContextById({
        nodes: runtimeScene,
        nodeId: sourceMeta.nodeId,
      });
      if (!sourceContext || sourceContext.node.kind !== "componentInstance") {
        return prev;
      }

      if (!sourceContext.parentId) return prev;
      const sourceParentContext = v2_findSceneNodeContextById({
        nodes: runtimeScene,
        nodeId: sourceContext.parentId,
      });
      if (!sourceParentContext || sourceParentContext.node.kind !== "cardCollection") {
        return prev;
      }

      const sourceGraphNode = prev.graph.nodes[sourceMeta.nodeId];
      if (!sourceGraphNode || sourceGraphNode.type !== "componentInstance") {
        return prev;
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
      const { cloneNode, styleKey } = v2_createSceneComponentInstanceCloneNode({
        sourceNode: sourceGraphNode,
        cloneNodeId,
        cloneLayerId,
      });

      let nextGraph = v2_graphInsertSiblingAfter({
        graph: prev.graph,
        anchorNodeId: sourceMeta.nodeId,
        newNode: cloneNode,
      });
      nextGraph = v2_graphMoveNode({
        graph: nextGraph,
        nodeId: cloneNodeId,
        targetParentId: null,
      });

      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            [styleKey]: prev.layout.scene[styleKey] ?? {
              position: "absolute",
              top: 120,
              left: 120,
            },
          },
        },
      };
    });
  };
  const moveComponentInstanceLayerToRoot = (layerId: string) => {
    applyLayerRelocation({
      layerId,
      targetParentId: ROOT_LAYER_PARENT_ID,
      targetIndex: Number.MAX_SAFE_INTEGER,
    });
  };

  const uiContextValue = useMemo(
    () => ({ state, actions }),
    [actions, state]
  );

  const isLayerHidden = useCallback(
    (layerId: string): boolean => {
      return hiddenLayerIds[layerId] === true;
    },
    [hiddenLayerIds]
  );

  const setLayerHidden = useCallback((layerId: string, hidden: boolean) => {
    setHiddenLayerIds((prev) => {
      if (hidden) {
        return {
          ...prev,
          [layerId]: true,
        };
      }

      if (!prev[layerId]) return prev;
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
  }, []);

  const toggleLayerHidden = useCallback((layerId: string) => {
    setHiddenLayerIds((prev) => {
      const current = prev[layerId] === true;
      if (current) {
        const next = { ...prev };
        delete next[layerId];
        return next;
      }
      return {
        ...prev,
        [layerId]: true,
      };
    });
  }, []);

  const runtimeValue = useMemo(
    () => ({
      data,
      updateData,
      globalData,
      updateGlobalData,
      currentTheme,
      updateTheme,
      resetData,
      hiddenLayerIds,
      isLayerHidden,
      toggleLayerHidden,
      setLayerHidden,
      hoverHighlightTarget,
      setHoverHighlightTarget,
      activeHighlightTarget,
      setActiveHighlightTarget,
    }),
    [
      activeHighlightTarget,
      currentTheme,
      data,
      globalData,
      hiddenLayerIds,
      hoverHighlightTarget,
      isLayerHidden,
      resetData,
      setLayerHidden,
      toggleLayerHidden,
      updateData,
      updateGlobalData,
      updateTheme,
    ]
  );

  return (
    <TemplateEditorUIProvider value={uiContextValue}>
      <TemplateDesignGuideProvider>
        <TemplateEditorRuntimeProvider value={runtimeValue}>
          {!isInitialized || state.weekDates.length === 0 ? (
            <V2Loading />
          ) : (
            <div className="v2-template-theme relative w-full h-full overflow-hidden bg-[#0d1117]">
              {!state.isMobile && <V2TimeTableControls />}
              {state.isMobile && <V2MobileHeader />}

              <div className="absolute inset-0">
                <V2TimeTablePreview />
              </div>

              {!state.isMobile && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsLeftPanelOpen((prev) => !prev)}
                    className={`absolute left-3 top-1/2 z-40 -translate-y-1/2 rounded border border-[#364156] bg-[#121722]/90 p-2 text-[#c8d6f2] shadow-lg transition hover:bg-[#1a2230] ${
                      isLeftPanelOpen ? "translate-x-[320px]" : "translate-x-0"
                    }`}
                    aria-label={isLeftPanelOpen ? "레이어 패널 닫기" : "레이어 패널 열기"}
                  >
                    {isLeftPanelOpen ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRightPanelOpen((prev) => !prev)}
                    className={`absolute right-3 top-1/2 z-40 -translate-y-1/2 rounded border border-[#364156] bg-[#121722]/90 p-2 text-[#c8d6f2] shadow-lg transition hover:bg-[#1a2230] ${
                      isRightPanelOpen ? "-translate-x-[420px]" : "translate-x-0"
                    }`}
                    aria-label={isRightPanelOpen ? "프로퍼티 패널 닫기" : "프로퍼티 패널 열기"}
                  >
                    {isRightPanelOpen ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <SlidersHorizontal className="h-4 w-4" />
                    )}
                  </button>

                  <aside
                    className={`absolute inset-y-0 left-0 z-30 w-[320px] transition-transform duration-200 ${
                      isLeftPanelOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                  >
                    <V2TimeTableLayersPanel
                      layerTree={runtimeLayerTree}
                      componentCatalog={runtimeComponentCatalog}
                      componentLayerTreeByComponentId={
                        runtimeComponentLayerTreeByComponentId
                      }
                      extractableComponentInstanceLayerIdSet={
                        extractableComponentInstanceLayerIdSet
                      }
                      orderedIdsByParent={orderedIdsByParent}
                      canRelocateLayer={(layerId) =>
                        relocatableLayerIdSet.has(layerId)
                      }
                      onReorderLayers={({ parentId, orderedIds }) => {
                        applyLayerZIndex({
                          parentId,
                          orderedIds,
                        });
                      }}
                      onRelocateLayers={(payload) => {
                        applyLayerRelocation(payload);
                      }}
                      onDetachComponent={detachComponentMaster}
                      onCreateComponent={createComponentMaster}
                      onDuplicateComponent={duplicateComponentMaster}
                      onDeleteComponent={deleteComponentMaster}
                      onExtractComponentInstanceLayerCopy={
                        extractComponentInstanceLayerCopy
                      }
                      onMoveComponentInstanceLayerToRoot={
                        moveComponentInstanceLayerToRoot
                      }
                      onCreateSceneNodeFromLayerMenu={createSceneNodeFromLayerMenu}
                      onSelectLayer={({ layerId, editorMode }) => {
                        setIsRightPanelOpen(true);
                        setPropertiesFocusRequest({
                          layerId,
                          nonce: Date.now(),
                          editorMode,
                        });
                      }}
                    />
                  </aside>

                  <aside
                    className={`absolute inset-y-0 right-0 z-30 w-[420px] max-w-[85vw] transition-transform duration-200 ${
                      isRightPanelOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                  >
                    <V2TemplateBuilderForm
                      onRequestClose={() => setIsRightPanelOpen(false)}
                      focusLayerId={propertiesFocusRequest?.layerId ?? null}
                      focusLayerNonce={propertiesFocusRequest?.nonce ?? 0}
                      focusEditorMode={
                        propertiesFocusRequest?.editorMode ?? "instance"
                      }
                    />
                  </aside>
                </>
              )}

              {state.isMobile && (
                <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55vh] min-h-[240px]">
                  <V2TemplateBuilderForm />
                </div>
              )}
            </div>
          )}
        </TemplateEditorRuntimeProvider>
      </TemplateDesignGuideProvider>
    </TemplateEditorUIProvider>
  );
};

export default V2TimeTableEditor;
