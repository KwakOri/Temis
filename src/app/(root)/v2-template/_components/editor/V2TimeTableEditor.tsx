import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TimeTableDesignGuideProvider } from '@/contexts/TimeTableDesignGuideContext';
import { TimeTableProvider } from '@/contexts/TimeTableContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { V2TimeTableEditorRuntimeProvider } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { useTimeTableEditor } from '@/hooks';
import { V2TemplateHighlightTarget } from '@/types/time-table/v2_template_editor_ui';
import { V2TemplateStyleRecord } from '@/types/time-table/v2_template_render_config';
import { TTheme } from '@/types/time-table/theme';
import V2TemplateBuilderForm from '../builder/V2TemplateBuilderForm';
import V2Loading from '../shared/V2Loading';
import V2MobileHeader from './V2MobileHeader';
import V2TimeTableLayersPanel from './V2TimeTableLayersPanel';
import V2TimeTableControls from './V2TimeTableControls';
import V2TimeTablePreview from './V2TimeTablePreview';

const useV2TemplateEditorSettings = () => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();

  const cardInputConfig = renderConfig.cardInputConfig;
  const captureSize = renderConfig.templateSize;
  const defaultTheme = (renderConfig.defaultTheme || 'first') as TTheme;

  return {
    cardInputConfig,
    captureSize,
    defaultTheme,
    setRenderConfig,
  };
};

const V2TimeTableEditor: React.FC = () => {
  const { cardInputConfig, captureSize, defaultTheme, setRenderConfig } =
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
  const v2_ROOT_LAYER_PARENT_ID = '__root__';

  const v2_TARGET_TO_STYLE_SECTION: Partial<
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

      const setStyleZIndex = (
        style: V2TemplateStyleRecord | undefined,
        zIndex: number
      ): V2TemplateStyleRecord => {
        return {
          ...(style ?? {}),
          zIndex,
        };
      };

      const setCardChildZ = (nodeId: string, zIndex: number) => {
        switch (nodeId) {
          case 'streaming-day':
            nextLayout.card.streamingDay = setStyleZIndex(
              nextLayout.card.streamingDay as V2TemplateStyleRecord,
              zIndex
            );
            break;
          case 'streaming-date':
            nextLayout.card.streamingDate = setStyleZIndex(
              nextLayout.card.streamingDate as V2TemplateStyleRecord,
              zIndex
            );
            break;
          case 'streaming-time':
            nextLayout.card.streamingTime = setStyleZIndex(
              nextLayout.card.streamingTime as V2TemplateStyleRecord,
              zIndex
            );
            break;
          case 'main-title':
            nextLayout.card.mainTitleContainer = setStyleZIndex(
              nextLayout.card.mainTitleContainer as V2TemplateStyleRecord,
              zIndex
            );
            break;
          case 'sub-title':
            nextLayout.card.subTitleContainer = setStyleZIndex(
              nextLayout.card.subTitleContainer as V2TemplateStyleRecord,
              zIndex
            );
            break;
          default:
            break;
        }
      };

      if (parentId === v2_ROOT_LAYER_PARENT_ID) {
        orderedIds.forEach((nodeId) => {
          const zIndex = zMap.get(nodeId);
          if (zIndex === undefined) return;

          switch (nodeId) {
            case 'grid':
              nextLayout.grid = setStyleZIndex(
                nextLayout.grid as V2TemplateStyleRecord,
                zIndex
              );
              break;
            case 'week-flag':
              nextLayout.weekFlag = setStyleZIndex(
                nextLayout.weekFlag as V2TemplateStyleRecord,
                zIndex
              );
              break;
            case 'top-object':
              nextLayout.topObjectContainer = setStyleZIndex(
                nextLayout.topObjectContainer as V2TemplateStyleRecord,
                zIndex
              );
              break;
            case 'card':
              nextLayout.card.container = setStyleZIndex(
                nextLayout.card.container as V2TemplateStyleRecord,
                zIndex
              );
              break;
            case 'profile':
              nextLayout.profileImage = setStyleZIndex(
                nextLayout.profileImage as V2TemplateStyleRecord,
                zIndex
              );
              nextLayout.profileFrame = setStyleZIndex(
                nextLayout.profileFrame as V2TemplateStyleRecord,
                zIndex
              );
              nextLayout.profileTextRootStyle = setStyleZIndex(
                nextLayout.profileTextRootStyle as V2TemplateStyleRecord,
                zIndex
              );
              break;
            default:
              break;
          }
        });
      }

      if (parentId === 'profile') {
        orderedIds.forEach((nodeId) => {
          const zIndex = zMap.get(nodeId);
          if (zIndex === undefined) return;
          if (nodeId === 'profile-image') {
            nextLayout.profileImage = setStyleZIndex(
              nextLayout.profileImage as V2TemplateStyleRecord,
              zIndex
            );
            return;
          }
          if (nodeId === 'profile-frame') {
            nextLayout.profileFrame = setStyleZIndex(
              nextLayout.profileFrame as V2TemplateStyleRecord,
              zIndex
            );
          }
        });
      }

      if (parentId === 'card') {
        orderedIds.forEach((nodeId) => {
          const zIndex = zMap.get(nodeId);
          if (zIndex === undefined) return;
          setCardChildZ(nodeId, zIndex);
        });
      }

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

  const runtimeValue = useMemo(
    () => ({
      data,
      updateData,
      currentTheme,
      updateTheme,
      resetData,
      hoverHighlightTarget,
      setHoverHighlightTarget,
      activeHighlightTarget,
      setActiveHighlightTarget,
    }),
    [
      activeHighlightTarget,
      currentTheme,
      data,
      hoverHighlightTarget,
      resetData,
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
                      onReorderLayers={({ parentId, orderedIds }) => {
                        applyLayerZIndex({
                          parentId,
                          orderedIds,
                        });
                      }}
                      onSelectLayer={(target) => {
                        setIsRightPanelOpen(true);
                        const section = v2_TARGET_TO_STYLE_SECTION[target];
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
