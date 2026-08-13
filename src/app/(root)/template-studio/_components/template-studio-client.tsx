"use client";

import {
  ArrowUpRight,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Paintbrush,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "zustand";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useStudioDocumentHistory } from "@/hooks/studio/use-studio-document-history";
import { useStudioClipboard } from "@/hooks/studio/use-studio-clipboard";
import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
  createStudioViewSetter,
  type StudioEditorSnapshot,
  type StudioEditorStore,
  StudioEditorStoreProvider,
} from "@/stores/studio/studio-editor-store";
import { useStudioKeyboardShortcuts } from "@/hooks/studio/use-studio-keyboard-shortcuts";
import { useStudioLayerDrag } from "@/hooks/studio/use-studio-layer-drag";
import { useStudioSelection } from "@/hooks/studio/use-studio-selection";
import { useStudioTemplatePersistence } from "@/hooks/studio/use-studio-template-persistence";
import { useTimetableObjectCommands } from "../_hooks/use-timetable-object-commands";
import { useStudioTimetableLayerDrag } from "@/hooks/studio/use-studio-timetable-layer-drag";
import {
  useCreateTemplateStudioTemplate,
  usePublishTemplateStudioDocument,
  useSaveTemplateStudioDraft,
  useSyncTemplateStudioAssets,
  useTemplateStudioTemplate,
} from "@/hooks/query/useTemplateStudio";
import { cn } from "@/lib/utils";
import {
  StudioBuiltinFieldId,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioImageFit,
  StudioInputDefinition,
  StudioInputId,
  StudioInputScope,
  StudioInputType,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioWebFontSource,
  StudioTimetableCompositionObject,
  StudioTimetableComponentId,
  StudioTimetableDayId,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  createStudioBindingForBuiltinField,
  createStudioBindingForInput,
  getStudioBindingInputId,
  isStudioImageNode,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import { getStudioBuiltinField } from "@/utils/template-studio/builtin-fields";
import {
  getStudioTimetableComponentSetDeleteReason,
  getStudioTimetableDayComponent,
} from "@/utils/template-studio/component-sets";
import {} from "@/utils/template-studio/date-template";
import {
  applyStudioDuplicateNodes,
  applyStudioGroupNodes,
  applyStudioLayerMove,
  applyStudioToggleNodeLock,
  applyStudioUngroupNodes,
  getStudioLayerMoveMessage,
  planStudioDuplicateNodes,
  planStudioGroupNodes,
  planStudioLayerMove,
  planStudioToggleNodeLock,
  planStudioUngroupNodes,
  type StudioLayerMoveCommand,
} from "@/utils/template-studio/graph-commands";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import {
  applyStudioAddSelectOption,
  applyStudioRemoveSelectOption,
  applyStudioSelectOptionValue,
  collectStudioInputConsumers,
  createStudioInputDefinition,
  getStudioInputTypeLabel,
  type StudioInputConsumerReference,
} from "@/utils/template-studio/input-commands";
import {
  applyStudioDeleteNodes,
  applyStudioInsertNode,
  createStudioSelectConsumerNode,
  planStudioAddNode,
  planStudioDeleteNodes,
  resolveStudioNodeInsertionParentId,
} from "@/utils/template-studio/node-commands";
import { getStudioLayerPanelOrder } from "@/utils/template-studio/layer-order";
import {
  applyStudioNodeFitParent,
  applyStudioNodeOffset,
  applyStudioNodeStyleValue,
  applyStudioNodeTextAlignment,
  getStudioVariantStyleMessage,
  planStudioNudgeNodes,
  resolveStudioDragTargetNodeIds,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import {
  applyStudioDeleteTimetableObject,
  getStudioTimetableDeleteMessage,
  planStudioDeleteTimetableObject,
} from "@/utils/template-studio/timetable-commands";
import {
  isStudioFillParentLayout,
  isStudioPlacedTimetableCompositionObject,
  resolveStudioGraphNodeGeometry,
  resolveStudioTimetableObjectGeometry,
} from "@/utils/template-studio/object-layout";
import {
  getStudioCanvasNodeDragBlockedReason,
  getStudioTimetableCanvasDragBlock,
} from "@/utils/template-studio/layer-drag";
import { getStudioSelectionLabel } from "@/utils/template-studio/selection";
import {
  getStudioInputDefaultValue,
  getStudioInputsForScope,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import { resolveStudioRuntimeCropSize } from "@/utils/template-studio/runtime-image-crop";
import {
  getStudioPresetGroups,
} from "@/utils/template-studio/preset-registry";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "@/utils/template-studio/sample-document";
import {
  ensureStudioTimetableComposition,
  getStudioTimetableComposition,
  getStudioTimetableObjectRenderableChildIds,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  createStudioStatusCardBackgroundSlotResolver,
  setStudioStatusCardBackgroundAssetSlot,
} from "@/utils/template-studio/status-card-background";
import {
  getStudioTimetableAddEntryDisabledReason,
  getStudioTimetableEffectiveMaxEntriesPerDay,
  getStudioTimetableEntriesForDay,
  resolveStudioTimetableComponentVariant,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";
import { applyStudioTimetableComponentFrames } from "@/utils/template-studio/entry-groups";
import {
  getStudioAvailableTimetableStatuses,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import {
  getStudioCardsGuide,
  getStudioTimetableGuide,
} from "@/utils/template-studio/timetable-guide";
import {
  applyStudioVariantStyle,
  type StudioVariantStyleScope,
} from "@/utils/template-studio/variant-style-propagation";
import {} from "@/utils/template-studio/text-wrap";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import { getStudioCustomFontFamilies } from "@/utils/template-studio/web-fonts";

import {
  clampStudioPreviewScale,
  StudioCanvasViewport,
} from "../../../../components/studio/canvas/studio-canvas-viewport";
import {
  StudioNodePickerMenu,
  type StudioPickerNode,
} from "./studio-node-picker-menu";
import { StudioImageCropModal } from "./studio-image-crop-modal";
import { StudioEditorShell } from "@/components/studio/editor-shell/studio-editor-shell";
import { StudioGuideControl } from "@/components/studio/editor-shell/studio-guide-control";
import {
  StudioLeftSidebar,
  type StudioPanelTab,
} from "@/components/studio/editor-shell/studio-left-sidebar";
import {
  StudioPropertiesPanel,
  type StudioPropertyItem,
} from "@/components/studio/editor-shell/studio-properties-panel";
import { StudioTopToolbar } from "@/components/studio/editor-shell/studio-top-toolbar";
import {
  getStudioInputScopeLabel,
  STUDIO_INPUT_SCOPE_OPTIONS,
} from "@/utils/template-studio/input-scope";
import {
  resolveStudioAssetSlotSpec,
  type StudioAssetSlotKind,
} from "@/utils/template-studio/timetable-asset-slot-specs";
import { resolveStudioTimetableSelection } from "@/utils/template-studio/timetable-selection";
import { StudioLayerPanel } from "@/components/studio/layers/studio-layer-panel";

import { StudioApplyStyleDialog } from "./studio-apply-style-dialog";
import { buildStudioCardNodeInspectorSections } from "./studio-card-node-inspector";
import { StudioInputInspector } from "./studio-input-inspector";
import { buildStudioTimetableInspectorSections } from "./studio-timetable-inspector";
import {} from "./studio-timetable-object-inspector-controls";
import {} from "./studio-timetable-object-controls";
import {
  StudioCardsPresetsPanel,
  StudioTimetablePresetsPanel,
} from "./studio-preset-panels";
import {
  StudioRuntimeInputField,
  StudioRuntimeInputPanel,
} from "./studio-runtime-input-panel";
import { StudioStatusCardBackgroundSlot } from "./studio-status-card-background-slot";
import { StudioAssetSlotFields } from "./studio-timetable-asset-slot-fields";
import { StudioTimetableDayPanel } from "./studio-timetable-day-panel";
import { StudioTimetableLayerPanel } from "./studio-timetable-layer-panel";
import { StudioRenderer } from "@/components/studio/canvas/studio-renderer";
import { StudioSettingsModal } from "./studio-settings-modal";
import {
  getStudioTimetableDayCardGeometry,
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardsBounds,
  getStudioTimetableDayCardsLayout,
  getStudioTimetableEntryCardSize,
  getStudioTimetablePreviewSize,
  StudioTimetablePreview,
} from "./studio-timetable-preview";

type PanelMode = "layers" | "inputs" | "presets" | "timetable";
type WorkspaceMode = "cards" | "timetable";
type StudioTheme = "dark" | "light";

type InspectorSectionKey =
  | "componentSet"
  | "position"
  | "layout"
  | "appearance"
  | "binding"
  | "typography"
  | "statusAssets"
  | "settings"
  | "input"
  | "runtime"
  | "diagnostics";

interface NodePickerState {
  x: number;
  y: number;
  nodeIds: string[];
}

interface PendingStudioImageCrop {
  imageSrc: string;
  initialWidth: number;
  initialHeight: number;
  onApply: (croppedImageSrc: string) => void;
}

/**
 * Template Studio의 뷰 설정.
 *
 * 되돌리기가 되살리지 않는 값만 담는다. 탭, 테마, 인스펙터 접힘처럼 편집기마다
 * 낱말이 다른 값이라 공용 store 타입에 박아 넣지 않고 편집기가 정한다.
 *
 * 한 번의 조작 동안만 사는 값은 담지 않는다. 드래그 중인 레이어나 열려 있는
 * 모달은 되돌리기와도 무관하고 다른 화면이 읽지도 않는다.
 */
interface TemplateStudioView {
  panelMode: PanelMode;
  theme: StudioTheme;
  workspaceMode: WorkspaceMode;
  inspectorSections: Record<InspectorSectionKey, boolean>;
  inputScopeFilter: StudioInputScope;
  scale: number;
  collapsedLayerGroupIds: string[];
  collapsedTimetableLayerIds: string[];
  selectedTimetableLayerId: string | null;
  selectedCardStatusId: StudioTimetableStatusId;
  selectedCardComponentId: StudioTimetableComponentId;
}

interface UpdateOptions {
  history?: boolean;
}

const STUDIO_DATABASE_TARGET_LABEL =
  process.env.NEXT_PUBLIC_SUPABASE_TARGET === "local"
    ? "Local DB"
    : "Remote DB";

const STUDIO_THEMES = {
  dark: {
    "--bg": "#0a0f1a",
    "--panel": "#0e1626",
    "--field": "#131d30",
    "--border": "rgba(255,255,255,0.08)",
    "--field-border": "rgba(255,255,255,0.08)",
    "--fg": "#e8ecf3",
    "--fg2": "#8b97ab",
    "--fg3": "#5b6577",
    "--hover": "rgba(255,255,255,0.06)",
    "--canvas": "#0b1017",
    "--check": "rgba(255,255,255,0.035)",
    "--card": "#ffffff",
    "--sel": "rgba(59,130,246,0.20)",
    "--accent": "#3b82f6",
    "--inspector-scrollbar-track": "#0e1626",
    "--inspector-scrollbar-thumb": "#33415a",
    "--inspector-scrollbar-thumb-hover": "#4b5f80",
  },
  light: {
    "--bg": "#f0f0f0",
    "--panel": "#ffffff",
    "--field": "#f3f3f4",
    "--border": "#e6e6e6",
    "--field-border": "#e2e2e4",
    "--fg": "#1a1a1a",
    "--fg2": "#6b6b70",
    "--fg3": "#b3b3b8",
    "--hover": "rgba(0,0,0,0.05)",
    "--canvas": "#e9e9ec",
    "--check": "rgba(0,0,0,0.04)",
    "--card": "#ffffff",
    "--sel": "rgba(13,153,255,0.14)",
    "--accent": "#0d99ff",
    "--inspector-scrollbar-track": "#ffffff",
    "--inspector-scrollbar-thumb": "#c5cad3",
    "--inspector-scrollbar-thumb-hover": "#9ba3b1",
  },
} satisfies Record<StudioTheme, Record<string, string>>;

const DEFAULT_INSPECTOR_SECTIONS: Record<InspectorSectionKey, boolean> = {
  componentSet: true,
  position: true,
  layout: true,
  appearance: true,
  binding: true,
  typography: true,
  statusAssets: true,
  settings: true,
  input: true,
  runtime: true,
  diagnostics: false,
};

const cloneDocument = (
  document: StudioTemplateDocument,
): StudioTemplateDocument =>
  JSON.parse(JSON.stringify(document)) as StudioTemplateDocument;

const cloneRuntimeValues = (
  runtimeValues: StudioRuntimeValues,
): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(runtimeValues)) as StudioRuntimeValues;

const addRuntimeDefaultForInput = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  input: StudioInputDefinition,
): StudioRuntimeValues => {
  const defaultValue = getStudioInputDefaultValue(input);

  if (input.scope === "global") {
    return {
      ...values,
      global: {
        ...values.global,
        [input.id]: values.global[input.id] ?? defaultValue,
      },
    };
  }

  const dayIds = document.domains?.timetable?.dayIds ?? [];

  if (input.scope === "day") {
    return {
      ...values,
      days: Object.fromEntries(
        dayIds.map((dayId) => [
          dayId,
          {
            ...(values.days[dayId] ?? {}),
            [input.id]: values.days[dayId]?.[input.id] ?? defaultValue,
          },
        ]),
      ),
    };
  }

  return {
    ...values,
    entries: Object.fromEntries(
      dayIds.map((dayId) => [
        dayId,
        (values.entries[dayId] ?? []).map((entryValues) => ({
          ...entryValues,
          [input.id]: entryValues[input.id] ?? defaultValue,
        })),
      ]),
    ),
  };
};

const replaceRuntimeInputValue = (
  values: StudioRuntimeValues,
  inputId: string,
  previousValue: string,
  nextValue: string,
): StudioRuntimeValues => ({
  ...values,
  global: Object.fromEntries(
    Object.entries(values.global).map(([currentInputId, value]) => [
      currentInputId,
      currentInputId === inputId && value === previousValue ? nextValue : value,
    ]),
  ),
  days: Object.fromEntries(
    Object.entries(values.days).map(([dayId, dayValues]) => [
      dayId,
      Object.fromEntries(
        Object.entries(dayValues).map(([currentInputId, value]) => [
          currentInputId,
          currentInputId === inputId && value === previousValue
            ? nextValue
            : value,
        ]),
      ),
    ]),
  ),
  entries: Object.fromEntries(
    Object.entries(values.entries).map(([dayId, entries]) => [
      dayId,
      entries.map((entryValues) =>
        Object.fromEntries(
          Object.entries(entryValues).map(([currentInputId, value]) => [
            currentInputId,
            currentInputId === inputId && value === previousValue
              ? nextValue
              : value,
          ]),
        ),
      ),
    ]),
  ),
});

const getStudioEditableNodeIds = (document: StudioTemplateDocument): string[] =>
  Object.keys(document.graph.nodes).filter(
    (nodeId) =>
      !document.graph.rootNodeIds.includes(nodeId) &&
      document.domains?.timetable?.mountNodeId !== nodeId,
  );

const normalizeStudioDimension = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Number(value.toFixed(2)));
};

const normalizeRuntimeValuesForTimetableCapabilities = (
  values: StudioRuntimeValues,
  capabilities: ReturnType<typeof getStudioTimetableCapabilities>,
): StudioRuntimeValues => ({
  ...values,
  timetable: {
    ...values.timetable,
    entriesByDay: Object.fromEntries(
      Object.entries(values.timetable.entriesByDay).map(([dayId, entries]) => [
        dayId,
        entries.map((entry) => {
          if (!capabilities.multi.enabled && entry.statusId === "multi") {
            return { ...entry, statusId: "online" };
          }

          if (
            !capabilities.offlineMemo.enabled &&
            entry.statusId === "offlineMemo"
          ) {
            return { ...entry, statusId: "offline" };
          }

          return entry;
        }),
      ]),
    ),
  },
});

interface TemplateStudioClientProps {
  initialRemoteTemplateId?: string | null;
}

export function TemplateStudioClient({
  initialRemoteTemplateId = null,
}: TemplateStudioClientProps) {
  const router = useRouter();
  const studioStoreRef = useRef<StudioEditorStore<TemplateStudioView> | null>(
    null,
  );
  if (!studioStoreRef.current) {
    studioStoreRef.current = createStudioEditorStore<TemplateStudioView>({
      document: createSampleStudioDocument(),
      runtimeValues: createInitialStudioRuntimeValues(
        createSampleStudioDocument(),
      ),
      selectedNodeIds: ["node_c3"],
      selectedRuntimeDayId: "mon",
      view: {
        panelMode: "layers",
        theme: "dark",
        workspaceMode: "cards",
        inspectorSections: DEFAULT_INSPECTOR_SECTIONS,
        inputScopeFilter: "global",
        scale: 0.8,
        collapsedLayerGroupIds: [],
        collapsedTimetableLayerIds: [],
        selectedTimetableLayerId: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
        selectedCardStatusId: "online",
        selectedCardComponentId: "",
      },
    });
  }
  const studioStore = studioStoreRef.current;
  const document = useStore(studioStore, (state) => state.document);
  const runtimeValues = useStore(studioStore, (state) => state.runtimeValues);
  const selectedInputId = useStore(
    studioStore,
    (state) => state.selectedInputId,
  );
  const selectedRuntimeDayId = useStore(
    studioStore,
    (state) => state.selectedRuntimeDayId,
  );
  const selectedRuntimeEntryIndex = useStore(
    studioStore,
    (state) => state.selectedRuntimeEntryIndex,
  );
  const {
    setDocument,
    setRuntimeValues,
    setSelectedInputId,
    setSelectedRuntimeDayId,
    setSelectedRuntimeEntryIndex,
  } = studioStore.getState();
  const {
    panelMode,
    theme,
    workspaceMode,
    inspectorSections,
    inputScopeFilter,
    scale,
    collapsedLayerGroupIds,
    collapsedTimetableLayerIds,
    selectedTimetableLayerId,
    selectedCardStatusId,
    selectedCardComponentId,
  } = useStore(studioStore, (state) => state.view);
  const {
    setPanelMode,
    setTheme,
    setWorkspaceMode,
    setInspectorSections,
    setInputScopeFilter,
    setScale,
    setCollapsedLayerGroupIds,
    setCollapsedTimetableLayerIds,
    setSelectedTimetableLayerId,
    setSelectedCardStatusId,
    setSelectedCardComponentId,
  } = useMemo(
    () => ({
      setPanelMode: createStudioViewSetter(studioStore, "panelMode"),
      setTheme: createStudioViewSetter(studioStore, "theme"),
      setWorkspaceMode: createStudioViewSetter(studioStore, "workspaceMode"),
      setInspectorSections: createStudioViewSetter(
        studioStore,
        "inspectorSections",
      ),
      setInputScopeFilter: createStudioViewSetter(
        studioStore,
        "inputScopeFilter",
      ),
      setScale: createStudioViewSetter(studioStore, "scale"),
      setCollapsedLayerGroupIds: createStudioViewSetter(
        studioStore,
        "collapsedLayerGroupIds",
      ),
      setCollapsedTimetableLayerIds: createStudioViewSetter(
        studioStore,
        "collapsedTimetableLayerIds",
      ),
      setSelectedTimetableLayerId: createStudioViewSetter(
        studioStore,
        "selectedTimetableLayerId",
      ),
      setSelectedCardStatusId: createStudioViewSetter(
        studioStore,
        "selectedCardStatusId",
      ),
      setSelectedCardComponentId: createStudioViewSetter(
        studioStore,
        "selectedCardComponentId",
      ),
    }),
    [studioStore],
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [stylePropagationOpen, setStylePropagationOpen] = useState(false);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
  const [pendingImageCrop, setPendingImageCrop] =
    useState<PendingStudioImageCrop | null>(null);
  const [shortcutMessage, setShortcutMessage] = useState<string | null>(null);
  const [remoteTemplateId, setRemoteTemplateId] = useState<string | null>(
    initialRemoteTemplateId,
  );
  const [componentLabelDraft, setComponentLabelDraft] = useState("");
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoadedRemoteTemplateIdRef = useRef<string | null>(null);
  const visibleLayerNodeIdsRef = useRef<string[]>([]);
  const {
    selectedNodeId,
    selectedNodeIds,
    applySelection: applyNodeSelection,
    selectSingleNode,
    toggleNodeSelection,
    selectNodeRange: selectLayerNodeRange,
    restoreSelection,
  } = useStudioSelection({
    getVisibleNodeIds: useCallback(() => visibleLayerNodeIdsRef.current, []),
    onStatusMessage: setShortcutMessage,
    store: studioStore,
  });
  const templateStudioTemplateQuery = useTemplateStudioTemplate(
    remoteTemplateId ?? undefined,
  );
  const createTemplateStudioTemplateMutation =
    useCreateTemplateStudioTemplate();
  const saveTemplateStudioDraftMutation = useSaveTemplateStudioDraft();
  const publishTemplateStudioDocumentMutation =
    usePublishTemplateStudioDocument();
  const syncTemplateStudioAssetsMutation = useSyncTemplateStudioAssets();

  useEffect(() => {
    const nextTemplateId = initialRemoteTemplateId ?? null;
    setRemoteTemplateId(nextTemplateId);
    autoLoadedRemoteTemplateIdRef.current = null;
  }, [initialRemoteTemplateId]);

  const nodes = document.graph.nodes;
  const selectedNode = selectedNodeId ? (nodes[selectedNodeId] ?? null) : null;
  const selectedNodeIdsSet = useMemo(
    () => new Set(selectedNodeIds),
    [selectedNodeIds],
  );
  const inputs = useMemo(
    () => Object.values(document.inputs),
    [document.inputs],
  );
  const selectedInput = selectedInputId
    ? (document.inputs[selectedInputId] ?? null)
    : null;
  const filteredInputs = useMemo(
    () => inputs.filter((input) => input.scope === inputScopeFilter),
    [inputScopeFilter, inputs],
  );
  const runtimeInputsByScope = useMemo(
    () => ({
      global: getStudioInputsForScope(document, "global"),
      day: getStudioInputsForScope(document, "day"),
      entry: getStudioInputsForScope(document, "entry"),
    }),
    [document],
  );
  const timetableDays = useMemo(() => {
    const timetable = document.domains?.timetable;
    if (!timetable) return [];

    return timetable.dayIds
      .map((dayId) => timetable.days[dayId])
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }, [document.domains]);
  const isRemoteSyncing =
    createTemplateStudioTemplateMutation.isPending ||
    saveTemplateStudioDraftMutation.isPending ||
    publishTemplateStudioDocumentMutation.isPending ||
    syncTemplateStudioAssetsMutation.isPending ||
    templateStudioTemplateQuery.isFetching;
  const timetableComposition = useMemo(
    () => getStudioTimetableComposition(document.domains?.timetable),
    [document.domains?.timetable],
  );
  const cardStatusOptions = useMemo(
    () => getStudioAvailableTimetableStatuses(document),
    [document],
  );
  const cardComponentOptions = useMemo(
    () => Object.values(document.domains?.timetable?.components ?? {}),
    [document.domains?.timetable?.components],
  );
  const activeCardComponentId = useMemo(() => {
    const timetable = document.domains?.timetable;
    if (!timetable) return "";
    if (timetable.components[selectedCardComponentId]) {
      return selectedCardComponentId;
    }
    if (timetable.components[timetable.entryComponentId]) {
      return timetable.entryComponentId;
    }
    return cardComponentOptions[0]?.id ?? "";
  }, [
    cardComponentOptions,
    document.domains?.timetable,
    selectedCardComponentId,
  ]);
  const cardEntryComponent = activeCardComponentId
    ? document.domains?.timetable?.components[activeCardComponentId]
    : undefined;
  const cardComponentDeleteReason = activeCardComponentId
    ? getStudioTimetableComponentSetDeleteReason(
        document,
        activeCardComponentId,
      )
    : "Component set is missing";
  const selectedCardVariantResolution = useMemo(
    () =>
      resolveStudioTimetableComponentVariant(
        document,
        cardEntryComponent,
        selectedCardStatusId,
      ),
    [cardEntryComponent, document, selectedCardStatusId],
  );
  const selectedCardVariantRootId =
    selectedCardVariantResolution?.variant.rootNodeId ?? null;
  const cardAuthoringRootNodeIds = selectedCardVariantRootId
    ? [selectedCardVariantRootId]
    : document.graph.rootNodeIds;
  useEffect(() => {
    if (selectedCardComponentId !== activeCardComponentId) {
      setSelectedCardComponentId(activeCardComponentId);
    }
  }, [
    activeCardComponentId,
    selectedCardComponentId,
    setSelectedCardComponentId,
  ]);
  useEffect(() => {
    setComponentLabelDraft(cardEntryComponent?.label ?? "");
  }, [cardEntryComponent?.id, cardEntryComponent?.label]);
  useEffect(() => {
    if (
      cardStatusOptions.some((status) => status.id === selectedCardStatusId)
    ) {
      return;
    }

    setSelectedCardStatusId(cardStatusOptions[0]?.id ?? "online");
  }, [cardStatusOptions, selectedCardStatusId, setSelectedCardStatusId]);
  const cardPresetGroups = useMemo(
    () =>
      getStudioPresetGroups(document, "cards", {
        cardRootNodeId: selectedCardVariantRootId,
      }),
    [document, selectedCardVariantRootId],
  );
  const timetablePresetGroups = useMemo(
    () => getStudioPresetGroups(document, "timetable"),
    [document],
  );
  const timetablePickerNodes = useMemo<Record<string, StudioPickerNode>>(() => {
    const pickerNodes = Object.fromEntries(
      Object.values(timetableComposition.objects).map((object) => [
        object.id,
        {
          id: object.id,
          label: object.label,
          typeLabel:
            object.kind === "generatedDayCards"
              ? "Generated Cards"
              : object.kind === "flexibleText"
                ? "Auto Text"
                : object.kind[0].toUpperCase() + object.kind.slice(1),
          parentId: object.parentId,
          childIds: [...getStudioTimetableObjectRenderableChildIds(object)],
        },
      ]),
    );
    const dayCardChildIds = timetableDays.map((day) => `day-card:${day.id}`);
    const dayCardsNode = pickerNodes[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];
    if (dayCardsNode) dayCardsNode.childIds = dayCardChildIds;

    timetableDays.forEach((day) => {
      const nodeId = `day-card:${day.id}`;
      pickerNodes[nodeId] = {
        id: nodeId,
        label: `${day.shortLabel ?? day.label} Card`,
        typeLabel: "Day Card",
        parentId: STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
        childIds: [],
      };
    });

    return pickerNodes;
  }, [timetableComposition.objects, timetableDays]);
  const timetableSelection = useMemo(
    () =>
      resolveStudioTimetableSelection(
        document,
        timetableComposition,
        selectedTimetableLayerId,
      ),
    [document, selectedTimetableLayerId, timetableComposition],
  );
  const {
    object: selectedTimetableCompositionObject,
    dayId: selectedTimetableDayId,
    day: selectedTimetableDay,
  } = timetableSelection;
  const getTimetableEntryCardSizeForDay = useCallback(
    (dayId: StudioTimetableDayId) =>
      getStudioTimetableEntryCardSize(
        document,
        getStudioTimetableDayComponent(document, dayId),
      ),
    [document],
  );
  const activeRuntimeDayId = timetableDays.some(
    (day) => day.id === selectedRuntimeDayId,
  )
    ? selectedRuntimeDayId
    : (timetableDays[0]?.id ?? "");
  const activeRuntimeDay = timetableDays.find(
    (day) => day.id === activeRuntimeDayId,
  );
  const selectedTimetableLayerLabel = useMemo(() => {
    if (!selectedTimetableLayerId) return "Timetable Composition";
    const object = timetableComposition.objects[selectedTimetableLayerId];
    if (object) return object.label;

    const dayId = selectedTimetableLayerId.replace(/^day-card:/, "");
    const day = timetableDays.find((currentDay) => currentDay.id === dayId);
    return day ? `${day.shortLabel ?? day.label} Card` : "Timetable Layer";
  }, [selectedTimetableLayerId, timetableComposition.objects, timetableDays]);
  const maxRuntimeEntries =
    getStudioTimetableEffectiveMaxEntriesPerDay(document);
  const activeRuntimeEntries = activeRuntimeDayId
    ? getStudioTimetableEntriesForDay(
        document,
        runtimeValues,
        activeRuntimeDayId,
      )
    : [];
  const activeRuntimeEntryIndex = Math.min(
    selectedRuntimeEntryIndex,
    Math.max(0, activeRuntimeEntries.length - 1),
  );
  const activeRuntimeEntry =
    activeRuntimeEntries[activeRuntimeEntryIndex] ?? null;
  const cardAuthoringRuntimeValues = useMemo(() => {
    if (!activeRuntimeDayId || !activeRuntimeEntry) return runtimeValues;

    const dayEntries =
      runtimeValues.timetable.entriesByDay[activeRuntimeDayId] ?? [];
    const selectedEntry =
      dayEntries[activeRuntimeEntryIndex] ?? activeRuntimeEntry;
    const authoringEntries =
      selectedCardStatusId === "multi"
        ? [
            { ...selectedEntry, statusId: "multi" },
            {
              ...(dayEntries.find(
                (_, index) => index !== activeRuntimeEntryIndex,
              ) ?? selectedEntry),
              id: dayEntries[1]?.id ?? `${activeRuntimeDayId}-entry-preview-2`,
              mainTitle: dayEntries[1]?.mainTitle ?? "Entry 2",
              statusId: "multi",
            },
          ]
        : [{ ...selectedEntry, statusId: selectedCardStatusId }];
    const customEntryValues = runtimeValues.entries[activeRuntimeDayId] ?? [];
    return {
      ...runtimeValues,
      entries: {
        ...runtimeValues.entries,
        [activeRuntimeDayId]:
          selectedCardStatusId === "multi"
            ? [
                { ...(customEntryValues[activeRuntimeEntryIndex] ?? {}) },
                {
                  ...(customEntryValues.find(
                    (_, index) => index !== activeRuntimeEntryIndex,
                  ) ?? {}),
                },
              ]
            : [{ ...(customEntryValues[activeRuntimeEntryIndex] ?? {}) }],
      },
      timetable: {
        ...runtimeValues.timetable,
        entriesByDay: {
          ...runtimeValues.timetable.entriesByDay,
          [activeRuntimeDayId]: authoringEntries,
        },
        offlineMemoByDay: {
          ...(runtimeValues.timetable.offlineMemoByDay ?? {}),
          [activeRuntimeDayId]:
            selectedCardStatusId === "offlineMemo"
              ? runtimeValues.timetable.offlineMemoByDay?.[
                  activeRuntimeDayId
                ] || "Offline memo"
              : (runtimeValues.timetable.offlineMemoByDay?.[
                  activeRuntimeDayId
                ] ?? ""),
        },
      },
    };
  }, [
    activeRuntimeDayId,
    activeRuntimeEntry,
    activeRuntimeEntryIndex,
    runtimeValues,
    selectedCardStatusId,
  ]);
  const selectedTimetableLayerGeometry = useMemo(() => {
    const timetable = document.domains?.timetable;
    if (!timetable || !selectedTimetableLayerId) return null;

    const layout = getStudioTimetableDayCardsLayout(timetable);
    const compositionObject =
      timetableComposition.objects[selectedTimetableLayerId];

    if (isStudioPlacedTimetableCompositionObject(compositionObject)) {
      return resolveStudioTimetableObjectGeometry(
        timetableComposition,
        compositionObject.id,
        getStudioTimetablePreviewSize(timetable),
      );
    }

    if (selectedTimetableLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
      return getStudioTimetableDayCardsBounds(
        layout,
        timetableDays,
        (dayId) =>
          getStudioTimetableEntriesForDay(document, runtimeValues, dayId)
            .length,
        getTimetableEntryCardSizeForDay,
      );
    }

    if (!selectedTimetableLayerId.startsWith("day-card:")) return null;

    const dayId = selectedTimetableLayerId.replace(
      /^day-card:/,
      "",
    ) as StudioTimetableDayId;
    const dayIndex = timetableDays.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return null;

    return (
      getStudioTimetableDayCardGeometries(
        layout,
        timetableDays,
        (currentDayId) =>
          getStudioTimetableEntriesForDay(document, runtimeValues, currentDayId)
            .length,
        getTimetableEntryCardSizeForDay,
      )[dayId] ??
      getStudioTimetableDayCardGeometry(
        layout,
        dayId,
        dayIndex,
        getStudioTimetableEntriesForDay(document, runtimeValues, dayId).length,
        getTimetableEntryCardSizeForDay(dayId),
      )
    );
  }, [
    document,
    runtimeValues,
    selectedTimetableLayerId,
    timetableComposition,
    getTimetableEntryCardSizeForDay,
    timetableDays,
  ]);
  const statusOptions = useMemo(
    () => getStudioAvailableTimetableStatuses(document),
    [document],
  );
  const canPreviewTimetable =
    Boolean(document.domains?.timetable) && timetableDays.length > 0;
  const activeWorkspaceMode: WorkspaceMode =
    workspaceMode === "timetable" && canPreviewTimetable
      ? "timetable"
      : "cards";
  const activeObjectCount =
    activeWorkspaceMode === "timetable"
      ? timetableComposition.rootObjectIds.length
      : Object.keys(document.graph.nodes).length;
  const previewCanvasSize =
    activeWorkspaceMode === "timetable"
      ? getStudioTimetablePreviewSize(document.domains?.timetable)
      : {
          width: document.canvas.width,
          height: document.canvas.height,
        };
  const cardsGuide = getStudioCardsGuide(document);
  const cardsGuideAsset = cardsGuide.assetId
    ? document.assets[cardsGuide.assetId]
    : null;
  const timetableGuide = getStudioTimetableGuide(document);
  const timetableGuideAsset = timetableGuide.assetId
    ? document.assets[timetableGuide.assetId]
    : null;
  const activeGuide =
    activeWorkspaceMode === "cards" ? cardsGuide : timetableGuide;
  const activeGuideAsset =
    activeWorkspaceMode === "cards" ? cardsGuideAsset : timetableGuideAsset;
  const activePanelMode: PanelMode =
    activeWorkspaceMode === "timetable" && panelMode === "timetable"
      ? "layers"
      : panelMode;
  const isInputPanelActive = activePanelMode === "inputs";
  // 좌측 패널 탭은 시간표 도메인이 소유한다. 공통 프레임은 목록만 받는다.
  const cardsPanelTabs = useMemo<StudioPanelTab[]>(() => {
    const tabs: StudioPanelTab[] = [
      { id: "layers", label: "Layers", icon: <Layers3 size={14} /> },
      { id: "presets", label: "Presets", icon: <Plus size={14} /> },
      { id: "inputs", label: "Inputs", icon: <ListChecks size={14} /> },
    ];
    if (activeWorkspaceMode === "cards") {
      tabs.push({
        id: "timetable",
        label: "Table",
        icon: <CalendarDays size={14} />,
      });
    }
    return tabs;
  }, [activeWorkspaceMode]);
  const assets = useMemo(
    () => Object.values(document.assets),
    [document.assets],
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
  const inputConsumers = useMemo(
    () => collectStudioInputConsumers(document, timetableComposition),
    [document, timetableComposition],
  );
  const diagnostics = useMemo(
    () => [
      ...validateStudioDocument(document),
      ...validateStudioRuntimeValuesForDocument(document, runtimeValues),
    ],
    [document, runtimeValues],
  );
  const selectedNodeBindingInputId = selectedNode
    ? getStudioBindingInputId(selectedNode.binding)
    : null;
  const selectedNodeBoundInput = selectedNodeBindingInputId
    ? (document.inputs[selectedNodeBindingInputId] ?? null)
    : null;
  const selectedNodeBuiltinField =
    selectedNode?.binding?.kind === "builtinField"
      ? getStudioBuiltinField(selectedNode.binding.fieldId)
      : null;
  const themeStyle = useMemo(
    () => STUDIO_THEMES[theme] as React.CSSProperties,
    [theme],
  );
  const collapsedLayerGroupIdsSet = useMemo(
    () => new Set(collapsedLayerGroupIds),
    [collapsedLayerGroupIds],
  );
  const visibleLayerNodeIds = useMemo(() => {
    const nextNodeIds: string[] = [];

    const collectNodeIds = (nodeIds: string[]) => {
      getStudioLayerPanelOrder(nodeIds).forEach((nodeId) => {
        const node = document.graph.nodes[nodeId];
        if (!node) return;

        nextNodeIds.push(nodeId);

        if (node.type === "group" && !collapsedLayerGroupIdsSet.has(nodeId)) {
          collectNodeIds(node.childIds);
        }
      });
    };

    collectNodeIds(document.graph.rootNodeIds);
    return nextNodeIds;
  }, [
    collapsedLayerGroupIdsSet,
    document.graph.nodes,
    document.graph.rootNodeIds,
  ]);

  useEffect(() => {
    visibleLayerNodeIdsRef.current = visibleLayerNodeIds;
  }, [visibleLayerNodeIds]);

  const showShortcutStatus = useCallback((message: string) => {
    setShortcutMessage(message);
  }, []);

  const jumpToInput = useCallback(
    (inputId: StudioInputId) => {
      const input = studioStore.getState().document.inputs[inputId];

      if (!input) {
        showShortcutStatus("Input no longer exists");
        return;
      }

      setSelectedInputId(inputId);
      setInputScopeFilter(input.scope);
      setPanelMode("inputs");
      showShortcutStatus(`Selected input: ${input.label}`);
    },
    [
      setInputScopeFilter,
      setPanelMode,
      setSelectedInputId,
      showShortcutStatus,
      studioStore,
    ],
  );

  const jumpToInputConsumer = useCallback(
    (consumer: StudioInputConsumerReference) => {
      setNodePicker(null);

      if (consumer.workspaceMode === "cards") {
        const node =
          studioStore.getState().document.graph.nodes[consumer.targetId];

        if (!node) {
          showShortcutStatus("Consumer object no longer exists");
          return;
        }

        const ancestorIds: string[] = [];
        let parentId = node.parentId;
        while (parentId) {
          ancestorIds.push(parentId);
          parentId =
            studioStore.getState().document.graph.nodes[parentId]?.parentId ??
            null;
        }

        setWorkspaceMode("cards");
        setPanelMode("layers");
        setCollapsedLayerGroupIds((currentNodeIds) =>
          currentNodeIds.filter((nodeId) => !ancestorIds.includes(nodeId)),
        );
        selectSingleNode(node.id);
        showShortcutStatus(`Selected object: ${node.label}`);
        return;
      }

      const composition = getStudioTimetableComposition(
        studioStore.getState().document.domains?.timetable,
      );
      const object = composition.objects[consumer.targetId];

      if (!object) {
        showShortcutStatus("Consumer object no longer exists");
        return;
      }

      setWorkspaceMode("timetable");
      setPanelMode("layers");
      selectSingleNode(null);
      setSelectedTimetableLayerId(object.id);
      showShortcutStatus(`Selected object: ${object.label}`);
    },
    [
      selectSingleNode,
      setCollapsedLayerGroupIds,
      setPanelMode,
      setSelectedTimetableLayerId,
      setWorkspaceMode,
      showShortcutStatus,
      studioStore,
    ],
  );

  const toggleLayerGroupCollapsed = useCallback(
    (nodeId: string) => {
      setCollapsedLayerGroupIds((currentNodeIds) =>
        currentNodeIds.includes(nodeId)
          ? currentNodeIds.filter((currentNodeId) => currentNodeId !== nodeId)
          : [...currentNodeIds, nodeId],
      );
    },
    [setCollapsedLayerGroupIds],
  );

  const toggleTimetableLayerCollapsed = useCallback(
    (layerId: string) => {
      setCollapsedTimetableLayerIds((currentLayerIds) =>
        currentLayerIds.includes(layerId)
          ? currentLayerIds.filter(
              (currentLayerId) => currentLayerId !== layerId,
            )
          : [...currentLayerIds, layerId],
      );
    },
    [setCollapsedTimetableLayerIds],
  );

  const selectAllEditableNodes = useCallback(() => {
    const nodeIds = getStudioEditableNodeIds(studioStore.getState().document);
    if (nodeIds.length === 0) {
      showShortcutStatus("No editable objects");
      return;
    }

    applyNodeSelection(nodeIds, studioStore.getState().selectedNodeId);
    setPanelMode("layers");
    showShortcutStatus(`Selected ${nodeIds.length} objects`);
  }, [applyNodeSelection, setPanelMode, showShortcutStatus, studioStore]);

  const createHistorySnapshot = useCallback(
    (): StudioEditorSnapshot =>
      captureStudioEditorSnapshot(studioStore.getState()),
    [studioStore],
  );

  const restoreHistorySnapshot = useCallback(
    (snapshot: StudioEditorSnapshot) => {
      studioStore.getState().restoreSnapshot(snapshot);
      setNodePicker(null);
    },
    [studioStore],
  );

  const {
    capture: captureHistory,
    undo: undoDocumentHistory,
    redo: redoDocumentHistory,
  } = useStudioDocumentHistory({
    createSnapshot: createHistorySnapshot,
    restoreSnapshot: restoreHistorySnapshot,
  });

  const undoEditorState = useCallback(() => {
    showShortcutStatus(undoDocumentHistory() ? "Undo" : "Nothing to undo");
  }, [showShortcutStatus, undoDocumentHistory]);

  const redoEditorState = useCallback(() => {
    showShortcutStatus(redoDocumentHistory() ? "Redo" : "Nothing to redo");
  }, [redoDocumentHistory, showShortcutStatus]);

  /**
   * 문서 한 벌을 갈아끼운다.
   *
   * 불러오기와 JSON 가져오기가 같은 함수를 쓴다. 한쪽에만 초기화를 더하면 두
   * 경로에서 편집기 상태가 달라진다.
   */
  const replaceEditorDocument = useCallback(
    (
      nextDocument: StudioTemplateDocument,
      nextRuntimeValues: StudioRuntimeValues,
      message: string,
    ) => {
      const normalizedRuntimeValues =
        normalizeRuntimeValuesForTimetableCapabilities(
          cloneRuntimeValues(nextRuntimeValues),
          getStudioTimetableCapabilities(nextDocument.domains?.timetable),
        );
      const nextSelectedNodeId = nextDocument.graph.rootNodeIds[0] ?? null;
      const nextSelectedInputId = Object.keys(nextDocument.inputs)[0] ?? null;
      const nextRuntimeDayId =
        nextDocument.domains?.timetable?.dayIds[0] ?? "mon";

      captureHistory();

      studioStore.getState().selectedInputId = nextSelectedInputId;
      studioStore.getState().selectedRuntimeDayId = nextRuntimeDayId;
      studioStore.getState().selectedRuntimeEntryIndex = 0;

      setDocument(nextDocument);
      setRuntimeValues(normalizedRuntimeValues);
      restoreSelection(
        nextSelectedNodeId ? [nextSelectedNodeId] : [],
        nextSelectedNodeId,
      );
      setSelectedInputId(nextSelectedInputId);
      setSelectedRuntimeDayId(nextRuntimeDayId);
      setSelectedRuntimeEntryIndex(0);
      setWorkspaceMode("cards");
      setPanelMode("layers");
      setSelectedTimetableLayerId(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
      setCollapsedLayerGroupIds([]);
      setCollapsedTimetableLayerIds([]);
      setNodePicker(null);
      showShortcutStatus(message);
    },
    [
      captureHistory,
      restoreSelection,
      setCollapsedLayerGroupIds,
      setCollapsedTimetableLayerIds,
      setDocument,
      setPanelMode,
      setRuntimeValues,
      setSelectedInputId,
      setSelectedRuntimeDayId,
      setSelectedRuntimeEntryIndex,
      setSelectedTimetableLayerId,
      setWorkspaceMode,
      showShortcutStatus,
      studioStore,
    ],
  );

  const {
    exportJson: exportStudioJson,
    importJsonFile: importStudioJsonFile,
    loadRemoteTemplate,
    saveDraft: saveDatabaseDraft,
    publish: publishRemoteDocument,
    openDraftPreview: openRuntimeDraftPreview,
    openSavedPreview,
  } = useStudioTemplatePersistence({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getRuntimeValues: useCallback(
      () => studioStore.getState().runtimeValues,
      [studioStore],
    ),
    setDocument,
    templateId: remoteTemplateId,
    onTemplateIdChange: setRemoteTemplateId,
    initialTemplateId: initialRemoteTemplateId,
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
    onStatusMessage: showShortcutStatus,
    // 무엇이 내보내기를 막았는지 보여줘야 고칠 수 있다.
    onExportBlocked: useCallback(
      () =>
        setInspectorSections((currentSections) => ({
          ...currentSections,
          diagnostics: true,
        })),
      [setInspectorSections],
    ),
  });

  const updateDocument = useCallback(
    (
      updater: (nextDocument: StudioTemplateDocument) => void,
      options: UpdateOptions = {},
    ) => {
      if (options.history !== false) {
        captureHistory();
      }

      const nextDocument = cloneDocument(studioStore.getState().document);
      updater(nextDocument);
      applyStudioTimetableComponentFrames(nextDocument);
      setDocument(nextDocument);
    },
    [captureHistory, setDocument, studioStore],
  );

  const updateNode = useCallback(
    (
      nodeId: string,
      updater: (
        node: StudioGraphNode,
        nextDocument: StudioTemplateDocument,
      ) => void,
      options: UpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const node = nextDocument.graph.nodes[nodeId];
        if (!node) return;
        updater(node, nextDocument);
      }, options);
    },
    [updateDocument],
  );

  const updateSelectedNodeStyle = (
    key: string,
    value: string | number | undefined,
  ) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, (node, nextDocument) => {
      applyStudioNodeStyleValue(nextDocument, node, key, value);
    });
  };
  const updateSelectedNodeTextAlignment = (textAlign: StudioTextAlignment) => {
    if (!selectedNode) return;
    updateNode(selectedNode.id, (node, nextDocument) => {
      applyStudioNodeTextAlignment(nextDocument, node, textAlign);
    });
  };
  const applySelectedNodeStyleToStatuses = (options: {
    targetStatusIds: StudioTimetableStatusId[];
    scope: StudioVariantStyleScope;
    includeDescendants: boolean;
    applyToAllMultiSlots: boolean;
  }) => {
    if (!selectedNode || !cardEntryComponent) return;

    let outcome = {
      appliedNodeCount: 0,
      appliedStatusCount: 0,
      skippedStatusCount: 0,
    };

    updateDocument((nextDocument) => {
      const nextComponent =
        nextDocument.domains?.timetable?.components[cardEntryComponent.id];
      if (!nextComponent) return;

      const result = applyStudioVariantStyle(nextDocument, {
        component: nextComponent,
        sourceNodeId: selectedNode.id,
        sourceStatusId: selectedCardStatusId,
        ...options,
      });

      outcome = {
        appliedNodeCount: result.appliedNodeCount,
        appliedStatusCount: result.appliedStatusIds.length,
        skippedStatusCount: result.skippedStatusIds.length,
      };
    });

    setStylePropagationOpen(false);
    showShortcutStatus(getStudioVariantStyleMessage(outcome));
  };
  const toggleSelectedNodeFitParent = () => {
    if (!selectedNode) return;

    const shouldFillParent = !isStudioFillParentLayout(selectedNode.layoutMode);
    const resolvedGeometry = resolveStudioGraphNodeGeometry(
      document,
      selectedNode.id,
    );

    updateNode(selectedNode.id, (node, nextDocument) => {
      applyStudioNodeFitParent(
        nextDocument,
        node,
        shouldFillParent,
        resolvedGeometry,
      );
    });
  };
  const updateCardCanvasSize = (nextSize: {
    width?: number;
    height?: number;
    background?: string;
  }) => {
    updateDocument((nextDocument) => {
      nextDocument.canvas = {
        ...nextDocument.canvas,
        width: normalizeStudioDimension(
          nextSize.width ?? nextDocument.canvas.width,
          nextDocument.canvas.width,
        ),
        height: normalizeStudioDimension(
          nextSize.height ?? nextDocument.canvas.height,
          nextDocument.canvas.height,
        ),
        background: nextSize.background ?? nextDocument.canvas.background,
      };
    });
  };

  const updateWebFonts = (webFonts: StudioWebFontSource[]) => {
    updateDocument((nextDocument) => {
      nextDocument.resources = {
        ...nextDocument.resources,
        webFonts,
      };
    });
  };

  const moveCanvasNode = (
    nodeId: string,
    delta: { deltaX: number; deltaY: number },
  ) => {
    const targetNodeIds = resolveStudioDragTargetNodeIds(
      studioStore.getState().document,
      studioStore.getState().selectedNodeIds,
      nodeId,
    );

    updateDocument(
      (nextDocument) => {
        applyStudioNodeOffset(nextDocument, targetNodeIds, delta, {
          round: true,
          skipFillParent: true,
        });
      },
      { history: false },
    );
  };
  const moveNodeByKeyboard = useCallback(
    (nodeIds: string[], deltaX: number, deltaY: number) => {
      const targetNodeIds = getStudioTopLevelNodeIds(
        studioStore.getState().document,
        nodeIds,
      );
      if (targetNodeIds.length === 0) return;

      updateDocument((nextDocument) => {
        applyStudioNodeOffset(nextDocument, targetNodeIds, {
          deltaX,
          deltaY,
        });
      });
    },
    [studioStore, updateDocument],
  );
  const addNode = (type: StudioGraphNodeType) => {
    const plan = planStudioAddNode(document, type, selectedNode);

    updateDocument((nextDocument) => {
      applyStudioInsertNode(nextDocument, plan);
    });

    selectSingleNode(plan.node.id);
    setPanelMode("layers");
  };

  const addInput = (type: StudioInputType) => {
    const input = createStudioInputDefinition(type, inputScopeFilter);

    updateDocument((nextDocument) => {
      nextDocument.inputs[input.id] = input;
    });
    setRuntimeValues((currentValues) =>
      addRuntimeDefaultForInput(document, currentValues, input),
    );
    setSelectedInputId(input.id);
    setPanelMode("inputs");
  };
  const getCardInsertionParentId = (): string | null =>
    resolveStudioNodeInsertionParentId(document, selectedNode);

  const addSelectConsumerForInput = (
    input: StudioInputDefinition,
    kind: "text" | "image",
  ) => {
    if (input.type !== "select") return;

    const parentId = getCardInsertionParentId();
    const inserted: { nodeId: string | null } = { nodeId: null };

    updateDocument((nextDocument) => {
      const currentInput = nextDocument.inputs[input.id];
      if (!currentInput || currentInput.type !== "select") return;

      inserted.nodeId = createStudioSelectConsumerNode(nextDocument, {
        parentId,
        input: currentInput,
        kind,
        label:
          kind === "image"
            ? `${currentInput.label} Image`
            : `${currentInput.label} Label`,
      });
    });

    if (!inserted.nodeId) return;

    selectSingleNode(inserted.nodeId);
    setPanelMode("layers");
    showShortcutStatus(`Added ${kind === "image" ? "image" : "text"} consumer`);
  };
  const requestStudioImageCrop = (
    file: File,
    initialSize: { width: number; height: number },
    onApply: (croppedImageSrc: string) => void,
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageSrc = String(reader.result ?? "");
      if (!imageSrc) return;
      setPendingImageCrop({
        imageSrc,
        initialWidth: Math.max(1, initialSize.width || 1),
        initialHeight: Math.max(1, initialSize.height || 1),
        onApply,
      });
    };
    reader.readAsDataURL(file);
  };

  const updateRuntimeInputValue = (
    input: StudioInputDefinition,
    value: string,
    context: StudioRuntimeContext = {},
  ) => {
    captureHistory();
    setRuntimeValues((currentValues) =>
      setStudioRuntimeInputValue(
        document,
        currentValues,
        input.id,
        value,
        context,
      ),
    );
  };

  const updateInput = (
    inputId: string,
    updater: (input: StudioInputDefinition) => StudioInputDefinition,
  ) => {
    updateDocument((nextDocument) => {
      const input = nextDocument.inputs[inputId];
      if (!input) return;
      nextDocument.inputs[inputId] = updater(input);
    });
  };

  const updateSelectOptionLabel = (
    inputId: string,
    optionIndex: number,
    label: string,
  ) => {
    updateInput(inputId, (currentInput) =>
      currentInput.type === "select"
        ? {
            ...currentInput,
            options: currentInput.options.map((option, index) =>
              index === optionIndex ? { ...option, label } : option,
            ),
          }
        : currentInput,
    );
  };

  const updateSelectOptionValue = (
    inputId: string,
    optionIndex: number,
    value: string,
  ) => {
    const outcome: { previousValue: string | null } = { previousValue: null };

    updateDocument((nextDocument) => {
      outcome.previousValue =
        applyStudioSelectOptionValue(nextDocument, inputId, optionIndex, value)
          ?.previousValue ?? null;
    });

    const previousValue = outcome.previousValue;
    if (previousValue === null || previousValue === value) return;

    setRuntimeValues((currentValues) =>
      replaceRuntimeInputValue(currentValues, inputId, previousValue, value),
    );
  };
  const addSelectOption = (inputId: string) => {
    updateDocument((nextDocument) => {
      applyStudioAddSelectOption(nextDocument, inputId);
    });
  };
  const removeSelectOption = (inputId: string, optionIndex: number) => {
    const outcome: {
      result: { removedValue: string; nextDefaultValue: string } | null;
    } = { result: null };

    updateDocument((nextDocument) => {
      outcome.result = applyStudioRemoveSelectOption(
        nextDocument,
        inputId,
        optionIndex,
      );
    });

    if (!outcome.result) return;

    const { removedValue, nextDefaultValue } = outcome.result;
    setRuntimeValues((currentValues) =>
      replaceRuntimeInputValue(
        currentValues,
        inputId,
        removedValue,
        nextDefaultValue,
      ),
    );
  };
  const {
    updateCompositionObject: updateTimetableCompositionObject,
    toggleObjectFitParent: toggleTimetableObjectFitParent,
    addPresetObject: addTimetablePresetObject,
    moveRootObjectLayer: moveTimetableRootObjectLayer,
    moveDayLayer: moveTimetableDayLayer,
    selectCanvasLayer: selectTimetableCanvasLayer,
    updateLayerPosition: updateTimetableLayerPosition,
    updateDayCardsLayout: updateTimetableDayCardsLayout,
    moveCanvasLayer: moveTimetableCanvasLayer,
    resolveDragLayerId: resolveTimetableDragLayerId,
    selectCardComponent,
    duplicateSelectedCardComponent,
    commitSelectedCardComponentLabel,
    deleteSelectedCardComponent,
    assignComponentSetToSelectedDay,
    updateTimetableCanvasSize,
    addCardContextObject,
    addCardStatusBackgroundObject,
    addCardSelectInputBundle,
    uploadGuide,
    removeGuide,
    setGuideVisibility,
    setGuideOpacity,
    linkTimetableAssetSlotToInput,
    createTimetableAssetForSlot,
    createCardAssetForSlot,
    resetRuntimeValues,
    addEntryToActiveDay,
    removeEntry,
    updateEntryStatus,
    setTimetableCapability,
  } = useTimetableObjectCommands({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getRuntimeValues: useCallback(
      () => studioStore.getState().runtimeValues,
      [studioStore],
    ),
    updateDocument,
    selectedLayerId: selectedTimetableLayerId,
    onSelectLayer: setSelectedTimetableLayerId,
    onSelectRuntimeDay: setSelectedRuntimeDayId,
    onSelectRuntimeEntryIndex: setSelectedRuntimeEntryIndex,
    onOpenLayersPanel: useCallback(
      () => setPanelMode("layers"),
      [setPanelMode],
    ),
    onStatusMessage: showShortcutStatus,
    captureHistory,
    setDocument,
    setRuntimeValues,
    activeCardComponentId,
    componentLabelDraft,
    selectedCardStatusId,
    selectedCardVariantRootId,
    selectedNode,
    selectedTimetableDayId,
    selectedTimetableDayLabel: selectedTimetableDay?.label ?? null,
    activeRuntimeDayId,
    onSetPanelMode: setPanelMode,
    onSetSelectedCardComponentId: setSelectedCardComponentId,
    onSetComponentLabelDraft: setComponentLabelDraft,
    onSetSelectedInputId: setSelectedInputId,
    onSetSelectedRuntimeEntryIndex: setSelectedRuntimeEntryIndex,
    onSelectNode: selectSingleNode,
    onRestoreSelection: restoreSelection,
  });

  const uploadCardsGuide = (file: File) => uploadGuide("cards", file);
  const uploadTimetableGuide = (file: File) =>
    uploadGuide("timetable", file);
  const removeCardsGuide = () => removeGuide("cards");
  const removeTimetableGuide = () => removeGuide("timetable");
  const setActiveGuideVisibility = (visible: boolean) =>
    setGuideVisibility(activeWorkspaceMode, visible);
  const setActiveGuideOpacity = (opacity: number) =>
    setGuideOpacity(activeWorkspaceMode, opacity);

  const focusTimetableRuntimeDay = useCallback(
    (dayId: StudioTimetableDayId) => {
      setSelectedRuntimeDayId(dayId);
      setSelectedRuntimeEntryIndex(0);
    },
    [setSelectedRuntimeDayId, setSelectedRuntimeEntryIndex],
  );
  const {
    dropState: timetableLayerDropState,
    clearDragState: clearTimetableLayerDragState,
    handleDragStart: handleTimetableLayerDragStart,
    handleDragOver: handleTimetableLayerDragOver,
    handleIndicatorDragOver: handleTimetableLayerIndicatorDragOver,
    handleDrop: handleTimetableLayerDrop,
  } = useStudioTimetableLayerDrag({
    getCollapsedLayerIds: useCallback(
      () => collapsedTimetableLayerIds,
      [collapsedTimetableLayerIds],
    ),
    setCollapsedLayerIds: setCollapsedTimetableLayerIds,
    getLayerObjectKind: useCallback(
      (layerId: string) => timetableComposition.objects[layerId]?.kind ?? null,
      [timetableComposition],
    ),
    onSelectLayer: setSelectedTimetableLayerId,
    onFocusDay: focusTimetableRuntimeDay,
    onMoveRootLayer: moveTimetableRootObjectLayer,
    onMoveDayLayer: moveTimetableDayLayer,
  });

  const bindSelectedNodeToInput = (inputId: StudioInputId) => {
    if (!selectedNode) return;

    const input = document.inputs[inputId];
    if (!input) return;

    const binding = createStudioBindingForInput(selectedNode, input);
    if (!binding) return;

    updateNode(selectedNode.id, (node) => {
      node.binding = binding;
    });
  };

  const bindSelectedNodeToBuiltinField = (fieldId: StudioBuiltinFieldId) => {
    if (!selectedNode) return;

    const field = getStudioBuiltinField(fieldId);
    if (!field) return;

    const binding = createStudioBindingForBuiltinField(selectedNode, field);
    if (!binding) return;

    updateNode(selectedNode.id, (node) => {
      node.binding = binding;
    });
  };

  const setSelectedNodeStaticBinding = () => {
    if (!selectedNode) return;

    updateNode(selectedNode.id, (node) => {
      if (isStudioTextNode(node)) {
        node.binding = { kind: "staticText", value: "Static text" };
      }

      if (isStudioImageNode(node) && assets[0]) {
        node.binding = { kind: "staticAsset", assetId: assets[0].id };
      }
    });
  };

  const deleteSelectedNode = useCallback(() => {
    const plan = planStudioDeleteNodes(document, selectedNodeIds);
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    updateDocument((nextDocument) => {
      applyStudioDeleteNodes(nextDocument, plan.nodeIds);
    });

    selectSingleNode(plan.fallbackSelectionId);
    setNodePicker(null);
    showShortcutStatus(
      `Deleted ${plan.nodeIds.length} ${getStudioSelectionLabel(
        plan.nodeIds.length,
      )}`,
    );
  }, [
    document,
    selectedNodeIds,
    selectSingleNode,
    showShortcutStatus,
    updateDocument,
  ]);

  const deleteSelectedTimetableObject = useCallback(() => {
    const plan = planStudioDeleteTimetableObject(
      timetableComposition,
      selectedTimetableLayerId,
    );
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    updateDocument((nextDocument) => {
      const timetable = nextDocument.domains?.timetable;
      if (!timetable) return;

      applyStudioDeleteTimetableObject(
        ensureStudioTimetableComposition(timetable),
        plan.objectIds,
      );
    });

    setSelectedTimetableLayerId(plan.fallbackSelectionId);
    setCollapsedTimetableLayerIds((currentLayerIds) =>
      currentLayerIds.filter((layerId) => !plan.objectIds.includes(layerId)),
    );
    setNodePicker(null);
    showShortcutStatus(getStudioTimetableDeleteMessage(plan.objectIds.length));
  }, [
    selectedTimetableLayerId,
    setCollapsedTimetableLayerIds,
    setSelectedTimetableLayerId,
    showShortcutStatus,
    timetableComposition,
    updateDocument,
  ]);
  const deleteActiveSelection = useCallback(() => {
    if (activeWorkspaceMode === "timetable") {
      deleteSelectedTimetableObject();
      return;
    }

    deleteSelectedNode();
  }, [activeWorkspaceMode, deleteSelectedNode, deleteSelectedTimetableObject]);

  const {
    cutNodeIds,
    copy: copySelectedNode,
    cut: cutSelectedNode,
    paste: pasteClipboardNode,
    cancelCut: cancelNodeCut,
  } = useStudioClipboard({
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
    onSelect: applyNodeSelection,
    onStatusMessage: showShortcutStatus,
    onAfterPaste: useCallback(() => setPanelMode("layers"), [setPanelMode]),
  });

  const cutLayerNodeIdsSet = useMemo(() => {
    const nextNodeIds = new Set<string>();

    const collectNode = (nodeId: string) => {
      if (nextNodeIds.has(nodeId)) return;
      const node = document.graph.nodes[nodeId];
      if (!node) return;

      nextNodeIds.add(nodeId);
      node.childIds.forEach(collectNode);
    };

    cutNodeIds.forEach(collectNode);
    return nextNodeIds;
  }, [cutNodeIds, document.graph.nodes]);

  const duplicateSelectedNode = useCallback(() => {
    const plan = planStudioDuplicateNodes(document, selectedNodeIds);
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    let duplicateRootIds: string[] = [];
    updateDocument((nextDocument) => {
      duplicateRootIds = applyStudioDuplicateNodes(nextDocument, plan);
    });

    if (duplicateRootIds.length === 0) return;

    applyNodeSelection(duplicateRootIds, duplicateRootIds.at(-1));
    setPanelMode("layers");
    showShortcutStatus(
      `Duplicated ${duplicateRootIds.length} ${getStudioSelectionLabel(
        duplicateRootIds.length,
      )}`,
    );
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
    setPanelMode,
    showShortcutStatus,
    updateDocument,
  ]);

  const nudgeSelectedNode = useCallback(
    (deltaX: number, deltaY: number) => {
      const plan = planStudioNudgeNodes(document, selectedNodeIds);
      if (!plan.ok) {
        if (plan.reason) showShortcutStatus(plan.reason);
        return;
      }

      moveNodeByKeyboard(plan.nodeIds, deltaX, deltaY);
    },
    [document, moveNodeByKeyboard, selectedNodeIds, showShortcutStatus],
  );
  const moveSelectedNodeLayer = useCallback(
    (command: StudioLayerMoveCommand) => {
      const plan = planStudioLayerMove(
        document,
        selectedNode?.id ?? null,
        command,
      );
      if (!plan.ok) {
        showShortcutStatus(plan.reason);
        return;
      }

      updateDocument((nextDocument) => {
        applyStudioLayerMove(nextDocument, plan);
      });
      showShortcutStatus(getStudioLayerMoveMessage(command));
    },
    [document, selectedNode, showShortcutStatus, updateDocument],
  );

  const toggleSelectedNodeLock = useCallback(() => {
    const plan = planStudioToggleNodeLock(document, selectedNodeIds);
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    updateDocument((nextDocument) => {
      applyStudioToggleNodeLock(nextDocument, plan);
    });
    showShortcutStatus(
      `${plan.nextLocked ? "Locked" : "Unlocked"} ${
        plan.nodeIds.length
      } ${getStudioSelectionLabel(plan.nodeIds.length)}`,
    );
  }, [document, selectedNodeIds, showShortcutStatus, updateDocument]);

  const groupSelectedNodes = useCallback(() => {
    const plan = planStudioGroupNodes(document, selectedNodeIds);
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    updateDocument((nextDocument) => {
      applyStudioGroupNodes(nextDocument, plan);
    });
    applyNodeSelection([plan.groupNodeId], plan.groupNodeId);
    setPanelMode("layers");
    showShortcutStatus(`Grouped ${plan.orderedNodeIds.length} objects`);
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
    setPanelMode,
    showShortcutStatus,
    updateDocument,
  ]);

  const ungroupSelectedNodes = useCallback(() => {
    const plan = planStudioUngroupNodes(document, selectedNodeIds);
    if (!plan.ok) {
      showShortcutStatus(plan.reason);
      return;
    }

    let releasedNodeIds: string[] = [];
    updateDocument((nextDocument) => {
      releasedNodeIds = applyStudioUngroupNodes(
        nextDocument,
        plan.groupNodeIds,
      );
    });

    if (releasedNodeIds.length === 0) return;

    applyNodeSelection(releasedNodeIds, releasedNodeIds.at(-1));
    setPanelMode("layers");
    showShortcutStatus(`Ungrouped ${plan.groupNodeIds.length} group`);
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
    setPanelMode,
    showShortcutStatus,
    updateDocument,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setShortcutMessage(null);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [shortcutMessage]);

  useStudioKeyboardShortcuts({
    hasCutNodes: cutNodeIds.length > 0,
    isNodePickerOpen: Boolean(nodePicker),
    handlers: useMemo(
      () => ({
        undo: undoEditorState,
        redo: redoEditorState,
        saveDraft: () => void saveDatabaseDraft(),
        selectAll: selectAllEditableNodes,
        copy: copySelectedNode,
        cut: cutSelectedNode,
        paste: pasteClipboardNode,
        duplicate: duplicateSelectedNode,
        group: groupSelectedNodes,
        ungroup: ungroupSelectedNodes,
        toggleLock: toggleSelectedNodeLock,
        moveLayer: moveSelectedNodeLayer,
        delete: deleteActiveSelection,
        cancelCut: cancelNodeCut,
        closeNodePicker: () => setNodePicker(null),
        clearSelection: () => selectSingleNode(null),
        nudge: nudgeSelectedNode,
        zoomIn: () =>
          setScale((currentScale) =>
            clampStudioPreviewScale(Number((currentScale + 0.1).toFixed(2))),
          ),
        zoomOut: () =>
          setScale((currentScale) =>
            clampStudioPreviewScale(Number((currentScale - 0.1).toFixed(2))),
          ),
        zoomToFit: () => setFitRequestKey((currentKey) => currentKey + 1),
        zoomReset: () => setScale(1),
        onStatusMessage: showShortcutStatus,
      }),
      [
        cancelNodeCut,
        copySelectedNode,
        cutSelectedNode,
        deleteActiveSelection,
        duplicateSelectedNode,
        groupSelectedNodes,
        moveSelectedNodeLayer,
        nudgeSelectedNode,
        pasteClipboardNode,
        redoEditorState,
        saveDatabaseDraft,
        selectAllEditableNodes,
        selectSingleNode,
        setScale,
        showShortcutStatus,
        toggleSelectedNodeLock,
        undoEditorState,
        ungroupSelectedNodes,
      ],
    ),
  });

  const toggleInspectorSection = (sectionKey: InspectorSectionKey) => {
    setInspectorSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
  };

  /**
   * 공통 속성 패널에 넘길 섹션 항목을 만든다.
   *
   * `sectionKey`는 접힘 상태 저장용이고 한 화면에 같은 key가 두 번 나올 수
   * 있으므로(`runtime`의 Preview Inputs와 Timetable Context) 배열 식별자는
   * key와 제목을 합쳐서 만든다.
   */
  const buildInspectorSection = (
    sectionKey: InspectorSectionKey,
    title: string,
    content: React.ReactNode,
    badge?: string,
    action?: React.ReactNode,
  ): StudioPropertyItem => ({
    id: `${sectionKey}:${title}`,
    title,
    badge,
    action,
    content,
    open: inspectorSections[sectionKey],
    onToggle: () => toggleInspectorSection(sectionKey),
  });

  const {
    dropState: layerDropState,
    clearDragState: clearLayerDragState,
    handleDragStart: handleLayerDragStart,
    handleDragOver: handleLayerDragOver,
    handleIndicatorDragOver: handleLayerIndicatorDragOver,
    handleDrop: handleLayerDrop,
  } = useStudioLayerDrag({
    getDocument: useCallback(
      () => studioStore.getState().document,
      [studioStore],
    ),
    getSelectedNodeIds: useCallback(
      () => studioStore.getState().selectedNodeIds,
      [studioStore],
    ),
    getCollapsedNodeIds: useCallback(
      () => collapsedLayerGroupIds,
      [collapsedLayerGroupIds],
    ),
    setCollapsedNodeIds: setCollapsedLayerGroupIds,
    updateDocument,
    onSelect: applyNodeSelection,
    onSelectSingleNode: selectSingleNode,
    onStatusMessage: showShortcutStatus,
    // 옮긴 결과를 보려면 레이어 탭이어야 한다. 다른 탭에서 끌어다 놓으면
    // 무슨 일이 일어났는지 보이지 않는다.
    onAfterMove: useCallback(() => setPanelMode("layers"), [setPanelMode]),
  });

  const renderTimetablePresetsPanel = () => (
    <StudioTimetablePresetsPanel
      groups={timetablePresetGroups}
      onInsertPreset={addTimetablePresetObject}
    />
  );

  const renderCardsPresetsPanel = () => (
    <StudioCardsPresetsPanel
      groups={cardPresetGroups}
      onAddContextObject={addCardContextObject}
      onAddNode={addNode}
      onAddSelectInputBundle={addCardSelectInputBundle}
      onAddStatusBackground={addCardStatusBackgroundObject}
    />
  );

  /**
   * 미리보기용 사진을 자를 창을 띄운다.
   *
   * 자를 크기는 지금 고른 객체를 따라간다. 템플릿이 정한 자리와 다른 비율로
   * 들어가면 미리보기가 실제 결과와 달라진다.
   */
  const requestRuntimeImageCrop = (
    file: File,
    onApply: (croppedImageSrc: string) => void,
  ) => {
    const selectedGeometry =
      activeWorkspaceMode === "timetable"
        ? selectedTimetableLayerGeometry
        : selectedNode
          ? resolveStudioGraphNodeGeometry(document, selectedNode.id)
          : null;

    requestStudioImageCrop(
      file,
      resolveStudioRuntimeCropSize(selectedGeometry),
      onApply,
    );
  };

  const renderRuntimePreviewInputs = () => (
    <StudioRuntimeInputPanel
      activeDayId={activeRuntimeDayId}
      activeEntries={activeRuntimeEntries}
      activeEntry={activeRuntimeEntry}
      activeEntryIndex={activeRuntimeEntryIndex}
      days={timetableDays}
      inputsByScope={runtimeInputsByScope}
      runtimeValues={runtimeValues}
      onChangeInput={updateRuntimeInputValue}
      onRequestImageCrop={requestRuntimeImageCrop}
      onReset={resetRuntimeValues}
      onSelectDay={setSelectedRuntimeDayId}
      onSelectEntryIndex={setSelectedRuntimeEntryIndex}
    />
  );

  /**
   * 캔버스에서 카드 객체를 끌기 시작한다.
   *
   * 고른 것 중 하나를 집었으면 고른 것 전부를 옮긴다. 하나라도 끌 수 없으면 전부
   * 막는다. 일부만 움직이면 함께 고른 것들의 자리 관계가 깨진다.
   */
  const beginCanvasNodeMove = useCallback(
    (nodeId: string) => {
      const currentDocument = studioStore.getState().document;
      const selectedIds = studioStore.getState().selectedNodeIds;
      const targetNodeIds = selectedIds.includes(nodeId)
        ? getStudioTopLevelNodeIds(currentDocument, selectedIds)
        : [nodeId];
      const blockedReason = getStudioCanvasNodeDragBlockedReason(
        currentDocument,
        targetNodeIds,
      );

      if (blockedReason) {
        showShortcutStatus(blockedReason);
        return false;
      }

      captureHistory();
      return true;
    },
    [captureHistory, showShortcutStatus, studioStore],
  );

  /**
   * 캔버스에서 시간표 레이어를 끌기 시작한다.
   *
   * 끌기 전에 그 레이어를 고른다. 고르지 않은 것을 끌면 속성 패널이 다른 것을
   * 보여준 채로 값이 바뀐다.
   */
  const beginTimetableCanvasLayerMove = useCallback(
    (layerId: string) => {
      const composition = getStudioTimetableComposition(
        studioStore.getState().document.domains?.timetable,
      );
      const block = getStudioTimetableCanvasDragBlock(
        composition.objects[layerId],
        layerId,
      );

      if (block.kind === "missing") return false;
      if (block.kind === "blocked") {
        showShortcutStatus(block.reason);
        return false;
      }

      selectTimetableCanvasLayer(layerId);
      captureHistory();
      return true;
    },
    [
      captureHistory,
      selectTimetableCanvasLayer,
      showShortcutStatus,
      studioStore,
    ],
  );

  const renderTimetablePanel = () => (
    <StudioTimetableDayPanel
      activeDay={activeRuntimeDay ?? null}
      activeDayId={activeRuntimeDayId}
      activeEntry={activeRuntimeEntry}
      activeEntryIndex={activeRuntimeEntryIndex}
      addEntryDisabledReason={
        activeRuntimeDayId
          ? getStudioTimetableAddEntryDisabledReason(
              document,
              runtimeValues,
              activeRuntimeDayId,
            )
          : "Select a day first"
      }
      days={timetableDays}
      entries={activeRuntimeEntries}
      hasTimetable={Boolean(document.domains?.timetable)}
      inputsByScope={runtimeInputsByScope}
      maxEntries={maxRuntimeEntries}
      runtimeValues={runtimeValues}
      statusOptions={statusOptions}
      onAddEntry={addEntryToActiveDay}
      onChangeInput={updateRuntimeInputValue}
      onRemoveEntry={removeEntry}
      onRequestImageCrop={requestRuntimeImageCrop}
      onSelectDay={focusTimetableRuntimeDay}
      onSelectEntryIndex={setSelectedRuntimeEntryIndex}
      onUpdateEntryStatus={updateEntryStatus}
    />
  );

  const renderInputInspector = (input: StudioInputDefinition | null) => (
    <StudioInputInspector
      consumers={input ? (inputConsumers[input.id] ?? []) : []}
      input={input}
      isInputPanelActive={isInputPanelActive}
      onAddSelectConsumer={addSelectConsumerForInput}
      onAddSelectOption={addSelectOption}
      onJumpToConsumer={jumpToInputConsumer}
      onJumpToInput={jumpToInput}
      onRemoveSelectOption={removeSelectOption}
      onUpdateInput={updateInput}
      onUpdateSelectOptionLabel={updateSelectOptionLabel}
      onUpdateSelectOptionValue={updateSelectOptionValue}
    />
  );

  const renderTimetableInputSourceSlot = (input: StudioInputDefinition) => (
    <div className="grid gap-3">
      <div className="grid gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
          Custom Input Source
        </span>
        <span className="truncate text-xs font-semibold text-[var(--fg)]">
          {input.label}
        </span>
        <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
          {getStudioInputScopeLabel(input.scope)} ·{" "}
          {getStudioInputTypeLabel(input.type)} · {input.id}
        </span>
      </div>
      <button
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
        type="button"
        onClick={() => jumpToInput(input.id)}
      >
        <ArrowUpRight size={12} />
        Open in Inputs
      </button>
      <StudioRuntimeInputField
        input={input}
        runtimeValues={runtimeValues}
        onChange={updateRuntimeInputValue}
        onRequestImageCrop={requestRuntimeImageCrop}
      />
    </div>
  );

  const renderTimetableAssetSlot = ({
    object,
    label,
    assetId,
    inputId,
    fit,
    defaultFit = "cover",
    inputLabel = label,
    sourceLocked,
    onUpdateAsset,
    onUpdateInput,
  }: {
    object: StudioTimetableCompositionObject;
    label: string;
    assetId?: string | null;
    inputId?: string | null;
    fit?: StudioImageFit;
    defaultFit?: StudioImageFit;
    inputLabel?: string;
    sourceLocked?: "asset" | "input";
    onUpdateAsset: (
      object: StudioTimetableCompositionObject,
      assetId: string | null,
      fit: StudioImageFit,
    ) => void;
    onUpdateInput?: (
      object: StudioTimetableCompositionObject,
      inputId: string,
      fit: StudioImageFit,
    ) => void;
  }) => {
    /**
     * 사용자 이미지 입력을 만들어 이 자리에 묶는다.
     *
     * 입력을 만드는 일과 자리를 묶는 일은 한 동작이라 한 번의 문서 변경으로
     * 처리한다. 그래야 한 클릭이 undo 두 단계로 쌓이지 않는다.
     */
    const useInputSource = () => {
      if (!onUpdateInput) return;
      linkTimetableAssetSlotToInput({
        objectId: object.id,
        assetId,
        inputLabel,
        fit,
        defaultFit,
        label,
        onUpdateInput,
      });
    };

    const uploadAsset = (file: File) => {
      const cropGeometry = resolveStudioTimetableObjectGeometry(
        timetableComposition,
        object.id,
        getStudioTimetablePreviewSize(document.domains?.timetable),
      );

      requestStudioImageCrop(file, cropGeometry, (croppedSrc) => {
        createTimetableAssetForSlot({
          file,
          src: croppedSrc,
          fallbackLabel: inputLabel,
          objectId: object.id,
          fit,
          defaultFit,
          onUpdateAsset,
        });
      });
    };

    return (
      <StudioAssetSlotFields
        assetId={assetId}
        assets={assets}
        boundInput={inputId ? (document.inputs[inputId] ?? null) : null}
        canUseInput={Boolean(onUpdateInput)}
        defaultFit={defaultFit}
        fit={fit}
        hasAsset={Boolean(assetId && document.assets[assetId])}
        inputId={inputId}
        label={label}
        renderInputSourceSlot={renderTimetableInputSourceSlot}
        sourceLocked={sourceLocked}
        onSelectAsset={(nextAssetId) =>
          updateTimetableCompositionObject(object.id, (currentObject) => {
            onUpdateAsset(currentObject, nextAssetId, fit ?? defaultFit);
          })
        }
        onSelectFit={(nextFit) =>
          updateTimetableCompositionObject(object.id, (currentObject) => {
            if (inputId && onUpdateInput) {
              onUpdateInput(currentObject, inputId, nextFit);
              return;
            }

            onUpdateAsset(currentObject, assetId ?? null, nextFit);
          })
        }
        onUploadFile={uploadAsset}
        onUseInputSource={useInputSource}
      />
    );
  };

  /**
   * 종류에 맞는 이미지 자리를 그린다.
   *
   * 어떤 자리를 읽고 쓸지는 순수 함수가 정한다. 여기서는 문서를 바꾸는 방법만
   * 이어 붙인다.
   */
  const renderTimetableAssetSlotOfKind = (
    object: StudioTimetableCompositionObject,
    kind: StudioAssetSlotKind,
  ) =>
    renderTimetableAssetSlot({
      object,
      ...resolveStudioAssetSlotSpec(object, kind),
    });

  const renderStatusCardBackgroundAssetSlot = (node: StudioGraphNode) => {
    const status = cardStatusOptions.find(
      (candidate) => candidate.id === selectedCardStatusId,
    );
    const slot = node.assetSlots?.asset;
    const statusLabel = status?.label ?? selectedCardStatusId;

    const applyBackgroundSlot = (
      nextAssetId: string | null,
      nextFit: StudioImageFit,
    ) => {
      updateNode(node.id, (currentNode) => {
        setStudioStatusCardBackgroundAssetSlot(
          currentNode,
          nextAssetId,
          nextFit,
        );
      });
    };

    return (
      <StudioStatusCardBackgroundSlot
        assets={assets}
        hasAsset={Boolean(slot?.assetId && document.assets[slot.assetId])}
        slot={slot}
        statusLabel={statusLabel}
        onSelectAsset={applyBackgroundSlot}
        onSelectFit={(nextFit) =>
          applyBackgroundSlot(slot?.assetId ?? null, nextFit)
        }
        onUploadFile={(file) => {
          const cropGeometry = resolveStudioGraphNodeGeometry(
            document,
            node.id,
          );

          requestStudioImageCrop(file, cropGeometry, (croppedSrc) => {
            createCardAssetForSlot({
              file,
              src: croppedSrc,
              fallbackLabel: `${node.label} ${statusLabel}`,
              nodeId: node.id,
              fit: slot?.fit ?? "cover",
            });
          });
        }}
      />
    );
  };

  const buildNodeInspectorSections = (): StudioPropertyItem[] =>
    buildStudioCardNodeInspectorSections({
      document,
      selectedNode,
      fontFamilies,
      isSectionOpen: (sectionKey) => inspectorSections[sectionKey],
      onToggleSection: toggleInspectorSection,
      renderStatusBackgroundAssetSlot: renderStatusCardBackgroundAssetSlot,
      updateNode,
      updateStyle: updateSelectedNodeStyle,
      updateTextAlignment: updateSelectedNodeTextAlignment,
      toggleFitParent: toggleSelectedNodeFitParent,
      setStaticBinding: setSelectedNodeStaticBinding,
      bindToInput: bindSelectedNodeToInput,
      bindToBuiltinField: bindSelectedNodeToBuiltinField,
    });

  /**
   * 우측 속성 패널에 넘길 섹션 배열.
   *
   * 공통 프레임은 순서대로 렌더만 하므로 표시 조건과 순서는 여기서 정한다.
   */
  const buildTimetableInspectorSections = (): StudioPropertyItem[] =>
    buildStudioTimetableInspectorSections({
      activeRuntimeDayLabel: activeRuntimeDay?.label ?? null,
      activeRuntimeEntry,
      activeRuntimeEntryIndex,
      componentOptions: cardComponentOptions,
      dayCardsLayout: document.domains?.timetable
        ? getStudioTimetableDayCardsLayout(document.domains.timetable)
        : null,
      days: timetableDays,
      document,
      fontFamilies,
      getEntryCardSize: getTimetableEntryCardSizeForDay,
      isSectionOpen: (sectionKey) => inspectorSections[sectionKey],
      layerGeometry: selectedTimetableLayerGeometry,
      renderAssetSlot: renderTimetableAssetSlotOfKind,
      renderInputSourceSlot: renderTimetableInputSourceSlot,
      renderPreviewInputs: renderRuntimePreviewInputs,
      selectedLayerId: selectedTimetableLayerId,
      selectedLayerLabel: selectedTimetableLayerLabel,
      selection: timetableSelection,
      onAssignComponentSet: assignComponentSetToSelectedDay,
      onToggleFitParent: toggleTimetableObjectFitParent,
      onToggleSection: toggleInspectorSection,
      onUpdateDayCardsLayout: updateTimetableDayCardsLayout,
      onUpdateLayerPosition: updateTimetableLayerPosition,
      onUpdateObject: updateTimetableCompositionObject,
    });

  const buildPropertySections = (): StudioPropertyItem[] => [
    ...(!isInputPanelActive &&
    activeWorkspaceMode === "cards" &&
    selectedNode &&
    cardStatusOptions.length > 1
      ? [
          {
            kind: "block" as const,
            id: "cards:applyStyle",
            content: (
              <div className="border-b border-[var(--border)] px-4 py-3">
                <button
                  className="flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                  type="button"
                  onClick={() => setStylePropagationOpen(true)}
                >
                  <Paintbrush size={13} />
                  Apply style to other statuses...
                </button>
              </div>
            ),
          },
        ]
      : []),

    ...(isInputPanelActive
      ? [
          buildInspectorSection(
            "input",
            "Input",
            renderInputInspector(selectedInput),
          ),
        ]
      : activeWorkspaceMode === "cards"
        ? [
            ...buildNodeInspectorSections(),

            ...(selectedNodeBuiltinField
              ? [
                  buildInspectorSection(
                    "input",
                    "Built-in Field",
                    <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--fg2)]">
                      <div className="text-[var(--fg)]">
                        {selectedNodeBuiltinField.label}
                      </div>
                      <div>
                        {getStudioInputScopeLabel(
                          selectedNodeBuiltinField.scope,
                        )}{" "}
                        · {selectedNodeBuiltinField.type}
                      </div>
                      <p className="leading-relaxed text-[var(--fg3)]">
                        Built-in fields come from timetable runtime data and are
                        not stored as template inputs.
                      </p>
                    </div>,
                  ),
                ]
              : []),

            ...(selectedNodeBoundInput
              ? [
                  buildInspectorSection(
                    "input",
                    "Input",
                    renderInputInspector(selectedNodeBoundInput),
                  ),
                ]
              : []),

            ...(selectedNodeBoundInput
              ? [
                  buildInspectorSection(
                    "runtime",
                    "Preview Inputs",
                    renderRuntimePreviewInputs(),
                  ),
                ]
              : []),
          ]
        : buildTimetableInspectorSections()),

    buildInspectorSection(
      "diagnostics",
      "Diagnostics",
      diagnostics.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
          <CheckCircle2 size={15} />
          Ready
        </div>
      ) : (
        <div className="grid gap-2">
          {diagnostics.map((diagnostic) => (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                diagnostic.severity === "error"
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-300"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-300",
              )}
              key={diagnostic.id}
            >
              <div className="mb-1 flex items-center gap-2 font-bold">
                <AlertTriangle size={14} />
                {diagnostic.title}
              </div>
              <p className="font-medium leading-relaxed">{diagnostic.detail}</p>
            </div>
          ))}
        </div>
      ),
    ),
  ];

  return (
    <StudioEditorStoreProvider value={studioStore}>
      <StudioEditorShell
        canvas={
          <section className="relative min-w-0 flex-1 overflow-hidden bg-[var(--canvas)]">
            <StudioCanvasViewport
              canvasHeight={previewCanvasSize.height}
              canvasWidth={previewCanvasSize.width}
              fitRequestKey={fitRequestKey}
              scale={scale}
              onScaleChange={setScale}
              onMoveNode={
                activeWorkspaceMode === "cards"
                  ? moveCanvasNode
                  : moveTimetableCanvasLayer
              }
              onMoveNodeStart={
                activeWorkspaceMode === "cards"
                  ? beginCanvasNodeMove
                  : beginTimetableCanvasLayerMove
              }
              onOpenNodePicker={({ clientX, clientY, nodeIds }) => {
                const selectableNodeIds =
                  activeWorkspaceMode === "cards"
                    ? nodeIds.filter((nodeId) => document.graph.nodes[nodeId])
                    : nodeIds.filter((nodeId) => timetablePickerNodes[nodeId]);
                const uniqueNodeIds = [...new Set(selectableNodeIds)];
                if (uniqueNodeIds.length === 0) {
                  setNodePicker(null);
                  return;
                }

                setNodePicker({
                  x: clientX,
                  y: clientY,
                  nodeIds: uniqueNodeIds,
                });
              }}
              resolveDragNodeId={
                activeWorkspaceMode === "timetable"
                  ? resolveTimetableDragLayerId
                  : undefined
              }
              onSelectNode={
                activeWorkspaceMode === "cards"
                  ? (nodeId) => {
                      if (
                        studioStore.getState().selectedNodeIds.includes(nodeId)
                      ) {
                        return;
                      }

                      selectSingleNode(nodeId);
                      setNodePicker(null);
                    }
                  : selectTimetableCanvasLayer
              }
            >
              {activeWorkspaceMode === "timetable" ? (
                <div
                  className="relative"
                  style={{
                    width: previewCanvasSize.width,
                    height: previewCanvasSize.height,
                  }}
                >
                  <StudioTimetablePreview
                    document={document}
                    onSelectLayer={selectTimetableCanvasLayer}
                    runtimeValues={runtimeValues}
                    selectedLayerId={selectedTimetableLayerId}
                    variantMode="authoring"
                  />
                  {timetableGuideAsset && timetableGuide.visible ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[60] h-full w-full select-none"
                      data-studio-timetable-guide="true"
                      draggable={false}
                      src={timetableGuideAsset.src}
                      style={{
                        objectFit: "fill",
                        opacity: timetableGuide.opacity,
                      }}
                    />
                  ) : null}
                </div>
              ) : (
                <div
                  className="relative"
                  style={{
                    width: document.canvas.width,
                    height: document.canvas.height,
                  }}
                >
                  <StudioRenderer
                    document={document}
                    resolveNodeBackgroundAssetSlot={createStudioStatusCardBackgroundSlotResolver(
                      document,
                      cardAuthoringRuntimeValues,
                    )}
                    rootNodeIds={cardAuthoringRootNodeIds}
                    runtimeContext={
                      activeRuntimeDayId
                        ? {
                            dayId: activeRuntimeDayId,
                            entryIndex: 0,
                          }
                        : undefined
                    }
                    runtimeValues={cardAuthoringRuntimeValues}
                    selectedNodeId={selectedNodeId}
                    selectedNodeIds={selectedNodeIds}
                    onSelectNode={(nodeId, event) => {
                      if (!nodeId) {
                        selectSingleNode(null);
                        setNodePicker(null);
                        return;
                      }

                      if (event?.shiftKey || event?.metaKey || event?.ctrlKey) {
                        toggleNodeSelection(nodeId);
                      } else {
                        selectSingleNode(nodeId);
                      }
                      setNodePicker(null);
                    }}
                  />
                  {cardsGuideAsset && cardsGuide.visible ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 z-[60] h-full w-full select-none"
                      data-studio-cards-guide="true"
                      draggable={false}
                      src={cardsGuideAsset.src}
                      style={{
                        objectFit: "fill",
                        opacity: cardsGuide.opacity,
                      }}
                    />
                  ) : null}
                </div>
              )}
            </StudioCanvasViewport>

            {nodePicker ? (
              <StudioNodePickerMenu
                document={
                  activeWorkspaceMode === "cards" ? document : undefined
                }
                nodes={
                  activeWorkspaceMode === "timetable"
                    ? timetablePickerNodes
                    : undefined
                }
                nodeIds={nodePicker.nodeIds}
                position={{ x: nodePicker.x, y: nodePicker.y }}
                selectedNodeId={
                  activeWorkspaceMode === "cards"
                    ? selectedNodeId
                    : selectedTimetableLayerId
                }
                onClose={() => setNodePicker(null)}
                onSelectNode={(nodeId) => {
                  if (activeWorkspaceMode === "cards") {
                    selectSingleNode(nodeId);
                  } else {
                    selectTimetableCanvasLayer(nodeId);
                  }
                  setNodePicker(null);
                }}
              />
            ) : null}

            {shortcutMessage ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-semibold text-[var(--fg)] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                {shortcutMessage}
              </div>
            ) : null}
          </section>
        }
        leftSidebar={
          <StudioLeftSidebar
            activeTabId={activePanelMode}
            content={
              activePanelMode === "layers" ? (
                activeWorkspaceMode === "timetable" ? (
                  <StudioTimetableLayerPanel
                    collapsedLayerIds={collapsedTimetableLayerIds}
                    composition={timetableComposition}
                    days={timetableDays}
                    dropState={timetableLayerDropState}
                    selectedLayerId={selectedTimetableLayerId}
                    onFocusDay={focusTimetableRuntimeDay}
                    onIndicatorDragOver={handleTimetableLayerIndicatorDragOver}
                    onLayerDragEnd={clearTimetableLayerDragState}
                    onLayerDragOver={handleTimetableLayerDragOver}
                    onLayerDragStart={handleTimetableLayerDragStart}
                    onLayerDrop={handleTimetableLayerDrop}
                    onSelectLayer={setSelectedTimetableLayerId}
                    onToggleCollapsed={toggleTimetableLayerCollapsed}
                  />
                ) : (
                  <StudioLayerPanel
                    collapsedNodeIds={collapsedLayerGroupIdsSet}
                    cutNodeIds={cutLayerNodeIdsSet}
                    dropState={layerDropState}
                    graph={document.graph}
                    rootNodeIds={cardAuthoringRootNodeIds}
                    selectedNodeIds={selectedNodeIdsSet}
                    summary={`${cardAuthoringRootNodeIds.length} placed objects`}
                    title="Cards Layers"
                    onDragEnd={clearLayerDragState}
                    onDragOver={handleLayerDragOver}
                    onDragStart={handleLayerDragStart}
                    onDrop={handleLayerDrop}
                    onIndicatorDragOver={handleLayerIndicatorDragOver}
                    onSelect={(nodeId, event) => {
                      if (event.shiftKey) {
                        selectLayerNodeRange(
                          nodeId,
                          event.metaKey || event.ctrlKey,
                        );
                      } else if (event.metaKey || event.ctrlKey) {
                        toggleNodeSelection(nodeId);
                      } else {
                        selectSingleNode(nodeId);
                      }
                      setPanelMode("layers");
                    }}
                    onToggleCollapsed={toggleLayerGroupCollapsed}
                  />
                )
              ) : activePanelMode === "presets" ? (
                activeWorkspaceMode === "timetable" ? (
                  renderTimetablePresetsPanel()
                ) : (
                  renderCardsPresetsPanel()
                )
              ) : activePanelMode === "inputs" ? (
                <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
                    Input Blocks
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1">
                    {STUDIO_INPUT_SCOPE_OPTIONS.map((scope) => (
                      <button
                        className={cn(
                          "h-7 rounded-md text-[11px] font-bold transition",
                          inputScopeFilter === scope
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                        )}
                        key={scope}
                        type="button"
                        onClick={() => setInputScopeFilter(scope)}
                      >
                        {getStudioInputScopeLabel(scope)}
                        <span className="ml-1 opacity-70">
                          {runtimeInputsByScope[scope].length}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-1">
                    {(["text", "image", "select"] as const).map((type) => (
                      <button
                        className="flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                        key={type}
                        type="button"
                        onClick={() => addInput(type)}
                      >
                        <Plus size={12} />
                        {getStudioInputTypeLabel(type)}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-2">
                    {filteredInputs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[var(--field-border)] bg-[var(--field)] px-3 py-4 text-center text-[12px] font-semibold text-[var(--fg3)]">
                        No{" "}
                        {getStudioInputScopeLabel(
                          inputScopeFilter,
                        ).toLowerCase()}{" "}
                        inputs
                      </div>
                    ) : null}
                    {filteredInputs.map((input, index) => (
                      <button
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[12.5px] transition",
                          selectedInputId === input.id
                            ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                            : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg)] hover:border-[var(--accent)]",
                        )}
                        key={input.id}
                        type="button"
                        onClick={() => {
                          setSelectedInputId(input.id);
                          setPanelMode("inputs");
                        }}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-sm",
                            index % 3 === 0
                              ? "bg-[var(--accent)]"
                              : index % 3 === 1
                                ? "bg-violet-400"
                                : "bg-orange-300",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {input.label} · {getStudioInputTypeLabel(input.type)}
                        </span>
                        <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
                          {input.scope}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                renderTimetablePanel()
              )
            }
            contextHeader={
              activeWorkspaceMode === "cards" ? (
                <div className="grid gap-2 border-b border-[var(--border)] p-2">
                  <div className="grid gap-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--fg3)]">
                      Component Set
                    </span>
                    <div className="flex min-w-0 gap-1">
                      <select
                        aria-label="Component set"
                        className="h-8 min-w-0 flex-1 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2 text-[11px] font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                        value={activeCardComponentId}
                        onChange={(event) =>
                          selectCardComponent(event.currentTarget.value)
                        }
                      >
                        {cardComponentOptions.map((component) => (
                          <option key={component.id} value={component.id}>
                            {component.label}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label="Duplicate component set"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={!cardEntryComponent}
                        title="Duplicate component set"
                        type="button"
                        onClick={duplicateSelectedCardComponent}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        aria-label="Delete component set"
                        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-rose-400/60 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={Boolean(cardComponentDeleteReason)}
                        title={
                          cardComponentDeleteReason ?? "Delete component set"
                        }
                        type="button"
                        onClick={deleteSelectedCardComponent}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <input
                      aria-label="Component set name"
                      className="h-8 w-full rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2 text-[11px] font-semibold text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)] disabled:opacity-40"
                      disabled={!cardEntryComponent}
                      placeholder="Component set name"
                      value={componentLabelDraft}
                      onBlur={commitSelectedCardComponentLabel}
                      onChange={(event) =>
                        setComponentLabelDraft(event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                          event.preventDefault();
                          setComponentLabelDraft(
                            cardEntryComponent?.label ?? "",
                          );
                        }
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1">
                    {cardStatusOptions.map((status) => (
                      <button
                        className={cn(
                          "h-8 rounded-md px-2 text-[11px] font-bold transition",
                          selectedCardStatusId === status.id
                            ? "bg-[var(--accent)] text-white"
                            : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                        )}
                        key={status.id}
                        type="button"
                        onClick={() => {
                          setSelectedCardStatusId(status.id);
                          const resolution =
                            resolveStudioTimetableComponentVariant(
                              document,
                              cardEntryComponent,
                              status.id,
                            );
                          const rootNodeId = resolution?.variant.rootNodeId;
                          if (rootNodeId) {
                            restoreSelection([rootNodeId], rootNodeId);
                          }
                        }}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>

                  {selectedCardStatusId === "multi" ? (
                    <div className="rounded-md border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-1.5 text-[10px] font-semibold leading-relaxed text-fuchsia-100">
                      Multi uses two authored Entry Groups inside the shared
                      card frame.
                    </div>
                  ) : null}
                </div>
              ) : null
            }
            tabs={cardsPanelTabs}
            onTabChange={(tabId) => setPanelMode(tabId as PanelMode)}
          />
        }
        overlays={
          <>
            <StudioSettingsModal
              activeWorkspaceMode={activeWorkspaceMode}
              databaseTargetLabel={STUDIO_DATABASE_TARGET_LABEL}
              document={document}
              inputCount={inputs.length}
              isReloadDisabled={!remoteTemplateId || isRemoteSyncing}
              objectCount={activeObjectCount}
              open={settingsOpen}
              theme={theme}
              onCardsCanvasChange={updateCardCanvasSize}
              onCardsGuideRemove={removeCardsGuide}
              onCardsGuideUpload={uploadCardsGuide}
              onClose={() => setSettingsOpen(false)}
              onExportJson={exportStudioJson}
              onImportJson={() => jsonImportInputRef.current?.click()}
              onReloadTemplate={() => {
                void loadRemoteTemplate();
              }}
              onThemeChange={setTheme}
              onTimetableCapabilityChange={setTimetableCapability}
              onTimetableCanvasChange={updateTimetableCanvasSize}
              onTimetableGuideRemove={removeTimetableGuide}
              onTimetableGuideUpload={uploadTimetableGuide}
              onWebFontsChange={updateWebFonts}
            />
            {stylePropagationOpen ? (
              <StudioApplyStyleDialog
                open
                sourceStatusId={selectedCardStatusId}
                statuses={cardStatusOptions.map((status) => ({
                  id: status.id,
                  label: status.label,
                }))}
                onApply={applySelectedNodeStyleToStatuses}
                onClose={() => setStylePropagationOpen(false)}
              />
            ) : null}
            {pendingImageCrop ? (
              <StudioImageCropModal
                imageSrc={pendingImageCrop.imageSrc}
                initialHeight={pendingImageCrop.initialHeight}
                initialWidth={pendingImageCrop.initialWidth}
                onCancel={() => setPendingImageCrop(null)}
                onApply={(croppedImageSrc) => {
                  pendingImageCrop.onApply(croppedImageSrc);
                  setPendingImageCrop(null);
                }}
              />
            ) : null}
          </>
        }
        propertiesPanel={
          <StudioPropertiesPanel
            header={{
              icon: isInputPanelActive ? (
                <ListChecks size={12} />
              ) : activeWorkspaceMode === "timetable" ? (
                <CalendarDays size={12} />
              ) : selectedNode?.type === "image" ? (
                <ImageIcon size={12} />
              ) : selectedNode?.type === "group" ? (
                <Layers3 size={12} />
              ) : (
                "T"
              ),
              title: isInputPanelActive
                ? selectedInput
                  ? getStudioInputTypeLabel(selectedInput.type)
                  : "Inputs"
                : activeWorkspaceMode === "timetable"
                  ? "Timetable"
                  : selectedNode
                    ? getStudioGraphNodeTypeLabel(selectedNode.type)
                    : "Cards",
              summary: isInputPanelActive
                ? selectedInput
                  ? "1 selected"
                  : `${filteredInputs.length} visible`
                : activeWorkspaceMode === "timetable"
                  ? selectedTimetableLayerId
                    ? "1 selected"
                    : "Composition"
                  : `${selectedNodeIds.length} selected`,
              renameDisabled: isInputPanelActive
                ? !selectedInput
                : activeWorkspaceMode === "timetable"
                  ? !selectedTimetableCompositionObject
                  : !selectedNode,
              renameValue: isInputPanelActive
                ? (selectedInput?.label ?? "No input selected")
                : activeWorkspaceMode === "timetable"
                  ? selectedTimetableLayerLabel
                  : (selectedNode?.label ?? "No selection"),
              onRenameChange: (label) => {
                if (isInputPanelActive) {
                  if (!selectedInput) return;
                  updateInput(selectedInput.id, (input) => ({
                    ...input,
                    label,
                  }));
                  return;
                }

                if (activeWorkspaceMode === "timetable") {
                  if (!selectedTimetableCompositionObject) return;
                  updateTimetableCompositionObject(
                    selectedTimetableCompositionObject.id,
                    (object) => {
                      object.label = label;
                    },
                  );
                  return;
                }

                if (!selectedNode) return;
                updateNode(selectedNode.id, (node) => {
                  node.label = label;
                });
              },
            }}
            sections={buildPropertySections()}
          />
        }
        themeStyle={themeStyle}
        topToolbar={
          <StudioTopToolbar
            backAction={{
              title: "템플릿 목록으로",
              onClick: () => router.push("/admin/template-studio"),
            }}
            canvasSize={{
              width: previewCanvasSize.width,
              height: previewCanvasSize.height,
              title: "Open canvas settings",
              onClick: () => setSettingsOpen(true),
            }}
            centerSlot={
              <>
                <div className="flex h-[30px] shrink-0 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
                  {[
                    { mode: "cards" as const, label: "Cards" },
                    { mode: "timetable" as const, label: "Timetable" },
                  ].map(({ mode, label }) => (
                    <button
                      className={cn(
                        "h-6 rounded-md px-2.5 text-[11px] font-semibold transition",
                        activeWorkspaceMode === mode
                          ? "bg-[var(--accent)] text-white"
                          : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                        mode === "timetable" &&
                          !canPreviewTimetable &&
                          "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-[var(--fg2)]",
                      )}
                      disabled={mode === "timetable" && !canPreviewTimetable}
                      key={mode}
                      type="button"
                      onClick={() => {
                        setWorkspaceMode(mode);
                        setNodePicker(null);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mx-0.5 h-[22px] w-px shrink-0 bg-[var(--border)]" />
                <StudioGuideControl
                  hasAsset={Boolean(activeGuideAsset)}
                  opacity={activeGuide.opacity}
                  visible={Boolean(activeGuide.visible)}
                  onOpacityChange={setActiveGuideOpacity}
                  onRequestAsset={() => setSettingsOpen(true)}
                  onToggleVisible={() =>
                    setActiveGuideVisibility(!activeGuide.visible)
                  }
                />
              </>
            }
            hiddenControls={
              <input
                accept="application/json,.json"
                className="hidden"
                ref={jsonImportInputRef}
                type="file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  void importStudioJsonFile(file);
                }}
              />
            }
            previewAction={{
              title: "Open runtime preview",
              onClick: () => {
                void openRuntimeDraftPreview();
              },
            }}
            publishAction={{
              title: "Publish database document",
              disabled: isRemoteSyncing,
              onClick: () => {
                void publishRemoteDocument();
              },
            }}
            saveAction={{
              title: "Save draft to database",
              disabled: isRemoteSyncing,
              onClick: () => {
                void saveDatabaseDraft();
              },
            }}
            settingsAction={{
              title: "Template settings",
              onClick: () => setSettingsOpen(true),
            }}
            shareAction={{
              title: "Open saved preview",
              disabled: !remoteTemplateId,
              onClick: openSavedPreview,
            }}
            zoom={{
              scale,
              onFit: () => setFitRequestKey((current) => current + 1),
              onZoomIn: () =>
                setScale((currentScale) =>
                  clampStudioPreviewScale(
                    Number((currentScale + 0.1).toFixed(2)),
                  ),
                ),
              onZoomOut: () =>
                setScale((currentScale) =>
                  clampStudioPreviewScale(
                    Number((currentScale - 0.1).toFixed(2)),
                  ),
                ),
            }}
          />
        }
      />
    </StudioEditorStoreProvider>
  );
}
