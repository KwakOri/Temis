"use client";

import {
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Monitor,
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

import {
  StudioCanvasViewport,
  type StudioCanvasViewportHandle,
} from "@/components/studio/canvas/studio-canvas-viewport";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { StudioSelectionOverlay } from "@/components/studio/canvas/studio-selection-overlay";
import { StudioEditorShell } from "@/components/studio/editor-shell/studio-editor-shell";
import {
  StudioLeftSidebar,
  type StudioPanelTab,
} from "@/components/studio/editor-shell/studio-left-sidebar";
import { StudioPropertiesPanel } from "@/components/studio/editor-shell/studio-properties-panel";
import { StudioTopToolbar } from "@/components/studio/editor-shell/studio-top-toolbar";
import { StudioLayerPanel } from "@/components/studio/layers/studio-layer-panel";
import { StudioNodeTypeIcon } from "@/components/studio/node-type-icon";
import { StudioSettingsDialog } from "@/components/studio/settings/studio-settings-dialog";
import {
  StudioGuideLayerSettings,
  StudioSettingsNumberField,
} from "@/components/studio/settings/studio-settings-fields";
import { useStudioClipboard } from "@/hooks/studio/use-studio-clipboard";
import { useStudioDocumentHistory } from "@/hooks/studio/use-studio-document-history";
import { useStudioKeyboardShortcuts } from "@/hooks/studio/use-studio-keyboard-shortcuts";
import { useStudioLayerDrag } from "@/hooks/studio/use-studio-layer-drag";
import { useStudioSelection } from "@/hooks/studio/use-studio-selection";
import { useStudioTemplatePersistence } from "@/hooks/studio/use-studio-template-persistence";
import {
  useCreateTemplateStudioTemplate,
  usePublishTemplateStudioDocument,
  useSaveTemplateStudioDraft,
  useSyncTemplateStudioAssets,
  useTemplateStudioTemplate,
} from "@/hooks/query/useTemplateStudio";
import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
  createStudioViewSetter,
  type StudioEditorSnapshot,
  type StudioEditorStore,
  StudioEditorStoreProvider,
} from "@/stores/studio/studio-editor-store";
import type {
  StudioGraphNode,
  StudioInputDefinition,
  StudioInputType,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioWebFontSource,
} from "@/types/template-studio";
import { getStudioParentCanvasOffset } from "@/utils/template-studio/graph-editor";
import {
  getStudioNodeVisualBoundsInCanvas,
  getStudioGroupOverflowDiagnostics,
  getStudioTopLevelNodeIds,
} from "@/utils/template-studio/graph-nodes";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioLayerPanelOrder } from "@/utils/template-studio/layer-order";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import { getStudioTextEffectOutset } from "@/utils/template-studio/text-effect-outset";
import {
  getStudioNodeIdsClippedByCanvas,
  getStudioNodeIdsOutsideCanvas,
  type StudioResizeGeometry,
} from "@/utils/template-studio/transform-commands";
import {
  getStudioCustomFontFamilies,
  getStudioWebFontSources,
} from "@/utils/template-studio/web-fonts";
import {
  StudioImageCropModal,
  type StudioImageCropOutputSize,
} from "@/app/(root)/template-studio/_components/studio-image-crop-modal";
import { applyThumbnailStudioDeleteInputWithMaterialize } from "@/utils/thumbnail-studio/binding-commands";
import {
  createThumbnailStudioDocument,
  THUMBNAIL_CANVAS_PRESETS,
} from "@/utils/thumbnail-studio/document-factory";
import {
  STUDIO_TEXT_EFFECT_PRESETS,
  type StudioTextEffectPreset,
} from "@/utils/thumbnail-studio/text-effect-presets";
import {
  applyStudioAddSelectOption,
  applyStudioRemoveSelectOption,
  applyStudioSelectOptionValue,
} from "@/utils/template-studio/input-commands";
import {
  applyThumbnailStudioAddInput,
  applyThumbnailStudioDuplicateInput,
  applyThumbnailStudioMoveInput,
  applyThumbnailStudioRenameInputGroup,
  applyThumbnailStudioSetInputGroup,
  applyThumbnailStudioUpdateInput,
} from "@/utils/thumbnail-studio/input-commands";
import { collectThumbnailStudioInputConsumers } from "@/utils/thumbnail-studio/input-consumers";
import {
  applyThumbnailStudioAddAssets,
  applyThumbnailStudioAddImageNodeForAsset,
  applyThumbnailStudioCropImageAsset,
  applyThumbnailStudioDeleteUnusedAsset,
  applyThumbnailStudioRemoveUnusedAssets,
  applyThumbnailStudioRenameAsset,
  applyThumbnailStudioReplaceImageAsset,
} from "@/utils/thumbnail-studio/asset-commands";
import { collectThumbnailStudioAssetConsumers } from "@/utils/thumbnail-studio/asset-consumers";
import { importThumbnailStudioAssetFiles } from "@/utils/thumbnail-studio/asset-policy";
import {
  collectThumbnailStudioFontConsumers,
  getThumbnailStudioFontChangeImpacts,
  getThumbnailStudioFontUsageBySource,
} from "@/utils/thumbnail-studio/font-consumers";
import { planStudioNodeInsertion } from "@/utils/thumbnail-studio/node-defaults";
import {
  createThumbnailStudioPreviewValues,
  setThumbnailStudioPreviewInputValue,
  syncThumbnailStudioPreviewValues,
  type ThumbnailPreviewMode,
} from "@/utils/thumbnail-studio/input-preview";

import { buildThumbnailInspectorSections } from "./thumbnail-inspector";
import {
  ThumbnailAddMenu,
  ThumbnailAssetPanel,
  ThumbnailInputPanel,
  ThumbnailLayerCommandBar,
  ThumbnailTextPresetPanel,
} from "./thumbnail-layer-tabs";
import {
  useThumbnailNodeCommands,
  type ThumbnailUpdateOptions,
} from "../_hooks/use-thumbnail-node-commands";

type ThumbnailPanelMode = "layers" | "assets" | "textPresets" | "inputs";
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
  /** 열어둔 속성 섹션. 접힘은 되돌리기 대상이 아니다. */
  openSections: Record<string, boolean>;
  aspectRatioLocked: boolean;
  /** 문서 history와 분리된 현재 편집기 세션 preset. */
  customTextPresets: StudioTextEffectPreset[];
  /** document/history와 분리된 Thumbnail global input preview. */
  previewMode: ThumbnailPreviewMode;
  previewValues: StudioRuntimeValues;
  /** 사용자가 default와 다르게 편집한 global input만 추적한다. */
  previewEditedInputIds: string[];
}

interface PendingThumbnailImageCrop {
  nodeId: string;
  sourceAssetId: string;
  imageSrc: string;
  initialWidth: number;
  initialHeight: number;
}

const THUMBNAIL_PANEL_TABS: StudioPanelTab[] = [
  { id: "layers", label: "Layers", icon: <Layers3 size={14} /> },
  { id: "assets", label: "Assets", icon: <ImageIcon size={14} /> },
  { id: "textPresets", label: "Text", icon: <Type size={14} /> },
  { id: "inputs", label: "Inputs", icon: <ListChecks size={14} /> },
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

const cloneDocument = (document: StudioTemplateDocument) =>
  JSON.parse(JSON.stringify(document)) as StudioTemplateDocument;

export interface ThumbnailStudioClientProps {
  /**
   * 편집 중인 템플릿 id.
   *
   * id가 있으면 저장된 draft/게시 문서를 불러오고, 없으면 첫 저장 때 Template Studio
   * parent row를 만든다.
   */
  templateId?: string;
}

/**
 * Thumbnail Studio 편집기.
 *
 * 공통 셸과 공통 명령을 쓰는 어댑터다. 시간표 도메인은 만들지도, 읽지도 않는다.
 * `Cards / Timetable` 전환, Component Set, 상태 선택과 `Table` 탭을 공통 컴포넌트에
 * 넘기지 않는다.
 */
export function ThumbnailStudioClient({
  templateId,
}: ThumbnailStudioClientProps = {}) {
  const router = useRouter();
  const [remoteTemplateId, setRemoteTemplateId] = useState<string | null>(
    templateId ?? null,
  );
  const studioStoreRef = useRef<StudioEditorStore<ThumbnailStudioView> | null>(
    null,
  );
  if (!studioStoreRef.current) {
    const initialDocument = createThumbnailStudioDocument();
    const initialPreviewValues =
      createThumbnailStudioPreviewValues(initialDocument);
    studioStoreRef.current = createStudioEditorStore<ThumbnailStudioView>({
      document: initialDocument,
      runtimeValues: initialPreviewValues,
      view: {
        panelMode: "layers",
        theme: "dark",
        scale: 0.8,
        collapsedNodeIds: [],
        openSections: {},
        aspectRatioLocked: false,
        customTextPresets: [],
        previewMode: "defaults",
        previewValues: initialPreviewValues,
        previewEditedInputIds: [],
      },
    });
  }
  const studioStore = studioStoreRef.current;
  const templateStudioTemplateQuery = useTemplateStudioTemplate(
    remoteTemplateId ?? undefined,
  );
  const createTemplateStudioTemplateMutation =
    useCreateTemplateStudioTemplate();
  const saveTemplateStudioDraftMutation = useSaveTemplateStudioDraft();
  const publishTemplateStudioDocumentMutation =
    usePublishTemplateStudioDocument();
  const syncTemplateStudioAssetsMutation = useSyncTemplateStudioAssets();
  const document = useStore(studioStore, (state) => state.document);
  const selectedInputId = useStore(
    studioStore,
    (state) => state.selectedInputId,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Local draft");
  const [pendingImageCrop, setPendingImageCrop] =
    useState<PendingThumbnailImageCrop | null>(null);
  const viewportHandleRef = useRef<StudioCanvasViewportHandle | null>(null);
  useEffect(() => {
    setRemoteTemplateId(templateId ?? null);
  }, [templateId]);
  const {
    panelMode,
    theme,
    scale,
    collapsedNodeIds,
    openSections,
    aspectRatioLocked,
    customTextPresets,
    previewValues,
  } = useStore(studioStore, (state) => state.view);
  const {
    setPanelMode,
    setTheme,
    setScale,
    setCollapsedNodeIds,
    setOpenSections,
    setAspectRatioLocked,
    setCustomTextPresets,
  } = useMemo(
    () => ({
      setPanelMode: createStudioViewSetter(studioStore, "panelMode"),
      setTheme: createStudioViewSetter(studioStore, "theme"),
      setScale: createStudioViewSetter(studioStore, "scale"),
      setCollapsedNodeIds: createStudioViewSetter(
        studioStore,
        "collapsedNodeIds",
      ),
      setOpenSections: createStudioViewSetter(studioStore, "openSections"),
      setAspectRatioLocked: createStudioViewSetter(
        studioStore,
        "aspectRatioLocked",
      ),
      setCustomTextPresets: createStudioViewSetter(
        studioStore,
        "customTextPresets",
      ),
    }),
    [studioStore],
  );

  const setSelectedInputId = useCallback(
    (inputId: string | null) =>
      studioStore.getState().setSelectedInputId(inputId),
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

  const showStatus = useCallback((message: string) => {
    if (message) setStatusMessage(message);
  }, []);

  const setDocumentForPersistence = useCallback(
    (nextDocument: StudioTemplateDocument) => {
      studioStore.getState().setDocument(nextDocument);
      studioStore.getState().setView((currentView) => ({
        previewValues: syncThumbnailStudioPreviewValues(
          nextDocument,
          currentView.previewValues,
          currentView.previewEditedInputIds,
        ),
      }));
    },
    [studioStore],
  );

  const replaceEditorDocument = useCallback(
    (
      nextDocument: StudioTemplateDocument,
      nextRuntimeValues: StudioRuntimeValues,
      message: string,
    ) => {
      const editedInputIds = Object.keys(nextRuntimeValues.global ?? {});
      const previewValues = syncThumbnailStudioPreviewValues(
        nextDocument,
        nextRuntimeValues,
        editedInputIds,
      );
      const nextSelectedNodeId = nextDocument.graph.rootNodeIds[0] ?? null;
      const nextSelectedInputId = Object.keys(nextDocument.inputs)[0] ?? null;

      studioStore.getState().setDocument(nextDocument);
      studioStore.getState().setRuntimeValues(previewValues);
      studioStore
        .getState()
        .replaceSelection(
          nextSelectedNodeId ? [nextSelectedNodeId] : [],
          nextSelectedNodeId,
        );
      studioStore.getState().setSelectedInputId(nextSelectedInputId);
      studioStore.getState().setView({
        previewValues,
        previewEditedInputIds: editedInputIds,
        previewMode: editedInputIds.length > 0 ? "session" : "defaults",
      });
      showStatus(message);
    },
    [showStatus, studioStore],
  );

  const {
    selectedNodeId,
    selectedNodeIds,
    applySelection,
    selectSingleNode,
    toggleNodeSelection,
    selectNodeRange,
  } = useStudioSelection({
    getVisibleNodeIds: useCallback(() => visibleNodeIdsRef.current, []),
    onStatusMessage: showStatus,
    store: studioStore,
  });

  const selectedNodeIdsSet = useMemo(
    () => new Set(selectedNodeIds),
    [selectedNodeIds],
  );
  const selectedNode = selectedNodeId
    ? (document.graph.nodes[selectedNodeId] ?? null)
    : null;
  /**
   * 조상이 함께 선택된 노드를 걷어낸 목록.
   *
   * 묶음과 그 자식을 같이 고른 상태에서 좌표를 바꾸면 자식이 두 번 움직인다.
   */
  const selectedTopLevelNodes = useMemo(
    (): StudioGraphNode[] =>
      getStudioTopLevelNodeIds(document, selectedNodeIds)
        .map((nodeId) => document.graph.nodes[nodeId])
        .filter(Boolean) as StudioGraphNode[],
    [document, selectedNodeIds],
  );

  const {
    capture: captureHistory,
    undo: undoDocumentHistory,
    redo: redoDocumentHistory,
  } = useStudioDocumentHistory({
    createSnapshot: useCallback(
      (): StudioEditorSnapshot =>
        captureStudioEditorSnapshot(studioStore.getState()),
      [studioStore],
    ),
    restoreSnapshot: useCallback(
      (snapshot: StudioEditorSnapshot) => {
        studioStore.getState().restoreSnapshot(snapshot);
        studioStore.getState().setView((currentView) => {
          const previewEditedInputIds =
            currentView.previewEditedInputIds.filter((inputId) =>
              Boolean(snapshot.document.inputs[inputId]),
            );
          return {
            previewEditedInputIds,
            previewMode:
              previewEditedInputIds.length > 0 ? "session" : "defaults",
            previewValues: syncThumbnailStudioPreviewValues(
              snapshot.document,
              currentView.previewValues,
              previewEditedInputIds,
            ),
          };
        });
      },
      [studioStore],
    ),
  });

  /**
   * 문서를 바꾼다.
   *
   * 되돌리기 한 단위는 기본적으로 이 함수가 시작한다. 끌기와 색 고르기처럼 값이 연속으로
   * 바뀌는 조작은 시작할 때 한 번만 이력을 쌓고 그 뒤에는 `history: false`로 부른다.
   * 매 프레임 쌓으면 되돌리기가 수백 단계 쌓여 쓸 수 없게 된다.
   */
  const updateDocument = useCallback(
    (
      mutate: (draft: StudioTemplateDocument) => void,
      options: ThumbnailUpdateOptions = {},
    ) => {
      if (options.history !== false) captureHistory();

      const next = cloneDocument(studioStore.getState().document);
      mutate(next);
      studioStore.getState().setDocument(next);
      studioStore.getState().setView((currentView) => {
        const previewEditedInputIds = currentView.previewEditedInputIds.filter(
          (inputId) => Boolean(next.inputs[inputId]),
        );
        return {
          previewEditedInputIds,
          previewMode:
            previewEditedInputIds.length > 0 ? "session" : "defaults",
          previewValues: syncThumbnailStudioPreviewValues(
            next,
            currentView.previewValues,
            previewEditedInputIds,
          ),
        };
      });
    },
    [captureHistory, studioStore],
  );

  const inputConsumers = useMemo(
    () => collectThumbnailStudioInputConsumers(document),
    [document],
  );
  const assetConsumers = useMemo(
    () => collectThumbnailStudioAssetConsumers(document),
    [document],
  );
  const fontConsumers = useMemo(
    () => collectThumbnailStudioFontConsumers(document, customTextPresets),
    [customTextPresets, document],
  );
  const fontUsageBySourceId = useMemo(
    () =>
      getThumbnailStudioFontUsageBySource(
        getStudioWebFontSources(document),
        fontConsumers,
      ),
    [document, fontConsumers],
  );
  const fontFamilies = useMemo(
    () =>
      Array.from(
        new Set([
          "Inter",
          "Pretendard",
          "SF Pro",
          "Roboto",
          ...getStudioCustomFontFamilies(document),
        ]),
      ),
    [document],
  );

  const addInput = useCallback(
    (type: StudioInputType) => {
      let createdId = "";
      updateDocument((draft) => {
        createdId = applyThumbnailStudioAddInput(draft, type).id;
      });
      if (createdId) {
        setSelectedInputId(createdId);
        showStatus(`${type} input added`);
      }
    },
    [setSelectedInputId, showStatus, updateDocument],
  );

  const updateInput = useCallback(
    (
      inputId: string,
      updater: (input: StudioInputDefinition) => StudioInputDefinition,
    ) => {
      updateDocument((draft) => {
        applyThumbnailStudioUpdateInput(draft, inputId, updater);
      });
    },
    [updateDocument],
  );

  const updateSelectOptionValue = useCallback(
    (inputId: string, optionIndex: number, value: string) => {
      const input = studioStore.getState().document.inputs[inputId];
      const nextValue = value.trim();
      if (
        input?.type !== "select" ||
        !nextValue ||
        input.options.some(
          (option, index) =>
            index !== optionIndex && option.value === nextValue,
        )
      ) {
        showStatus("Select option values must be non-empty and unique");
        return;
      }
      if (input.options[optionIndex]?.value === nextValue) return;
      updateDocument((draft) => {
        applyStudioSelectOptionValue(draft, inputId, optionIndex, nextValue);
      });
    },
    [showStatus, studioStore, updateDocument],
  );

  const addSelectOption = useCallback(
    (inputId: string) => {
      updateDocument((draft) => {
        applyStudioAddSelectOption(draft, inputId);
      });
    },
    [updateDocument],
  );

  const removeSelectOption = useCallback(
    (inputId: string, optionIndex: number) => {
      updateDocument((draft) => {
        applyStudioRemoveSelectOption(draft, inputId, optionIndex);
      });
    },
    [updateDocument],
  );

  const deleteInput = useCallback(
    (inputId: string) => {
      const consumers = inputConsumers[inputId] ?? [];
      if (consumers.some((consumer) => consumer.locked)) {
        showStatus("Cannot delete an input used by a locked object");
        return;
      }
      if (
        consumers.length > 0 &&
        !window.confirm(
          `This input is used by ${consumers.length} object(s). Delete it and keep their current preview values?`,
        )
      ) {
        return;
      }
      const previewValues = studioStore.getState().view.previewValues;
      const nextDocument = cloneDocument(studioStore.getState().document);
      if (
        !applyThumbnailStudioDeleteInputWithMaterialize(
          nextDocument,
          previewValues,
          inputId,
        )
      ) {
        showStatus(
          "Cannot delete this input because a current value or fallback is missing",
        );
        return;
      }
      updateDocument((draft) => {
        Object.assign(draft, nextDocument);
      });
      if (selectedInputId === inputId) setSelectedInputId(null);
    },
    [
      inputConsumers,
      selectedInputId,
      setSelectedInputId,
      showStatus,
      studioStore,
      updateDocument,
    ],
  );

  const duplicateInput = useCallback(
    (inputId: string) => {
      let duplicateId = "";
      updateDocument((draft) => {
        duplicateId =
          applyThumbnailStudioDuplicateInput(draft, inputId)?.id ?? "";
      });
      if (duplicateId) setSelectedInputId(duplicateId);
    },
    [setSelectedInputId, updateDocument],
  );

  const moveInput = useCallback(
    (inputId: string, targetIndex: number) => {
      updateDocument((draft) => {
        applyThumbnailStudioMoveInput(draft, inputId, targetIndex);
      });
    },
    [updateDocument],
  );

  const setInputGroup = useCallback(
    (inputId: string, groupId: string | null) => {
      const nextGroup =
        groupId === "__new__" ? window.prompt("New input group name") : groupId;
      if (groupId === "__new__" && !nextGroup?.trim()) return;
      updateDocument((draft) => {
        applyThumbnailStudioSetInputGroup(draft, inputId, nextGroup);
      });
    },
    [updateDocument],
  );

  const renameInputGroup = useCallback(
    (fromGroupId: string, toGroupId: string) => {
      updateDocument((draft) => {
        applyThumbnailStudioRenameInputGroup(draft, fromGroupId, toGroupId);
      });
    },
    [updateDocument],
  );

  const updatePreviewInput = useCallback(
    (inputId: string, value: string) => {
      studioStore.getState().setView((currentView) => {
        const previewEditedInputIds =
          currentView.previewEditedInputIds.includes(inputId)
            ? currentView.previewEditedInputIds
            : [...currentView.previewEditedInputIds, inputId];
        return {
          previewMode: "session",
          previewEditedInputIds,
          previewValues: setThumbnailStudioPreviewInputValue(
            studioStore.getState().document,
            currentView.previewValues,
            inputId,
            value,
          ),
        };
      });
    },
    [studioStore],
  );

  const resetPreviewInput = useCallback(
    (inputId?: string) => {
      studioStore.getState().setView((currentView) => {
        const previewEditedInputIds = inputId
          ? currentView.previewEditedInputIds.filter((id) => id !== inputId)
          : [];
        return {
          previewMode:
            previewEditedInputIds.length > 0 ? "session" : "defaults",
          previewEditedInputIds,
          previewValues: syncThumbnailStudioPreviewValues(
            studioStore.getState().document,
            currentView.previewValues,
            previewEditedInputIds,
          ),
        };
      });
    },
    [studioStore],
  );

  const importAssets = useCallback(
    async (files: File[]) => {
      const result = await importThumbnailStudioAssetFiles(
        files,
        Object.keys(studioStore.getState().document.assets),
      );
      if (result.assets.length > 0) {
        updateDocument((draft) => {
          applyThumbnailStudioAddAssets(draft, result.assets);
        });
      }
      if (result.failures.length > 0) {
        showStatus(
          `Imported ${result.assets.length}; ${result.failures.length} failed: ${result.failures[0]?.reason}`,
        );
      } else {
        showStatus(`Imported ${result.assets.length} image asset(s)`);
      }
    },
    [showStatus, studioStore, updateDocument],
  );

  const addImageNodeFromAsset = useCallback(
    (assetId: string) => {
      const currentDocument = studioStore.getState().document;
      const currentSelectedNodeId = studioStore.getState().selectedNodeId;
      const currentSelectedNode = currentSelectedNodeId
        ? currentDocument.graph.nodes[currentSelectedNodeId]
        : null;
      const plan = planStudioNodeInsertion({
        document: currentDocument,
        type: "image",
        selectedNode: currentSelectedNode,
        viewportCenter: viewportHandleRef.current?.getVisibleCanvasCenter(),
      });
      const nodeId = createStudioId("node");
      const styleId = createStudioId("style");
      let added = false;
      updateDocument((draft) => {
        added = Boolean(
          applyThumbnailStudioAddImageNodeForAsset({
            draft,
            assetId,
            nodeId,
            styleId,
            plan,
          }),
        );
      });
      if (added) {
        selectSingleNode(nodeId);
        showStatus("Image asset added to canvas");
      }
    },
    [selectSingleNode, showStatus, studioStore, updateDocument],
  );

  const replaceSelectedImageAsset = useCallback(
    (assetId: string) => {
      const nodeId = studioStore.getState().selectedNodeId;
      const node = nodeId
        ? studioStore.getState().document.graph.nodes[nodeId]
        : null;
      if (!node || node.type !== "image" || node.locked) {
        showStatus("Select one unlocked image object to replace");
        return;
      }
      updateDocument((draft) => {
        applyThumbnailStudioReplaceImageAsset(draft, node.id, assetId);
      });
      showStatus("Image asset replaced");
    },
    [showStatus, studioStore, updateDocument],
  );

  const requestImageCrop = useCallback(
    (nodeId: string) => {
      const currentDocument = studioStore.getState().document;
      const node = currentDocument.graph.nodes[nodeId];
      const sourceAssetId =
        node?.binding?.kind === "staticAsset" ? node.binding.assetId : null;
      const sourceAsset = sourceAssetId
        ? currentDocument.assets[sourceAssetId]
        : null;
      if (
        !node ||
        node.type !== "image" ||
        node.locked ||
        !sourceAssetId ||
        !sourceAsset
      ) {
        showStatus("Select one unlocked static image to crop");
        return;
      }

      const geometry = resolveStudioGraphNodeGeometry(currentDocument, node.id);
      setPendingImageCrop({
        nodeId: node.id,
        sourceAssetId,
        imageSrc: sourceAsset.src,
        initialWidth: Math.max(1, geometry.width || sourceAsset.width || 1),
        initialHeight: Math.max(1, geometry.height || sourceAsset.height || 1),
      });
    },
    [showStatus, studioStore],
  );

  const applyImageCrop = useCallback(
    (croppedImageSrc: string, outputSize: StudioImageCropOutputSize) => {
      const pending = pendingImageCrop;
      if (!pending) return;

      const currentDocument = studioStore.getState().document;
      const currentNode = currentDocument.graph.nodes[pending.nodeId];
      if (
        !currentNode ||
        currentNode.type !== "image" ||
        currentNode.locked ||
        currentNode.binding?.kind !== "staticAsset" ||
        currentNode.binding.assetId !== pending.sourceAssetId
      ) {
        setPendingImageCrop(null);
        showStatus("Crop canceled because the image source changed");
        return;
      }

      let applied = false;
      updateDocument((draft) => {
        let derivedAssetId = createStudioId("asset");
        while (draft.assets[derivedAssetId]) {
          derivedAssetId = createStudioId("asset");
        }
        applied = applyThumbnailStudioCropImageAsset(draft, {
          nodeId: pending.nodeId,
          sourceAssetId: pending.sourceAssetId,
          derivedAssetId,
          croppedImageSrc,
          width: outputSize.width,
          height: outputSize.height,
        });
      });
      setPendingImageCrop(null);
      showStatus(
        applied ? "Image crop applied" : "Image crop could not be applied",
      );
    },
    [pendingImageCrop, showStatus, studioStore, updateDocument],
  );

  const renameAsset = useCallback(
    (assetId: string, label: string) => {
      const asset = studioStore.getState().document.assets[assetId];
      if (!asset || asset.label === label.trim()) return;
      updateDocument((draft) => {
        applyThumbnailStudioRenameAsset(draft, assetId, label);
      });
    },
    [studioStore, updateDocument],
  );

  const locateAssetConsumer = useCallback(
    (nodeId: string) => {
      if (!studioStore.getState().document.graph.nodes[nodeId]) return;
      selectSingleNode(nodeId);
      setPanelMode("layers");
      showStatus("Selected the first asset use");
    },
    [selectSingleNode, setPanelMode, showStatus, studioStore],
  );

  const deleteAsset = useCallback(
    (assetId: string) => {
      const consumers = assetConsumers[assetId] ?? [];
      if (consumers.length > 0) {
        showStatus(
          `Cannot delete this asset while it has ${consumers.length} use(s)`,
        );
        return;
      }
      updateDocument((draft) => {
        applyThumbnailStudioDeleteUnusedAsset(draft, assetId);
      });
      showStatus("Unused asset removed from the document");
    },
    [assetConsumers, showStatus, updateDocument],
  );

  const removeUnusedAssets = useCallback(() => {
    const unusedCount = Object.keys(
      studioStore.getState().document.assets,
    ).filter((assetId) => (assetConsumers[assetId] ?? []).length === 0).length;
    if (unusedCount === 0) {
      showStatus("There are no unused assets");
      return;
    }
    if (!window.confirm(`Remove ${unusedCount} unused asset(s)?`)) return;
    let removedCount = 0;
    updateDocument((draft) => {
      removedCount = applyThumbnailStudioRemoveUnusedAssets(draft).length;
    });
    showStatus(`Removed ${removedCount} unused asset(s)`);
  }, [assetConsumers, showStatus, studioStore, updateDocument]);

  const updateWebFonts = useCallback(
    (webFonts: StudioWebFontSource[]) => {
      const currentDocument = studioStore.getState().document;
      const currentSources = getStudioWebFontSources(currentDocument);
      const impacts = getThumbnailStudioFontChangeImpacts(
        currentSources,
        webFonts,
        fontConsumers,
      );
      if (impacts.length > 0) {
        const impactSummary = impacts
          .map(
            (impact) =>
              `${impact.fontFamily} (${impact.consumers.length} use${impact.consumers.length === 1 ? "" : "s"})`,
          )
          .join(", ");
        const shouldContinue = window.confirm(
          `This change removes or disables ${impactSummary}. Existing text will use the next font-family fallback. Continue?`,
        );
        if (!shouldContinue) return;
      }

      updateDocument((draft) => {
        draft.resources = {
          ...draft.resources,
          webFonts,
        };
      });
      if (impacts.length > 0) {
        showStatus(
          `${impacts.map((impact) => impact.fontFamily).join(", ")} will use its font-family fallback`,
        );
      }
    },
    [fontConsumers, showStatus, studioStore, updateDocument],
  );

  const commands = useThumbnailNodeCommands({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getSelectedNodeIds: useCallback(
      () => studioStore.getState().selectedNodeIds,
      [studioStore],
    ),
    getSelectedNodeId: useCallback(
      () => studioStore.getState().selectedNodeId,
      [studioStore],
    ),
    getViewportCenter: useCallback(
      () => viewportHandleRef.current?.getVisibleCanvasCenter() ?? null,
      [],
    ),
    updateDocument,
    captureHistory,
    applySelection,
    selectSingleNode,
    onStatusMessage: showStatus,
    getPreviewValues: useCallback(
      () => studioStore.getState().view.previewValues,
      [studioStore],
    ),
    getCustomTextPresets: useCallback(
      () => studioStore.getState().view.customTextPresets,
      [studioStore],
    ),
    setCustomTextPresets,
  });

  const textPresets = useMemo(
    () => [...STUDIO_TEXT_EFFECT_PRESETS, ...customTextPresets],
    [customTextPresets],
  );

  const clipboard = useStudioClipboard({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getSelectedNodeIds: useCallback(
      () => studioStore.getState().selectedNodeIds,
      [studioStore],
    ),
    getSelectedNodeId: useCallback(
      () => studioStore.getState().selectedNodeId,
      [studioStore],
    ),
    updateDocument,
    onSelect: applySelection,
    onStatusMessage: showStatus,
    onAfterPaste: useCallback(() => setPanelMode("layers"), [setPanelMode]),
  });

  const layerDrag = useStudioLayerDrag({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getSelectedNodeIds: useCallback(
      () => studioStore.getState().selectedNodeIds,
      [studioStore],
    ),
    getCollapsedNodeIds: useCallback(
      () => studioStore.getState().view.collapsedNodeIds,
      [studioStore],
    ),
    setCollapsedNodeIds,
    updateDocument,
    onSelect: applySelection,
    onSelectSingleNode: selectSingleNode,
    onStatusMessage: showStatus,
  });

  const undo = useCallback(() => {
    showStatus(undoDocumentHistory() ? "Undo" : "Nothing to undo");
  }, [showStatus, undoDocumentHistory]);

  const redo = useCallback(() => {
    showStatus(redoDocumentHistory() ? "Redo" : "Nothing to redo");
  }, [redoDocumentHistory, showStatus]);

  const handleTemplateIdChange = useCallback(
    (nextTemplateId: string) => {
      setRemoteTemplateId(nextTemplateId);
      if (!templateId) {
        router.replace(`/admin/thumbnail-studio/${nextTemplateId}/edit`);
      }
    },
    [router, templateId],
  );

  const thumbnailPersistence = useStudioTemplatePersistence({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getRuntimeValues: useCallback(
      () => studioStore.getState().view.previewValues,
      [studioStore],
    ),
    setDocument: setDocumentForPersistence,
    templateId: remoteTemplateId,
    onTemplateIdChange: handleTemplateIdChange,
    initialTemplateId: templateId ?? null,
    getRemoteTemplate: useCallback(
      () => templateStudioTemplateQuery.data,
      [templateStudioTemplateQuery.data],
    ),
    refetchRemoteTemplate: useCallback(
      () => templateStudioTemplateQuery.refetch(),
      [templateStudioTemplateQuery],
    ),
    createRemoteTemplate: createTemplateStudioTemplateMutation.mutateAsync,
    saveRemoteDraft: saveTemplateStudioDraftMutation.mutateAsync,
    publishRemoteDocument: publishTemplateStudioDocumentMutation.mutateAsync,
    syncRemoteAssets: syncTemplateStudioAssetsMutation.mutateAsync,
    onReplaceDocument: replaceEditorDocument,
    onStatusMessage: showStatus,
    onExportBlocked: () => showStatus("Export blocked: check diagnostics"),
    previewPathForTemplate: (nextTemplateId) =>
      `/admin/thumbnail-studio/${nextTemplateId}/preview`,
  });

  const isRemoteSyncing =
    createTemplateStudioTemplateMutation.isPending ||
    saveTemplateStudioDraftMutation.isPending ||
    publishTemplateStudioDocumentMutation.isPending ||
    syncTemplateStudioAssetsMutation.isPending ||
    templateStudioTemplateQuery.isFetching;

  useStudioKeyboardShortcuts({
    hasCutNodes: clipboard.cutNodeIds.length > 0,
    isNodePickerOpen: false,
    handlers: useMemo(
      () => ({
        undo,
        redo,
        saveDraft: () => void thumbnailPersistence.saveDraft(),
        selectAll: commands.selectAll,
        copy: clipboard.copy,
        cut: clipboard.cut,
        paste: clipboard.paste,
        duplicate: commands.duplicateNodes,
        group: commands.groupNodes,
        ungroup: commands.ungroupNodes,
        toggleLock: commands.toggleLock,
        moveLayer: commands.moveLayer,
        delete: commands.deleteNodes,
        cancelCut: clipboard.cancelCut,
        closeNodePicker: () => {},
        clearSelection: () => selectSingleNode(null),
        nudge: commands.nudgeNodes,
        zoomIn: () => setScale((current) => Math.min(current + 0.1, 4)),
        zoomOut: () => setScale((current) => Math.max(current - 0.1, 0.1)),
        zoomToFit: () => setFitRequestKey((current) => current + 1),
        zoomReset: () => setScale(1),
        onStatusMessage: showStatus,
      }),
      [
        clipboard,
        commands,
        redo,
        selectSingleNode,
        setScale,
        showStatus,
        thumbnailPersistence,
        undo,
      ],
    ),
  });

  // 지워진 노드가 선택에 남지 않도록 문서가 바뀔 때 한 번 정리한다.
  useEffect(() => {
    const hasMissingNode = selectedNodeIds.some(
      (nodeId) => !document.graph.nodes[nodeId],
    );
    if (hasMissingNode) applySelection(selectedNodeIds);
  }, [applySelection, document.graph.nodes, selectedNodeIds]);

  /**
   * 고른 것을 감싸는 사각형. 캔버스 좌표 기준이다.
   *
   * 묶음 안의 노드는 좌표가 부모 기준이므로 조상 좌표를 더해야 화면에 겹쳐 그릴 수 있다.
   */
  const selectionBounds = useMemo((): StudioResizeGeometry | null => {
    if (selectedTopLevelNodes.length === 0) return null;

    const boxes = selectedTopLevelNodes.map((node) => {
      const offset = getStudioParentCanvasOffset(document, node.parentId);
      const geometry = resolveStudioGraphNodeGeometry(document, node.id);
      return {
        left: offset.left + geometry.left,
        top: offset.top + geometry.top,
        width: geometry.width,
        height: geometry.height,
      };
    });
    const left = Math.min(...boxes.map((box) => box.left));
    const top = Math.min(...boxes.map((box) => box.top));

    return {
      left,
      top,
      width: Math.max(...boxes.map((box) => box.left + box.width)) - left,
      height: Math.max(...boxes.map((box) => box.top + box.height)) - top,
    };
  }, [document, selectedTopLevelNodes]);

  const isSingleSelection = selectedTopLevelNodes.length === 1;
  const singleSelectedNode = isSingleSelection
    ? selectedTopLevelNodes[0]
    : null;
  const canTransformSelection = Boolean(
    singleSelectedNode &&
    !singleSelectedNode.locked &&
    !isStudioFillParentLayout(singleSelectedNode.layoutMode),
  );
  const selectionRotateDeg = singleSelectedNode?.styleId
    ? Number(document.styles[singleSelectedNode.styleId]?.rotateDeg ?? 0)
    : 0;

  const selectionVisualBounds = useMemo((): StudioResizeGeometry | null => {
    if (selectedTopLevelNodes.length === 0) return null;

    const hasEffect = (node: StudioGraphNode): boolean => {
      if (node.hidden) return false;

      if (node.type === "text" || node.type === "flexibleText") {
        const style = node.styleId ? document.styles[node.styleId] : undefined;
        const outset = getStudioTextEffectOutset(
          resolveStudioTextAppearance(node, style),
        );
        if (
          Math.max(outset.top, outset.right, outset.bottom, outset.left) > 0
        ) {
          return true;
        }
      }
      return node.childIds.some((childId) => {
        const child = document.graph.nodes[childId];
        return child ? hasEffect(child) : false;
      });
    };
    if (!selectedTopLevelNodes.some(hasEffect)) return null;

    const boxes = selectedTopLevelNodes.map((node) => {
      const visual = getStudioNodeVisualBoundsInCanvas(document, node.id);
      return {
        left: visual.left,
        top: visual.top,
        width: visual.width,
        height: visual.height,
      };
    });
    const left = Math.min(...boxes.map((box) => box.left));
    const top = Math.min(...boxes.map((box) => box.top));
    const right = Math.max(...boxes.map((box) => box.left + box.width));
    const bottom = Math.max(...boxes.map((box) => box.top + box.height));

    return { left, top, width: right - left, height: bottom - top };
  }, [document, selectedTopLevelNodes]);

  const outsideCanvasNodeIds = useMemo(
    () => getStudioNodeIdsOutsideCanvas(document),
    [document],
  );
  const clippedCanvasNodeIds = useMemo(
    () => getStudioNodeIdsClippedByCanvas(document),
    [document],
  );
  const groupOverflowDiagnostics = useMemo(
    () => getStudioGroupOverflowDiagnostics(document),
    [document],
  );

  const propertySections = buildThumbnailInspectorSections({
    document,
    fontFamilies,
    selectedNodes: selectedTopLevelNodes,
    selectedNode,
    openSections,
    onToggleSection: (sectionId) =>
      setOpenSections((current) => ({
        ...current,
        [sectionId]: !(current[sectionId] ?? true),
      })),
    aspectRatioLocked,
    onAspectRatioLockedChange: setAspectRatioLocked,
    canvasPresets: THUMBNAIL_CANVAS_PRESETS,
    outsideCanvasNodeIds,
    clippedCanvasNodeIds,
    groupOverflowDiagnostics,
    commands,
    captureHistory,
    onFitCanvas: () => setFitRequestKey((current) => current + 1),
    onCreateInput: (nodeId) => {
      const inputId = commands.createInputFromNode(nodeId);
      if (!inputId) return;
      setSelectedInputId(inputId);
      setPanelMode("inputs");
      showStatus("Input created and connected");
    },
    onOpenInput: (inputId) => {
      setSelectedInputId(inputId);
      setPanelMode("inputs");
    },
    onCropImage: requestImageCrop,
  });

  const leftPanelContent =
    panelMode === "layers" ? (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ThumbnailLayerCommandBar
          hasGroupSelection={selectedTopLevelNodes.some(
            (node) => node.type === "group",
          )}
          hasMultiSelection={selectedTopLevelNodes.length > 1}
          hasSelection={selectedTopLevelNodes.length > 0}
          // 고른 것이 없을 때 `every`는 참이다. 그대로 쓰면 아무것도 고르지 않았는데
          // 단추가 "되살리기"로 보인다.
          isHidden={
            selectedTopLevelNodes.length > 0 &&
            selectedTopLevelNodes.every((node) => node.hidden)
          }
          isLocked={
            selectedTopLevelNodes.length > 0 &&
            selectedTopLevelNodes.every((node) => node.locked)
          }
          onDelete={commands.deleteNodes}
          onGroup={commands.groupNodes}
          onMoveLayer={commands.moveLayer}
          onToggleHidden={commands.toggleHidden}
          onToggleLock={commands.toggleLock}
          onUngroup={commands.ungroupNodes}
        />
        <StudioLayerPanel
          collapsedNodeIds={collapsedNodeIdsSet}
          cutNodeIds={new Set(clipboard.cutNodeIds)}
          dropState={layerDrag.dropState}
          graph={document.graph}
          rootNodeIds={document.graph.rootNodeIds}
          selectedNodeIds={selectedNodeIdsSet}
          summary={`${Object.keys(document.graph.nodes).length} placed objects`}
          title="Thumbnail Layers"
          onDragEnd={layerDrag.clearDragState}
          onDragOver={layerDrag.handleDragOver}
          onDragStart={layerDrag.handleDragStart}
          onDrop={layerDrag.handleDrop}
          onIndicatorDragOver={layerDrag.handleIndicatorDragOver}
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
      </div>
    ) : panelMode === "assets" ? (
      <ThumbnailAssetPanel
        assets={Object.values(document.assets)}
        consumers={assetConsumers}
        selectedImageNode={
          singleSelectedNode?.type === "image" ? singleSelectedNode : null
        }
        onAddNode={addImageNodeFromAsset}
        onDelete={deleteAsset}
        onImport={importAssets}
        onLocate={locateAssetConsumer}
        onRemoveUnused={removeUnusedAssets}
        onRename={renameAsset}
        onReplaceSelected={replaceSelectedImageAsset}
      />
    ) : panelMode === "textPresets" ? (
      <ThumbnailTextPresetPanel
        presets={textPresets}
        selectedTextNode={
          singleSelectedNode &&
          (singleSelectedNode.type === "text" ||
            singleSelectedNode.type === "flexibleText")
            ? singleSelectedNode
            : null
        }
        onApply={(preset) => {
          if (singleSelectedNode) {
            commands.applyTextPreset(singleSelectedNode.id, preset);
          }
        }}
        onCreate={() => {
          if (singleSelectedNode)
            commands.createTextPreset(singleSelectedNode.id);
        }}
        onDuplicate={commands.duplicateTextPreset}
        onRename={commands.renameTextPreset}
        onDelete={commands.deleteTextPreset}
      />
    ) : (
      <ThumbnailInputPanel
        consumers={inputConsumers}
        document={document}
        previewValues={previewValues}
        selectedInputId={selectedInputId}
        onAdd={addInput}
        onAddOption={addSelectOption}
        onDelete={deleteInput}
        onDuplicate={duplicateInput}
        onMove={moveInput}
        onPreviewChange={updatePreviewInput}
        onRemoveOption={removeSelectOption}
        onRenameGroup={renameInputGroup}
        onResetPreview={resetPreviewInput}
        onSelectInput={setSelectedInputId}
        onSelectOptionValue={updateSelectOptionValue}
        onSetGroup={setInputGroup}
        onUpdate={updateInput}
      />
    );

  return (
    <StudioEditorStoreProvider value={studioStore}>
      <StudioEditorShell
        canvas={
          <section className="relative min-w-0 flex-1 overflow-hidden bg-[var(--canvas)]">
            <StudioCanvasViewport
              canvasHeight={document.canvas.height}
              canvasWidth={document.canvas.width}
              fitRequestKey={fitRequestKey}
              handleRef={viewportHandleRef}
              scale={scale}
              onMoveNode={commands.moveNodeByDrag}
              onMoveNodeStart={commands.beginNodeMove}
              onScaleChange={setScale}
              onSelectNode={(nodeId) => {
                if (studioStore.getState().selectedNodeIds.includes(nodeId)) {
                  return;
                }
                selectSingleNode(nodeId);
              }}
            >
              <div
                className="relative"
                style={{
                  width: document.canvas.width,
                  height: document.canvas.height,
                }}
              >
                <StudioRenderer
                  document={document}
                  runtimeValues={previewValues}
                  selectedNodeId={selectedNodeId}
                  selectedNodeIds={selectedNodeIds}
                  onSelectNode={(nodeId, event) => {
                    if (!nodeId) {
                      selectSingleNode(null);
                      return;
                    }
                    if (event?.shiftKey || event?.metaKey || event?.ctrlKey) {
                      toggleNodeSelection(nodeId);
                    } else {
                      selectSingleNode(nodeId);
                    }
                  }}
                />
                {selectionBounds ? (
                  <StudioSelectionOverlay
                    bounds={selectionBounds}
                    visualBounds={selectionVisualBounds ?? undefined}
                    lockAspectRatio={aspectRatioLocked}
                    rotateDeg={isSingleSelection ? selectionRotateDeg : 0}
                    scale={scale}
                    showHandles={canTransformSelection}
                    onResize={(geometry) => {
                      if (!singleSelectedNode) return;
                      // overlay는 캔버스 좌표로 계산한다. 저장은 부모 좌표계다.
                      const parentOffset = getStudioParentCanvasOffset(
                        document,
                        singleSelectedNode.parentId,
                      );
                      commands.setGeometry(
                        singleSelectedNode.id,
                        {
                          left: geometry.left - parentOffset.left,
                          top: geometry.top - parentOffset.top,
                          width: geometry.width,
                          height: geometry.height,
                        },
                        { history: false },
                      );
                    }}
                    onRotate={(rotateDeg) => {
                      if (!singleSelectedNode) return;
                      commands.setRotation(singleSelectedNode.id, rotateDeg, {
                        history: false,
                      });
                    }}
                    onTransformEnd={() => showStatus("Transformed")}
                    // 한 번의 크기 조절과 한 번의 회전이 각각 되돌리기 한 단위다.
                    onTransformStart={captureHistory}
                  />
                ) : null}
              </div>
            </StudioCanvasViewport>
          </section>
        }
        leftSidebar={
          <StudioLeftSidebar
            activeTabId={panelMode}
            content={leftPanelContent}
            contextHeader={
              <ThumbnailAddMenu
                onAddNode={commands.addNode}
                onAddWeekDates={commands.addWeekDates}
              />
            }
            tabs={THUMBNAIL_PANEL_TABS}
            onTabChange={(tabId) => setPanelMode(tabId as ThumbnailPanelMode)}
          />
        }
        overlays={
          <>
            <StudioSettingsDialog
              common={{
                theme,
                onThemeChange: setTheme,
                webFonts: {
                  sources: getStudioWebFontSources(document),
                  usageBySourceId: fontUsageBySourceId,
                  onChange: updateWebFonts,
                },
                data: {
                  isReloadDisabled: true,
                  onReloadTemplate: () => {},
                  onExportJson: () => {},
                  onImportJson: () => {},
                },
                documentInfo: {
                  databaseTargetLabel: remoteTemplateId ?? "not connected",
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
                            commands.setCanvasSize({
                              width,
                              height: document.canvas.height,
                            })
                          }
                        />
                        <StudioSettingsNumberField
                          label="Height"
                          value={document.canvas.height}
                          onChange={(height) =>
                            commands.setCanvasSize({
                              width: document.canvas.width,
                              height,
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
                              commands.setCanvasSize({
                                width: preset.width,
                                height: preset.height,
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
            {pendingImageCrop ? (
              <StudioImageCropModal
                imageSrc={pendingImageCrop.imageSrc}
                initialHeight={pendingImageCrop.initialHeight}
                initialWidth={pendingImageCrop.initialWidth}
                onCancel={() => setPendingImageCrop(null)}
                onApply={applyImageCrop}
              />
            ) : null}
          </>
        }
        propertiesPanel={
          <StudioPropertiesPanel
            header={{
              icon: selectedNode ? (
                <StudioNodeTypeIcon size={12} type={selectedNode.type} />
              ) : (
                <Monitor size={12} />
              ),
              title: selectedNode
                ? getStudioGraphNodeTypeLabel(selectedNode.type)
                : "Canvas",
              summary: selectedNode
                ? `${selectedNodeIds.length} selected`
                : statusMessage,
              renameDisabled: !selectedNode,
              renameValue: selectedNode?.label ?? "No selection",
              onRenameChange: (label) => {
                if (!selectedNode) return;
                commands.renameNode(selectedNode.id, label);
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
            centerSlot={
              <div className="flex h-[30px] shrink-0 items-center gap-1">
                <span
                  className="max-w-[190px] truncate rounded-md bg-[var(--field)] px-2 py-1 text-[10px] font-semibold text-[var(--fg2)]"
                  data-thumbnail-status="true"
                  title={statusMessage}
                >
                  {statusMessage}
                </span>
                <button
                  className="h-[26px] rounded-md px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  title="Undo"
                  type="button"
                  onClick={undo}
                >
                  Undo
                </button>
                <button
                  className="h-[26px] rounded-md px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  title="Redo"
                  type="button"
                  onClick={redo}
                >
                  Redo
                </button>
              </div>
            }
            previewAction={{
              label: "Preview",
              title: "Open runtime preview",
              onClick: () => void thumbnailPersistence.openDraftPreview(),
            }}
            publishAction={{
              disabled: isRemoteSyncing,
              title: "Publish thumbnail template",
              onClick: () => void thumbnailPersistence.publish(),
            }}
            saveAction={{
              disabled: isRemoteSyncing,
              title: "Save thumbnail draft",
              onClick: () => void thumbnailPersistence.saveDraft(),
            }}
            settingsAction={{
              title: "Thumbnail settings",
              onClick: () => setSettingsOpen(true),
            }}
            zoom={{
              scale,
              onZoomIn: () => setScale((current) => Math.min(current + 0.1, 4)),
              onZoomOut: () =>
                setScale((current) => Math.max(current - 0.1, 0.1)),
              onFit: () => setFitRequestKey((current) => current + 1),
            }}
          />
        }
      />
    </StudioEditorStoreProvider>
  );
}
