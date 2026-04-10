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
  isMultiple: boolean;
  maxStreamingTimeByDay: number;
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
  topObjectByTheme: Record<string, string | null>;
  onlineByTheme: Record<string, string | null>;
  offlineByTheme: Record<string, string | null>;
  profileFrameByTheme: Record<string, string | null>;
  profileBgByTheme: Record<string, string | null>;
  guideByTheme: Record<string, string | null>;
}

export interface V2TemplateAssetDimension {
  width: number;
  height: number;
}

export type V2TemplateAssetDimensionMap = Record<
  keyof V2TemplateAssetMap,
  Record<string, V2TemplateAssetDimension | null>
>;

export type V2TemplateStyleRecord = CSSProperties &
  Record<string, string | number>;

export type V2TemplateVisibilityMode =
  | "always"
  | "onlineOnly"
  | "offlineOnly";

export type V2TemplateComponentInstanceMode = "component" | "detached";

export type V2TemplateFieldScope = "entry" | "card" | "global";

export type V2TemplateComputedBindingKey =
  | "streamingDay"
  | "streamingDate"
  | "streamingTime";

export type V2TemplateNodeBindingRef =
  | {
      mode: "field";
      scope: V2TemplateFieldScope;
      key: string;
    }
  | {
      mode: "computed";
      key: V2TemplateComputedBindingKey;
    }
  | {
      mode: "literal";
      value: string;
    };

export type V2TemplateLayerIconKey =
  | "group"
  | "grid"
  | "calendar"
  | "image"
  | "layers"
  | "text";

export type V2TemplateLayerNodeKind = "group" | "component";

export type V2TemplateLayerComponentKey =
  | "grid"
  | "weekFlag"
  | "topObject"
  | "profile";

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
  children?: V2TemplateLayerNode[];
}

export type V2TemplateCardStyleKey = string;

export type V2TemplateCardOptionsKey = string;

export type V2TemplateSceneStyleKey = string;

export type V2TemplateCardNodeKind = "text" | "flexibleText";

export type V2TemplateCardNodeBinding = V2TemplateNodeBindingRef;

export type V2TemplateSceneNodeKind =
  | "group"
  | "asset"
  | "text"
  | "flexibleText"
  | "cardCollection";

export type V2TemplateSceneAssetFit = "cover" | "contain" | "fill";

export interface V2TemplateSceneNodeBase {
  id: string;
  label: string;
  kind: V2TemplateSceneNodeKind;
  layerId?: string;
  visibilityMode?: V2TemplateVisibilityMode;
}

export interface V2TemplateSceneGroupNode extends V2TemplateSceneNodeBase {
  kind: "group";
  children: V2TemplateSceneNode[];
}

export interface V2TemplateSceneAssetNode extends V2TemplateSceneNodeBase {
  kind: "asset";
  assetKey: keyof V2TemplateAssetMap;
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
  source: "card";
  componentId?: string;
}

export type V2TemplateSceneNode =
  | V2TemplateSceneGroupNode
  | V2TemplateSceneAssetNode
  | V2TemplateSceneTextNode
  | V2TemplateSceneCardCollectionNode;

export type V2TemplateGraphNodeType =
  | "group"
  | "image"
  | "text"
  | "flexibleText"
  | "cardCollection"
  | "componentInstance";

export type V2TemplateOrderModel = "pointer" | "orderKey";

export interface V2TemplateGraphNodeOrder {
  model: V2TemplateOrderModel;
  prevSiblingId?: string | null;
  orderKey?: string;
}

export interface V2TemplateGraphNodeStyleRefs {
  styleKey?: string;
  containerStyleKey?: string;
  textStyleKey?: string;
  wrapperStyleKey?: string;
  optionsKey?: string;
}

export interface V2TemplateGraphNodeMeta {
  assetKey?: keyof V2TemplateAssetMap;
  fit?: V2TemplateSceneAssetFit;
  alt?: string;
  source?: "card";
  componentId?: string;
  instanceId?: string;
  colorKey?: V2TemplateColorKey;
  fontKey?: V2TemplateFontKey;
  layerIcon?: V2TemplateLayerIconKey;
  layerComponentKey?: V2TemplateLayerComponentKey;
  layerTarget?: V2TemplateHighlightTarget;
  layerSectionKey?: string;
  isTemplateComponent?: boolean;
  containerClassName?: string;
  textClassName?: string;
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
  visibilityMode?: V2TemplateVisibilityMode;
  containerStyleKey: V2TemplateCardStyleKey;
  textStyleKey?: V2TemplateCardStyleKey;
  wrapperStyleKey?: V2TemplateCardStyleKey;
  optionsKey?: V2TemplateCardOptionsKey;
  colorKey: V2TemplateColorKey;
  fontKey: V2TemplateFontKey;
  containerClassName?: string;
  textClassName?: string;
}

export interface V2TemplateCardInstanceTransform {
  offsetX?: number;
  offsetY?: number;
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
}

export interface V2TemplateStructureConfig {
  layers: V2TemplateLayerNode[];
  card: V2TemplateCardStructure;
  sceneNodes: V2TemplateSceneNode[];
}

export interface V2TemplateLayoutConfig {
  grid: V2TemplateStyleRecord;
  weekFlag: V2TemplateStyleRecord;
  topObjectContainer: V2TemplateStyleRecord;
  profileImage: V2TemplateStyleRecord;
  profileFrame: V2TemplateStyleRecord;
  profileTextRootStyle?: V2TemplateStyleRecord;
  profileTextWrapperStyle?: V2TemplateStyleRecord;
  profileTextStyle?: V2TemplateStyleRecord;
  profileTextArtistImageStyle?: V2TemplateStyleRecord;
  card: {
    streamingDay: V2TemplateStyleRecord;
    streamingDate: V2TemplateStyleRecord;
    streamingTime: V2TemplateStyleRecord;
    mainTitleContainer: V2TemplateStyleRecord;
    subTitleContainer: V2TemplateStyleRecord;
    container: V2TemplateStyleRecord;
    mainTitleTextStyle?: V2TemplateStyleRecord;
    subTitleTextStyle?: V2TemplateStyleRecord;
    mainTitleOptions?: V2TemplateAutoResizeOptions;
    subTitleOptions?: V2TemplateAutoResizeOptions;
    streamingDayStyle?: V2TemplateStyleRecord;
    streamingDateStyle?: V2TemplateStyleRecord;
    streamingTimeStyle?: V2TemplateStyleRecord;
    mainTitleWrapperStyle?: V2TemplateStyleRecord;
    [key: string]: V2TemplateStyleRecord | V2TemplateAutoResizeOptions | undefined;
  };
  scene: {
    [key: string]: V2TemplateStyleRecord | V2TemplateAutoResizeOptions | undefined;
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
  monthOption: TLanOpt;
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
  profileTextPlaceholder: string;
  formSchema: V2TemplateFormSchema;
  assets: V2TemplateAssetMap;
  assetDimensions: V2TemplateAssetDimensionMap;
  layout: V2TemplateLayoutConfig;
  graph: V2TemplateNodeGraph;
}
