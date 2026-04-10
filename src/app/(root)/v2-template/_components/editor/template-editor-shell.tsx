import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TemplateDesignGuideProvider } from '@/contexts/v2/template-design-guide-context';
import { useTemplateRenderConfigContext } from '@/contexts/v2/template-render-config-context';
import { TemplateEditorRuntimeProvider } from '@/contexts/v2/template-editor-runtime-context';
import { TemplateEditorUIProvider } from '@/contexts/v2/template-editor-ui-context';
import { useTemplateEditor } from '@/hooks/v2/useTemplateEditor';
import { V2TemplateHighlightTarget } from '@/types/time-table/template-editor-ui';
import { TTheme } from '@/types/time-table/theme';
import { v2_getRuntimeLayerTree } from '@/utils/time-table/template-graph-layers-runtime';
import {
  v2_getDefaultCardComponentId,
  v2_getRuntimeCardStructure,
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
import { v2_graphMoveNode } from '@/utils/time-table/template-graph-editor';
import {
  v2_runOrderKeyRegressionChecks,
  v2_validateOrderKeyGraph,
} from '@/utils/time-table/template-graph-order';
import { v2_normalizeTemplateRenderConfig } from '@/utils/time-table/template-render-config';
import {
  v2_collectSceneNodesByLayerId,
  v2_findSceneNodeContextById,
} from '../properties/model/structure-utils';

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
  const defaultCardComponentId = useMemo(
    () => v2_getDefaultCardComponentId(renderConfig),
    [renderConfig]
  );
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const runtimeComponentCatalog = useMemo(() => {
    const instanceStatsByComponentId: Record<
      string,
      { count: number; firstLayerId: string | null }
    > = {};
    const collectCardCollectionCounts = (nodes: typeof runtimeSceneNodes) => {
      nodes.forEach((node) => {
        if (node.kind === "cardCollection") {
          const componentId = node.componentId ?? defaultCardComponentId;
          const previous = instanceStatsByComponentId[componentId] ?? {
            count: 0,
            firstLayerId: null,
          };
          const instanceCount =
            Array.isArray(node.children) && node.children.length > 0
              ? node.children.length
              : 1;
          const firstInstanceLayerId =
            Array.isArray(node.children) && node.children.length > 0
              ? (node.children[0]?.layerId ?? null)
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
        rootLayerId: rootNode?.layerId ?? null,
        kind: definition.kind ?? "custom",
        instanceMode: definition.instanceMode ?? "component",
        instanceCount: instanceStatsByComponentId[definition.id]?.count ?? 0,
        firstInstanceLayerId:
          instanceStatsByComponentId[definition.id]?.firstLayerId ?? null,
      };
    });
  }, [
    defaultCardComponentId,
    renderConfig.graph.componentDefinitions,
    renderConfig.graph.nodes,
    runtimeSceneNodes,
  ]);
  const runtimeCardStructure = useMemo(
    () => v2_getRuntimeCardStructure(renderConfig),
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
        card: runtimeCardStructure,
        sceneNodes: runtimeSceneNodes,
      }),
    [runtimeCardStructure, runtimeLayerTree, runtimeSceneNodes]
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
      const prevRuntimeCard = v2_getRuntimeCardStructure(prev);
      const prevRuntimeSceneNodes = v2_getRuntimeSceneNodes(prev);
      const prevRuntimeResolverMap = collectStyleSectionResolverMapFromRuntime({
        layers: prevRuntimeLayerTree,
        card: prevRuntimeCard,
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

      const targetLayerParentId =
        targetParentId === ROOT_LAYER_PARENT_ID ? null : targetParentId;
      const targetSceneParentId =
        targetLayerParentId === null
          ? null
          : (() => {
              const parentSceneNode = sceneNodeByLayerId.get(targetLayerParentId);
              if (
                !parentSceneNode ||
                (parentSceneNode.kind !== "group" &&
                  parentSceneNode.kind !== "cardCollection")
              ) {
                return undefined;
              }
              return parentSceneNode.id;
            })();

      if (targetLayerParentId !== null && targetSceneParentId === undefined) {
        return prev;
      }

      const sourceSceneContext = v2_findSceneNodeContextById({
        nodes: runtimeSceneNodes,
        nodeId: sourceSceneNode.id,
      });
      if (!sourceSceneContext) return prev;

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
      return {
        ...prev,
        graph: nextGraph,
      };
    });
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
