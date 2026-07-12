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
  | "day.date"
  | "day.offline_memo"
  | "day.is_offline"
  | "week.date_range"
  | "week.start_date"
  | "week.end_date"
  | "entry.main_title"
  | "entry.sub_title"
  | "entry.time"
  | "entry.status"
  | "entry.status_label"
  | "entry.is_offline"
  | "entry.is_multi"
  | "entry.is_offline_memo";

export type StudioInputScope = "global" | "day" | "entry";
export type StudioInputType = "text" | "image" | "select";
export type StudioBuiltinFieldType = "text" | "boolean" | "status";
export type StudioGraphNodeType = "group" | "text" | "image" | "flexibleText";
export type StudioObjectLayoutMode = "fixed" | "fillParent";
export type StudioImageFit = "cover" | "contain" | "fill";
export type StudioTimetableBaseStatus = "online" | "offline";
export type StudioTimetableStatusKind = "base" | "derived";
export type StudioTimetableCapabilityKey = "multi" | "offlineMemo";
export type StudioTimetableCompositionObjectKind =
  | "generatedDayCards"
  | "group"
  | "image"
  | "text"
  | "flexibleText"
  | "profileBlock"
  | "topObject";
export type StudioTimetableProfileObjectRole =
  "backPlate" | "userImage" | "frame";
export type StudioTimetableStructuredObjectRole = "background" | "text";
export type StudioTimetableObjectPresetId =
  | "dayCards"
  | "weekDates"
  | "weeklyMemo"
  | "profileBlock"
  | "artistProfileText"
  | "topObject";
export type StudioSemanticPresetScope = "cards" | "timetable";
export type StudioSemanticKey =
  | "dayCardContainers"
  | "weekDates"
  | "weeklyMemo"
  | "profileBlock"
  | "artistProfileText"
  | "topObject"
  | "dayLabel"
  | "dayDate"
  | "entryStatusLabel"
  | "statusCardBackground";

export interface StudioCanvasConfig {
  width: number;
  height: number;
  background: string;
}

export interface StudioWebFontSource {
  id: string;
  label: string;
  cssText: string;
  enabled: boolean;
}

export interface StudioTemplateResources {
  webFonts?: StudioWebFontSource[];
}

export interface StudioSemanticMeta {
  type?: string;
  role?: string;
  contractId?: string;
}

export interface StudioExceptionObjectMeta {
  semanticKey: StudioSemanticKey;
  scope: StudioSemanticPresetScope;
  presetId: string;
  lockedStructure: boolean;
  singleton?: boolean;
  editableSlots?: Record<string, unknown>;
  builtInBindings?: Record<string, StudioBuiltinFieldId>;
  capabilityFlags?: StudioTimetableCapabilityKey[];
}

export interface StudioGraphNodeMeta {
  semantic?: StudioSemanticMeta;
  exception?: StudioExceptionObjectMeta;
  entrySlot?: StudioEntrySlotMeta;
  variantSyncKey?: string;
}

export interface StudioEntrySlotMeta {
  index: 0 | 1;
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
  layoutMode?: StudioObjectLayoutMode;
  styleId?: StudioStyleId;
  binding?: StudioBinding;
  assetSlots?: Record<string, StudioTimetableAssetSlot>;
  fit?: StudioImageFit;
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
  capabilityFlags?: StudioTimetableCapabilityKey[];
}

export interface StudioTextInputDefinition extends StudioInputBase {
  type: "text";
  placeholder?: string;
  defaultValue?: string;
  maxLength?: number;
  multiline?: boolean;
  minRows?: number;
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
  storageProvider?: string;
  storagePath?: string;
  publicUrl?: string;
  contentHash?: string;
  mimeType?: string;
  byteSize?: number;
  lastSyncedAt?: string;
}

export type StudioAssetMap = Record<StudioAssetId, StudioAsset>;

export interface StudioTimetableDayDefinition {
  id: StudioTimetableDayId;
  label: string;
  shortLabel?: string;
  date?: string;
  order: number;
  componentId?: StudioTimetableComponentId;
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

export interface StudioTimetableComponentFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StudioTimetableComponentDefinition {
  id: StudioTimetableComponentId;
  label: string;
  defaultStatusId: StudioTimetableStatusId;
  frame?: StudioTimetableComponentFrame;
  variants: Record<StudioTimetableStatusId, StudioTimetableComponentVariant>;
}

export interface StudioTimetableCanvasConfig {
  width: number;
  height: number;
  backgroundColor?: string;
}

export interface StudioTimetableWeekDefinition {
  startDate?: string;
  endDate?: string;
}

export type StudioTimetableCapabilities = Record<
  StudioTimetableCapabilityKey,
  { enabled: boolean }
>;

export interface StudioTimetableDayCardOffset {
  left: number;
  top: number;
}

export type StudioTimetableDayCardsGridPreset =
  "1x7" | "7x1" | "4x2" | "3x3" | "custom";
export type StudioTimetableDayCardsFillOrder = "row" | "column";
export type StudioTimetableDayCardsAlignLastRow = "start" | "center" | "end";

export interface StudioTimetableDayCardsLayout {
  left: number;
  top: number;
  dayWidth: number;
  gridPreset?: StudioTimetableDayCardsGridPreset;
  columns?: number;
  rows?: number;
  dayGap: number;
  columnGap?: number;
  rowGap?: number;
  fillOrder?: StudioTimetableDayCardsFillOrder;
  alignLastRow?: StudioTimetableDayCardsAlignLastRow;
  slots?: Array<StudioTimetableDayId | null>;
  padding: number;
  headerHeight: number;
  entryPreviewWidth: number;
  entryPreviewHeight: number;
  entryGap: number;
  dayOffsets?: Record<StudioTimetableDayId, StudioTimetableDayCardOffset>;
}

export interface StudioTimetableAssetSlot {
  assetId?: StudioAssetId | null;
  inputId?: StudioInputId | null;
  fit?: StudioImageFit;
}

export interface StudioTimetableObjectVariantOption {
  value: string;
  label: string;
}

export interface StudioTimetableObjectVariantSet {
  options: StudioTimetableObjectVariantOption[];
  defaultValue: string;
  activeValue?: string;
  inputId?: StudioInputId | null;
  rootByValue: Record<string, StudioTimetableCompositionObjectId | null>;
}

export interface StudioTimetableCompositionObject {
  id: StudioTimetableCompositionObjectId;
  kind: StudioTimetableCompositionObjectKind;
  label: string;
  presetId?: StudioTimetableObjectPresetId;
  parentId?: StudioTimetableCompositionObjectId | null;
  childIds?: StudioTimetableCompositionObjectId[];
  variantSet?: StudioTimetableObjectVariantSet;
  layoutMode?: StudioObjectLayoutMode;
  profileRole?: StudioTimetableProfileObjectRole;
  structuredRole?: StudioTimetableStructuredObjectRole;
  style: StudioStyleRecord;
  binding?: StudioBinding;
  assetSlots?: Record<string, StudioTimetableAssetSlot>;
  backgroundAssetId?: StudioAssetId | null;
  backgroundFit?: StudioImageFit;
  locked?: boolean;
  hidden?: boolean;
  meta?: {
    exception?: StudioExceptionObjectMeta;
  };
}

export interface StudioTimetableComposition {
  rootObjectIds: StudioTimetableCompositionObjectId[];
  objects: Record<
    StudioTimetableCompositionObjectId,
    StudioTimetableCompositionObject
  >;
}

export interface StudioTimetableDomain {
  version: 2;
  canvas?: StudioTimetableCanvasConfig;
  week?: StudioTimetableWeekDefinition;
  capabilities?: StudioTimetableCapabilities;
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
  time?: string;
}

export interface StudioTimetableRuntimeValues {
  weekStartDate?: string;
  entriesByDay: Record<StudioTimetableDayId, StudioTimetableRuntimeEntry[]>;
  offlineMemoByDay?: Record<StudioTimetableDayId, string>;
}

export interface StudioTemplateDomains {
  timetable?: StudioTimetableDomain;
}

export interface StudioTemplateDocument {
  schema: "studio_template_document";
  version: 4;
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
  resources?: StudioTemplateResources;
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
