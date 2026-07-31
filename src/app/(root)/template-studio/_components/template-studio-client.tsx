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
  Minus,
  Paintbrush,
  Plus,
  Trash2,
  Type,
  Upload,
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
import { useStudioSelection } from "@/hooks/studio/use-studio-selection";
import {
  useCreateTemplateStudioTemplate,
  usePublishTemplateStudioDocument,
  useSaveTemplateStudioDraft,
  useSyncTemplateStudioAssets,
  useTemplateStudioTemplate,
} from "@/hooks/query/useTemplateStudio";
import { cn } from "@/lib/utils";
import type {
  TemplateStudioUploadedAsset,
  TemplateStudioUploadAssetPayload,
} from "@/services/templateStudioService";
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
  StudioSelectOption,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioWebFontSource,
  StudioTimetableCapabilityKey,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableComponentId,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableDomain,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  createStudioBindingForBuiltinField,
  createStudioBindingForInput,
  getStudioBindingInputId,
  isStudioImageNode,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import {
  normalizeStudioDayLabelFormat,
  getStudioBuiltinField,
} from "@/utils/template-studio/builtin-fields";
import {
  cloneStudioTimetableComponentSet,
  deleteStudioTimetableComponentSet,
  getStudioTimetableComponentSetDeleteReason,
  getStudioTimetableDayComponent,
  resolveStudioTimetableDayComponent,
} from "@/utils/template-studio/component-sets";
import {
  STUDIO_WEEK_DATE_FORMAT_PRESETS,
  STUDIO_WEEK_DATE_LONG_TEMPLATE,
  STUDIO_WEEK_DATE_TEMPLATE_TOKENS,
} from "@/utils/template-studio/date-template";
import {
  moveStudioGraphNodes,
  validateStudioGraphMove,
  type StudioGraphDropPosition,
} from "@/utils/template-studio/graph-editor";
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
import {
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import { createStudioId } from "@/utils/template-studio/id";
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
  planStudioAddCardContextObject,
  planStudioAddCardStatusBackground,
  planStudioAddNode,
  planStudioDeleteNodes,
  resolveStudioNodeInsertionParentId,
  type StudioSelectConsumerInput,
} from "@/utils/template-studio/node-commands";
import {
  getStudioDataDropPosition,
  getStudioLayerPanelOrder,
} from "@/utils/template-studio/layer-order";
import {
  applyStudioNodeFitParent,
  applyStudioNodeOffset,
  applyStudioNodeStyleValue,
  applyStudioNodeTextAlignment,
  getStudioTextAlignment,
  getStudioTextJustifyContent,
  getStudioVariantStyleMessage,
  planStudioNudgeNodes,
  resolveStudioDragTargetNodeIds,
  type StudioTextAlignment,
} from "@/utils/template-studio/node-style-commands";
import {
  applyStudioDeleteTimetableObject,
  applyStudioTimetableObjectFitParent,
  applyStudioTimetableObjectOffset,
  applyStudioTimetableObjectPosition,
  getStudioTimetableDayCardLayerId,
  getStudioTimetableDeleteMessage,
  getStudioTimetableOrderedDayIds,
  isStudioPlacedTimetableObject,
  planStudioDeleteTimetableObject,
  reorderStudioIdList,
  resolveStudioTimetableLayerTarget,
  roundStudioCoordinate,
  setStudioTimetableDayOffset,
  type StudioTimetableObjectPosition,
} from "@/utils/template-studio/timetable-commands";
import {
  getStudioTimetablePresetMessage,
  insertStudioTimetablePresetObject,
  relinkStudioTimetablePresetInput,
  type StudioTimetablePresetInsertResult,
} from "@/utils/template-studio/timetable-preset-commands";
import {
  isStudioFillParentLayout,
  isStudioPlacedTimetableCompositionObject,
  resolveStudioGraphNodeGeometry,
  resolveStudioTimetableObjectGeometry,
} from "@/utils/template-studio/object-layout";
import { getStudioSelectionLabel } from "@/utils/template-studio/selection";
import {
  getStudioInputDefaultValue,
  getStudioInputsForScope,
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import { ensureStudioPresetImageInput } from "@/utils/template-studio/preset-inputs";
import {
  getStudioPresetExistingTargetId,
  getStudioPresetCreationRule,
  getStudioPresetGroups,
  isStudioCardContextObjectPreset,
  isStudioCardSelectInputBundlePreset,
  isStudioCardStatusBackgroundPreset,
  isStudioTimetableCompositionPreset,
  type StudioCardSelectInputBundlePreset,
  type StudioCardStatusBackgroundPreset,
  type StudioCardContextObjectPreset,
  type StudioTimetableCompositionPreset,
} from "@/utils/template-studio/preset-registry";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "@/utils/template-studio/sample-document";
import {
  ensureStudioTimetableComposition,
  getStudioTimetableComposition,
  getStudioTimetableCompositionObjectGeometry,
  getStudioTimetableObjectRenderableChildIds,
  setStudioTimetableObjectActiveVariantValue,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  setStudioTimetableObjectMaskSlot,
  setStudioTimetableObjectVisibilitySlot,
  type StudioSemanticMaskShape,
} from "@/utils/template-studio/semantic-slots";
import {
  createStudioTemplateExportPayload,
  getStudioTemplateBlockingDiagnostics,
  getStudioTemplateDiagnosticsSummary,
  getStudioTemplateExportFilename,
  parseStudioTemplateExportJson,
} from "@/utils/template-studio/serialization";
import { setStudioStatusCardBackgroundAssetSlot } from "@/utils/template-studio/status-card-background";
import {
  addStudioTimetableEntry,
  getStudioTimetableAddEntryDisabledReason,
  getStudioTimetableDaysWithMultipleEntries,
  getStudioTimetableEffectiveMaxEntriesPerDay,
  getStudioTimetableEntriesForDay,
  removeStudioTimetableEntry,
  resolveStudioTimetableComponentVariant,
  setStudioTimetableEntryStatus,
  validateStudioRuntimeValuesForDocument,
} from "@/utils/template-studio/timetable-runtime";
import { applyStudioTimetableComponentFrames } from "@/utils/template-studio/entry-groups";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioAvailableTimetableStatuses,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import {
  getStudioCardsGuide,
  getStudioTimetableGuide,
  setStudioCardsGuideAsset,
  setStudioCardsGuideOpacity,
  setStudioCardsGuideVisibility,
  setStudioTimetableGuideAsset,
  setStudioTimetableGuideOpacity,
  setStudioTimetableGuideVisibility,
} from "@/utils/template-studio/timetable-guide";
import { ensureStudioCapabilityVariant } from "@/utils/template-studio/status-variants";
import {
  applyStudioVariantStyle,
  type StudioVariantStyleScope,
} from "@/utils/template-studio/variant-style-propagation";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "@/utils/template-studio/text-wrap";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import {
  getStudioCustomFontFamilies,
  getStudioFontWeightOptions,
} from "@/utils/template-studio/web-fonts";

import {
  clampStudioPreviewScale,
  StudioCanvasViewport,
} from "../../../../components/studio/canvas/studio-canvas-viewport";
import {
  StudioNodePickerMenu,
  type StudioPickerNode,
} from "./studio-node-picker-menu";
import { StudioImageCropModal } from "./studio-image-crop-modal";
import { StudioHexColorPicker } from "./studio-hex-color-picker";
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
  StudioFitParentButton,
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioTextAlignmentField,
  StudioTextareaField,
  StudioTextField,
} from "@/components/studio/inspector/studio-inspector-fields";
import {
  getStudioInputScopeLabel,
  STUDIO_INPUT_SCOPE_OPTIONS,
} from "@/utils/template-studio/input-scope";
import {
  resolveStudioTimetableAssetSlotSpec,
  type StudioTimetableAssetSlotKind,
} from "@/utils/template-studio/timetable-asset-slot-specs";
import { StudioLayerPanel } from "@/components/studio/layers/studio-layer-panel";
import {
  StudioLayerDropIndicator,
  StudioLayerPanelFrame,
} from "@/components/studio/layers/studio-layer-primitives";

import { StudioApplyStyleDialog } from "./studio-apply-style-dialog";
import { buildStudioCardNodeInspectorSections } from "./studio-card-node-inspector";
import { StudioDayLabelFormatField } from "./studio-day-label-format-field";
import { StudioInputInspector } from "./studio-input-inspector";
import {
  StudioTimetableOpacityField,
  StudioTimetableVisibilityField,
} from "./studio-timetable-object-controls";
import { StudioTimetableAssetSlotFields } from "./studio-timetable-asset-slot-fields";
import { StudioTimetableDayCardsLayoutControls } from "./studio-timetable-day-cards-layout-controls";
import { StudioTimetableLayerRow } from "./studio-timetable-layer-row";
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
  STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
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

interface StudioLayerDragState {
  primaryNodeId: string;
  nodeIds: string[];
}

interface StudioLayerDropState {
  nodeId: string;
  position: StudioGraphDropPosition;
  blockedReason?: string | null;
}

interface StudioTimetableLayerDragState {
  layerId: string;
  scope: "root" | "day";
  dayId?: StudioTimetableDayId;
}

interface StudioTimetableLayerDropState {
  layerId: string;
  position: "before" | "after";
  blockedReason?: string | null;
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

const STUDIO_LAYER_AUTO_EXPAND_DELAY_MS = 550;
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

const DATA_IMAGE_URL_PATTERN = /^data:(image\/[^;,]+)((?:;[^,]+)*),([\s\S]*)$/;
const DATA_IMAGE_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

type StudioDataImagePayload = {
  buffer: ArrayBuffer;
  extension: string;
  mimeType: string;
};

const copyBytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const parseStudioDataImageUrl = (
  src: string,
): StudioDataImagePayload | null => {
  const match = src.match(DATA_IMAGE_URL_PATTERN);
  if (!match) return null;

  const mimeType = match[1];
  const extension = DATA_IMAGE_EXTENSION[mimeType];
  if (!extension) return null;

  const parameters = match[2]
    .split(";")
    .map((parameter) => parameter.trim().toLowerCase())
    .filter(Boolean);
  const data = match[3];

  try {
    const bytes = parameters.includes("base64")
      ? Uint8Array.from(window.atob(data), (character) =>
          character.charCodeAt(0),
        )
      : new TextEncoder().encode(decodeURIComponent(data));
    if (bytes.byteLength === 0) return null;

    return {
      buffer: copyBytesToArrayBuffer(bytes),
      extension,
      mimeType,
    };
  } catch {
    return null;
  }
};

const bytesToHex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const getStudioDataImageMetadata = async (
  src: string,
): Promise<{
  byteSize: number;
  contentHash: string | null;
  mimeType: string;
} | null> => {
  const parsed = parseStudioDataImageUrl(src);
  if (!parsed) return null;

  if (!globalThis.crypto?.subtle) {
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: null,
      mimeType: parsed.mimeType,
    };
  }

  try {
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      parsed.buffer,
    );
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: bytesToHex(digest),
      mimeType: parsed.mimeType,
    };
  } catch {
    return {
      byteSize: parsed.buffer.byteLength,
      contentHash: null,
      mimeType: parsed.mimeType,
    };
  }
};

const getUniqueStudioInputLabel = (
  document: StudioTemplateDocument,
  baseLabel: string,
): string => {
  const labels = new Set(
    Object.values(document.inputs).map((input) =>
      input.label.trim().toLowerCase(),
    ),
  );
  let label = baseLabel;
  let index = 2;

  while (labels.has(label.trim().toLowerCase())) {
    label = `${baseLabel} ${index}`;
    index += 1;
  }

  return label;
};

const getUniqueStudioAssetLabel = (
  document: StudioTemplateDocument,
  baseLabel: string,
): string => {
  const labels = new Set(
    Object.values(document.assets).map((asset) =>
      asset.label.trim().toLowerCase(),
    ),
  );
  let label = baseLabel;
  let index = 2;

  while (labels.has(label.trim().toLowerCase())) {
    label = `${baseLabel} ${index}`;
    index += 1;
  }

  return label;
};

const getStudioAssetLabelFromFile = (file: File, fallbackLabel: string) => {
  const fileLabel = file.name.replace(/\.[^.]+$/, "").trim();
  return fileLabel || fallbackLabel;
};

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

const isStudioShortcutEditingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

const getStudioEditableNodeIds = (document: StudioTemplateDocument): string[] =>
  Object.keys(document.graph.nodes).filter(
    (nodeId) =>
      !document.graph.rootNodeIds.includes(nodeId) &&
      document.domains?.timetable?.mountNodeId !== nodeId,
  );

const getStudioStyleString = (
  styleRecord: StudioStyleRecord,
  key: string,
  fallback: string,
) => {
  const value = styleRecord[key];
  return typeof value === "string" ? value : fallback;
};

const normalizeStudioDimension = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Number(value.toFixed(2)));
};

const getStudioWeekDatePreset = (presetId: string) =>
  STUDIO_WEEK_DATE_FORMAT_PRESETS.find((preset) => preset.id === presetId) ??
  null;

const getStudioWeekDateTemplateValue = (
  object: StudioTimetableCompositionObject,
) => {
  const template = getStudioStyleString(object.style, "dateRangeTemplate", "");
  if (template) return template;

  const format = getStudioStyleString(object.style, "dateRangeFormat", "long");
  return (
    getStudioWeekDatePreset(format)?.template ?? STUDIO_WEEK_DATE_LONG_TEMPLATE
  );
};

const getStudioWeekDatePresetValue = (
  object: StudioTimetableCompositionObject,
) => {
  const template = getStudioStyleString(object.style, "dateRangeTemplate", "");
  const format = getStudioStyleString(object.style, "dateRangeFormat", "long");

  if (!template && getStudioWeekDatePreset(format)) return format;

  return (
    STUDIO_WEEK_DATE_FORMAT_PRESETS.find(
      (preset) => preset.template === template,
    )?.id ?? "custom"
  );
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

const getStudioTimetableObjectMaskShape = (
  object: StudioTimetableCompositionObject,
): StudioSemanticMaskShape => {
  const radius =
    typeof object.style.borderRadius === "number"
      ? object.style.borderRadius
      : 0;

  if (radius >= 9999) return "circle";
  if (radius <= 0) return "rectangle";
  return "rounded";
};

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
  const [layerDropState, setLayerDropState] =
    useState<StudioLayerDropState | null>(null);
  const [timetableLayerDragState, setTimetableLayerDragState] =
    useState<StudioTimetableLayerDragState | null>(null);
  const [timetableLayerDropState, setTimetableLayerDropState] =
    useState<StudioTimetableLayerDropState | null>(null);
  const [shortcutMessage, setShortcutMessage] = useState<string | null>(null);
  const [remoteTemplateId, setRemoteTemplateId] = useState<string | null>(
    initialRemoteTemplateId,
  );
  const [componentLabelDraft, setComponentLabelDraft] = useState("");
  const layerDragStateRef = useRef<StudioLayerDragState | null>(null);
  const timetableLayerDragStateRef =
    useRef<StudioTimetableLayerDragState | null>(null);
  const layerAutoExpandTimerRef = useRef<number | null>(null);
  const layerAutoExpandTargetRef = useRef<string | null>(null);
  const timetableLayerAutoExpandTimerRef = useRef<number | null>(null);
  const timetableLayerAutoExpandTargetRef = useRef<string | null>(null);
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

  useEffect(
    () => () => {
      if (layerAutoExpandTimerRef.current !== null) {
        window.clearTimeout(layerAutoExpandTimerRef.current);
      }
      if (timetableLayerAutoExpandTimerRef.current !== null) {
        window.clearTimeout(timetableLayerAutoExpandTimerRef.current);
      }
    },
    [],
  );

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
  const selectedTimetableCompositionObject = selectedTimetableLayerId
    ? (timetableComposition.objects[selectedTimetableLayerId] ?? null)
    : null;
  const selectedTimetableDayId = selectedTimetableLayerId?.startsWith(
    "day-card:",
  )
    ? (selectedTimetableLayerId.replace(
        /^day-card:/,
        "",
      ) as StudioTimetableDayId)
    : null;
  const selectedTimetableDay = selectedTimetableDayId
    ? (document.domains?.timetable?.days[selectedTimetableDayId] ?? null)
    : null;
  const selectedTimetableDayComponentResolution = selectedTimetableDayId
    ? resolveStudioTimetableDayComponent(document, selectedTimetableDayId)
    : null;
  const selectedTimetableVariantSet =
    selectedTimetableCompositionObject?.variantSet ?? null;
  const isSelectedTimetableObjectFitParent = isStudioFillParentLayout(
    selectedTimetableCompositionObject?.layoutMode,
  );
  const selectedTimetableTextObject =
    selectedTimetableCompositionObject?.kind === "text" ||
    selectedTimetableCompositionObject?.kind === "flexibleText"
      ? selectedTimetableCompositionObject
      : null;
  const selectedTimetableBindingInputId = selectedTimetableTextObject
    ? getStudioBindingInputId(selectedTimetableTextObject.binding)
    : null;
  const selectedTimetableBoundInput = selectedTimetableBindingInputId
    ? (document.inputs[selectedTimetableBindingInputId] ?? null)
    : null;
  const selectedTimetableTextValue =
    selectedTimetableTextObject?.binding?.kind === "staticText"
      ? selectedTimetableTextObject.binding.value
      : (selectedTimetableTextObject?.label ?? "");
  const selectedTimetableBuiltinField =
    selectedTimetableTextObject?.binding?.kind === "builtinField"
      ? getStudioBuiltinField(selectedTimetableTextObject.binding.fieldId)
      : null;
  const isSelectedWeekDatesObject =
    selectedTimetableCompositionObject?.presetId === "weekDates" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "weekDates";
  const isSelectedWeeklyMemoObject =
    selectedTimetableCompositionObject?.presetId === "weeklyMemo" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "weeklyMemo";
  const isSelectedProfileBlockObject =
    selectedTimetableCompositionObject?.presetId === "profileBlock" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "profileBlock";
  const isSelectedLegacyProfileBlockObject =
    isSelectedProfileBlockObject &&
    selectedTimetableCompositionObject?.kind === "profileBlock";
  const isSelectedProfileChildObject =
    selectedTimetableCompositionObject?.kind === "image" &&
    Boolean(selectedTimetableCompositionObject.profileRole);
  const isSelectedStructuredBackgroundObject =
    selectedTimetableCompositionObject?.kind === "image" &&
    selectedTimetableCompositionObject.structuredRole === "background";
  const isSelectedArtistProfileTextObject =
    selectedTimetableCompositionObject?.presetId === "artistProfileText" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "artistProfileText";
  const isSelectedTopObject =
    selectedTimetableCompositionObject?.presetId === "topObject" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "topObject";
  const isSelectedBoardObject =
    selectedTimetableCompositionObject?.presetId === "board" ||
    selectedTimetableCompositionObject?.meta?.exception?.semanticKey ===
      "board";
  const isSelectedDayCardsObject =
    selectedTimetableLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
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
  const setActiveGuideVisibility = (visible: boolean) => {
    updateDocument(
      (nextDocument) => {
        if (activeWorkspaceMode === "cards") {
          setStudioCardsGuideVisibility(nextDocument, visible);
        } else {
          setStudioTimetableGuideVisibility(nextDocument, visible);
        }
      },
      { history: false },
    );
  };
  const setActiveGuideOpacity = (opacity: number) => {
    updateDocument(
      (nextDocument) => {
        if (activeWorkspaceMode === "cards") {
          setStudioCardsGuideOpacity(nextDocument, opacity);
        } else {
          setStudioTimetableGuideOpacity(nextDocument, opacity);
        }
      },
      { history: false },
    );
  };
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
  const collapsedTimetableLayerIdsSet = useMemo(
    () => new Set(collapsedTimetableLayerIds),
    [collapsedTimetableLayerIds],
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

  const exportStudioJson = useCallback(() => {
    const currentDocument = studioStore.getState().document;
    const exportDiagnostics = [
      ...validateStudioDocument(currentDocument),
      ...validateStudioRuntimeValuesForDocument(
        currentDocument,
        studioStore.getState().runtimeValues,
      ),
    ];
    const blockingDiagnostics =
      getStudioTemplateBlockingDiagnostics(exportDiagnostics);
    const diagnosticsSummary =
      getStudioTemplateDiagnosticsSummary(exportDiagnostics);

    if (blockingDiagnostics.length > 0) {
      setInspectorSections((currentSections) => ({
        ...currentSections,
        diagnostics: true,
      }));
      showShortcutStatus(
        `Export blocked: ${diagnosticsSummary.errorCount} error(s) · ${diagnosticsSummary.firstError?.title ?? "Check diagnostics"}`,
      );
      return;
    }

    const payload = createStudioTemplateExportPayload(
      currentDocument,
      studioStore.getState().runtimeValues,
    );
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");

    anchor.href = url;
    anchor.download = getStudioTemplateExportFilename(currentDocument);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showShortcutStatus(
      diagnosticsSummary.warningCount > 0
        ? `Exported JSON with ${diagnosticsSummary.warningCount} warning(s)`
        : "Exported JSON",
    );
  }, [setInspectorSections, showShortcutStatus, studioStore]);

  const importStudioJsonFile = useCallback(
    async (file: File) => {
      let source = "";

      try {
        source = await file.text();
      } catch {
        showShortcutStatus("Import failed: could not read file");
        return;
      }

      const importResult = parseStudioTemplateExportJson(source);

      if (!importResult.ok) {
        showShortcutStatus(`Import failed: ${importResult.message}`);
        return;
      }

      const nextDocument = cloneDocument(importResult.document);
      const nextRuntimeValues = normalizeRuntimeValuesForTimetableCapabilities(
        cloneRuntimeValues(importResult.runtimeValues),
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
      setRuntimeValues(nextRuntimeValues);
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

      const warningCount = importResult.diagnostics.filter(
        (diagnostic) => diagnostic.severity === "warning",
      ).length;
      const migrationWarningCount = importResult.migrationWarnings.length;
      showShortcutStatus(
        importResult.usedRuntimeFallback
          ? "Imported JSON with default runtime values"
          : migrationWarningCount > 0
            ? `Imported JSON with ${migrationWarningCount} migration note(s)`
            : warningCount > 0
              ? `Imported JSON with ${warningCount} warning(s)`
              : "Imported JSON",
      );
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

  const ensureRemoteTemplateId = useCallback(async (): Promise<string> => {
    if (remoteTemplateId) {
      return remoteTemplateId;
    }

    const currentDocument = studioStore.getState().document;
    const created = await createTemplateStudioTemplateMutation.mutateAsync({
      name: currentDocument.metadata.name.trim() || "Untitled Template",
      description: currentDocument.metadata.description ?? "",
    });

    setRemoteTemplateId(created.template.id);
    return created.template.id;
  }, [createTemplateStudioTemplateMutation, remoteTemplateId, studioStore]);

  const applyRemoteTemplateState = useCallback(
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

  useEffect(() => {
    if (!initialRemoteTemplateId) return;
    if (remoteTemplateId !== initialRemoteTemplateId) return;
    if (autoLoadedRemoteTemplateIdRef.current === initialRemoteTemplateId) {
      return;
    }

    const remoteTemplate = templateStudioTemplateQuery.data;
    if (!remoteTemplate) return;

    autoLoadedRemoteTemplateIdRef.current = initialRemoteTemplateId;

    const source = remoteTemplate.draft ?? remoteTemplate.document;
    if (!source) {
      showShortcutStatus("Database template is empty");
      return;
    }

    applyRemoteTemplateState(
      cloneDocument(source.document),
      cloneRuntimeValues(source.runtimeValues),
      remoteTemplate.draft
        ? "Loaded database draft"
        : "Loaded published document",
    );
  }, [
    applyRemoteTemplateState,
    initialRemoteTemplateId,
    remoteTemplateId,
    showShortcutStatus,
    templateStudioTemplateQuery.data,
  ]);

  const ensureTemplateStudioAssetsSynced = useCallback(
    async (templateId: string): Promise<StudioTemplateDocument> => {
      const currentDocument = studioStore.getState().document;
      const nextDocument = cloneDocument(currentDocument);
      const remoteAssetsById = new Map(
        (templateStudioTemplateQuery.data?.assets ?? []).map((asset) => [
          asset.assetId,
          asset,
        ]),
      );
      const syncAssets: TemplateStudioUploadAssetPayload[] = [];
      let changed = false;

      const applySyncedAsset = (asset: TemplateStudioUploadedAsset) => {
        const currentAsset = nextDocument.assets[asset.id];
        if (!currentAsset) return;

        nextDocument.assets[asset.id] = {
          ...currentAsset,
          src: asset.publicUrl ?? asset.src,
          storageProvider: asset.storageProvider ?? "r2",
          storagePath: asset.storagePath,
          publicUrl: asset.publicUrl ?? asset.src,
          contentHash: asset.contentHash,
          mimeType: asset.mimeType,
          byteSize: asset.byteSize,
          lastSyncedAt: asset.lastSyncedAt ?? undefined,
        };
        changed = true;
      };

      for (const asset of Object.values(nextDocument.assets)) {
        const remoteAsset = remoteAssetsById.get(asset.id);
        const remoteUrl = remoteAsset?.publicUrl ?? null;

        if (DATA_IMAGE_URL_PATTERN.test(asset.src)) {
          const localMetadata = await getStudioDataImageMetadata(asset.src);
          const canReuseRemote =
            Boolean(localMetadata?.contentHash) &&
            remoteAsset?.storageProvider === "r2" &&
            remoteUrl &&
            remoteAsset.contentHash === localMetadata?.contentHash &&
            remoteAsset.mimeType === localMetadata.mimeType &&
            remoteAsset.byteSize === localMetadata.byteSize;

          if (canReuseRemote && localMetadata?.contentHash && remoteUrl) {
            applySyncedAsset({
              id: asset.id,
              label: asset.label,
              src: remoteUrl,
              storageProvider: "r2",
              storagePath: remoteAsset.storagePath,
              publicUrl: remoteUrl,
              contentHash: localMetadata.contentHash,
              mimeType: localMetadata.mimeType,
              byteSize: localMetadata.byteSize,
              uploaded: false,
              lastSyncedAt: remoteAsset.lastSyncedAt,
            });
            continue;
          }

          syncAssets.push({
            assetId: asset.id,
            label: asset.label,
            src: asset.src,
            localContentHash: localMetadata?.contentHash ?? undefined,
            mimeType: localMetadata?.mimeType,
            byteSize: localMetadata?.byteSize,
          });
          continue;
        }

        if (
          remoteAsset?.storageProvider === "r2" &&
          remoteUrl &&
          (asset.src === remoteUrl ||
            asset.publicUrl === remoteUrl ||
            asset.storagePath === remoteAsset.storagePath ||
            (asset.contentHash &&
              remoteAsset.contentHash &&
              asset.contentHash === remoteAsset.contentHash))
        ) {
          applySyncedAsset({
            id: asset.id,
            label: asset.label,
            src: remoteUrl,
            storageProvider: "r2",
            storagePath: remoteAsset.storagePath,
            publicUrl: remoteUrl,
            contentHash: remoteAsset.contentHash ?? undefined,
            mimeType: remoteAsset.mimeType,
            byteSize: remoteAsset.byteSize ?? 0,
            uploaded: false,
            lastSyncedAt: remoteAsset.lastSyncedAt,
          });
        }
      }

      if (syncAssets.length > 0) {
        showShortcutStatus(`Syncing ${syncAssets.length} asset(s)`);
        const synced = await syncTemplateStudioAssetsMutation.mutateAsync({
          templateId,
          assets: syncAssets,
        });
        synced.assets.forEach(applySyncedAsset);
      }

      if (!changed) {
        return currentDocument;
      }

      setDocument(nextDocument);

      if (syncAssets.length > 0) {
        showShortcutStatus(`Synced ${syncAssets.length} asset(s)`);
      }

      return nextDocument;
    },
    [
      setDocument,
      showShortcutStatus,
      studioStore,
      syncTemplateStudioAssetsMutation,
      templateStudioTemplateQuery.data?.assets,
    ],
  );

  const loadRemoteTemplate = useCallback(async () => {
    if (!remoteTemplateId) {
      showShortcutStatus("Select a database template first");
      return;
    }

    try {
      const result = await templateStudioTemplateQuery.refetch();
      const remoteTemplate = result.data;

      if (!remoteTemplate) {
        showShortcutStatus("Database template load failed");
        return;
      }

      const source = remoteTemplate.draft ?? remoteTemplate.document;

      if (!source) {
        showShortcutStatus("Database template is empty");
        return;
      }

      applyRemoteTemplateState(
        cloneDocument(source.document),
        cloneRuntimeValues(source.runtimeValues),
        remoteTemplate.draft
          ? "Loaded database draft"
          : "Loaded published document",
      );
    } catch (error) {
      console.error("Template Studio database load failed:", error);
      showShortcutStatus("Database load failed");
    }
  }, [
    applyRemoteTemplateState,
    remoteTemplateId,
    showShortcutStatus,
    templateStudioTemplateQuery,
  ]);

  const saveDatabaseDraft = useCallback(async () => {
    try {
      const templateId = await ensureRemoteTemplateId();
      const latestRevisionNo =
        templateStudioTemplateQuery.data?.latestRevisionNo ?? null;
      const nextDocument = await ensureTemplateStudioAssetsSynced(templateId);

      await saveTemplateStudioDraftMutation.mutateAsync({
        templateId,
        payload: {
          document: nextDocument,
          runtimeValues: studioStore.getState().runtimeValues,
          baseRevisionNo: latestRevisionNo,
          isAutosave: false,
        },
      });

      showShortcutStatus("Draft saved to database");
    } catch (error) {
      console.error("Template Studio database draft save failed:", error);
      showShortcutStatus("Database draft save failed");
    }
  }, [
    ensureRemoteTemplateId,
    ensureTemplateStudioAssetsSynced,
    saveTemplateStudioDraftMutation,
    showShortcutStatus,
    studioStore,
    templateStudioTemplateQuery.data?.latestRevisionNo,
  ]);

  const publishRemoteDocument = useCallback(async () => {
    try {
      const templateId = await ensureRemoteTemplateId();
      const nextDocument = await ensureTemplateStudioAssetsSynced(templateId);
      const published = await publishTemplateStudioDocumentMutation.mutateAsync(
        {
          templateId,
          payload: {
            document: nextDocument,
            runtimeValues: studioStore.getState().runtimeValues,
          },
        },
      );

      showShortcutStatus(`Published revision ${published.revisionNo}`);
    } catch (error) {
      console.error("Template Studio publish failed:", error);
      showShortcutStatus("Publish failed");
    }
  }, [
    ensureRemoteTemplateId,
    ensureTemplateStudioAssetsSynced,
    publishTemplateStudioDocumentMutation,
    showShortcutStatus,
    studioStore,
  ]);

  const openRuntimeDraftPreview = useCallback(async () => {
    try {
      const templateId = await ensureRemoteTemplateId();
      const syncedDocument = await ensureTemplateStudioAssetsSynced(templateId);
      const latestRevisionNo =
        templateStudioTemplateQuery.data?.latestRevisionNo ?? null;

      await saveTemplateStudioDraftMutation.mutateAsync({
        templateId,
        payload: {
          document: syncedDocument,
          runtimeValues: studioStore.getState().runtimeValues,
          baseRevisionNo: latestRevisionNo,
          isAutosave: false,
        },
      });

      const previewUrl = `/admin/template-studio/${templateId}/preview`;
      const previewWindow = window.open(previewUrl, "_blank");

      if (!previewWindow) {
        window.location.assign(previewUrl);
      }

      showShortcutStatus("Saved draft preview");
    } catch (error) {
      console.error("Template Studio preview open failed:", error);
      showShortcutStatus("Preview open failed");
    }
  }, [
    ensureRemoteTemplateId,
    ensureTemplateStudioAssetsSynced,
    saveTemplateStudioDraftMutation,
    showShortcutStatus,
    studioStore,
    templateStudioTemplateQuery.data?.latestRevisionNo,
  ]);

  const openSavedPreview = useCallback(() => {
    if (!remoteTemplateId) {
      showShortcutStatus("Save or publish a database template first");
      return;
    }

    const previewUrl = `/admin/template-studio/${remoteTemplateId}/preview`;
    const previewWindow = window.open(previewUrl, "_blank");

    if (!previewWindow) {
      window.location.assign(previewUrl);
    }
  }, [remoteTemplateId, showShortcutStatus]);

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

  const selectCardComponent = useCallback(
    (componentId: StudioTimetableComponentId) => {
      const nextDocument = studioStore.getState().document;
      const component =
        nextDocument.domains?.timetable?.components[componentId];
      if (!component) return;

      setSelectedCardComponentId(componentId);
      setComponentLabelDraft(component.label);
      const resolution = resolveStudioTimetableComponentVariant(
        nextDocument,
        component,
        selectedCardStatusId,
      );
      const rootNodeId = resolution?.variant.rootNodeId;
      if (rootNodeId) {
        restoreSelection([rootNodeId], rootNodeId);
      }
    },
    [
      restoreSelection,
      selectedCardStatusId,
      setSelectedCardComponentId,
      studioStore,
    ],
  );

  const duplicateSelectedCardComponent = () => {
    if (!activeCardComponentId) return;

    let nextComponentId: StudioTimetableComponentId | null = null;
    let failureReason: string | null = null;
    updateDocument((nextDocument) => {
      const result = cloneStudioTimetableComponentSet(
        nextDocument,
        activeCardComponentId,
      );
      if (result.ok) {
        nextComponentId = result.componentId;
      } else {
        failureReason = result.reason;
      }
    });

    if (!nextComponentId) {
      showShortcutStatus(failureReason ?? "Component set duplicate failed");
      return;
    }
    selectCardComponent(nextComponentId);
    showShortcutStatus("Component set duplicated");
  };

  const commitSelectedCardComponentLabel = () => {
    if (!activeCardComponentId || !cardEntryComponent) return;
    const nextLabel = componentLabelDraft.trim();
    if (!nextLabel) {
      setComponentLabelDraft(cardEntryComponent.label);
      return;
    }
    if (nextLabel === cardEntryComponent.label) return;

    updateDocument((nextDocument) => {
      const component =
        nextDocument.domains?.timetable?.components[activeCardComponentId];
      if (component) component.label = nextLabel;
    });
    setComponentLabelDraft(nextLabel);
    showShortcutStatus("Component set renamed");
  };

  const deleteSelectedCardComponent = () => {
    if (!activeCardComponentId) return;
    const reason = getStudioTimetableComponentSetDeleteReason(
      studioStore.getState().document,
      activeCardComponentId,
    );
    if (reason) {
      showShortcutStatus(reason);
      return;
    }
    if (!window.confirm("Delete this unused component set?")) return;

    let failureReason: string | null = null;
    updateDocument((nextDocument) => {
      const result = deleteStudioTimetableComponentSet(
        nextDocument,
        activeCardComponentId,
      );
      if (!result.ok) failureReason = result.reason;
    });
    if (failureReason) {
      showShortcutStatus(failureReason);
      return;
    }

    const timetable = studioStore.getState().document.domains?.timetable;
    const fallbackComponentId = timetable?.entryComponentId;
    if (fallbackComponentId) selectCardComponent(fallbackComponentId);
    showShortcutStatus("Component set deleted");
  };

  const assignComponentSetToSelectedDay = (
    componentId: StudioTimetableComponentId,
  ) => {
    if (!selectedTimetableDayId) return;
    updateDocument((nextDocument) => {
      const timetable = nextDocument.domains?.timetable;
      const day = timetable?.days[selectedTimetableDayId];
      if (!timetable || !day || !timetable.components[componentId]) return;

      if (componentId === timetable.entryComponentId) {
        delete day.componentId;
      } else {
        day.componentId = componentId;
      }
    });
    showShortcutStatus(
      `${selectedTimetableDay?.label ?? "Day"} component set updated`,
    );
  };

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

  const updateTimetableCanvasSize = (nextSize: {
    width?: number;
    height?: number;
    backgroundColor?: string;
  }) => {
    updateDocument((nextDocument) => {
      const timetable = nextDocument.domains?.timetable;
      if (!timetable) return;
      const currentCanvas = timetable.canvas ?? {
        width: 4000,
        height: 2250,
        backgroundColor: "#eef2f7",
      };
      timetable.canvas = {
        width: normalizeStudioDimension(
          nextSize.width ?? currentCanvas.width,
          currentCanvas.width,
        ),
        height: normalizeStudioDimension(
          nextSize.height ?? currentCanvas.height,
          currentCanvas.height,
        ),
        backgroundColor:
          nextSize.backgroundColor ?? currentCanvas.backgroundColor,
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

  const addCardContextObject = (preset: StudioCardContextObjectPreset) => {
    const existingNodeId = getStudioPresetExistingTargetId(document, preset, {
      cardRootNodeId: selectedCardVariantRootId,
    });

    if (existingNodeId) {
      selectSingleNode(existingNodeId);
      setPanelMode("layers");
      showShortcutStatus(`Selected existing ${preset.label}`);
      return;
    }

    const plan = planStudioAddCardContextObject(
      document,
      preset,
      selectedNode,
      selectedCardVariantRootId,
    );

    updateDocument((nextDocument) => {
      applyStudioInsertNode(nextDocument, plan);
    });

    selectSingleNode(plan.node.id);
    setPanelMode("layers");
    showShortcutStatus(`Added ${preset.label}`);
  };

  const addCardStatusBackgroundObject = (
    preset: StudioCardStatusBackgroundPreset,
  ) => {
    const existingNodeId = getStudioPresetExistingTargetId(document, preset, {
      cardRootNodeId: selectedCardVariantRootId,
    });

    if (existingNodeId) {
      selectSingleNode(existingNodeId);
      setPanelMode("layers");
      showShortcutStatus(`Selected existing ${preset.label}`);
      return;
    }

    const plan = planStudioAddCardStatusBackground(
      document,
      preset,
      selectedNode,
      selectedCardVariantRootId,
    );

    updateDocument((nextDocument) => {
      applyStudioInsertNode(nextDocument, plan);
    });

    selectSingleNode(plan.node.id);
    setPanelMode("layers");
    showShortcutStatus(`Added ${preset.label}`);
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

  const getAssetIdByLabel = (label: string): string | null =>
    assets.find(
      (asset) => asset.label.trim().toLowerCase() === label.toLowerCase(),
    )?.id ?? null;

  const createSelectConsumerNode = (
    nextDocument: StudioTemplateDocument,
    input: StudioSelectConsumerInput,
  ): string => createStudioSelectConsumerNode(nextDocument, input);

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
  const addCardSelectInputBundle = (
    preset: StudioCardSelectInputBundlePreset,
  ) => {
    const inputId = createStudioId("input");
    const parentId = getCardInsertionParentId();
    const isSticker = preset.bundleKind === "stickerSelect";
    const creationRule = getStudioPresetCreationRule(preset);
    const inputLabelBase =
      creationRule.mode === "repeatable"
        ? creationRule.labelBase
        : isSticker
          ? "Entry Sticker"
          : "Entry Select";
    const inputLabel = getUniqueStudioInputLabel(document, inputLabelBase);
    const options: StudioSelectOption[] = isSticker
      ? [
          { value: "none", label: "None" },
          { value: "spark", label: "Spark" },
          { value: "heart", label: "Heart" },
        ]
      : [
          { value: "option-a", label: "Option A" },
          { value: "option-b", label: "Option B" },
        ];
    const input: Extract<StudioInputDefinition, { type: "select" }> = {
      id: inputId,
      type: "select",
      scope: "entry",
      label: inputLabel,
      defaultValue: isSticker ? "spark" : "option-a",
      options,
    };

    let nextPrimaryNodeId: string | null = null;

    updateDocument((nextDocument) => {
      nextDocument.inputs[inputId] = input;

      const labelNodeId = createSelectConsumerNode(nextDocument, {
        parentId,
        input,
        kind: "text",
        label: isSticker ? "Selected Sticker Label" : `${inputLabel} Label`,
      });
      nextPrimaryNodeId = labelNodeId;

      if (isSticker) {
        nextPrimaryNodeId = createSelectConsumerNode(nextDocument, {
          parentId,
          input,
          kind: "image",
          label: "Sticker Preview",
          assetByOption: {
            none: null,
            spark: getAssetIdByLabel("Spark Sticker"),
            heart: getAssetIdByLabel("Heart Sticker"),
          },
        });
      }
    });

    setRuntimeValues((currentValues) =>
      addRuntimeDefaultForInput(document, currentValues, input),
    );
    setSelectedInputId(inputId);

    if (nextPrimaryNodeId) {
      selectSingleNode(nextPrimaryNodeId);
      setPanelMode("layers");
    } else {
      setPanelMode("inputs");
    }

    showShortcutStatus(`Added ${preset.label}`);
  };

  const createTemplateAssetFromDataUrl = (
    file: File,
    src: string,
    fallbackLabel: string,
    onAssetCreated?: (
      nextDocument: StudioTemplateDocument,
      assetId: string,
    ) => void,
  ) => {
    if (!src) return;
    const assetId = createStudioId("asset");
    const baseLabel = getStudioAssetLabelFromFile(file, fallbackLabel);

    updateDocument((nextDocument) => {
      nextDocument.assets[assetId] = {
        id: assetId,
        label: getUniqueStudioAssetLabel(nextDocument, baseLabel),
        src,
      };
      onAssetCreated?.(nextDocument, assetId);
    });
    showShortcutStatus(`Uploaded ${baseLabel}`);
  };

  const uploadTimetableGuide = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageSrc = String(reader.result ?? "");
      if (!imageSrc) return;

      createTemplateAssetFromDataUrl(
        file,
        imageSrc,
        "Timetable Guide",
        (nextDocument, assetId) => {
          setStudioTimetableGuideAsset(nextDocument, assetId);
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const uploadCardsGuide = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imageSrc = String(reader.result ?? "");
      if (!imageSrc) return;

      createTemplateAssetFromDataUrl(
        file,
        imageSrc,
        "Cards Guide",
        (nextDocument, assetId) => {
          setStudioCardsGuideAsset(nextDocument, assetId);
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const removeCardsGuide = () => {
    updateDocument((nextDocument) => {
      setStudioCardsGuideAsset(nextDocument, null);
    });
    showShortcutStatus("Removed cards guide");
  };

  const removeTimetableGuide = () => {
    updateDocument((nextDocument) => {
      setStudioTimetableGuideAsset(nextDocument, null);
    });
    showShortcutStatus("Removed timetable guide");
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
  const updateTimetableCompositionObject = useCallback(
    (
      objectId: string,
      updater: (
        object: StudioTimetableCompositionObject,
        composition: StudioTimetableComposition,
        timetable: StudioTimetableDomain,
      ) => void,
      options: UpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[objectId];
        if (!object) return;

        updater(object, composition, timetable);
      }, options);
    },
    [updateDocument],
  );

  /** 기본값과 dayOffsets를 펼친 day cards 레이아웃 초안. */
  const createTimetableDayCardsLayoutDraft = (
    timetable: StudioTimetableDomain,
  ) => ({
    ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
    ...(timetable.dayCardsLayout ?? {}),
    dayOffsets: { ...(timetable.dayCardsLayout?.dayOffsets ?? {}) },
  });

  const toggleTimetableObjectFitParent = useCallback(
    (objectId: string) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[objectId];
        if (!isStudioPlacedTimetableObject(object)) return;

        applyStudioTimetableObjectFitParent(
          object,
          !isStudioFillParentLayout(object.layoutMode),
          resolveStudioTimetableObjectGeometry(
            composition,
            objectId,
            getStudioTimetablePreviewSize(timetable),
          ),
        );
      });
    },
    [updateDocument],
  );
  const addTimetablePresetObject = useCallback(
    (preset: StudioTimetableCompositionPreset) => {
      const existingObjectId = getStudioPresetExistingTargetId(
        document,
        preset,
      );

      if (preset.singleton && existingObjectId) {
        let linkedInput = false;
        updateDocument((nextDocument) => {
          linkedInput = relinkStudioTimetablePresetInput(
            nextDocument,
            preset,
            existingObjectId,
          );
        });

        setSelectedTimetableLayerId(existingObjectId);
        setPanelMode("layers");
        showShortcutStatus(
          getStudioTimetablePresetMessage(preset.label, {
            existing: true,
            linkedInput,
          }),
        );
        return;
      }

      const insertion: { result: StudioTimetablePresetInsertResult | null } = {
        result: null,
      };
      updateDocument((nextDocument) => {
        insertion.result = insertStudioTimetablePresetObject(
          nextDocument,
          preset,
        );
      });

      if (!insertion.result) {
        showShortcutStatus("Timetable is not available");
        return;
      }

      setSelectedTimetableLayerId(insertion.result.objectId);
      setPanelMode("layers");
      showShortcutStatus(
        getStudioTimetablePresetMessage(preset.label, {
          existing: false,
          linkedInput: insertion.result.linkedInput,
        }),
      );
    },
    [
      document,
      setPanelMode,
      setSelectedTimetableLayerId,
      showShortcutStatus,
      updateDocument,
    ],
  );
  const moveTimetableRootObjectLayer = useCallback(
    (
      sourceObjectId: string,
      targetObjectId: string,
      position: "before" | "after",
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const nextRootObjectIds = reorderStudioIdList(
          composition.rootObjectIds.filter(
            (objectId) => composition.objects[objectId],
          ),
          sourceObjectId,
          targetObjectId,
          position,
        );
        if (!nextRootObjectIds) return;

        composition.rootObjectIds = nextRootObjectIds;
      });

      setSelectedTimetableLayerId(sourceObjectId);
      showShortcutStatus("Moved timetable layer");
    },
    [setSelectedTimetableLayerId, showShortcutStatus, updateDocument],
  );
  const moveTimetableDayLayer = useCallback(
    (
      sourceDayId: StudioTimetableDayId,
      targetDayId: StudioTimetableDayId,
      position: "before" | "after",
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const nextDayIds = reorderStudioIdList(
          getStudioTimetableOrderedDayIds(timetable),
          sourceDayId,
          targetDayId,
          position,
        );
        if (!nextDayIds) return;

        timetable.dayIds = nextDayIds;
        nextDayIds.forEach((dayId, order) => {
          timetable.days[dayId].order = order;
        });
      });

      setSelectedTimetableLayerId(
        getStudioTimetableDayCardLayerId(sourceDayId),
      );
      setSelectedRuntimeDayId(sourceDayId);
      setSelectedRuntimeEntryIndex(0);
      showShortcutStatus("Moved day card container");
    },
    [
      setSelectedRuntimeDayId,
      setSelectedRuntimeEntryIndex,
      setSelectedTimetableLayerId,
      showShortcutStatus,
      updateDocument,
    ],
  );
  const selectTimetableCanvasLayer = useCallback(
    (layerId: string) => {
      setSelectedTimetableLayerId(layerId);
      setPanelMode("layers");

      if (!layerId.startsWith("day-card:")) return;

      const dayId = layerId.replace(/^day-card:/, "");
      setSelectedRuntimeDayId(dayId);
      setSelectedRuntimeEntryIndex(0);
    },
    [
      setPanelMode,
      setSelectedRuntimeDayId,
      setSelectedRuntimeEntryIndex,
      setSelectedTimetableLayerId,
    ],
  );

  const updateTimetableLayerPosition = useCallback(
    (
      layerId: string,
      nextPosition: StudioTimetableObjectPosition,
      options: UpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[layerId];

        if (isStudioPlacedTimetableObject(object)) {
          applyStudioTimetableObjectPosition(
            object,
            nextPosition,
            getStudioTimetableCompositionObjectGeometry(object),
          );
          return;
        }

        const layout = createTimetableDayCardsLayoutDraft(timetable);
        const target = resolveStudioTimetableLayerTarget(layerId);

        if (target.kind === "dayCards") {
          layout.left = roundStudioCoordinate(nextPosition.left ?? layout.left);
          layout.top = roundStudioCoordinate(nextPosition.top ?? layout.top);

          const dayCardsObject = composition.objects[layerId];
          if (dayCardsObject && nextPosition.rotateDeg !== undefined) {
            dayCardsObject.style = {
              ...dayCardsObject.style,
              rotateDeg: roundStudioCoordinate(nextPosition.rotateDeg),
            };
          }

          timetable.dayCardsLayout = layout;
          return;
        }

        if (target.kind !== "dayCard") return;

        const { dayId } = target;
        const orderedDayIds = getStudioTimetableOrderedDayIds(timetable);
        const dayIndex = orderedDayIds.indexOf(dayId);
        if (dayIndex < 0) return;

        const getEntryCardSizeForDay = (currentDayId: StudioTimetableDayId) =>
          getStudioTimetableEntryCardSize(
            nextDocument,
            getStudioTimetableDayComponent(nextDocument, currentDayId),
          );
        const getEntryCountForDay = (currentDayId: StudioTimetableDayId) =>
          getStudioTimetableEntriesForDay(
            nextDocument,
            runtimeValues,
            currentDayId,
          ).length;

        // 보정 값을 뺀 기준 좌표를 알아야 새 보정 값을 구할 수 있다.
        const dayGeometry =
          getStudioTimetableDayCardGeometries(
            layout,
            orderedDayIds
              .map((currentDayId) => timetable.days[currentDayId])
              .filter(Boolean),
            getEntryCountForDay,
            getEntryCardSizeForDay,
          )[dayId] ??
          getStudioTimetableDayCardGeometry(
            layout,
            dayId,
            dayIndex,
            getEntryCountForDay(dayId),
            getEntryCardSizeForDay(dayId),
          );
        const currentOffset = layout.dayOffsets[dayId] ?? { left: 0, top: 0 };
        const baseLeft = dayGeometry.left - currentOffset.left;
        const baseTop = dayGeometry.top - currentOffset.top;

        setStudioTimetableDayOffset(layout, dayId, {
          left:
            nextPosition.left !== undefined
              ? nextPosition.left - baseLeft
              : currentOffset.left,
          top:
            nextPosition.top !== undefined
              ? nextPosition.top - baseTop
              : currentOffset.top,
        });
        timetable.dayCardsLayout = layout;
      }, options);
    },
    [runtimeValues, updateDocument],
  );
  const updateTimetableDayCardsLayout = useCallback(
    (
      recipe: (layout: StudioTimetableDayCardsLayout) => void,
      options: UpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const layout = getStudioTimetableDayCardsLayout(timetable);
        recipe(layout);
        timetable.dayCardsLayout = layout;
      }, options);
    },
    [updateDocument],
  );

  const moveTimetableCanvasLayer = useCallback(
    (layerId: string, delta: { deltaX: number; deltaY: number }) => {
      updateDocument(
        (nextDocument) => {
          const timetable = nextDocument.domains?.timetable;
          if (!timetable) return;

          const composition = ensureStudioTimetableComposition(timetable);
          const object = composition.objects[layerId];

          if (isStudioPlacedTimetableObject(object)) {
            applyStudioTimetableObjectOffset(
              object,
              delta,
              getStudioTimetableCompositionObjectGeometry(object),
            );
            return;
          }

          const layout = createTimetableDayCardsLayoutDraft(timetable);
          const target = resolveStudioTimetableLayerTarget(layerId);

          if (target.kind === "dayCards") {
            layout.left = roundStudioCoordinate(layout.left + delta.deltaX);
            layout.top = roundStudioCoordinate(layout.top + delta.deltaY);
            timetable.dayCardsLayout = layout;
            return;
          }

          if (target.kind !== "dayCard") return;

          const currentOffset = layout.dayOffsets[target.dayId] ?? {
            left: 0,
            top: 0,
          };
          setStudioTimetableDayOffset(layout, target.dayId, {
            left: currentOffset.left + delta.deltaX,
            top: currentOffset.top + delta.deltaY,
          });
          timetable.dayCardsLayout = layout;
        },
        { history: false },
      );
    },
    [updateDocument],
  );
  const resolveTimetableDragLayerId = useCallback(
    ({
      targetNodeId,
      targetNodeIds,
      nodeIdsAtPoint,
    }: {
      targetNodeId: string | null;
      targetNodeIds: string[];
      nodeIdsAtPoint: string[];
    }) => {
      const hitLayerIds = Array.from(
        new Set([...targetNodeIds, ...nodeIdsAtPoint]),
      );

      if (
        selectedTimetableLayerId &&
        hitLayerIds.includes(selectedTimetableLayerId)
      ) {
        return selectedTimetableLayerId;
      }

      if (hitLayerIds.includes(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)) {
        return STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
      }

      const dayCardLayerId = hitLayerIds.find((layerId) =>
        layerId.startsWith("day-card:"),
      );

      return dayCardLayerId ?? targetNodeId;
    },
    [selectedTimetableLayerId],
  );

  const clearTimetableLayerDragState = useCallback(() => {
    if (timetableLayerAutoExpandTimerRef.current !== null) {
      window.clearTimeout(timetableLayerAutoExpandTimerRef.current);
      timetableLayerAutoExpandTimerRef.current = null;
    }
    timetableLayerAutoExpandTargetRef.current = null;
    timetableLayerDragStateRef.current = null;
    setTimetableLayerDragState(null);
    setTimetableLayerDropState(null);
  }, []);

  const scheduleTimetableLayerAutoExpand = useCallback(
    (layerId: string, shouldExpand: boolean) => {
      if (!shouldExpand) {
        if (timetableLayerAutoExpandTargetRef.current === layerId) {
          if (timetableLayerAutoExpandTimerRef.current !== null) {
            window.clearTimeout(timetableLayerAutoExpandTimerRef.current);
            timetableLayerAutoExpandTimerRef.current = null;
          }
          timetableLayerAutoExpandTargetRef.current = null;
        }
        return;
      }

      if (timetableLayerAutoExpandTargetRef.current === layerId) return;

      if (timetableLayerAutoExpandTimerRef.current !== null) {
        window.clearTimeout(timetableLayerAutoExpandTimerRef.current);
      }

      timetableLayerAutoExpandTargetRef.current = layerId;
      timetableLayerAutoExpandTimerRef.current = window.setTimeout(() => {
        setCollapsedTimetableLayerIds((currentLayerIds) =>
          currentLayerIds.includes(layerId)
            ? currentLayerIds.filter(
                (currentLayerId) => currentLayerId !== layerId,
              )
            : currentLayerIds,
        );
        timetableLayerAutoExpandTimerRef.current = null;
        timetableLayerAutoExpandTargetRef.current = null;
      }, STUDIO_LAYER_AUTO_EXPAND_DELAY_MS);
    },
    [setCollapsedTimetableLayerIds],
  );

  const handleTimetableLayerDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", layerId);
    const dragState: StudioTimetableLayerDragState = {
      layerId,
      scope: dayId ? "day" : "root",
      dayId,
    };
    timetableLayerDragStateRef.current = dragState;
    setTimetableLayerDragState(dragState);
    setSelectedTimetableLayerId(layerId);
    if (dayId) {
      setSelectedRuntimeDayId(dayId);
      setSelectedRuntimeEntryIndex(0);
    }
  };

  const getTimetableLayerDropBlockedReason = (
    dragState: StudioTimetableLayerDragState,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ): string | null => {
    if (dragState.scope === "root") {
      if (dayId) return "Cannot move root layer into day cards";
      if (dragState.layerId === layerId) return "Already here";
      return null;
    }

    if (!dayId) return "Cannot move day card outside its group";
    if (dragState.dayId === dayId) return "Already here";
    return null;
  };

  const handleTimetableLayerDragOver = (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    dayId?: StudioTimetableDayId,
  ) => {
    const dragState =
      timetableLayerDragStateRef.current ?? timetableLayerDragState;
    if (!dragState) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position =
      event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    const blockedReason = getTimetableLayerDropBlockedReason(
      dragState,
      layerId,
      dayId,
    );
    const targetObject = timetableComposition.objects[layerId];

    scheduleTimetableLayerAutoExpand(
      layerId,
      !dayId &&
        !blockedReason &&
        targetObject?.kind === "generatedDayCards" &&
        collapsedTimetableLayerIds.includes(layerId),
    );

    event.dataTransfer.dropEffect = blockedReason ? "none" : "move";
    setTimetableLayerDropState({
      layerId,
      position,
      blockedReason,
    });
  };

  const handleTimetableLayerDrop = (
    event: React.DragEvent<HTMLElement>,
    targetLayerId: string,
    targetDayId?: StudioTimetableDayId,
  ) => {
    event.preventDefault();
    const dragState =
      timetableLayerDragStateRef.current ?? timetableLayerDragState;
    const dropState = timetableLayerDropState;
    clearTimetableLayerDragState();

    if (
      !dragState ||
      !dropState ||
      dropState.layerId !== targetLayerId ||
      dropState.blockedReason
    ) {
      return;
    }

    if (dragState.scope === "root") {
      if (targetDayId || dragState.layerId === targetLayerId) return;

      moveTimetableRootObjectLayer(
        dragState.layerId,
        targetLayerId,
        getStudioDataDropPosition(dropState.position),
      );
      return;
    }

    if (!dragState.dayId || !targetDayId || dragState.dayId === targetDayId) {
      return;
    }

    moveTimetableDayLayer(dragState.dayId, targetDayId, dropState.position);
  };

  const handleTimetableLayerIndicatorDragOver = (
    event: React.DragEvent<HTMLElement>,
    layerId: string,
    position: "before" | "after",
    dayId?: StudioTimetableDayId,
  ) => {
    const dragState =
      timetableLayerDragStateRef.current ?? timetableLayerDragState;
    if (!dragState) return;

    event.preventDefault();
    event.stopPropagation();

    const blockedReason = getTimetableLayerDropBlockedReason(
      dragState,
      layerId,
      dayId,
    );
    scheduleTimetableLayerAutoExpand(layerId, false);
    event.dataTransfer.dropEffect = blockedReason ? "none" : "move";
    setTimetableLayerDropState({
      layerId,
      position,
      blockedReason,
    });
  };

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

  const resetRuntimeValues = () => {
    captureHistory();
    setRuntimeValues(createInitialStudioRuntimeValues(document));
  };

  const addEntryToActiveDay = () => {
    if (!activeRuntimeDayId) return;
    if (activeRuntimeEntries.length >= maxRuntimeEntries) return;

    const nextEntryIndex = activeRuntimeEntries.length;
    captureHistory();
    setRuntimeValues((currentValues) =>
      addStudioTimetableEntry(
        document,
        currentValues,
        activeRuntimeDayId,
        createStudioId("entry"),
      ),
    );
    setSelectedRuntimeEntryIndex(nextEntryIndex);
    setPanelMode("timetable");
  };

  const removeEntry = (dayId: string, entryIndex: number) => {
    const nextEntryIndex = Math.max(0, entryIndex - 1);
    captureHistory();
    setRuntimeValues((currentValues) =>
      removeStudioTimetableEntry(document, currentValues, dayId, entryIndex),
    );
    setSelectedRuntimeEntryIndex(nextEntryIndex);
  };

  const updateEntryStatus = (
    dayId: string,
    entryIndex: number,
    statusId: StudioTimetableStatusId,
  ) => {
    captureHistory();
    setRuntimeValues((currentValues) =>
      setStudioTimetableEntryStatus(
        document,
        currentValues,
        dayId,
        entryIndex,
        statusId,
      ),
    );
  };

  const setTimetableCapability = useCallback(
    (capabilityKey: StudioTimetableCapabilityKey, enabled: boolean) => {
      const currentDocument = studioStore.getState().document;
      const timetable = currentDocument.domains?.timetable;
      if (!timetable) return;

      const currentCapabilities = getStudioTimetableCapabilities(timetable);
      if (currentCapabilities[capabilityKey].enabled === enabled) return;

      if (
        capabilityKey === "multi" &&
        !enabled &&
        getStudioTimetableDaysWithMultipleEntries(
          studioStore.getState().runtimeValues,
        ).length > 0
      ) {
        showShortcutStatus(
          "Remove extra entries before disabling Multi Status",
        );
        return;
      }

      const nextCapabilities = {
        ...currentCapabilities,
        [capabilityKey]: { enabled },
      };
      const nextDocument = cloneDocument(currentDocument);
      const nextTimetable = nextDocument.domains?.timetable;
      if (!nextTimetable) return;

      captureHistory();

      nextTimetable.capabilities = nextCapabilities;
      if (enabled) {
        ensureStudioTimetableCapabilityStatus(nextTimetable, capabilityKey);
        ensureStudioCapabilityVariant(nextDocument, capabilityKey);
      }

      const nextRuntimeValues = normalizeRuntimeValuesForTimetableCapabilities(
        cloneRuntimeValues(studioStore.getState().runtimeValues),
        nextCapabilities,
      );

      setDocument(nextDocument);
      setRuntimeValues(nextRuntimeValues);
      showShortcutStatus(
        `${capabilityKey === "multi" ? "Multi" : "Offline memo"} ${
          enabled ? "enabled" : "disabled"
        }`,
      );
    },
    [
      captureHistory,
      setDocument,
      setRuntimeValues,
      showShortcutStatus,
      studioStore,
    ],
  );

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isModKey = event.metaKey || event.ctrlKey;
      const isEditingTarget = isStudioShortcutEditingTarget(event.target);
      const isRedoShortcut =
        (isModKey && key === "z" && event.shiftKey) ||
        (event.ctrlKey && !event.metaKey && key === "y");
      const isUndoShortcut = isModKey && key === "z" && !event.shiftKey;

      if (isEditingTarget) return;

      if (key === "escape" && cancelNodeCut()) {
        event.preventDefault();
        event.stopPropagation();
        showShortcutStatus("Cut canceled");
        return;
      }

      if (isUndoShortcut || isRedoShortcut) {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        if (isRedoShortcut) {
          redoEditorState();
        } else {
          undoEditorState();
        }
        return;
      }

      if (isModKey && !event.altKey && key === "s") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) void saveDatabaseDraft();
        return;
      }

      if (isModKey && !event.altKey && key === "a") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) selectAllEditableNodes();
        return;
      }

      if (isModKey && !event.altKey && key === "c") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) copySelectedNode();
        return;
      }

      if (isModKey && !event.altKey && key === "x") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) cutSelectedNode();
        return;
      }

      if (isModKey && !event.altKey && key === "v") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) pasteClipboardNode();
        return;
      }

      if (isModKey && !event.altKey && key === "d") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) duplicateSelectedNode();
        return;
      }

      if (isModKey && !event.altKey && key === "g") {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;
        if (event.shiftKey) {
          ungroupSelectedNodes();
        } else {
          groupSelectedNodes();
        }
        return;
      }

      if (isModKey && event.shiftKey && !event.altKey && key === "l") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) toggleSelectedNodeLock();
        return;
      }

      if (
        isModKey &&
        !event.altKey &&
        (event.key === "]" || event.key === "[")
      ) {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;

        if (event.key === "]") {
          moveSelectedNodeLayer(event.shiftKey ? "front" : "forward");
        } else {
          moveSelectedNodeLayer(event.shiftKey ? "back" : "backward");
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) deleteActiveSelection();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (nodePicker) {
          setNodePicker(null);
        } else {
          selectSingleNode(null);
        }
        return;
      }

      if (!isModKey && !event.altKey && event.key.startsWith("Arrow")) {
        const step = event.shiftKey ? 10 : 1;
        const deltaByKey: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const delta = deltaByKey[event.key];
        if (!delta) return;

        event.preventDefault();
        event.stopPropagation();
        nudgeSelectedNode(delta[0], delta[1]);
        return;
      }

      if (!isModKey) return;

      if (key === "=" || key === "+") {
        event.preventDefault();
        event.stopPropagation();
        setScale((currentScale) =>
          clampStudioPreviewScale(Number((currentScale + 0.1).toFixed(2))),
        );
        return;
      }

      if (key === "-") {
        event.preventDefault();
        event.stopPropagation();
        setScale((currentScale) =>
          clampStudioPreviewScale(Number((currentScale - 0.1).toFixed(2))),
        );
        return;
      }

      if (key === "0") {
        event.preventDefault();
        event.stopPropagation();
        setFitRequestKey((current) => current + 1);
        return;
      }

      if (key === "1") {
        event.preventDefault();
        event.stopPropagation();
        setScale(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cancelNodeCut,
    copySelectedNode,
    cutSelectedNode,
    deleteActiveSelection,
    duplicateSelectedNode,
    groupSelectedNodes,
    moveSelectedNodeLayer,
    nodePicker,
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
  ]);

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

  const getLayerDropPositionFromEvent = useCallback(
    (
      event: React.DragEvent<HTMLElement>,
      targetNodeId: string,
    ): StudioGraphDropPosition => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const offsetRatio =
        bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0.5;
      const targetNode =
        studioStore.getState().document.graph.nodes[targetNodeId];

      if (targetNode?.type !== "group") {
        return offsetRatio < 0.5 ? "before" : "after";
      }

      if (offsetRatio < 0.25) return "before";
      if (offsetRatio > 0.75) return "after";
      return "inside";
    },
    [studioStore],
  );

  const getLayerDropValidation = useCallback(
    (
      sourceNodeIds: string[],
      targetNodeId: string,
      position: StudioGraphDropPosition,
    ) => {
      const validation = validateStudioGraphMove(
        studioStore.getState().document,
        {
          sourceNodeIds,
          targetNodeId,
          position: getStudioDataDropPosition(position),
        },
      );

      if (!validation.ok) return validation;

      const timetableMountNodeId =
        studioStore.getState().document.domains?.timetable?.mountNodeId;
      const mountNode = timetableMountNodeId
        ? studioStore.getState().document.graph.nodes[timetableMountNodeId]
        : null;

      if (
        timetableMountNodeId &&
        validation.sourceNodeIds.includes(timetableMountNodeId) &&
        validation.targetParentId !== (mountNode?.parentId ?? null)
      ) {
        return {
          ...validation,
          ok: false,
          reason: "Root timetable object is locked",
        };
      }

      const protectedCardNodeIds = new Set<string>();
      Object.values(
        studioStore.getState().document.domains?.timetable?.components ?? {},
      ).forEach((component) => {
        Object.values(component.variants).forEach((variant) =>
          protectedCardNodeIds.add(variant.rootNodeId),
        );
      });
      Object.values(studioStore.getState().document.graph.nodes).forEach(
        (node) => {
          if (node.meta?.entrySlot) protectedCardNodeIds.add(node.id);
        },
      );
      const movesProtectedStructure = validation.sourceNodeIds.some(
        (nodeId) => {
          if (!protectedCardNodeIds.has(nodeId)) return false;
          const node = studioStore.getState().document.graph.nodes[nodeId];
          return validation.targetParentId !== (node?.parentId ?? null);
        },
      );
      if (movesProtectedStructure) {
        return {
          ...validation,
          ok: false,
          reason: "Card variant roots and Entry Groups cannot be reparented",
        };
      }

      return validation;
    },
    [studioStore],
  );

  const clearLayerDragState = useCallback(() => {
    if (layerAutoExpandTimerRef.current !== null) {
      window.clearTimeout(layerAutoExpandTimerRef.current);
      layerAutoExpandTimerRef.current = null;
    }
    layerAutoExpandTargetRef.current = null;
    layerDragStateRef.current = null;
    setLayerDropState(null);
  }, []);

  const scheduleLayerGroupAutoExpand = useCallback(
    (nodeId: string, shouldExpand: boolean) => {
      if (!shouldExpand) {
        if (layerAutoExpandTargetRef.current === nodeId) {
          if (layerAutoExpandTimerRef.current !== null) {
            window.clearTimeout(layerAutoExpandTimerRef.current);
            layerAutoExpandTimerRef.current = null;
          }
          layerAutoExpandTargetRef.current = null;
        }
        return;
      }

      if (layerAutoExpandTargetRef.current === nodeId) return;

      if (layerAutoExpandTimerRef.current !== null) {
        window.clearTimeout(layerAutoExpandTimerRef.current);
      }

      layerAutoExpandTargetRef.current = nodeId;
      layerAutoExpandTimerRef.current = window.setTimeout(() => {
        setCollapsedLayerGroupIds((currentNodeIds) =>
          currentNodeIds.includes(nodeId)
            ? currentNodeIds.filter((currentNodeId) => currentNodeId !== nodeId)
            : currentNodeIds,
        );
        layerAutoExpandTimerRef.current = null;
        layerAutoExpandTargetRef.current = null;
      }, STUDIO_LAYER_AUTO_EXPAND_DELAY_MS);
    },
    [setCollapsedLayerGroupIds],
  );

  const handleLayerDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, nodeId: string) => {
      const node = studioStore.getState().document.graph.nodes[nodeId];
      if (!node || isStudioNodeLocked(node)) {
        event.preventDefault();
        showShortcutStatus("Object is locked");
        return;
      }

      const sourceNodeIds = studioStore
        .getState()
        .selectedNodeIds.includes(nodeId)
        ? getStudioTopLevelNodeIds(
            studioStore.getState().document,
            studioStore.getState().selectedNodeIds,
          )
        : [nodeId];
      const hasLockedSource = sourceNodeIds.some((sourceNodeId) =>
        isStudioNodeLocked(
          studioStore.getState().document.graph.nodes[sourceNodeId],
        ),
      );

      if (hasLockedSource) {
        event.preventDefault();
        showShortcutStatus("Selection includes locked object");
        return;
      }

      if (!studioStore.getState().selectedNodeIds.includes(nodeId)) {
        selectSingleNode(nodeId);
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", nodeId);
      layerDragStateRef.current = {
        primaryNodeId: nodeId,
        nodeIds: sourceNodeIds,
      };
      setLayerDropState(null);
    },
    [selectSingleNode, showShortcutStatus, studioStore],
  );

  const handleLayerDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, targetNodeId: string) => {
      const layerDragState = layerDragStateRef.current;
      if (!layerDragState) return;

      event.preventDefault();
      event.stopPropagation();

      const position = getLayerDropPositionFromEvent(event, targetNodeId);
      const validation = getLayerDropValidation(
        layerDragState.nodeIds,
        targetNodeId,
        position,
      );
      const targetNode =
        studioStore.getState().document.graph.nodes[targetNodeId];

      scheduleLayerGroupAutoExpand(
        targetNodeId,
        validation.ok &&
          position === "inside" &&
          targetNode?.type === "group" &&
          targetNode.childIds.length > 0 &&
          collapsedLayerGroupIds.includes(targetNodeId),
      );

      event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
      setLayerDropState({
        nodeId: targetNodeId,
        position,
        blockedReason: validation.ok ? null : validation.reason,
      });
    },
    [
      collapsedLayerGroupIds,
      getLayerDropPositionFromEvent,
      getLayerDropValidation,
      scheduleLayerGroupAutoExpand,
      studioStore,
    ],
  );

  const handleLayerDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, targetNodeId: string) => {
      const layerDragState = layerDragStateRef.current;
      if (!layerDragState) return;

      event.preventDefault();
      event.stopPropagation();

      const position =
        layerDropState?.nodeId === targetNodeId
          ? layerDropState.position
          : getLayerDropPositionFromEvent(event, targetNodeId);
      const validation = getLayerDropValidation(
        layerDragState.nodeIds,
        targetNodeId,
        position,
      );

      if (!validation.ok) {
        showShortcutStatus(validation.reason ?? "Layer move blocked");
        clearLayerDragState();
        return;
      }

      let moveResult = validation;
      const graphPosition = getStudioDataDropPosition(position);
      updateDocument((nextDocument) => {
        moveResult = moveStudioGraphNodes(nextDocument, {
          sourceNodeIds: layerDragState.nodeIds,
          targetNodeId,
          position: graphPosition,
          preserveCanvasPosition: true,
        });
      });

      if (!moveResult.ok) {
        showShortcutStatus(moveResult.reason ?? "Layer move failed");
      } else {
        applyNodeSelection(
          moveResult.sourceNodeIds,
          moveResult.sourceNodeIds.includes(layerDragState.primaryNodeId)
            ? layerDragState.primaryNodeId
            : moveResult.sourceNodeIds.at(-1),
        );
        if (position === "inside") {
          setCollapsedLayerGroupIds((currentNodeIds) =>
            currentNodeIds.filter((nodeId) => nodeId !== targetNodeId),
          );
        }
        setPanelMode("layers");
        showShortcutStatus(
          `Moved ${moveResult.sourceNodeIds.length} ${getStudioSelectionLabel(
            moveResult.sourceNodeIds.length,
          )}`,
        );
      }

      clearLayerDragState();
    },
    [
      applyNodeSelection,
      clearLayerDragState,
      getLayerDropPositionFromEvent,
      getLayerDropValidation,
      layerDropState,
      setCollapsedLayerGroupIds,
      setPanelMode,
      showShortcutStatus,
      updateDocument,
    ],
  );

  const handleLayerIndicatorDragOver = useCallback(
    (
      event: React.DragEvent<HTMLElement>,
      targetNodeId: string,
      position: "before" | "after",
    ) => {
      const layerDragState = layerDragStateRef.current;
      if (!layerDragState) return;

      event.preventDefault();
      event.stopPropagation();

      const validation = getLayerDropValidation(
        layerDragState.nodeIds,
        targetNodeId,
        position,
      );
      scheduleLayerGroupAutoExpand(targetNodeId, false);
      event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
      setLayerDropState({
        nodeId: targetNodeId,
        position,
        blockedReason: validation.ok ? null : validation.reason,
      });
    },
    [getLayerDropValidation, scheduleLayerGroupAutoExpand],
  );

  const renderTimetableDropIndicator = (
    layerId: string,
    depth: number,
    position: "before" | "after",
    dayId?: StudioTimetableDayId,
  ) => {
    const isActive =
      timetableLayerDropState?.layerId === layerId &&
      timetableLayerDropState.position === position;
    if (!isActive) return null;

    return (
      <StudioLayerDropIndicator
        blockedReason={timetableLayerDropState?.blockedReason}
        depth={depth}
        key={`${layerId}:${position}:drop`}
        position={position}
        onDragOver={(event) =>
          handleTimetableLayerIndicatorDragOver(event, layerId, position, dayId)
        }
        onDrop={(event) => handleTimetableLayerDrop(event, layerId, dayId)}
      />
    );
  };

  const renderTimetableCompositionLayerTree = (
    objectId: string,
    depth = 0,
    parentHidden = false,
    visitedObjectIds = new Set<string>(),
  ): React.ReactNode => {
    if (visitedObjectIds.has(objectId)) return null;

    const object = timetableComposition.objects[objectId];
    if (!object) return null;

    const nextVisitedObjectIds = new Set(visitedObjectIds);
    nextVisitedObjectIds.add(objectId);
    const isRoot = depth === 0;
    const isGeneratedDayCards = object.kind === "generatedDayCards";
    const childIds =
      object.kind === "group"
        ? getStudioTimetableObjectRenderableChildIds(object)
        : [];
    const isGroup = isGeneratedDayCards || object.kind === "group";
    const isCollapsed = collapsedTimetableLayerIdsSet.has(object.id);
    const hidden = parentHidden || Boolean(object.hidden);
    const blockedReason =
      isRoot && timetableLayerDropState?.layerId === objectId
        ? timetableLayerDropState.blockedReason
        : null;
    const type = isGroup
      ? "group"
      : object.kind === "profileBlock"
        ? "block"
        : object.kind === "image" || object.kind === "topObject"
          ? "image"
          : object.kind === "flexibleText"
            ? "auto text"
            : "text";

    return (
      <React.Fragment key={object.id}>
        {isRoot
          ? renderTimetableDropIndicator(object.id, depth, "before")
          : null}
        <StudioTimetableLayerRow
          blockedReason={blockedReason}
          collapsed={isCollapsed}
          collapsible={
            isGeneratedDayCards ||
            (object.kind === "group" && childIds.length > 0)
          }
          depth={depth}
          draggable={isRoot}
          hidden={hidden}
          id={object.id}
          key={object.id}
          label={object.label}
          selectedLayerId={selectedTimetableLayerId}
          type={type}
          onDragEnd={isRoot ? clearTimetableLayerDragState : undefined}
          onDragOver={
            isRoot
              ? (event) => handleTimetableLayerDragOver(event, object.id)
              : undefined
          }
          onDragStart={
            isRoot
              ? (event) => handleTimetableLayerDragStart(event, object.id)
              : undefined
          }
          onDrop={
            isRoot
              ? (event) => handleTimetableLayerDrop(event, object.id)
              : undefined
          }
          onSelectLayer={setSelectedTimetableLayerId}
          onToggleCollapsed={
            isGroup ? () => toggleTimetableLayerCollapsed(object.id) : undefined
          }
        />
        {!isCollapsed && isGeneratedDayCards
          ? timetableDays.map((day) => {
              const layerId = `day-card:${day.id}`;
              const dayBlockedReason =
                timetableLayerDropState?.layerId === layerId
                  ? timetableLayerDropState.blockedReason
                  : null;

              return (
                <React.Fragment key={day.id}>
                  {renderTimetableDropIndicator(
                    layerId,
                    depth + 1,
                    "before",
                    day.id,
                  )}
                  <StudioTimetableLayerRow
                    blockedReason={dayBlockedReason}
                    depth={depth + 1}
                    draggable
                    hidden={hidden}
                    id={layerId}
                    key={layerId}
                    label={`${day.shortLabel ?? day.label} Card`}
                    selectedLayerId={selectedTimetableLayerId}
                    type="day"
                    onDragEnd={clearTimetableLayerDragState}
                    onDragOver={(event) =>
                      handleTimetableLayerDragOver(event, layerId, day.id)
                    }
                    onDragStart={(event) =>
                      handleTimetableLayerDragStart(event, layerId, day.id)
                    }
                    onDrop={(event) =>
                      handleTimetableLayerDrop(event, layerId, day.id)
                    }
                    onSelectLayer={setSelectedTimetableLayerId}
                    onSelect={() => {
                      setSelectedRuntimeDayId(day.id);
                      setSelectedRuntimeEntryIndex(0);
                    }}
                  />
                  {renderTimetableDropIndicator(
                    layerId,
                    depth + 1,
                    "after",
                    day.id,
                  )}
                </React.Fragment>
              );
            })
          : null}
        {!isCollapsed && object.kind === "group"
          ? getStudioLayerPanelOrder(childIds).map((childId) =>
              renderTimetableCompositionLayerTree(
                childId,
                depth + 1,
                hidden,
                nextVisitedObjectIds,
              ),
            )
          : null}
        {isRoot
          ? renderTimetableDropIndicator(object.id, depth, "after")
          : null}
      </React.Fragment>
    );
  };

  const renderTimetableLayersPanel = () => (
    <StudioLayerPanelFrame
      summary={`${timetableComposition.rootObjectIds.length} placed objects`}
      title="Timetable Layers"
    >
      {getStudioLayerPanelOrder(timetableComposition.rootObjectIds).map(
        (objectId) => renderTimetableCompositionLayerTree(objectId),
      )}
    </StudioLayerPanelFrame>
  );

  const renderTimetablePresetsPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Timetable Presets
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          {timetablePresetGroups.reduce(
            (count, group) => count + group.presets.length,
            0,
          )}{" "}
          presets
        </div>
      </div>
      <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {timetablePresetGroups.length === 0 ? (
          <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-3 text-xs font-semibold text-[var(--fg3)]">
            No presets yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {timetablePresetGroups.map((group) => (
              <section className="grid gap-1.5" key={group.title}>
                <div className="px-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
                  {group.title}
                </div>
                {group.presets.map(
                  ({ definition, disabledReason, existingTargetId }) => {
                    const canInsert =
                      isStudioTimetableCompositionPreset(definition) &&
                      !disabledReason;
                    const statusLabel =
                      disabledReason ??
                      (existingTargetId ? "Added" : definition.typeLabel);

                    return (
                      <button
                        className={cn(
                          "flex min-h-12 w-full items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-left transition",
                          canInsert
                            ? "hover:border-[var(--accent)] hover:bg-[var(--hover)]"
                            : "cursor-not-allowed opacity-55",
                        )}
                        disabled={!canInsert}
                        key={definition.id}
                        title={definition.description ?? definition.label}
                        type="button"
                        onClick={() => {
                          if (!isStudioTimetableCompositionPreset(definition)) {
                            return;
                          }
                          addTimetablePresetObject(definition);
                        }}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--sel)] text-[var(--accent)]">
                          <Type size={15} />
                        </span>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate text-[12px] font-bold text-[var(--fg)]">
                            {definition.label}
                          </span>
                          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
                            {statusLabel}
                          </span>
                        </span>
                        {existingTargetId ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        ) : (
                          <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--fg2)]" />
                        )}
                      </button>
                    );
                  },
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCardsPresetsPanel = () => (
    <div className="template-studio-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Cards Presets
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          Add objects and reusable bundles
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-3 py-3">
        {(["group", "text", "flexibleText", "image"] as const).map((type) => (
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
      <div className="grid gap-3 border-t border-[var(--border)] px-3 py-3">
        {cardPresetGroups.length === 0 ? (
          <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--fg3)]">
            No card presets yet.
          </div>
        ) : (
          cardPresetGroups.map((group) => (
            <section className="grid gap-1.5" key={group.title}>
              <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
                {group.title}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {group.presets.map(
                  ({ definition, disabledReason, existingTargetId }) => {
                    const canInsert =
                      (isStudioCardContextObjectPreset(definition) ||
                        isStudioCardStatusBackgroundPreset(definition) ||
                        isStudioCardSelectInputBundlePreset(definition)) &&
                      !disabledReason;

                    return (
                      <button
                        className={cn(
                          "flex h-9 min-w-0 items-center justify-center gap-1 rounded-[8px] border border-[var(--field-border)] bg-[var(--field)] px-2 text-[11px] font-bold text-[var(--fg2)] transition",
                          canInsert
                            ? "hover:border-[var(--accent)] hover:text-[var(--fg)]"
                            : "cursor-not-allowed opacity-55",
                        )}
                        disabled={!canInsert}
                        key={definition.id}
                        title={
                          disabledReason ??
                          (existingTargetId
                            ? `Select existing ${definition.label}`
                            : `Add ${definition.label}`)
                        }
                        type="button"
                        onClick={() => {
                          if (isStudioCardContextObjectPreset(definition)) {
                            addCardContextObject(definition);
                            return;
                          }

                          if (isStudioCardStatusBackgroundPreset(definition)) {
                            addCardStatusBackgroundObject(definition);
                            return;
                          }

                          if (isStudioCardSelectInputBundlePreset(definition)) {
                            addCardSelectInputBundle(definition);
                          }
                        }}
                      >
                        <span className="truncate">{definition.label}</span>
                        {existingTargetId ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-300" />
                        ) : null}
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );

  const renderRuntimeInput = (
    input: StudioInputDefinition,
    context: StudioRuntimeContext = {},
  ) => {
    const value = getStudioRuntimeInputValue(input, runtimeValues, context);
    const runtimeInputKey = [
      input.id,
      context.dayId ?? "global",
      context.entryIndex ?? "none",
    ].join(":");

    if (input.type === "text") {
      if (input.multiline) {
        return (
          <StudioTextareaField
            key={runtimeInputKey}
            label={input.label}
            placeholder={input.placeholder}
            rows={input.minRows ?? 4}
            value={value}
            onChange={(nextValue) =>
              updateRuntimeInputValue(input, nextValue, context)
            }
          />
        );
      }

      return (
        <StudioTextField
          key={runtimeInputKey}
          label={input.label}
          placeholder={input.placeholder}
          value={value}
          onChange={(nextValue) =>
            updateRuntimeInputValue(input, nextValue, context)
          }
        />
      );
    }

    if (input.type === "image") {
      return (
        <div className="grid gap-2" key={runtimeInputKey}>
          <StudioTextField
            label={input.label}
            placeholder={input.placeholder}
            value={value}
            onChange={(nextValue) =>
              updateRuntimeInputValue(input, nextValue, context)
            }
          />
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded border border-[#303848] bg-[#111827] px-3 text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230]">
            <Upload size={14} />
            Upload
            <input
              accept="image/*"
              className="hidden"
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                const selectedGeometry =
                  activeWorkspaceMode === "timetable"
                    ? selectedTimetableLayerGeometry
                    : selectedNode
                      ? resolveStudioGraphNodeGeometry(
                          document,
                          selectedNode.id,
                        )
                      : null;
                requestStudioImageCrop(
                  file,
                  selectedGeometry ?? { width: 400, height: 400 },
                  (croppedImageSrc) =>
                    updateRuntimeInputValue(input, croppedImageSrc, context),
                );
              }}
            />
          </label>
        </div>
      );
    }

    return (
      <label
        className="grid gap-1 text-xs font-semibold text-[#8fa6cf]"
        key={runtimeInputKey}
      >
        <span>{input.label}</span>
        <select
          className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
          value={value}
          onChange={(event) =>
            updateRuntimeInputValue(input, event.currentTarget.value, context)
          }
        >
          {input.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const renderRuntimeInputGroup = (
    title: string,
    scopedInputs: StudioInputDefinition[],
    context: StudioRuntimeContext = {},
  ) => {
    if (scopedInputs.length === 0) return null;

    return (
      <div className="grid gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9fb5df]">
          {title}
        </h3>
        <div className="grid gap-3">
          {scopedInputs.map((input) => renderRuntimeInput(input, context))}
        </div>
      </div>
    );
  };

  const renderRuntimePreviewInputs = () => {
    const hasScopedInputs =
      runtimeInputsByScope.day.length > 0 ||
      runtimeInputsByScope.entry.length > 0;

    return (
      <div className="grid gap-4">
        <div className="flex justify-end">
          <button
            className="h-7 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-[11px] font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            type="button"
            onClick={resetRuntimeValues}
          >
            Reset
          </button>
        </div>

        {hasScopedInputs && timetableDays.length > 0 ? (
          <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2">
            <label className="grid gap-1 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Day Context</span>
              <select
                className="h-8 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                value={activeRuntimeDayId}
                onChange={(event) =>
                  setSelectedRuntimeDayId(event.currentTarget.value)
                }
              >
                {timetableDays.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.label}
                  </option>
                ))}
              </select>
            </label>

            {runtimeInputsByScope.entry.length > 0 ? (
              <label className="grid gap-1 text-[11px] font-semibold text-[var(--fg2)]">
                <span>Entry Context</span>
                <select
                  className="h-8 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  disabled={activeRuntimeEntries.length === 0}
                  value={activeRuntimeEntryIndex}
                  onChange={(event) =>
                    setSelectedRuntimeEntryIndex(
                      Number(event.currentTarget.value),
                    )
                  }
                >
                  {activeRuntimeEntries.length === 0 ? (
                    <option value={0}>No entries</option>
                  ) : null}
                  {activeRuntimeEntries.map((entry, entryIndex) => (
                    <option key={entryIndex} value={entryIndex}>
                      Entry {entryIndex + 1} · {entry.id.slice(-6)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {renderRuntimeInputGroup("Global", runtimeInputsByScope.global)}

        {activeRuntimeDayId
          ? renderRuntimeInputGroup("Day", runtimeInputsByScope.day, {
              dayId: activeRuntimeDayId,
            })
          : null}

        {activeRuntimeDayId && activeRuntimeEntry
          ? renderRuntimeInputGroup("Entry", runtimeInputsByScope.entry, {
              dayId: activeRuntimeDayId,
              entryIndex: activeRuntimeEntryIndex,
            })
          : null}
      </div>
    );
  };

  const renderTimetableObjectVariantControls = (
    object: StudioTimetableCompositionObject,
  ) => {
    const variantSet = object.variantSet;
    if (!variantSet) return null;

    const activeValue = variantSet.activeValue ?? variantSet.defaultValue;

    return (
      <div className="grid gap-2">
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-1">
          {variantSet.options.map((option) => {
            const selected = option.value === activeValue;

            return (
              <button
                className={cn(
                  "h-8 rounded-md text-xs font-bold transition",
                  selected
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                )}
                key={option.value}
                type="button"
                onClick={() =>
                  updateTimetableCompositionObject(object.id, (currentObject) =>
                    setStudioTimetableObjectActiveVariantValue(
                      currentObject,
                      option.value,
                    ),
                  )
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
          Editing state:{" "}
          <span className="text-[var(--fg)]">
            {variantSet.options.find((option) => option.value === activeValue)
              ?.label ?? activeValue}
          </span>
        </div>
      </div>
    );
  };

  const renderTimetablePanel = () => {
    const timetable = document.domains?.timetable;

    if (!timetable) {
      return (
        <div className="p-4 text-sm font-medium text-[var(--fg2)]">
          No timetable domain
        </div>
      );
    }

    const addEntryDisabledReason = activeRuntimeDayId
      ? getStudioTimetableAddEntryDisabledReason(
          document,
          runtimeValues,
          activeRuntimeDayId,
        )
      : "Select a day first";
    const canAddEntry = addEntryDisabledReason === null;

    return (
      <div className="template-studio-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 grid gap-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
            Day Cards
          </div>
          <div className="text-[12px] font-semibold text-[var(--fg)]">
            {timetableDays.length} days · {activeRuntimeEntries.length}/
            {maxRuntimeEntries} entries
          </div>
        </div>

        <div className="mb-4 grid grid-cols-7 gap-1">
          {timetableDays.map((day) => (
            <button
              className={cn(
                "h-9 rounded-lg border text-[11px] font-bold transition",
                activeRuntimeDayId === day.id
                  ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--fg)]"
                  : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
              )}
              key={day.id}
              type="button"
              onClick={() => {
                setSelectedRuntimeDayId(day.id);
                setSelectedRuntimeEntryIndex(0);
              }}
            >
              {day.shortLabel ?? day.label.slice(0, 3)}
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
              {activeRuntimeDay?.label ?? "Day"} Entries
            </div>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canAddEntry}
              title={addEntryDisabledReason ?? "Add entry"}
              type="button"
              onClick={addEntryToActiveDay}
            >
              <Plus size={14} />
            </button>
          </div>

          {activeRuntimeEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--field-border)] bg-[var(--field)] px-3 py-4 text-center text-xs font-semibold text-[var(--fg2)]">
              Empty day
            </div>
          ) : (
            <div className="grid gap-2">
              {activeRuntimeEntries.map((entry, entryIndex) => {
                const isActive = activeRuntimeEntryIndex === entryIndex;

                return (
                  <div
                    className={cn(
                      "grid gap-2 rounded-lg border p-2 transition",
                      isActive
                        ? "border-[var(--accent)] bg-[var(--sel)]"
                        : "border-[var(--field-border)] bg-[var(--field)]",
                    )}
                    key={entry.id}
                  >
                    <button
                      className="flex items-center gap-2 text-left"
                      type="button"
                      onClick={() => setSelectedRuntimeEntryIndex(entryIndex)}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--panel)] text-[10px] font-extrabold text-[var(--fg2)]">
                        {entryIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-[var(--fg)]">
                        {entry.id}
                      </span>
                    </button>

                    <div className="grid grid-cols-[1fr_auto] gap-1.5">
                      <select
                        className="h-8 min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--panel)] px-2 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                        value={entry.statusId}
                        disabled={activeRuntimeEntries.length > 1}
                        onChange={(event) =>
                          updateEntryStatus(
                            activeRuntimeDayId,
                            entryIndex,
                            event.currentTarget
                              .value as StudioTimetableStatusId,
                          )
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status.id} value={status.id}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--field-border)] bg-[var(--panel)] text-[var(--fg2)] transition hover:border-rose-400/60 hover:text-rose-300"
                        title="Remove entry"
                        type="button"
                        onClick={() =>
                          removeEntry(activeRuntimeDayId, entryIndex)
                        }
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 border-t border-[var(--border)] pt-4">
          {renderRuntimeInputGroup("Global", runtimeInputsByScope.global)}

          {activeRuntimeDayId
            ? renderRuntimeInputGroup("Day", runtimeInputsByScope.day, {
                dayId: activeRuntimeDayId,
              })
            : null}

          {activeRuntimeDayId && activeRuntimeEntry
            ? renderRuntimeInputGroup("Entry", runtimeInputsByScope.entry, {
                dayId: activeRuntimeDayId,
                entryIndex: activeRuntimeEntryIndex,
              })
            : null}
        </div>
      </div>
    );
  };

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

  const renderTimetableVisibilitySlot = (
    object: StudioTimetableCompositionObject,
  ) => (
    <StudioTimetableVisibilityField
      hidden={object.hidden}
      onChange={(visible) =>
        updateTimetableCompositionObject(object.id, (currentObject) => {
          setStudioTimetableObjectVisibilitySlot(currentObject, visible);
        })
      }
    />
  );

  const renderTimetableOpacityControl = (
    object: StudioTimetableCompositionObject,
  ) => (
    <StudioTimetableOpacityField
      opacity={object.style.opacity}
      onChange={(opacity) =>
        updateTimetableCompositionObject(object.id, (currentObject) => {
          currentObject.style = { ...currentObject.style, opacity };
        })
      }
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
      {renderRuntimeInput(input)}
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

      const currentDocument = studioStore.getState().document;
      const defaultUrl = assetId
        ? (currentDocument.assets[assetId]?.src ?? "")
        : "";

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const currentObject = composition.objects[object.id];
        if (!currentObject) return;

        const { inputId: nextInputId } = ensureStudioPresetImageInput(
          nextDocument,
          {
            label: inputLabel,
            placeholder: "Paste image URL",
            defaultUrl,
          },
        );
        onUpdateInput(currentObject, nextInputId, fit ?? defaultFit);
      });

      showShortcutStatus(`Linked ${label} to input`);
    };

    const uploadAsset = (file: File) => {
      const cropGeometry = resolveStudioTimetableObjectGeometry(
        timetableComposition,
        object.id,
        getStudioTimetablePreviewSize(document.domains?.timetable),
      );

      requestStudioImageCrop(file, cropGeometry, (croppedSrc) => {
        createTemplateAssetFromDataUrl(
          file,
          croppedSrc,
          inputLabel,
          (nextDocument, nextAssetId) => {
            const timetable = nextDocument.domains?.timetable;
            if (!timetable) return;

            const composition = ensureStudioTimetableComposition(timetable);
            const currentObject = composition.objects[object.id];
            if (!currentObject) return;

            onUpdateAsset(currentObject, nextAssetId, fit ?? defaultFit);
          },
        );
      });
    };

    return (
      <StudioTimetableAssetSlotFields
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
    kind: StudioTimetableAssetSlotKind,
  ) =>
    renderTimetableAssetSlot({
      object,
      ...resolveStudioTimetableAssetSlotSpec(object, kind),
    });

  const renderTimetableBackgroundAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "background");

  const renderTimetableProfileImageSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "profileImage");

  const renderTimetableProfileFrameSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "profileFrame");

  const renderTimetableProfileChildAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "profileChild");

  const renderTimetableStructuredBackgroundAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "structuredBackground");

  const renderTimetableTopObjectAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "topObject");

  const renderTimetableBoardAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "board");

  const renderTimetableArtistProfileTextAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => renderTimetableAssetSlotOfKind(object, "artistProfileText");

  const renderTimetableWeekDatesFormatControls = (
    object: StudioTimetableCompositionObject,
  ) => {
    const templateValue = getStudioWeekDateTemplateValue(object);
    const presetValue = getStudioWeekDatePresetValue(object);
    const updateTemplate = (dateRangeTemplate: string) => {
      updateTimetableCompositionObject(object.id, (currentObject) => {
        currentObject.style = {
          ...currentObject.style,
          dateRangeFormat: "custom",
          dateRangeTemplate,
        };
      });
    };

    return (
      <div className="grid gap-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Date Format</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={presetValue}
            onChange={(event) => {
              const dateRangeFormat = event.currentTarget.value;
              const preset = getStudioWeekDatePreset(dateRangeFormat);
              updateTimetableCompositionObject(object.id, (currentObject) => {
                currentObject.style = {
                  ...currentObject.style,
                  dateRangeFormat,
                  dateRangeTemplate:
                    preset?.template ??
                    getStudioWeekDateTemplateValue(currentObject),
                };
              });
            }}
          >
            {STUDIO_WEEK_DATE_FORMAT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom template</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Template</span>
          <textarea
            className="min-h-20 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 font-mono text-[11px] font-semibold leading-relaxed text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            spellCheck={false}
            value={templateValue}
            onChange={(event) => updateTemplate(event.currentTarget.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {STUDIO_WEEK_DATE_TEMPLATE_TOKENS.map((token) => (
            <button
              className="h-7 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-1.5 font-mono text-[10px] font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
              key={token}
              title={token}
              type="button"
              onClick={() => {
                const separator = templateValue.trim().length > 0 ? " " : "";
                updateTemplate(`${templateValue}${separator}${token}`);
              }}
            >
              {token}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderTimetableDayCardsLayoutControls = () => {
    const timetable = document.domains?.timetable;
    if (!timetable) return null;

    return (
      <StudioTimetableDayCardsLayoutControls
        days={timetableDays}
        layout={getStudioTimetableDayCardsLayout(timetable)}
        onUpdateLayout={updateTimetableDayCardsLayout}
      />
    );
  };

  const renderTimetableArtistProfileTextAssetLayoutControls = (
    object: StudioTimetableCompositionObject,
  ) => {
    const assetMode = getStudioStyleString(
      object.style,
      "assetMode",
      "visible",
    );
    const assetPosition = getStudioStyleString(
      object.style,
      "assetPosition",
      "left",
    );

    return (
      <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] p-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Asset Mode</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={assetMode}
            onChange={(event) => {
              const assetModeValue = event.currentTarget.value;
              updateTimetableCompositionObject(object.id, (currentObject) => {
                currentObject.style = {
                  ...currentObject.style,
                  assetMode: assetModeValue,
                };
              });
            }}
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Asset Position</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            disabled={assetMode === "hidden"}
            value={assetPosition}
            onChange={(event) => {
              const assetPositionValue = event.currentTarget.value;
              updateTimetableCompositionObject(object.id, (currentObject) => {
                currentObject.style = {
                  ...currentObject.style,
                  assetPosition: assetPositionValue,
                };
              });
            }}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <StudioNumberField
            label="Asset Size"
            value={Number(object.style.assetSize ?? 160)}
            onChange={(value) =>
              updateTimetableCompositionObject(object.id, (currentObject) => {
                currentObject.style = {
                  ...currentObject.style,
                  assetSize: Math.max(24, value),
                };
              })
            }
          />
          <StudioNumberField
            label="Asset Gap"
            value={Number(object.style.assetGap ?? 32)}
            onChange={(value) =>
              updateTimetableCompositionObject(object.id, (currentObject) => {
                currentObject.style = {
                  ...currentObject.style,
                  assetGap: Math.max(0, value),
                };
              })
            }
          />
        </div>
      </div>
    );
  };

  const renderTimetableProfileMaskControls = (
    object: StudioTimetableCompositionObject,
  ) => {
    const radius =
      typeof object.style.borderRadius === "number"
        ? object.style.borderRadius
        : 0;
    const shape = getStudioTimetableObjectMaskShape(object);

    const updateMask = (nextShape: StudioSemanticMaskShape) => {
      const nextRadius =
        nextShape === "circle" ? 9999 : nextShape === "rectangle" ? 0 : 56;

      updateTimetableCompositionObject(object.id, (currentObject) => {
        setStudioTimetableObjectMaskSlot(currentObject, nextShape, nextRadius);
      });
    };

    return (
      <div className="grid gap-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Mask</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={shape}
            onChange={(event) =>
              updateMask(event.currentTarget.value as StudioSemanticMaskShape)
            }
          >
            <option value="rectangle">Rectangle</option>
            <option value="rounded">Rounded</option>
            <option value="circle">Circle</option>
          </select>
        </label>
        <StudioNumberField
          label="Radius"
          value={radius}
          onChange={(value) =>
            updateTimetableCompositionObject(object.id, (currentObject) => {
              setStudioTimetableObjectMaskSlot(
                currentObject,
                value >= 9999 ? "circle" : value <= 0 ? "rectangle" : "rounded",
                value,
              );
            })
          }
        />
      </div>
    );
  };

  const renderTimetableTextTypographyControls = (
    object: StudioTimetableCompositionObject,
  ) => {
    const styleRecord = object.style;
    const fontFamily = String(styleRecord.fontFamily ?? "Inter");
    const textAlign = getStudioTextAlignment(styleRecord);
    const fontWeightOptions = getStudioFontWeightOptions(document, fontFamily);
    const updateTimetableTextStyle = (
      key: string,
      value: string | number | undefined,
    ) => {
      updateTimetableCompositionObject(object.id, (currentObject) => {
        if (
          currentObject.kind !== "text" &&
          currentObject.kind !== "flexibleText"
        ) {
          return;
        }
        currentObject.style = {
          ...currentObject.style,
          [key]: value,
        };
      });
    };

    return (
      <div className="grid gap-2">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Font</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={fontFamily}
            onChange={(event) =>
              updateTimetableTextStyle("fontFamily", event.currentTarget.value)
            }
          >
            {fontFamilies.map((fontFamily) => (
              <option key={fontFamily} value={fontFamily}>
                {fontFamily}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1.3fr_1fr] gap-2">
          <StudioNumberField
            label="Size"
            value={Number(styleRecord.fontSize ?? 16)}
            onChange={(value) => updateTimetableTextStyle("fontSize", value)}
          />
          <StudioFontWeightField
            options={fontWeightOptions}
            value={styleRecord.fontWeight ?? 700}
            onChange={(value) => updateTimetableTextStyle("fontWeight", value)}
          />
        </div>
        <StudioTextAlignmentField
          value={textAlign}
          onChange={(value) => {
            updateTimetableCompositionObject(object.id, (currentObject) => {
              if (
                currentObject.kind !== "text" &&
                currentObject.kind !== "flexibleText"
              ) {
                return;
              }
              currentObject.style = {
                ...currentObject.style,
                textAlign: value,
                justifyContent: getStudioTextJustifyContent(value),
              };
            });
          }}
        />
        {object.kind === "flexibleText" ? (
          <StudioLineBreakField
            value={getStudioTextWrapMode(styleRecord)}
            onChange={(mode) =>
              updateTimetableTextStyle(STUDIO_TEXT_WRAP_MODE_STYLE_KEY, mode)
            }
          />
        ) : null}
        <StudioNumberField
          label="Line Height"
          value={Number(styleRecord.lineHeight ?? 1.2)}
          onChange={(value) => updateTimetableTextStyle("lineHeight", value)}
        />
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Color</span>
          <StudioHexColorPicker
            ariaLabel="Timetable text color"
            value={String(styleRecord.color ?? "#111827")}
            onChange={(color) => updateTimetableTextStyle("color", color)}
          />
        </label>
      </div>
    );
  };

  const renderStatusCardBackgroundAssetSlot = (node: StudioGraphNode) => {
    const status = cardStatusOptions.find(
      (candidate) => candidate.id === selectedCardStatusId,
    );
    const slot = node.assetSlots?.asset;
    const assetId = slot?.assetId ?? "";
    const hasMissingAsset = Boolean(assetId && !document.assets[assetId]);
    const statusLabel = status?.label ?? selectedCardStatusId;

    return (
      <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] p-2">
        <div className="text-[11px] font-bold text-[var(--fg)]">
          {statusLabel} layout
        </div>
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Asset</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
            disabled={assets.length === 0 && !assetId}
            value={assetId}
            onChange={(event) => {
              const nextAssetId = event.currentTarget.value || null;
              updateNode(node.id, (currentNode) => {
                setStudioStatusCardBackgroundAssetSlot(
                  currentNode,
                  nextAssetId,
                  slot?.fit ?? "cover",
                );
              });
            }}
          >
            <option value="">None</option>
            {hasMissingAsset ? (
              <option value={assetId}>Missing asset</option>
            ) : null}
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]">
          <Upload size={13} />
          Upload Asset
          <input
            accept="image/*"
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;

              const cropGeometry = resolveStudioGraphNodeGeometry(
                document,
                node.id,
              );
              requestStudioImageCrop(file, cropGeometry, (croppedSrc) => {
                createTemplateAssetFromDataUrl(
                  file,
                  croppedSrc,
                  `${node.label} ${statusLabel}`,
                  (nextDocument, nextAssetId) => {
                    const currentNode = nextDocument.graph.nodes[node.id];
                    if (!currentNode) return;

                    setStudioStatusCardBackgroundAssetSlot(
                      currentNode,
                      nextAssetId,
                      slot?.fit ?? "cover",
                    );
                  },
                );
              });
            }}
          />
        </label>
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Fit</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
            disabled={!assetId}
            value={slot?.fit ?? "cover"}
            onChange={(event) => {
              const nextFit = event.currentTarget.value as StudioImageFit;
              updateNode(node.id, (currentNode) => {
                setStudioStatusCardBackgroundAssetSlot(
                  currentNode,
                  assetId || null,
                  nextFit,
                );
              });
            }}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
      </div>
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
        : [
            ...(selectedTimetableDay && selectedTimetableDayComponentResolution
              ? [
                  buildInspectorSection(
                    "componentSet",
                    "Component Set",
                    <div className="grid gap-2">
                      <label className="grid gap-1.5">
                        <span className="text-[10px] font-bold text-[var(--fg2)]">
                          {selectedTimetableDay.label} layout
                        </span>
                        <select
                          className="h-9 w-full rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs font-semibold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                          value={
                            selectedTimetableDayComponentResolution.componentId
                          }
                          onChange={(event) =>
                            assignComponentSetToSelectedDay(
                              event.currentTarget.value,
                            )
                          }
                        >
                          {cardComponentOptions.map((component) => (
                            <option key={component.id} value={component.id}>
                              {component.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-center justify-between rounded-md border border-[var(--field-border)] bg-[var(--field)] px-2.5 py-2 text-[10px] font-semibold text-[var(--fg3)]">
                        <span>
                          {selectedTimetableDayComponentResolution.source ===
                          "default"
                            ? "Default set"
                            : "Day override"}
                        </span>
                        <span>
                          {
                            getTimetableEntryCardSizeForDay(
                              selectedTimetableDay.id,
                            ).width
                          }{" "}
                          ×{" "}
                          {
                            getTimetableEntryCardSizeForDay(
                              selectedTimetableDay.id,
                            ).height
                          }
                        </span>
                      </div>
                      <p className="text-[10px] font-medium leading-relaxed text-[var(--fg3)]">
                        This set controls all status layouts for the selected
                        day.
                      </p>
                    </div>,
                  ),
                ]
              : []),

            ...(selectedTimetableCompositionObject &&
            selectedTimetableVariantSet
              ? [
                  buildInspectorSection(
                    "settings",
                    "Object State",
                    renderTimetableObjectVariantControls(
                      selectedTimetableCompositionObject,
                    ),
                  ),
                ]
              : []),

            ...(selectedTimetableTextObject
              ? [
                  buildInspectorSection(
                    "input",
                    "Text",
                    <div className="grid gap-2">
                      {selectedTimetableBuiltinField ? (
                        <>
                          <div className="grid gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                              Built-in Source
                            </span>
                            <span className="truncate text-xs font-semibold text-[var(--fg)]">
                              {selectedTimetableBuiltinField.label}
                            </span>
                            <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                              {getStudioInputScopeLabel(
                                selectedTimetableBuiltinField.scope,
                              )}{" "}
                              · {selectedTimetableBuiltinField.type} ·{" "}
                              {selectedTimetableBuiltinField.id}
                            </span>
                          </div>
                          {selectedTimetableTextObject.binding?.kind ===
                          "builtinField" ? (
                            <StudioDayLabelFormatField
                              fieldId={
                                selectedTimetableTextObject.binding.fieldId
                              }
                              value={
                                selectedTimetableTextObject.binding
                                  .dayLabelFormat
                              }
                              onChange={(dayLabelFormat) =>
                                updateTimetableCompositionObject(
                                  selectedTimetableTextObject.id,
                                  (object) => {
                                    if (object.binding?.kind !== "builtinField")
                                      return;

                                    const normalizedFormat =
                                      normalizeStudioDayLabelFormat(
                                        dayLabelFormat,
                                      );
                                    object.binding =
                                      normalizedFormat === "default"
                                        ? {
                                            kind: "builtinField",
                                            fieldId: object.binding.fieldId,
                                          }
                                        : {
                                            ...object.binding,
                                            dayLabelFormat: normalizedFormat,
                                          };
                                  },
                                )
                              }
                            />
                          ) : null}
                          {isSelectedWeekDatesObject
                            ? renderTimetableWeekDatesFormatControls(
                                selectedTimetableTextObject,
                              )
                            : null}
                        </>
                      ) : selectedTimetableBoundInput ? (
                        renderTimetableInputSourceSlot(
                          selectedTimetableBoundInput,
                        )
                      ) : (
                        <StudioTextField
                          label="Content"
                          value={selectedTimetableTextValue}
                          onChange={(value) =>
                            updateTimetableCompositionObject(
                              selectedTimetableTextObject.id,
                              (object) => {
                                object.binding = {
                                  kind: "staticText",
                                  value,
                                };
                              },
                            )
                          }
                        />
                      )}
                    </div>,
                  ),
                ]
              : []),

            ...(selectedTimetableBoundInput
              ? [
                  buildInspectorSection(
                    "runtime",
                    "Preview Inputs",
                    renderRuntimePreviewInputs(),
                  ),
                ]
              : []),

            ...(isSelectedDayCardsObject
              ? [
                  buildInspectorSection(
                    "layout",
                    "Layout",
                    renderTimetableDayCardsLayoutControls(),
                  ),
                ]
              : []),

            ...(selectedTimetableCompositionObject
              ? [
                  buildInspectorSection(
                    "appearance",
                    "Appearance",
                    <div className="grid gap-2">
                      {renderTimetableVisibilitySlot(
                        selectedTimetableCompositionObject,
                      )}
                      {renderTimetableOpacityControl(
                        selectedTimetableCompositionObject,
                      )}
                      {isSelectedWeeklyMemoObject &&
                      selectedTimetableCompositionObject.kind !== "group"
                        ? renderTimetableBackgroundAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedLegacyProfileBlockObject
                        ? renderTimetableProfileImageSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedLegacyProfileBlockObject
                        ? renderTimetableProfileFrameSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedLegacyProfileBlockObject
                        ? renderTimetableProfileMaskControls(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedProfileChildObject
                        ? renderTimetableProfileChildAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedStructuredBackgroundObject
                        ? renderTimetableStructuredBackgroundAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {selectedTimetableCompositionObject.profileRole ===
                      "userImage"
                        ? renderTimetableProfileMaskControls(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedArtistProfileTextObject &&
                      selectedTimetableCompositionObject.kind !== "group"
                        ? renderTimetableArtistProfileTextAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedArtistProfileTextObject &&
                      selectedTimetableCompositionObject.kind !== "group"
                        ? renderTimetableArtistProfileTextAssetLayoutControls(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedTopObject &&
                      selectedTimetableCompositionObject.kind !== "group"
                        ? renderTimetableTopObjectAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                      {isSelectedBoardObject
                        ? renderTimetableBoardAssetSlot(
                            selectedTimetableCompositionObject,
                          )
                        : null}
                    </div>,
                  ),
                ]
              : []),

            ...(selectedTimetableLayerGeometry && selectedTimetableLayerId
              ? [
                  buildInspectorSection(
                    "position",
                    "Position",
                    <div className="grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <StudioNumberField
                          disabled={isSelectedTimetableObjectFitParent}
                          label="X"
                          value={selectedTimetableLayerGeometry.left}
                          onChange={(value) =>
                            updateTimetableLayerPosition(
                              selectedTimetableLayerId,
                              { left: value },
                            )
                          }
                        />
                        <StudioNumberField
                          disabled={isSelectedTimetableObjectFitParent}
                          label="Y"
                          value={selectedTimetableLayerGeometry.top}
                          onChange={(value) =>
                            updateTimetableLayerPosition(
                              selectedTimetableLayerId,
                              { top: value },
                            )
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-[var(--fg2)]">
                        {isStudioPlacedTimetableCompositionObject(
                          selectedTimetableCompositionObject ?? undefined,
                        ) ? (
                          <>
                            <StudioNumberField
                              disabled={isSelectedTimetableObjectFitParent}
                              label="W"
                              value={selectedTimetableLayerGeometry.width}
                              onChange={(value) =>
                                updateTimetableLayerPosition(
                                  selectedTimetableLayerId,
                                  { width: value },
                                )
                              }
                            />
                            <StudioNumberField
                              disabled={isSelectedTimetableObjectFitParent}
                              label="H"
                              value={selectedTimetableLayerGeometry.height}
                              onChange={(value) =>
                                updateTimetableLayerPosition(
                                  selectedTimetableLayerId,
                                  { height: value },
                                )
                              }
                            />
                          </>
                        ) : (
                          <>
                            <div className="grid min-w-0 gap-1.5">
                              <span>W</span>
                              <div className="flex h-8 w-full min-w-0 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg3)]">
                                <span className="min-w-0 truncate">
                                  {Math.round(
                                    selectedTimetableLayerGeometry.width,
                                  )}
                                </span>
                              </div>
                            </div>
                            <div className="grid min-w-0 gap-1.5">
                              <span>H</span>
                              <div className="flex h-8 w-full min-w-0 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg3)]">
                                <span className="min-w-0 truncate">
                                  {Math.round(
                                    selectedTimetableLayerGeometry.height,
                                  )}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      {isStudioPlacedTimetableCompositionObject(
                        selectedTimetableCompositionObject ?? undefined,
                      ) || isSelectedDayCardsObject ? (
                        <StudioNumberField
                          label="Rotate"
                          value={Number(
                            selectedTimetableCompositionObject?.style
                              .rotateDeg ?? 0,
                          )}
                          onChange={(value) =>
                            updateTimetableLayerPosition(
                              selectedTimetableLayerId,
                              { rotateDeg: value },
                            )
                          }
                        />
                      ) : null}
                    </div>,
                    undefined,
                    selectedTimetableCompositionObject &&
                      isStudioPlacedTimetableCompositionObject(
                        selectedTimetableCompositionObject,
                      ) ? (
                      <StudioFitParentButton
                        active={isSelectedTimetableObjectFitParent}
                        onClick={() =>
                          toggleTimetableObjectFitParent(
                            selectedTimetableCompositionObject.id,
                          )
                        }
                      />
                    ) : undefined,
                  ),
                ]
              : []),

            ...(selectedTimetableTextObject
              ? [
                  buildInspectorSection(
                    "typography",
                    "Typography",
                    renderTimetableTextTypographyControls(
                      selectedTimetableTextObject,
                    ),
                  ),
                ]
              : []),

            buildInspectorSection(
              "runtime",
              "Timetable Context",
              <div className="grid gap-2 text-xs font-semibold text-[var(--fg2)]">
                <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2">
                  Layer:{" "}
                  <span className="text-[var(--fg)]">
                    {selectedTimetableLayerLabel}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2">
                  Day:{" "}
                  <span className="text-[var(--fg)]">
                    {activeRuntimeDay?.label ?? "None"}
                  </span>
                </div>
                <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2">
                  Entry:{" "}
                  <span className="text-[var(--fg)]">
                    {activeRuntimeEntry
                      ? `${activeRuntimeEntryIndex + 1} · ${activeRuntimeEntry.statusId}`
                      : "None"}
                  </span>
                </div>
              </div>,
            ),
          ]),

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
                  ? (nodeId) => {
                      const targetNodeIds = studioStore
                        .getState()
                        .selectedNodeIds.includes(nodeId)
                        ? getStudioTopLevelNodeIds(
                            studioStore.getState().document,
                            studioStore.getState().selectedNodeIds,
                          )
                        : [nodeId];
                      const hasLockedTarget = targetNodeIds.some(
                        (targetNodeId) =>
                          isStudioNodeLocked(
                            studioStore.getState().document.graph.nodes[
                              targetNodeId
                            ],
                          ),
                      );

                      if (hasLockedTarget) {
                        showShortcutStatus("Selection includes locked object");
                        return false;
                      }

                      const hasFitTarget = targetNodeIds.some((targetNodeId) =>
                        isStudioFillParentLayout(
                          studioStore.getState().document.graph.nodes[
                            targetNodeId
                          ]?.layoutMode,
                        ),
                      );
                      if (hasFitTarget) {
                        showShortcutStatus("Disable Fit to move this object");
                        return false;
                      }

                      captureHistory();
                      return true;
                    }
                  : (layerId) => {
                      const composition = getStudioTimetableComposition(
                        studioStore.getState().document.domains?.timetable,
                      );
                      const object = composition.objects[layerId];

                      if (!object && !layerId.startsWith("day-card:")) {
                        return false;
                      }

                      if (object?.locked) {
                        showShortcutStatus("Object is locked");
                        return false;
                      }

                      if (isStudioFillParentLayout(object?.layoutMode)) {
                        showShortcutStatus("Disable Fit to move this object");
                        return false;
                      }

                      selectTimetableCanvasLayer(layerId);
                      captureHistory();
                      return true;
                    }
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
                  renderTimetableLayersPanel()
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
