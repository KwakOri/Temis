export type StudioNodeId = string;
export type StudioInputId = string;
export type StudioStyleId = string;
export type StudioAssetId = string;
export type StudioTimetableDayId = string;
export type StudioTimetableStatusId = string;
export type StudioTimetableComponentId = string;
export type StudioTimetableCompositionObjectId = string;
export type StudioBuiltinFieldId =
  | "day.label"
  | "day.short_label"
  | "day.is_offline"
  | "entry.main_title"
  | "entry.sub_title"
  | "entry.status"
  | "entry.status_label"
  | "entry.is_offline";

export type StudioInputScope = "global" | "day" | "entry";
export type StudioInputType = "text" | "image" | "select";
export type StudioBuiltinFieldType = "text" | "boolean" | "status";
export type StudioGraphNodeType = "group" | "text" | "image" | "flexibleText";
export type StudioTimetableBaseStatus = "online" | "offline";
export type StudioTimetableStatusKind = "base" | "derived";
export type StudioTimetableCompositionObjectKind = "generatedDayCards" | "text";
export type StudioTimetableObjectPresetId =
  "dayCards" | "weekDates" | "weeklyMemo";

export interface StudioCanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface StudioSemanticMeta {
  type?: string;
  role?: string;
  contractId?: string;
}

export interface StudioGraphNodeMeta {
  semantic?: StudioSemanticMeta;
}

export type StudioBinding =
  | { kind: "staticText"; value: string }
  | { kind: "inputText"; inputId: StudioInputId }
  | { kind: "builtinField"; fieldId: StudioBuiltinFieldId }
  | { kind: "staticAsset"; assetId: StudioAssetId }
  | { kind: "inputImage"; inputId: StudioInputId }
  | {
      kind: "selectText";
      inputId: StudioInputId;
      output: "value" | "label";
    }
  | {
      kind: "selectAsset";
      inputId: StudioInputId;
      assetByOption: Record<string, StudioAssetId | null>;
    };

export interface StudioGraphNode {
  id: StudioNodeId;
  type: StudioGraphNodeType;
  label: string;
  parentId: StudioNodeId | null;
  childIds: StudioNodeId[];
  styleId?: StudioStyleId;
  binding?: StudioBinding;
  fit?: "cover" | "contain" | "fill";
  locked?: boolean;
  meta?: StudioGraphNodeMeta;
}

export interface StudioNodeGraph {
  rootNodeIds: StudioNodeId[];
  nodes: Record<StudioNodeId, StudioGraphNode>;
}

export interface StudioInputBase {
  id: StudioInputId;
  type: StudioInputType;
  scope: StudioInputScope;
  label: string;
  description?: string;
  required?: boolean;
}

export interface StudioBuiltinFieldDefinition {
  id: StudioBuiltinFieldId;
  type: StudioBuiltinFieldType;
  scope: StudioInputScope;
  label: string;
  description?: string;
}

export interface StudioTextInputDefinition extends StudioInputBase {
  type: "text";
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
}

export interface StudioImageInputDefinition extends StudioInputBase {
  type: "image";
  defaultUrl?: string;
  placeholder?: string;
}

export interface StudioSelectOption {
  value: string;
  label: string;
}

export interface StudioSelectInputDefinition extends StudioInputBase {
  type: "select";
  defaultValue?: string;
  options: StudioSelectOption[];
}

export type StudioInputDefinition =
  | StudioTextInputDefinition
  | StudioImageInputDefinition
  | StudioSelectInputDefinition;

export type StudioStyleRecord = Record<string, string | number | undefined>;
export type StudioStyleMap = Record<StudioStyleId, StudioStyleRecord>;

export interface StudioAsset {
  id: StudioAssetId;
  label: string;
  src: string;
}

export type StudioAssetMap = Record<StudioAssetId, StudioAsset>;

export interface StudioTimetableDayDefinition {
  id: StudioTimetableDayId;
  label: string;
  shortLabel?: string;
  order: number;
}

export interface StudioTimetableStatusDefinition {
  id: StudioTimetableStatusId;
  label: string;
  kind: StudioTimetableStatusKind;
  baseStatus: StudioTimetableBaseStatus;
  fallbackStatusId?: StudioTimetableStatusId;
}

export interface StudioTimetableComponentVariant {
  statusId: StudioTimetableStatusId;
  rootNodeId: StudioNodeId;
}

export interface StudioTimetableComponentDefinition {
  id: StudioTimetableComponentId;
  label: string;
  defaultStatusId: StudioTimetableStatusId;
  variants: Record<StudioTimetableStatusId, StudioTimetableComponentVariant>;
}

export interface StudioTimetableCanvasConfig {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface StudioTimetableDayCardOffset {
  left: number;
  top: number;
}

export interface StudioTimetableDayCardsLayout {
  left: number;
  top: number;
  dayWidth: number;
  dayGap: number;
  padding: number;
  headerHeight: number;
  entryPreviewWidth: number;
  entryPreviewHeight: number;
  entryGap: number;
  dayOffsets?: Record<StudioTimetableDayId, StudioTimetableDayCardOffset>;
}

export interface StudioTimetableCompositionObject {
  id: StudioTimetableCompositionObjectId;
  kind: StudioTimetableCompositionObjectKind;
  label: string;
  presetId?: StudioTimetableObjectPresetId;
  style: StudioStyleRecord;
  binding?: StudioBinding;
  locked?: boolean;
}

export interface StudioTimetableComposition {
  rootObjectIds: StudioTimetableCompositionObjectId[];
  objects: Record<
    StudioTimetableCompositionObjectId,
    StudioTimetableCompositionObject
  >;
}

export interface StudioTimetableDomain {
  version: 1;
  canvas?: StudioTimetableCanvasConfig;
  mountNodeId: StudioNodeId;
  dayIds: StudioTimetableDayId[];
  days: Record<StudioTimetableDayId, StudioTimetableDayDefinition>;
  dayCardsLayout?: StudioTimetableDayCardsLayout;
  composition?: StudioTimetableComposition;
  statuses: Record<StudioTimetableStatusId, StudioTimetableStatusDefinition>;
  components: Record<
    StudioTimetableComponentId,
    StudioTimetableComponentDefinition
  >;
  entryComponentId: StudioTimetableComponentId;
  defaultEntryStatusId: StudioTimetableStatusId;
  maxEntriesPerDay?: number;
}

export interface StudioTimetableRuntimeEntry {
  id: string;
  statusId: StudioTimetableStatusId;
  mainTitle?: string;
  subTitle?: string;
}

export interface StudioTimetableRuntimeValues {
  entriesByDay: Record<StudioTimetableDayId, StudioTimetableRuntimeEntry[]>;
}

export interface StudioTemplateDomains {
  timetable?: StudioTimetableDomain;
}

export interface StudioTemplateDocument {
  schema: "studio_template_document";
  version: 1;
  metadata: {
    editor: "template-studio";
    name: string;
    description?: string;
  };
  canvas: StudioCanvasConfig;
  graph: StudioNodeGraph;
  inputs: Record<StudioInputId, StudioInputDefinition>;
  styles: StudioStyleMap;
  assets: StudioAssetMap;
  domains?: StudioTemplateDomains;
}

export interface StudioRuntimeValues {
  global: Record<StudioInputId, string>;
  days: Record<StudioTimetableDayId, Record<StudioInputId, string>>;
  entries: Record<StudioTimetableDayId, Array<Record<StudioInputId, string>>>;
  timetable: StudioTimetableRuntimeValues;
}

export type StudioDiagnosticSeverity = "error" | "warning";

export interface StudioDiagnostic {
  id: string;
  severity: StudioDiagnosticSeverity;
  title: string;
  detail: string;
}
