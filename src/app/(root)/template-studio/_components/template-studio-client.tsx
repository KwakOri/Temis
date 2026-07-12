"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowUpRight,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Cloud,
  EyeOff,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Lock,
  Minus,
  Plus,
  Save,
  Send,
  Settings,
  SlidersHorizontal,
  Type,
  Upload,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useCreateTemplateStudioTemplate,
  usePublishTemplateStudioDocument,
  useSaveTemplateStudioDraft,
  useSyncTemplateStudioAssets,
  useTemplateStudioTemplate,
  useTemplateStudioTemplates,
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
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableDomain,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  createStudioBindingForBuiltinField,
  createStudioBindingForInput,
  getStudioBindingInputId,
  isStudioBuiltinFieldCompatibleWithNode,
  isStudioImageNode,
  isStudioInputCompatibleWithNode,
  isStudioTextNode,
} from "@/utils/template-studio/binding-resolver";
import {
  getStudioAvailableBuiltinFields,
  getStudioBuiltinField,
} from "@/utils/template-studio/builtin-fields";
import { cloneStudioComponentVariant } from "@/utils/template-studio/component-variants";
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
import { createStudioId } from "@/utils/template-studio/id";
import {
  getStudioDataDropPosition,
  getStudioLayerPanelOrder,
} from "@/utils/template-studio/layer-order";
import {
  isStudioFillParentLayout,
  resolveStudioGraphNodeGeometry,
  resolveStudioTimetableObjectGeometry,
} from "@/utils/template-studio/object-layout";
import {
  getStudioInputDefaultValue,
  getStudioInputsForScope,
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import {
  ensureStudioArtistProfileTextInput,
  ensureStudioPresetImageInput,
  ensureStudioTimetableVariantInput,
  ensureStudioWeeklyMemoInput,
  isStudioTimetableVariantInputCompatible,
  STUDIO_ARTIST_PROFILE_TEXT_ASSET_INPUT_LABEL,
  STUDIO_PROFILE_BLOCK_FRAME_INPUT_LABEL,
  STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
  STUDIO_TOP_OBJECT_IMAGE_INPUT_LABEL,
  STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
} from "@/utils/template-studio/preset-inputs";
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
  bindStudioArtistProfileTextObjectToInput,
  bindStudioWeeklyMemoObjectToInput,
  createStudioProfileBlockPresetObjects,
  createStudioStructuredTextPresetObjects,
  createStudioTopObjectPresetObjects,
  createStudioTimetablePresetObject,
  ensureStudioTimetableComposition,
  getStudioTimetableComposition,
  getStudioTimetableCompositionObjectGeometry,
  getStudioTimetableObjectRenderableChildIds,
  setStudioTimetableObjectActiveVariantValue,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  setStudioTimetableObjectAssetInputSlot,
  setStudioTimetableObjectAssetSlot,
  setStudioTimetableObjectBackgroundAssetSlot,
  setStudioTimetableObjectBackgroundInputSlot,
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
import {
  createStudioStatusCardBackgroundExceptionMeta,
  getStudioStatusCardBackgroundStatuses,
  isStudioStatusCardBackgroundNode,
  setStudioStatusCardBackgroundAssetSlot,
} from "@/utils/template-studio/status-card-background";
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
import {
  applyStudioTimetableComponentFrames,
  getStudioTimetableComponentFrame,
} from "@/utils/template-studio/entry-groups";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioAvailableTimetableStatuses,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import { validateStudioDocument } from "@/utils/template-studio/validator";
import {
  getStudioCustomFontFamilies,
  getStudioFontWeightOptions,
  normalizeStudioFontWeight,
  type StudioFontWeightOption,
} from "@/utils/template-studio/web-fonts";

import {
  clampStudioPreviewScale,
  StudioCanvasViewport,
} from "./studio-canvas-viewport";
import {
  StudioNodePickerMenu,
  type StudioPickerNode,
} from "./studio-node-picker-menu";
import { StudioImageCropModal } from "./studio-image-crop-modal";
import { StudioRenderer } from "./studio-renderer";
import { StudioSettingsModal } from "./studio-settings-modal";
import {
  getStudioTimetableDayCardGeometry,
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardsBounds,
  getStudioTimetableDayCardsLayout,
  getStudioTimetableEntryCardSize,
  getStudioTimetablePreviewSize,
  StudioTimetablePreview,
  STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS,
  STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
} from "./studio-timetable-preview";

type PanelMode = "layers" | "inputs" | "presets" | "timetable";
type WorkspaceMode = "cards" | "timetable";
type StudioTheme = "dark" | "light";

interface StudioInputConsumerReference {
  id: string;
  workspaceMode: WorkspaceMode;
  targetId: string;
  label: string;
  detail: string;
}

type InspectorSectionKey =
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

interface StudioEditorHistorySnapshot {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedInputId: StudioInputId | null;
  selectedRuntimeDayId: string;
  selectedRuntimeEntryIndex: number;
}

interface UpdateOptions {
  history?: boolean;
}

interface StudioEditorCopyClipboardPayload {
  kind: "copy";
  rootNodeIds: string[];
  nodes: Record<string, StudioGraphNode>;
  styles: Record<string, StudioStyleRecord>;
}

interface StudioEditorCutClipboardPayload {
  kind: "cut";
  rootNodeIds: string[];
  primaryNodeId: string | null;
}

type StudioEditorClipboardPayload =
  StudioEditorCopyClipboardPayload | StudioEditorCutClipboardPayload;

type StudioLayerMoveCommand = "forward" | "backward" | "front" | "back";

const STUDIO_HISTORY_LIMIT = 80;
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
  },
} satisfies Record<StudioTheme, Record<string, string>>;

const DEFAULT_INSPECTOR_SECTIONS: Record<InspectorSectionKey, boolean> = {
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

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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

const isStudioNodeLocked = (node: StudioGraphNode | null | undefined) =>
  Boolean(node?.locked);

const getStudioCopiedNodeLabel = (label: string) =>
  label.endsWith(" Copy") ? label : `${label} Copy`;

const isStudioNodeDescendantOf = (
  document: StudioTemplateDocument,
  nodeId: string,
  maybeAncestorId: string,
): boolean => {
  let current = document.graph.nodes[nodeId];

  while (current?.parentId) {
    if (current.parentId === maybeAncestorId) return true;
    current = document.graph.nodes[current.parentId];
  }

  return false;
};

const getStudioTopLevelNodeIds = (
  document: StudioTemplateDocument,
  nodeIds: string[],
): string[] => {
  const selected = new Set(nodeIds);

  return nodeIds.filter(
    (nodeId) =>
      document.graph.nodes[nodeId] &&
      !Array.from(selected).some(
        (otherNodeId) =>
          otherNodeId !== nodeId &&
          isStudioNodeDescendantOf(document, nodeId, otherNodeId),
      ),
  );
};

const getStudioEditableNodeIds = (document: StudioTemplateDocument): string[] =>
  Object.keys(document.graph.nodes).filter(
    (nodeId) =>
      !document.graph.rootNodeIds.includes(nodeId) &&
      document.domains?.timetable?.mountNodeId !== nodeId,
  );

const getStudioSelectionLabel = (count: number) =>
  count === 1 ? "object" : "objects";

const STUDIO_INPUT_SCOPE_OPTIONS: StudioInputScope[] = [
  "global",
  "day",
  "entry",
];

const getInputScopeLabel = (scope: StudioInputScope): string => {
  if (scope === "global") return "Global";
  if (scope === "day") return "Day";
  return "Entry";
};

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

const STUDIO_DAY_CARD_FILL_ORDER_OPTIONS = [
  { value: "row", label: "Row" },
  { value: "column", label: "Column" },
] as const;

const STUDIO_DAY_CARD_ALIGN_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
] as const;

const createStudioDayCardSlots = (
  dayIds: StudioTimetableDayId[],
  slotCount: number,
): Array<StudioTimetableDayId | null> =>
  Array.from({ length: slotCount }, (_, index) => dayIds[index] ?? null);

const formatStudioSlotName = (slotName: string): string =>
  slotName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStudioOpacityPercent = (value: unknown): number => {
  const parsedValue = Number(value ?? 1);
  if (!Number.isFinite(parsedValue)) return 100;
  const percent = parsedValue <= 1 ? parsedValue * 100 : parsedValue;
  return Math.min(Math.max(Math.round(percent), 0), 100);
};

const getStudioLayerDropPositionLabel = (
  position: StudioGraphDropPosition,
): string => {
  if (position === "before") return "Above";
  if (position === "after") return "Below";
  return "Inside";
};

const getStudioNodeBounds = (
  document: StudioTemplateDocument,
  nodeId: string,
) => {
  const { left, top, width, height } = resolveStudioGraphNodeGeometry(
    document,
    nodeId,
  );

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
};

const isPlacedTimetableCompositionObject = (
  object: StudioTimetableCompositionObject | undefined,
) =>
  object?.kind === "group" ||
  object?.kind === "image" ||
  object?.kind === "text" ||
  object?.kind === "profileBlock" ||
  object?.kind === "topObject";

const findTimetableStructuredTextObject = (
  composition: StudioTimetableComposition,
  rootObject: StudioTimetableCompositionObject | undefined,
) => {
  if (!rootObject) return null;

  const visitedObjectIds = new Set<string>();
  const queue = [...(rootObject.childIds ?? [])];

  while (queue.length > 0) {
    const objectId = queue.shift();
    if (!objectId || visitedObjectIds.has(objectId)) continue;
    visitedObjectIds.add(objectId);

    const object = composition.objects[objectId];
    if (!object) continue;

    if (
      object.structuredRole === "text" &&
      (object.kind === "text" || object.kind === "flexibleText")
    ) {
      return object;
    }

    queue.push(...(object.childIds ?? []));
  }

  return null;
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

const getStudioCombinedBounds = (
  document: StudioTemplateDocument,
  nodeIds: string[],
) => {
  const bounds = nodeIds.map((nodeId) => getStudioNodeBounds(document, nodeId));
  const left = Math.min(...bounds.map((bound) => bound.left));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

const createStudioNodeClipboardPayload = (
  document: StudioTemplateDocument,
  rootNodeIds: string | string[],
): StudioEditorCopyClipboardPayload | null => {
  const requestedRootNodeIds = Array.isArray(rootNodeIds)
    ? rootNodeIds
    : [rootNodeIds];
  const topLevelRootNodeIds = getStudioTopLevelNodeIds(
    document,
    requestedRootNodeIds,
  );

  if (topLevelRootNodeIds.length === 0) return null;

  const payload: StudioEditorCopyClipboardPayload = {
    kind: "copy",
    rootNodeIds: topLevelRootNodeIds,
    nodes: {},
    styles: {},
  };

  const collectNode = (nodeId: string) => {
    const node = document.graph.nodes[nodeId];
    if (!node || payload.nodes[nodeId]) return;

    payload.nodes[nodeId] = cloneJson(node);
    if (node.styleId && document.styles[node.styleId]) {
      payload.styles[node.styleId] = cloneJson(document.styles[node.styleId]);
    }

    node.childIds.forEach(collectNode);
  };

  topLevelRootNodeIds.forEach(collectNode);
  return payload;
};

const insertStudioClipboardSubtree = (
  nextDocument: StudioTemplateDocument,
  payload: StudioEditorCopyClipboardPayload,
  sourceNodeId: string,
  parentId: string | null,
  offsetRoot: boolean,
): string | null => {
  const sourceNode = payload.nodes[sourceNodeId];
  if (!sourceNode) return null;

  const nextNodeId = createStudioId("node");
  let nextStyleId: string | undefined;

  if (sourceNode.styleId) {
    nextStyleId = createStudioId("style");
    const sourceStyle = payload.styles[sourceNode.styleId] ?? {};
    nextDocument.styles[nextStyleId] = cloneJson(sourceStyle);

    if (offsetRoot) {
      const nextStyle = nextDocument.styles[nextStyleId];
      const left = typeof nextStyle.left === "number" ? nextStyle.left : 0;
      const top = typeof nextStyle.top === "number" ? nextStyle.top : 0;

      nextDocument.styles[nextStyleId] = {
        ...nextStyle,
        left: left + 24,
        top: top + 24,
      };
    }
  }

  const nextNode: StudioGraphNode = {
    ...cloneJson(sourceNode),
    id: nextNodeId,
    label: offsetRoot
      ? getStudioCopiedNodeLabel(sourceNode.label)
      : sourceNode.label,
    parentId,
    childIds: [],
    styleId: nextStyleId,
    meta: sourceNode.meta?.entrySlot
      ? { ...cloneJson(sourceNode.meta), entrySlot: undefined }
      : cloneJson(sourceNode.meta),
  };

  nextDocument.graph.nodes[nextNodeId] = nextNode;
  nextNode.childIds = sourceNode.childIds
    .map((childId) =>
      insertStudioClipboardSubtree(
        nextDocument,
        payload,
        childId,
        nextNodeId,
        false,
      ),
    )
    .filter(Boolean) as string[];

  return nextNodeId;
};

const getDefaultStyleForNode = (
  type: StudioGraphNodeType,
): StudioStyleRecord => {
  if (type === "group") {
    return {
      position: "absolute",
      left: 80,
      top: 80,
      width: 320,
      height: 220,
      backgroundColor: "#ffffff",
      border: "1px solid rgba(148, 163, 184, 0.45)",
      borderRadius: 8,
    };
  }

  if (type === "image") {
    return {
      position: "absolute",
      left: 100,
      top: 100,
      width: 180,
      height: 140,
      backgroundColor: "#e2e8f0",
      borderRadius: 8,
      overflow: "hidden",
    };
  }

  return {
    position: "absolute",
    left: 120,
    top: 120,
    width: 240,
    height: 56,
    color: "#111827",
    fontSize: type === "flexibleText" ? 32 : 20,
    fontWeight: type === "flexibleText" ? 800 : 700,
    display: "flex",
    alignItems: "center",
  };
};

const getNodeTypeLabel = (type: StudioGraphNodeType) => {
  if (type === "flexibleText") return "Auto Text";
  return type[0].toUpperCase() + type.slice(1);
};

const getInputTypeLabel = (type: StudioInputType) => {
  if (type === "text") return "Text";
  if (type === "image") return "Image";
  return "Select";
};

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function NumberField({ label, value, onChange, disabled }: NumberFieldProps) {
  const [draftValue, setDraftValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = isEditing
    ? draftValue
    : String(Number.isFinite(value) ? value : 0);
  const commitValue = useCallback(
    (nextDraftValue: string) => {
      const trimmedValue = nextDraftValue.trim();
      const parsedValue =
        trimmedValue === "" ? 0 : Number(trimmedValue.replace(/,/g, ""));

      if (!Number.isFinite(parsedValue)) {
        setDraftValue(String(Number.isFinite(value) ? value : 0));
        setIsEditing(false);
        return;
      }

      onChange(parsedValue);
      setDraftValue(String(parsedValue));
      setIsEditing(false);
    },
    [onChange, value],
  );
  const nudgeValue = useCallback(
    (delta: number) => {
      const parsedDraft = Number(draftValue.trim().replace(/,/g, ""));
      const baseValue =
        isEditing && Number.isFinite(parsedDraft)
          ? parsedDraft
          : Number.isFinite(value)
            ? value
            : 0;
      const nextValue = Number((baseValue + delta).toFixed(2));

      onChange(nextValue);
      setDraftValue(String(nextValue));
      setIsEditing(false);
    },
    [draftValue, isEditing, onChange, value],
  );

  useEffect(() => {
    if (isEditing) return;
    setDraftValue(String(Number.isFinite(value) ? value : 0));
  }, [isEditing, value]);

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--fg3)] disabled:opacity-70"
        disabled={disabled}
        inputMode="decimal"
        type="text"
        value={displayValue}
        onBlur={(event) => commitValue(event.currentTarget.value)}
        onChange={(event) => {
          setIsEditing(true);
          setDraftValue(event.currentTarget.value);
        }}
        onFocus={(event) => {
          setIsEditing(true);
          setDraftValue(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
            return;
          }

          if (event.key === "Escape") {
            setDraftValue(String(Number.isFinite(value) ? value : 0));
            setIsEditing(false);
            event.currentTarget.blur();
            return;
          }

          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            nudgeValue(
              (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1),
            );
          }
        }}
      />
    </label>
  );
}

function FitParentButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-7 rounded-md border px-2.5 text-[10px] font-bold uppercase tracking-[0.05em] transition",
        active
          ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--accent)]"
          : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
      )}
      title={active ? "Use fixed size" : "Fill parent"}
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      Fit
    </button>
  );
}

interface FontWeightFieldProps {
  options: StudioFontWeightOption[];
  value: string | number | null | undefined;
  onChange: (value: number) => void;
}

function FontWeightField({ options, value, onChange }: FontWeightFieldProps) {
  const normalizedValue = normalizeStudioFontWeight(value);
  const selectedWeight = options.reduce(
    (closest, option) =>
      Math.abs(option.value - normalizedValue) <
      Math.abs(closest.value - normalizedValue)
        ? option
        : closest,
    options[0],
  ).value;

  return (
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Weight</span>
      <select
        className="h-8 w-full min-w-0 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        value={selectedWeight}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        onFocus={() => {
          if (selectedWeight !== normalizedValue) onChange(selectedWeight);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)]"
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

interface TextareaFieldProps extends TextFieldProps {
  rows?: number;
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: TextareaFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <textarea
        className="min-h-20 resize-y rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2 text-xs font-medium text-[var(--fg)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--accent)]"
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function Section({
  title,
  open,
  onToggle,
  badge,
  action,
  children,
}: SectionProps) {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="flex items-center transition hover:bg-[var(--hover)]">
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 px-4 py-3 text-left"
          type="button"
          onClick={onToggle}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 text-[var(--fg2)] transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
            {title}
          </span>
          {badge ? (
            <span className="ml-auto rounded bg-[var(--sel)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-[var(--accent)]">
              {badge}
            </span>
          ) : null}
        </button>
        {action ? <div className="pr-4">{action}</div> : null}
      </div>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  );
}

interface TemplateStudioClientProps {
  initialRemoteTemplateId?: string | null;
}

export function TemplateStudioClient({
  initialRemoteTemplateId = null,
}: TemplateStudioClientProps) {
  const [document, setDocument] = useState<StudioTemplateDocument>(() =>
    createSampleStudioDocument(),
  );
  const [runtimeValues, setRuntimeValues] = useState<StudioRuntimeValues>(() =>
    createInitialStudioRuntimeValues(createSampleStudioDocument()),
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    "node_c3",
  );
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>(["node_c3"]);
  const [selectedInputId, setSelectedInputId] = useState<StudioInputId | null>(
    null,
  );
  const [panelMode, setPanelMode] = useState<PanelMode>("layers");
  const [theme, setTheme] = useState<StudioTheme>("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inspectorSections, setInspectorSections] = useState<
    Record<InspectorSectionKey, boolean>
  >(DEFAULT_INSPECTOR_SECTIONS);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("cards");
  const [inputScopeFilter, setInputScopeFilter] =
    useState<StudioInputScope>("global");
  const [scale, setScale] = useState(0.8);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
  const [pendingImageCrop, setPendingImageCrop] =
    useState<PendingStudioImageCrop | null>(null);
  const [layerDropState, setLayerDropState] =
    useState<StudioLayerDropState | null>(null);
  const [cutNodeIds, setCutNodeIds] = useState<string[]>([]);
  const [collapsedLayerGroupIds, setCollapsedLayerGroupIds] = useState<
    string[]
  >([]);
  const [collapsedTimetableLayerIds, setCollapsedTimetableLayerIds] = useState<
    string[]
  >([]);
  const [timetableLayerDragState, setTimetableLayerDragState] =
    useState<StudioTimetableLayerDragState | null>(null);
  const [timetableLayerDropState, setTimetableLayerDropState] =
    useState<StudioTimetableLayerDropState | null>(null);
  const [selectedTimetableLayerId, setSelectedTimetableLayerId] = useState<
    string | null
  >(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
  const [shortcutMessage, setShortcutMessage] = useState<string | null>(null);
  const [remoteTemplateId, setRemoteTemplateId] = useState<string | null>(
    initialRemoteTemplateId,
  );
  const [selectedRuntimeDayId, setSelectedRuntimeDayId] = useState("mon");
  const [selectedRuntimeEntryIndex, setSelectedRuntimeEntryIndex] = useState(0);
  const [selectedCardStatusId, setSelectedCardStatusId] =
    useState<StudioTimetableStatusId>("online");
  const pastSnapshotsRef = useRef<StudioEditorHistorySnapshot[]>([]);
  const futureSnapshotsRef = useRef<StudioEditorHistorySnapshot[]>([]);
  const isRestoringHistoryRef = useRef(false);
  const clipboardPayloadRef = useRef<StudioEditorClipboardPayload | null>(null);
  const layerDragStateRef = useRef<StudioLayerDragState | null>(null);
  const layerSelectionAnchorNodeIdRef = useRef<string | null>(selectedNodeId);
  const timetableLayerDragStateRef =
    useRef<StudioTimetableLayerDragState | null>(null);
  const layerAutoExpandTimerRef = useRef<number | null>(null);
  const layerAutoExpandTargetRef = useRef<string | null>(null);
  const timetableLayerAutoExpandTimerRef = useRef<number | null>(null);
  const timetableLayerAutoExpandTargetRef = useRef<string | null>(null);
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null);
  const autoLoadedRemoteTemplateIdRef = useRef<string | null>(null);
  const documentRef = useRef(document);
  const runtimeValuesRef = useRef(runtimeValues);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const selectedNodeIdsRef = useRef<string[]>(selectedNodeIds);
  const selectedInputIdRef = useRef<StudioInputId | null>(selectedInputId);
  const selectedRuntimeDayIdRef = useRef(selectedRuntimeDayId);
  const selectedRuntimeEntryIndexRef = useRef(selectedRuntimeEntryIndex);
  const templateStudioTemplatesQuery = useTemplateStudioTemplates();
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

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    runtimeValuesRef.current = runtimeValues;
  }, [runtimeValues]);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  useEffect(() => {
    selectedInputIdRef.current = selectedInputId;
  }, [selectedInputId]);

  useEffect(() => {
    selectedRuntimeDayIdRef.current = selectedRuntimeDayId;
  }, [selectedRuntimeDayId]);

  useEffect(() => {
    selectedRuntimeEntryIndexRef.current = selectedRuntimeEntryIndex;
  }, [selectedRuntimeEntryIndex]);

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
  const remoteTemplates = templateStudioTemplatesQuery.data?.templates ?? [];
  const activeRemoteTemplate = remoteTemplateId
    ? (remoteTemplates.find((template) => template.id === remoteTemplateId) ??
      templateStudioTemplateQuery.data?.template ??
      null)
    : null;
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
  const timetableCapabilities = useMemo(
    () => getStudioTimetableCapabilities(document.domains?.timetable),
    [document.domains?.timetable],
  );
  const cardStatusOptions = useMemo(
    () => getStudioAvailableTimetableStatuses(document),
    [document],
  );
  const cardEntryComponent = document.domains?.timetable
    ? document.domains.timetable.components[
        document.domains.timetable.entryComponentId
      ]
    : undefined;
  const selectedCardVariantResolution = useMemo(
    () =>
      resolveStudioTimetableComponentVariant(
        document,
        cardEntryComponent,
        selectedCardStatusId,
      ),
    [cardEntryComponent, document, selectedCardStatusId],
  );
  const selectedCardDirectVariant =
    cardEntryComponent?.variants[selectedCardStatusId];
  const selectedCardVariantRootId =
    selectedCardVariantResolution?.variant.rootNodeId ?? null;
  const selectedCardVariantIsShared = Boolean(
    selectedCardDirectVariant &&
    cardEntryComponent &&
    Object.entries(cardEntryComponent.variants).some(
      ([statusId, variant]) =>
        statusId !== selectedCardStatusId &&
        variant.rootNodeId === selectedCardDirectVariant.rootNodeId,
    ),
  );
  const cardAuthoringRootNodeIds = selectedCardVariantRootId
    ? [selectedCardVariantRootId]
    : document.graph.rootNodeIds;
  useEffect(() => {
    if (
      cardStatusOptions.some((status) => status.id === selectedCardStatusId)
    ) {
      return;
    }

    setSelectedCardStatusId(cardStatusOptions[0]?.id ?? "online");
  }, [cardStatusOptions, selectedCardStatusId]);
  const cardPresetGroups = useMemo(
    () => getStudioPresetGroups(document, "cards"),
    [document],
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
  const isSelectedDayCardsObject =
    selectedTimetableLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
  const timetableEntryCardSize = useMemo(() => {
    const timetable = document.domains?.timetable;
    return getStudioTimetableEntryCardSize(
      document,
      timetable?.components[timetable.entryComponentId],
    );
  }, [document]);
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

    if (isPlacedTimetableCompositionObject(compositionObject)) {
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
        timetableEntryCardSize,
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
        timetableEntryCardSize,
      )[dayId] ??
      getStudioTimetableDayCardGeometry(
        layout,
        dayId,
        dayIndex,
        getStudioTimetableEntriesForDay(document, runtimeValues, dayId).length,
        timetableEntryCardSize,
      )
    );
  }, [
    document,
    runtimeValues,
    selectedTimetableLayerId,
    timetableComposition,
    timetableEntryCardSize,
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
  const activePanelMode: PanelMode =
    activeWorkspaceMode === "timetable" && panelMode === "timetable"
      ? "layers"
      : activeWorkspaceMode === "cards" && panelMode === "presets"
        ? "layers"
        : panelMode;
  const isInputPanelActive = activePanelMode === "inputs";
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
  const inputConsumers = useMemo(() => {
    const consumers = Object.values(document.graph.nodes).reduce<
      Record<string, StudioInputConsumerReference[]>
    >((acc, node) => {
      const inputId = getStudioBindingInputId(node.binding);
      if (inputId) {
        acc[inputId] = [
          ...(acc[inputId] ?? []),
          {
            id: `cards:${node.id}:binding`,
            workspaceMode: "cards",
            targetId: node.id,
            label: node.label,
            detail: "Cards · Binding",
          },
        ];
      }

      Object.entries(node.assetSlots ?? {}).forEach(([slotName, slot]) => {
        if (!slot.inputId) return;
        acc[slot.inputId] = [
          ...(acc[slot.inputId] ?? []),
          {
            id: `cards:${node.id}:slot:${slotName}`,
            workspaceMode: "cards",
            targetId: node.id,
            label: node.label,
            detail: `Cards · ${formatStudioSlotName(slotName)}`,
          },
        ];
      });

      return acc;
    }, {});

    Object.values(timetableComposition.objects).forEach((object) => {
      if (object.variantSet?.inputId) {
        consumers[object.variantSet.inputId] = [
          ...(consumers[object.variantSet.inputId] ?? []),
          {
            id: `timetable:${object.id}:variant`,
            workspaceMode: "timetable",
            targetId: object.id,
            label: object.label,
            detail: "Timetable · Object State",
          },
        ];
      }

      const inputId = getStudioBindingInputId(object.binding);
      if (inputId) {
        consumers[inputId] = [
          ...(consumers[inputId] ?? []),
          {
            id: `timetable:${object.id}:binding`,
            workspaceMode: "timetable",
            targetId: object.id,
            label: object.label,
            detail: "Timetable · Binding",
          },
        ];
      }

      Object.entries(object.assetSlots ?? {}).forEach(([slotName, slot]) => {
        if (!slot.inputId) return;
        consumers[slot.inputId] = [
          ...(consumers[slot.inputId] ?? []),
          {
            id: `timetable:${object.id}:slot:${slotName}`,
            workspaceMode: "timetable",
            targetId: object.id,
            label: object.label,
            detail: `Timetable · ${formatStudioSlotName(slotName)}`,
          },
        ];
      });
    });

    return consumers;
  }, [document.graph.nodes, timetableComposition.objects]);
  const diagnostics = useMemo(
    () => [
      ...validateStudioDocument(document),
      ...validateStudioRuntimeValuesForDocument(document, runtimeValues),
    ],
    [document, runtimeValues],
  );
  const compatibleInputs = useMemo(() => {
    if (!selectedNode) return [];
    return inputs.filter((input) =>
      isStudioInputCompatibleWithNode(input, selectedNode),
    );
  }, [inputs, selectedNode]);
  const compatibleBuiltinFields = useMemo(() => {
    if (!selectedNode) return [];
    return getStudioAvailableBuiltinFields(document).filter((field) =>
      isStudioBuiltinFieldCompatibleWithNode(field, selectedNode),
    );
  }, [document, selectedNode]);
  const compatibleBuiltinFieldGroups = useMemo(
    () =>
      STUDIO_INPUT_SCOPE_OPTIONS.map((scope) => ({
        scope,
        fields: compatibleBuiltinFields.filter(
          (field) => field.scope === scope,
        ),
      })).filter((group) => group.fields.length > 0),
    [compatibleBuiltinFields],
  );
  const compatibleInputGroups = useMemo(
    () =>
      STUDIO_INPUT_SCOPE_OPTIONS.map((scope) => ({
        scope,
        inputs: compatibleInputs.filter((input) => input.scope === scope),
      })).filter((group) => group.inputs.length > 0),
    [compatibleInputs],
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

  const showShortcutStatus = useCallback((message: string) => {
    setShortcutMessage(message);
  }, []);

  const applyNodeSelection = useCallback(
    (nodeIds: string[], primaryNodeId?: string | null) => {
      const nextNodeIds = Array.from(
        new Set(
          nodeIds.filter((nodeId) => documentRef.current.graph.nodes[nodeId]),
        ),
      );
      const nextPrimaryNodeId =
        primaryNodeId && nextNodeIds.includes(primaryNodeId)
          ? primaryNodeId
          : (nextNodeIds.at(-1) ?? null);

      selectedNodeIdRef.current = nextPrimaryNodeId;
      selectedNodeIdsRef.current = nextNodeIds;
      setSelectedNodeId(nextPrimaryNodeId);
      setSelectedNodeIds(nextNodeIds);
    },
    [],
  );

  const selectSingleNode = useCallback(
    (nodeId: string | null) => {
      layerSelectionAnchorNodeIdRef.current = nodeId;
      applyNodeSelection(nodeId ? [nodeId] : [], nodeId);
    },
    [applyNodeSelection],
  );

  const jumpToInput = useCallback(
    (inputId: StudioInputId) => {
      const input = documentRef.current.inputs[inputId];

      if (!input) {
        showShortcutStatus("Input no longer exists");
        return;
      }

      setSelectedInputId(inputId);
      setInputScopeFilter(input.scope);
      setPanelMode("inputs");
      showShortcutStatus(`Selected input: ${input.label}`);
    },
    [showShortcutStatus],
  );

  const jumpToInputConsumer = useCallback(
    (consumer: StudioInputConsumerReference) => {
      setNodePicker(null);

      if (consumer.workspaceMode === "cards") {
        const node = documentRef.current.graph.nodes[consumer.targetId];

        if (!node) {
          showShortcutStatus("Consumer object no longer exists");
          return;
        }

        const ancestorIds: string[] = [];
        let parentId = node.parentId;
        while (parentId) {
          ancestorIds.push(parentId);
          parentId =
            documentRef.current.graph.nodes[parentId]?.parentId ?? null;
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
        documentRef.current.domains?.timetable,
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
    [selectSingleNode, showShortcutStatus],
  );

  const toggleNodeSelection = useCallback(
    (nodeId: string) => {
      const currentNodeIds = selectedNodeIdsRef.current;
      const nextNodeIds = currentNodeIds.includes(nodeId)
        ? currentNodeIds.filter((selectedId) => selectedId !== nodeId)
        : [...currentNodeIds, nodeId];

      layerSelectionAnchorNodeIdRef.current = nodeId;
      applyNodeSelection(nextNodeIds, nodeId);
    },
    [applyNodeSelection],
  );

  const selectLayerNodeRange = useCallback(
    (nodeId: string, appendToCurrentSelection: boolean) => {
      const anchorNodeId =
        layerSelectionAnchorNodeIdRef.current &&
        visibleLayerNodeIds.includes(layerSelectionAnchorNodeIdRef.current)
          ? layerSelectionAnchorNodeIdRef.current
          : selectedNodeIdRef.current &&
              visibleLayerNodeIds.includes(selectedNodeIdRef.current)
            ? selectedNodeIdRef.current
            : nodeId;
      const anchorIndex = visibleLayerNodeIds.indexOf(anchorNodeId);
      const targetIndex = visibleLayerNodeIds.indexOf(nodeId);

      if (anchorIndex < 0 || targetIndex < 0) {
        layerSelectionAnchorNodeIdRef.current = nodeId;
        applyNodeSelection([nodeId], nodeId);
        return;
      }

      const startIndex = Math.min(anchorIndex, targetIndex);
      const endIndex = Math.max(anchorIndex, targetIndex);
      const rangeNodeIds = visibleLayerNodeIds.slice(startIndex, endIndex + 1);
      const nextNodeIds = appendToCurrentSelection
        ? [...selectedNodeIdsRef.current, ...rangeNodeIds]
        : rangeNodeIds;

      layerSelectionAnchorNodeIdRef.current = anchorNodeId;
      applyNodeSelection(nextNodeIds, nodeId);
      showShortcutStatus(
        `Selected ${rangeNodeIds.length} ${getStudioSelectionLabel(
          rangeNodeIds.length,
        )}`,
      );
    },
    [applyNodeSelection, showShortcutStatus, visibleLayerNodeIds],
  );

  const toggleLayerGroupCollapsed = useCallback((nodeId: string) => {
    setCollapsedLayerGroupIds((currentNodeIds) =>
      currentNodeIds.includes(nodeId)
        ? currentNodeIds.filter((currentNodeId) => currentNodeId !== nodeId)
        : [...currentNodeIds, nodeId],
    );
  }, []);

  const toggleTimetableLayerCollapsed = useCallback((layerId: string) => {
    setCollapsedTimetableLayerIds((currentLayerIds) =>
      currentLayerIds.includes(layerId)
        ? currentLayerIds.filter((currentLayerId) => currentLayerId !== layerId)
        : [...currentLayerIds, layerId],
    );
  }, []);

  const selectAllEditableNodes = useCallback(() => {
    const nodeIds = getStudioEditableNodeIds(documentRef.current);
    if (nodeIds.length === 0) {
      showShortcutStatus("No editable objects");
      return;
    }

    applyNodeSelection(nodeIds, selectedNodeIdRef.current);
    setPanelMode("layers");
    showShortcutStatus(`Selected ${nodeIds.length} objects`);
  }, [applyNodeSelection, showShortcutStatus]);

  const createHistorySnapshot = useCallback((): StudioEditorHistorySnapshot => {
    return {
      document: cloneDocument(documentRef.current),
      runtimeValues: cloneRuntimeValues(runtimeValuesRef.current),
      selectedNodeId: selectedNodeIdRef.current,
      selectedNodeIds: [...selectedNodeIdsRef.current],
      selectedInputId: selectedInputIdRef.current,
      selectedRuntimeDayId: selectedRuntimeDayIdRef.current,
      selectedRuntimeEntryIndex: selectedRuntimeEntryIndexRef.current,
    };
  }, []);

  const restoreHistorySnapshot = useCallback(
    (snapshot: StudioEditorHistorySnapshot) => {
      isRestoringHistoryRef.current = true;
      const nextDocument = cloneDocument(snapshot.document);
      const nextRuntimeValues = cloneRuntimeValues(snapshot.runtimeValues);

      documentRef.current = nextDocument;
      runtimeValuesRef.current = nextRuntimeValues;
      selectedNodeIdRef.current = snapshot.selectedNodeId;
      selectedNodeIdsRef.current = [...snapshot.selectedNodeIds];
      selectedInputIdRef.current = snapshot.selectedInputId;
      selectedRuntimeDayIdRef.current = snapshot.selectedRuntimeDayId;
      selectedRuntimeEntryIndexRef.current = snapshot.selectedRuntimeEntryIndex;

      setDocument(nextDocument);
      setRuntimeValues(nextRuntimeValues);
      setSelectedNodeId(snapshot.selectedNodeId);
      setSelectedNodeIds([...snapshot.selectedNodeIds]);
      setSelectedInputId(snapshot.selectedInputId);
      setSelectedRuntimeDayId(snapshot.selectedRuntimeDayId);
      setSelectedRuntimeEntryIndex(snapshot.selectedRuntimeEntryIndex);
      setNodePicker(null);
      isRestoringHistoryRef.current = false;
    },
    [],
  );

  const captureHistory = useCallback(() => {
    if (isRestoringHistoryRef.current) return;

    pastSnapshotsRef.current = [
      ...pastSnapshotsRef.current,
      createHistorySnapshot(),
    ].slice(-STUDIO_HISTORY_LIMIT);
    futureSnapshotsRef.current = [];
  }, [createHistorySnapshot]);

  const undoEditorState = useCallback(() => {
    const previousSnapshot =
      pastSnapshotsRef.current[pastSnapshotsRef.current.length - 1];
    if (!previousSnapshot) {
      showShortcutStatus("Nothing to undo");
      return;
    }

    pastSnapshotsRef.current = pastSnapshotsRef.current.slice(0, -1);
    futureSnapshotsRef.current = [
      createHistorySnapshot(),
      ...futureSnapshotsRef.current,
    ].slice(0, STUDIO_HISTORY_LIMIT);
    restoreHistorySnapshot(previousSnapshot);
    showShortcutStatus("Undo");
  }, [createHistorySnapshot, restoreHistorySnapshot, showShortcutStatus]);

  const redoEditorState = useCallback(() => {
    const nextSnapshot = futureSnapshotsRef.current[0];
    if (!nextSnapshot) {
      showShortcutStatus("Nothing to redo");
      return;
    }

    futureSnapshotsRef.current = futureSnapshotsRef.current.slice(1);
    pastSnapshotsRef.current = [
      ...pastSnapshotsRef.current,
      createHistorySnapshot(),
    ].slice(-STUDIO_HISTORY_LIMIT);
    restoreHistorySnapshot(nextSnapshot);
    showShortcutStatus("Redo");
  }, [createHistorySnapshot, restoreHistorySnapshot, showShortcutStatus]);

  const exportStudioJson = useCallback(() => {
    const currentDocument = documentRef.current;
    const exportDiagnostics = [
      ...validateStudioDocument(currentDocument),
      ...validateStudioRuntimeValuesForDocument(
        currentDocument,
        runtimeValuesRef.current,
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
      runtimeValuesRef.current,
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
  }, [showShortcutStatus]);

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

      documentRef.current = nextDocument;
      runtimeValuesRef.current = nextRuntimeValues;
      selectedNodeIdRef.current = nextSelectedNodeId;
      selectedNodeIdsRef.current = nextSelectedNodeId
        ? [nextSelectedNodeId]
        : [];
      selectedInputIdRef.current = nextSelectedInputId;
      selectedRuntimeDayIdRef.current = nextRuntimeDayId;
      selectedRuntimeEntryIndexRef.current = 0;

      setDocument(nextDocument);
      setRuntimeValues(nextRuntimeValues);
      setSelectedNodeId(nextSelectedNodeId);
      setSelectedNodeIds(nextSelectedNodeId ? [nextSelectedNodeId] : []);
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
    [captureHistory, showShortcutStatus],
  );

  const ensureRemoteTemplateId = useCallback(async (): Promise<string> => {
    if (remoteTemplateId) {
      return remoteTemplateId;
    }

    const currentDocument = documentRef.current;
    const created = await createTemplateStudioTemplateMutation.mutateAsync({
      name: currentDocument.metadata.name.trim() || "Untitled Template",
      description: currentDocument.metadata.description ?? "",
    });

    setRemoteTemplateId(created.template.id);
    return created.template.id;
  }, [createTemplateStudioTemplateMutation, remoteTemplateId]);

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

      documentRef.current = nextDocument;
      runtimeValuesRef.current = normalizedRuntimeValues;
      selectedNodeIdRef.current = nextSelectedNodeId;
      selectedNodeIdsRef.current = nextSelectedNodeId
        ? [nextSelectedNodeId]
        : [];
      selectedInputIdRef.current = nextSelectedInputId;
      selectedRuntimeDayIdRef.current = nextRuntimeDayId;
      selectedRuntimeEntryIndexRef.current = 0;

      setDocument(nextDocument);
      setRuntimeValues(normalizedRuntimeValues);
      setSelectedNodeId(nextSelectedNodeId);
      setSelectedNodeIds(nextSelectedNodeId ? [nextSelectedNodeId] : []);
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
    [captureHistory, showShortcutStatus],
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
      const currentDocument = documentRef.current;
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

      documentRef.current = nextDocument;
      setDocument(nextDocument);

      if (syncAssets.length > 0) {
        showShortcutStatus(`Synced ${syncAssets.length} asset(s)`);
      }

      return nextDocument;
    },
    [
      showShortcutStatus,
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
          runtimeValues: runtimeValuesRef.current,
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
            runtimeValues: runtimeValuesRef.current,
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
          runtimeValues: runtimeValuesRef.current,
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

      const nextDocument = cloneDocument(documentRef.current);
      updater(nextDocument);
      applyStudioTimetableComponentFrames(nextDocument);
      documentRef.current = nextDocument;
      setDocument(nextDocument);
    },
    [captureHistory],
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
      if (
        isStudioFillParentLayout(node.layoutMode) &&
        ["left", "top", "width", "height"].includes(key)
      ) {
        return;
      }

      const component = Object.values(
        nextDocument.domains?.timetable?.components ?? {},
      ).find((candidate) =>
        Object.values(candidate.variants).some(
          (variant) => variant.rootNodeId === node.id,
        ),
      );
      if (
        component &&
        ["left", "top", "width", "height"].includes(key) &&
        typeof value === "number"
      ) {
        component.frame = {
          ...getStudioTimetableComponentFrame(nextDocument, component),
          [key]: value,
        };
      }

      let styleId = node.styleId;
      if (!styleId) {
        styleId = createStudioId("style");
        node.styleId = styleId;
        nextDocument.styles[styleId] = getDefaultStyleForNode(node.type);
      }

      nextDocument.styles[styleId] = {
        ...nextDocument.styles[styleId],
        [key]: value,
      };
    });
  };

  const toggleSelectedNodeFitParent = () => {
    if (!selectedNode) return;

    const shouldFillParent = !isStudioFillParentLayout(selectedNode.layoutMode);
    const resolvedGeometry = resolveStudioGraphNodeGeometry(
      document,
      selectedNode.id,
    );

    updateNode(selectedNode.id, (node, nextDocument) => {
      let styleId = node.styleId;
      if (!styleId) {
        styleId = createStudioId("style");
        node.styleId = styleId;
        nextDocument.styles[styleId] = getDefaultStyleForNode(node.type);
      }

      const style = nextDocument.styles[styleId] ?? {};
      node.layoutMode = shouldFillParent ? "fillParent" : "fixed";
      nextDocument.styles[styleId] = {
        ...style,
        left: 0,
        top: 0,
        ...(shouldFillParent
          ? {}
          : {
              width: resolvedGeometry.width,
              height: resolvedGeometry.height,
            }),
      };
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
    const targetNodeIds = selectedNodeIdsRef.current.includes(nodeId)
      ? getStudioTopLevelNodeIds(
          documentRef.current,
          selectedNodeIdsRef.current,
        )
      : [nodeId];

    updateDocument(
      (nextDocument) => {
        targetNodeIds.forEach((targetNodeId) => {
          const node = nextDocument.graph.nodes[targetNodeId];
          if (
            !node ||
            isStudioNodeLocked(node) ||
            isStudioFillParentLayout(node.layoutMode)
          ) {
            return;
          }

          let styleId = node.styleId;
          if (!styleId) {
            styleId = createStudioId("style");
            node.styleId = styleId;
            nextDocument.styles[styleId] = getDefaultStyleForNode(node.type);
          }

          const styleRecord = nextDocument.styles[styleId] ?? {};
          const left =
            typeof styleRecord.left === "number" ? styleRecord.left : 0;
          const top = typeof styleRecord.top === "number" ? styleRecord.top : 0;

          nextDocument.styles[styleId] = {
            ...styleRecord,
            left: Number((left + delta.deltaX).toFixed(2)),
            top: Number((top + delta.deltaY).toFixed(2)),
          };
        });
      },
      { history: false },
    );
  };

  const moveNodeByKeyboard = useCallback(
    (nodeIds: string[], deltaX: number, deltaY: number) => {
      const targetNodeIds = getStudioTopLevelNodeIds(
        documentRef.current,
        nodeIds,
      );
      if (targetNodeIds.length === 0) return;

      updateDocument((nextDocument) => {
        targetNodeIds.forEach((nodeId) => {
          const node = nextDocument.graph.nodes[nodeId];
          if (!node || isStudioNodeLocked(node)) return;

          let styleId = node.styleId;
          if (!styleId) {
            styleId = createStudioId("style");
            node.styleId = styleId;
            nextDocument.styles[styleId] = getDefaultStyleForNode(node.type);
          }

          const styleRecord = nextDocument.styles[styleId] ?? {};
          const left =
            typeof styleRecord.left === "number" ? styleRecord.left : 0;
          const top = typeof styleRecord.top === "number" ? styleRecord.top : 0;

          nextDocument.styles[styleId] = {
            ...styleRecord,
            left: left + deltaX,
            top: top + deltaY,
          };
        });
      });
    },
    [updateDocument],
  );

  const addNode = (type: StudioGraphNodeType) => {
    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const parentId =
      selectedNode?.type === "group"
        ? selectedNode.id
        : (selectedNode?.parentId ?? document.graph.rootNodeIds[0] ?? null);

    const firstAssetId = Object.keys(document.assets)[0];
    const node: StudioGraphNode = {
      id: nodeId,
      type,
      label: `New ${getNodeTypeLabel(type)}`,
      parentId,
      childIds: [],
      styleId,
      fit: type === "image" ? "cover" : undefined,
      binding:
        type === "text" || type === "flexibleText"
          ? { kind: "staticText", value: "New text" }
          : type === "image" && firstAssetId
            ? { kind: "staticAsset", assetId: firstAssetId }
            : undefined,
    };

    updateDocument((nextDocument) => {
      nextDocument.styles[styleId] = getDefaultStyleForNode(type);
      nextDocument.graph.nodes[nodeId] = node;

      if (parentId) {
        nextDocument.graph.nodes[parentId]?.childIds.push(nodeId);
      } else {
        nextDocument.graph.rootNodeIds.push(nodeId);
      }
    });

    selectSingleNode(nodeId);
    setPanelMode("layers");
  };

  const addCardContextObject = (preset: StudioCardContextObjectPreset) => {
    const existingNodeId = getStudioPresetExistingTargetId(document, preset);

    if (existingNodeId) {
      selectSingleNode(existingNodeId);
      setPanelMode("layers");
      showShortcutStatus(`Selected existing ${preset.label}`);
      return;
    }

    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const parentId =
      selectedNode?.type === "group"
        ? selectedNode.id
        : (selectedNode?.parentId ?? document.graph.rootNodeIds[0] ?? null);

    const node: StudioGraphNode = {
      id: nodeId,
      type: "text",
      label: preset.label,
      parentId,
      childIds: [],
      styleId,
      binding: {
        kind: "builtinField",
        fieldId: preset.fieldId,
      },
      meta: {
        exception: {
          semanticKey: preset.semanticKey,
          scope: "cards",
          presetId: preset.id,
          lockedStructure: true,
          singleton: true,
          builtInBindings: {
            text: preset.fieldId,
          },
        },
      },
    };

    updateDocument((nextDocument) => {
      nextDocument.styles[styleId] = { ...preset.style };
      nextDocument.graph.nodes[nodeId] = node;

      if (parentId) {
        nextDocument.graph.nodes[parentId]?.childIds.push(nodeId);
      } else {
        nextDocument.graph.rootNodeIds.push(nodeId);
      }
    });

    selectSingleNode(nodeId);
    setPanelMode("layers");
    showShortcutStatus(`Added ${preset.label}`);
  };

  const addCardStatusBackgroundObject = (
    preset: StudioCardStatusBackgroundPreset,
  ) => {
    const existingNodeId = getStudioPresetExistingTargetId(document, preset);

    if (existingNodeId) {
      selectSingleNode(existingNodeId);
      setPanelMode("layers");
      showShortcutStatus(`Selected existing ${preset.label}`);
      return;
    }

    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const parentId =
      selectedNode?.type === "group"
        ? selectedNode.id
        : (selectedNode?.parentId ?? document.graph.rootNodeIds[0] ?? null);

    const node: StudioGraphNode = {
      id: nodeId,
      type: "group",
      label: preset.label,
      parentId,
      childIds: [],
      styleId,
      meta: {
        exception: createStudioStatusCardBackgroundExceptionMeta(),
      },
    };

    updateDocument((nextDocument) => {
      nextDocument.styles[styleId] = { ...preset.style };
      nextDocument.graph.nodes[nodeId] = node;

      if (parentId) {
        nextDocument.graph.nodes[parentId]?.childIds.unshift(nodeId);
      } else {
        nextDocument.graph.rootNodeIds.unshift(nodeId);
      }
    });

    selectSingleNode(nodeId);
    setPanelMode("layers");
    showShortcutStatus(`Added ${preset.label}`);
  };

  const addInput = (type: StudioInputType) => {
    const inputId = createStudioId("input");
    const base = {
      id: inputId,
      scope: inputScopeFilter,
      label: `New ${getInputTypeLabel(type)} Input`,
    };

    const input: StudioInputDefinition =
      type === "text"
        ? {
            ...base,
            type: "text",
            placeholder: "Enter text",
            defaultValue: "New value",
            maxLength: 48,
          }
        : type === "image"
          ? {
              ...base,
              type: "image",
              placeholder: "Paste image URL",
              defaultUrl: "",
            }
          : {
              ...base,
              type: "select",
              defaultValue: "option-a",
              options: [
                { value: "option-a", label: "Option A" },
                { value: "option-b", label: "Option B" },
              ],
            };

    updateDocument((nextDocument) => {
      nextDocument.inputs[inputId] = input;
    });
    setRuntimeValues((currentValues) =>
      addRuntimeDefaultForInput(document, currentValues, input),
    );
    setSelectedInputId(inputId);
    setPanelMode("inputs");
  };

  const getCardInsertionParentId = (): string | null =>
    selectedNode?.type === "group"
      ? selectedNode.id
      : (selectedNode?.parentId ?? document.graph.rootNodeIds[0] ?? null);

  const getAssetIdByLabel = (label: string): string | null =>
    assets.find(
      (asset) => asset.label.trim().toLowerCase() === label.toLowerCase(),
    )?.id ?? null;

  const createSelectConsumerNode = ({
    nextDocument,
    parentId,
    input,
    kind,
    label,
    assetByOption,
  }: {
    nextDocument: StudioTemplateDocument;
    parentId: string | null;
    input: Extract<StudioInputDefinition, { type: "select" }>;
    kind: "text" | "image";
    label: string;
    assetByOption?: Record<string, string | null>;
  }): string => {
    const nodeId = createStudioId("node");
    const styleId = createStudioId("style");
    const isImage = kind === "image";

    nextDocument.styles[styleId] = isImage
      ? {
          position: "absolute",
          left: 604,
          top: 292,
          width: 128,
          height: 128,
          borderRadius: 28,
          overflow: "hidden",
          rotateDeg: -8,
        }
      : {
          position: "absolute",
          left: 322,
          top: 178,
          width: 360,
          height: 42,
          fontSize: 18,
          fontWeight: 700,
          color: "#475569",
          display: "flex",
          alignItems: "center",
        };

    nextDocument.graph.nodes[nodeId] = {
      id: nodeId,
      type: isImage ? "image" : "text",
      label,
      parentId,
      childIds: [],
      styleId,
      fit: isImage ? "cover" : undefined,
      binding: isImage
        ? {
            kind: "selectAsset",
            inputId: input.id,
            assetByOption:
              assetByOption ??
              Object.fromEntries(
                input.options.map((option) => [option.value, null]),
              ),
          }
        : {
            kind: "selectText",
            inputId: input.id,
            output: "label",
          },
    };

    if (parentId) {
      nextDocument.graph.nodes[parentId]?.childIds.push(nodeId);
    } else {
      nextDocument.graph.rootNodeIds.push(nodeId);
    }

    return nodeId;
  };

  const addSelectConsumerForInput = (
    input: StudioInputDefinition,
    kind: "text" | "image",
  ) => {
    if (input.type !== "select") return;

    const parentId = getCardInsertionParentId();
    let nextNodeId: string | null = null;

    updateDocument((nextDocument) => {
      const currentInput = nextDocument.inputs[input.id];
      if (!currentInput || currentInput.type !== "select") return;

      nextNodeId = createSelectConsumerNode({
        nextDocument,
        parentId,
        input: currentInput,
        kind,
        label:
          kind === "image"
            ? `${currentInput.label} Image`
            : `${currentInput.label} Label`,
      });
    });

    if (nextNodeId) {
      selectSingleNode(nextNodeId);
      setPanelMode("layers");
      showShortcutStatus(
        `Added ${kind === "image" ? "image" : "text"} consumer`,
      );
    }
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

      const labelNodeId = createSelectConsumerNode({
        nextDocument,
        parentId,
        input,
        kind: "text",
        label: isSticker ? "Selected Sticker Label" : `${inputLabel} Label`,
      });
      nextPrimaryNodeId = labelNodeId;

      if (isSticker) {
        nextPrimaryNodeId = createSelectConsumerNode({
          nextDocument,
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
    let previousValue: string | null = null;

    updateDocument((nextDocument) => {
      const input = nextDocument.inputs[inputId];
      if (!input || input.type !== "select") return;

      const currentOption = input.options[optionIndex];
      if (!currentOption) return;

      previousValue = currentOption.value;
      input.options = input.options.map((option, index) =>
        index === optionIndex ? { ...option, value } : option,
      );

      if (input.defaultValue === previousValue) {
        input.defaultValue = value;
      }

      Object.values(nextDocument.graph.nodes).forEach((node) => {
        if (
          node.binding?.kind !== "selectAsset" ||
          node.binding.inputId !== inputId ||
          previousValue === null
        ) {
          return;
        }

        const mappedAssetId = node.binding.assetByOption[previousValue];
        delete node.binding.assetByOption[previousValue];
        node.binding.assetByOption[value] = mappedAssetId ?? null;
      });
    });

    if (previousValue !== null && previousValue !== value) {
      const runtimePreviousValue = previousValue;
      setRuntimeValues((currentValues) =>
        replaceRuntimeInputValue(
          currentValues,
          inputId,
          runtimePreviousValue,
          value,
        ),
      );
    }
  };

  const addSelectOption = (inputId: string) => {
    updateDocument((nextDocument) => {
      const input = nextDocument.inputs[inputId];
      if (!input || input.type !== "select") return;

      const optionNumber = input.options.length + 1;
      const option: StudioSelectOption = {
        label: `Option ${optionNumber}`,
        value: `option-${optionNumber}`,
      };

      input.options = [...input.options, option];
      Object.values(nextDocument.graph.nodes).forEach((node) => {
        if (
          node.binding?.kind === "selectAsset" &&
          node.binding.inputId === inputId
        ) {
          node.binding.assetByOption[option.value] = null;
        }
      });
    });
  };

  const removeSelectOption = (inputId: string, optionIndex: number) => {
    let removedValue: string | null = null;
    let nextDefaultValue: string | null = null;

    updateDocument((nextDocument) => {
      const input = nextDocument.inputs[inputId];
      if (!input || input.type !== "select" || input.options.length <= 1) {
        return;
      }

      const currentOption = input.options[optionIndex];
      if (!currentOption) return;

      removedValue = currentOption.value;
      const nextOptions = input.options.filter(
        (_, index) => index !== optionIndex,
      );
      input.options = nextOptions;

      if (!nextOptions.some((option) => option.value === input.defaultValue)) {
        input.defaultValue = nextOptions[0]?.value ?? "";
      }
      nextDefaultValue = input.defaultValue ?? nextOptions[0]?.value ?? "";

      Object.values(nextDocument.graph.nodes).forEach((node) => {
        if (
          node.binding?.kind === "selectAsset" &&
          node.binding.inputId === inputId
        ) {
          delete node.binding.assetByOption[currentOption.value];
        }
      });
    });

    if (removedValue !== null && nextDefaultValue !== null) {
      const runtimeRemovedValue = removedValue;
      const runtimeNextDefaultValue = nextDefaultValue;
      setRuntimeValues((currentValues) =>
        replaceRuntimeInputValue(
          currentValues,
          inputId,
          runtimeRemovedValue,
          runtimeNextDefaultValue,
        ),
      );
    }
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

  const toggleTimetableObjectFitParent = useCallback(
    (objectId: string) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[objectId];
        if (!object || !isPlacedTimetableCompositionObject(object)) return;

        const shouldFillParent = !isStudioFillParentLayout(object.layoutMode);
        const resolvedGeometry = resolveStudioTimetableObjectGeometry(
          composition,
          objectId,
          getStudioTimetablePreviewSize(timetable),
        );

        object.layoutMode = shouldFillParent ? "fillParent" : "fixed";
        object.style = {
          ...object.style,
          left: 0,
          top: 0,
          ...(shouldFillParent
            ? {}
            : {
                width: resolvedGeometry.width,
                height: resolvedGeometry.height,
              }),
        };
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
        let linkedPresetInput = false;

        if (
          preset.timetableObjectPresetId === "weeklyMemo" ||
          preset.timetableObjectPresetId === "artistProfileText" ||
          preset.timetableObjectPresetId === "topObject"
        ) {
          updateDocument((nextDocument) => {
            const timetable = nextDocument.domains?.timetable;
            if (!timetable) return;

            const composition = ensureStudioTimetableComposition(timetable);
            const rootObject = composition.objects[existingObjectId];
            if (
              !rootObject?.variantSet ||
              isStudioTimetableVariantInputCompatible(
                nextDocument,
                rootObject.variantSet.inputId,
              )
            ) {
              return;
            }

            const variantInput = ensureStudioTimetableVariantInput(
              nextDocument,
              preset.timetableObjectPresetId,
            );
            if (!variantInput) return;

            rootObject.variantSet.inputId = variantInput.inputId;
            linkedPresetInput = true;
          });
        }

        if (
          preset.timetableObjectPresetId === "weeklyMemo" ||
          preset.timetableObjectPresetId === "artistProfileText"
        ) {
          updateDocument((nextDocument) => {
            const timetable = nextDocument.domains?.timetable;
            if (!timetable) return;

            const composition = ensureStudioTimetableComposition(timetable);
            const rootObject = composition.objects[existingObjectId];
            const object =
              rootObject?.kind === "group"
                ? findTimetableStructuredTextObject(composition, rootObject)
                : rootObject;
            if (
              !object ||
              (object.kind !== "text" && object.kind !== "flexibleText")
            ) {
              return;
            }

            const { inputId } =
              preset.timetableObjectPresetId === "weeklyMemo"
                ? ensureStudioWeeklyMemoInput(nextDocument)
                : ensureStudioArtistProfileTextInput(nextDocument);
            if (
              object.binding?.kind !== "inputText" ||
              object.binding.inputId !== inputId
            ) {
              if (preset.timetableObjectPresetId === "weeklyMemo") {
                bindStudioWeeklyMemoObjectToInput(object, inputId);
              } else {
                bindStudioArtistProfileTextObjectToInput(object, inputId);
              }
              linkedPresetInput = true;
            }
          });
        }

        if (preset.timetableObjectPresetId === "profileBlock") {
          updateDocument((nextDocument) => {
            const timetable = nextDocument.domains?.timetable;
            if (!timetable) return;

            const composition = ensureStudioTimetableComposition(timetable);
            const group = composition.objects[existingObjectId];
            const userImageObject = group?.childIds
              ?.map((childId) => composition.objects[childId])
              .find((child) => child?.profileRole === "userImage");
            if (!userImageObject) return;

            const currentSlot = userImageObject.assetSlots?.asset;
            const defaultUrl = currentSlot?.assetId
              ? (nextDocument.assets[currentSlot.assetId]?.src ?? "")
              : "";
            const { inputId } = ensureStudioPresetImageInput(nextDocument, {
              label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
              scope: "global",
              placeholder: "Paste profile image URL",
              defaultUrl,
            });

            if (currentSlot?.inputId !== inputId) {
              setStudioTimetableObjectAssetInputSlot(
                userImageObject,
                "asset",
                inputId,
                currentSlot?.fit ?? "cover",
              );
              linkedPresetInput = true;
            }
          });
        }

        setSelectedTimetableLayerId(existingObjectId);
        setPanelMode("layers");
        showShortcutStatus(
          linkedPresetInput
            ? `Linked ${preset.label} to input`
            : `Selected existing ${preset.label}`,
        );
        return;
      }

      let insertedObjectId: string | null = null;
      let linkedPresetInput = false;

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const presetTextInput =
          preset.timetableObjectPresetId === "weeklyMemo"
            ? ensureStudioWeeklyMemoInput(nextDocument)
            : preset.timetableObjectPresetId === "artistProfileText"
              ? ensureStudioArtistProfileTextInput(nextDocument)
              : null;
        const variantInput =
          preset.timetableObjectPresetId === "weeklyMemo" ||
          preset.timetableObjectPresetId === "artistProfileText" ||
          preset.timetableObjectPresetId === "topObject"
            ? ensureStudioTimetableVariantInput(
                nextDocument,
                preset.timetableObjectPresetId,
              )
            : null;
        const assetIds = Object.keys(nextDocument.assets);
        const findAssetId = (keywords: string[]) =>
          Object.values(nextDocument.assets).find((asset) => {
            const searchable = `${asset.id} ${asset.label}`.toLowerCase();
            return keywords.some((keyword) => searchable.includes(keyword));
          })?.id;
        const profileImageAssetId =
          findAssetId(["profile", "avatar", "portrait", "photo"]) ??
          assetIds[0];
        const backPlateAssetId =
          findAssetId(["back_plate", "back plate", "backplate", "plate"]) ??
          assetIds[0];
        const frameAssetId =
          findAssetId(["frame", "border"]) ?? assetIds[1] ?? assetIds[0];

        if (preset.timetableObjectPresetId === "profileBlock") {
          const { inputId } = ensureStudioPresetImageInput(nextDocument, {
            label: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
            scope: "global",
            placeholder: "Paste profile image URL",
            defaultUrl: profileImageAssetId
              ? (nextDocument.assets[profileImageAssetId]?.src ?? "")
              : "",
          });
          const { group, children } = createStudioProfileBlockPresetObjects(
            composition,
            {
              inputId,
              backPlateAssetId,
              frameAssetId,
            },
          );

          composition.objects[group.id] = group;
          children.forEach((child) => {
            composition.objects[child.id] = child;
          });
          composition.rootObjectIds.push(group.id);
          insertedObjectId = group.id;
          linkedPresetInput = true;
          return;
        }

        if (
          preset.timetableObjectPresetId === "weeklyMemo" ||
          preset.timetableObjectPresetId === "artistProfileText"
        ) {
          const { group, children } = createStudioStructuredTextPresetObjects(
            preset.timetableObjectPresetId,
            composition,
            {
              inputId: presetTextInput?.inputId,
              variantInputId: variantInput?.inputId,
            },
          );
          composition.objects[group.id] = group;
          children.forEach((child) => {
            composition.objects[child.id] = child;
          });
          composition.rootObjectIds.push(group.id);
          insertedObjectId = group.id;
          linkedPresetInput = Boolean(presetTextInput || variantInput);
          return;
        }

        const defaultAssetId =
          preset.timetableObjectPresetId === "topObject"
            ? (assetIds[1] ?? assetIds[0])
            : undefined;
        if (preset.timetableObjectPresetId === "topObject") {
          const { group, children } = createStudioTopObjectPresetObjects(
            composition,
            {
              assetId: defaultAssetId,
              variantInputId: variantInput?.inputId,
            },
          );
          composition.objects[group.id] = group;
          children.forEach((child) => {
            composition.objects[child.id] = child;
          });
          composition.rootObjectIds.push(group.id);
          insertedObjectId = group.id;
          linkedPresetInput = Boolean(variantInput);
          return;
        }

        const object = createStudioTimetablePresetObject(
          preset.timetableObjectPresetId,
          composition,
          {
            inputId: presetTextInput?.inputId,
            assetId: defaultAssetId,
          },
        );

        composition.objects[object.id] = object;
        composition.rootObjectIds.push(object.id);
        insertedObjectId = object.id;
        linkedPresetInput = Boolean(presetTextInput);
      });

      if (!insertedObjectId) {
        showShortcutStatus("Timetable is not available");
        return;
      }

      setSelectedTimetableLayerId(insertedObjectId);
      setPanelMode("layers");
      showShortcutStatus(
        linkedPresetInput
          ? `Added ${preset.label} with input`
          : `Added ${preset.label}`,
      );
    },
    [document, showShortcutStatus, updateDocument],
  );

  const moveTimetableRootObjectLayer = useCallback(
    (
      sourceObjectId: string,
      targetObjectId: string,
      position: "before" | "after",
    ) => {
      if (sourceObjectId === targetObjectId) return;

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const rootObjectIds = composition.rootObjectIds.filter(
          (objectId) => composition.objects[objectId],
        );
        const sourceIndex = rootObjectIds.indexOf(sourceObjectId);
        const targetIndex = rootObjectIds.indexOf(targetObjectId);
        if (sourceIndex < 0 || targetIndex < 0) return;

        const [movedObjectId] = rootObjectIds.splice(sourceIndex, 1);
        const adjustedTargetIndex =
          sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        const insertIndex =
          position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

        rootObjectIds.splice(insertIndex, 0, movedObjectId);
        composition.rootObjectIds = rootObjectIds;
      });

      setSelectedTimetableLayerId(sourceObjectId);
      showShortcutStatus("Moved timetable layer");
    },
    [showShortcutStatus, updateDocument],
  );

  const moveTimetableDayLayer = useCallback(
    (
      sourceDayId: StudioTimetableDayId,
      targetDayId: StudioTimetableDayId,
      position: "before" | "after",
    ) => {
      if (sourceDayId === targetDayId) return;

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const orderedDayIds = timetable.dayIds
          .filter((dayId) => timetable.days[dayId])
          .sort(
            (leftDayId, rightDayId) =>
              timetable.days[leftDayId].order -
              timetable.days[rightDayId].order,
          );
        const sourceIndex = orderedDayIds.indexOf(sourceDayId);
        const targetIndex = orderedDayIds.indexOf(targetDayId);
        if (sourceIndex < 0 || targetIndex < 0) return;

        const [movedDayId] = orderedDayIds.splice(sourceIndex, 1);
        const adjustedTargetIndex =
          sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
        const insertIndex =
          position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

        orderedDayIds.splice(insertIndex, 0, movedDayId);
        timetable.dayIds = orderedDayIds;
        orderedDayIds.forEach((dayId, order) => {
          timetable.days[dayId].order = order;
        });
      });

      setSelectedTimetableLayerId(`day-card:${sourceDayId}`);
      setSelectedRuntimeDayId(sourceDayId);
      setSelectedRuntimeEntryIndex(0);
      showShortcutStatus("Moved day card container");
    },
    [showShortcutStatus, updateDocument],
  );

  const selectTimetableCanvasLayer = useCallback((layerId: string) => {
    setSelectedTimetableLayerId(layerId);
    setPanelMode("layers");

    if (!layerId.startsWith("day-card:")) return;

    const dayId = layerId.replace(/^day-card:/, "");
    setSelectedRuntimeDayId(dayId);
    setSelectedRuntimeEntryIndex(0);
  }, []);

  const updateTimetableLayerPosition = useCallback(
    (
      layerId: string,
      nextPosition: {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        rotateDeg?: number;
      },
      options: UpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const layout = {
          ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
          ...(timetable.dayCardsLayout ?? {}),
          dayOffsets: {
            ...(timetable.dayCardsLayout?.dayOffsets ?? {}),
          },
        };
        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[layerId];
        const entryCardSize = getStudioTimetableEntryCardSize(
          nextDocument,
          timetable.components[timetable.entryComponentId],
        );

        if (isPlacedTimetableCompositionObject(object)) {
          const updatesBounds =
            nextPosition.left !== undefined ||
            nextPosition.top !== undefined ||
            nextPosition.width !== undefined ||
            nextPosition.height !== undefined;
          if (updatesBounds && isStudioFillParentLayout(object.layoutMode)) {
            return;
          }

          const currentGeometry =
            getStudioTimetableCompositionObjectGeometry(object);

          object.style = {
            ...object.style,
            left: Number(
              (nextPosition.left ?? currentGeometry.left).toFixed(2),
            ),
            top: Number((nextPosition.top ?? currentGeometry.top).toFixed(2)),
            width: Number(
              (nextPosition.width ?? currentGeometry.width).toFixed(2),
            ),
            height: Number(
              (nextPosition.height ?? currentGeometry.height).toFixed(2),
            ),
            rotateDeg: Number(
              (
                nextPosition.rotateDeg ??
                (typeof object.style.rotateDeg === "number"
                  ? object.style.rotateDeg
                  : 0)
              ).toFixed(2),
            ),
          };
          return;
        }

        if (layerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
          layout.left = Number((nextPosition.left ?? layout.left).toFixed(2));
          layout.top = Number((nextPosition.top ?? layout.top).toFixed(2));
          const dayCardsObject =
            composition.objects[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID];
          if (dayCardsObject && nextPosition.rotateDeg !== undefined) {
            dayCardsObject.style = {
              ...dayCardsObject.style,
              rotateDeg: Number(nextPosition.rotateDeg.toFixed(2)),
            };
          }
          timetable.dayCardsLayout = layout;
          return;
        }

        if (!layerId.startsWith("day-card:")) return;

        const dayId = layerId.replace(/^day-card:/, "") as StudioTimetableDayId;
        const orderedDayIds = timetable.dayIds
          .filter((currentDayId) => timetable.days[currentDayId])
          .sort(
            (leftDayId, rightDayId) =>
              timetable.days[leftDayId].order -
              timetable.days[rightDayId].order,
          );
        const dayIndex = orderedDayIds.indexOf(dayId);
        if (dayIndex < 0) return;

        const currentOffset = layout.dayOffsets[dayId] ?? { left: 0, top: 0 };
        const orderedDays = orderedDayIds
          .map((currentDayId) => timetable.days[currentDayId])
          .filter(Boolean);
        const dayGeometry =
          getStudioTimetableDayCardGeometries(
            layout,
            orderedDays,
            (currentDayId) =>
              getStudioTimetableEntriesForDay(
                nextDocument,
                runtimeValues,
                currentDayId,
              ).length,
            entryCardSize,
          )[dayId] ??
          getStudioTimetableDayCardGeometry(
            layout,
            dayId,
            dayIndex,
            getStudioTimetableEntriesForDay(nextDocument, runtimeValues, dayId)
              .length,
            entryCardSize,
          );
        const baseLeft = dayGeometry.left - currentOffset.left;
        const baseTop = dayGeometry.top - currentOffset.top;
        layout.dayOffsets[dayId] = {
          left: Number(
            (nextPosition.left !== undefined
              ? nextPosition.left - baseLeft
              : currentOffset.left
            ).toFixed(2),
          ),
          top: Number(
            (nextPosition.top !== undefined
              ? nextPosition.top - baseTop
              : currentOffset.top
            ).toFixed(2),
          ),
        };
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

          const layout = {
            ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
            ...(timetable.dayCardsLayout ?? {}),
            dayOffsets: {
              ...(timetable.dayCardsLayout?.dayOffsets ?? {}),
            },
          };
          const composition = ensureStudioTimetableComposition(timetable);
          const object = composition.objects[layerId];

          if (isPlacedTimetableCompositionObject(object)) {
            if (isStudioFillParentLayout(object.layoutMode)) return;

            const currentGeometry =
              getStudioTimetableCompositionObjectGeometry(object);

            object.style = {
              ...object.style,
              left: Number((currentGeometry.left + delta.deltaX).toFixed(2)),
              top: Number((currentGeometry.top + delta.deltaY).toFixed(2)),
            };
            return;
          }

          if (layerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
            layout.left = Number((layout.left + delta.deltaX).toFixed(2));
            layout.top = Number((layout.top + delta.deltaY).toFixed(2));
            timetable.dayCardsLayout = layout;
            return;
          }

          if (!layerId.startsWith("day-card:")) return;

          const dayId = layerId.replace(
            /^day-card:/,
            "",
          ) as StudioTimetableDayId;
          const currentOffset = layout.dayOffsets[dayId] ?? {
            left: 0,
            top: 0,
          };
          layout.dayOffsets[dayId] = {
            left: Number((currentOffset.left + delta.deltaX).toFixed(2)),
            top: Number((currentOffset.top + delta.deltaY).toFixed(2)),
          };
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
    [],
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
      const currentDocument = documentRef.current;
      const timetable = currentDocument.domains?.timetable;
      if (!timetable) return;

      const currentCapabilities = getStudioTimetableCapabilities(timetable);
      if (currentCapabilities[capabilityKey].enabled === enabled) return;

      if (
        capabilityKey === "multi" &&
        !enabled &&
        getStudioTimetableDaysWithMultipleEntries(runtimeValuesRef.current)
          .length > 0
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
      }

      const nextRuntimeValues = normalizeRuntimeValuesForTimetableCapabilities(
        cloneRuntimeValues(runtimeValuesRef.current),
        nextCapabilities,
      );

      documentRef.current = nextDocument;
      runtimeValuesRef.current = nextRuntimeValues;
      setDocument(nextDocument);
      setRuntimeValues(nextRuntimeValues);
      showShortcutStatus(
        `${capabilityKey === "multi" ? "Multi" : "Offline memo"} ${
          enabled ? "enabled" : "disabled"
        }`,
      );
    },
    [captureHistory, showShortcutStatus],
  );

  const createSelectedCardVariant = useCallback(() => {
    const currentDocument = documentRef.current;
    const timetable = currentDocument.domains?.timetable;
    if (!timetable) return;

    const component = timetable.components[timetable.entryComponentId];
    const resolution = resolveStudioTimetableComponentVariant(
      currentDocument,
      component,
      selectedCardStatusId,
    );
    if (!component || !resolution) {
      showShortcutStatus("No fallback variant is available");
      return;
    }

    const sourceStatusId = component.variants[selectedCardStatusId]
      ? selectedCardStatusId
      : resolution.resolvedStatusId;
    const nextDocument = cloneDocument(currentDocument);
    const result = cloneStudioComponentVariant(
      nextDocument,
      component.id,
      sourceStatusId,
      selectedCardStatusId,
    );
    if (!result.ok) {
      showShortcutStatus(result.reason);
      return;
    }

    captureHistory();
    documentRef.current = nextDocument;
    setDocument(nextDocument);
    setSelectedNodeId(result.rootNodeId);
    setSelectedNodeIds([result.rootNodeId]);
    showShortcutStatus(
      `${selectedCardStatusId} variant created from ${sourceStatusId}`,
    );
  }, [captureHistory, selectedCardStatusId, showShortcutStatus]);

  const deleteSelectedNode = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length === 0) {
      showShortcutStatus("No object selected");
      return;
    }

    const selectedActionNodes = selectedActionNodeIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter(Boolean) as StudioGraphNode[];

    if (selectedActionNodes.some(isStudioNodeLocked)) {
      showShortcutStatus("Selection includes locked object");
      return;
    }

    if (
      selectedActionNodeIds.some(
        (nodeId) => document.domains?.timetable?.mountNodeId === nodeId,
      )
    ) {
      showShortcutStatus("Root timetable object is locked");
      return;
    }

    const protectedCardNodeIds = new Set<string>();
    Object.values(document.domains?.timetable?.components ?? {}).forEach(
      (component) => {
        Object.values(component.variants).forEach((variant) =>
          protectedCardNodeIds.add(variant.rootNodeId),
        );
      },
    );
    Object.values(document.graph.nodes).forEach((node) => {
      if (node.meta?.entrySlot) protectedCardNodeIds.add(node.id);
    });
    if (
      selectedActionNodeIds.some((nodeId) => protectedCardNodeIds.has(nodeId))
    ) {
      showShortcutStatus("Card variant roots and Entry Groups are locked");
      return;
    }

    const remainingRootIds = document.graph.rootNodeIds.filter(
      (nodeId) => !selectedActionNodeIds.includes(nodeId),
    );

    if (remainingRootIds.length === 0) {
      showShortcutStatus("Last root object is locked");
      return;
    }

    const fallbackSelectionId =
      selectedActionNodes[0]?.parentId &&
      document.graph.nodes[selectedActionNodes[0].parentId]
        ? selectedActionNodes[0].parentId
        : null;

    updateDocument((nextDocument) => {
      const nodeIdsToDelete = new Set<string>();
      const styleIdsToDelete = new Set<string>();

      const collectNode = (nodeId: string) => {
        const node = nextDocument.graph.nodes[nodeId];
        if (!node || nodeIdsToDelete.has(nodeId)) return;

        nodeIdsToDelete.add(nodeId);
        if (node.styleId) styleIdsToDelete.add(node.styleId);
        node.childIds.forEach(collectNode);
      };

      selectedActionNodeIds.forEach(collectNode);

      Object.values(nextDocument.graph.nodes).forEach((node) => {
        node.childIds = node.childIds.filter(
          (childId) => !nodeIdsToDelete.has(childId),
        );
      });

      nextDocument.graph.rootNodeIds = nextDocument.graph.rootNodeIds.filter(
        (nodeId) => !nodeIdsToDelete.has(nodeId),
      );

      nodeIdsToDelete.forEach((nodeId) => {
        delete nextDocument.graph.nodes[nodeId];
      });
      styleIdsToDelete.forEach((styleId) => {
        delete nextDocument.styles[styleId];
      });
    });

    selectSingleNode(fallbackSelectionId);
    setNodePicker(null);
    showShortcutStatus(
      `Deleted ${selectedActionNodeIds.length} ${getStudioSelectionLabel(
        selectedActionNodeIds.length,
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
    const selectedObjectId = selectedTimetableLayerId;

    if (!selectedObjectId) {
      showShortcutStatus("No timetable object selected");
      return;
    }

    if (selectedObjectId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
      showShortcutStatus("Day Card Containers is locked");
      return;
    }

    if (selectedObjectId.startsWith("day-card:")) {
      showShortcutStatus("Generated day cards are locked");
      return;
    }

    const selectedObject = timetableComposition.objects[selectedObjectId];

    if (!selectedObject) {
      showShortcutStatus("Timetable object not found");
      return;
    }

    const objectIdsToDelete = new Set<string>();
    const collectObject = (objectId: string) => {
      const object = timetableComposition.objects[objectId];
      if (!object || objectIdsToDelete.has(objectId)) return;

      objectIdsToDelete.add(objectId);
      (object.childIds ?? []).forEach(collectObject);
    };

    collectObject(selectedObjectId);

    if (objectIdsToDelete.size === 0) {
      showShortcutStatus("Timetable delete failed");
      return;
    }

    const fallbackSelectionId =
      selectedObject.parentId &&
      !objectIdsToDelete.has(selectedObject.parentId) &&
      timetableComposition.objects[selectedObject.parentId]
        ? selectedObject.parentId
        : STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;

    updateDocument((nextDocument) => {
      const timetable = nextDocument.domains?.timetable;
      if (!timetable) return;

      const composition = ensureStudioTimetableComposition(timetable);
      const nextObjectIdsToDelete = new Set<string>();
      const collectNextObject = (objectId: string) => {
        const object = composition.objects[objectId];
        if (!object || nextObjectIdsToDelete.has(objectId)) return;

        nextObjectIdsToDelete.add(objectId);
        (object.childIds ?? []).forEach(collectNextObject);
      };

      collectNextObject(selectedObjectId);

      if (nextObjectIdsToDelete.has(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)) {
        nextObjectIdsToDelete.delete(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);
      }

      Object.values(composition.objects).forEach((object) => {
        if (!object.childIds) return;
        object.childIds = object.childIds.filter(
          (childId) => !nextObjectIdsToDelete.has(childId),
        );
        if (object.variantSet) {
          Object.entries(object.variantSet.rootByValue).forEach(
            ([value, rootObjectId]) => {
              if (rootObjectId && nextObjectIdsToDelete.has(rootObjectId)) {
                object.variantSet!.rootByValue[value] = null;
              }
            },
          );

          const activeRootId =
            object.variantSet.rootByValue[
              object.variantSet.activeValue ?? object.variantSet.defaultValue
            ];
          if (!activeRootId) {
            const nextActiveOption = object.variantSet.options.find(
              (option) => object.variantSet?.rootByValue[option.value],
            );
            object.variantSet.activeValue =
              nextActiveOption?.value ?? object.variantSet.defaultValue;
          }
        }
      });

      composition.rootObjectIds = composition.rootObjectIds.filter(
        (objectId) => !nextObjectIdsToDelete.has(objectId),
      );

      nextObjectIdsToDelete.forEach((objectId) => {
        delete composition.objects[objectId];
      });
    });

    setSelectedTimetableLayerId(fallbackSelectionId);
    setCollapsedTimetableLayerIds((currentLayerIds) =>
      currentLayerIds.filter((layerId) => !objectIdsToDelete.has(layerId)),
    );
    setNodePicker(null);
    showShortcutStatus(
      `Deleted ${objectIdsToDelete.size} timetable ${
        objectIdsToDelete.size === 1 ? "object" : "objects"
      }`,
    );
  }, [
    selectedTimetableLayerId,
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

  const copySelectedNode = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length === 0) {
      showShortcutStatus("No object selected");
      return;
    }

    const payload = createStudioNodeClipboardPayload(
      document,
      selectedActionNodeIds,
    );
    if (!payload) {
      showShortcutStatus("Copy failed");
      return;
    }

    clipboardPayloadRef.current = payload;
    setCutNodeIds([]);
    showShortcutStatus(
      `Copied ${payload.rootNodeIds.length} ${getStudioSelectionLabel(
        payload.rootNodeIds.length,
      )}`,
    );
  }, [document, selectedNodeIds, showShortcutStatus]);

  const pasteClipboardNode = useCallback(() => {
    const payload = clipboardPayloadRef.current;
    if (!payload) {
      showShortcutStatus("Nothing to paste");
      return;
    }

    if (payload.kind === "cut") {
      const currentDocument = documentRef.current;
      const sourceNodeIds = getStudioTopLevelNodeIds(
        currentDocument,
        payload.rootNodeIds,
      );

      if (sourceNodeIds.length === 0) {
        clipboardPayloadRef.current = null;
        setCutNodeIds([]);
        showShortcutStatus("Cut source is missing");
        return;
      }

      const sourceNodes = sourceNodeIds
        .map((nodeId) => currentDocument.graph.nodes[nodeId])
        .filter(Boolean) as StudioGraphNode[];

      if (sourceNodes.some(isStudioNodeLocked)) {
        showShortcutStatus("Selection includes locked object");
        return;
      }

      const selectedTargetId = selectedNodeIdRef.current;
      const selectedTargetNode =
        selectedTargetId && currentDocument.graph.nodes[selectedTargetId]
          ? currentDocument.graph.nodes[selectedTargetId]
          : null;
      const targetNodeId = selectedTargetNode?.id ?? null;

      if (!targetNodeId) {
        showShortcutStatus("Select a destination before pasting cut objects");
        return;
      }

      const validation = validateStudioGraphMove(currentDocument, {
        sourceNodeIds,
        targetNodeId,
        position: "after",
      });

      if (!validation.ok) {
        showShortcutStatus(validation.reason ?? "Paste move blocked");
        return;
      }

      const timetableMountNodeId =
        currentDocument.domains?.timetable?.mountNodeId;
      if (
        timetableMountNodeId &&
        validation.sourceNodeIds.includes(timetableMountNodeId)
      ) {
        const currentParentId =
          currentDocument.graph.nodes[timetableMountNodeId]?.parentId ?? null;
        if (validation.targetParentId !== currentParentId) {
          showShortcutStatus(
            "Root timetable object cannot move to another parent",
          );
          return;
        }
      }

      let moveResult = validation;
      updateDocument((nextDocument) => {
        moveResult = moveStudioGraphNodes(nextDocument, {
          sourceNodeIds,
          targetNodeId,
          position: "after",
          preserveCanvasPosition: true,
        });
      });

      if (!moveResult.ok) {
        showShortcutStatus(moveResult.reason ?? "Paste move failed");
        return;
      }

      clipboardPayloadRef.current = null;
      setCutNodeIds([]);
      applyNodeSelection(
        moveResult.sourceNodeIds,
        moveResult.sourceNodeIds.includes(payload.primaryNodeId ?? "")
          ? payload.primaryNodeId
          : moveResult.sourceNodeIds.at(-1),
      );
      setPanelMode("layers");
      showShortcutStatus(
        `Moved ${moveResult.sourceNodeIds.length} ${getStudioSelectionLabel(
          moveResult.sourceNodeIds.length,
        )}`,
      );
      return;
    }

    const sourceRoot = payload.nodes[payload.rootNodeIds[0]];
    if (!sourceRoot) {
      showShortcutStatus("Paste failed");
      return;
    }

    let pastedRootIds: string[] = [];

    updateDocument((nextDocument) => {
      const sourceParentId = selectedNode?.parentId ?? sourceRoot.parentId;
      const parentNode =
        sourceParentId &&
        !isStudioNodeLocked(nextDocument.graph.nodes[sourceParentId])
          ? nextDocument.graph.nodes[sourceParentId]
          : null;
      const parentId = parentNode?.id ?? null;
      const siblings = parentNode
        ? parentNode.childIds
        : nextDocument.graph.rootNodeIds;

      pastedRootIds = payload.rootNodeIds
        .map((rootNodeId) =>
          insertStudioClipboardSubtree(
            nextDocument,
            payload,
            rootNodeId,
            parentId,
            true,
          ),
        )
        .filter(Boolean) as string[];

      if (pastedRootIds.length === 0) return;
      const selectedSiblingIndex =
        selectedNode?.parentId === parentId
          ? siblings.indexOf(selectedNode.id)
          : -1;
      const sourceSiblingIndex = siblings.indexOf(payload.rootNodeIds[0]);
      const insertIndex =
        selectedSiblingIndex >= 0
          ? selectedSiblingIndex + 1
          : sourceSiblingIndex >= 0
            ? sourceSiblingIndex + 1
            : siblings.length;

      siblings.splice(insertIndex, 0, ...pastedRootIds);
    });

    if (pastedRootIds.length > 0) {
      applyNodeSelection(pastedRootIds, pastedRootIds.at(-1));
      setPanelMode("layers");
      showShortcutStatus(
        `Pasted ${pastedRootIds.length} ${getStudioSelectionLabel(
          pastedRootIds.length,
        )}`,
      );
    }
  }, [applyNodeSelection, selectedNode, showShortcutStatus, updateDocument]);

  const cutSelectedNode = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length === 0) {
      showShortcutStatus("No object selected");
      return;
    }

    const selectedActionNodes = selectedActionNodeIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter(Boolean) as StudioGraphNode[];

    const cardVariantRootIds = new Set(
      Object.values(document.domains?.timetable?.components ?? {}).flatMap(
        (component) =>
          Object.values(component.variants).map(
            (variant) => variant.rootNodeId,
          ),
      ),
    );
    if (
      selectedActionNodes.some(
        (node) => node.meta?.entrySlot || cardVariantRootIds.has(node.id),
      )
    ) {
      showShortcutStatus("Card variant roots and Entry Groups cannot be cut");
      return;
    }

    if (selectedActionNodes.some(isStudioNodeLocked)) {
      showShortcutStatus("Selection includes locked object");
      return;
    }

    const primaryNodeId =
      selectedNodeId && selectedActionNodeIds.includes(selectedNodeId)
        ? selectedNodeId
        : (selectedActionNodeIds.at(-1) ?? null);

    clipboardPayloadRef.current = {
      kind: "cut",
      rootNodeIds: selectedActionNodeIds,
      primaryNodeId,
    };
    setCutNodeIds(selectedActionNodeIds);
    showShortcutStatus(
      `Cut ${selectedActionNodeIds.length} ${getStudioSelectionLabel(
        selectedActionNodeIds.length,
      )}`,
    );
  }, [document, selectedNodeId, selectedNodeIds, showShortcutStatus]);

  const duplicateSelectedNode = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length === 0) {
      showShortcutStatus("No object selected");
      return;
    }

    const payload = createStudioNodeClipboardPayload(
      document,
      selectedActionNodeIds,
    );
    if (!payload) {
      showShortcutStatus("Duplicate failed");
      return;
    }

    const sourceRoot = payload.nodes[payload.rootNodeIds[0]];
    if (!sourceRoot) {
      showShortcutStatus("Duplicate failed");
      return;
    }

    let duplicateRootIds: string[] = [];

    updateDocument((nextDocument) => {
      const parentNode = sourceRoot.parentId
        ? nextDocument.graph.nodes[sourceRoot.parentId]
        : null;
      const parentId = parentNode?.id ?? null;
      const siblings = parentNode
        ? parentNode.childIds
        : nextDocument.graph.rootNodeIds;

      duplicateRootIds = payload.rootNodeIds
        .map((rootNodeId) =>
          insertStudioClipboardSubtree(
            nextDocument,
            payload,
            rootNodeId,
            parentId,
            true,
          ),
        )
        .filter(Boolean) as string[];

      if (duplicateRootIds.length === 0) return;

      const selectedIndexes = selectedActionNodeIds
        .map((nodeId) => siblings.indexOf(nodeId))
        .filter((index) => index >= 0);
      const insertIndex =
        selectedIndexes.length > 0
          ? Math.max(...selectedIndexes) + 1
          : siblings.length;

      siblings.splice(insertIndex, 0, ...duplicateRootIds);
    });

    if (duplicateRootIds.length > 0) {
      applyNodeSelection(duplicateRootIds, duplicateRootIds.at(-1));
      setPanelMode("layers");
      showShortcutStatus(
        `Duplicated ${duplicateRootIds.length} ${getStudioSelectionLabel(
          duplicateRootIds.length,
        )}`,
      );
    }
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
    showShortcutStatus,
    updateDocument,
  ]);

  const nudgeSelectedNode = useCallback(
    (deltaX: number, deltaY: number) => {
      const selectedActionNodeIds = getStudioTopLevelNodeIds(
        document,
        selectedNodeIds,
      );
      if (selectedActionNodeIds.length === 0) return;

      const selectedActionNodes = selectedActionNodeIds
        .map((nodeId) => document.graph.nodes[nodeId])
        .filter(Boolean) as StudioGraphNode[];

      if (selectedActionNodes.some(isStudioNodeLocked)) {
        showShortcutStatus("Selection includes locked object");
        return;
      }

      if (
        selectedActionNodes.some((node) =>
          isStudioFillParentLayout(node.layoutMode),
        )
      ) {
        showShortcutStatus("Disable Fit to move this object");
        return;
      }

      moveNodeByKeyboard(selectedActionNodeIds, deltaX, deltaY);
    },
    [document, moveNodeByKeyboard, selectedNodeIds, showShortcutStatus],
  );

  const moveSelectedNodeLayer = useCallback(
    (command: StudioLayerMoveCommand) => {
      if (!selectedNode) {
        showShortcutStatus("No object selected");
        return;
      }

      if (isStudioNodeLocked(selectedNode)) {
        showShortcutStatus("Object is locked");
        return;
      }

      const parentNode = selectedNode.parentId
        ? document.graph.nodes[selectedNode.parentId]
        : null;
      const siblings = parentNode?.childIds ?? document.graph.rootNodeIds;
      const currentIndex = siblings.indexOf(selectedNode.id);

      if (currentIndex < 0) {
        showShortcutStatus("Layer move failed");
        return;
      }

      const targetIndex =
        command === "front"
          ? siblings.length - 1
          : command === "back"
            ? 0
            : command === "forward"
              ? Math.min(currentIndex + 1, siblings.length - 1)
              : Math.max(currentIndex - 1, 0);

      if (targetIndex === currentIndex) {
        showShortcutStatus(
          command === "front" || command === "forward"
            ? "Already at front"
            : "Already at back",
        );
        return;
      }

      updateDocument((nextDocument) => {
        const nextParentNode = selectedNode.parentId
          ? nextDocument.graph.nodes[selectedNode.parentId]
          : null;
        const nextSiblings = nextParentNode
          ? nextParentNode.childIds
          : nextDocument.graph.rootNodeIds;
        const nextCurrentIndex = nextSiblings.indexOf(selectedNode.id);
        if (nextCurrentIndex < 0) return;

        const [nodeId] = nextSiblings.splice(nextCurrentIndex, 1);
        nextSiblings.splice(targetIndex, 0, nodeId);
      });

      showShortcutStatus(
        command === "front"
          ? "Brought to front"
          : command === "back"
            ? "Sent to back"
            : command === "forward"
              ? "Brought forward"
              : "Sent backward",
      );
    },
    [
      document.graph.nodes,
      document.graph.rootNodeIds,
      selectedNode,
      showShortcutStatus,
      updateDocument,
    ],
  );

  const toggleSelectedNodeLock = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length === 0) {
      showShortcutStatus("No object selected");
      return;
    }

    const selectedActionNodes = selectedActionNodeIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter(Boolean) as StudioGraphNode[];
    const nextLocked = selectedActionNodes.some((node) => !node.locked);

    updateDocument((nextDocument) => {
      selectedActionNodeIds.forEach((nodeId) => {
        const node = nextDocument.graph.nodes[nodeId];
        if (!node) return;
        node.locked = nextLocked;
      });
    });

    showShortcutStatus(
      `${nextLocked ? "Locked" : "Unlocked"} ${
        selectedActionNodeIds.length
      } ${getStudioSelectionLabel(selectedActionNodeIds.length)}`,
    );
  }, [document, selectedNodeIds, showShortcutStatus, updateDocument]);

  const groupSelectedNodes = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );

    if (selectedActionNodeIds.length < 2) {
      showShortcutStatus("Select multiple objects to group");
      return;
    }

    const selectedActionNodes = selectedActionNodeIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter(Boolean) as StudioGraphNode[];

    if (selectedActionNodes.some((node) => node.meta?.entrySlot)) {
      showShortcutStatus("Entry Groups cannot be grouped");
      return;
    }

    if (selectedActionNodes.some(isStudioNodeLocked)) {
      showShortcutStatus("Selection includes locked object");
      return;
    }

    const parentId = selectedActionNodes[0]?.parentId ?? null;
    if (selectedActionNodes.some((node) => node.parentId !== parentId)) {
      showShortcutStatus("Group objects must share a parent");
      return;
    }

    const siblings = parentId
      ? (document.graph.nodes[parentId]?.childIds ?? [])
      : document.graph.rootNodeIds;
    const orderedNodeIds = siblings.filter((nodeId) =>
      selectedActionNodeIds.includes(nodeId),
    );

    if (orderedNodeIds.length < 2) {
      showShortcutStatus("Group failed");
      return;
    }

    const groupNodeId = createStudioId("node");
    const groupStyleId = createStudioId("style");
    const bounds = getStudioCombinedBounds(document, orderedNodeIds);
    const insertIndex = Math.min(
      ...orderedNodeIds.map((nodeId) => siblings.indexOf(nodeId)),
    );

    updateDocument((nextDocument) => {
      const nextSiblings = parentId
        ? nextDocument.graph.nodes[parentId]?.childIds
        : nextDocument.graph.rootNodeIds;
      if (!nextSiblings) return;

      nextDocument.styles[groupStyleId] = {
        position: "absolute",
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      };

      nextDocument.graph.nodes[groupNodeId] = {
        id: groupNodeId,
        type: "group",
        label: "Group",
        parentId,
        childIds: orderedNodeIds,
        styleId: groupStyleId,
      };

      orderedNodeIds.forEach((nodeId) => {
        const node = nextDocument.graph.nodes[nodeId];
        if (!node) return;

        node.parentId = groupNodeId;
        if (node.styleId) {
          const style = nextDocument.styles[node.styleId] ?? {};
          const left = typeof style.left === "number" ? style.left : 0;
          const top = typeof style.top === "number" ? style.top : 0;
          nextDocument.styles[node.styleId] = {
            ...style,
            left: left - bounds.left,
            top: top - bounds.top,
          };
        }
      });

      const selectedSet = new Set(orderedNodeIds);
      const nextChildren = nextSiblings.filter(
        (nodeId) => !selectedSet.has(nodeId),
      );
      nextChildren.splice(insertIndex, 0, groupNodeId);
      nextSiblings.splice(0, nextSiblings.length, ...nextChildren);
    });

    applyNodeSelection([groupNodeId], groupNodeId);
    setPanelMode("layers");
    showShortcutStatus(`Grouped ${orderedNodeIds.length} objects`);
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
    showShortcutStatus,
    updateDocument,
  ]);

  const ungroupSelectedNodes = useCallback(() => {
    const selectedActionNodeIds = getStudioTopLevelNodeIds(
      document,
      selectedNodeIds,
    );
    const groupNodeIds = selectedActionNodeIds.filter(
      (nodeId) => document.graph.nodes[nodeId]?.type === "group",
    );

    if (groupNodeIds.length === 0) {
      showShortcutStatus("No group selected");
      return;
    }

    if (
      groupNodeIds.some(
        (nodeId) => document.domains?.timetable?.mountNodeId === nodeId,
      )
    ) {
      showShortcutStatus("Root timetable object is locked");
      return;
    }

    if (
      groupNodeIds.some(
        (nodeId) => document.graph.nodes[nodeId]?.meta?.entrySlot,
      )
    ) {
      showShortcutStatus("Entry Groups cannot be ungrouped");
      return;
    }

    const groupNodes = groupNodeIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter(Boolean) as StudioGraphNode[];

    if (groupNodes.some(isStudioNodeLocked)) {
      showShortcutStatus("Selection includes locked group");
      return;
    }

    const releasedNodeIds: string[] = [];

    updateDocument((nextDocument) => {
      groupNodeIds.forEach((groupNodeId) => {
        const groupNode = nextDocument.graph.nodes[groupNodeId];
        if (!groupNode || groupNode.type !== "group") return;

        const parentId = groupNode.parentId;
        const siblings = parentId
          ? nextDocument.graph.nodes[parentId]?.childIds
          : nextDocument.graph.rootNodeIds;
        if (!siblings) return;

        const groupIndex = siblings.indexOf(groupNodeId);
        const groupStyle = groupNode.styleId
          ? nextDocument.styles[groupNode.styleId]
          : undefined;
        const groupLeft =
          typeof groupStyle?.left === "number" ? groupStyle.left : 0;
        const groupTop =
          typeof groupStyle?.top === "number" ? groupStyle.top : 0;
        const childIds = [...groupNode.childIds];

        childIds.forEach((childId) => {
          const childNode = nextDocument.graph.nodes[childId];
          if (!childNode) return;

          childNode.parentId = parentId;
          if (childNode.styleId) {
            const childStyle = nextDocument.styles[childNode.styleId] ?? {};
            const left =
              typeof childStyle.left === "number" ? childStyle.left : 0;
            const top = typeof childStyle.top === "number" ? childStyle.top : 0;
            nextDocument.styles[childNode.styleId] = {
              ...childStyle,
              left: left + groupLeft,
              top: top + groupTop,
            };
          }
        });

        if (groupIndex >= 0) {
          siblings.splice(groupIndex, 1, ...childIds);
        }

        if (groupNode.styleId) delete nextDocument.styles[groupNode.styleId];
        delete nextDocument.graph.nodes[groupNodeId];
        releasedNodeIds.push(...childIds);
      });
    });

    if (releasedNodeIds.length > 0) {
      applyNodeSelection(releasedNodeIds, releasedNodeIds.at(-1));
      setPanelMode("layers");
      showShortcutStatus(`Ungrouped ${groupNodeIds.length} group`);
    }
  }, [
    applyNodeSelection,
    document,
    selectedNodeIds,
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

      if (key === "escape" && clipboardPayloadRef.current?.kind === "cut") {
        event.preventDefault();
        event.stopPropagation();
        clipboardPayloadRef.current = null;
        setCutNodeIds([]);
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
    showShortcutStatus,
    toggleSelectedNodeLock,
    ungroupSelectedNodes,
    undoEditorState,
  ]);

  const toggleInspectorSection = (sectionKey: InspectorSectionKey) => {
    setInspectorSections((currentSections) => ({
      ...currentSections,
      [sectionKey]: !currentSections[sectionKey],
    }));
  };

  const renderInspectorSection = (
    sectionKey: InspectorSectionKey,
    title: string,
    children: React.ReactNode,
    badge?: string,
    action?: React.ReactNode,
  ) => (
    <Section
      action={action}
      badge={badge}
      open={inspectorSections[sectionKey]}
      title={title}
      onToggle={() => toggleInspectorSection(sectionKey)}
    >
      {children}
    </Section>
  );

  const getLayerDropPositionFromEvent = (
    event: React.DragEvent<HTMLElement>,
    targetNodeId: string,
  ): StudioGraphDropPosition => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetRatio =
      bounds.height > 0 ? (event.clientY - bounds.top) / bounds.height : 0.5;
    const targetNode = documentRef.current.graph.nodes[targetNodeId];

    if (targetNode?.type !== "group") {
      return offsetRatio < 0.5 ? "before" : "after";
    }

    if (offsetRatio < 0.25) return "before";
    if (offsetRatio > 0.75) return "after";
    return "inside";
  };

  const getLayerDropValidation = useCallback(
    (
      sourceNodeIds: string[],
      targetNodeId: string,
      position: StudioGraphDropPosition,
    ) => {
      const validation = validateStudioGraphMove(documentRef.current, {
        sourceNodeIds,
        targetNodeId,
        position: getStudioDataDropPosition(position),
      });

      if (!validation.ok) return validation;

      const timetableMountNodeId =
        documentRef.current.domains?.timetable?.mountNodeId;
      const mountNode = timetableMountNodeId
        ? documentRef.current.graph.nodes[timetableMountNodeId]
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
        documentRef.current.domains?.timetable?.components ?? {},
      ).forEach((component) => {
        Object.values(component.variants).forEach((variant) =>
          protectedCardNodeIds.add(variant.rootNodeId),
        );
      });
      Object.values(documentRef.current.graph.nodes).forEach((node) => {
        if (node.meta?.entrySlot) protectedCardNodeIds.add(node.id);
      });
      const movesProtectedStructure = validation.sourceNodeIds.some(
        (nodeId) => {
          if (!protectedCardNodeIds.has(nodeId)) return false;
          const node = documentRef.current.graph.nodes[nodeId];
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
    [],
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
    [],
  );

  const handleLayerDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, nodeId: string) => {
      const node = documentRef.current.graph.nodes[nodeId];
      if (!node || isStudioNodeLocked(node)) {
        event.preventDefault();
        showShortcutStatus("Object is locked");
        return;
      }

      const sourceNodeIds = selectedNodeIdsRef.current.includes(nodeId)
        ? getStudioTopLevelNodeIds(
            documentRef.current,
            selectedNodeIdsRef.current,
          )
        : [nodeId];
      const hasLockedSource = sourceNodeIds.some((sourceNodeId) =>
        isStudioNodeLocked(documentRef.current.graph.nodes[sourceNodeId]),
      );

      if (hasLockedSource) {
        event.preventDefault();
        showShortcutStatus("Selection includes locked object");
        return;
      }

      if (!selectedNodeIdsRef.current.includes(nodeId)) {
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
    [selectSingleNode, showShortcutStatus],
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
      const targetNode = documentRef.current.graph.nodes[targetNodeId];

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
      getLayerDropValidation,
      scheduleLayerGroupAutoExpand,
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
      getLayerDropValidation,
      layerDropState,
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

  const renderLayerDropIndicator = (
    nodeId: string,
    depth: number,
    position: "before" | "after",
  ) => {
    const isActive =
      layerDropState?.nodeId === nodeId && layerDropState.position === position;
    if (!isActive) return null;

    const blockedReason = layerDropState.blockedReason;

    return (
      <div
        className={cn(
          "my-1 flex h-4 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.06em]",
          blockedReason ? "text-rose-300" : "text-[var(--accent)]",
        )}
        style={{ marginLeft: Math.min(10 + depth * 20, 70) }}
        title={blockedReason ?? getStudioLayerDropPositionLabel(position)}
        onDragOver={(event) =>
          handleLayerIndicatorDragOver(event, nodeId, position)
        }
        onDrop={(event) => handleLayerDrop(event, nodeId)}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
          )}
        />
        <span
          className={cn(
            "h-0.5 min-w-0 flex-1 rounded-full",
            blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
          )}
        />
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            blockedReason
              ? "bg-rose-400/15 text-rose-300"
              : "bg-[var(--sel)] text-[var(--accent)]",
          )}
        >
          {blockedReason
            ? "Blocked"
            : getStudioLayerDropPositionLabel(position)}
        </span>
      </div>
    );
  };

  const renderLayerTree = (
    nodeId: string,
    depth = 0,
    visitedNodeIds: Set<string> = new Set(),
  ): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;

    if (visitedNodeIds.has(nodeId)) {
      return (
        <div
          className="rounded px-2 py-1 text-[11px] font-semibold text-rose-300"
          key={`${nodeId}:cycle`}
          style={{ marginLeft: Math.min(10 + depth * 20, 70) }}
        >
          Cycle: {node.label}
        </div>
      );
    }

    const nextVisitedNodeIds = new Set(visitedNodeIds);
    nextVisitedNodeIds.add(nodeId);
    const activeDropState =
      layerDropState?.nodeId === node.id ? layerDropState : null;
    const isInsideDropActive = activeDropState?.position === "inside";
    const isCutLayerNode = cutLayerNodeIdsSet.has(node.id);
    const isCollapsibleGroup =
      node.type === "group" && node.childIds.length > 0;
    const isLayerGroupCollapsed = collapsedLayerGroupIdsSet.has(node.id);

    return (
      <div className="min-w-0 max-w-full overflow-hidden" key={node.id}>
        {renderLayerDropIndicator(node.id, depth, "before")}
        <button
          className={cn(
            "flex h-[34px] w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors",
            node.locked
              ? "cursor-default"
              : "cursor-grab active:cursor-grabbing",
            selectedNodeIdsSet.has(node.id)
              ? "bg-[var(--sel)] font-semibold text-[var(--fg)]"
              : "text-[var(--fg2)] hover:bg-[var(--hover)]",
            isInsideDropActive &&
              (activeDropState?.blockedReason
                ? "ring-1 ring-inset ring-rose-400/80"
                : "ring-1 ring-inset ring-[var(--accent)]"),
            isCutLayerNode && "opacity-[0.45]",
          )}
          style={{ paddingLeft: Math.min(10 + depth * 20, 70) }}
          type="button"
          title={activeDropState?.blockedReason ?? node.label}
          draggable={!node.locked}
          onDragEnd={clearLayerDragState}
          onDragOver={(event) => handleLayerDragOver(event, node.id)}
          onDragStart={(event) => handleLayerDragStart(event, node.id)}
          onDrop={(event) => handleLayerDrop(event, node.id)}
          onClick={(event) => {
            if (event.shiftKey) {
              selectLayerNodeRange(node.id, event.metaKey || event.ctrlKey);
            } else if (event.metaKey || event.ctrlKey) {
              toggleNodeSelection(node.id);
            } else {
              selectSingleNode(node.id);
            }
            setPanelMode("layers");
          }}
        >
          <span
            className={cn(
              "flex h-5 w-4 shrink-0 items-center justify-center rounded text-[var(--fg3)] transition",
              isCollapsibleGroup
                ? "hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                : "opacity-0",
            )}
            title={
              isCollapsibleGroup
                ? isLayerGroupCollapsed
                  ? "Expand group"
                  : "Collapse group"
                : undefined
            }
            onClick={(event) => {
              if (!isCollapsibleGroup) return;
              event.preventDefault();
              event.stopPropagation();
              toggleLayerGroupCollapsed(node.id);
            }}
            onMouseDown={(event) => {
              if (isCollapsibleGroup) event.stopPropagation();
            }}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                !isLayerGroupCollapsed && "rotate-90",
              )}
            />
          </span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--fg2)]">
            {node.type === "image" ? (
              <ImageIcon size={14} />
            ) : node.type === "group" ? (
              <Layers3 size={14} />
            ) : (
              <Type size={14} />
            )}
          </span>
          <span className="block min-w-0 flex-1 truncate">{node.label}</span>
          {node.locked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
          ) : null}
          {isInsideDropActive ? (
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em]",
                activeDropState?.blockedReason
                  ? "bg-rose-400/15 text-rose-300"
                  : "bg-[var(--sel)] text-[var(--accent)]",
              )}
            >
              {activeDropState?.blockedReason ? "Blocked" : "Inside"}
            </span>
          ) : null}
          <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
            {getNodeTypeLabel(node.type)}
          </span>
        </button>
        {renderLayerDropIndicator(node.id, depth, "after")}
        {!isLayerGroupCollapsed
          ? getStudioLayerPanelOrder(node.childIds).map((childId) =>
              renderLayerTree(childId, depth + 1, nextVisitedNodeIds),
            )
          : null}
      </div>
    );
  };

  const renderTimetableLayerRow = ({
    id,
    label,
    type,
    depth = 0,
    disabled = false,
    hidden = false,
    collapsible = false,
    collapsed = false,
    draggable = false,
    blockedReason = null,
    onToggleCollapsed,
    onSelect,
    onDragEnd,
    onDragOver,
    onDragStart,
    onDrop,
  }: {
    id: string;
    label: string;
    type: string;
    depth?: number;
    disabled?: boolean;
    hidden?: boolean;
    collapsible?: boolean;
    collapsed?: boolean;
    draggable?: boolean;
    blockedReason?: string | null;
    onToggleCollapsed?: () => void;
    onSelect?: () => void;
    onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void;
    onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void;
    onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
    onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void;
  }) => {
    const isSelected = selectedTimetableLayerId === id;

    return (
      <button
        className={cn(
          "flex h-[34px] w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors",
          disabled
            ? "cursor-not-allowed opacity-45"
            : draggable
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-default",
          !disabled &&
            (isSelected
              ? "bg-[var(--sel)] font-semibold text-[var(--fg)]"
              : "text-[var(--fg2)] hover:bg-[var(--hover)]"),
          hidden && "opacity-55",
          blockedReason && "ring-1 ring-inset ring-rose-400/80",
        )}
        disabled={disabled}
        draggable={draggable && !disabled}
        key={id}
        style={{ paddingLeft: Math.min(10 + depth * 20, 70) }}
        title={blockedReason ?? label}
        type="button"
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragStart={onDragStart}
        onDrop={onDrop}
        onClick={() => {
          setSelectedTimetableLayerId(id);
          onSelect?.();
        }}
      >
        <span
          className={cn(
            "flex h-5 w-4 shrink-0 items-center justify-center rounded text-[var(--fg3)] transition",
            collapsible
              ? "hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              : "opacity-0",
          )}
          title={
            collapsible
              ? collapsed
                ? "Expand group"
                : "Collapse group"
              : undefined
          }
          onClick={(event) => {
            if (!collapsible) return;
            event.preventDefault();
            event.stopPropagation();
            onToggleCollapsed?.();
          }}
          onMouseDown={(event) => {
            if (collapsible) event.stopPropagation();
          }}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              collapsible && !collapsed && "rotate-90",
            )}
          />
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--fg2)]">
          {type === "group" ? (
            <Layers3 size={14} />
          ) : type === "day" ? (
            <CalendarDays size={14} />
          ) : type === "block" || type === "image" ? (
            <ImageIcon size={14} />
          ) : (
            <Type size={14} />
          )}
        </span>
        <span className="block min-w-0 flex-1 truncate">{label}</span>
        {hidden ? (
          <EyeOff className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
        ) : null}
        <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
          {type}
        </span>
      </button>
    );
  };

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

    const blockedReason = timetableLayerDropState?.blockedReason;

    return (
      <div
        className={cn(
          "my-1 flex h-4 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.06em]",
          blockedReason ? "text-rose-300" : "text-[var(--accent)]",
        )}
        key={`${layerId}:${position}:drop`}
        style={{ marginLeft: Math.min(10 + depth * 20, 70) }}
        title={blockedReason ?? getStudioLayerDropPositionLabel(position)}
        onDragOver={(event) =>
          handleTimetableLayerIndicatorDragOver(event, layerId, position, dayId)
        }
        onDrop={(event) => handleTimetableLayerDrop(event, layerId, dayId)}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
          )}
        />
        <span
          className={cn(
            "h-0.5 min-w-0 flex-1 rounded-full",
            blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
          )}
        />
        <span
          className={cn(
            "rounded px-1.5 py-0.5",
            blockedReason
              ? "bg-rose-400/15 text-rose-300"
              : "bg-[var(--sel)] text-[var(--accent)]",
          )}
        >
          {blockedReason
            ? "Blocked"
            : getStudioLayerDropPositionLabel(position)}
        </span>
      </div>
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
        {renderTimetableLayerRow({
          id: object.id,
          label: object.label,
          type,
          depth,
          hidden,
          collapsible:
            isGeneratedDayCards ||
            (object.kind === "group" && childIds.length > 0),
          collapsed: isCollapsed,
          draggable: isRoot,
          blockedReason,
          onDragEnd: isRoot ? clearTimetableLayerDragState : undefined,
          onDragOver: isRoot
            ? (event) => handleTimetableLayerDragOver(event, object.id)
            : undefined,
          onDragStart: isRoot
            ? (event) => handleTimetableLayerDragStart(event, object.id)
            : undefined,
          onDrop: isRoot
            ? (event) => handleTimetableLayerDrop(event, object.id)
            : undefined,
          onToggleCollapsed: isGroup
            ? () => toggleTimetableLayerCollapsed(object.id)
            : undefined,
        })}
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
                  {renderTimetableLayerRow({
                    id: layerId,
                    label: `${day.shortLabel ?? day.label} Card`,
                    type: "day",
                    depth: depth + 1,
                    hidden,
                    draggable: true,
                    blockedReason: dayBlockedReason,
                    onDragEnd: clearTimetableLayerDragState,
                    onDragOver: (event) =>
                      handleTimetableLayerDragOver(event, layerId, day.id),
                    onDragStart: (event) =>
                      handleTimetableLayerDragStart(event, layerId, day.id),
                    onDrop: (event) =>
                      handleTimetableLayerDrop(event, layerId, day.id),
                    onSelect: () => {
                      setSelectedRuntimeDayId(day.id);
                      setSelectedRuntimeEntryIndex(0);
                    },
                  })}
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Timetable Layers
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          {timetableComposition.rootObjectIds.length} placed objects
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
        <div className="grid min-w-0 max-w-full gap-0.5 overflow-hidden">
          {getStudioLayerPanelOrder(timetableComposition.rootObjectIds).map(
            (objectId) => renderTimetableCompositionLayerTree(objectId),
          )}
        </div>
      </div>
    </div>
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
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
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
          <TextareaField
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
        <TextField
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
          <TextField
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

  const renderTimetableCapabilityToggle = (
    capabilityKey: StudioTimetableCapabilityKey,
    label: string,
  ) => {
    const enabled = timetableCapabilities[capabilityKey].enabled;

    return (
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2.5">
        <span className="grid gap-0.5">
          <span className="text-xs font-bold text-[var(--fg)]">{label}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </span>
        <input
          checked={enabled}
          className="h-4 w-4 accent-[var(--accent)]"
          type="checkbox"
          onChange={(event) =>
            setTimetableCapability(capabilityKey, event.currentTarget.checked)
          }
        />
      </label>
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

  const renderTimetableSettings = () => (
    <div className="grid gap-2">
      {renderTimetableCapabilityToggle("multi", "Multi Status")}
      {renderTimetableCapabilityToggle("offlineMemo", "Offline Memo Status")}
    </div>
  );

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
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
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

  const renderInputInspector = (input: StudioInputDefinition | null) => {
    if (!input) {
      return (
        <p className="text-sm font-medium text-[#8fa6cf]">
          Select an input block.
        </p>
      );
    }

    return (
      <div className="grid gap-4">
        {!isInputPanelActive ? (
          <button
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            type="button"
            onClick={() => jumpToInput(input.id)}
          >
            <ArrowUpRight size={12} />
            Open in Inputs
          </button>
        ) : null}

        <TextField
          label="Label"
          value={input.label}
          onChange={(value) =>
            updateInput(input.id, (currentInput) => ({
              ...currentInput,
              label: value,
            }))
          }
        />

        <label className="grid gap-1 text-xs font-semibold text-[#8fa6cf]">
          <span>Scope</span>
          <select
            className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
            value={input.scope}
            onChange={(event) => {
              const scope = event.currentTarget.value as StudioInputScope;
              updateInput(input.id, (currentInput) => ({
                ...currentInput,
                scope,
              }));
            }}
          >
            <option value="global">Global</option>
            <option value="day">Day</option>
            <option value="entry">Entry</option>
          </select>
        </label>

        {input.type === "text" && (
          <>
            <TextField
              label="Placeholder"
              value={input.placeholder ?? ""}
              onChange={(value) =>
                updateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? { ...currentInput, placeholder: value }
                    : currentInput,
                )
              }
            />
            {input.multiline ? (
              <TextareaField
                label="Default"
                rows={input.minRows ?? 4}
                value={input.defaultValue ?? ""}
                onChange={(value) =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "text"
                      ? { ...currentInput, defaultValue: value }
                      : currentInput,
                  )
                }
              />
            ) : (
              <TextField
                label="Default"
                value={input.defaultValue ?? ""}
                onChange={(value) =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "text"
                      ? { ...currentInput, defaultValue: value }
                      : currentInput,
                  )
                }
              />
            )}
            <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Multiline</span>
              <input
                checked={Boolean(input.multiline)}
                className="h-4 w-4 accent-[var(--accent)]"
                type="checkbox"
                onChange={(event) =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "text"
                      ? {
                          ...currentInput,
                          multiline: event.currentTarget.checked || undefined,
                          minRows: event.currentTarget.checked
                            ? (currentInput.minRows ?? 4)
                            : undefined,
                        }
                      : currentInput,
                  )
                }
              />
            </label>
            {input.multiline ? (
              <NumberField
                label="Rows"
                value={Number(input.minRows ?? 4)}
                onChange={(value) =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "text"
                      ? {
                          ...currentInput,
                          minRows: Math.max(2, Math.min(12, value || 4)),
                        }
                      : currentInput,
                  )
                }
              />
            ) : null}
            <NumberField
              label="Max Length"
              value={Number(input.maxLength ?? 0)}
              onChange={(value) =>
                updateInput(input.id, (currentInput) =>
                  currentInput.type === "text"
                    ? {
                        ...currentInput,
                        maxLength: value > 0 ? value : undefined,
                      }
                    : currentInput,
                )
              }
            />
          </>
        )}

        {input.type === "image" && (
          <TextField
            label="Default URL"
            value={input.defaultUrl ?? ""}
            onChange={(value) =>
              updateInput(input.id, (currentInput) =>
                currentInput.type === "image"
                  ? { ...currentInput, defaultUrl: value }
                  : currentInput,
              )
            }
          />
        )}

        {input.type === "select" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                type="button"
                onClick={() => addSelectConsumerForInput(input, "text")}
              >
                <Plus size={12} />
                Text
              </button>
              <button
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                type="button"
                onClick={() => addSelectConsumerForInput(input, "image")}
              >
                <Plus size={12} />
                Image
              </button>
            </div>

            <label className="grid gap-1 text-xs font-semibold text-[#8fa6cf]">
              <span>Default Option</span>
              <select
                className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                value={input.defaultValue ?? ""}
                onChange={(event) =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "select"
                      ? {
                          ...currentInput,
                          defaultValue: event.currentTarget.value,
                        }
                      : currentInput,
                  )
                }
              >
                {input.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2">
              {input.options.map((option, optionIndex) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  key={option.value}
                >
                  <input
                    className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                    value={option.label}
                    onChange={(event) =>
                      updateSelectOptionLabel(
                        input.id,
                        optionIndex,
                        event.currentTarget.value,
                      )
                    }
                  />
                  <input
                    className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                    value={option.value}
                    onChange={(event) =>
                      updateSelectOptionValue(
                        input.id,
                        optionIndex,
                        event.currentTarget.value,
                      )
                    }
                  />
                  <button
                    className="h-9 rounded border border-[#303848] px-3 text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230] disabled:opacity-40"
                    disabled={input.options.length <= 1}
                    type="button"
                    onClick={() => removeSelectOption(input.id, optionIndex)}
                  >
                    Del
                  </button>
                </div>
              ))}
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#303848] bg-[#111827] text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230]"
                type="button"
                onClick={() => addSelectOption(input.id)}
              >
                <Plus size={14} />
                Add option
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#8fa6cf]">
            Consumers
          </h3>
          {(inputConsumers[input.id] ?? []).length > 0 ? (
            <div className="grid gap-1">
              {(inputConsumers[input.id] ?? []).map((consumer) => (
                <button
                  className="flex min-w-0 items-center gap-2 rounded bg-[#182131] px-2 py-1.5 text-left text-xs font-bold text-[#c8d6f2] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  key={consumer.id}
                  type="button"
                  onClick={() => jumpToInputConsumer(consumer)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{consumer.label}</span>
                    <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--fg3)]">
                      {consumer.detail}
                    </span>
                  </span>
                  <ArrowUpRight size={12} className="shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#8fa6cf]">No consumers</p>
          )}
        </div>
      </div>
    );
  };

  const renderTimetableVisibilitySlot = (
    object: StudioTimetableCompositionObject,
  ) => (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-[11px] font-semibold text-[var(--fg2)]">
      <span>Visible</span>
      <input
        checked={!object.hidden}
        className="h-4 w-4 accent-[var(--accent)]"
        type="checkbox"
        onChange={(event) => {
          const visible = event.currentTarget.checked;
          updateTimetableCompositionObject(object.id, (currentObject) => {
            setStudioTimetableObjectVisibilitySlot(currentObject, visible);
          });
        }}
      />
    </label>
  );

  const renderTimetableOpacityControl = (
    object: StudioTimetableCompositionObject,
  ) => (
    <NumberField
      label="Opacity"
      value={getStudioOpacityPercent(object.style.opacity)}
      onChange={(value) =>
        updateTimetableCompositionObject(object.id, (currentObject) => {
          currentObject.style = {
            ...currentObject.style,
            opacity: Math.min(Math.max(value, 0), 100) / 100,
          };
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
          {getInputScopeLabel(input.scope)} · {getInputTypeLabel(input.type)} ·{" "}
          {input.id}
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
    const source = sourceLocked ?? (inputId ? "input" : "asset");
    const input = inputId ? document.inputs[inputId] : null;
    const hasMissingAsset = Boolean(assetId && !document.assets[assetId]);
    const hasMissingInput = Boolean(
      inputId && (!input || input.type !== "image"),
    );
    const hasSource = Boolean(assetId || inputId);
    const activateInputSource = () => {
      if (!onUpdateInput) return;

      const defaultUrl = assetId ? (document.assets[assetId]?.src ?? "") : "";

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

    return (
      <>
        {onUpdateInput && !sourceLocked ? (
          <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>{label} Source</span>
            <select
              className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              value={source}
              onChange={(event) => {
                if (event.currentTarget.value === "input") {
                  activateInputSource();
                  return;
                }

                updateTimetableCompositionObject(object.id, (currentObject) => {
                  onUpdateAsset(
                    currentObject,
                    assetId ?? null,
                    fit ?? defaultFit,
                  );
                });
              }}
            >
              <option value="asset">Template Asset</option>
              <option value="input">User Input</option>
            </select>
          </label>
        ) : null}
        {source === "asset" ? (
          <div className="grid gap-2">
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>{label}</span>
              <select
                className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
                disabled={assets.length === 0 && !assetId}
                value={assetId ?? ""}
                onChange={(event) => {
                  const nextAssetId = event.currentTarget.value || null;
                  updateTimetableCompositionObject(
                    object.id,
                    (currentObject) => {
                      onUpdateAsset(
                        currentObject,
                        nextAssetId,
                        fit ?? defaultFit,
                      );
                    },
                  );
                }}
              >
                <option value="">None</option>
                {hasMissingAsset ? (
                  <option value={assetId ?? ""}>Missing asset</option>
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

                        const composition =
                          ensureStudioTimetableComposition(timetable);
                        const currentObject = composition.objects[object.id];
                        if (!currentObject) return;

                        onUpdateAsset(
                          currentObject,
                          nextAssetId,
                          fit ?? defaultFit,
                        );
                      },
                    );
                  });
                }}
              />
            </label>
          </div>
        ) : input && input.type === "image" ? (
          renderTimetableInputSourceSlot(input)
        ) : hasMissingInput ? (
          <div className="rounded-md border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
            Missing image input: {inputId}
          </div>
        ) : source === "input" && onUpdateInput ? (
          <button
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[11px] font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
            type="button"
            onClick={activateInputSource}
          >
            <Plus size={12} />
            Create user image input
          </button>
        ) : null}
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Fit</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
            disabled={!hasSource}
            value={fit ?? defaultFit}
            onChange={(event) => {
              const nextFit = event.currentTarget.value as StudioImageFit;
              updateTimetableCompositionObject(object.id, (currentObject) => {
                if (inputId && onUpdateInput) {
                  onUpdateInput(currentObject, inputId, nextFit);
                  return;
                }

                onUpdateAsset(currentObject, assetId ?? null, nextFit);
              });
            }}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Fill</option>
          </select>
        </label>
      </>
    );
  };

  const renderTimetableBackgroundAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const backgroundSlot = object.assetSlots?.background;

    return renderTimetableAssetSlot({
      object,
      label: "Background Asset",
      assetId: backgroundSlot?.assetId ?? object.backgroundAssetId,
      inputId: backgroundSlot?.inputId,
      fit: backgroundSlot?.fit ?? object.backgroundFit,
      inputLabel: STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectBackgroundAssetSlot(
          currentObject,
          assetId,
          fit,
        );
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectBackgroundInputSlot(
          currentObject,
          inputId,
          fit,
        );
      },
    });
  };

  const renderTimetableProfileImageSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const profileImageSlot = object.assetSlots?.profileImage;

    return renderTimetableAssetSlot({
      object,
      label: "Profile Image",
      assetId: profileImageSlot?.assetId,
      inputId: profileImageSlot?.inputId,
      fit: profileImageSlot?.fit,
      inputLabel: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(
          currentObject,
          "profileImage",
          assetId,
          fit,
        );
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectAssetInputSlot(
          currentObject,
          "profileImage",
          inputId,
          fit,
        );
      },
    });
  };

  const renderTimetableProfileFrameSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const profileFrameSlot = object.assetSlots?.profileFrame;

    return renderTimetableAssetSlot({
      object,
      label: "Frame Asset",
      assetId: profileFrameSlot?.assetId,
      inputId: profileFrameSlot?.inputId,
      fit: profileFrameSlot?.fit,
      defaultFit: "contain",
      inputLabel: STUDIO_PROFILE_BLOCK_FRAME_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(
          currentObject,
          "profileFrame",
          assetId,
          fit,
        );
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectAssetInputSlot(
          currentObject,
          "profileFrame",
          inputId,
          fit,
        );
      },
    });
  };

  const renderTimetableProfileChildAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const assetSlot = object.assetSlots?.asset;
    const role = object.profileRole;
    const isUserImage = role === "userImage";
    const label =
      role === "backPlate"
        ? "Back Plate Asset"
        : role === "frame"
          ? "Frame Asset"
          : "User Image";

    return renderTimetableAssetSlot({
      object,
      label,
      assetId: assetSlot?.assetId,
      inputId: assetSlot?.inputId,
      fit: assetSlot?.fit,
      defaultFit: isUserImage ? "cover" : "contain",
      inputLabel: STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
      sourceLocked: isUserImage ? "input" : "asset",
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(currentObject, "asset", assetId, fit);
      },
      onUpdateInput: isUserImage
        ? (currentObject, inputId, fit) => {
            setStudioTimetableObjectAssetInputSlot(
              currentObject,
              "asset",
              inputId,
              fit,
            );
          }
        : undefined,
    });
  };

  const renderTimetableStructuredBackgroundAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const assetSlot = object.assetSlots?.asset;

    return renderTimetableAssetSlot({
      object,
      label: "Background Asset",
      assetId: assetSlot?.assetId,
      fit: assetSlot?.fit,
      defaultFit: "cover",
      inputLabel: STUDIO_WEEKLY_MEMO_BACKGROUND_INPUT_LABEL,
      sourceLocked: "asset",
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(currentObject, "asset", assetId, fit);
      },
    });
  };

  const renderTimetableTopObjectAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const assetSlot = object.assetSlots?.asset;

    return renderTimetableAssetSlot({
      object,
      label: "Object Asset",
      assetId: assetSlot?.assetId,
      inputId: assetSlot?.inputId,
      fit: assetSlot?.fit,
      defaultFit: "contain",
      inputLabel: STUDIO_TOP_OBJECT_IMAGE_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(currentObject, "asset", assetId, fit);
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectAssetInputSlot(
          currentObject,
          "asset",
          inputId,
          fit,
        );
      },
    });
  };

  const renderTimetableArtistProfileTextAssetSlot = (
    object: StudioTimetableCompositionObject,
  ) => {
    const assetSlot = object.assetSlots?.asset;

    return renderTimetableAssetSlot({
      object,
      label: "Text Asset",
      assetId: assetSlot?.assetId,
      inputId: assetSlot?.inputId,
      fit: assetSlot?.fit,
      defaultFit: "contain",
      inputLabel: STUDIO_ARTIST_PROFILE_TEXT_ASSET_INPUT_LABEL,
      onUpdateAsset: (currentObject, assetId, fit) => {
        setStudioTimetableObjectAssetSlot(currentObject, "asset", assetId, fit);
      },
      onUpdateInput: (currentObject, inputId, fit) => {
        setStudioTimetableObjectAssetInputSlot(
          currentObject,
          "asset",
          inputId,
          fit,
        );
      },
    });
  };

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

    const layout = getStudioTimetableDayCardsLayout(timetable);
    const columns = layout.columns ?? 7;
    const rows = layout.rows ?? 1;
    const slotCount = columns * rows;
    const dayIds = timetableDays.map((day) => day.id);
    const slots =
      layout.slots && layout.slots.length > 0
        ? Array.from(
            { length: slotCount },
            (_, index) => layout.slots?.[index] ?? null,
          )
        : createStudioDayCardSlots(dayIds, slotCount);

    return (
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Grid Preset</span>
          <select
            className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            value={layout.gridPreset ?? "1x7"}
            onChange={(event) => {
              const gridPreset = event.currentTarget
                .value as StudioTimetableDayCardsLayout["gridPreset"];
              const preset = STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.find(
                (candidate) => candidate.id === gridPreset,
              );

              updateTimetableDayCardsLayout((nextLayout) => {
                nextLayout.gridPreset = gridPreset;
                if (preset) {
                  nextLayout.columns = preset.columns;
                  nextLayout.rows = Math.max(
                    preset.rows,
                    Math.ceil(timetableDays.length / preset.columns),
                  );
                }

                if (gridPreset === "custom") {
                  nextLayout.slots = createStudioDayCardSlots(
                    dayIds,
                    (nextLayout.columns ?? columns) * (nextLayout.rows ?? rows),
                  );
                } else {
                  nextLayout.slots = undefined;
                }
              });
            }}
          >
            {STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Fill Order</span>
            <select
              className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              value={layout.fillOrder ?? "row"}
              onChange={(event) => {
                const fillOrder = event.currentTarget
                  .value as StudioTimetableDayCardsLayout["fillOrder"];
                updateTimetableDayCardsLayout((nextLayout) => {
                  nextLayout.fillOrder = fillOrder;
                  if (nextLayout.gridPreset !== "custom") {
                    nextLayout.slots = undefined;
                  }
                });
              }}
            >
              {STUDIO_DAY_CARD_FILL_ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
            <span>Remainder</span>
            <select
              className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              value={layout.alignLastRow ?? "start"}
              onChange={(event) => {
                const alignLastRow = event.currentTarget
                  .value as StudioTimetableDayCardsLayout["alignLastRow"];
                updateTimetableDayCardsLayout((nextLayout) => {
                  nextLayout.alignLastRow = alignLastRow;
                  if (nextLayout.gridPreset !== "custom") {
                    nextLayout.slots = undefined;
                  }
                });
              }}
            >
              {STUDIO_DAY_CARD_ALIGN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {layout.gridPreset === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Columns"
              value={columns}
              onChange={(value) =>
                updateTimetableDayCardsLayout((nextLayout) => {
                  const nextColumns = Math.max(1, Math.round(value));
                  const nextRows = Math.max(
                    nextLayout.rows ?? rows,
                    Math.ceil(timetableDays.length / nextColumns),
                  );
                  nextLayout.columns = nextColumns;
                  nextLayout.rows = nextRows;
                  nextLayout.slots = createStudioDayCardSlots(
                    dayIds,
                    nextColumns * nextRows,
                  );
                })
              }
            />
            <NumberField
              label="Rows"
              value={rows}
              onChange={(value) =>
                updateTimetableDayCardsLayout((nextLayout) => {
                  const nextRows = Math.max(1, Math.round(value));
                  const nextColumns = Math.max(
                    nextLayout.columns ?? columns,
                    Math.ceil(timetableDays.length / nextRows),
                  );
                  nextLayout.columns = nextColumns;
                  nextLayout.rows = nextRows;
                  nextLayout.slots = createStudioDayCardSlots(
                    dayIds,
                    nextColumns * nextRows,
                  );
                })
              }
            />
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Gap X"
            value={layout.columnGap ?? layout.dayGap}
            onChange={(value) =>
              updateTimetableDayCardsLayout((nextLayout) => {
                nextLayout.columnGap = value;
                nextLayout.dayGap = value;
              })
            }
          />
          <NumberField
            label="Gap Y"
            value={layout.rowGap ?? layout.dayGap}
            onChange={(value) =>
              updateTimetableDayCardsLayout((nextLayout) => {
                nextLayout.rowGap = value;
              })
            }
          />
        </div>

        {layout.gridPreset === "custom" ? (
          <div className="grid gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--fg2)]">
              Slot Map
            </span>
            <div
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {slots.map((slotDayId, slotIndex) => (
                <select
                  className="h-8 min-w-0 rounded-md border border-[var(--field-border)] bg-[var(--field)] px-1 text-[10px] font-bold text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  key={slotIndex}
                  value={slotDayId ?? ""}
                  onChange={(event) => {
                    const nextDayId = event.currentTarget.value || null;
                    updateTimetableDayCardsLayout((nextLayout) => {
                      const nextSlots = Array.from(
                        { length: slotCount },
                        (_, index) => nextLayout.slots?.[index] ?? null,
                      );

                      nextSlots.forEach((currentDayId, index) => {
                        if (nextDayId && currentDayId === nextDayId) {
                          nextSlots[index] = null;
                        }
                      });
                      nextSlots[slotIndex] =
                        nextDayId as StudioTimetableDayId | null;

                      nextLayout.gridPreset = "custom";
                      nextLayout.slots = nextSlots;
                    });
                  }}
                >
                  <option value="">Empty</option>
                  {timetableDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.shortLabel ?? day.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        ) : null}

        <button
          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-semibold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
          type="button"
          onClick={() =>
            updateTimetableDayCardsLayout((nextLayout) => {
              nextLayout.dayOffsets = {};
            })
          }
        >
          Reset card offsets
        </button>
      </div>
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
          <NumberField
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
          <NumberField
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
        <NumberField
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
          <NumberField
            label="Size"
            value={Number(styleRecord.fontSize ?? 16)}
            onChange={(value) => updateTimetableTextStyle("fontSize", value)}
          />
          <FontWeightField
            options={fontWeightOptions}
            value={styleRecord.fontWeight ?? 700}
            onChange={(value) => updateTimetableTextStyle("fontWeight", value)}
          />
        </div>
        <NumberField
          label="Line Height"
          value={Number(styleRecord.lineHeight ?? 1.2)}
          onChange={(value) => updateTimetableTextStyle("lineHeight", value)}
        />
        <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
          <span>Color</span>
          <div className="flex h-8 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2">
            <input
              className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
              type="color"
              value={String(styleRecord.color ?? "#111827")}
              onChange={(event) =>
                updateTimetableTextStyle("color", event.currentTarget.value)
              }
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs font-medium uppercase tracking-[0.02em] text-[var(--fg)] outline-none"
              value={String(styleRecord.color ?? "#111827")}
              onChange={(event) =>
                updateTimetableTextStyle("color", event.currentTarget.value)
              }
            />
          </div>
        </label>
      </div>
    );
  };

  const renderStatusCardBackgroundAssetSlots = (node: StudioGraphNode) => {
    const statuses = getStudioStatusCardBackgroundStatuses(document);

    if (statuses.length === 0) {
      return (
        <div className="rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--fg3)]">
          No available timetable statuses.
        </div>
      );
    }

    return (
      <div className="grid gap-3">
        {statuses.map((status) => {
          const slot = node.assetSlots?.[status.id];
          const assetId = slot?.assetId ?? "";
          const hasMissingAsset = Boolean(assetId && !document.assets[assetId]);

          return (
            <div
              className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field-bg)] p-2"
              key={status.id}
            >
              <div className="text-[11px] font-bold text-[var(--fg)]">
                {status.label}
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
                        status.id,
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
                        `${node.label} ${status.label}`,
                        (nextDocument, nextAssetId) => {
                          const currentNode = nextDocument.graph.nodes[node.id];
                          if (!currentNode) return;

                          setStudioStatusCardBackgroundAssetSlot(
                            currentNode,
                            status.id,
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
                        status.id,
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
        })}
      </div>
    );
  };

  const renderNodeInspector = () => {
    const styleRecord = selectedNode?.styleId
      ? (document.styles[selectedNode.styleId] ?? {})
      : {};

    if (!selectedNode) {
      return (
        <p className="p-4 text-sm font-medium text-[var(--fg2)]">
          Select an object from the canvas or layer tree.
        </p>
      );
    }

    const selectedFontFamily = String(styleRecord.fontFamily ?? "Inter");
    const isSelectedNodeFitParent = isStudioFillParentLayout(
      selectedNode.layoutMode,
    );
    const selectedNodeGeometry = resolveStudioGraphNodeGeometry(
      document,
      selectedNode.id,
    );
    const selectedFontWeightOptions = getStudioFontWeightOptions(
      document,
      selectedFontFamily,
    );

    const bindingInputId = getStudioBindingInputId(selectedNode.binding);
    const bindingBuiltinFieldId =
      selectedNode.binding?.kind === "builtinField"
        ? selectedNode.binding.fieldId
        : null;
    const isBoundBinding = Boolean(bindingInputId || bindingBuiltinFieldId);
    const compatibleBindingCount =
      compatibleBuiltinFields.length + compatibleInputs.length;
    const bindingSourceValue = bindingBuiltinFieldId
      ? `builtin:${bindingBuiltinFieldId}`
      : bindingInputId
        ? `input:${bindingInputId}`
        : "";
    const opacityPercent = getStudioOpacityPercent(styleRecord.opacity);
    const alignActions = [
      { title: "Align left", Icon: AlignHorizontalJustifyStart },
      { title: "Align center", Icon: AlignHorizontalJustifyCenter },
      { title: "Align right", Icon: AlignHorizontalJustifyEnd },
      { title: "Align top", Icon: AlignVerticalJustifyStart },
      { title: "Align middle", Icon: AlignVerticalJustifyCenter },
      { title: "Align bottom", Icon: AlignVerticalJustifyEnd },
    ];

    return (
      <>
        {renderInspectorSection(
          "position",
          "Position",
          <div className="grid gap-2">
            <div className="mb-1 grid grid-cols-6 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
              {alignActions.map(({ title, Icon }) => (
                <button
                  className="flex h-6 items-center justify-center rounded text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
                  key={title}
                  title={title}
                  type="button"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                disabled={isSelectedNodeFitParent}
                label="X"
                value={selectedNodeGeometry.left}
                onChange={(value) => updateSelectedNodeStyle("left", value)}
              />
              <NumberField
                disabled={isSelectedNodeFitParent}
                label="Y"
                value={selectedNodeGeometry.top}
                onChange={(value) => updateSelectedNodeStyle("top", value)}
              />
              <NumberField
                label="Rotate"
                value={Number(styleRecord.rotateDeg ?? 0)}
                onChange={(value) =>
                  updateSelectedNodeStyle("rotateDeg", value)
                }
              />
            </div>
          </div>,
          undefined,
          <FitParentButton
            active={isSelectedNodeFitParent}
            onClick={toggleSelectedNodeFitParent}
          />,
        )}

        {renderInspectorSection(
          "layout",
          "Layout",
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <NumberField
              disabled={isSelectedNodeFitParent}
              label="W"
              value={selectedNodeGeometry.width}
              onChange={(value) => updateSelectedNodeStyle("width", value)}
            />
            <NumberField
              disabled={isSelectedNodeFitParent}
              label="H"
              value={selectedNodeGeometry.height}
              onChange={(value) => updateSelectedNodeStyle("height", value)}
            />
            <button
              className="mt-[21px] flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:text-[var(--fg)]"
              title="Lock aspect ratio"
              type="button"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          </div>,
        )}

        {renderInspectorSection(
          "appearance",
          "Appearance",
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Opacity"
              value={opacityPercent}
              onChange={(value) =>
                updateSelectedNodeStyle(
                  "opacity",
                  Math.min(Math.max(value, 0), 100) / 100,
                )
              }
            />
            <NumberField
              label="Radius"
              value={Number(styleRecord.borderRadius ?? 0)}
              onChange={(value) =>
                updateSelectedNodeStyle("borderRadius", value)
              }
            />
          </div>,
        )}

        {isStudioStatusCardBackgroundNode(selectedNode)
          ? renderInspectorSection(
              "statusAssets",
              "Status Assets",
              renderStatusCardBackgroundAssetSlots(selectedNode),
            )
          : null}

        {(isStudioTextNode(selectedNode) ||
          isStudioImageNode(selectedNode)) && (
          <>
            {renderInspectorSection(
              "binding",
              "Binding",
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
                  <button
                    className={cn(
                      "h-7 rounded-[5px] text-[11.5px] font-semibold transition",
                      !isBoundBinding
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                    )}
                    type="button"
                    onClick={setSelectedNodeStaticBinding}
                  >
                    Static
                  </button>
                  <button
                    className={cn(
                      "h-7 rounded-[5px] text-[11.5px] font-semibold transition",
                      isBoundBinding
                        ? "bg-[var(--accent)] text-white"
                        : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                      compatibleBindingCount === 0 &&
                        "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-[var(--fg2)]",
                    )}
                    disabled={compatibleBindingCount === 0}
                    type="button"
                    onClick={() => {
                      if (compatibleBuiltinFields[0]) {
                        bindSelectedNodeToBuiltinField(
                          compatibleBuiltinFields[0].id,
                        );
                      } else if (compatibleInputs[0]) {
                        bindSelectedNodeToInput(compatibleInputs[0].id);
                      }
                    }}
                  >
                    Bound
                  </button>
                </div>

                {!isBoundBinding ? (
                  <>
                    {isStudioTextNode(selectedNode) && (
                      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                        <span>Static text</span>
                        <textarea
                          className="min-h-20 rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                          value={
                            selectedNode.binding?.kind === "staticText"
                              ? selectedNode.binding.value
                              : ""
                          }
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) => {
                              node.binding = {
                                kind: "staticText",
                                value: event.currentTarget.value,
                              };
                            })
                          }
                        />
                      </label>
                    )}

                    {isStudioImageNode(selectedNode) && (
                      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                        <span>Static asset</span>
                        <select
                          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
                          disabled={assets.length === 0}
                          value={
                            selectedNode.binding?.kind === "staticAsset"
                              ? selectedNode.binding.assetId
                              : (assets[0]?.id ?? "")
                          }
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) => {
                              node.binding = {
                                kind: "staticAsset",
                                assetId: event.currentTarget.value,
                              };
                            })
                          }
                        >
                          {assets.length === 0 ? (
                            <option value="">No asset</option>
                          ) : null}
                          {assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                              {asset.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                      <span>Binding Source</span>
                      <select
                        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)] disabled:text-[var(--fg3)]"
                        disabled={compatibleBindingCount === 0}
                        value={bindingSourceValue}
                        onChange={(event) => {
                          const value = event.currentTarget.value;
                          if (value.startsWith("builtin:")) {
                            bindSelectedNodeToBuiltinField(
                              value.replace(
                                /^builtin:/,
                                "",
                              ) as StudioBuiltinFieldId,
                            );
                            return;
                          }

                          if (value.startsWith("input:")) {
                            bindSelectedNodeToInput(
                              value.replace(/^input:/, ""),
                            );
                          }
                        }}
                      >
                        {compatibleBindingCount === 0 ? (
                          <option value="">No compatible binding</option>
                        ) : null}
                        {compatibleBuiltinFieldGroups.map((group) => (
                          <optgroup
                            key={`builtin:${group.scope}`}
                            label={`Built-in · ${getInputScopeLabel(group.scope)}`}
                          >
                            {group.fields.map((field) => (
                              <option
                                key={field.id}
                                value={`builtin:${field.id}`}
                              >
                                {field.label} · Built-in ·{" "}
                                {getInputScopeLabel(field.scope)} · {field.type}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        {compatibleInputGroups.map((group) => (
                          <optgroup
                            key={`input:${group.scope}`}
                            label={`Custom · ${getInputScopeLabel(group.scope)}`}
                          >
                            {group.inputs.map((input) => (
                              <option
                                key={input.id}
                                value={`input:${input.id}`}
                              >
                                {input.label} · Custom ·{" "}
                                {getInputScopeLabel(input.scope)} ·{" "}
                                {getInputTypeLabel(input.type)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </label>

                    {selectedNodeBuiltinField ? (
                      <div className="grid gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                          Built-in Source
                        </span>
                        <span className="truncate text-xs font-semibold text-[var(--fg)]">
                          {selectedNodeBuiltinField.label}
                        </span>
                        <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                          {getInputScopeLabel(selectedNodeBuiltinField.scope)} ·{" "}
                          {selectedNodeBuiltinField.type} ·{" "}
                          {selectedNodeBuiltinField.id}
                        </span>
                      </div>
                    ) : selectedNodeBoundInput ? (
                      <div className="grid gap-1.5 rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--fg3)]">
                          Custom Input Source
                        </span>
                        <span className="truncate text-xs font-semibold text-[var(--fg)]">
                          {selectedNodeBoundInput.label}
                        </span>
                        <span className="truncate text-[11px] font-medium text-[var(--fg3)]">
                          {getInputScopeLabel(selectedNodeBoundInput.scope)} ·{" "}
                          {getInputTypeLabel(selectedNodeBoundInput.type)} ·{" "}
                          {selectedNodeBoundInput.id}
                        </span>
                      </div>
                    ) : null}

                    {selectedNode.binding?.kind === "selectText" && (
                      <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                        <span>Select Output</span>
                        <select
                          className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                          value={selectedNode.binding.output}
                          onChange={(event) =>
                            updateNode(selectedNode.id, (node) => {
                              if (node.binding?.kind !== "selectText") return;
                              node.binding.output = event.currentTarget
                                .value as "label" | "value";
                            })
                          }
                        >
                          <option value="label">Label</option>
                          <option value="value">Value</option>
                        </select>
                      </label>
                    )}

                    {selectedNode.binding?.kind === "selectAsset" &&
                      (() => {
                        const input =
                          document.inputs[selectedNode.binding.inputId];
                        if (!input || input.type !== "select") return null;

                        return (
                          <div className="grid gap-2">
                            {input.options.map((option) => (
                              <label
                                className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]"
                                key={option.value}
                              >
                                <span>{option.label}</span>
                                <select
                                  className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                                  value={
                                    selectedNode.binding?.kind === "selectAsset"
                                      ? (selectedNode.binding.assetByOption[
                                          option.value
                                        ] ?? "")
                                      : ""
                                  }
                                  onChange={(event) =>
                                    updateNode(selectedNode.id, (node) => {
                                      if (node.binding?.kind !== "selectAsset")
                                        return;
                                      node.binding.assetByOption[option.value] =
                                        event.currentTarget.value || null;
                                    })
                                  }
                                >
                                  <option value="">None</option>
                                  {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                      {asset.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}
                          </div>
                        );
                      })()}
                  </>
                )}
              </div>,
              "Dynamic",
            )}
          </>
        )}

        {isStudioTextNode(selectedNode) && (
          <>
            {renderInspectorSection(
              "typography",
              "Typography",
              <div className="grid gap-2">
                <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Font</span>
                  <select
                    className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                    value={selectedFontFamily}
                    onChange={(event) =>
                      updateSelectedNodeStyle(
                        "fontFamily",
                        event.currentTarget.value,
                      )
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
                  <NumberField
                    label="Size"
                    value={Number(styleRecord.fontSize ?? 16)}
                    onChange={(value) =>
                      updateSelectedNodeStyle("fontSize", value)
                    }
                  />
                  <FontWeightField
                    options={selectedFontWeightOptions}
                    value={styleRecord.fontWeight ?? 700}
                    onChange={(value) =>
                      updateSelectedNodeStyle("fontWeight", value)
                    }
                  />
                </div>
                <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
                  <span>Color</span>
                  <div className="flex h-8 items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2">
                    <input
                      className="h-4 w-4 cursor-pointer rounded border-0 bg-transparent p-0"
                      type="color"
                      value={String(styleRecord.color ?? "#111827")}
                      onChange={(event) =>
                        updateSelectedNodeStyle(
                          "color",
                          event.currentTarget.value,
                        )
                      }
                    />
                    <input
                      className="min-w-0 flex-1 bg-transparent text-xs font-medium uppercase tracking-[0.02em] text-[var(--fg)] outline-none"
                      value={String(styleRecord.color ?? "#111827")}
                      onChange={(event) =>
                        updateSelectedNodeStyle(
                          "color",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </div>
                </label>
              </div>,
            )}
          </>
        )}

        {isStudioImageNode(selectedNode) && (
          <div className="px-4 pb-4">
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
              <span>Fit</span>
              <select
                className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                value={selectedNode.fit ?? "cover"}
                onChange={(event) =>
                  updateNode(selectedNode.id, (node) => {
                    node.fit = event.currentTarget.value as
                      "cover" | "contain" | "fill";
                  })
                }
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </label>
          </div>
        )}
      </>
    );
  };

  return (
    <main
      className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
      style={themeStyle}
    >
      <div className="z-10 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3">
        <div className="flex min-w-[150px] items-center gap-2.5">
          <div className="h-[26px] w-[26px] shrink-0 rounded-[7px] bg-[linear-gradient(135deg,#7cc7ff,#c9a8ff_55%,#ff9fce)]" />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold text-[var(--fg)]">
              Template Studio
            </span>
            <span className="text-[11px] text-[var(--fg3)]">▾</span>
          </div>
        </div>

        <div className="hidden min-w-[260px] items-center gap-1.5 lg:flex">
          <select
            className="h-[30px] min-w-0 flex-1 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none transition focus:border-[var(--accent)]"
            title="Database template"
            value={remoteTemplateId ?? ""}
            onChange={(event) => {
              const nextTemplateId = event.currentTarget.value || null;
              setRemoteTemplateId(nextTemplateId);
              if (nextTemplateId) {
                showShortcutStatus("Database template selected");
              }
            }}
          >
            <option value="">New / unsaved</option>
            {remoteTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!remoteTemplateId || isRemoteSyncing}
            title={
              activeRemoteTemplate
                ? `Load ${activeRemoteTemplate.name}`
                : "Load database template"
            }
            type="button"
            onClick={() => {
              void loadRemoteTemplate();
            }}
          >
            <Cloud className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isRemoteSyncing}
            title="Save draft to database"
            type="button"
            onClick={() => {
              void saveDatabaseDraft();
            }}
          >
            <Save className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/15 text-blue-200 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={isRemoteSyncing}
            title="Publish database document"
            type="button"
            onClick={() => {
              void publishRemoteDocument();
            }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-3.5 text-xs text-[var(--fg2)] md:flex">
          <button
            className="rounded-md px-1.5 py-1 transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Open canvas settings"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            <b className="font-semibold text-[var(--fg)]">
              {previewCanvasSize.width}
            </b>{" "}
            ×{" "}
            <b className="font-semibold text-[var(--fg)]">
              {previewCanvasSize.height}
            </b>
          </button>
          <div className="ml-1 flex h-[30px] items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] p-0.5">
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
        </div>

        <div className="ml-auto flex min-w-[300px] items-center justify-end gap-2">
          <div className="flex h-[30px] items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-1">
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              title="Zoom out"
              type="button"
              onClick={() =>
                setScale((currentScale) =>
                  clampStudioPreviewScale(
                    Number((currentScale - 0.1).toFixed(2)),
                  ),
                )
              }
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-11 text-center text-xs font-semibold tracking-[0.01em] text-[var(--fg)]">
              {Math.round(scale * 100)}%
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
              title="Zoom in"
              type="button"
              onClick={() =>
                setScale((currentScale) =>
                  clampStudioPreviewScale(
                    Number((currentScale + 0.1).toFixed(2)),
                  ),
                )
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            className="h-[30px] rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-medium text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            type="button"
            onClick={() => setFitRequestKey((current) => current + 1)}
          >
            Fit
          </button>
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
          <button
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Template settings"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Open runtime preview"
            type="button"
            onClick={() => {
              void openRuntimeDraftPreview();
            }}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Preview
          </button>
          <div className="mx-0.5 h-[22px] w-px bg-[var(--border)]" />
          <button
            className="h-[30px] rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold tracking-[0.01em] text-white transition disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!remoteTemplateId}
            title="Open saved preview"
            type="button"
            onClick={openSavedPreview}
          >
            공유
          </button>
        </div>
      </div>

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
        onClose={() => setSettingsOpen(false)}
        onExportJson={exportStudioJson}
        onImportJson={() => jsonImportInputRef.current?.click()}
        onReloadTemplate={() => {
          void loadRemoteTemplate();
        }}
        onThemeChange={setTheme}
        onTimetableCanvasChange={updateTimetableCanvasSize}
        onWebFontsChange={updateWebFonts}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[260px] min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--panel)]">
          {activeWorkspaceMode === "cards" ? (
            <div className="grid gap-2 border-b border-[var(--border)] p-2">
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
                      const resolution = resolveStudioTimetableComponentVariant(
                        document,
                        cardEntryComponent,
                        status.id,
                      );
                      const rootNodeId = resolution?.variant.rootNodeId;
                      if (rootNodeId) {
                        setSelectedNodeId(rootNodeId);
                        setSelectedNodeIds([rootNodeId]);
                      }
                    }}
                  >
                    {status.label}
                  </button>
                ))}
              </div>

              {!selectedCardDirectVariant || selectedCardVariantIsShared ? (
                <div className="grid gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 p-2">
                  <div className="text-[10px] font-semibold leading-relaxed text-amber-200">
                    {!selectedCardDirectVariant
                      ? `Using ${selectedCardVariantResolution?.resolvedStatusId ?? "fallback"} layout`
                      : "This layout is shared with another status"}
                  </div>
                  <button
                    className="h-7 rounded-md border border-amber-300/30 bg-amber-300/10 px-2 text-[10px] font-bold text-amber-100 transition hover:bg-amber-300/20"
                    type="button"
                    onClick={createSelectedCardVariant}
                  >
                    {!selectedCardDirectVariant
                      ? "Create Variant"
                      : "Make Layout Unique"}
                  </button>
                </div>
              ) : null}

              {selectedCardStatusId === "multi" ? (
                <div className="rounded-md border border-fuchsia-400/25 bg-fuchsia-400/10 px-2 py-1.5 text-[10px] font-semibold leading-relaxed text-fuchsia-100">
                  Multi uses two authored Entry Groups inside the shared card
                  frame.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-0.5 px-2 pt-2">
            {(activeWorkspaceMode === "cards"
              ? [
                  { mode: "layers" as const, label: "Layers", Icon: Layers3 },
                  {
                    mode: "inputs" as const,
                    label: "Inputs",
                    Icon: ListChecks,
                  },
                  {
                    mode: "timetable" as const,
                    label: "Table",
                    Icon: CalendarDays,
                  },
                ]
              : [
                  { mode: "layers" as const, label: "Layers", Icon: Layers3 },
                  { mode: "presets" as const, label: "Presets", Icon: Plus },
                  {
                    mode: "inputs" as const,
                    label: "Inputs",
                    Icon: ListChecks,
                  },
                ]
            ).map(({ mode, label, Icon }) => (
              <button
                className={cn(
                  "flex h-[34px] flex-1 items-center justify-center gap-1 rounded-t-lg text-[12px] font-semibold transition",
                  activePanelMode === mode
                    ? "bg-[var(--field)] text-[var(--fg)]"
                    : "text-[var(--fg2)] hover:bg-[var(--hover)]",
                )}
                key={mode}
                type="button"
                onClick={() => setPanelMode(mode)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <div className="border-b border-[var(--border)]" />

          {activePanelMode === "layers" ? (
            activeWorkspaceMode === "timetable" ? (
              renderTimetableLayersPanel()
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="grid grid-cols-4 gap-1.5 px-3 py-3">
                  {(["group", "text", "flexibleText", "image"] as const).map(
                    (type) => (
                      <button
                        className="flex h-10 items-center justify-center rounded-[9px] border border-[var(--field-border)] bg-[var(--field)] text-xs font-bold text-[var(--fg2)] transition hover:border-[var(--accent)] hover:text-[var(--fg)]"
                        key={type}
                        title={`Add ${getNodeTypeLabel(type)}`}
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
                    ),
                  )}
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
                            ({
                              definition,
                              disabledReason,
                              existingTargetId,
                            }) => {
                              const canInsert =
                                (isStudioCardContextObjectPreset(definition) ||
                                  isStudioCardStatusBackgroundPreset(
                                    definition,
                                  ) ||
                                  isStudioCardSelectInputBundlePreset(
                                    definition,
                                  )) &&
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
                                    if (
                                      isStudioCardContextObjectPreset(
                                        definition,
                                      )
                                    ) {
                                      addCardContextObject(definition);
                                      return;
                                    }

                                    if (
                                      isStudioCardStatusBackgroundPreset(
                                        definition,
                                      )
                                    ) {
                                      addCardStatusBackgroundObject(definition);
                                      return;
                                    }

                                    if (
                                      isStudioCardSelectInputBundlePreset(
                                        definition,
                                      )
                                    ) {
                                      addCardSelectInputBundle(definition);
                                    }
                                  }}
                                >
                                  <span className="truncate">
                                    {definition.label}
                                  </span>
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
                <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pb-3">
                  <div className="grid min-w-0 max-w-full gap-0.5 overflow-hidden">
                    {getStudioLayerPanelOrder(cardAuthoringRootNodeIds).map(
                      (nodeId) => renderLayerTree(nodeId),
                    )}
                  </div>
                </div>
              </div>
            )
          ) : activePanelMode === "presets" ? (
            activeWorkspaceMode === "timetable" ? (
              renderTimetablePresetsPanel()
            ) : null
          ) : activePanelMode === "inputs" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
                    {getInputScopeLabel(scope)}
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
                    {getInputTypeLabel(type)}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {filteredInputs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--field-border)] bg-[var(--field)] px-3 py-4 text-center text-[12px] font-semibold text-[var(--fg3)]">
                    No {getInputScopeLabel(inputScopeFilter).toLowerCase()}{" "}
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
                      {input.label} · {getInputTypeLabel(input.type)}
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
          )}
        </aside>

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
                    const targetNodeIds = selectedNodeIdsRef.current.includes(
                      nodeId,
                    )
                      ? getStudioTopLevelNodeIds(
                          documentRef.current,
                          selectedNodeIdsRef.current,
                        )
                      : [nodeId];
                    const hasLockedTarget = targetNodeIds.some((targetNodeId) =>
                      isStudioNodeLocked(
                        documentRef.current.graph.nodes[targetNodeId],
                      ),
                    );

                    if (hasLockedTarget) {
                      showShortcutStatus("Selection includes locked object");
                      return false;
                    }

                    const hasFitTarget = targetNodeIds.some((targetNodeId) =>
                      isStudioFillParentLayout(
                        documentRef.current.graph.nodes[targetNodeId]
                          ?.layoutMode,
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
                      documentRef.current.domains?.timetable,
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
                    if (selectedNodeIdsRef.current.includes(nodeId)) {
                      return;
                    }

                    selectSingleNode(nodeId);
                    setNodePicker(null);
                  }
                : selectTimetableCanvasLayer
            }
          >
            {activeWorkspaceMode === "timetable" ? (
              <StudioTimetablePreview
                document={document}
                onSelectLayer={selectTimetableCanvasLayer}
                runtimeValues={runtimeValues}
                selectedLayerId={selectedTimetableLayerId}
                variantMode="authoring"
              />
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
              </div>
            )}
          </StudioCanvasViewport>

          {nodePicker ? (
            <StudioNodePickerMenu
              document={activeWorkspaceMode === "cards" ? document : undefined}
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

        <aside className="w-[280px] shrink-0 overflow-y-auto overflow-x-hidden border-l border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[var(--sel)] text-[11px] font-extrabold text-[var(--accent)]">
                {isInputPanelActive ? (
                  <ListChecks size={12} />
                ) : activeWorkspaceMode === "timetable" ? (
                  <CalendarDays size={12} />
                ) : selectedNode?.type === "image" ? (
                  <ImageIcon size={12} />
                ) : selectedNode?.type === "group" ? (
                  <Layers3 size={12} />
                ) : (
                  "T"
                )}
              </span>
              <span className="text-[12.5px] font-semibold text-[var(--fg)]">
                {isInputPanelActive
                  ? selectedInput
                    ? getInputTypeLabel(selectedInput.type)
                    : "Inputs"
                  : activeWorkspaceMode === "timetable"
                    ? "Timetable"
                    : selectedNode
                      ? getNodeTypeLabel(selectedNode.type)
                      : "Cards"}
              </span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
                {isInputPanelActive
                  ? selectedInput
                    ? "1 selected"
                    : `${filteredInputs.length} visible`
                  : activeWorkspaceMode === "timetable"
                    ? selectedTimetableLayerId
                      ? "1 selected"
                      : "Composition"
                    : `${selectedNodeIds.length} selected`}
              </span>
            </div>
            <div className="flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5">
              <SlidersHorizontal size={13} className="text-[var(--fg2)]" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold text-[var(--fg)] outline-none disabled:text-[var(--fg3)]"
                disabled={
                  isInputPanelActive
                    ? !selectedInput
                    : activeWorkspaceMode === "timetable"
                      ? !selectedTimetableCompositionObject
                      : !selectedNode
                }
                value={
                  isInputPanelActive
                    ? (selectedInput?.label ?? "No input selected")
                    : activeWorkspaceMode === "timetable"
                      ? selectedTimetableLayerLabel
                      : (selectedNode?.label ?? "No selection")
                }
                onChange={(event) => {
                  if (isInputPanelActive) {
                    if (!selectedInput) return;
                    updateInput(selectedInput.id, (input) => ({
                      ...input,
                      label: event.currentTarget.value,
                    }));
                    return;
                  }

                  if (activeWorkspaceMode === "timetable") {
                    if (!selectedTimetableCompositionObject) return;
                    updateTimetableCompositionObject(
                      selectedTimetableCompositionObject.id,
                      (object) => {
                        object.label = event.currentTarget.value;
                      },
                    );
                    return;
                  }

                  if (!selectedNode) return;
                  updateNode(selectedNode.id, (node) => {
                    node.label = event.currentTarget.value;
                  });
                }}
              />
            </div>
          </div>

          {isInputPanelActive ? (
            <>
              {renderInspectorSection(
                "input",
                "Input",
                renderInputInspector(selectedInput),
              )}
            </>
          ) : activeWorkspaceMode === "cards" ? (
            <>
              {renderNodeInspector()}

              {selectedNodeBuiltinField
                ? renderInspectorSection(
                    "input",
                    "Built-in Field",
                    <div className="grid gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-xs font-semibold text-[var(--fg2)]">
                      <div className="text-[var(--fg)]">
                        {selectedNodeBuiltinField.label}
                      </div>
                      <div>
                        {getInputScopeLabel(selectedNodeBuiltinField.scope)} ·{" "}
                        {selectedNodeBuiltinField.type}
                      </div>
                      <p className="leading-relaxed text-[var(--fg3)]">
                        Built-in fields come from timetable runtime data and are
                        not stored as template inputs.
                      </p>
                    </div>,
                  )
                : null}

              {selectedNodeBoundInput
                ? renderInspectorSection(
                    "input",
                    "Input",
                    renderInputInspector(selectedNodeBoundInput),
                  )
                : null}

              {selectedNodeBoundInput
                ? renderInspectorSection(
                    "runtime",
                    "Preview Inputs",
                    renderRuntimePreviewInputs(),
                  )
                : null}
            </>
          ) : (
            <>
              {selectedTimetableCompositionObject && selectedTimetableVariantSet
                ? renderInspectorSection(
                    "settings",
                    "Object State",
                    renderTimetableObjectVariantControls(
                      selectedTimetableCompositionObject,
                    ),
                  )
                : null}

              {selectedTimetableTextObject
                ? renderInspectorSection(
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
                              {getInputScopeLabel(
                                selectedTimetableBuiltinField.scope,
                              )}{" "}
                              · {selectedTimetableBuiltinField.type} ·{" "}
                              {selectedTimetableBuiltinField.id}
                            </span>
                          </div>
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
                        <TextField
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
                  )
                : null}

              {selectedTimetableBoundInput
                ? renderInspectorSection(
                    "runtime",
                    "Preview Inputs",
                    renderRuntimePreviewInputs(),
                  )
                : null}

              {isSelectedDayCardsObject
                ? renderInspectorSection(
                    "layout",
                    "Layout",
                    renderTimetableDayCardsLayoutControls(),
                  )
                : null}

              {selectedTimetableCompositionObject
                ? renderInspectorSection(
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
                    </div>,
                  )
                : null}

              {selectedTimetableLayerGeometry && selectedTimetableLayerId
                ? renderInspectorSection(
                    "position",
                    "Position",
                    <div className="grid gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <NumberField
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
                        <NumberField
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
                        {isPlacedTimetableCompositionObject(
                          selectedTimetableCompositionObject ?? undefined,
                        ) ? (
                          <>
                            <NumberField
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
                            <NumberField
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
                      {isPlacedTimetableCompositionObject(
                        selectedTimetableCompositionObject ?? undefined,
                      ) || isSelectedDayCardsObject ? (
                        <NumberField
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
                      isPlacedTimetableCompositionObject(
                        selectedTimetableCompositionObject,
                      ) ? (
                      <FitParentButton
                        active={isSelectedTimetableObjectFitParent}
                        onClick={() =>
                          toggleTimetableObjectFitParent(
                            selectedTimetableCompositionObject.id,
                          )
                        }
                      />
                    ) : undefined,
                  )
                : null}

              {selectedTimetableTextObject
                ? renderInspectorSection(
                    "typography",
                    "Typography",
                    renderTimetableTextTypographyControls(
                      selectedTimetableTextObject,
                    ),
                  )
                : null}

              {renderInspectorSection(
                "settings",
                "Settings",
                renderTimetableSettings(),
              )}

              {renderInspectorSection(
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
              )}
            </>
          )}

          {renderInspectorSection(
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
                    <p className="font-medium leading-relaxed">
                      {diagnostic.detail}
                    </p>
                  </div>
                ))}
              </div>
            ),
          )}
        </aside>
      </div>
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
    </main>
  );
}
