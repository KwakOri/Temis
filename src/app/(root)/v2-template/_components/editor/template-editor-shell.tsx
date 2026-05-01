import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TemplateDesignGuideProvider } from '@/contexts/v2/template-design-guide-context';
import { useTemplateRenderConfigContext } from '@/contexts/v2/template-render-config-context';
import { TemplateEditorRuntimeProvider } from '@/contexts/v2/template-editor-runtime-context';
import { TemplateEditorUIProvider } from '@/contexts/v2/template-editor-ui-context';
import { useTemplateEditor } from '@/hooks/v2/useTemplateEditor';
import {
  V2TemplateEditorScopedPreviewMode,
  V2TemplateEditorSceneUnitScope,
  V2TemplateEditorStatefulSceneScope,
  V2TemplateEditorTimetableComponentScope,
  V2TemplateStatefulSceneFeatureKey,
  V2TemplateStatefulSceneStatus,
  V2TemplateHighlightTarget,
} from '@/types/time-table/template-editor-ui';
import {
  V2TemplateGraphNode,
  V2TemplateGraphNodeStyleRefs,
  V2TemplateDayKey,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
  V2TemplateStyleRecord,
  V2TemplateTimetableCardStatusKey,
} from '@/types/time-table/template-render-config';
import { TTheme } from '@/types/time-table/theme';
import { v2_getRuntimeLayerTree } from '@/utils/v2/template-graph-layers-runtime';
import { v2_getRuntimeComponentLayerTreeByComponentId } from '@/utils/v2/template-graph-component-layers-runtime';
import {
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from '@/utils/v2/template-graph-runtime';
import V2TemplateBuilderForm from '../properties/template-properties-panel';
import V2RuntimeForm from '../runtime/runtime-form';
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
import V2TimeTablePreview, {
  type V2CanvasEditorTarget,
} from './preview-canvas';
import {
  v2_graphAppendChild,
  v2_graphAppendRoot,
  v2_graphInsertSiblingAfter,
  v2_graphMoveNode,
  v2_graphRemoveNodeSubtree,
} from '@/utils/v2/template-graph-editor';
import {
  v2_runOrderKeyRegressionChecks,
  v2_validateOrderKeyGraph,
} from '@/utils/v2/template-graph-order';
import {
  v2_applyRelocatedComponentInstancePatch,
  v2_COMPONENT_INSTANCE_CLONE_LAYER_PREFIX,
  v2_COMPONENT_INSTANCE_CLONE_NODE_PREFIX,
  v2_createSceneComponentInstanceCloneNode,
} from '@/utils/v2/template-scene-component-instance';
import { v2_normalizeTemplateRenderConfig } from '@/utils/v2/template-render-config';
import {
  v2_collectSceneNodesByLayerId,
  v2_collectSceneNodeIds,
  v2_collectLayerNodeIds,
  v2_createUniqueNodeId,
  v2_findSceneNodeContextById,
} from '../properties/model/structure-utils';
import {
  v2_sceneNodeToGraphNode,
} from '../properties/model/scene-node-graph-utils';
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from '../properties/model/text-node-defaults';
import {
  v2_findTimetableCardFrameIdByLayerId,
  v2_findTimetableCardObjectIdByLayerId,
  v2_getTimetableComponentLayerTree,
  v2_getTimetableComponentStateForStatus,
  v2_relocateTimetableCardObject,
  v2_reorderTimetableCardObjects,
} from '@/utils/v2/timetable-component-layer-tree';

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

const v2_DEFAULT_LOCKED_LAYER_IDS = new Set([
  "scene-root",
  "scene",
  "scene-background",
  "background",
  "online-background",
  "multi-background",
  "offline-background",
  "offline-memo-background",
]);

const v2_isLayerLockedByDefault = (layerId: string): boolean => {
  const normalizedLayerId = layerId.trim().toLowerCase();
  if (v2_DEFAULT_LOCKED_LAYER_IDS.has(normalizedLayerId)) return true;
  return normalizedLayerId.endsWith("-background");
};

const v2_parseCanvasPositionValue = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^-?\d+(\.\d+)?(px)?$/i.test(trimmed)) {
    const parsed = Number(trimmed.replace(/px$/i, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const v2_roundCanvasPositionValue = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
};

const v2_movePositionStyleRecord = (
  styleRecord: V2TemplateStyleRecord | undefined,
  deltaX: number,
  deltaY: number
): V2TemplateStyleRecord => {
  const nextStyleRecord = { ...(styleRecord ?? {}) };
  if (nextStyleRecord.position === undefined) {
    nextStyleRecord.position = "absolute";
  }
  nextStyleRecord.left = v2_roundCanvasPositionValue(
    v2_parseCanvasPositionValue(nextStyleRecord.left) + deltaX
  );
  nextStyleRecord.top = v2_roundCanvasPositionValue(
    v2_parseCanvasPositionValue(nextStyleRecord.top) + deltaY
  );
  return nextStyleRecord;
};

const v2_getSceneNodePositionStyleKey = (
  node: V2TemplateSceneNode
): string | null => {
  if (node.kind === "text" || node.kind === "flexibleText") {
    return node.containerStyleKey;
  }
  if (node.kind === "asset" || node.kind === "group" || node.kind === "componentInstance") {
    return node.styleKey ?? null;
  }
  if (node.kind === "cardCollection") return "grid";
  return null;
};

const v2_ROOT_SCENE_POSITION_STYLE_KEYS = new Set([
  "weekFlag",
  "topObjectContainer",
  "artistTextRootStyle",
  "artistObjectStyle",
]);

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

type V2LayerMenuCreateKind =
  | "text"
  | "flexibleText"
  | "asset"
  | "group"
  | "cardCollection";

type V2TemplateEditorScope =
  | { mode: "scene" }
  | { mode: "timetableGrid" }
  | ({
      mode: "sceneUnit";
    } & V2TemplateEditorSceneUnitScope)
  | ({
      mode: "timetableComponent";
    } & V2TemplateEditorTimetableComponentScope)
  | ({
      mode: "statefulScene";
    } & V2TemplateEditorStatefulSceneScope);

const v2_STATEFUL_SCENE_LAYER_ID: Record<V2TemplateStatefulSceneFeatureKey, string> = {
  artist: "artist",
  memo: "memo",
};

const v2_STATEFUL_SCENE_LABEL: Record<V2TemplateStatefulSceneFeatureKey, string> = {
  artist: "Artist",
  memo: "Memo",
};

const v2_isLayerVisibleForStatefulSceneScope = ({
  feature,
  status,
  node,
}: {
  feature: V2TemplateStatefulSceneFeatureKey;
  status: V2TemplateStatefulSceneStatus;
  node: V2TemplateLayerNode;
}) => {
  const mode = node.visibilityMode ?? "always";
  if (feature === "artist") {
    if (mode === "artistOnOnly") return status === "on";
    if (mode === "artistOffOnly") return status === "off";
    if (mode === "memoOnOnly" || mode === "memoOffOnly") return false;
    return true;
  }
  if (mode === "memoOnOnly") return status === "on";
  if (mode === "memoOffOnly") return status === "off";
  if (mode === "artistOnOnly" || mode === "artistOffOnly") return false;
  return true;
};

const v2_filterLayerTreeForStatefulSceneScope = ({
  layerTree,
  scope,
}: {
  layerTree: V2TemplateLayerNode[];
  scope: V2TemplateEditorStatefulSceneScope;
}): V2TemplateLayerNode[] => {
  const featureLayerId = v2_STATEFUL_SCENE_LAYER_ID[scope.feature];
  const findNode = (nodes: V2TemplateLayerNode[]): V2TemplateLayerNode | null => {
    for (const node of nodes) {
      if (node.id === featureLayerId) return node;
      const found = node.children ? findNode(node.children) : null;
      if (found) return found;
    }
    return null;
  };
  const filterNode = (node: V2TemplateLayerNode): V2TemplateLayerNode | null => {
    if (
      node.id !== featureLayerId &&
      !v2_isLayerVisibleForStatefulSceneScope({
        feature: scope.feature,
        status: scope.status,
        node,
      })
    ) {
      return null;
    }
    return {
      ...node,
      label:
        node.id === featureLayerId
          ? `${v2_STATEFUL_SCENE_LABEL[scope.feature]} / ${scope.status === "on" ? "ON" : "OFF"}`
          : node.label,
      children: node.children
        ?.map((child) => filterNode(child))
        .filter((child): child is V2TemplateLayerNode => Boolean(child)),
    };
  };
  const featureNode = findNode(layerTree);
  const filtered = featureNode ? filterNode(featureNode) : null;
  return filtered ? [filtered] : [];
};

const v2_filterLayerTreeForLayerId = ({
  layerTree,
  layerId,
}: {
  layerTree: V2TemplateLayerNode[];
  layerId: string;
}): V2TemplateLayerNode[] => {
  const findNode = (nodes: V2TemplateLayerNode[]): V2TemplateLayerNode | null => {
    for (const node of nodes) {
      if (node.id === layerId) return node;
      const found = node.children ? findNode(node.children) : null;
      if (found) return found;
    }
    return null;
  };
  const node = findNode(layerTree);
  return node ? [node] : [];
};

const v2_stripLayerNodeChildren = (
  node: V2TemplateLayerNode
): V2TemplateLayerNode => {
  if (!node.children?.length) return node;
  return {
    ...node,
    children: undefined,
  };
};

const v2_getSceneUnitLayerTree = (
  layerTree: V2TemplateLayerNode[]
): V2TemplateLayerNode[] =>
  layerTree.map((node) => {
    if (node.id !== "scene-root") {
      return v2_stripLayerNodeChildren(node);
    }
    return {
      ...node,
      children: node.children?.map((child) => v2_stripLayerNodeChildren(child)),
    };
  });

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
    const styleKey = `sceneNode:${baseSceneNodeId}:frame`;
    return {
      sceneNode: {
        id: baseSceneNodeId,
        label: `Group ${ordinal}`,
        kind: "group",
        layerId,
        styleKey,
        visibilityMode: "always",
        children: [],
      },
      layerNode: {
        id: layerId,
        label: `Group ${ordinal}`,
        kind: "group",
        icon: "group",
        target: `sceneNode:${baseSceneNodeId}`,
        sectionKey: styleKey,
        visibilityMode: "always",
        children: [],
      },
      dynamicSceneLayoutPatch: {
        [styleKey]: {
          position: "absolute",
          top: 0,
          left: 0,
          width: 400,
          height: 300,
        },
      },
    };
  }

  if (kind === "cardCollection") {
    return {
      sceneNode: {
        id: baseSceneNodeId,
        label: `CardCollection ${ordinal}`,
        kind: "cardCollection",
        layerId,
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
  const [selectedCanvasTarget, setSelectedCanvasTarget] =
    useState<V2CanvasEditorTarget | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<
    "properties" | "runtime"
  >("properties");
  const [editorScope, setEditorScope] = useState<V2TemplateEditorScope>({
    mode: "scene",
  });
  const [scopedPreviewMode, setScopedPreviewMode] =
    useState<V2TemplateEditorScopedPreviewMode>("isolated");
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
  const [lockedLayerIds, setLockedLayerIds] = useState<Record<string, boolean>>(
    {}
  );
  const isLayerLocked = useCallback(
    (layerId: string): boolean => {
      return lockedLayerIds[layerId] ?? v2_isLayerLockedByDefault(layerId);
    },
    [lockedLayerIds]
  );
  const setLayerLocked = useCallback((layerId: string, locked: boolean) => {
    setLockedLayerIds((prev) => {
      const defaultLocked = v2_isLayerLockedByDefault(layerId);
      if (locked === defaultLocked) {
        if (!(layerId in prev)) return prev;
        const next = { ...prev };
        delete next[layerId];
        return next;
      }

      if (prev[layerId] === locked) return prev;
      return {
        ...prev,
        [layerId]: locked,
      };
    });
  }, []);
  const toggleLayerLocked = useCallback(
    (layerId: string) => {
      setLayerLocked(layerId, !isLayerLocked(layerId));
    },
    [isLayerLocked, setLayerLocked]
  );
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const sceneUnitLayerTree = useMemo(
    () => v2_getSceneUnitLayerTree(runtimeLayerTree),
    [runtimeLayerTree]
  );
  const timetableComponentEditScope = useMemo<
    V2TemplateEditorTimetableComponentScope | null
  >(() => {
    if (editorScope.mode !== "timetableComponent") return null;
    return {
      componentId: editorScope.componentId,
      status: editorScope.status,
    };
  }, [editorScope]);
  const timetableGridEditScope = editorScope.mode === "timetableGrid";
  const sceneUnitEditScope = useMemo<V2TemplateEditorSceneUnitScope | null>(() => {
    if (editorScope.mode !== "sceneUnit") return null;
    return {
      layerId: editorScope.layerId,
      label: editorScope.label,
    };
  }, [editorScope]);
  const statefulSceneEditScope = useMemo<
    V2TemplateEditorStatefulSceneScope | null
  >(() => {
    if (editorScope.mode !== "statefulScene") return null;
    return {
      feature: editorScope.feature,
      status: editorScope.status,
    };
  }, [editorScope]);
  const hasScopedEditor = Boolean(
    timetableGridEditScope ||
      timetableComponentEditScope ||
      sceneUnitEditScope ||
      statefulSceneEditScope
  );
  const activeTimetableComponent = timetableComponentEditScope
    ? renderConfig.timetable.components[timetableComponentEditScope.componentId] ??
      null
    : null;
  const activeTimetableComponentState = useMemo(() => {
    if (!timetableComponentEditScope) return null;
    return v2_getTimetableComponentStateForStatus({
      component: activeTimetableComponent,
      status: timetableComponentEditScope.status,
    });
  }, [activeTimetableComponent, timetableComponentEditScope]);
  const activeTimetableComponentLayerTree = useMemo(() => {
    if (!timetableComponentEditScope) return runtimeLayerTree;
    return v2_getTimetableComponentLayerTree({
      component: activeTimetableComponent,
      status: timetableComponentEditScope.status,
    });
  }, [activeTimetableComponent, runtimeLayerTree, timetableComponentEditScope]);
  const activeTimetableGridLayerTree = useMemo(() => {
    if (!timetableGridEditScope) return runtimeLayerTree;
    return v2_filterLayerTreeForLayerId({
      layerTree: runtimeLayerTree,
      layerId: "grid",
    });
  }, [runtimeLayerTree, timetableGridEditScope]);
  const activeSceneUnitLayerTree = useMemo(() => {
    if (!sceneUnitEditScope) return runtimeLayerTree;
    return v2_filterLayerTreeForLayerId({
      layerTree: runtimeLayerTree,
      layerId: sceneUnitEditScope.layerId,
    });
  }, [runtimeLayerTree, sceneUnitEditScope]);
  const activeStatefulSceneLayerTree = useMemo(() => {
    if (!statefulSceneEditScope) return runtimeLayerTree;
    return v2_filterLayerTreeForStatefulSceneScope({
      layerTree: runtimeLayerTree,
      scope: statefulSceneEditScope,
    });
  }, [runtimeLayerTree, statefulSceneEditScope]);
  const activeScopedLayerTree = timetableComponentEditScope
    ? activeTimetableComponentLayerTree
    : timetableGridEditScope
      ? activeTimetableGridLayerTree
      : sceneUnitEditScope
        ? activeSceneUnitLayerTree
        : statefulSceneEditScope
          ? activeStatefulSceneLayerTree
          : sceneUnitLayerTree;
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

    const visit = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.kind === "componentInstance") {
          const layerId = node.layerId ?? node.id;
          next.set(layerId, {
            nodeId: node.id,
            canExtractCopy: false,
          });
          return;
        }

        if (
          node.kind === "group" &&
          node.children &&
          node.children.length > 0
        ) {
          visit(node.children);
        }
      });
    };

    visit(runtimeSceneNodes);
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
    const collectComponentInstanceCounts = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.kind === "componentInstance") {
          const componentId = node.componentId?.trim();
          if (!componentId) return;
          const previous = instanceStatsByComponentId[componentId] ?? {
            count: 0,
            firstLayerId: null,
          };
          instanceStatsByComponentId[componentId] = {
            count: previous.count + 1,
            firstLayerId: previous.firstLayerId ?? node.layerId ?? node.id ?? null,
          };
          return;
        }
        if (node.kind === "group") {
          collectComponentInstanceCounts(node.children);
        }
      });
    };
    collectComponentInstanceCounts(runtimeSceneNodes);

    const definitions = Object.values(renderConfig.graph.componentDefinitions ?? {});
    return definitions.map((definition) => {
      const rootNode = renderConfig.graph.nodes[definition.rootNodeId];
      return {
        id: definition.id,
        label: definition.label || definition.id,
        rootNodeId: definition.rootNodeId,
        rootLayerId: rootNode?.layerId ?? rootNode?.id ?? null,
        kind: definition.kind ?? "custom",
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
    () => {
      const graphCardStructures = Object.keys(
        renderConfig.graph.componentDefinitions ?? {}
      ).map((componentId) =>
        v2_getRuntimeCardStructureByComponentId(renderConfig, componentId)
      );
      const timetableCardStructures = Object.values(
        renderConfig.timetable.components ?? {}
      ).flatMap((component) =>
        Object.values(component.states ?? {})
          .map((state) => state.card)
          .filter((card): card is NonNullable<typeof card> => Boolean(card))
      );
      return [...graphCardStructures, ...timetableCardStructures];
    },
    [renderConfig]
  );
  const relocatableLayerIdSet = useMemo(() => {
    const next = new Set<string>();
    const visit = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.layerId) {
          next.add(node.layerId);
        }
        if (node.kind === "group" && node.children) {
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
  const componentEditorOrderedIdsByParent = useMemo(
    () => buildOrderedLayerIdsByParent({
      layers: activeTimetableComponentLayerTree,
      layout: renderConfig.layout,
      resolverMap: runtimeStyleResolverMap,
      graph: renderConfig.graph,
    }),
    [
      activeTimetableComponentLayerTree,
      renderConfig.graph,
      renderConfig.layout,
      runtimeStyleResolverMap,
    ]
  );
  const openTimetableComponentEditor = (
    scope?: Partial<V2TemplateEditorTimetableComponentScope>
  ) => {
    const componentIdCandidate = scope?.componentId;
    const componentId =
      componentIdCandidate && renderConfig.timetable.components[componentIdCandidate]
        ? componentIdCandidate
        : renderConfig.timetable.componentOrder.find(
            (candidate) => renderConfig.timetable.components[candidate]
          ) ?? Object.keys(renderConfig.timetable.components)[0];
    if (!componentId) return;
    const status = (scope?.status ?? "online") as V2TemplateTimetableCardStatusKey;
    setEditorScope({
      mode: "timetableComponent",
      componentId,
      status,
    });
    setScopedPreviewMode("isolated");
    setIsLeftPanelOpen(true);
    setIsRightPanelOpen(true);
    setRightPanelMode("properties");
    setSelectedCanvasTarget(null);
    const component = renderConfig.timetable.components[componentId];
    const card =
      component?.states[status]?.card ??
      component?.states.online?.card ??
      component?.states.offline?.card;
    setPropertiesFocusRequest({
      layerId: card?.containerLayerId ?? "card",
      nonce: Date.now(),
      editorMode: "instance",
    });
  };
  const openTimetableGridEditor = () => {
    setEditorScope({ mode: "timetableGrid" });
    setScopedPreviewMode("isolated");
    setIsLeftPanelOpen(true);
    setIsRightPanelOpen(true);
    setRightPanelMode("properties");
    setSelectedCanvasTarget(null);
    setPropertiesFocusRequest({
      layerId: "grid",
      nonce: Date.now(),
      editorMode: "instance",
    });
  };
  const closeTimetableGridEditor = () => {
    setEditorScope({ mode: "scene" });
    setScopedPreviewMode("isolated");
    setActiveHighlightTarget(null);
    setHoverHighlightTarget(null);
    setSelectedCanvasTarget(null);
  };
  const openSceneUnitEditor = (scope: V2TemplateEditorSceneUnitScope) => {
    setEditorScope({
      mode: "sceneUnit",
      ...scope,
    });
    setScopedPreviewMode("isolated");
    setIsLeftPanelOpen(true);
    setIsRightPanelOpen(true);
    setRightPanelMode("properties");
    setSelectedCanvasTarget(null);
    setPropertiesFocusRequest({
      layerId: scope.layerId,
      nonce: Date.now(),
      editorMode: "instance",
    });
  };
  const closeSceneUnitEditor = () => {
    setEditorScope({ mode: "scene" });
    setScopedPreviewMode("isolated");
    setActiveHighlightTarget(null);
    setHoverHighlightTarget(null);
    setSelectedCanvasTarget(null);
  };
  const closeTimetableComponentEditor = () => {
    setEditorScope({ mode: "timetableGrid" });
    setScopedPreviewMode("isolated");
    setActiveHighlightTarget(null);
    setHoverHighlightTarget(null);
    setSelectedCanvasTarget(null);
    setPropertiesFocusRequest({
      layerId: "grid",
      nonce: Date.now(),
      editorMode: "instance",
    });
  };
  const updateTimetableComponentEditScope = (
    scope: V2TemplateEditorTimetableComponentScope
  ) => {
    setEditorScope({
      mode: "timetableComponent",
      ...scope,
    });
  };
  const openStatefulSceneEditor = (
    scope: V2TemplateEditorStatefulSceneScope
  ) => {
    setEditorScope({
      mode: "statefulScene",
      ...scope,
    });
    setScopedPreviewMode("isolated");
    setIsLeftPanelOpen(true);
    setIsRightPanelOpen(true);
    setRightPanelMode("properties");
    setSelectedCanvasTarget(null);
    setPropertiesFocusRequest({
      layerId: v2_STATEFUL_SCENE_LAYER_ID[scope.feature],
      nonce: Date.now(),
      editorMode: "instance",
    });
  };
  const closeStatefulSceneEditor = () => {
    setEditorScope({ mode: "scene" });
    setScopedPreviewMode("isolated");
    setActiveHighlightTarget(null);
    setHoverHighlightTarget(null);
    setSelectedCanvasTarget(null);
  };
  const updateStatefulSceneEditScope = (
    scope: V2TemplateEditorStatefulSceneScope
  ) => {
    setEditorScope({
      mode: "statefulScene",
      ...scope,
    });
    setSelectedCanvasTarget(null);
  };
  const resolveTimetableComponentParentFrameId = ({
    card,
    parentLayerId,
  }: {
    card: NonNullable<typeof activeTimetableComponentState>["card"];
    parentLayerId: string;
  }): string | null | undefined => {
    if (
      parentLayerId === ROOT_LAYER_PARENT_ID ||
      parentLayerId === card.containerLayerId
    ) {
      return null;
    }
    const parentFrameId = v2_findTimetableCardFrameIdByLayerId({
      card,
      layerId: parentLayerId,
    });
    return parentFrameId ?? undefined;
  };
  const canRelocateTimetableComponentLayer = (layerId: string): boolean => {
    if (!activeTimetableComponentState) return false;
    return Boolean(
      v2_findTimetableCardObjectIdByLayerId({
        card: activeTimetableComponentState.card,
        layerId,
      })
    );
  };
  const resolveTimetableComponentRenderInsertIndex = ({
    card,
    targetParentFrameId,
    targetDisplayIndex,
    movingObjectId,
  }: {
    card: NonNullable<typeof activeTimetableComponentState>["card"];
    targetParentFrameId: string | null;
    targetDisplayIndex: number;
    movingObjectId?: string;
  }): number => {
    const targetObjectIds = targetParentFrameId
      ? (card.frameNodes?.[targetParentFrameId]?.childIds ?? [])
      : (card.rootObjectIds ?? card.nodeOrder);
    const targetLength = movingObjectId
      ? targetObjectIds.filter((objectId) => objectId !== movingObjectId).length
      : targetObjectIds.length;
    if (!Number.isFinite(targetDisplayIndex)) return targetLength;
    return Math.max(
      0,
      Math.min(targetLength, targetLength - Math.floor(targetDisplayIndex))
    );
  };
  const applyTimetableComponentLayerOrder = ({
    parentId,
    orderedIds,
  }: {
    parentId: string;
    orderedIds: string[];
  }) => {
    if (!setRenderConfig || !timetableComponentEditScope) return;
    setRenderConfig((prev) => {
      const component =
        prev.timetable.components[timetableComponentEditScope.componentId];
      const state = component?.states[timetableComponentEditScope.status];
      if (!component || !state) return prev;

      const parentFrameId = resolveTimetableComponentParentFrameId({
        card: state.card,
        parentLayerId: parentId,
      });
      if (parentFrameId === undefined) return prev;

      const orderedObjectIds = orderedIds
        .map((layerId) =>
          v2_findTimetableCardObjectIdByLayerId({
            card: state.card,
            layerId,
          })
        )
        .filter((objectId): objectId is string => Boolean(objectId));
      const renderOrderedObjectIds = [...orderedObjectIds].reverse();
      const nextCard = v2_reorderTimetableCardObjects({
        card: state.card,
        parentFrameId,
        orderedObjectIds: renderOrderedObjectIds,
      });
      if (nextCard === state.card) return prev;
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [component.id]: {
              ...component,
              states: {
                ...component.states,
                [timetableComponentEditScope.status]: {
                  ...state,
                  card: nextCard,
                },
              },
            },
          },
        },
      };
    });
  };
  const applyTimetableComponentLayerRelocation = ({
    layerId,
    targetParentId,
    targetIndex,
  }: {
    layerId: string;
    targetParentId: string;
    targetIndex: number;
  }) => {
    if (!setRenderConfig || !timetableComponentEditScope) return;
    setRenderConfig((prev) => {
      const component =
        prev.timetable.components[timetableComponentEditScope.componentId];
      const state = component?.states[timetableComponentEditScope.status];
      if (!component || !state) return prev;

      const objectId = v2_findTimetableCardObjectIdByLayerId({
        card: state.card,
        layerId,
      });
      if (!objectId) return prev;
      const targetParentFrameId = resolveTimetableComponentParentFrameId({
        card: state.card,
        parentLayerId: targetParentId,
      });
      if (targetParentFrameId === undefined) return prev;
      const renderTargetIndex = resolveTimetableComponentRenderInsertIndex({
        card: state.card,
        targetParentFrameId,
        targetDisplayIndex: targetIndex,
        movingObjectId: objectId,
      });

      const nextCard = v2_relocateTimetableCardObject({
        card: state.card,
        objectId,
        targetParentFrameId,
        targetIndex: renderTargetIndex,
      });
      if (nextCard === state.card) return prev;
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [component.id]: {
              ...component,
              states: {
                ...component.states,
                [timetableComponentEditScope.status]: {
                  ...state,
                  card: nextCard,
                },
              },
            },
          },
        },
      };
    });
  };

  useEffect(() => {
    if (editorScope.mode !== "timetableComponent") return;
    if (renderConfig.timetable.components[editorScope.componentId]) return;
    const fallbackComponentId =
      renderConfig.timetable.componentOrder.find(
        (componentId) => renderConfig.timetable.components[componentId]
      ) ?? Object.keys(renderConfig.timetable.components)[0];
    if (!fallbackComponentId) {
      setEditorScope({ mode: "scene" });
      return;
    }
    setEditorScope({
      mode: "timetableComponent",
      componentId: fallbackComponentId,
      status: "online",
    });
  }, [editorScope, renderConfig.timetable]);

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
          targetSceneParentNode.kind !== "group")
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
  const resolveCanvasTargetFromLayerSelection = useCallback(
    ({
      layerId,
      target,
    }: {
      layerId: string;
      target?: V2TemplateHighlightTarget;
    }): V2CanvasEditorTarget | null => {
      if (!layerId) return null;
      if (isLayerLocked(layerId)) return null;
      if (target === "grid" || layerId === "grid") {
        return {
          layerId: "grid",
          highlightTarget: "grid",
          dragKind: "grid",
        };
      }

      if (timetableComponentEditScope && activeTimetableComponentState) {
        const objectId = v2_findTimetableCardObjectIdByLayerId({
          card: activeTimetableComponentState.card,
          layerId,
        });
        if (!objectId) return null;
        return {
          layerId,
          highlightTarget: target,
          dragKind: "cardObject",
        };
      }

      const sceneNodeByLayerId = v2_collectSceneNodesByLayerId(runtimeSceneNodes);
      if (!sceneNodeByLayerId.has(layerId)) return null;
      return {
        layerId,
        highlightTarget: target,
        dragKind: "scene",
      };
    },
    [
      activeTimetableComponentState,
      isLayerLocked,
      runtimeSceneNodes,
      timetableComponentEditScope,
    ]
  );
  const moveCanvasObject = useCallback(
    ({
      target,
      deltaX,
      deltaY,
    }: {
      target: V2CanvasEditorTarget;
      deltaX: number;
      deltaY: number;
    }) => {
      if (!setRenderConfig) return;
      if (isLayerLocked(target.layerId)) return;
      if (
        !Number.isFinite(deltaX) ||
        !Number.isFinite(deltaY) ||
        (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001)
      ) {
        return;
      }

      setRenderConfig((prev) => {
        if (
          timetableComponentEditScope &&
          target.dragKind === "cardObject"
        ) {
          const component =
            prev.timetable.components[timetableComponentEditScope.componentId];
          const state = component?.states[timetableComponentEditScope.status];
          if (!component || !state) return prev;

          const objectId = v2_findTimetableCardObjectIdByLayerId({
            card: state.card,
            layerId: target.layerId,
          });
          if (!objectId) return prev;
          const frame = state.card.frameNodes?.[objectId];
          const node = state.card.nodes[objectId];
          const styleKey = frame?.styleKey ?? node?.containerStyleKey;
          if (!styleKey) return prev;

          return {
            ...prev,
            layout: {
              ...prev.layout,
              card: {
                ...prev.layout.card,
                [styleKey]: v2_movePositionStyleRecord(
                  prev.layout.card[styleKey] as V2TemplateStyleRecord | undefined,
                  deltaX,
                  deltaY
                ),
              },
            },
          };
        }

        if (target.dragKind === "timetableSlot" && target.dayKey) {
          const dayKey = target.dayKey as V2TemplateDayKey;
          const currentSlot = prev.timetable.slots[dayKey] ?? {
            dayKey,
            componentId: prev.timetable.componentOrder[0] ?? "",
          };
          const currentTransform = currentSlot.transform ?? {};
          const offsetX = v2_roundCanvasPositionValue(
            v2_parseCanvasPositionValue(currentTransform.offsetX) + deltaX
          );
          const offsetY = v2_roundCanvasPositionValue(
            v2_parseCanvasPositionValue(currentTransform.offsetY) + deltaY
          );
          return {
            ...prev,
            timetable: {
              ...prev.timetable,
              slots: {
                ...prev.timetable.slots,
                [dayKey]: {
                  ...currentSlot,
                  transform: {
                    ...currentTransform,
                    offsetX,
                    offsetY,
                  },
                },
              },
            },
          };
        }

        if (target.dragKind === "grid" || target.layerId === "grid") {
          return {
            ...prev,
            layout: {
              ...prev.layout,
              grid: v2_movePositionStyleRecord(prev.layout.grid, deltaX, deltaY),
            },
          };
        }

        const runtimeSceneNodes = v2_getRuntimeSceneNodes(prev);
        const sceneNodeByLayerId = v2_collectSceneNodesByLayerId(runtimeSceneNodes);
        const sceneNode = sceneNodeByLayerId.get(target.layerId);
        if (!sceneNode) return prev;
        const styleKey = v2_getSceneNodePositionStyleKey(sceneNode);
        if (!styleKey) return prev;

        if (styleKey === "grid") {
          return {
            ...prev,
            layout: {
              ...prev.layout,
              grid: v2_movePositionStyleRecord(prev.layout.grid, deltaX, deltaY),
            },
          };
        }

        if (v2_ROOT_SCENE_POSITION_STYLE_KEYS.has(styleKey)) {
          return {
            ...prev,
            layout: {
              ...prev.layout,
              [styleKey]: v2_movePositionStyleRecord(
                prev.layout[
                  styleKey as keyof Pick<
                    typeof prev.layout,
                    | "weekFlag"
                    | "topObjectContainer"
                    | "artistTextRootStyle"
                    | "artistObjectStyle"
                  >
                ] as V2TemplateStyleRecord | undefined,
                deltaX,
                deltaY
              ),
            },
          };
        }

        return {
          ...prev,
          layout: {
            ...prev.layout,
            scene: {
              ...prev.layout.scene,
              [styleKey]: v2_movePositionStyleRecord(
                prev.layout.scene[styleKey] as V2TemplateStyleRecord | undefined,
                deltaX,
                deltaY
              ),
            },
          },
        };
      });
    },
    [isLayerLocked, setRenderConfig, timetableComponentEditScope]
  );
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
      const resolvedLayerId =
        typeof layerId === "string" && layerId.trim().length > 0
          ? layerId
          : sceneUnitEditScope
            ? sceneUnitEditScope.layerId
          : statefulSceneEditScope
            ? v2_STATEFUL_SCENE_LAYER_ID[statefulSceneEditScope.feature]
            : null;
      const anchorSceneNode =
        resolvedLayerId
          ? sceneNodeByLayerId.get(resolvedLayerId) ?? null
          : null;
      let nextGraphNode = v2_sceneNodeToGraphNode(sceneNode);
      const statefulVisibilityMode =
        statefulSceneEditScope?.feature === "artist"
          ? statefulSceneEditScope.status === "on"
            ? "artistOnOnly"
            : "artistOffOnly"
          : statefulSceneEditScope?.feature === "memo"
            ? statefulSceneEditScope.status === "on"
              ? "memoOnOnly"
              : "memoOffOnly"
            : undefined;
      nextGraphNode = {
        ...nextGraphNode,
        childIds: [],
        ...(statefulVisibilityMode
          ? { visibilityMode: statefulVisibilityMode }
          : {}),
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
              instanceMode: "detached",
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
              instanceMode: "detached",
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
      lockedLayerIds,
      isLayerLocked,
      toggleLayerLocked,
      setLayerLocked,
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
      isLayerLocked,
      lockedLayerIds,
      resetData,
      setLayerHidden,
      setLayerLocked,
      toggleLayerLocked,
      toggleLayerHidden,
      updateData,
      updateGlobalData,
      updateTheme,
    ]
  );
  const scopedEditorTitle = timetableComponentEditScope
    ? "Card Component 편집"
    : timetableGridEditScope
      ? "Grid 편집"
      : sceneUnitEditScope
        ? `${sceneUnitEditScope.label} 편집`
      : statefulSceneEditScope
        ? `${v2_STATEFUL_SCENE_LABEL[statefulSceneEditScope.feature]} 편집`
        : undefined;
  const scopedEditorExitHandler = timetableComponentEditScope
    ? closeTimetableComponentEditor
    : timetableGridEditScope
      ? closeTimetableGridEditor
      : sceneUnitEditScope
        ? closeSceneUnitEditor
      : statefulSceneEditScope
        ? closeStatefulSceneEditor
        : undefined;
  const scopedEditorExitLabel = timetableComponentEditScope
    ? "Grid로 돌아가기"
    : "Scene으로 돌아가기";
  const mobileScopedEditorExitLabel = timetableComponentEditScope
    ? "Grid로"
    : "Scene으로";
  const scopedLayerDescription = timetableComponentEditScope
    ? "선택한 카드 컴포넌트의 내부 오브젝트만 표시합니다."
    : timetableGridEditScope
      ? "Grid 레이어만 표시합니다. Card 내부는 Card Component 편집에서 조정합니다."
      : sceneUnitEditScope
        ? "선택한 scene unit의 내부 오브젝트만 표시합니다."
      : statefulSceneEditScope
        ? "선택한 상태의 내부 오브젝트만 표시합니다."
        : undefined;

  return (
    <TemplateEditorUIProvider value={uiContextValue}>
      <TemplateDesignGuideProvider>
        <TemplateEditorRuntimeProvider value={runtimeValue}>
          {!isInitialized || state.weekDates.length === 0 ? (
            <V2Loading />
          ) : (
            <div className="v2-template-theme relative w-full h-full overflow-hidden bg-[#0d1117]">
              {!state.isMobile && (
                <V2TimeTableControls
                  scopeTitle={scopedEditorTitle}
                  onExitScope={scopedEditorExitHandler}
                  exitScopeLabel={scopedEditorExitLabel}
                  scopePreviewMode={
                    hasScopedEditor ? scopedPreviewMode : undefined
                  }
                  onChangeScopePreviewMode={
                    hasScopedEditor ? setScopedPreviewMode : undefined
                  }
                />
              )}
              {state.isMobile && (
                <V2MobileHeader
                  scopeTitle={scopedEditorTitle}
                  onExitScope={scopedEditorExitHandler}
                  exitScopeLabel={mobileScopedEditorExitLabel}
                  scopePreviewMode={
                    hasScopedEditor ? scopedPreviewMode : undefined
                  }
                  onChangeScopePreviewMode={
                    hasScopedEditor ? setScopedPreviewMode : undefined
                  }
                />
              )}

              <div className="absolute inset-0">
                <V2TimeTablePreview
                  timetableGridEditScope={timetableGridEditScope}
                  timetableComponentEditScope={timetableComponentEditScope}
                  sceneUnitEditScope={sceneUnitEditScope}
                  statefulSceneEditScope={statefulSceneEditScope}
                  scopePreviewMode={scopedPreviewMode}
                  selectedCanvasTarget={selectedCanvasTarget}
                  onMoveCanvasObject={moveCanvasObject}
                  onActivateCanvasTarget={(target) => {
                    if (target.highlightTarget) {
                      setActiveHighlightTarget(
                        target.highlightTarget as V2TemplateHighlightTarget
                      );
                    }
                  }}
                />
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
                    aria-label={isRightPanelOpen ? "우측 패널 닫기" : "우측 패널 열기"}
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
                      layerTree={activeScopedLayerTree}
                      componentCatalog={runtimeComponentCatalog}
                      componentLayerTreeByComponentId={
                        runtimeComponentLayerTreeByComponentId
                      }
                      extractableComponentInstanceLayerIdSet={
                        extractableComponentInstanceLayerIdSet
                      }
                      orderedIdsByParent={
                        timetableComponentEditScope
                          ? componentEditorOrderedIdsByParent
                          : orderedIdsByParent
                      }
                      canRelocateLayer={(layerId) =>
                        !isLayerLocked(layerId) &&
                        (timetableComponentEditScope
                          ? canRelocateTimetableComponentLayer(layerId)
                          : relocatableLayerIdSet.has(layerId))
                      }
                      onReorderLayers={({ parentId, orderedIds }) => {
                        if (timetableComponentEditScope) {
                          applyTimetableComponentLayerOrder({
                            parentId,
                            orderedIds,
                          });
                          return;
                        }
                        applyLayerZIndex({
                          parentId,
                          orderedIds,
                        });
                      }}
                      onRelocateLayers={(payload) => {
                        if (timetableComponentEditScope) {
                          applyTimetableComponentLayerRelocation(payload);
                          return;
                        }
                        applyLayerRelocation(payload);
                      }}
                      onCreateComponent={createComponentMaster}
                      onDuplicateComponent={duplicateComponentMaster}
                      onDeleteComponent={deleteComponentMaster}
                      onExtractComponentInstanceLayerCopy={
                        extractComponentInstanceLayerCopy
                      }
                      onMoveComponentInstanceLayerToRoot={
                        moveComponentInstanceLayerToRoot
                      }
                      onCreateSceneNodeFromLayerMenu={
                        timetableGridEditScope || timetableComponentEditScope
                          ? undefined
                          : createSceneNodeFromLayerMenu
                      }
                      scopeTitle={scopedEditorTitle}
                      scopeDescription={scopedLayerDescription}
                      onExitScope={scopedEditorExitHandler}
                      exitScopeLabel={mobileScopedEditorExitLabel}
                      onSelectLayer={({ layerId, editorMode, target }) => {
                        setSelectedCanvasTarget(
                          resolveCanvasTargetFromLayerSelection({
                            layerId,
                            target,
                          })
                        );
                        setIsRightPanelOpen(true);
                        setRightPanelMode("properties");
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
                    <div className="flex h-full min-h-0 flex-col bg-[#0f1724]">
                      <div className="border-b border-[#303848] bg-[#151a24] p-2">
                        <div className="grid grid-cols-2 gap-2 rounded-md border border-[#2f374b] bg-[#0f1420] p-1">
                          <button
                            type="button"
                            onClick={() => setRightPanelMode("properties")}
                            className={`rounded px-3 py-2 text-xs font-semibold transition ${
                              rightPanelMode === "properties"
                                ? "bg-[#22314a] text-[#d7e5ff]"
                                : "text-[#98a5bf] hover:bg-[#182131] hover:text-[#c8d6f2]"
                            }`}
                          >
                            속성
                          </button>
                          <button
                            type="button"
                            onClick={() => setRightPanelMode("runtime")}
                            className={`rounded px-3 py-2 text-xs font-semibold transition ${
                              rightPanelMode === "runtime"
                                ? "bg-[#22314a] text-[#d7e5ff]"
                                : "text-[#98a5bf] hover:bg-[#182131] hover:text-[#c8d6f2]"
                            }`}
                          >
                            Runtime 테스트
                          </button>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1">
                        {rightPanelMode === "properties" ? (
                          <V2TemplateBuilderForm
                            onRequestClose={() => setIsRightPanelOpen(false)}
                            focusLayerId={propertiesFocusRequest?.layerId ?? null}
                            focusLayerNonce={propertiesFocusRequest?.nonce ?? 0}
                            focusEditorMode={
                              propertiesFocusRequest?.editorMode ?? "instance"
                            }
                            timetableComponentEditScope={
                              timetableComponentEditScope
                            }
                            timetableGridEditScope={timetableGridEditScope}
                            sceneUnitEditScope={sceneUnitEditScope}
                            statefulSceneEditScope={statefulSceneEditScope}
                            onEnterTimetableGridEditScope={
                              openTimetableGridEditor
                            }
                            onExitTimetableGridEditScope={
                              closeTimetableGridEditor
                            }
                            onEnterSceneUnitEditScope={openSceneUnitEditor}
                            onExitSceneUnitEditScope={closeSceneUnitEditor}
                            onEnterTimetableComponentEditScope={
                              openTimetableComponentEditor
                            }
                            onChangeTimetableComponentEditScope={
                              updateTimetableComponentEditScope
                            }
                            onExitTimetableComponentEditScope={
                              closeTimetableComponentEditor
                            }
                            onEnterStatefulSceneEditScope={
                              openStatefulSceneEditor
                            }
                            onChangeStatefulSceneEditScope={
                              updateStatefulSceneEditScope
                            }
                            onExitStatefulSceneEditScope={
                              closeStatefulSceneEditor
                            }
                          />
                        ) : (
                          <V2RuntimeForm embedded />
                        )}
                      </div>
                    </div>
                  </aside>
                </>
              )}

              {state.isMobile && (
                <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55vh] min-h-[240px]">
                  <div className="flex h-full min-h-0 flex-col bg-[#0f1724]">
                    <div className="border-t border-[#303848] bg-[#151a24] p-2">
                      <div className="grid grid-cols-2 gap-2 rounded-md border border-[#2f374b] bg-[#0f1420] p-1">
                        <button
                          type="button"
                          onClick={() => setRightPanelMode("properties")}
                          className={`rounded px-3 py-2 text-xs font-semibold transition ${
                            rightPanelMode === "properties"
                              ? "bg-[#22314a] text-[#d7e5ff]"
                              : "text-[#98a5bf] hover:bg-[#182131] hover:text-[#c8d6f2]"
                          }`}
                        >
                          속성
                        </button>
                        <button
                          type="button"
                          onClick={() => setRightPanelMode("runtime")}
                          className={`rounded px-3 py-2 text-xs font-semibold transition ${
                            rightPanelMode === "runtime"
                              ? "bg-[#22314a] text-[#d7e5ff]"
                              : "text-[#98a5bf] hover:bg-[#182131] hover:text-[#c8d6f2]"
                          }`}
                        >
                          Runtime 테스트
                        </button>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1">
                      {rightPanelMode === "properties" ? (
                        <V2TemplateBuilderForm
                          timetableComponentEditScope={timetableComponentEditScope}
                          timetableGridEditScope={timetableGridEditScope}
                          sceneUnitEditScope={sceneUnitEditScope}
                          statefulSceneEditScope={statefulSceneEditScope}
                          onEnterTimetableGridEditScope={openTimetableGridEditor}
                          onExitTimetableGridEditScope={closeTimetableGridEditor}
                          onEnterSceneUnitEditScope={openSceneUnitEditor}
                          onExitSceneUnitEditScope={closeSceneUnitEditor}
                          onEnterTimetableComponentEditScope={
                            openTimetableComponentEditor
                          }
                          onChangeTimetableComponentEditScope={
                            updateTimetableComponentEditScope
                          }
                          onExitTimetableComponentEditScope={
                            closeTimetableComponentEditor
                          }
                          onEnterStatefulSceneEditScope={openStatefulSceneEditor}
                          onChangeStatefulSceneEditScope={
                            updateStatefulSceneEditScope
                          }
                          onExitStatefulSceneEditScope={closeStatefulSceneEditor}
                        />
                      ) : (
                        <V2RuntimeForm embedded />
                      )}
                    </div>
                  </div>
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
