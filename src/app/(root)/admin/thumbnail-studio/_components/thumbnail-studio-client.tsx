"use client";

import {
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Monitor,
  Plus,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "zustand";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { StudioCanvasViewport } from "@/components/studio/canvas/studio-canvas-viewport";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { StudioEditorShell } from "@/components/studio/editor-shell/studio-editor-shell";
import {
  StudioLeftSidebar,
  type StudioPanelTab,
} from "@/components/studio/editor-shell/studio-left-sidebar";
import {
  StudioPropertiesPanel,
  type StudioPropertyItem,
} from "@/components/studio/editor-shell/studio-properties-panel";
import { StudioTopToolbar } from "@/components/studio/editor-shell/studio-top-toolbar";
import { StudioLayerPanel } from "@/components/studio/layers/studio-layer-panel";
import { StudioLayerPanelFrame } from "@/components/studio/layers/studio-layer-primitives";
import { StudioSettingsDialog } from "@/components/studio/settings/studio-settings-dialog";
import {
  StudioGuideLayerSettings,
  StudioSettingsNumberField,
} from "@/components/studio/settings/studio-settings-fields";
import { useStudioDocumentHistory } from "@/hooks/studio/use-studio-document-history";
import { useStudioSelection } from "@/hooks/studio/use-studio-selection";
import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
  createStudioViewSetter,
  type StudioEditorSnapshot,
  type StudioEditorStore,
  StudioEditorStoreProvider,
} from "@/stores/studio/studio-editor-store";
import type {
  StudioGraphNodeType,
  StudioTemplateDocument,
  StudioWebFontSource,
} from "@/types/template-studio";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { createInitialStudioRuntimeValues } from "@/utils/template-studio/sample-document";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioLayerPanelOrder } from "@/utils/template-studio/layer-order";
import { getStudioWebFontSources } from "@/utils/template-studio/web-fonts";
import {
  createThumbnailStudioDocument,
  THUMBNAIL_CANVAS_PRESETS,
} from "@/utils/thumbnail-studio/document-factory";

type ThumbnailPanelMode = "layers" | "presets" | "inputs";
type ThumbnailTheme = "dark" | "light";

/**
 * Thumbnail Studio의 뷰 설정.
 *
 * 되돌리기가 되살리지 않는 값만 담는다. 탭 이름이 시간표와 다르므로 공용 store
 * 타입에 박아 넣지 않고 이 편집기가 정한다.
 */
interface ThumbnailStudioView {
  panelMode: ThumbnailPanelMode;
  theme: ThumbnailTheme;
  scale: number;
  collapsedNodeIds: string[];
}

const THUMBNAIL_PANEL_TABS: StudioPanelTab[] = [
  { id: "layers", label: "Layers", icon: <Layers3 size={14} /> },
  { id: "presets", label: "Presets", icon: <Plus size={14} /> },
  { id: "inputs", label: "Inputs", icon: <ListChecks size={14} /> },
];

const THUMBNAIL_NODE_TYPES: StudioGraphNodeType[] = [
  "group",
  "text",
  "flexibleText",
  "image",
];

const DARK_THEME_STYLE = {
  "--bg": "#0b1020",
  "--panel": "#111827",
  "--border": "#1f2937",
  "--field": "#0f172a",
  "--field-border": "#243244",
  "--field-bg": "#0b1220",
  "--hover": "#172033",
  "--sel": "#1d2b45",
  "--accent": "#4f8cff",
  "--canvas": "#070b16",
  "--fg": "#e5eefc",
  "--fg2": "#9fb2d1",
  "--fg3": "#6b7f9e",
} as React.CSSProperties;

const LIGHT_THEME_STYLE = {
  "--bg": "#f4f6fb",
  "--panel": "#ffffff",
  "--border": "#e2e8f0",
  "--field": "#f7f9fc",
  "--field-border": "#dbe3ee",
  "--field-bg": "#ffffff",
  "--hover": "#eef2f8",
  "--sel": "#e4edff",
  "--accent": "#2f6fed",
  "--canvas": "#e9edf4",
  "--fg": "#101828",
  "--fg2": "#475467",
  "--fg3": "#8092ac",
} as React.CSSProperties;

/**
 * Thumbnail Studio 최소 골격.
 *
 * Phase 1에서는 공통 셸이 시간표 없이도 동작하는지 확인하는 것이 목적이다.
 * 빈 문서로 시작하고 저장은 하지 않는다. `Cards / Timetable` 전환, Component
 * Set, 상태 선택과 `Table` 탭을 공통 컴포넌트에 넘기지 않는다.
 */
export function ThumbnailStudioClient() {
  const router = useRouter();
  const studioStoreRef = useRef<StudioEditorStore<ThumbnailStudioView> | null>(
    null,
  );
  if (!studioStoreRef.current) {
    const initialDocument = createThumbnailStudioDocument();
    studioStoreRef.current = createStudioEditorStore<ThumbnailStudioView>({
      document: initialDocument,
      runtimeValues: createInitialStudioRuntimeValues(initialDocument),
      view: {
        panelMode: "layers",
        theme: "dark",
        scale: 0.8,
        collapsedNodeIds: [],
      },
    });
  }
  const studioStore = studioStoreRef.current;
  const document = useStore(studioStore, (state) => state.document);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const { panelMode, theme, scale, collapsedNodeIds } = useStore(
    studioStore,
    (state) => state.view,
  );
  const { setPanelMode, setTheme, setScale, setCollapsedNodeIds } = useMemo(
    () => ({
      setPanelMode: createStudioViewSetter(studioStore, "panelMode"),
      setTheme: createStudioViewSetter(studioStore, "theme"),
      setScale: createStudioViewSetter(studioStore, "scale"),
      setCollapsedNodeIds: createStudioViewSetter(
        studioStore,
        "collapsedNodeIds",
      ),
    }),
    [studioStore],
  );

  const collapsedNodeIdsSet = useMemo(
    () => new Set(collapsedNodeIds),
    [collapsedNodeIds],
  );

  const visibleNodeIds = useMemo(() => {
    const orderedNodeIds: string[] = [];
    const walk = (nodeIds: string[]) => {
      getStudioLayerPanelOrder(nodeIds).forEach((nodeId) => {
        const node = document.graph.nodes[nodeId];
        if (!node) return;
        orderedNodeIds.push(nodeId);
        if (collapsedNodeIdsSet.has(nodeId)) return;
        walk(node.childIds);
      });
    };
    walk(document.graph.rootNodeIds);
    return orderedNodeIds;
  }, [collapsedNodeIdsSet, document.graph.nodes, document.graph.rootNodeIds]);
  const visibleNodeIdsRef = useRef<string[]>([]);
  visibleNodeIdsRef.current = visibleNodeIds;

  const {
    selectedNodeId,
    selectedNodeIds,
    applySelection,
    selectSingleNode,
    toggleNodeSelection,
    selectNodeRange,
  } = useStudioSelection({
    getVisibleNodeIds: useCallback(() => visibleNodeIdsRef.current, []),
    store: studioStore,
  });

  const selectedNodeIdsSet = useMemo(
    () => new Set(selectedNodeIds),
    [selectedNodeIds],
  );
  // 썸네일에는 아직 사용자 입력이 없다. 렌더러 계약을 맞추기 위한 빈 값이다.
  const runtimeValues = useStore(studioStore, (state) => state.runtimeValues);
  const selectedNode = selectedNodeId
    ? (document.graph.nodes[selectedNodeId] ?? null)
    : null;

  const {
    capture: captureHistory,
    undo,
    redo,
  } = useStudioDocumentHistory({
    createSnapshot: useCallback(
      (): StudioEditorSnapshot =>
        captureStudioEditorSnapshot(studioStore.getState()),
      [studioStore],
    ),
    restoreSnapshot: useCallback(
      (snapshot: StudioEditorSnapshot) => {
        studioStore.getState().restoreSnapshot(snapshot);
      },
      [studioStore],
    ),
  });

  const updateDocument = useCallback(
    (mutate: (draft: StudioTemplateDocument) => void) => {
      captureHistory();

      const next = JSON.parse(
        JSON.stringify(studioStore.getState().document),
      ) as StudioTemplateDocument;
      mutate(next);
      studioStore.getState().setDocument(next);
    },
    [captureHistory, studioStore],
  );

  const addNode = useCallback(
    (type: StudioGraphNodeType) => {
      const nodeId = createStudioId("node");
      updateDocument((draft) => {
        draft.graph.nodes[nodeId] = {
          id: nodeId,
          type,
          label: `New ${getStudioGraphNodeTypeLabel(type)}`,
          parentId: null,
          childIds: [],
          ...(type === "text" || type === "flexibleText"
            ? { binding: { kind: "staticText" as const, value: "Text" } }
            : {}),
        };
        draft.graph.rootNodeIds.push(nodeId);
        draft.styles[nodeId] = {
          left: 80,
          top: 80,
          width: type === "group" ? 320 : 240,
          height: type === "group" ? 200 : 80,
          ...(type === "text" || type === "flexibleText"
            ? { fontSize: 32, fontWeight: 700, color: "#111827" }
            : {}),
        };
        draft.graph.nodes[nodeId].styleId = nodeId;
      });
      selectSingleNode(nodeId);
    },
    [selectSingleNode, updateDocument],
  );

  const moveNode = useCallback(
    (nodeId: string, delta: { deltaX: number; deltaY: number }) => {
      updateDocument((draft) => {
        const styleId = draft.graph.nodes[nodeId]?.styleId;
        if (!styleId) return;
        const style = draft.styles[styleId];
        if (!style) return;
        style.left = Number(style.left ?? 0) + delta.deltaX;
        style.top = Number(style.top ?? 0) + delta.deltaY;
      });
    },
    [updateDocument],
  );

  // 지워진 노드가 선택에 남지 않도록 문서가 바뀔 때 한 번 정리한다.
  useEffect(() => {
    const hasMissingNode = selectedNodeIds.some(
      (nodeId) => !document.graph.nodes[nodeId],
    );
    if (hasMissingNode) applySelection(selectedNodeIds);
  }, [applySelection, document.graph.nodes, selectedNodeIds]);

  const propertySections: StudioPropertyItem[] = selectedNode
    ? [
        {
          id: `position:Position`,
          title: "Position",
          open: true,
          onToggle: () => {},
          content: (
            <div className="grid grid-cols-2 gap-2">
              <StudioSettingsNumberField
                label="X"
                value={Number(
                  document.styles[selectedNode.styleId ?? ""]?.left ?? 0,
                )}
                onChange={(left) =>
                  updateDocument((draft) => {
                    const style = draft.styles[selectedNode.styleId ?? ""];
                    if (style) style.left = left;
                  })
                }
              />
              <StudioSettingsNumberField
                label="Y"
                value={Number(
                  document.styles[selectedNode.styleId ?? ""]?.top ?? 0,
                )}
                onChange={(top) =>
                  updateDocument((draft) => {
                    const style = draft.styles[selectedNode.styleId ?? ""];
                    if (style) style.top = top;
                  })
                }
              />
            </div>
          ),
        },
      ]
    : [
        {
          kind: "block",
          id: "thumbnail:emptySelection",
          content: (
            <p className="p-4 text-sm font-medium text-[var(--fg2)]">
              Select an object from the canvas or layer tree.
            </p>
          ),
        },
      ];

  return (
    <StudioEditorStoreProvider value={studioStore}>
      <>
        <StudioEditorShell
          canvas={
            <section className="relative min-w-0 flex-1 overflow-hidden bg-[var(--canvas)]">
              <StudioCanvasViewport
                canvasHeight={document.canvas.height}
                canvasWidth={document.canvas.width}
                fitRequestKey={fitRequestKey}
                scale={scale}
                onMoveNode={moveNode}
                onScaleChange={setScale}
                onSelectNode={selectSingleNode}
              >
                <StudioRenderer
                  document={document}
                  runtimeValues={runtimeValues}
                  selectedNodeId={selectedNodeId}
                  selectedNodeIds={selectedNodeIds}
                  onSelectNode={(nodeId) => selectSingleNode(nodeId)}
                />
              </StudioCanvasViewport>
            </section>
          }
          leftSidebar={
            <StudioLeftSidebar
              activeTabId={panelMode}
              content={
                panelMode === "layers" ? (
                  <StudioLayerPanel
                    collapsedNodeIds={collapsedNodeIdsSet}
                    graph={document.graph}
                    rootNodeIds={document.graph.rootNodeIds}
                    selectedNodeIds={selectedNodeIdsSet}
                    summary={`${document.graph.rootNodeIds.length} placed objects`}
                    title="Thumbnail Layers"
                    onDragEnd={() => {}}
                    onDragOver={() => {}}
                    onDragStart={() => {}}
                    onDrop={() => {}}
                    onIndicatorDragOver={() => {}}
                    onSelect={(nodeId, event) => {
                      if (event.shiftKey) {
                        selectNodeRange(nodeId, event.metaKey || event.ctrlKey);
                      } else if (event.metaKey || event.ctrlKey) {
                        toggleNodeSelection(nodeId);
                      } else {
                        selectSingleNode(nodeId);
                      }
                    }}
                    onToggleCollapsed={(nodeId) =>
                      setCollapsedNodeIds((current) =>
                        current.includes(nodeId)
                          ? current.filter((id) => id !== nodeId)
                          : [...current, nodeId],
                      )
                    }
                  />
                ) : panelMode === "presets" ? (
                  <StudioLayerPanelFrame
                    summary="Add objects to the thumbnail"
                    title="Thumbnail Presets"
                  >
                    <div className="grid grid-cols-4 gap-1.5">
                      {THUMBNAIL_NODE_TYPES.map((type) => (
                        <button
                          className="flex h-10 items-center justify-center rounded-[9px] border border-[var(--field-border)] bg-[var(--field)] text-xs font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                          key={type}
                          title={`Add ${getStudioGraphNodeTypeLabel(type)}`}
                          type="button"
                          onClick={() => addNode(type)}
                        >
                          {type === "image" ? (
                            <ImageIcon size={17} />
                          ) : type === "group" ? (
                            <Layers3 size={17} />
                          ) : type === "flexibleText" ? (
                            <span>
                              T<span className="align-super text-[8px]">a</span>
                            </span>
                          ) : (
                            <Type size={17} />
                          )}
                        </button>
                      ))}
                    </div>
                  </StudioLayerPanelFrame>
                ) : (
                  <StudioLayerPanelFrame
                    summary="0 inputs"
                    title="Thumbnail Inputs"
                  >
                    <p className="px-2 text-[11px] font-medium text-[var(--fg3)]">
                      Inputs arrive with the thumbnail runtime.
                    </p>
                  </StudioLayerPanelFrame>
                )
              }
              tabs={THUMBNAIL_PANEL_TABS}
              onTabChange={(tabId) => setPanelMode(tabId as ThumbnailPanelMode)}
            />
          }
          overlays={
            <StudioSettingsDialog
              common={{
                theme,
                onThemeChange: setTheme,
                webFonts: {
                  sources: getStudioWebFontSources(document),
                  onChange: (sources: StudioWebFontSource[]) =>
                    updateDocument((draft) => {
                      draft.resources = {
                        ...draft.resources,
                        webFonts: sources,
                      };
                    }),
                },
                data: {
                  isReloadDisabled: true,
                  onReloadTemplate: () => {},
                  onExportJson: () => {},
                  onImportJson: () => {},
                },
                documentInfo: {
                  databaseTargetLabel: "not connected",
                  schemaLabel: `${document.schema} v${document.version}`,
                  objectCount: Object.keys(document.graph.nodes).length,
                  inputCount: Object.keys(document.inputs).length,
                },
              }}
              description="Thumbnail document settings"
              domainSections={[
                {
                  id: "canvas",
                  label: "Canvas",
                  description: "Size & background",
                  navIcon: Monitor,
                  content: (
                    <>
                      <div className="flex items-center gap-2">
                        <Monitor size={14} className="text-[var(--accent)]" />
                        <h3 className="text-xs font-bold text-[var(--fg)]">
                          Canvas
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <StudioSettingsNumberField
                          label="Width"
                          value={document.canvas.width}
                          onChange={(width) =>
                            updateDocument((draft) => {
                              draft.canvas.width = width;
                            })
                          }
                        />
                        <StudioSettingsNumberField
                          label="Height"
                          value={document.canvas.height}
                          onChange={(height) =>
                            updateDocument((draft) => {
                              draft.canvas.height = height;
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {THUMBNAIL_CANVAS_PRESETS.map((preset) => (
                          <button
                            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              updateDocument((draft) => {
                                draft.canvas.width = preset.width;
                                draft.canvas.height = preset.height;
                              })
                            }
                          >
                            {preset.label} · {preset.width} × {preset.height}
                          </button>
                        ))}
                      </div>
                      <StudioGuideLayerSettings
                        assetLabel={null}
                        description="Editor-only overlay for thumbnail alignment."
                        removeAriaLabel="Remove thumbnail guide"
                        onRemove={() => {}}
                        onUpload={() => {}}
                      />
                    </>
                  ),
                },
              ]}
              open={settingsOpen}
              title="Settings"
              onClose={() => setSettingsOpen(false)}
            />
          }
          propertiesPanel={
            <StudioPropertiesPanel
              header={{
                icon:
                  selectedNode?.type === "image" ? (
                    <ImageIcon size={12} />
                  ) : selectedNode?.type === "group" ? (
                    <Layers3 size={12} />
                  ) : (
                    "T"
                  ),
                title: selectedNode
                  ? getStudioGraphNodeTypeLabel(selectedNode.type)
                  : "Thumbnail",
                summary: `${selectedNodeIds.length} selected`,
                renameDisabled: !selectedNode,
                renameValue: selectedNode?.label ?? "No selection",
                onRenameChange: (label) => {
                  if (!selectedNode) return;
                  updateDocument((draft) => {
                    const node = draft.graph.nodes[selectedNode.id];
                    if (node) node.label = label;
                  });
                },
              }}
              sections={propertySections}
            />
          }
          themeStyle={theme === "dark" ? DARK_THEME_STYLE : LIGHT_THEME_STYLE}
          topToolbar={
            <StudioTopToolbar
              backAction={{
                title: "관리자 홈으로",
                onClick: () => router.push("/admin"),
              }}
              canvasSize={{
                width: document.canvas.width,
                height: document.canvas.height,
                title: "Open canvas settings",
                onClick: () => setSettingsOpen(true),
              }}
              previewAction={{
                disabled: true,
                title: "Thumbnail preview arrives with the runtime",
                onClick: () => {},
              }}
              publishAction={{
                disabled: true,
                title: "Thumbnail publishing arrives with persistence",
                onClick: () => {},
              }}
              saveAction={{
                disabled: true,
                title: "Thumbnail saving arrives with persistence",
                onClick: () => {},
              }}
              centerSlot={
                <div className="flex h-[30px] shrink-0 items-center gap-1">
                  <button
                    className="h-[26px] rounded-md px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                    title="Undo"
                    type="button"
                    onClick={() => undo()}
                  >
                    Undo
                  </button>
                  <button
                    className="h-[26px] rounded-md px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                    title="Redo"
                    type="button"
                    onClick={() => redo()}
                  >
                    Redo
                  </button>
                </div>
              }
              settingsAction={{
                title: "Thumbnail settings",
                onClick: () => setSettingsOpen(true),
              }}
              zoom={{
                scale,
                onZoomIn: () =>
                  setScale((current) => Math.min(current + 0.1, 4)),
                onZoomOut: () =>
                  setScale((current) => Math.max(current - 0.1, 0.1)),
                onFit: () => setFitRequestKey((current) => current + 1),
              }}
            />
          }
        />
      </>
    </StudioEditorStoreProvider>
  );
}
