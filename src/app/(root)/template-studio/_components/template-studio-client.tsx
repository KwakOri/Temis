"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  Image as ImageIcon,
  Layers3,
  ListChecks,
  Lock,
  Minus,
  Moon,
  Plus,
  SlidersHorizontal,
  Sun,
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

import { cn } from "@/lib/utils";
import {
  StudioBuiltinFieldId,
  StudioGraphNode,
  StudioGraphNodeType,
  StudioInputDefinition,
  StudioInputId,
  StudioInputScope,
  StudioInputType,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayId,
  StudioTimetableDomain,
  StudioTimetableObjectPresetId,
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
  getStudioBuiltinField,
  STUDIO_BUILTIN_FIELDS,
} from "@/utils/template-studio/builtin-fields";
import {
  moveStudioGraphNodes,
  validateStudioGraphMove,
  type StudioGraphDropPosition,
} from "@/utils/template-studio/graph-editor";
import { createStudioId } from "@/utils/template-studio/id";
import {
  getStudioInputDefaultValue,
  getStudioInputsForScope,
  getStudioRuntimeInputValue,
  setStudioRuntimeInputValue,
  type StudioRuntimeContext,
} from "@/utils/template-studio/input-values";
import {
  createInitialStudioRuntimeValues,
  createSampleStudioDocument,
} from "@/utils/template-studio/sample-document";
import {
  createStudioTimetablePresetObject,
  ensureStudioTimetableComposition,
  getStudioTimetableComposition,
  getStudioTimetableCompositionObjectGeometry,
  getStudioTimetablePresetLabel,
  STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
} from "@/utils/template-studio/timetable-composition";
import {
  addStudioTimetableEntry,
  getStudioTimetableEntriesForDay,
  getStudioTimetableMaxEntriesPerDay,
  removeStudioTimetableEntry,
  setStudioTimetableEntryStatus,
} from "@/utils/template-studio/timetable-runtime";
import { validateStudioDocument } from "@/utils/template-studio/validator";

import {
  clampStudioPreviewScale,
  StudioCanvasViewport,
} from "./studio-canvas-viewport";
import { StudioNodePickerMenu } from "./studio-node-picker-menu";
import { StudioRenderer } from "./studio-renderer";
import {
  getStudioTimetableDayCardGeometry,
  getStudioTimetableDayCardsBounds,
  getStudioTimetableDayCardsLayout,
  getStudioTimetablePreviewSize,
  StudioTimetablePreview,
  STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
} from "./studio-timetable-preview";

type PanelMode = "layers" | "inputs" | "presets" | "timetable";
type WorkspaceMode = "cards" | "timetable";
type StudioTheme = "dark" | "light";
type InspectorSectionKey =
  | "position"
  | "layout"
  | "appearance"
  | "binding"
  | "typography"
  | "input"
  | "runtime"
  | "diagnostics";

interface NodePickerState {
  x: number;
  y: number;
  nodeIds: string[];
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
const STUDIO_DRAFT_STORAGE_KEY = "template-studio:draft:v1";

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

const STUDIO_TIMETABLE_PRESET_GROUPS: Array<{
  title: string;
  presets: Array<{
    id: StudioTimetableObjectPresetId;
    label: string;
    type: string;
  }>;
}> = [
  {
    title: "Text",
    presets: [
      {
        id: "weekDates",
        label: "Week Dates",
        type: "Label",
      },
      {
        id: "weeklyMemo",
        label: "Weekly Memo",
        type: "Label",
      },
    ],
  },
];

const getInputScopeLabel = (scope: StudioInputScope): string => {
  if (scope === "global") return "Global";
  if (scope === "day") return "Day";
  return "Entry";
};

const getTimetableRootDropPositionFromLayerPosition = (
  position: "before" | "after",
): "before" | "after" => (position === "before" ? "after" : "before");

const getStudioLayerDisplayNodeIds = (nodeIds: string[]): string[] =>
  [...nodeIds].reverse();

const getGraphDropPositionFromLayerPosition = (
  position: StudioGraphDropPosition,
): StudioGraphDropPosition => {
  if (position === "before") return "after";
  if (position === "after") return "before";
  return position;
};

const getStudioNodeBounds = (
  document: StudioTemplateDocument,
  nodeId: string,
) => {
  const node = document.graph.nodes[nodeId];
  const style = node?.styleId ? document.styles[node.styleId] : undefined;
  const left = typeof style?.left === "number" ? style.left : 0;
  const top = typeof style?.top === "number" ? style.top : 0;
  const width = typeof style?.width === "number" ? style.width : 0;
  const height = typeof style?.height === "number" ? style.height : 0;

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
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
}

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--fg2)]">
      <span>{label}</span>
      <input
        className="h-8 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg)] outline-none focus:border-[var(--accent)]"
        inputMode="decimal"
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.currentTarget.value || 0))}
      />
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

interface SectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}

function Section({ title, open, onToggle, badge, children }: SectionProps) {
  return (
    <section className="border-b border-[var(--border)]">
      <button
        className="flex w-full items-center gap-1.5 px-4 py-3 text-left transition hover:bg-[var(--hover)]"
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
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  );
}

export function TemplateStudioClient() {
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
    "input_a1",
  );
  const [panelMode, setPanelMode] = useState<PanelMode>("layers");
  const [theme, setTheme] = useState<StudioTheme>("dark");
  const [inspectorSections, setInspectorSections] = useState<
    Record<InspectorSectionKey, boolean>
  >(DEFAULT_INSPECTOR_SECTIONS);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("cards");
  const [inputScopeFilter, setInputScopeFilter] =
    useState<StudioInputScope>("global");
  const [scale, setScale] = useState(0.8);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
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
  const [selectedRuntimeDayId, setSelectedRuntimeDayId] = useState("mon");
  const [selectedRuntimeEntryIndex, setSelectedRuntimeEntryIndex] = useState(0);
  const pastSnapshotsRef = useRef<StudioEditorHistorySnapshot[]>([]);
  const futureSnapshotsRef = useRef<StudioEditorHistorySnapshot[]>([]);
  const isRestoringHistoryRef = useRef(false);
  const clipboardPayloadRef = useRef<StudioEditorClipboardPayload | null>(null);
  const layerDragStateRef = useRef<StudioLayerDragState | null>(null);
  const timetableLayerDragStateRef =
    useRef<StudioTimetableLayerDragState | null>(null);
  const documentRef = useRef(document);
  const runtimeValuesRef = useRef(runtimeValues);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const selectedNodeIdsRef = useRef<string[]>(selectedNodeIds);
  const selectedInputIdRef = useRef<StudioInputId | null>(selectedInputId);
  const selectedRuntimeDayIdRef = useRef(selectedRuntimeDayId);
  const selectedRuntimeEntryIndexRef = useRef(selectedRuntimeEntryIndex);

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
  const timetableComposition = useMemo(
    () => getStudioTimetableComposition(document.domains?.timetable),
    [document.domains?.timetable],
  );
  const selectedTimetableCompositionObject = selectedTimetableLayerId
    ? (timetableComposition.objects[selectedTimetableLayerId] ?? null)
    : null;
  const selectedTimetableTextObject =
    selectedTimetableCompositionObject?.kind === "text"
      ? selectedTimetableCompositionObject
      : null;
  const selectedTimetableTextValue =
    selectedTimetableTextObject?.binding?.kind === "staticText"
      ? selectedTimetableTextObject.binding.value
      : (selectedTimetableTextObject?.label ?? "");
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
  const maxRuntimeEntries = getStudioTimetableMaxEntriesPerDay(document);
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
  const selectedTimetableLayerGeometry = useMemo(() => {
    const timetable = document.domains?.timetable;
    if (!timetable || !selectedTimetableLayerId) return null;

    const layout = getStudioTimetableDayCardsLayout(timetable);
    const compositionObject =
      timetableComposition.objects[selectedTimetableLayerId];

    if (compositionObject?.kind === "text") {
      return getStudioTimetableCompositionObjectGeometry(compositionObject);
    }

    if (selectedTimetableLayerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
      return getStudioTimetableDayCardsBounds(
        layout,
        timetableDays,
        (dayId) =>
          getStudioTimetableEntriesForDay(document, runtimeValues, dayId)
            .length,
      );
    }

    if (!selectedTimetableLayerId.startsWith("day-card:")) return null;

    const dayId = selectedTimetableLayerId.replace(
      /^day-card:/,
      "",
    ) as StudioTimetableDayId;
    const dayIndex = timetableDays.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return null;

    return getStudioTimetableDayCardGeometry(
      layout,
      dayId,
      dayIndex,
      getStudioTimetableEntriesForDay(document, runtimeValues, dayId).length,
    );
  }, [
    document,
    runtimeValues,
    selectedTimetableLayerId,
    timetableComposition.objects,
    timetableDays,
  ]);
  const statusOptions = useMemo(
    () => Object.values(document.domains?.timetable?.statuses ?? {}),
    [document.domains],
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
  const inputConsumers = useMemo(() => {
    return Object.values(document.graph.nodes).reduce<Record<string, string[]>>(
      (acc, node) => {
        const inputId = getStudioBindingInputId(node.binding);
        if (!inputId) return acc;
        acc[inputId] = [...(acc[inputId] ?? []), node.label];
        return acc;
      },
      {},
    );
  }, [document.graph.nodes]);
  const diagnostics = useMemo(
    () => validateStudioDocument(document),
    [document],
  );
  const compatibleInputs = useMemo(() => {
    if (!selectedNode) return [];
    return inputs.filter((input) =>
      isStudioInputCompatibleWithNode(input, selectedNode),
    );
  }, [inputs, selectedNode]);
  const compatibleBuiltinFields = useMemo(() => {
    if (!selectedNode) return [];
    return STUDIO_BUILTIN_FIELDS.filter((field) =>
      isStudioBuiltinFieldCompatibleWithNode(field, selectedNode),
    );
  }, [selectedNode]);
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
      applyNodeSelection(nodeId ? [nodeId] : [], nodeId);
    },
    [applyNodeSelection],
  );

  const toggleNodeSelection = useCallback(
    (nodeId: string) => {
      const currentNodeIds = selectedNodeIdsRef.current;
      const nextNodeIds = currentNodeIds.includes(nodeId)
        ? currentNodeIds.filter((selectedId) => selectedId !== nodeId)
        : [...currentNodeIds, nodeId];

      applyNodeSelection(nextNodeIds, nodeId);
    },
    [applyNodeSelection],
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

  const saveStudioDraft = useCallback(() => {
    try {
      window.localStorage.setItem(
        STUDIO_DRAFT_STORAGE_KEY,
        JSON.stringify({
          document: documentRef.current,
          runtimeValues: runtimeValuesRef.current,
          savedAt: new Date().toISOString(),
        }),
      );
      showShortcutStatus("Draft saved");
    } catch {
      showShortcutStatus("Draft save failed");
    }
  }, [showShortcutStatus]);

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
      setStudioRuntimeInputValue(
        document,
        currentValues,
        input.id,
        getStudioInputDefaultValue(input),
      ),
    );
    setSelectedInputId(inputId);
    setPanelMode("inputs");
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

  const addTimetablePresetObject = useCallback(
    (presetId: StudioTimetableObjectPresetId) => {
      let insertedObjectId: string | null = null;

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = createStudioTimetablePresetObject(presetId, composition);

        composition.objects[object.id] = object;
        composition.rootObjectIds.push(object.id);
        insertedObjectId = object.id;
      });

      if (!insertedObjectId) {
        showShortcutStatus("Timetable is not available");
        return;
      }

      setSelectedTimetableLayerId(insertedObjectId);
      setPanelMode("layers");
      showShortcutStatus(`Added ${getStudioTimetablePresetLabel(presetId)}`);
    },
    [showShortcutStatus, updateDocument],
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
      nextPosition: { left?: number; top?: number },
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

        if (object?.kind === "text") {
          const currentGeometry =
            getStudioTimetableCompositionObjectGeometry(object);

          object.style = {
            ...object.style,
            left: Number(
              (nextPosition.left ?? currentGeometry.left).toFixed(2),
            ),
            top: Number((nextPosition.top ?? currentGeometry.top).toFixed(2)),
          };
          return;
        }

        if (layerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID) {
          layout.left = Number((nextPosition.left ?? layout.left).toFixed(2));
          layout.top = Number((nextPosition.top ?? layout.top).toFixed(2));
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
        const baseLeft =
          layout.left + dayIndex * (layout.dayWidth + layout.dayGap);
        const baseTop = layout.top;
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

          if (object?.kind === "text") {
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
    timetableLayerDragStateRef.current = null;
    setTimetableLayerDragState(null);
    setTimetableLayerDropState(null);
  }, []);

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

  const handleTimetableLayerDragOver = (
    event: React.DragEvent<HTMLButtonElement>,
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
    let blockedReason: string | null = null;

    if (dragState.scope === "root") {
      if (dayId) {
        blockedReason = "Cannot move root layer into day cards";
      } else if (dragState.layerId === layerId) {
        blockedReason = "Already here";
      }
    } else if (!dayId) {
      blockedReason = "Cannot move day card outside its group";
    } else if (dragState.dayId === dayId) {
      blockedReason = "Already here";
    }

    event.dataTransfer.dropEffect = blockedReason ? "none" : "move";
    setTimetableLayerDropState({
      layerId,
      position,
      blockedReason,
    });
  };

  const handleTimetableLayerDrop = (
    event: React.DragEvent<HTMLButtonElement>,
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
        getTimetableRootDropPositionFromLayerPosition(dropState.position),
      );
      return;
    }

    if (!dragState.dayId || !targetDayId || dragState.dayId === targetDayId) {
      return;
    }

    moveTimetableDayLayer(dragState.dayId, targetDayId, dropState.position);
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
        if (!event.repeat) saveStudioDraft();
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
        if (!event.repeat) deleteSelectedNode();
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
    deleteSelectedNode,
    duplicateSelectedNode,
    groupSelectedNodes,
    moveSelectedNodeLayer,
    nodePicker,
    nudgeSelectedNode,
    pasteClipboardNode,
    redoEditorState,
    saveStudioDraft,
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
  ) => (
    <Section
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
        position: getGraphDropPositionFromLayerPosition(position),
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

      return validation;
    },
    [],
  );

  const clearLayerDragState = useCallback(() => {
    layerDragStateRef.current = null;
    setLayerDropState(null);
  }, []);

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

      event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
      setLayerDropState({
        nodeId: targetNodeId,
        position,
        blockedReason: validation.ok ? null : validation.reason,
      });
    },
    [getLayerDropValidation],
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
      const graphPosition = getGraphDropPositionFromLayerPosition(position);
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
      event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
      setLayerDropState({
        nodeId: targetNodeId,
        position,
        blockedReason: validation.ok ? null : validation.reason,
      });
    },
    [getLayerDropValidation],
  );

  const renderLayerDropIndicator = (
    nodeId: string,
    depth: number,
    position: "before" | "after",
  ) => {
    const isActive =
      layerDropState?.nodeId === nodeId && layerDropState.position === position;
    if (!isActive) return null;

    return (
      <div
        className={cn(
          "my-0.5 h-0.5 rounded-full",
          layerDropState.blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
        )}
        style={{ marginLeft: 10 + depth * 20 }}
        onDragOver={(event) =>
          handleLayerIndicatorDragOver(event, nodeId, position)
        }
        onDrop={(event) => handleLayerDrop(event, nodeId)}
      />
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
          style={{ marginLeft: 10 + depth * 20 }}
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
      <div key={node.id}>
        {renderLayerDropIndicator(node.id, depth, "before")}
        <button
          className={cn(
            "flex h-[34px] w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors",
            node.locked
              ? "cursor-default"
              : "cursor-grab active:cursor-grabbing",
            selectedNodeIdsSet.has(node.id)
              ? "bg-[var(--sel)] font-semibold text-[var(--fg)]"
              : "text-[var(--fg2)] hover:bg-[var(--hover)]",
            isInsideDropActive &&
              (activeDropState?.blockedReason
                ? "outline outline-1 outline-rose-400/80"
                : "outline outline-1 outline-[var(--accent)]"),
            isCutLayerNode && "opacity-[0.45]",
          )}
          style={{ paddingLeft: 10 + depth * 20 }}
          type="button"
          title={activeDropState?.blockedReason ?? undefined}
          draggable={!node.locked}
          onDragEnd={clearLayerDragState}
          onDragOver={(event) => handleLayerDragOver(event, node.id)}
          onDragStart={(event) => handleLayerDragStart(event, node.id)}
          onDrop={(event) => handleLayerDrop(event, node.id)}
          onClick={(event) => {
            if (event.shiftKey || event.metaKey || event.ctrlKey) {
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
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {node.locked ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
          ) : null}
          <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
            {getNodeTypeLabel(node.type)}
          </span>
        </button>
        {renderLayerDropIndicator(node.id, depth, "after")}
        {!isLayerGroupCollapsed
          ? getStudioLayerDisplayNodeIds(node.childIds).map((childId) =>
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
          "flex h-[34px] w-full items-center gap-2 rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors",
          disabled
            ? "cursor-not-allowed opacity-45"
            : draggable
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-default",
          !disabled &&
            (isSelected
              ? "bg-[var(--sel)] font-semibold text-[var(--fg)]"
              : "text-[var(--fg2)] hover:bg-[var(--hover)]"),
          blockedReason && "outline outline-1 outline-rose-400/80",
        )}
        disabled={disabled}
        draggable={draggable && !disabled}
        key={id}
        style={{ paddingLeft: 10 + depth * 20 }}
        title={blockedReason ?? undefined}
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
          ) : (
            <Type size={14} />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
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
  ) => {
    const isActive =
      timetableLayerDropState?.layerId === layerId &&
      timetableLayerDropState.position === position;
    if (!isActive) return null;

    return (
      <div
        className={cn(
          "my-0.5 h-0.5 rounded-full",
          timetableLayerDropState?.blockedReason
            ? "bg-rose-400"
            : "bg-[var(--accent)]",
        )}
        key={`${layerId}:${position}:drop`}
        style={{ marginLeft: 10 + depth * 20 }}
      />
    );
  };

  const renderTimetableLayersPanel = () => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          Timetable Layers
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          {timetableComposition.rootObjectIds.length} placed objects
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="grid gap-0.5">
          {getStudioLayerDisplayNodeIds(timetableComposition.rootObjectIds).map(
            (objectId) => {
              const object = timetableComposition.objects[objectId];
              if (!object) return null;

              const blockedReason =
                timetableLayerDropState?.layerId === objectId
                  ? timetableLayerDropState.blockedReason
                  : null;

              if (object.kind === "generatedDayCards") {
                const isCollapsed = collapsedTimetableLayerIdsSet.has(
                  object.id,
                );

                return (
                  <React.Fragment key={object.id}>
                    {renderTimetableDropIndicator(object.id, 0, "before")}
                    {renderTimetableLayerRow({
                      id: object.id,
                      label: object.label,
                      type: "group",
                      collapsible: true,
                      collapsed: isCollapsed,
                      draggable: true,
                      blockedReason,
                      onDragEnd: clearTimetableLayerDragState,
                      onDragOver: (event) =>
                        handleTimetableLayerDragOver(event, object.id),
                      onDragStart: (event) =>
                        handleTimetableLayerDragStart(event, object.id),
                      onDrop: (event) =>
                        handleTimetableLayerDrop(event, object.id),
                      onToggleCollapsed: () =>
                        toggleTimetableLayerCollapsed(object.id),
                    })}
                    {!isCollapsed
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
                                1,
                                "before",
                              )}
                              {renderTimetableLayerRow({
                                id: layerId,
                                label: `${day.shortLabel ?? day.label} Card`,
                                type: "day",
                                depth: 1,
                                draggable: true,
                                blockedReason: dayBlockedReason,
                                onDragEnd: clearTimetableLayerDragState,
                                onDragOver: (event) =>
                                  handleTimetableLayerDragOver(
                                    event,
                                    layerId,
                                    day.id,
                                  ),
                                onDragStart: (event) =>
                                  handleTimetableLayerDragStart(
                                    event,
                                    layerId,
                                    day.id,
                                  ),
                                onDrop: (event) =>
                                  handleTimetableLayerDrop(
                                    event,
                                    layerId,
                                    day.id,
                                  ),
                                onSelect: () => {
                                  setSelectedRuntimeDayId(day.id);
                                  setSelectedRuntimeEntryIndex(0);
                                },
                              })}
                              {renderTimetableDropIndicator(
                                layerId,
                                1,
                                "after",
                              )}
                            </React.Fragment>
                          );
                        })
                      : null}
                    {renderTimetableDropIndicator(object.id, 0, "after")}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={object.id}>
                  {renderTimetableDropIndicator(object.id, 0, "before")}
                  {renderTimetableLayerRow({
                    id: object.id,
                    label: object.label,
                    type: "text",
                    draggable: true,
                    blockedReason,
                    onDragEnd: clearTimetableLayerDragState,
                    onDragOver: (event) =>
                      handleTimetableLayerDragOver(event, object.id),
                    onDragStart: (event) =>
                      handleTimetableLayerDragStart(event, object.id),
                    onDrop: (event) =>
                      handleTimetableLayerDrop(event, object.id),
                  })}
                  {renderTimetableDropIndicator(object.id, 0, "after")}
                </React.Fragment>
              );
            },
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
          {STUDIO_TIMETABLE_PRESET_GROUPS.reduce(
            (count, group) => count + group.presets.length,
            0,
          )}{" "}
          available
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="grid gap-4">
          {STUDIO_TIMETABLE_PRESET_GROUPS.map((group) => (
            <section className="grid gap-1.5" key={group.title}>
              <div className="px-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--fg3)]">
                {group.title}
              </div>
              {group.presets.map((preset) => (
                <button
                  className="flex min-h-12 w-full items-center gap-2 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 py-2 text-left transition hover:border-[var(--accent)] hover:bg-[var(--hover)]"
                  key={preset.id}
                  type="button"
                  onClick={() => addTimetablePresetObject(preset.id)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--sel)] text-[var(--accent)]">
                    <Type size={15} />
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-[12px] font-bold text-[var(--fg)]">
                      {preset.label}
                    </span>
                    <span className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
                      {preset.type}
                    </span>
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--fg2)]" />
                </button>
              ))}
            </section>
          ))}
        </div>
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
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                  updateRuntimeInputValue(
                    input,
                    String(reader.result ?? ""),
                    context,
                  );
                };
                reader.readAsDataURL(file);
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

  const renderTimetablePanel = () => {
    const timetable = document.domains?.timetable;

    if (!timetable) {
      return (
        <div className="p-4 text-sm font-medium text-[var(--fg2)]">
          No timetable domain
        </div>
      );
    }

    const canAddEntry = activeRuntimeEntries.length < maxRuntimeEntries;

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
              title="Add entry"
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
                      updateInput(input.id, (currentInput) =>
                        currentInput.type === "select"
                          ? {
                              ...currentInput,
                              options: currentInput.options.map(
                                (currentOption, index) =>
                                  index === optionIndex
                                    ? {
                                        ...currentOption,
                                        label: event.currentTarget.value,
                                      }
                                    : currentOption,
                              ),
                            }
                          : currentInput,
                      )
                    }
                  />
                  <input
                    className="h-9 rounded border border-[#303848] bg-[#111827] px-2 text-sm text-[#e5eefc] outline-none focus:border-[#4f8cff]"
                    value={option.value}
                    onChange={(event) =>
                      updateInput(input.id, (currentInput) =>
                        currentInput.type === "select"
                          ? {
                              ...currentInput,
                              options: currentInput.options.map(
                                (currentOption, index) =>
                                  index === optionIndex
                                    ? {
                                        ...currentOption,
                                        value: event.currentTarget.value,
                                      }
                                    : currentOption,
                              ),
                            }
                          : currentInput,
                      )
                    }
                  />
                  <button
                    className="h-9 rounded border border-[#303848] px-3 text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230] disabled:opacity-40"
                    disabled={input.options.length <= 1}
                    type="button"
                    onClick={() =>
                      updateInput(input.id, (currentInput) =>
                        currentInput.type === "select"
                          ? {
                              ...currentInput,
                              options: currentInput.options.filter(
                                (_, index) => index !== optionIndex,
                              ),
                            }
                          : currentInput,
                      )
                    }
                  >
                    Del
                  </button>
                </div>
              ))}
              <button
                className="inline-flex h-9 items-center justify-center gap-2 rounded border border-[#303848] bg-[#111827] text-xs font-bold text-[#c8d6f2] transition-colors hover:bg-[#1a2230]"
                type="button"
                onClick={() =>
                  updateInput(input.id, (currentInput) =>
                    currentInput.type === "select"
                      ? {
                          ...currentInput,
                          options: [
                            ...currentInput.options,
                            {
                              label: `Option ${currentInput.options.length + 1}`,
                              value: `option-${currentInput.options.length + 1}`,
                            },
                          ],
                        }
                      : currentInput,
                  )
                }
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
                <div
                  className="rounded bg-[#182131] px-2 py-1 text-xs font-bold text-[#c8d6f2]"
                  key={consumer}
                >
                  {consumer}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-medium text-[#8fa6cf]">No consumers</p>
          )}
        </div>
      </div>
    );
  };

  const renderNodeInspector = () => {
    if (!selectedNode) {
      return (
        <p className="p-4 text-sm font-medium text-[var(--fg2)]">
          Select an object from the canvas or layer tree.
        </p>
      );
    }

    const styleRecord = selectedNode.styleId
      ? (document.styles[selectedNode.styleId] ?? {})
      : {};
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
    const opacityRaw = Number(styleRecord.opacity ?? 1);
    const opacityPercent =
      opacityRaw <= 1 ? Math.round(opacityRaw * 100) : opacityRaw;
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
                label="X"
                value={Number(styleRecord.left ?? 0)}
                onChange={(value) => updateSelectedNodeStyle("left", value)}
              />
              <NumberField
                label="Y"
                value={Number(styleRecord.top ?? 0)}
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
        )}

        {renderInspectorSection(
          "layout",
          "Layout",
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <NumberField
              label="W"
              value={Number(styleRecord.width ?? 0)}
              onChange={(value) => updateSelectedNodeStyle("width", value)}
            />
            <NumberField
              label="H"
              value={Number(styleRecord.height ?? 0)}
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
                        {compatibleBuiltinFields.length > 0 ? (
                          <optgroup label="Built-in Fields">
                            {compatibleBuiltinFields.map((field) => (
                              <option
                                key={field.id}
                                value={`builtin:${field.id}`}
                              >
                                {field.label} ·{" "}
                                {getInputScopeLabel(field.scope)}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {compatibleInputs.length > 0 ? (
                          <optgroup label="Template Inputs">
                            {compatibleInputs.map((input) => (
                              <option
                                key={input.id}
                                value={`input:${input.id}`}
                              >
                                {input.label} · {getInputTypeLabel(input.type)}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                    </label>

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
                    value={String(styleRecord.fontFamily ?? "Inter")}
                    onChange={(event) =>
                      updateSelectedNodeStyle(
                        "fontFamily",
                        event.currentTarget.value,
                      )
                    }
                  >
                    <option value="Inter">Inter</option>
                    <option value="Pretendard">Pretendard</option>
                    <option value="SF Pro">SF Pro</option>
                    <option value="Roboto">Roboto</option>
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
                  <NumberField
                    label="Weight"
                    value={Number(styleRecord.fontWeight ?? 700)}
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
        <div className="flex min-w-[220px] items-center gap-2.5">
          <div className="h-[26px] w-[26px] shrink-0 rounded-[7px] bg-[linear-gradient(135deg,#7cc7ff,#c9a8ff_55%,#ff9fce)]" />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[13px] font-semibold text-[var(--fg)]">
              Template Studio
            </span>
            <span className="text-[11px] text-[var(--fg3)]">▾</span>
            <span className="text-xs text-[var(--fg2)]">Milestone&nbsp;A</span>
          </div>
          <span className="rounded-[5px] border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-emerald-300">
            Local
          </span>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-3.5 text-xs text-[var(--fg2)] md:flex">
          <span>
            <b className="font-semibold text-[var(--fg)]">
              {previewCanvasSize.width}
            </b>{" "}
            ×{" "}
            <b className="font-semibold text-[var(--fg)]">
              {previewCanvasSize.height}
            </b>
          </span>
          <span className="opacity-40">·</span>
          <span>{activeObjectCount} objects</span>
          <span className="opacity-40">·</span>
          <span>{inputs.length} inputs</span>
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

        <div className="ml-auto flex min-w-[220px] items-center justify-end gap-2">
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
          <button
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Toggle theme"
            type="button"
            onClick={() =>
              setTheme((currentTheme) =>
                currentTheme === "dark" ? "light" : "dark",
              )
            }
          >
            {theme === "dark" ? (
              <Moon className="h-3.5 w-3.5" />
            ) : (
              <Sun className="h-3.5 w-3.5" />
            )}
          </button>
          <div className="mx-0.5 h-[22px] w-px bg-[var(--border)]" />
          <button
            className="h-[30px] rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold tracking-[0.01em] text-white"
            type="button"
          >
            공유
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
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
                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                  <div className="grid gap-0.5">
                    {getStudioLayerDisplayNodeIds(
                      document.graph.rootNodeIds,
                    ).map((nodeId) => renderLayerTree(nodeId))}
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

                    selectTimetableCanvasLayer(layerId);
                    captureHistory();
                    return true;
                  }
            }
            onOpenNodePicker={
              activeWorkspaceMode === "cards"
                ? ({ clientX, clientY, nodeIds }) => {
                    if (nodeIds.length === 0) {
                      setNodePicker(null);
                      return;
                    }

                    setNodePicker({
                      x: clientX,
                      y: clientY,
                      nodeIds,
                    });
                  }
                : undefined
            }
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
              />
            ) : (
              <StudioRenderer
                document={document}
                runtimeValues={runtimeValues}
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
            )}
          </StudioCanvasViewport>

          {nodePicker && activeWorkspaceMode === "cards" ? (
            <StudioNodePickerMenu
              document={document}
              nodeIds={nodePicker.nodeIds}
              position={{ x: nodePicker.x, y: nodePicker.y }}
              selectedNodeId={selectedNodeId}
              onClose={() => setNodePicker(null)}
              onSelectNode={(nodeId) => {
                selectSingleNode(nodeId);
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
              {selectedTimetableTextObject
                ? renderInspectorSection(
                    "input",
                    "Text",
                    <div className="grid gap-2">
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
                        <div className="grid gap-1.5">
                          <span>W</span>
                          <div className="flex h-8 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg3)]">
                            {Math.round(selectedTimetableLayerGeometry.width)}
                          </div>
                        </div>
                        <div className="grid gap-1.5">
                          <span>H</span>
                          <div className="flex h-8 items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2 text-xs font-medium text-[var(--fg3)]">
                            {Math.round(selectedTimetableLayerGeometry.height)}
                          </div>
                        </div>
                      </div>
                    </div>,
                  )
                : null}

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
    </main>
  );
}
