import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TimeTableDesignGuideProvider } from '@/contexts/TimeTableDesignGuideContext';
import { TimeTableProvider } from '@/contexts/TimeTableContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { V2TimeTableEditorRuntimeProvider } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { useTimeTableEditor } from '@/hooks';
import { V2TemplateHighlightTarget } from '@/types/time-table/v2_template_editor_ui';
import {
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateStyleRecord,
} from '@/types/time-table/v2_template_render_config';
import { TTheme } from '@/types/time-table/theme';
import V2TemplateBuilderForm from '../builder/V2TemplateBuilderForm';
import V2Loading from '../shared/V2Loading';
import V2MobileHeader from './V2MobileHeader';
import V2TimeTableLayersPanel from './V2TimeTableLayersPanel';
import V2TimeTableControls from './V2TimeTableControls';
import V2TimeTablePreview from './V2TimeTablePreview';

const v2_ROOT_LAYER_PARENT_ID = '__root__' as const;
type V2LayoutShape = V2TemplateRenderConfig['layout'];

const v2_TARGET_TO_STYLE_SECTION_FALLBACK: Partial<
  Record<V2TemplateHighlightTarget, string>
> = {
  grid: 'grid',
  weekFlag: 'weekFlag',
  topObjectContainer: 'topObjectContainer',
  profileImage: 'profileImage',
  profileFrame: 'profileFrame',
  cardStreamingDay: 'cardStreamingDay',
  cardStreamingDate: 'cardStreamingDate',
  cardStreamingTime: 'cardStreamingTime',
  cardMainTitleContainer: 'cardMainTitleContainer',
  cardSubTitleContainer: 'cardSubTitleContainer',
  cardContainer: 'cardContainer',
};

const v2_collectLayerNodeMap = (
  nodes: V2TemplateLayerNode[],
  nodeMap: Map<string, V2TemplateLayerNode> = new Map()
): Map<string, V2TemplateLayerNode> => {
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    if (node.children?.length) {
      v2_collectLayerNodeMap(node.children, nodeMap);
    }
  });
  return nodeMap;
};

const v2_getStyleRecordBySectionKey = (
  layout: V2LayoutShape,
  sectionKey: string
): V2TemplateStyleRecord | undefined => {
  switch (sectionKey) {
    case 'grid':
      return layout.grid as V2TemplateStyleRecord;
    case 'weekFlag':
      return layout.weekFlag as V2TemplateStyleRecord;
    case 'topObjectContainer':
      return layout.topObjectContainer as V2TemplateStyleRecord;
    case 'profileImage':
      return layout.profileImage as V2TemplateStyleRecord;
    case 'profileFrame':
      return layout.profileFrame as V2TemplateStyleRecord;
    case 'cardStreamingDay':
      return layout.card.streamingDay as V2TemplateStyleRecord;
    case 'cardStreamingDate':
      return layout.card.streamingDate as V2TemplateStyleRecord;
    case 'cardStreamingTime':
      return layout.card.streamingTime as V2TemplateStyleRecord;
    case 'cardMainTitleContainer':
      return layout.card.mainTitleContainer as V2TemplateStyleRecord;
    case 'cardSubTitleContainer':
      return layout.card.subTitleContainer as V2TemplateStyleRecord;
    case 'cardContainer':
      return layout.card.container as V2TemplateStyleRecord;
    default:
      return undefined;
  }
};

const useV2TemplateEditorSettings = () => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();

  const cardInputConfig = renderConfig.cardInputConfig;
  const captureSize = renderConfig.templateSize;
  const defaultTheme = (renderConfig.defaultTheme || 'first') as TTheme;

  return {
    renderConfig,
    cardInputConfig,
    captureSize,
    defaultTheme,
    setRenderConfig,
  };
};

const V2TimeTableEditor: React.FC = () => {
  const { renderConfig, cardInputConfig, captureSize, defaultTheme, setRenderConfig } =
    useV2TemplateEditorSettings();

  const {
    state,
    actions,
    data,
    updateData,
    currentTheme,
    updateTheme,
    resetData,
    isInitialized,
  } = useTimeTableEditor({
    cardInputConfig,
    defaultTheme,
    captureSize,
  });
  const [hoverHighlightTarget, setHoverHighlightTarget] =
    useState<V2TemplateHighlightTarget | null>(null);
  const [activeHighlightTarget, setActiveHighlightTarget] =
    useState<V2TemplateHighlightTarget | null>(null);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [styleFocusRequest, setStyleFocusRequest] = useState<{
    section: string;
    nonce: number;
  } | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Record<string, boolean>>(
    {}
  );

  const parseZIndex = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };

  const orderedIdsByParent = useMemo(() => {
    const getSectionZIndex = (sectionKey?: string): number | undefined => {
      if (!sectionKey) return undefined;
      const style = v2_getStyleRecordBySectionKey(renderConfig.layout, sectionKey);
      return parseZIndex(style?.zIndex);
    };

    const zIndexCache = new Map<string, number>();
    const getNodeZIndex = (node: V2TemplateLayerNode): number => {
      const cached = zIndexCache.get(node.id);
      if (cached !== undefined) return cached;

      const own = getSectionZIndex(node.sectionKey);
      let value = own ?? Number.NEGATIVE_INFINITY;

      if (node.children?.length) {
        node.children.forEach((child) => {
          value = Math.max(value, getNodeZIndex(child));
        });
      }

      if (node.id === 'profile') {
        const profileTextZ = parseZIndex(renderConfig.layout.profileTextRootStyle?.zIndex);
        value = Math.max(value, profileTextZ ?? Number.NEGATIVE_INFINITY);
      }

      const normalizedValue = Number.isFinite(value) ? value : 0;
      zIndexCache.set(node.id, normalizedValue);
      return normalizedValue;
    };

    const sortNodes = (nodes: V2TemplateLayerNode[]): V2TemplateLayerNode[] => {
      return [...nodes].sort((a, b) => {
        const aZ = getNodeZIndex(a);
        const bZ = getNodeZIndex(b);
        if (aZ === bZ) {
          return nodes.indexOf(a) - nodes.indexOf(b);
        }
        return bZ - aZ;
      });
    };

    const orderedMap: Record<string, string[]> = {};
    const buildOrder = (nodes: V2TemplateLayerNode[], parentId: string) => {
      const sorted = sortNodes(nodes);
      orderedMap[parentId] = sorted.map((node) => node.id);
      sorted.forEach((node) => {
        if (!node.children?.length) return;
        buildOrder(node.children, node.id);
      });
    };

    buildOrder(renderConfig.structure.layers, v2_ROOT_LAYER_PARENT_ID);
    return orderedMap;
  }, [renderConfig]);

  const applyLayerZIndex = ({
    parentId,
    orderedIds,
  }: {
    parentId: string;
    orderedIds: string[];
  }) => {
    if (!setRenderConfig || orderedIds.length === 0) return;

    const zMap = new Map<string, number>();
    orderedIds.forEach((id, index) => {
      zMap.set(id, (orderedIds.length - index) * 10);
    });

    setRenderConfig((prev) => {
      const nextLayout = {
        ...prev.layout,
        card: {
          ...prev.layout.card,
        },
      };
      const layerNodeMap = v2_collectLayerNodeMap(prev.structure.layers);
      const parentNode =
        parentId === v2_ROOT_LAYER_PARENT_ID
          ? null
          : layerNodeMap.get(parentId) ?? null;
      const siblings =
        parentId === v2_ROOT_LAYER_PARENT_ID
          ? prev.structure.layers
          : (parentNode?.children ?? []);
      const siblingIdSet = new Set(siblings.map((sibling) => sibling.id));

      const setStyleZIndex = (
        style: V2TemplateStyleRecord | undefined,
        zIndex: number
      ): V2TemplateStyleRecord => {
        return {
          ...(style ?? {}),
          zIndex,
        };
      };

      const setSectionZIndex = (sectionKey: string, zIndex: number) => {
        switch (sectionKey) {
          case 'grid':
            nextLayout.grid = setStyleZIndex(
              nextLayout.grid as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'weekFlag':
            nextLayout.weekFlag = setStyleZIndex(
              nextLayout.weekFlag as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'topObjectContainer':
            nextLayout.topObjectContainer = setStyleZIndex(
              nextLayout.topObjectContainer as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'profileImage':
            nextLayout.profileImage = setStyleZIndex(
              nextLayout.profileImage as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'profileFrame':
            nextLayout.profileFrame = setStyleZIndex(
              nextLayout.profileFrame as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardStreamingDay':
            nextLayout.card.streamingDay = setStyleZIndex(
              nextLayout.card.streamingDay as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardStreamingDate':
            nextLayout.card.streamingDate = setStyleZIndex(
              nextLayout.card.streamingDate as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardStreamingTime':
            nextLayout.card.streamingTime = setStyleZIndex(
              nextLayout.card.streamingTime as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardMainTitleContainer':
            nextLayout.card.mainTitleContainer = setStyleZIndex(
              nextLayout.card.mainTitleContainer as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardSubTitleContainer':
            nextLayout.card.subTitleContainer = setStyleZIndex(
              nextLayout.card.subTitleContainer as V2TemplateStyleRecord,
              zIndex
            );
            return;
          case 'cardContainer':
            nextLayout.card.container = setStyleZIndex(
              nextLayout.card.container as V2TemplateStyleRecord,
              zIndex
            );
            return;
          default:
            return;
        }
      };

      const applyNodeZIndex = (node: V2TemplateLayerNode, zIndex: number) => {
        if (node.sectionKey) {
          setSectionZIndex(node.sectionKey, zIndex);
          return;
        }
        if (node.children?.length) {
          node.children.forEach((child) => applyNodeZIndex(child, zIndex));
        }
        if (node.id === 'profile') {
          nextLayout.profileTextRootStyle = setStyleZIndex(
            nextLayout.profileTextRootStyle as V2TemplateStyleRecord,
            zIndex
          );
        }
      };

      orderedIds.forEach((nodeId) => {
        if (!siblingIdSet.has(nodeId)) return;
        const zIndex = zMap.get(nodeId);
        if (zIndex === undefined) return;
        const node = layerNodeMap.get(nodeId);
        if (!node) return;
        applyNodeZIndex(node, zIndex);
      });

      return {
        ...prev,
        layout: nextLayout,
      };
    });
  };

  const timeTableState = useMemo(
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
      hiddenLayerIds,
      hoverHighlightTarget,
      isLayerHidden,
      resetData,
      setLayerHidden,
      toggleLayerHidden,
      updateData,
      updateTheme,
    ]
  );

  return (
    <TimeTableProvider value={timeTableState}>
      <TimeTableDesignGuideProvider>
        <V2TimeTableEditorRuntimeProvider value={runtimeValue}>
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
                      orderedIdsByParent={orderedIdsByParent}
                      onReorderLayers={({ parentId, orderedIds }) => {
                        applyLayerZIndex({
                          parentId,
                          orderedIds,
                        });
                      }}
                      onSelectLayer={({ target, sectionKey }) => {
                        setIsRightPanelOpen(true);
                        const section =
                          sectionKey ?? v2_TARGET_TO_STYLE_SECTION_FALLBACK[target];
                        if (!section) return;
                        setStyleFocusRequest({
                          section,
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
                      focusStyleSection={styleFocusRequest?.section ?? null}
                      focusStyleSectionNonce={styleFocusRequest?.nonce ?? 0}
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
        </V2TimeTableEditorRuntimeProvider>
      </TimeTableDesignGuideProvider>
    </TimeTableProvider>
  );
};

export default V2TimeTableEditor;
