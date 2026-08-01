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

export type StudioDayLabelFormat =
  | "default"
  | "long"
  | "short"
  | "shortUpper"
  | "shortLower"
  | "koreanLong"
  | "koreanShort";

/**
 * 제품과 문서 도메인 종류.
 *
 * `template_engine`(렌더링 엔진)과는 다른 축이다. 두 값을 하나로 합치지 않는다.
 */
export type StudioTemplateKind = "timetable" | "thumbnail";

export type StudioInputScope = "global" | "day" | "entry";
export type StudioInputType = "text" | "image" | "select";
export type StudioBuiltinFieldType = "text" | "boolean" | "status";
/**
 * 그래프 노드의 종류.
 *
 * 여기에 값을 더하면 `STUDIO_NODE_DEFINITIONS`(node-definitions.ts)와 공통
 * 렌더러의 분기가 컴파일 단계에서 함께 깨진다. 그래야 새 종류가 빈 글자처럼
 * 그려지는 일이 없다.
 */
export type StudioGraphNodeType =
  "group" | "text" | "image" | "flexibleText" | "shape";
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
  | "board"
  | "weekDates"
  | "weeklyMemo"
  | "profileBlock"
  | "artistProfileText"
  | "topObject";
export type StudioSemanticPresetScope = "cards" | "timetable";
export type StudioSemanticKey =
  | "dayCardContainers"
  | "board"
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

export interface StudioTimetableGuideResource {
  assetId?: StudioAssetId | null;
  visible?: boolean;
  opacity?: number;
}

export interface StudioTemplateResources {
  webFonts?: StudioWebFontSource[];
  cardsGuide?: StudioTimetableGuideResource;
  timetableGuide?: StudioTimetableGuideResource;
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

export interface StudioTextFill {
  type: "solid";
  color: string;
  opacity: number;
}

export interface StudioTextStroke {
  id: string;
  label?: string;
  enabled: boolean;
  color: string;
  /**
   * glyph 바깥으로 보이는 실효 두께.
   *
   * 중앙 정렬 CSS stroke는 절반이 glyph 안쪽으로 들어가므로 렌더러가 2배로
   * 변환한다. 인스펙터 표시와 effect outset 계산은 이 값을 그대로 쓴다.
   */
  outset: number;
  opacity: number;
}

export interface StudioTextShadow {
  enabled: boolean;
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

/**
 * 적용 출처만 기록한다. 렌더링은 노드에 복사된 값을 기준으로 하므로 프리셋을
 * 수정해도 기존 문서가 바뀌지 않는다.
 *
 * `builtin`은 코드 registry의 ID와 version, `custom`은 저장된 row의 ID와
 * version을 뜻한다. 두 출처의 ID가 우연히 같아도 `source`로 구분한다.
 */
export interface StudioTextPresetReference {
  source: "builtin" | "custom";
  presetId: string;
  presetVersion: number;
}

/**
 * 순서가 있는 다중 효과는 scalar `StudioStyleRecord`로 표현할 수 없어 노드
 * 필드에 둔다.
 *
 * 주의: 시간표의 `applyStudioVariantStyle()`은 `document.styles`만 복사하므로
 * 이 값은 상태 variant 사이에 자동 전파되지 않는다. 시간표가 공용 텍스트 효과를
 * 채택할 때 전파 유틸을 함께 확장해야 한다.
 */
export interface StudioTextAppearance {
  fill: StudioTextFill;
  strokes: StudioTextStroke[];
  shadow?: StudioTextShadow;
  presetRef?: StudioTextPresetReference;
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
  | {
      kind: "builtinField";
      fieldId: StudioBuiltinFieldId;
      dayLabelFormat?: StudioDayLabelFormat;
    }
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
  assetSlots?: Record<string, StudioAssetSlot>;
  fit?: StudioImageFit;
  locked?: boolean;
  /**
   * 편집 중 화면에서 감춘 노드.
   *
   * 문서에서 지우는 것이 아니라 그리지 않는 것이다. 미리보기와 내보내기에서도
   * 같이 빠진다. 감춘 것이 결과물에만 나타나면 사용자는 왜 나왔는지 알 수 없다.
   */
  hidden?: boolean;
  /** `text`와 `flexibleText`에만 유효하다. */
  textAppearance?: StudioTextAppearance;
  meta?: StudioGraphNodeMeta;
}

export interface StudioNodeGraph {
  rootNodeIds: StudioNodeId[];
  nodes: Record<StudioNodeId, StudioGraphNode>;
}

/** 사용자 입력 폼의 배치 정보. 값 자체에는 영향을 주지 않는다. */
export interface StudioInputPresentation {
  order?: number;
  groupId?: string;
  helpText?: string;
}

/**
 * 사용자에게 허용할 이미지 조작 범위.
 *
 * 사용자 UI의 권한만 제어하고 이미지 스타일을 대체하지 않는다.
 */
export interface StudioImageInputPolicy {
  allowFitChange: boolean;
  allowFocusChange: boolean;
  allowReplace?: boolean;
  allowCrop?: boolean;
  recommendedAspectRatio?: number;
}

export interface StudioInputBase {
  id: StudioInputId;
  type: StudioInputType;
  scope: StudioInputScope;
  label: string;
  description?: string;
  required?: boolean;
  presentation?: StudioInputPresentation;
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
  policy?: StudioImageInputPolicy;
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

/**
 * 노드나 오브젝트가 그림 하나를 끼우는 자리.
 *
 * 문서에 담긴 정적 에셋을 쓸 수도 있고 사용자 입력에서 받을 수도 있다. 자리의
 * 모양 자체는 도메인과 무관하므로 공통 렌더러가 이 타입만 알면 된다. 시간표
 * 이름을 달고 있으면 썸네일에서 같은 칸을 쓸 때마다 시간표 개념을 끌고 온다.
 */
export interface StudioAssetSlot {
  assetId?: StudioAssetId | null;
  inputId?: StudioInputId | null;
  fit?: StudioImageFit;
}

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
  emptySlotIndexes?: number[];
  padding: number;
  headerHeight: number;
  entryPreviewWidth: number;
  entryPreviewHeight: number;
  entryGap: number;
  dayOffsets?: Record<StudioTimetableDayId, StudioTimetableDayCardOffset>;
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
  assetSlots?: Record<string, StudioAssetSlot>;
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
  isGuerrilla?: boolean;
}

export interface StudioTimetableRuntimeValues {
  weekStartDate?: string;
  entriesByDay: Record<StudioTimetableDayId, StudioTimetableRuntimeEntry[]>;
  offlineMemoByDay?: Record<StudioTimetableDayId, string>;
}

/**
 * 썸네일 도메인.
 *
 * 시간표의 일자, 항목, 카드 상태, Component Set, capability 같은 데이터는
 * 넣지 않는다. 사용자 입력값은 `StudioRuntimeValues.global`에 둔다.
 */
export interface StudioThumbnailDomain {
  version: 1;
  export: {
    defaultFormat: "png";
    transparentBackground: boolean;
  };
  guide?: StudioTimetableGuideResource;
}

export interface StudioTemplateDomains {
  timetable?: StudioTimetableDomain;
  thumbnail?: StudioThumbnailDomain;
}

/**
 * canonical 문서의 metadata.
 *
 * `kind`는 필수다. `kind`가 없는 레거시 입력은 로드와 migration 경계에서만
 * 허용하고 `getStudioTemplateKind()`로 흡수한다.
 */
export interface StudioTemplateMetadata {
  editor: "template-studio";
  kind: StudioTemplateKind;
  name: string;
  description?: string;
}

export interface StudioTemplateDocument {
  schema: "studio_template_document";
  version: 7;
  metadata: StudioTemplateMetadata;
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
