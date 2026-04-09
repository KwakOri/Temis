import React, { useCallback, useMemo, useState } from 'react';
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
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from '@/utils/time-table/template-graph-runtime';
import V2TemplateBuilderForm from '../properties/template-properties-panel';
import V2Loading from '../shared/loading-screen';
import {
  applyReorderedLayerZIndex,
  buildOrderedLayerIdsByParent,
} from './model/layer-z-index';
import { collectStyleSectionResolverMapFromRuntime } from './model/style-section-resolver';
import V2MobileHeader from './mobile-toolbar';
import V2TimeTableLayersPanel from './layers-panel';
import V2TimeTableControls from './preview-toolbar';
import V2TimeTablePreview from './preview-canvas';

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
  const [propertiesFocusRequest, setPropertiesFocusRequest] = useState<{
    layerId: string;
    nonce: number;
  } | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Record<string, boolean>>(
    {}
  );
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const runtimeCardStructure = useMemo(
    () => v2_getRuntimeCardStructure(renderConfig),
    [renderConfig]
  );
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
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
    });
  }, [renderConfig.layout, runtimeLayerTree, runtimeStyleResolverMap]);

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
                      orderedIdsByParent={orderedIdsByParent}
                      onReorderLayers={({ parentId, orderedIds }) => {
                        applyLayerZIndex({
                          parentId,
                          orderedIds,
                        });
                      }}
                      onSelectLayer={({ layerId }) => {
                        setIsRightPanelOpen(true);
                        setPropertiesFocusRequest({
                          layerId,
                          nonce: Date.now(),
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
