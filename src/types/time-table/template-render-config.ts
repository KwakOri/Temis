import { CSSProperties } from "react";
import {
  SimpleFieldConfig,
  TLanOpt,
} from "@/types/time-table/data";
import type { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";

export const v2_TEMPLATE_RENDER_CONFIG_VERSION = 1 as const;
export const v2_DEFAULT_CARD_COMPONENT_ID = "card" as const;

export const v2_TEMPLATE_COLOR_KEYS = [
  "MAIN_TITLE",
  "SUB_TITLE",
  "STREAMING_TIME",
  "STREAMING_DATE",
  "STREAMING_DAY",
  "ARTIST",
  "WEEKLY_FLAG",
] as const;

export type V2TemplateColorKey = (typeof v2_TEMPLATE_COLOR_KEYS)[number];
export type V2TemplateFontKey = V2TemplateColorKey;
export const v2_TEMPLATE_DAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type V2TemplateDayKey = (typeof v2_TEMPLATE_DAY_KEYS)[number];

export interface V2TemplateDayLabelFormat {
  mode: "preset" | "custom";
  preset: TLanOpt;
  custom: Partial<Record<V2TemplateDayKey, string>>;
}

export type V2TemplateTextCaseStyle =
  | "original"
  | "upper"
  | "lower"
  | "capitalize";

export interface V2TemplateStreamingDayFormat {
  locale: TLanOpt;
  width: "narrow" | "short" | "long";
  caseStyle: V2TemplateTextCaseStyle;
  custom: Partial<Record<V2TemplateDayKey, string>>;
}

export interface V2TemplateStreamingTimeFormat {
  hourCycle: "h12" | "h24";
  padHour: boolean;
  showMeridiem: boolean;
  meridiemStyle: "upper" | "lower" | "kr";
  meridiemPosition: "prefix" | "suffix";
  meridiemSeparator: string;
  timeSeparator: string;
}

export interface V2TemplateWeekDateFormat {
  locale: TLanOpt;
  dateOrder: "locale" | "ymd" | "mdy" | "dmy";
  includeYear: boolean;
  yearStyle: "numeric" | "2-digit";
  monthStyle: "numeric" | "2-digit" | "short" | "long";
  dateStyle: "numeric" | "2-digit";
  caseStyle: V2TemplateTextCaseStyle;
  dateSeparator: string;
  monthDateSeparator: string;
  rangeSeparator: string;
}

export interface V2TemplateSize {
  width: number;
  height: number;
}

export interface V2TemplateCardSizes {
  online: V2TemplateSize;
  offline: V2TemplateSize;
  profile: V2TemplateSize;
  frame: V2TemplateSize;
}

export interface V2TemplateColorPalette {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export interface V2TemplateFonts {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
}

export interface V2TemplateFontFaceMetrics {
  ascentOverride?: string;
  descentOverride?: string;
  lineGapOverride?: string;
  sizeAdjust?: string;
}

export interface V2TemplateFontFaceSource {
  weight: number | string;
  style?: "normal" | "italic" | "oblique";
  src: string;
  format?: "woff2" | "woff" | "truetype" | "opentype";
  unicodeRange?: string;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  metrics?: V2TemplateFontFaceMetrics;
}

export interface V2TemplateFontRegistryItem {
  family: string;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
  faces: V2TemplateFontFaceSource[];
}

export interface V2TemplateFontConfig {
  fontFaceDefaults: {
    ascentOverride: string;
    descentOverride: string;
    lineGapOverride: string;
    sizeAdjust: string;
  };
  registry: Record<string, V2TemplateFontRegistryItem>;
}

export interface V2TemplateEditorOptions {
  isArtist: boolean;
  isMemo: boolean;
  isMultiple: boolean;
  maxStreamingTimeByDay: number;
  enableThemeSelection: boolean;
  useOnlineAssetsByDay: boolean;
  useMultiAssetsByDay: boolean;
  useOfflineAssetsByDay: boolean;
  useOfflineMemoAssetsByDay: boolean;
}

export type V2TemplateObjectAssetMode = "none" | "singleAsset" | "statefulAsset";
export type V2TemplateArtistMode =
  | "none"
  | "textOnly"
  | "textWithAsset"
  | "textWithStatefulAsset";
export type V2TemplateMemoMode =
  | "none"
  | "textOnly"
  | "textWithAsset"
  | "statefulAssetWithText";

export interface V2TemplateStructureCapabilities {
  objects: {
    topObject: {
      enabled: boolean;
      mode: V2TemplateObjectAssetMode;
    };
    profile: {
      enabled: boolean;
      imageRequired: boolean;
      frameRequired: boolean;
    };
    artist: {
      enabled: boolean;
      mode: V2TemplateArtistMode;
    };
    memo: {
      enabled: boolean;
      mode: V2TemplateMemoMode;
    };
    weekDates: {
      enabled: boolean;
    };
  };
  timetable: {
    multipleEnabled: boolean;
    maxEntriesPerDay: number;
    offlineMemoEnabled: boolean;
  };
}

export interface V2TemplateAutoResizeOptions {
  maxFontSize?: number;
  multiline?: boolean;
}

export interface V2TemplateMaxFontSizes {
  MAIN_TITLE: number;
  SUB_TITLE: number;
  ARTIST: number;
}

export interface V2TemplateAssetMap {
  bgByTheme: Record<string, string | null>;
  boardByTheme: Record<string, string | null>;
  frameBgByTheme: Record<string, string | null>;
  frameByTheme: Record<string, string | null>;
  gridBgByTheme: Record<string, string | null>;
  topObjectByTheme: Record<string, string | null>;
  memoByTheme: Record<string, string | null>;
  artistOnByTheme: Record<string, string | null>;
  artistOffByTheme: Record<string, string | null>;
  artist: Record<string, string | null>;
  onlineByTheme: Record<string, string | null>;
  online_mon: Record<string, string | null>;
  online_tue: Record<string, string | null>;
  online_wed: Record<string, string | null>;
  online_thu: Record<string, string | null>;
  online_fri: Record<string, string | null>;
  online_sat: Record<string, string | null>;
  online_sun: Record<string, string | null>;
  multiByTheme: Record<string, string | null>;
  multi_mon: Record<string, string | null>;
  multi_tue: Record<string, string | null>;
  multi_wed: Record<string, string | null>;
  multi_thu: Record<string, string | null>;
  multi_fri: Record<string, string | null>;
  multi_sat: Record<string, string | null>;
  multi_sun: Record<string, string | null>;
  offlineByTheme: Record<string, string | null>;
  offline_mon: Record<string, string | null>;
  offline_tue: Record<string, string | null>;
  offline_wed: Record<string, string | null>;
  offline_thu: Record<string, string | null>;
  offline_fri: Record<string, string | null>;
  offline_sat: Record<string, string | null>;
  offline_sun: Record<string, string | null>;
  offlineMemoByTheme: Record<string, string | null>;
  offlineMemo_mon: Record<string, string | null>;
  offlineMemo_tue: Record<string, string | null>;
  offlineMemo_wed: Record<string, string | null>;
  offlineMemo_thu: Record<string, string | null>;
  offlineMemo_fri: Record<string, string | null>;
  offlineMemo_sat: Record<string, string | null>;
  offlineMemo_sun: Record<string, string | null>;
  profileFrameByTheme: Record<string, string | null>;
  profileBgByTheme: Record<string, string | null>;
  guideByTheme: Record<string, string | null>;
}

export type V2TemplateBuiltinAssetKey = keyof V2TemplateAssetMap;

export interface V2TemplateAssetDimension {
  width: number;
  height: number;
}

export type V2TemplateAssetDimensionMap = Record<
  V2TemplateBuiltinAssetKey,
  Record<string, V2TemplateAssetDimension | null>
>;

export type V2TemplateExtraAssetMap = Record<
  string,
  Record<string, string | null>
>;

export type V2TemplateExtraAssetDimensionMap = Record<
  string,
  Record<string, V2TemplateAssetDimension | null>
>;

export type V2TemplateAssetRef =
  | {
      source: "builtin";
      key: V2TemplateBuiltinAssetKey;
    }
  | {
      source: "extra";
      key: string;
    };

export interface V2TemplateAssetRequirement {
  id: string;
  label: string;
  required: boolean;
  owner: {
    type: "object" | "timetable" | "scene";
    key: string;
  };
  state?: "on" | "off";
  dayKey?: V2TemplateDayKey;
  themeScoped: boolean;
  assetRef: V2TemplateAssetRef;
}

export type V2TemplateStyleRecord = CSSProperties &
  Record<string, string | number>;

export type V2TemplateVisibilityMode =
  | "always"
  | "onlineOnly"
  | "offlineOnly"
  | "onlineSingleOnly"
  | "onlineMultipleOnly"
  | "offlineMemoOnly"
  | "offlineNoMemoOnly"
  | "topObjectOnOnly"
  | "topObjectOffOnly"
  | "artistOnOnly"
  | "artistOffOnly"
  | "memoOnOnly"
  | "memoOffOnly";

export type V2TemplateComponentInstanceMode = "detached";

export type V2TemplateFieldScope = "entry" | "card" | "global";

export const v2_TEMPLATE_COMPUTED_BINDING_KEYS = [
  "streamingDay",
  "streamingDate",
  "streamingTime",
  "streamingTimeHour",
  "streamingTimeMinute",
  "streamingTimeMeridiem",
  "weekDateRange",
  "weekStartYear",
  "weekStartMonth",
  "weekStartDate",
  "weekStartMonthDate",
  "weekStartFullDate",
  "weekEndYear",
  "weekEndMonth",
  "weekEndDate",
  "weekEndMonthDate",
  "weekEndFullDate",
] as const;

export type V2TemplateComputedBindingKey =
  (typeof v2_TEMPLATE_COMPUTED_BINDING_KEYS)[number];

export interface V2TemplateEntrySelector {
  mode: "index";
  index: number;
}

export type V2TemplateNodeBindingRef =
  | {
      mode: "field";
      scope: V2TemplateFieldScope;
      key: string;
      entrySelector?: V2TemplateEntrySelector;
    }
  | {
      mode: "computed";
      key: V2TemplateComputedBindingKey;
      entrySelector?: V2TemplateEntrySelector;
    }
  | {
      mode: "literal";
      value: string;
    };

export type V2TemplateComponentInstanceBindingOverrides = Record<
  string,
  V2TemplateNodeBindingRef
>;

export type V2TemplateLayerIconKey =
  | "group"
  | "grid"
  | "calendar"
  | "image"
  | "layers"
  | "text";

export type V2TemplateLayerNodeKind = "group" | "component";

export type V2TemplateLayerComponentKey =
  | "board"
  | "frame"
  | "grid"
  | "weekFlag"
  | "topObject"
  | "profile"
  | "artist"
  | "memo";

export interface V2TemplateLayerNode {
  id: string;
  label: string;
  kind: V2TemplateLayerNodeKind;
  componentKey?: V2TemplateLayerComponentKey;
  icon?: V2TemplateLayerIconKey;
  target?: V2TemplateHighlightTarget;
  sectionKey?: string;
  visibilityMode?: V2TemplateVisibilityMode;
  isTemplateComponent?: boolean;
  isVirtual?: boolean;
  children?: V2TemplateLayerNode[];
}

export type V2TemplateCardStyleKey = string;

export type V2TemplateCardOptionsKey = string;

export type V2TemplateSceneStyleKey = string;

export type V2TemplateCardImageAssetByDayKey = Partial<
  Record<V2TemplateDayKey, V2TemplateAssetRef>
>;

export type V2TemplateCardNodeKind = "text" | "flexibleText" | "image";

export type V2TemplateCardNodeBinding = V2TemplateNodeBindingRef;

export type V2TemplateSceneNodeKind =
  | "group"
  | "asset"
  | "text"
  | "flexibleText"
  | "cardCollection"
  | "componentInstance";

export type V2TemplateSceneAssetFit = "cover" | "contain" | "fill";
export type V2TemplateSceneAssetRole =
  | "general"
  | "background"
  | "guideOverlay"
  | "frameArtwork"
  | "frameObject"
  /** @deprecated Use frameArtwork. */
  | "profileImage"
  /** @deprecated Use frameObject. */
  | "profileFrame";

export interface V2TemplateSceneNodeBase {
  id: string;
  label: string;
  kind: V2TemplateSceneNodeKind;
  layerId?: string;
  visibilityMode?: V2TemplateVisibilityMode;
}

export interface V2TemplateSceneGroupNode extends V2TemplateSceneNodeBase {
  kind: "group";
  styleKey?: V2TemplateSceneStyleKey;
  children: V2TemplateSceneNode[];
}

export interface V2TemplateSceneAssetNode extends V2TemplateSceneNodeBase {
  kind: "asset";
  assetRef?: V2TemplateAssetRef;
  assetRole?: V2TemplateSceneAssetRole;
  styleKey?: V2TemplateSceneStyleKey;
  fit?: V2TemplateSceneAssetFit;
  alt?: string;
}

export interface V2TemplateSceneTextNode extends V2TemplateSceneNodeBase {
  kind: "text" | "flexibleText";
  binding: V2TemplateNodeBindingRef;
  containerStyleKey: V2TemplateSceneStyleKey;
  textStyleKey?: V2TemplateSceneStyleKey;
  wrapperStyleKey?: V2TemplateSceneStyleKey;
  optionsKey?: V2TemplateCardOptionsKey;
  colorKey: V2TemplateColorKey;
  fontKey: V2TemplateFontKey;
  highlightTarget?: V2TemplateHighlightTarget;
  containerClassName?: string;
  textClassName?: string;
}

export interface V2TemplateSceneCardCollectionNode
  extends V2TemplateSceneNodeBase {
  kind: "cardCollection";
  componentId?: string;
  children?: V2TemplateSceneComponentInstanceNode[];
}

export interface V2TemplateSceneComponentInstanceNode
  extends V2TemplateSceneNodeBase {
  kind: "componentInstance";
  componentId: string;
  instanceId: string;
  dayKey: V2TemplateDayKey;
  styleKey?: V2TemplateSceneStyleKey;
  bindingOverrides?: V2TemplateComponentInstanceBindingOverrides;
}

export type V2TemplateSceneNode =
  | V2TemplateSceneGroupNode
  | V2TemplateSceneAssetNode
  | V2TemplateSceneTextNode
  | V2TemplateSceneCardCollectionNode
  | V2TemplateSceneComponentInstanceNode;

export type V2TemplateGraphNodeType =
  | "group"
  | "image"
  | "text"
  | "flexibleText"
  | "cardCollection"
  | "componentInstance";

export interface V2TemplateGraphNodeOrder {
  model: "orderKey";
  prevSiblingId?: string | null;
  orderKey?: string;
}

export interface V2TemplateGraphNodeStyleRefs {
  styleKey?: string;
  containerStyleKey?: string;
  entryStyleKey?: string;
  textStyleKey?: string;
  wrapperStyleKey?: string;
  optionsKey?: string;
}

export interface V2TemplateGraphNodeMeta {
  assetRef?: V2TemplateAssetRef;
  assetRefByDayKey?: V2TemplateCardImageAssetByDayKey;
  assetRole?: V2TemplateSceneAssetRole;
  fit?: V2TemplateSceneAssetFit;
  alt?: string;
  componentId?: string;
  instanceId?: string;
  dayKey?: V2TemplateDayKey;
  colorKey?: V2TemplateColorKey;
  fontKey?: V2TemplateFontKey;
  layerIcon?: V2TemplateLayerIconKey;
  layerComponentKey?: V2TemplateLayerComponentKey;
  layerTarget?: V2TemplateHighlightTarget;
  layerSectionKey?: string;
  isTemplateComponent?: boolean;
  importOmitted?: boolean;
  containerClassName?: string;
  textClassName?: string;
  bindingOverrides?: V2TemplateComponentInstanceBindingOverrides;
}

export interface V2TemplateGraphNode {
  id: string;
  type: V2TemplateGraphNodeType;
  label: string;
  parentId: string | null;
  childIds: string[];
  order?: V2TemplateGraphNodeOrder;
  layerId?: string;
  highlightTarget?: V2TemplateHighlightTarget;
  visibilityMode?: V2TemplateVisibilityMode;
  binding?: V2TemplateNodeBindingRef;
  styles?: V2TemplateGraphNodeStyleRefs;
  meta?: V2TemplateGraphNodeMeta;
}

export interface V2TemplateGraphComponentDefinition {
  id: string;
  label: string;
  rootNodeId: string;
  description?: string;
  kind?: "template" | "custom";
  instanceMode?: V2TemplateComponentInstanceMode;
  instanceTransforms?: Record<string, V2TemplateCardInstanceTransform>;
  detachedAt?: string;
}

export interface V2TemplateNodeGraph {
  rootNodeIds: string[];
  nodes: Record<string, V2TemplateGraphNode>;
  componentDefinitions: Record<string, V2TemplateGraphComponentDefinition>;
}

export interface V2TemplateFormField {
  key: string;
  scope: V2TemplateFieldScope;
  type: SimpleFieldConfig["type"];
  label?: string;
  placeholder: string;
  required?: boolean;
  maxLength?: number;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: string | number;
}

export interface V2TemplateFormSchema {
  fields: V2TemplateFormField[];
  showLabels?: boolean;
  offlineToggle?: {
    label: string;
    activeColor: string;
    inactiveColor: string;
  };
}

export interface V2TemplateCardNode {
  id: string;
  label: string;
  kind: V2TemplateCardNodeKind;
  layerId: string;
  highlightTarget: V2TemplateHighlightTarget;
  binding: V2TemplateCardNodeBinding;
  parentId?: string | null;
  visibilityMode?: V2TemplateVisibilityMode;
  containerStyleKey: V2TemplateCardStyleKey;
  entryStyleKey?: V2TemplateCardStyleKey;
  textStyleKey?: V2TemplateCardStyleKey;
  wrapperStyleKey?: V2TemplateCardStyleKey;
  optionsKey?: V2TemplateCardOptionsKey;
  colorKey: V2TemplateColorKey;
  fontKey: V2TemplateFontKey;
  assetRef?: V2TemplateAssetRef;
  assetRefByDayKey?: V2TemplateCardImageAssetByDayKey;
  fit?: V2TemplateSceneAssetFit;
  alt?: string;
  containerClassName?: string;
  textClassName?: string;
}

export interface V2TemplateCardFrameBindingContext {
  scope: "entry";
  entryIndex: number;
}

export interface V2TemplateCardFrameNode {
  id: string;
  label: string;
  kind: "frame";
  layerId: string;
  highlightTarget: V2TemplateHighlightTarget;
  parentId?: string | null;
  visibilityMode?: V2TemplateVisibilityMode;
  styleKey: V2TemplateCardStyleKey;
  childIds: string[];
  bindingContext?: V2TemplateCardFrameBindingContext;
  containerClassName?: string;
}

export type V2TemplateCardObjectKind = "frame" | V2TemplateCardNodeKind;

export type V2TemplateCardObject =
  | V2TemplateCardFrameNode
  | V2TemplateCardNode;

export interface V2TemplateCardInstanceTransform {
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  rotateDeg?: number;
  scale?: number;
  opacity?: number;
}

export interface V2TemplateCardStructure {
  containerLayerId: string;
  containerHighlightTarget: V2TemplateHighlightTarget;
  containerStyleKey: V2TemplateCardStyleKey;
  instanceMode: V2TemplateComponentInstanceMode;
  instanceTransforms: Record<string, V2TemplateCardInstanceTransform>;
  nodeOrder: string[];
  nodes: Record<string, V2TemplateCardNode>;
  rootObjectIds?: string[];
  frameNodes?: Record<string, V2TemplateCardFrameNode>;
}

export const v2_TIMETABLE_CARD_STATUS_KEYS = [
  "online",
  "offline",
  "multi",
  "offlineMemo",
] as const;

export type V2TemplateTimetableCardStatusKey =
  (typeof v2_TIMETABLE_CARD_STATUS_KEYS)[number];

export type V2TemplateTimetableGridLayoutMode =
  | "grid3x3"
  | "flex4x2"
  | "free";

export type V2TemplateTimetableFlex42Align = "left" | "center" | "right";

export type V2TemplateTimetableFlex42ThreeRow = "top" | "bottom";

export interface V2TemplateTimetableStatusOptions {
  online: true;
  offline: true;
  multi: boolean;
  offlineMemo: boolean;
}

export interface V2TemplateTimetableGridSlot {
  dayKey: V2TemplateDayKey;
  componentId: string;
  transform?: V2TemplateCardInstanceTransform;
}

export interface V2TemplateTimetableCardState {
  label?: string;
  size?: V2TemplateSize;
  card: V2TemplateCardStructure;
}

export type V2TemplateTimetableCardStates = {
  online: V2TemplateTimetableCardState;
  offline: V2TemplateTimetableCardState;
} & Partial<Record<"multi" | "offlineMemo", V2TemplateTimetableCardState>>;

export interface V2TemplateTimetableCardComponent {
  id: string;
  label: string;
  states: V2TemplateTimetableCardStates;
}

export interface V2TemplateTimetableConfig {
  layerId: string;
  layoutMode: V2TemplateTimetableGridLayoutMode;
  flex42Align: V2TemplateTimetableFlex42Align;
  flex42ThreeRow: V2TemplateTimetableFlex42ThreeRow;
  emptySlots: number[];
  multiEntryCount: number;
  statusOptions: V2TemplateTimetableStatusOptions;
  slots: Record<V2TemplateDayKey, V2TemplateTimetableGridSlot>;
  componentOrder: string[];
  components: Record<string, V2TemplateTimetableCardComponent>;
}

export interface V2TemplateStructureConfig {
  layers: V2TemplateLayerNode[];
  card: V2TemplateCardStructure;
  sceneNodes: V2TemplateSceneNode[];
}

export interface V2TemplateSharedStyleGroup {
  memberSectionKeys: string[];
  mode: "sync-all";
}

export interface V2TemplateLayoutConfig {
  grid: V2TemplateStyleRecord;
  weekFlag: V2TemplateStyleRecord;
  topObjectContainer: V2TemplateStyleRecord;
  /** @deprecated Frame artwork layout now lives in layout.scene.frameArtwork. */
  profileImage?: V2TemplateStyleRecord;
  /** @deprecated Frame object layout now lives in layout.scene.frameObject. */
  profileFrame?: V2TemplateStyleRecord;
  artistTextRootStyle?: V2TemplateStyleRecord;
  artistTextWrapperStyle?: V2TemplateStyleRecord;
  artistTextStyle?: V2TemplateStyleRecord;
  artistObjectStyle?: V2TemplateStyleRecord;
  card: {
    onlineBackgroundContainer?: V2TemplateStyleRecord;
    multiBackgroundContainer?: V2TemplateStyleRecord;
    offlineBackgroundContainer?: V2TemplateStyleRecord;
    offlineMemoBackgroundContainer?: V2TemplateStyleRecord;
    streamingDay: V2TemplateStyleRecord;
    streamingDate: V2TemplateStyleRecord;
    streamingTime: V2TemplateStyleRecord;
    mainTitleContainer: V2TemplateStyleRecord;
    subTitleContainer: V2TemplateStyleRecord;
    container: V2TemplateStyleRecord;
    mainTitleTextStyle?: V2TemplateStyleRecord;
    subTitleTextStyle?: V2TemplateStyleRecord;
    streamingDayStyle?: V2TemplateStyleRecord;
    streamingDateStyle?: V2TemplateStyleRecord;
    streamingTimeStyle?: V2TemplateStyleRecord;
    mainTitleWrapperStyle?: V2TemplateStyleRecord;
    subTitleWrapperStyle?: V2TemplateStyleRecord;
    [key: string]: V2TemplateStyleRecord | undefined;
  };
  scene: {
    [key: string]: V2TemplateStyleRecord | undefined;
  };
}

export interface V2TemplateRenderConfig {
  version: typeof v2_TEMPLATE_RENDER_CONFIG_VERSION;
  metadata: {
    schema: "v2_template_render_config";
    name: string;
    description: string;
  };
  templateSize: V2TemplateSize;
  weekdayOption: TLanOpt;
  dayLabelFormat: V2TemplateDayLabelFormat;
  monthOption: TLanOpt;
  streamingDayFormat: V2TemplateStreamingDayFormat;
  streamingTimeFormat: V2TemplateStreamingTimeFormat;
  weekDateFormat: V2TemplateWeekDateFormat;
  themes: string[];
  defaultTheme: string;
  buttonThemes: Array<{ value: string; label: string }>;
  fonts: V2TemplateFontConfig;
  baseFonts: V2TemplateFonts;
  baseColors: Record<string, V2TemplateColorPalette>;
  componentColors: Record<V2TemplateColorKey, string>;
  componentFonts: Record<V2TemplateFontKey, string>;
  maxFontSizes: V2TemplateMaxFontSizes;
  cardSizes: V2TemplateCardSizes;
  editorOptions: V2TemplateEditorOptions;
  structureCapabilities?: V2TemplateStructureCapabilities;
  artistTextPlaceholder: string;
  formSchema: V2TemplateFormSchema;
  assets: V2TemplateAssetMap;
  assetDimensions: V2TemplateAssetDimensionMap;
  extraAssets: V2TemplateExtraAssetMap;
  extraAssetDimensions: V2TemplateExtraAssetDimensionMap;
  layout: V2TemplateLayoutConfig;
  textOptions: Record<string, V2TemplateAutoResizeOptions>;
  graph: V2TemplateNodeGraph;
  timetable: V2TemplateTimetableConfig;
  sharedStyleGroups?: Record<string, V2TemplateSharedStyleGroup>;
}
