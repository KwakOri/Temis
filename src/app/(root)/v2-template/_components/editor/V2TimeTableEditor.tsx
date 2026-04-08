import React, { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, SlidersHorizontal } from "lucide-react";

import { TimeTableDesignGuideProvider } from '@/contexts/TimeTableDesignGuideContext';
import { TimeTableProvider } from '@/contexts/TimeTableContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { V2TimeTableEditorRuntimeProvider } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { useV2TimeTableEditor } from '@/hooks/v2/useV2TimeTableEditor';
import { V2TemplateHighlightTarget } from '@/types/time-table/v2_template_editor_ui';
import {
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateStructureConfig,
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
type V2RootLayoutStyleKey = keyof Omit<V2LayoutShape, 'card' | 'scene'>;
type V2CardLayoutStyleKey = keyof V2LayoutShape['card'];
type V2SceneLayoutStyleKey = keyof V2LayoutShape['scene'];
type V2SectionStyleResolver =
  | {
      scope: 'root';
      key: V2RootLayoutStyleKey;
    }
  | {
      scope: 'card';
      key: V2CardLayoutStyleKey;
    }
  | {
      scope: 'scene';
      key: V2SceneLayoutStyleKey;
    };
type V2SectionStyleResolverMap = Record<string, V2SectionStyleResolver>;

const v2_ROOT_LAYOUT_STYLE_SECTION_MAP: Partial<
  Record<string, V2RootLayoutStyleKey>
> = {
  grid: 'grid',
  weekFlag: 'weekFlag',
  topObjectContainer: 'topObjectContainer',
  profileImage: 'profileImage',
  profileFrame: 'profileFrame',
  profileTextRootStyle: 'profileTextRootStyle',
  profileTextWrapperStyle: 'profileTextWrapperStyle',
  profileTextStyle: 'profileTextStyle',
  profileTextArtistImageStyle: 'profileTextArtistImageStyle',
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

const v2_collectSectionStyleResolverMap = (
  structure: V2TemplateStructureConfig
): V2SectionStyleResolverMap => {
  const map: V2SectionStyleResolverMap = {};
  const rootStyleKeySet = new Set<V2RootLayoutStyleKey>(
    Object.values(v2_ROOT_LAYOUT_STYLE_SECTION_MAP).filter(
      (styleKey): styleKey is V2RootLayoutStyleKey => Boolean(styleKey)
    )
  );

  Object.entries(v2_ROOT_LAYOUT_STYLE_SECTION_MAP).forEach(
    ([sectionKey, styleKey]) => {
      if (!styleKey) return;
      map[sectionKey] = {
        scope: 'root',
        key: styleKey,
      };
    }
  );

  const layerNodeMap = v2_collectLayerNodeMap(structure.layers);
  const cardStructure = structure.card;
  const cardStyleKeySet = new Set<string>([cardStructure.containerStyleKey]);
  Object.values(cardStructure.nodes).forEach((cardNode) => {
    cardStyleKeySet.add(cardNode.containerStyleKey);
    if (cardNode.textStyleKey) cardStyleKeySet.add(cardNode.textStyleKey);
    if (cardNode.wrapperStyleKey) cardStyleKeySet.add(cardNode.wrapperStyleKey);
    if (cardNode.optionsKey) cardStyleKeySet.add(cardNode.optionsKey);
  });

  const cardContainerLayer = layerNodeMap.get(cardStructure.containerLayerId);
  if (cardContainerLayer?.sectionKey) {
    map[cardContainerLayer.sectionKey] = {
      scope: 'card',
      key: cardStructure.containerStyleKey as V2CardLayoutStyleKey,
    };
  }

  Object.values(cardStructure.nodes).forEach((cardNode) => {
    const layerNode = layerNodeMap.get(cardNode.layerId);
    if (!layerNode?.sectionKey) return;
    map[layerNode.sectionKey] = {
      scope: 'card',
      key: cardNode.containerStyleKey as V2CardLayoutStyleKey,
    };
  });

  const visitSceneNode = (node: V2TemplateStructureConfig['sceneNodes'][number]) => {
    if (node.kind === 'group') {
      node.children.forEach(visitSceneNode);
      return;
    }

    if (!node.layerId) return;
    const layerNode = layerNodeMap.get(node.layerId);
    const sectionKey = layerNode?.sectionKey;
    if (!sectionKey) return;

    const styleKey =
      node.kind === 'asset'
        ? node.styleKey
        : node.kind === 'text' || node.kind === 'flexibleText'
          ? node.containerStyleKey
          : undefined;
    if (!styleKey) return;

    if (rootStyleKeySet.has(styleKey as V2RootLayoutStyleKey)) {
      map[sectionKey] = {
        scope: 'root',
        key: styleKey as V2RootLayoutStyleKey,
      };
      return;
    }

    if (cardStyleKeySet.has(styleKey)) {
      map[sectionKey] = {
        scope: 'card',
        key: styleKey as V2CardLayoutStyleKey,
      };
      return;
    }

    map[sectionKey] = {
      scope: 'scene',
      key: styleKey as V2SceneLayoutStyleKey,
    };
  };

  structure.sceneNodes.forEach(visitSceneNode);

  return map;
};

const v2_getStyleRecordBySectionKey = (
  layout: V2LayoutShape,
  sectionKey: string,
  resolverMap: V2SectionStyleResolverMap
): V2TemplateStyleRecord | undefined => {
  const resolver = resolverMap[sectionKey];
  if (!resolver) return undefined;

  if (resolver.scope === 'root') {
    return layout[resolver.key] as V2TemplateStyleRecord;
  }

  if (resolver.scope === 'scene') {
    return layout.scene[resolver.key] as V2TemplateStyleRecord;
  }

  return layout.card[resolver.key] as V2TemplateStyleRecord;
};

const v2_setStyleRecordBySectionKey = (
  layout: V2LayoutShape,
  sectionKey: string,
  style: V2TemplateStyleRecord,
  resolverMap: V2SectionStyleResolverMap
): V2LayoutShape => {
  const resolver = resolverMap[sectionKey];
  if (!resolver) return layout;

  if (resolver.scope === 'root') {
    return {
      ...layout,
      [resolver.key]: style,
    };
  }

  if (resolver.scope === 'scene') {
    return {
      ...layout,
      scene: {
        ...layout.scene,
        [resolver.key]: style,
      },
    };
  }

  return {
    ...layout,
    card: {
      ...layout.card,
      [resolver.key]: style,
    },
  };
};

const useV2TemplateEditorSettings = () => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();

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
  } = useV2TimeTableEditor({
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
  const sectionStyleResolverMap = useMemo(
    () => v2_collectSectionStyleResolverMap(renderConfig.structure),
    [renderConfig.structure]
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
      const style = v2_getStyleRecordBySectionKey(
        renderConfig.layout,
        sectionKey,
        sectionStyleResolverMap
      );
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
  }, [renderConfig, sectionStyleResolverMap]);

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
      const nextSectionStyleResolverMap = v2_collectSectionStyleResolverMap(
        prev.structure
      );
      let nextLayout = {
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
        const currentStyle = v2_getStyleRecordBySectionKey(
          nextLayout,
          sectionKey,
          nextSectionStyleResolverMap
        );
        nextLayout = v2_setStyleRecordBySectionKey(
          nextLayout,
          sectionKey,
          setStyleZIndex(currentStyle, zIndex),
          nextSectionStyleResolverMap
        );
      };

      const applyNodeZIndex = (node: V2TemplateLayerNode, zIndex: number) => {
        if (node.sectionKey) {
          setSectionZIndex(node.sectionKey, zIndex);
          return;
        }
        if (node.children?.length) {
          node.children.forEach((child) => applyNodeZIndex(child, zIndex));
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
        </V2TimeTableEditorRuntimeProvider>
      </TimeTableDesignGuideProvider>
    </TimeTableProvider>
  );
};

export default V2TimeTableEditor;
