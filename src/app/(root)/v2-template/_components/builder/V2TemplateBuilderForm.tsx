import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Braces,
  ChevronDown,
  ChevronRight,
  Columns3,
  Grid3X3,
  Hash,
  Layers,
  LayoutGrid,
  LucideIcon,
  Move,
  Palette,
  Percent,
  Plus,
  RotateCw,
  Rows3,
  Ruler,
  Square,
  SlidersHorizontal,
  Text,
  Type,
} from "lucide-react";

import { useTimeTable } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";
import {
  V2TemplateAssetDimension,
  V2TemplateAssetMap,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNodeKind,
  V2TemplateCardNode,
  V2TemplateCardOptionsKey,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateVisibilityMode,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/v2_template_render_config";
import { V2TemplateHighlightTarget } from "@/types/time-table/v2_template_editor_ui";
import {
  v2_bindingRefToLegacyInput,
  v2_createBindingRefFromLegacyInput,
  v2_isEntryFieldBindingKey,
  v2_toLegacyCardInputConfig,
} from "@/utils/time-table/v2_template_render_config";

type V2BuilderTab =
  | "canvas"
  | "schema"
  | "properties"
  | "style"
  | "assets"
  | "data"
  | "export";

const v2_BUILDER_TABS: Array<{ id: V2BuilderTab; label: string }> = [
  { id: "canvas", label: "캔버스" },
  { id: "schema", label: "입력 스키마" },
  { id: "properties", label: "속성" },
  { id: "style", label: "스타일" },
  { id: "assets", label: "에셋" },
  { id: "data", label: "샘플 데이터" },
  { id: "export", label: "내보내기" },
];

const v2_FORM_FIELD_SCOPE_OPTIONS: Array<{
  value: V2TemplateFieldScope;
  label: string;
}> = [
  { value: "entry", label: "entry" },
  { value: "card", label: "card" },
  { value: "global", label: "global" },
];

const v2_FORM_FIELD_TYPE_OPTIONS: Array<{
  value: V2TemplateFormField["type"];
  label: string;
}> = [
  { value: "text", label: "text" },
  { value: "textarea", label: "textarea" },
  { value: "time", label: "time" },
  { value: "date", label: "date" },
  { value: "select", label: "select" },
  { value: "number", label: "number" },
];

const v2_BINDING_COMPUTED_OPTIONS = [
  "streamingDay",
  "streamingDate",
  "streamingTime",
] as const;

const v2_ASSET_KEYS: Array<keyof V2TemplateAssetMap> = [
  "bgByTheme",
  "topObjectByTheme",
  "onlineByTheme",
  "offlineByTheme",
  "profileFrameByTheme",
  "profileBgByTheme",
];

const v2_ASSET_LABELS: Record<keyof V2TemplateAssetMap, string> = {
  bgByTheme: "배경",
  topObjectByTheme: "상단 오브젝트",
  onlineByTheme: "온라인 카드",
  offlineByTheme: "오프라인 카드",
  profileFrameByTheme: "프로필 프레임",
  profileBgByTheme: "프로필 배경",
};

const v2_STYLE_PROPERTY_CATALOG = [
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "rowGap",
  "columnGap",
  "columns",
  "gridTemplateColumns",
  "textAlign",
  "color",
  "backgroundColor",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "filter",
  "backdropFilter",
  "opacity",
  "display",
  "justifyContent",
  "alignItems",
  "transform",
  "transformOrigin",
  "rotate",
  "whiteSpace",
  "wordBreak",
] as const;

const v2_LOCKED_STYLE_PROPERTY_KEYS = new Set<string>(["zIndex"]);

const v2_CARD_NODE_VISIBILITY_OPTIONS: Array<{
  value: V2TemplateVisibilityMode;
  label: string;
}> = [
  { value: "always", label: "항상 표시" },
  { value: "onlineOnly", label: "온라인만" },
  { value: "offlineOnly", label: "오프라인만" },
];

const v2_FIXED_CARD_NODE_IDS = new Set([
  "streaming-day",
  "streaming-date",
  "streaming-time",
  "main-title",
  "sub-title",
]);

type V2StyleSectionKey =
  | "grid"
  | "weekFlag"
  | "topObjectContainer"
  | "profileImage"
  | "profileFrame"
  | "cardStreamingDay"
  | "cardStreamingDate"
  | "cardStreamingTime"
  | "cardMainTitleContainer"
  | "cardSubTitleContainer"
  | "cardContainer"
  | "streamingDayStyle"
  | "streamingDateStyle"
  | "streamingTimeStyle"
  | "mainTitleWrapperStyle"
  | "mainTitleTextStyle"
  | "subTitleTextStyle";
type V2StyleSectionId = V2StyleSectionKey | string;

type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";
type V2BoilerplateFieldType = "number" | "text" | "select";
type V2GridLayoutMode = "grid3x3" | "flex4x2";
type V2Flex42Align = "left" | "center" | "right";
type V2Flex42ThreeRow = "top" | "bottom";

const v2_ALIGNMENT_HORIZONTAL_ORDER: V2HorizontalAlign[] = [
  "left",
  "center",
  "right",
];
const v2_ALIGNMENT_VERTICAL_ORDER: V2VerticalAlign[] = [
  "top",
  "center",
  "bottom",
];
const v2_HORIZONTAL_ALIGN_LABELS: Record<V2HorizontalAlign, string> = {
  left: "좌측",
  center: "중앙",
  right: "우측",
};
const v2_VERTICAL_ALIGN_LABELS: Record<V2VerticalAlign, string> = {
  top: "상단",
  center: "중앙",
  bottom: "하단",
};

interface V2BoilerplateFieldConfig {
  key: string;
  label: string;
  type?: V2BoilerplateFieldType;
  options?: ReadonlyArray<{ label: string; value: string }>;
  placeholder?: string;
  step?: string;
}

interface V2BoilerplateGroupConfig {
  id: string;
  label: string;
  fields: V2BoilerplateFieldConfig[];
}

interface V2TemplateBuilderFormProps {
  focusStyleSection?: string | null;
  focusStyleSectionNonce?: number;
}

const v2_DEFAULT_STYLE_SECTION_BOILERPLATES: Partial<
  Record<V2StyleSectionKey, Record<string, string | number>>
> = {
  grid: {
    layoutMode: "grid3x3",
    flex42ThreeRow: "bottom",
    flex42Align: "center",
    left: 32,
    top: 96,
    rowGap: 8,
    columnGap: 20,
    columns: 3,
  },
  weekFlag: {
    top: 564,
    left: 1556,
    width: 580,
    height: 120,
    fontSize: 76,
    fontWeight: 700,
  },
  topObjectContainer: {
    position: "absolute",
    width: 4000,
    height: 2250,
    zIndex: 30,
  },
  profileImage: {
    top: 516,
    left: 2400,
    width: 1540,
    height: 1540,
    zIndex: 10,
  },
  profileFrame: {
    position: "absolute",
    width: 4000,
    height: 2250,
    zIndex: 20,
  },
  cardStreamingDay: {
    top: 0,
    left: 0,
    width: 160,
    height: 100,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingLeft: 8,
  },
  cardStreamingDate: {
    width: 160,
    height: 100,
    position: "absolute",
    top: -16,
    left: -24,
    zIndex: 10,
  },
  cardStreamingTime: {
    width: 252,
    height: 40,
    top: 508,
  },
  cardMainTitleContainer: {
    height: 280,
    widthPercent: 100,
    top: 132,
  },
  cardSubTitleContainer: {
    widthPercent: 100,
    height: 64,
    top: 440,
  },
  cardContainer: {
    width: 600,
    height: 504,
    top: 68,
    left: 10,
  },
  streamingDayStyle: {
    fontSize: 56,
    fontWeight: 700,
    lineHeight: 1,
    textAlign: "left",
  },
  streamingDateStyle: {
    fontSize: 68,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: 3,
    rotate: "-14deg",
    textAlign: "center",
  },
  streamingTimeStyle: {
    fontSize: 31,
    fontWeight: 400,
    lineHeight: 1,
    textAlign: "center",
  },
  mainTitleWrapperStyle: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  mainTitleTextStyle: {
    lineHeight: 1.2,
    fontWeight: 700,
    textAlign: "center",
  },
  subTitleTextStyle: {
    lineHeight: 1,
    fontWeight: 400,
    textAlign: "center",
  },
};

const v2_STYLE_SECTION_LABELS: Record<V2StyleSectionKey, string> = {
  grid: "Grid",
  weekFlag: "WeekFlag",
  topObjectContainer: "TopObject",
  profileImage: "ProfileImage",
  profileFrame: "ProfileFrame",
  cardStreamingDay: "Card.StreamingDay",
  cardStreamingDate: "Card.StreamingDate",
  cardStreamingTime: "Card.StreamingTime",
  cardMainTitleContainer: "Card.MainTitleContainer",
  cardSubTitleContainer: "Card.SubTitleContainer",
  cardContainer: "Card.Container",
  streamingDayStyle: "StreamingDay.TextStyle",
  streamingDateStyle: "StreamingDate.TextStyle",
  streamingTimeStyle: "StreamingTime.TextStyle",
  mainTitleWrapperStyle: "MainTitle.WrapperStyle",
  mainTitleTextStyle: "MainTitle.TextStyle",
  subTitleTextStyle: "SubTitle.TextStyle",
};

const v2_STYLE_SECTION_ORDER: V2StyleSectionKey[] = [
  "grid",
  "weekFlag",
  "topObjectContainer",
  "profileImage",
  "profileFrame",
  "cardStreamingDay",
  "streamingDayStyle",
  "cardStreamingDate",
  "streamingDateStyle",
  "cardStreamingTime",
  "streamingTimeStyle",
  "cardMainTitleContainer",
  "mainTitleWrapperStyle",
  "mainTitleTextStyle",
  "cardSubTitleContainer",
  "subTitleTextStyle",
  "cardContainer",
];

const v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP: Record<
  V2StyleSectionKey,
  V2TemplateHighlightTarget
> = {
  grid: "grid",
  weekFlag: "weekFlag",
  topObjectContainer: "topObjectContainer",
  profileImage: "profileImage",
  profileFrame: "profileFrame",
  cardStreamingDay: "cardStreamingDay",
  cardStreamingDate: "cardStreamingDate",
  cardStreamingTime: "cardStreamingTime",
  cardMainTitleContainer: "cardMainTitleContainer",
  cardSubTitleContainer: "cardSubTitleContainer",
  cardContainer: "cardContainer",
  streamingDayStyle: "cardStreamingDay",
  streamingDateStyle: "cardStreamingDate",
  streamingTimeStyle: "cardStreamingTime",
  mainTitleWrapperStyle: "cardMainTitleContainer",
  mainTitleTextStyle: "cardMainTitleContainer",
  subTitleTextStyle: "cardSubTitleContainer",
};

const v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP: Partial<
  Record<V2StyleSectionKey, keyof V2TemplateRenderConfig["layout"]>
> = {
  grid: "grid",
  weekFlag: "weekFlag",
  topObjectContainer: "topObjectContainer",
  profileImage: "profileImage",
  profileFrame: "profileFrame",
};

const v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP: Partial<
  Record<V2StyleSectionKey, keyof V2TemplateRenderConfig["layout"]["card"]>
> = {
  cardStreamingDay: "streamingDay",
  cardStreamingDate: "streamingDate",
  cardStreamingTime: "streamingTime",
  cardMainTitleContainer: "mainTitleContainer",
  cardSubTitleContainer: "subTitleContainer",
  cardContainer: "container",
  streamingDayStyle: "streamingDayStyle",
  streamingDateStyle: "streamingDateStyle",
  streamingTimeStyle: "streamingTimeStyle",
  mainTitleWrapperStyle: "mainTitleWrapperStyle",
  mainTitleTextStyle: "mainTitleTextStyle",
  subTitleTextStyle: "subTitleTextStyle",
};

const v2_HIGHLIGHT_TARGET_LABELS: Record<V2TemplateHighlightTarget, string> = {
  grid: "Grid",
  weekFlag: "WeekFlag",
  topObjectContainer: "TopObject",
  profileImage: "Profile Image",
  profileFrame: "Profile Frame",
  cardStreamingDay: "Card / StreamingDay",
  cardStreamingDate: "Card / StreamingDate",
  cardStreamingTime: "Card / StreamingTime",
  cardMainTitleContainer: "Card / MainTitle",
  cardSubTitleContainer: "Card / SubTitle",
  cardContainer: "Card Container",
};

const v2_collectStructureTargetSectionMaps = (
  nodes: V2TemplateLayerNode[]
): {
  targetToSection: Record<string, V2StyleSectionId>;
  sectionToTarget: Record<V2StyleSectionId, V2TemplateHighlightTarget>;
  sectionToLabel: Record<V2StyleSectionId, string>;
} => {
  const targetToSection: Record<string, V2StyleSectionId> = {};
  const sectionToTarget: Record<V2StyleSectionId, V2TemplateHighlightTarget> = {};
  const sectionToLabel: Record<V2StyleSectionId, string> = {};

  const visit = (nodeList: V2TemplateLayerNode[]) => {
    nodeList.forEach((node) => {
      if (node.target && node.sectionKey) {
        const section = node.sectionKey;
        targetToSection[node.target] = section;
        if (!sectionToTarget[section]) {
          sectionToTarget[section] = node.target;
        }
        if (!sectionToLabel[section]) {
          sectionToLabel[section] = node.label;
        }
      }
      if (node.children?.length) {
        visit(node.children);
      }
    });
  };

  visit(nodes);
  return {
    targetToSection,
    sectionToTarget,
    sectionToLabel,
  };
};

const v2_HORIZONTAL_ALIGN_TO_JUSTIFY: Record<V2HorizontalAlign, string> = {
  left: "flex-start",
  center: "center",
  right: "flex-end",
};

const v2_JUSTIFY_TO_HORIZONTAL_ALIGN: Partial<Record<string, V2HorizontalAlign>> = {
  "flex-start": "left",
  center: "center",
  "flex-end": "right",
};

const v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS: Record<V2VerticalAlign, string> = {
  top: "flex-start",
  center: "center",
  bottom: "flex-end",
};

const v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN: Partial<Record<string, V2VerticalAlign>> = {
  "flex-start": "top",
  center: "center",
  "flex-end": "bottom",
};

const v2_BOILERPLATE_SELECT_OPTIONS = {
  position: [
    { label: "absolute", value: "absolute" },
    { label: "relative", value: "relative" },
    { label: "fixed", value: "fixed" },
    { label: "sticky", value: "sticky" },
    { label: "static", value: "static" },
  ],
  display: [
    { label: "block", value: "block" },
    { label: "flex", value: "flex" },
    { label: "grid", value: "grid" },
    { label: "inline-block", value: "inline-block" },
    { label: "inline", value: "inline" },
    { label: "none", value: "none" },
  ],
  justifyContent: [
    { label: "flex-start", value: "flex-start" },
    { label: "center", value: "center" },
    { label: "flex-end", value: "flex-end" },
    { label: "space-between", value: "space-between" },
    { label: "space-around", value: "space-around" },
    { label: "space-evenly", value: "space-evenly" },
  ],
  alignItems: [
    { label: "flex-start", value: "flex-start" },
    { label: "center", value: "center" },
    { label: "flex-end", value: "flex-end" },
    { label: "stretch", value: "stretch" },
    { label: "baseline", value: "baseline" },
  ],
  textAlign: [
    { label: "left", value: "left" },
    { label: "center", value: "center" },
    { label: "right", value: "right" },
    { label: "start", value: "start" },
    { label: "end", value: "end" },
  ],
  whiteSpace: [
    { label: "normal", value: "normal" },
    { label: "nowrap", value: "nowrap" },
    { label: "pre-line", value: "pre-line" },
  ],
  wordBreak: [
    { label: "normal", value: "normal" },
    { label: "break-all", value: "break-all" },
    { label: "keep-all", value: "keep-all" },
    { label: "break-word", value: "break-word" },
  ],
  borderStyle: [
    { label: "none", value: "none" },
    { label: "solid", value: "solid" },
    { label: "dashed", value: "dashed" },
    { label: "dotted", value: "dotted" },
    { label: "double", value: "double" },
  ],
};

const v2_BOILERPLATE_NUMERIC_KEYS = new Set([
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "borderWidth",
  "borderRadius",
  "rowGap",
  "columnGap",
  "columns",
  "zIndex",
  "opacity",
  "widthPercent",
  "rotateDeg",
  "gap",
]);

const v2_BOILERPLATE_SECTION_GROUPS: Record<
  V2StyleSectionKey,
  V2BoilerplateGroupConfig[]
> = {
  grid: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "right", label: "Right" },
        { key: "left", label: "Left" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "zIndex", label: "Z-index" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "columns", label: "Columns" },
        { key: "gridTemplateColumns", label: "Grid Template Columns", type: "text", placeholder: "repeat(3, minmax(0, 1fr))" },
        { key: "rowGap", label: "Row Gap" },
        { key: "columnGap", label: "Column Gap" },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  weekFlag: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "zIndex", label: "Z-index" },
      ],
    },
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#A7A7A7" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
      ],
    },
  ],
  topObjectContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "zIndex", label: "Z-index" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "transformOrigin", label: "Transform Origin", type: "text", placeholder: "center center" },
      ],
    },
  ],
  profileImage: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "zIndex", label: "Z-index" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "transformOrigin", label: "Transform Origin", type: "text", placeholder: "center center" },
      ],
    },
  ],
  profileFrame: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "zIndex", label: "Z-index" },
        { key: "opacity", label: "Opacity", step: "0.01" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
      ],
    },
  ],
  cardStreamingDay: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "marginTop", label: "Margin Top" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardStreamingDate: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
        { key: "marginTop", label: "Margin Top" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardStreamingTime: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardMainTitleContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "widthPercent", label: "Width (%)", step: "0.1" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardSubTitleContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "widthPercent", label: "Width (%)", step: "0.1" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
      ],
    },
  ],
  cardContainer: [
    {
      id: "transform",
      label: "Transform",
      fields: [
        { key: "position", label: "Position", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.position },
        { key: "top", label: "Top" },
        { key: "left", label: "Left" },
        { key: "right", label: "Right" },
        { key: "bottom", label: "Bottom" },
        { key: "rotateDeg", label: "Rotate (deg)", step: "0.1" },
        { key: "width", label: "Width" },
        { key: "height", label: "Height" },
      ],
    },
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "marginTop", label: "Margin Top" },
        { key: "marginLeft", label: "Margin Left" },
        { key: "paddingTop", label: "Padding Top" },
        { key: "paddingRight", label: "Padding Right" },
        { key: "paddingBottom", label: "Padding Bottom" },
        { key: "paddingLeft", label: "Padding Left" },
      ],
    },
  ],
  streamingDayStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  streamingDateStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  streamingTimeStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#FFFFFF" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  mainTitleWrapperStyle: [
    {
      id: "layout",
      label: "Layout",
      fields: [
        { key: "display", label: "Display", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.display },
        { key: "justifyContent", label: "Justify", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.justifyContent },
        { key: "alignItems", label: "Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.alignItems },
        { key: "gap", label: "Gap" },
        { key: "paddingTop", label: "Padding Top" },
        { key: "paddingRight", label: "Padding Right" },
        { key: "paddingBottom", label: "Padding Bottom" },
        { key: "paddingLeft", label: "Padding Left" },
      ],
    },
  ],
  mainTitleTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#86889B" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
  subTitleTextStyle: [
    {
      id: "typography",
      label: "Typography",
      fields: [
        { key: "fontFamily", label: "Font Family", type: "text" },
        { key: "fontSize", label: "Font Size" },
        { key: "fontWeight", label: "Font Weight" },
        { key: "lineHeight", label: "Line Height", step: "0.1" },
        { key: "letterSpacing", label: "Letter Spacing", step: "0.1" },
        { key: "textAlign", label: "Text Align", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.textAlign },
        { key: "color", label: "Color", type: "text", placeholder: "#BBBBBB" },
        { key: "whiteSpace", label: "White Space", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.whiteSpace },
        { key: "wordBreak", label: "Word Break", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.wordBreak },
      ],
    },
  ],
};

const v2_BOILERPLATE_GROUP_ICON_MAP: Record<string, LucideIcon> = {
  transform: Move,
  transformMisc: Move,
  position: Move,
  size: Ruler,
  layer: Layers,
  motion: RotateCw,
  layout: LayoutGrid,
  spacing: SlidersHorizontal,
  typography: Type,
  fill: Palette,
  stroke: Square,
  effects: SlidersHorizontal,
};

const v2_BOILERPLATE_FIELD_ICON_MAP: Record<string, LucideIcon> = {
  position: Move,
  top: ArrowUp,
  right: ArrowRight,
  bottom: ArrowDown,
  left: ArrowLeft,
  width: Ruler,
  widthPercent: Percent,
  minWidth: Ruler,
  maxWidth: Ruler,
  height: Ruler,
  minHeight: Ruler,
  maxHeight: Ruler,
  marginTop: ArrowUp,
  marginRight: ArrowRight,
  marginBottom: ArrowDown,
  marginLeft: ArrowLeft,
  paddingTop: ArrowUp,
  paddingRight: ArrowRight,
  paddingBottom: ArrowDown,
  paddingLeft: ArrowLeft,
  rowGap: Rows3,
  columnGap: Columns3,
  gap: SlidersHorizontal,
  columns: Columns3,
  gridTemplateColumns: Grid3X3,
  display: LayoutGrid,
  justifyContent: AlignHorizontalJustifyCenter,
  alignItems: AlignVerticalJustifyCenter,
  textAlign: AlignHorizontalJustifyCenter,
  fontFamily: Type,
  fontSize: Text,
  fontWeight: Hash,
  lineHeight: Rows3,
  letterSpacing: Columns3,
  color: Palette,
  backgroundColor: Palette,
  borderWidth: Square,
  borderStyle: Square,
  borderColor: Square,
  borderRadius: Square,
  boxShadow: SlidersHorizontal,
  filter: SlidersHorizontal,
  backdropFilter: SlidersHorizontal,
  opacity: SlidersHorizontal,
  zIndex: Layers,
  rotateDeg: RotateCw,
  transform: RotateCw,
  transformOrigin: Move,
  whiteSpace: Braces,
  wordBreak: Braces,
};

const v2_getBoilerplateFieldIcon = (
  field: V2BoilerplateFieldConfig,
  groupId: string
): LucideIcon => {
  const mapped = v2_BOILERPLATE_FIELD_ICON_MAP[field.key];
  if (mapped) return mapped;
  return v2_BOILERPLATE_GROUP_ICON_MAP[groupId] ?? SlidersHorizontal;
};

const v2_STYLE_GROUP_DISPLAY_LABEL: Record<string, string> = {
  transform: "Position",
  transformMisc: "Transform",
  position: "Position",
  size: "Size",
  layer: "Layer",
  motion: "Transform",
  layout: "Auto layout",
  spacing: "Spacing",
  typography: "Appearance",
  fill: "Fill",
  stroke: "Stroke",
  effects: "Effects",
};

const v2_STYLE_EXTENSION_GROUPS: V2BoilerplateGroupConfig[] = [
  {
    id: "fill",
    label: "Fill",
    fields: [{ key: "backgroundColor", label: "Background Color", type: "text", placeholder: "#FFFFFF" }],
  },
  {
    id: "stroke",
    label: "Stroke",
    fields: [
      { key: "borderWidth", label: "Border Width" },
      { key: "borderStyle", label: "Border Style", type: "select", options: v2_BOILERPLATE_SELECT_OPTIONS.borderStyle },
      { key: "borderColor", label: "Border Color", type: "text", placeholder: "#000000" },
      { key: "borderRadius", label: "Border Radius" },
    ],
  },
  {
    id: "effects",
    label: "Effects",
    fields: [
      { key: "boxShadow", label: "Box Shadow", type: "text", placeholder: "0 8px 24px rgba(0,0,0,0.2)" },
      { key: "filter", label: "Filter", type: "text", placeholder: "blur(4px)" },
      { key: "backdropFilter", label: "Backdrop Filter", type: "text", placeholder: "blur(6px)" },
    ],
  },
];

const v2_STYLE_EXTENSION_GROUP_IDS = new Set(["fill", "stroke", "effects"]);

const v2_STYLE_EXTENSION_DEFAULT_VALUES: Record<
  string,
  Record<string, string | number>
> = {
  fill: {
    backgroundColor: "#FFFFFF",
  },
  stroke: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#000000",
  },
  effects: {
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
};

const v2_FIELD_CATEGORY_ORDER = {
  position: ["position", "top", "bottom", "left", "right", "rotateDeg"],
  size: [
    "width",
    "widthPercent",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
  ],
  layer: ["opacity"],
  motion: ["rotate", "transformOrigin", "transform"],
  layout: [
    "display",
    "columns",
    "gridTemplateColumns",
    "rowGap",
    "columnGap",
    "gap",
    "justifyContent",
    "alignItems",
  ],
  spacing: [
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "padding",
  ],
} as const;

const v2_parseGridLayoutMode = (value: unknown): V2GridLayoutMode => {
  return value === "flex4x2" ? "flex4x2" : "grid3x3";
};

const v2_parseFlex42Align = (value: unknown): V2Flex42Align => {
  if (value === "left" || value === "center" || value === "right") return value;
  return "center";
};

const v2_parseFlex42ThreeRow = (value: unknown): V2Flex42ThreeRow => {
  return value === "top" ? "top" : "bottom";
};

const v2_parseStyleSectionKey = (value: unknown): V2StyleSectionId | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const v2_isKnownStyleSectionKey = (
  value: string
): value is V2StyleSectionKey => {
  return value in v2_STYLE_SECTION_LABELS;
};

const v2_parseGridEmptySlot = (value: unknown): number | null => {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;

  if (!Number.isFinite(candidate)) return null;
  const rounded = Math.round(candidate);
  if (rounded < 1 || rounded > 9) return null;
  return rounded;
};

const v2_getGridEmptySlotsFromMap = (
  sectionMap: Record<string, string | number>
): number[] => {
  const slots = [
    v2_parseGridEmptySlot(sectionMap.gridEmptySlotA),
    v2_parseGridEmptySlot(sectionMap.gridEmptySlotB),
  ].filter((slot): slot is number => slot !== null);

  return Array.from(new Set(slots)).slice(0, 2);
};

const v2_POSITION_MUTEX_MAP: Partial<Record<string, string>> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const v2_hasRenderableStyleValue = (
  value: string | number | undefined
): boolean => {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

const v2_sortFieldsByOrder = (
  fields: V2BoilerplateFieldConfig[],
  order: readonly string[]
) => {
  return [...fields].sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

const v2_partitionFields = (
  fields: V2BoilerplateFieldConfig[],
  keys: readonly string[]
) => {
  const keySet = new Set(keys);
  return {
    picked: fields.filter((field) => keySet.has(field.key)),
    rest: fields.filter((field) => !keySet.has(field.key)),
  };
};

const v2_POSITION_CATEGORY_KEY_SET = new Set<string>(
  v2_FIELD_CATEGORY_ORDER.position
);
const v2_SIZE_CATEGORY_KEY_SET = new Set<string>(v2_FIELD_CATEGORY_ORDER.size);
const v2_LAYER_CATEGORY_KEY_SET = new Set<string>(v2_FIELD_CATEGORY_ORDER.layer);
const v2_MOTION_CATEGORY_KEY_SET = new Set<string>(
  v2_FIELD_CATEGORY_ORDER.motion
);

const v2_expandDisplayGroups = (
  groups: V2BoilerplateGroupConfig[]
): V2BoilerplateGroupConfig[] => {
  return groups.flatMap((group) => {
    if (group.id === "transform") {
      const position = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_POSITION_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.position
      );
      const size = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_SIZE_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.size
      );
      const layer = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_LAYER_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.layer
      );
      const motion = v2_sortFieldsByOrder(
        group.fields.filter((field) => v2_MOTION_CATEGORY_KEY_SET.has(field.key)),
        v2_FIELD_CATEGORY_ORDER.motion
      );

      const categorizedKeys = new Set<string>([
        ...v2_FIELD_CATEGORY_ORDER.position,
        ...v2_FIELD_CATEGORY_ORDER.size,
        ...v2_FIELD_CATEGORY_ORDER.layer,
        ...v2_FIELD_CATEGORY_ORDER.motion,
      ]);
      const rest = group.fields.filter((field) => !categorizedKeys.has(field.key));

      return [
        ...(position.length > 0
          ? [{ id: "position", label: "Position", fields: position }]
          : []),
        ...(size.length > 0 ? [{ id: "size", label: "Size", fields: size }] : []),
        ...(layer.length > 0
          ? [{ id: "layer", label: "Layer", fields: layer }]
          : []),
        ...(motion.length > 0
          ? [{ id: "motion", label: "Transform", fields: motion }]
          : []),
        ...(rest.length > 0
          ? [{ id: "transformMisc", label: "Transform", fields: rest }]
          : []),
      ];
    }

    if (group.id === "layout") {
      const { picked: spacing, rest: layoutRaw } = v2_partitionFields(
        group.fields,
        v2_FIELD_CATEGORY_ORDER.spacing
      );
      const layout = v2_sortFieldsByOrder(
        layoutRaw,
        v2_FIELD_CATEGORY_ORDER.layout
      );
      const spacingSorted = v2_sortFieldsByOrder(
        spacing,
        v2_FIELD_CATEGORY_ORDER.spacing
      );

      return [
        ...(layout.length > 0
          ? [{ id: "layout", label: "Auto layout", fields: layout }]
          : []),
        ...(spacingSorted.length > 0
          ? [{ id: "spacing", label: "Spacing", fields: spacingSorted }]
          : []),
      ];
    }

    return [group];
  });
};

const v2_BOILERPLATE_STORAGE_KEY =
  "v2-template-builder-style-boilerplates-v1";

const V2TemplateBuilderForm: React.FC<V2TemplateBuilderFormProps> = ({
  focusStyleSection = null,
  focusStyleSectionNonce = 0,
}) => {
  const { renderConfig, setRenderConfig } = useV2TemplateRenderConfigContext();
  const {
    data,
    updateData,
    currentTheme,
    updateTheme,
    resetData,
    setHoverHighlightTarget,
    setActiveHighlightTarget,
  } = useV2TimeTableEditorRuntimeContext();
  const { actions } = useTimeTable();

  const [activeTab, setActiveTab] = useState<V2BuilderTab>("canvas");
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [assetTheme, setAssetTheme] = useState<string>(
    renderConfig.defaultTheme || "first"
  );
  const [boilerplateConfig, setBoilerplateConfig] = useState<
    Partial<Record<V2StyleSectionKey, Record<string, string | number>>>
  >(() =>
    JSON.parse(
      JSON.stringify(v2_DEFAULT_STYLE_SECTION_BOILERPLATES)
    ) as Partial<Record<V2StyleSectionKey, Record<string, string | number>>>
  );
  const [boilerplateTarget, setBoilerplateTarget] =
    useState<V2StyleSectionKey>("grid");
  const [isBoilerplateSettingsOpen, setIsBoilerplateSettingsOpen] =
    useState(false);
  const [styleGroupExpanded, setStyleGroupExpanded] = useState<
    Record<string, boolean>
  >({});
  const [formSchemaError, setFormSchemaError] = useState<string | null>(null);
  const [newFieldDraftByNodeId, setNewFieldDraftByNodeId] = useState<
    Record<string, { key: string; scope: V2TemplateFieldScope }>
  >({});
  const inspectorTabRef = useRef<HTMLDivElement | null>(null);
  const [selectedPropertiesTarget, setSelectedPropertiesTarget] =
    useState<V2TemplateHighlightTarget>("grid");
  const structurePropertiesMaps = useMemo(
    () => v2_collectStructureTargetSectionMaps(renderConfig.structure.layers),
    [renderConfig.structure.layers]
  );
  const selectedPropertiesSection = useMemo(() => {
    return structurePropertiesMaps.targetToSection[selectedPropertiesTarget] ?? null;
  }, [selectedPropertiesTarget, structurePropertiesMaps.targetToSection]);
  const selectedPropertiesLabel = useMemo(() => {
    if (!selectedPropertiesSection) {
      return v2_HIGHLIGHT_TARGET_LABELS[selectedPropertiesTarget];
    }
    const knownSection = v2_isKnownStyleSectionKey(selectedPropertiesSection)
      ? selectedPropertiesSection
      : null;
    return (
      structurePropertiesMaps.sectionToLabel[selectedPropertiesSection] ??
      (knownSection
        ? v2_STYLE_SECTION_LABELS[knownSection]
        : selectedPropertiesSection)
    );
  }, [
    selectedPropertiesSection,
    selectedPropertiesTarget,
    structurePropertiesMaps.sectionToLabel,
  ]);
  const cardNodeByPropertiesSection = useMemo(() => {
    const map = new Map<string, V2TemplateCardNode>();
    Object.values(renderConfig.structure.card.nodes).forEach((node) => {
      const containerSection = v2_parseStyleSectionKey(node.containerStyleKey);
      if (containerSection && !map.has(containerSection)) {
        map.set(containerSection, node);
      }
      if (node.textStyleKey) {
        const textSection = v2_parseStyleSectionKey(node.textStyleKey);
        if (textSection && !map.has(textSection)) {
          map.set(textSection, node);
        }
      }
      if (node.wrapperStyleKey) {
        const wrapperSection = v2_parseStyleSectionKey(node.wrapperStyleKey);
        if (wrapperSection && !map.has(wrapperSection)) {
          map.set(wrapperSection, node);
        }
      }
    });
    return map;
  }, [renderConfig.structure.card.nodes]);
  const formSchemaDiagnostics = useMemo(() => {
    const fields = renderConfig.formSchema.fields;
    const fieldIdSet = new Set(
      fields.map((field) => `${field.scope}:${field.key}`)
    );
    const fieldUsageMap = new Map<string, number>();
    fields.forEach((field) => {
      fieldUsageMap.set(`${field.scope}:${field.key}`, 0);
    });

    const missingBindings: Array<{ nodeLabel: string; scope: string; key: string }> = [];
    Object.values(renderConfig.structure.card.nodes).forEach((node) => {
      if (node.binding.mode !== "field") return;
      const fieldId = `${node.binding.scope}:${node.binding.key}`;
      if (!fieldIdSet.has(fieldId)) {
        missingBindings.push({
          nodeLabel: node.label,
          scope: node.binding.scope,
          key: node.binding.key,
        });
        return;
      }
      fieldUsageMap.set(fieldId, (fieldUsageMap.get(fieldId) ?? 0) + 1);
    });

    const unusedFields = fields.filter((field) => {
      const fieldId = `${field.scope}:${field.key}`;
      return (fieldUsageMap.get(fieldId) ?? 0) === 0;
    });

    return {
      totalFields: fields.length,
      missingBindings,
      unusedFields,
    };
  }, [renderConfig.formSchema.fields, renderConfig.structure.card.nodes]);

  useEffect(() => {
    if (activeTab !== "style" && activeTab !== "properties") {
      setHoverHighlightTarget(null);
      setActiveHighlightTarget(null);
    }
  }, [activeTab, setActiveHighlightTarget, setHoverHighlightTarget]);

  useEffect(() => {
    if (activeTab !== "style" && activeTab !== "properties") return;

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (inspectorTabRef.current?.contains(target)) return;
      setActiveHighlightTarget(null);
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [activeTab, setActiveHighlightTarget]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(v2_BOILERPLATE_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;

      const nextConfig: Partial<
        Record<V2StyleSectionKey, Record<string, string | number>>
      > = JSON.parse(JSON.stringify(v2_DEFAULT_STYLE_SECTION_BOILERPLATES));

      Object.entries(parsed).forEach(([rawSection, value]) => {
        const section = v2_parseStyleSectionKey(rawSection);
        if (!section) return;
        if (!v2_isKnownStyleSectionKey(section)) return;
        if (!value || typeof value !== "object" || Array.isArray(value)) return;

        const sanitized: Record<string, string | number> = {};
        Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
          if (typeof item === "string") {
            sanitized[key] = item;
            return;
          }
          if (typeof item === "number" && Number.isFinite(item)) {
            sanitized[key] = item;
          }
        });

        nextConfig[section] = sanitized;
      });

      setBoilerplateConfig(nextConfig);
    } catch (error) {
      console.error("Failed to restore style boilerplates", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        v2_BOILERPLATE_STORAGE_KEY,
        JSON.stringify(boilerplateConfig)
      );
    } catch (error) {
      console.error("Failed to persist style boilerplates", error);
    }
  }, [boilerplateConfig]);

  useEffect(() => {
    if (!isBoilerplateSettingsOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBoilerplateSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isBoilerplateSettingsOpen]);

  useEffect(() => {
    const nextSection = v2_parseStyleSectionKey(focusStyleSection);
    if (!nextSection) return;
    const knownSection = v2_isKnownStyleSectionKey(nextSection)
      ? nextSection
      : null;
    const nextTarget =
      structurePropertiesMaps.sectionToTarget[nextSection] ??
      (knownSection
        ? v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP[knownSection]
        : "cardContainer");
    setSelectedPropertiesTarget(nextTarget);
    setActiveHighlightTarget(nextTarget);
    setActiveTab("properties");
  }, [
    focusStyleSection,
    focusStyleSectionNonce,
    setActiveHighlightTarget,
    structurePropertiesMaps.sectionToTarget,
  ]);

  const safeUpdateConfig = (
    updater: (prev: typeof renderConfig) => typeof renderConfig
  ) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => updater(prev));
  };

  const updateFormSchema = (
    updater: (prev: typeof renderConfig.formSchema) => typeof renderConfig.formSchema
  ) => {
    safeUpdateConfig((prev) => {
      const nextFormSchema = updater(prev.formSchema);
      return {
        ...prev,
        formSchema: nextFormSchema,
        cardInputConfig: v2_toLegacyCardInputConfig(nextFormSchema),
      };
    });
  };

  const hasDuplicatedFormFieldKey = (
    key: string,
    excludeIndex?: number,
    fields = renderConfig.formSchema.fields
  ): boolean => {
    const normalized = key.trim();
    if (!normalized) return false;
    return fields.some(
      (field, index) => field.key === normalized && index !== excludeIndex
    );
  };

  const updateFormFieldAt = (
    index: number,
    patch: Partial<V2TemplateFormField>
  ) => {
    safeUpdateConfig((prev) => {
      const prevField = prev.formSchema.fields[index];
      if (!prevField) return prev;

      const nextKey = (patch.key ?? prevField.key).trim();
      if (!nextKey) {
        setFormSchemaError("필드 키는 비워둘 수 없습니다.");
        return prev;
      }

      if (hasDuplicatedFormFieldKey(nextKey, index, prev.formSchema.fields)) {
        setFormSchemaError(`중복된 필드 키입니다: ${nextKey}`);
        return prev;
      }

      setFormSchemaError(null);

      const nextField: V2TemplateFormField = {
        ...prevField,
        ...patch,
        key: nextKey,
      };
      const nextFields = [...prev.formSchema.fields];
      nextFields[index] = nextField;
      const nextNodes = Object.fromEntries(
        Object.entries(prev.structure.card.nodes).map(([nodeId, node]) => {
          const shouldRewriteBinding =
            node.binding.mode === "field" &&
            node.binding.scope === prevField.scope &&
            node.binding.key === prevField.key;
          if (!shouldRewriteBinding) return [nodeId, node];
          return [
            nodeId,
            {
              ...node,
              binding: {
                mode: "field" as const,
                scope: nextField.scope,
                key: nextField.key,
              },
            },
          ];
        })
      );
      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };

      return {
        ...prev,
        formSchema: nextFormSchema,
        cardInputConfig: v2_toLegacyCardInputConfig(nextFormSchema),
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: nextNodes,
          },
        },
      };
    });
  };

  const appendFormField = (
    seed?: Partial<V2TemplateFormField>
  ): V2TemplateFormField | null => {
    const rawKey = seed?.key?.trim() ?? "";
    const key =
      rawKey.length > 0
        ? rawKey
        : `field${renderConfig.formSchema.fields.length + 1}`;

    if (hasDuplicatedFormFieldKey(key)) {
      setFormSchemaError(`중복된 필드 키입니다: ${key}`);
      return null;
    }

    const newField: V2TemplateFormField = {
      key,
      scope: seed?.scope ?? "entry",
      type: seed?.type ?? "text",
      placeholder: seed?.placeholder ?? key,
      ...(seed?.label ? { label: seed.label } : {}),
      ...(seed?.defaultValue !== undefined
        ? { defaultValue: seed.defaultValue }
        : {}),
      ...(typeof seed?.required === "boolean"
        ? { required: seed.required }
        : {}),
    };

    setFormSchemaError(null);
    updateFormSchema((prevFormSchema) => ({
      ...prevFormSchema,
      fields: [...prevFormSchema.fields, newField],
    }));
    return newField;
  };

  const removeFormFieldAt = (index: number) => {
    const targetField = renderConfig.formSchema.fields[index];
    if (!targetField) return;

    const linkedNodeIds = Object.values(renderConfig.structure.card.nodes)
      .filter(
        (node) =>
          node.binding.mode === "field" &&
          node.binding.key === targetField.key &&
          node.binding.scope === targetField.scope
      )
      .map((node) => node.id);

    if (linkedNodeIds.length > 0) {
      const confirmed = window.confirm(
        `이 필드는 ${linkedNodeIds.length}개 오브젝트에서 사용 중입니다. 삭제하면 해당 바인딩이 비워집니다. 계속할까요?`
      );
      if (!confirmed) return;
    }

    setFormSchemaError(null);
    safeUpdateConfig((prev) => {
      const nextFields = prev.formSchema.fields.filter((_, i) => i !== index);
      const nextNodes = Object.fromEntries(
        Object.entries(prev.structure.card.nodes).map(([nodeId, node]) => {
          const shouldResetBinding =
            node.binding.mode === "field" &&
            node.binding.key === targetField.key &&
            node.binding.scope === targetField.scope;
          if (!shouldResetBinding) return [nodeId, node];
          return [
            nodeId,
            {
              ...node,
              binding: {
                mode: "literal" as const,
                value: "",
              },
            },
          ];
        })
      );

      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };

      return {
        ...prev,
        formSchema: nextFormSchema,
        cardInputConfig: v2_toLegacyCardInputConfig(nextFormSchema),
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: nextNodes,
          },
        },
      };
    });
  };

  const themeOptions = useMemo(() => {
    const base = renderConfig.themes?.length
      ? renderConfig.themes
      : [renderConfig.defaultTheme || "first"];

    if (!base.includes(renderConfig.defaultTheme)) {
      return [...base, renderConfig.defaultTheme];
    }

    return base;
  }, [renderConfig.defaultTheme, renderConfig.themes]);

  const fontTokenOptions = useMemo(() => {
    const baseTokens = ["primary", "secondary", "tertiary", "quaternary"];
    const registryKeys = Object.keys(renderConfig.fonts.registry ?? {});
    return Array.from(new Set([...baseTokens, ...registryKeys]));
  }, [renderConfig.fonts.registry]);

  const updateTemplateSize = (key: "width" | "height", value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      templateSize: {
        ...prev.templateSize,
        [key]: Math.round(value),
      },
      cardSizes: {
        ...prev.cardSizes,
        frame: {
          ...prev.cardSizes.frame,
          [key]: Math.round(value),
        },
      },
      layout: {
        ...prev.layout,
        topObjectContainer: {
          ...prev.layout.topObjectContainer,
          [key]: Math.round(value),
        },
      },
    }));
  };

  const getStyleSectionMap = (
    section: V2StyleSectionId
  ): Record<string, string | number> => {
    const knownSection = v2_isKnownStyleSectionKey(section) ? section : null;
    const rootLayoutKey = knownSection
      ? v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP[knownSection]
      : undefined;
    if (rootLayoutKey) {
      return (
        (renderConfig.layout[rootLayoutKey] as Record<string, string | number>) ?? {}
      );
    }

    const cardLayoutKey = knownSection
      ? v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP[knownSection]
      : undefined;
    if (cardLayoutKey) {
      return (
        (renderConfig.layout.card[cardLayoutKey] as Record<
          string,
          string | number
        >) ?? {}
      );
    }

    const dynamicCardSection = renderConfig.layout.card[section];
    if (dynamicCardSection && typeof dynamicCardSection === "object") {
      return dynamicCardSection as Record<string, string | number>;
    }

    return {};
  };

  const parseStyleValue = (rawValue: string): string | number => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return "";
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  };

  const withExclusiveInsetValue = (
    currentMap: Record<string, string | number>,
    key: string,
    nextValue: string | number
  ) => {
    const nextMap: Record<string, string | number> = {
      ...currentMap,
      [key]: nextValue,
    };

    const counterpartKey = v2_POSITION_MUTEX_MAP[key];
    if (!counterpartKey) return nextMap;
    if (!v2_hasRenderableStyleValue(nextValue)) return nextMap;

    delete nextMap[counterpartKey];
    return nextMap;
  };

  const updateStyleSection = (
    section: V2StyleSectionId,
    nextMap: Record<string, string | number>
  ) => {
    safeUpdateConfig((prev) => {
      const knownSection = v2_isKnownStyleSectionKey(section) ? section : null;
      const rootLayoutKey = knownSection
        ? v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP[knownSection]
        : undefined;
      if (rootLayoutKey) {
        return {
          ...prev,
          layout: {
            ...prev.layout,
            [rootLayoutKey]: nextMap,
          },
        };
      }

      const cardLayoutKey = knownSection
        ? v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP[knownSection]
        : undefined;
      if (cardLayoutKey) {
        return {
          ...prev,
          layout: {
            ...prev.layout,
            card: {
              ...prev.layout.card,
              [cardLayoutKey]: nextMap,
            },
          },
        };
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: {
            ...prev.layout.card,
            [section]: nextMap,
          },
        },
      };
    });
  };

  const addStyleProperty = (section: V2StyleSectionId) => {
    const currentMap = getStyleSectionMap(section);
    const nextKey =
      v2_STYLE_PROPERTY_CATALOG.find(
        (property) =>
          !v2_LOCKED_STYLE_PROPERTY_KEYS.has(property) &&
          currentMap[property] === undefined
      ) ??
      `custom_${Object.keys(currentMap).length + 1}`;

    updateStyleSection(section, {
      ...currentMap,
      [nextKey]: "",
    });
  };

  const removeStyleProperty = (section: V2StyleSectionId, key: string) => {
    if (v2_LOCKED_STYLE_PROPERTY_KEYS.has(key)) return;
    const currentMap = getStyleSectionMap(section);
    const nextMap = { ...currentMap };
    delete nextMap[key];
    updateStyleSection(section, nextMap);
  };

  const updateStylePropertyValue = (
    section: V2StyleSectionId,
    key: string,
    rawValue: string
  ) => {
    if (v2_LOCKED_STYLE_PROPERTY_KEYS.has(key)) return;
    const currentMap = getStyleSectionMap(section);
    const nextValue = parseStyleValue(rawValue);
    updateStyleSection(
      section,
      withExclusiveInsetValue(currentMap, key, nextValue)
    );
  };

  const updateGridLayoutMode = (mode: V2GridLayoutMode) => {
    const currentMap = getStyleSectionMap("grid");
    updateStyleSection("grid", {
      ...currentMap,
      layoutMode: mode,
    });
  };

  const updateFlex42Align = (align: V2Flex42Align) => {
    const currentMap = getStyleSectionMap("grid");
    updateStyleSection("grid", {
      ...currentMap,
      flex42Align: align,
    });
  };

  const updateFlex42ThreeRow = (targetRow: V2Flex42ThreeRow) => {
    const currentMap = getStyleSectionMap("grid");
    updateStyleSection("grid", {
      ...currentMap,
      flex42ThreeRow: targetRow,
    });
  };

  const pickGridEmptySlot = (slot: number) => {
    const currentMap = getStyleSectionMap("grid");
    const currentSlots = v2_getGridEmptySlotsFromMap(currentMap);
    const isSelected = currentSlots.includes(slot);

    let nextSlots: number[];
    if (isSelected) {
      nextSlots = currentSlots.filter((value) => value !== slot);
    } else if (currentSlots.length < 2) {
      nextSlots = [...currentSlots, slot];
    } else {
      nextSlots = [currentSlots[1], slot];
    }

    const nextMap: Record<string, string | number> = {
      ...currentMap,
    };
    if (nextSlots[0] !== undefined) {
      nextMap.gridEmptySlotA = nextSlots[0];
    } else {
      delete nextMap.gridEmptySlotA;
    }
    if (nextSlots[1] !== undefined) {
      nextMap.gridEmptySlotB = nextSlots[1];
    } else {
      delete nextMap.gridEmptySlotB;
    }

    updateStyleSection("grid", nextMap);
  };

  const getHighlightTargetFromStyleSection = (
    section: V2StyleSectionId
  ): V2TemplateHighlightTarget => {
    const knownSection = v2_isKnownStyleSectionKey(section) ? section : null;
    return (
      structurePropertiesMaps.sectionToTarget[section] ??
      (knownSection
        ? v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP[knownSection]
        : "cardContainer")
    );
  };

  const setSectionHoverHighlight = (section: V2StyleSectionId) => {
    setHoverHighlightTarget(getHighlightTargetFromStyleSection(section));
  };

  const clearSectionHoverHighlight = () => {
    setHoverHighlightTarget(null);
  };

  const setSectionActiveHighlight = (section: V2StyleSectionId) => {
    setActiveHighlightTarget(getHighlightTargetFromStyleSection(section));
  };

  const isStyleGroupOpen = ({
    section,
    group,
    sectionMap,
  }: {
    section: V2StyleSectionId;
    group: V2BoilerplateGroupConfig;
    sectionMap: Record<string, string | number>;
  }) => {
    const stateKey = `${section}:${group.id}`;
    const explicit = styleGroupExpanded[stateKey];
    if (typeof explicit === "boolean") return explicit;

    const hasAnyValue = group.fields.some((field) => {
      const value = sectionMap[field.key];
      if (value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      return true;
    });

    if (hasAnyValue) return true;
    if (group.id === "fill" || group.id === "stroke" || group.id === "effects") {
      return false;
    }
    return true;
  };

  const toggleStyleGroupOpen = (
    section: V2StyleSectionId,
    groupId: string
  ) => {
    const stateKey = `${section}:${groupId}`;
    setStyleGroupExpanded((prev) => ({
      ...prev,
      [stateKey]: !(prev[stateKey] ?? false),
    }));
  };

  const applyStyleExtensionGroupDefaults = (
    section: V2StyleSectionId,
    groupId: string
  ) => {
    const defaults = v2_STYLE_EXTENSION_DEFAULT_VALUES[groupId];
    if (!defaults) return;

    const currentMap = getStyleSectionMap(section);
    const nextMap: Record<string, string | number> = { ...currentMap };

    Object.entries(defaults).forEach(([key, value]) => {
      const currentValue = nextMap[key];
      const isUnset =
        currentValue === undefined ||
        (typeof currentValue === "string" && currentValue.trim() === "");
      if (isUnset) {
        nextMap[key] = value;
      }
    });

    updateStyleSection(section, nextMap);

    const stateKey = `${section}:${groupId}`;
    setStyleGroupExpanded((prev) => ({
      ...prev,
      [stateKey]: true,
    }));
  };

  const getHorizontalAlignFromStyle = (
    wrapperMap: Record<string, string | number>,
    textMap: Record<string, string | number>
  ): V2HorizontalAlign => {
    const textAlignRaw = textMap.textAlign;
    if (
      textAlignRaw === "left" ||
      textAlignRaw === "center" ||
      textAlignRaw === "right"
    ) {
      return textAlignRaw;
    }

    const justifyRaw = wrapperMap.justifyContent;
    if (typeof justifyRaw === "string") {
      return v2_JUSTIFY_TO_HORIZONTAL_ALIGN[justifyRaw] ?? "center";
    }
    return "center";
  };

  const getVerticalAlignFromStyle = (
    wrapperMap: Record<string, string | number>
  ): V2VerticalAlign => {
    const alignItemsRaw = wrapperMap.alignItems;
    if (typeof alignItemsRaw === "string") {
      return v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN[alignItemsRaw] ?? "center";
    }
    return "center";
  };

  const updateAutoResizeHorizontalAlign = ({
    wrapperSection,
    textSection,
    align,
  }: {
    wrapperSection: V2StyleSectionId;
    textSection: V2StyleSectionId;
    align: V2HorizontalAlign;
  }) => {
    const wrapperMap = getStyleSectionMap(wrapperSection);
    const textMap = getStyleSectionMap(textSection);

    updateStyleSection(wrapperSection, {
      ...wrapperMap,
      justifyContent: v2_HORIZONTAL_ALIGN_TO_JUSTIFY[align],
    });

    updateStyleSection(textSection, {
      ...textMap,
      textAlign: align,
    });
  };

  const updateAutoResizeVerticalAlign = ({
    wrapperSection,
    align,
  }: {
    wrapperSection: V2StyleSectionId;
    align: V2VerticalAlign;
  }) => {
    const wrapperMap = getStyleSectionMap(wrapperSection);

    updateStyleSection(wrapperSection, {
      ...wrapperMap,
      alignItems: v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS[align],
    });
  };

  const getBoilerplateSectionMap = (section: V2StyleSectionKey) => {
    return boilerplateConfig[section] ?? {};
  };

  const updateBoilerplateSection = (
    section: V2StyleSectionKey,
    nextMap: Record<string, string | number>
  ) => {
    setBoilerplateConfig((prev) => ({
      ...prev,
      [section]: nextMap,
    }));
  };

  const addBoilerplateProperty = (section: V2StyleSectionKey) => {
    const currentMap = getBoilerplateSectionMap(section);
    let nextIndex = 1;
    while (currentMap[`custom_${nextIndex}`] !== undefined) {
      nextIndex += 1;
    }
    const nextKey = `custom_${nextIndex}`;

    updateBoilerplateSection(section, {
      ...currentMap,
      [nextKey]: "",
    });
  };

  const removeBoilerplateProperty = (section: V2StyleSectionKey, key: string) => {
    const currentMap = getBoilerplateSectionMap(section);
    const nextMap = { ...currentMap };
    delete nextMap[key];
    updateBoilerplateSection(section, nextMap);
  };

  const renameBoilerplateProperty = (
    section: V2StyleSectionKey,
    currentKey: string,
    nextKeyRaw: string
  ) => {
    const nextKey = nextKeyRaw.trim();
    if (!nextKey) return;
    if (v2_LOCKED_STYLE_PROPERTY_KEYS.has(nextKey)) return;

    const currentMap = getBoilerplateSectionMap(section);
    const value = currentMap[currentKey];
    const nextMap = { ...currentMap };
    delete nextMap[currentKey];
    nextMap[nextKey] = value;
    updateBoilerplateSection(section, nextMap);
  };

  const updateBoilerplatePropertyValue = (
    section: V2StyleSectionKey,
    key: string,
    rawValue: string
  ) => {
    if (v2_LOCKED_STYLE_PROPERTY_KEYS.has(key)) return;
    const currentMap = getBoilerplateSectionMap(section);
    const nextValue = parseStyleValue(rawValue);
    updateBoilerplateSection(
      section,
      withExclusiveInsetValue(currentMap, key, nextValue)
    );
  };

  const getBoilerplateFieldType = (
    field: V2BoilerplateFieldConfig
  ): V2BoilerplateFieldType => {
    if (field.type) return field.type;
    if (v2_BOILERPLATE_NUMERIC_KEYS.has(field.key)) return "number";
    return "text";
  };

  const getBoilerplateFieldStep = (field: V2BoilerplateFieldConfig) => {
    if (field.step) return field.step;
    if (field.key === "opacity") return "0.01";
    if (field.key === "lineHeight" || field.key === "letterSpacing") return "0.1";
    if (field.key === "rotateDeg") return "0.1";
    if (field.key === "widthPercent") return "0.1";
    return "1";
  };

  const resetBoilerplateSection = (section: V2StyleSectionKey) => {
    const defaults = v2_DEFAULT_STYLE_SECTION_BOILERPLATES[section] ?? {};
    updateBoilerplateSection(section, {
      ...(JSON.parse(
        JSON.stringify(defaults)
      ) as Record<string, string | number>),
    });
  };

  const getBoilerplateAutoResizePair = (
    section: V2StyleSectionKey
  ): { wrapperSection: V2StyleSectionKey; textSection: V2StyleSectionKey } | null => {
    if (section === "mainTitleWrapperStyle" || section === "mainTitleTextStyle") {
      return {
        wrapperSection: "mainTitleWrapperStyle",
        textSection: "mainTitleTextStyle",
      };
    }
    if (section === "cardSubTitleContainer" || section === "subTitleTextStyle") {
      return {
        wrapperSection: "cardSubTitleContainer",
        textSection: "subTitleTextStyle",
      };
    }
    return null;
  };

  const getBoilerplateHorizontalAlign = ({
    wrapperSection,
    textSection,
  }: {
    wrapperSection: V2StyleSectionKey;
    textSection: V2StyleSectionKey;
  }): V2HorizontalAlign => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    const textMap = getBoilerplateSectionMap(textSection);
    return getHorizontalAlignFromStyle(wrapperMap, textMap);
  };

  const getBoilerplateVerticalAlign = ({
    wrapperSection,
  }: {
    wrapperSection: V2StyleSectionKey;
  }): V2VerticalAlign => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    return getVerticalAlignFromStyle(wrapperMap);
  };

  const updateBoilerplateAutoResizeHorizontalAlign = ({
    wrapperSection,
    textSection,
    align,
  }: {
    wrapperSection: V2StyleSectionKey;
    textSection: V2StyleSectionKey;
    align: V2HorizontalAlign;
  }) => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    const textMap = getBoilerplateSectionMap(textSection);

    updateBoilerplateSection(wrapperSection, {
      ...wrapperMap,
      justifyContent: v2_HORIZONTAL_ALIGN_TO_JUSTIFY[align],
    });

    updateBoilerplateSection(textSection, {
      ...textMap,
      textAlign: align,
    });
  };

  const updateBoilerplateAutoResizeVerticalAlign = ({
    wrapperSection,
    align,
  }: {
    wrapperSection: V2StyleSectionKey;
    align: V2VerticalAlign;
  }) => {
    const wrapperMap = getBoilerplateSectionMap(wrapperSection);
    updateBoilerplateSection(wrapperSection, {
      ...wrapperMap,
      alignItems: v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS[align],
    });
  };

  const updateCardOptions = (
    optionKey: V2TemplateCardOptionsKey,
    patch: { maxFontSize?: number; multiline?: boolean }
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        card: {
          ...prev.layout.card,
          [optionKey]: {
            ...(prev.layout.card[optionKey] ?? {}),
            ...patch,
          },
        },
      },
    }));
  };

  const updateCardNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: {
                ...prevNode,
                visibilityMode,
              },
            },
          },
        },
      };
    });
  };

  const updateCardNodeBinding = (
    nodeId: string,
    binding: V2TemplateCardNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;
      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: {
                ...prevNode,
                binding,
              },
            },
          },
        },
      };
    });
  };

  const createFieldForNodeBinding = (node: V2TemplateCardNode) => {
    const draft = newFieldDraftByNodeId[node.id];
    const key = draft?.key?.trim();
    if (!key) {
      setFormSchemaError("새 필드 키를 입력해 주세요.");
      return;
    }
    const scope = draft?.scope ?? "entry";

    const field = appendFormField({
      key,
      scope,
      type: "text",
      placeholder: key,
      label: node.label,
      defaultValue: "",
    });
    if (!field) return;

    updateCardNodeBinding(node.id, {
      mode: "field",
      scope: field.scope,
      key: field.key,
    });

    setNewFieldDraftByNodeId((prev) => ({
      ...prev,
      [node.id]: {
        key: "",
        scope: "entry",
      },
    }));
  };

  const updateCardNodeMeta = ({
    nodeId,
    label,
    binding,
  }: {
    nodeId: string;
    label?: string;
    binding?: string;
  }) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;

      const nextLabel = typeof label === "string" ? label.trim() : undefined;
      const nextBinding =
        typeof binding === "string" ? binding.trim() : undefined;

      const nextNode: V2TemplateCardNode = {
        ...prevNode,
        ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
        ...(nextBinding && nextBinding.length > 0
          ? { binding: v2_createBindingRefFromLegacyInput(nextBinding) }
          : {}),
      };

      const updateLayerLabel = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes.map((node) => {
          if (node.id === prevNode.layerId) {
            return {
              ...node,
              ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
            };
          }
          if (!node.children?.length) return node;
          return {
            ...node,
            children: updateLayerLabel(node.children),
          };
        });
      };

      return {
        ...prev,
        structure: {
          ...prev.structure,
          layers: updateLayerLabel(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: nextNode,
            },
          },
        },
      };
    });
  };

  const appendCardNode = (kind: V2TemplateCardNodeKind) => {
    safeUpdateConfig((prev) => {
      const existingIds = new Set(Object.keys(prev.structure.card.nodes));
      let nextIndex = 1;
      let nodeId = `card-node-${nextIndex}`;
      while (existingIds.has(nodeId)) {
        nextIndex += 1;
        nodeId = `card-node-${nextIndex}`;
      }

      const label = `Object${nextIndex}`;
      const layerId = nodeId;
      const target = `cardNode:${nodeId}`;
      const containerStyleKey = `cardNode:${nodeId}:container`;
      const textStyleKey = `cardNode:${nodeId}:text`;
      const wrapperStyleKey = `cardNode:${nodeId}:wrapper`;
      const optionsKey = `cardNode:${nodeId}:options`;

      const nextNode: V2TemplateCardNode = {
        id: nodeId,
        label,
        kind,
        layerId,
        highlightTarget: target,
        binding: v2_createBindingRefFromLegacyInput(nodeId),
        visibilityMode: "always",
        containerStyleKey,
        textStyleKey,
        ...(kind === "flexibleText" ? { wrapperStyleKey, optionsKey } : {}),
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        containerClassName: "absolute flex justify-center items-center",
        ...(kind === "flexibleText"
          ? { textClassName: "leading-none text-center" }
          : {}),
      };

      const nextCardLayout = {
        ...prev.layout.card,
        [containerStyleKey]: {
          position: "absolute",
          top: 0,
          left: 0,
          width: 240,
          height: 64,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        [textStyleKey]: {
          fontSize: 32,
          lineHeight: 1.2,
          textAlign: "center",
          fontWeight: 500,
        },
        ...(kind === "flexibleText"
          ? {
              [wrapperStyleKey]: {
                justifyContent: "center",
                alignItems: "center",
              },
              [optionsKey]: {
                maxFontSize: 56,
                multiline: true,
              },
            }
          : {}),
      };

      const appendLayerNode = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes.map((node) => {
          if (node.id === prev.structure.card.containerLayerId) {
            return {
              ...node,
              children: [
                ...(node.children ?? []),
                {
                  id: layerId,
                  label,
                  kind: "component",
                  icon: "text",
                  target,
                  sectionKey: containerStyleKey,
                  visibilityMode: "always",
                },
              ],
            };
          }
          if (!node.children?.length) return node;
          return {
            ...node,
            children: appendLayerNode(node.children),
          };
        });
      };

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          layers: appendLayerNode(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodeOrder: [...prev.structure.card.nodeOrder, nodeId],
            nodes: {
              ...prev.structure.card.nodes,
              [nodeId]: nextNode,
            },
          },
        },
      };
    });
  };

  const removeCardNode = (nodeId: string) => {
    if (v2_FIXED_CARD_NODE_IDS.has(nodeId)) return;

    safeUpdateConfig((prev) => {
      const targetNode = prev.structure.card.nodes[nodeId];
      if (!targetNode) return prev;

      const nextNodes = {
        ...prev.structure.card.nodes,
      };
      delete nextNodes[nodeId];

      const nextNodeOrder = prev.structure.card.nodeOrder.filter(
        (id) => id !== nodeId
      );

      const nextCardLayout = {
        ...prev.layout.card,
      };
      delete nextCardLayout[targetNode.containerStyleKey];
      if (targetNode.textStyleKey) delete nextCardLayout[targetNode.textStyleKey];
      if (targetNode.wrapperStyleKey)
        delete nextCardLayout[targetNode.wrapperStyleKey];
      if (targetNode.optionsKey) delete nextCardLayout[targetNode.optionsKey];

      const removeLayerNode = (
        nodes: V2TemplateLayerNode[]
      ): V2TemplateLayerNode[] => {
        return nodes
          .filter((node) => node.id !== targetNode.layerId)
          .map((node) => {
            if (!node.children?.length) return node;
            return {
              ...node,
              children: removeLayerNode(node.children),
            };
          });
      };

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
        structure: {
          ...prev.structure,
          layers: removeLayerNode(prev.structure.layers),
          card: {
            ...prev.structure.card,
            nodeOrder: nextNodeOrder,
            nodes: nextNodes,
          },
        },
      };
    });
  };

  const updateCardInstanceMode = (instanceMode: "component" | "detached") => {
    safeUpdateConfig((prev) => ({
      ...prev,
      structure: {
        ...prev.structure,
        card: {
          ...prev.structure.card,
          instanceMode,
        },
      },
    }));
  };

  const updateCardInstanceTransform = (
    index: number,
    key: keyof V2TemplateCardInstanceTransform,
    value: number
  ) => {
    if (!Number.isFinite(value)) return;

    safeUpdateConfig((prev) => {
      const transformKey = String(index);
      const prevTransforms = prev.structure.card.instanceTransforms ?? {};
      const prevTransform = prevTransforms[transformKey] ?? {};
      const nextTransform: V2TemplateCardInstanceTransform = {
        ...prevTransform,
      };

      if (key === "offsetX" || key === "offsetY") {
        const rounded = Math.round(value);
        if (rounded === 0) {
          delete nextTransform[key];
        } else {
          nextTransform[key] = rounded;
        }
      }

      if (key === "rotateDeg") {
        const rounded = Math.round(value * 10) / 10;
        if (rounded === 0) {
          delete nextTransform.rotateDeg;
        } else {
          nextTransform.rotateDeg = rounded;
        }
      }

      if (key === "scale") {
        const rounded = Math.round(Math.max(0.1, value) * 100) / 100;
        if (rounded === 1) {
          delete nextTransform.scale;
        } else {
          nextTransform.scale = rounded;
        }
      }

      if (key === "opacity") {
        const clamped = Math.min(1, Math.max(0, value));
        const rounded = Math.round(clamped * 100) / 100;
        if (rounded === 1) {
          delete nextTransform.opacity;
        } else {
          nextTransform.opacity = rounded;
        }
      }

      const nextTransforms = {
        ...prevTransforms,
      };

      if (Object.keys(nextTransform).length === 0) {
        delete nextTransforms[transformKey];
      } else {
        nextTransforms[transformKey] = nextTransform;
      }

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            instanceTransforms: nextTransforms,
          },
        },
      };
    });
  };

  const updateColor = (
    key: (typeof v2_TEMPLATE_COLOR_KEYS)[number],
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentColors: {
        ...prev.componentColors,
        [key]: value,
      },
    }));
  };

  const updateComponentFont = (
    key: (typeof v2_TEMPLATE_COLOR_KEYS)[number],
    value: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      componentFonts: {
        ...prev.componentFonts,
        [key]: value,
      },
    }));
  };

  const updateMaxFontSize = (
    key: "MAIN_TITLE" | "SUB_TITLE" | "ARTIST",
    value: number
  ) => {
    if (!Number.isFinite(value) || value <= 0) return;

    safeUpdateConfig((prev) => ({
      ...prev,
      maxFontSizes: {
        ...prev.maxFontSizes,
        [key]: Math.round(value),
      },
    }));
  };

  const updateAssetUrl = (
    key: keyof V2TemplateAssetMap,
    theme: string,
    value: string,
    dimension: V2TemplateAssetDimension | null = null
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [key]: {
          ...prev.assets[key],
          [theme]: value.trim() === "" ? null : value,
        },
      },
      assetDimensions: {
        ...prev.assetDimensions,
        [key]: {
          ...prev.assetDimensions[key],
          [theme]: value.trim() === "" ? null : dimension,
        },
      },
    }));
  };

  const readImageFileAsDataUrl = (
    file: File
  ): Promise<{ dataUrl: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(new Error("파일을 읽지 못했습니다."));
      };

      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("이미지 데이터 변환에 실패했습니다."));
          return;
        }

        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: result,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        };
        img.onerror = () => {
          reject(new Error("이미지 크기 확인에 실패했습니다."));
        };
        img.src = result;
      };

      reader.readAsDataURL(file);
    });
  };

  const handleAssetFileUpload = async (
    key: keyof V2TemplateAssetMap,
    theme: string,
    file: File | null
  ) => {
    if (!file) return;

    try {
      const result = await readImageFileAsDataUrl(file);
      updateAssetUrl(key, theme, result.dataUrl, {
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      console.error("Failed to upload asset image", error);
    }
  };

  const firstCard = data[0];
  const firstEntry = firstCard?.entries?.[0];

  const updateFirstEntryField = (key: string, value: string | boolean) => {
    const next = [...data];
    if (!next[0] || !next[0].entries?.[0]) return;

    next[0] = {
      ...next[0],
      entries: [
        {
          ...next[0].entries[0],
          [key]: value,
        },
        ...next[0].entries.slice(1),
      ],
    };

    updateData(next);
  };

  const updateFirstDayOffline = (isOffline: boolean) => {
    const next = [...data];
    if (!next[0]) return;
    next[0] = {
      ...next[0],
      isOffline,
    };
    updateData(next);
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(renderConfig, null, 2));
      setCopyState("success");
    } catch (error) {
      console.error("Failed to copy render config JSON", error);
      setCopyState("error");
    } finally {
      setTimeout(() => setCopyState("idle"), 1400);
    }
  };

  const renderStyleSectionEditor = ({
    title,
    section,
  }: {
    title: string;
    section: V2StyleSectionId;
  }) => {
    const knownSection = v2_isKnownStyleSectionKey(section) ? section : null;
    const sectionMap = getStyleSectionMap(section);
    const isGridSection = knownSection === "grid";
    const groups = [
      ...v2_expandDisplayGroups(
        knownSection ? v2_BOILERPLATE_SECTION_GROUPS[knownSection] ?? [] : []
      ),
      ...v2_STYLE_EXTENSION_GROUPS,
    ];
    const gridPresetKeys = isGridSection
      ? [
          "layoutMode",
          "gridEmptySlotA",
          "gridEmptySlotB",
          "flex42ThreeRow",
          "flex42Align",
        ]
      : [];
    const presetKeys = new Set([
      ...groups.flatMap((group) => group.fields.map((field) => field.key)),
      ...gridPresetKeys,
    ]);
    const customEntries = Object.entries(sectionMap).filter(
      ([property]) =>
        !presetKeys.has(property) && !v2_LOCKED_STYLE_PROPERTY_KEYS.has(property)
    );
    const gridLayoutMode = isGridSection
      ? v2_parseGridLayoutMode(sectionMap.layoutMode)
      : null;
    const gridEmptySlots = isGridSection
      ? v2_getGridEmptySlotsFromMap(sectionMap)
      : [];
    const flex42Align = isGridSection
      ? v2_parseFlex42Align(sectionMap.flex42Align)
      : "center";
    const flex42ThreeRow = isGridSection
      ? v2_parseFlex42ThreeRow(sectionMap.flex42ThreeRow)
      : "bottom";

    return (
      <div className="rounded border border-[#3a3d44] bg-[#1f2126] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-gray-100">{title}</h5>
        </div>

        {isGridSection && (
          <div className="rounded border border-[#343842] bg-[#1b1d22] p-3 space-y-3">
            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
              Layout Mode
            </h6>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateGridLayoutMode("grid3x3")}
                className={`rounded border px-2 py-1 text-xs ${
                  gridLayoutMode === "grid3x3"
                    ? "border-blue-400 bg-blue-500/20 text-blue-200"
                    : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                }`}
              >
                3 x 3 (Grid)
              </button>
              <button
                type="button"
                onClick={() => updateGridLayoutMode("flex4x2")}
                className={`rounded border px-2 py-1 text-xs ${
                  gridLayoutMode === "flex4x2"
                    ? "border-blue-400 bg-blue-500/20 text-blue-200"
                    : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                }`}
              >
                4 x 2 (Flex)
              </button>
            </div>

            {gridLayoutMode === "grid3x3" ? (
              <div className="space-y-2">
                <span className="text-[11px] text-gray-400">비울 칸 선택</span>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((slot) => {
                    const isSelected = gridEmptySlots.includes(slot);

                    return (
                      <button
                        key={`grid-empty-slot-${slot}`}
                        type="button"
                        onClick={() => pickGridEmptySlot(slot)}
                        className={`relative rounded border px-2 py-2 text-xs font-semibold transition ${
                          isSelected
                            ? "border-blue-400/80 bg-blue-500/20 text-blue-100"
                            : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                        }`}
                      >
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[11px] text-gray-400">3칸 줄 위치</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { label: "윗줄 3칸", value: "top" },
                    { label: "아랫줄 3칸", value: "bottom" },
                  ] as Array<{ label: string; value: V2Flex42ThreeRow }>).map(
                    (option) => (
                      <button
                        key={`flex42-three-row-${option.value}`}
                        type="button"
                        onClick={() => updateFlex42ThreeRow(option.value)}
                        className={`rounded border px-2 py-1 text-xs ${
                          flex42ThreeRow === option.value
                            ? "border-blue-400 bg-blue-500/20 text-blue-200"
                            : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
                <span className="text-[11px] text-gray-400">3칸 줄 정렬</span>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { label: "Left", value: "left" },
                    { label: "Center", value: "center" },
                    { label: "Right", value: "right" },
                  ] as Array<{ label: string; value: V2Flex42Align }>).map(
                    (option) => (
                      <button
                        key={`flex42-align-${option.value}`}
                        type="button"
                        onClick={() => updateFlex42Align(option.value)}
                        className={`rounded border px-2 py-1 text-xs ${
                          flex42Align === option.value
                            ? "border-blue-400 bg-blue-500/20 text-blue-200"
                            : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                        }`}
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {groups.map((group) => {
          const visibleFields = group.fields.filter(
            (field) => !v2_LOCKED_STYLE_PROPERTY_KEYS.has(field.key)
          );
          if (visibleFields.length === 0) return null;

          const GroupIcon =
            v2_BOILERPLATE_GROUP_ICON_MAP[group.id] ?? SlidersHorizontal;
          const groupLabel = v2_STYLE_GROUP_DISPLAY_LABEL[group.id] ?? group.label;
          const isPositionGroup = group.id === "position";
          const isGroupOpen = isStyleGroupOpen({
            section,
            group,
            sectionMap,
          });
          const ChevronIcon = isGroupOpen ? ChevronDown : ChevronRight;
          const isExtensionGroup = v2_STYLE_EXTENSION_GROUP_IDS.has(group.id);
          const filledCount = visibleFields.filter((field) => {
            const value = sectionMap[field.key];
            if (value === undefined) return false;
            if (typeof value === "string") return value.trim() !== "";
            return true;
          }).length;

          return (
            <div
              key={`${section}-style-group-${group.id}`}
              className="border-t border-[#343842] pt-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => toggleStyleGroupOpen(section, group.id)}
                  className="flex-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-300 inline-flex items-center justify-between gap-2"
                >
                  <span className="inline-flex items-center gap-1">
                    <ChevronIcon className="h-3.5 w-3.5 text-gray-500" />
                    <GroupIcon className="h-3.5 w-3.5 text-gray-400" />
                    {groupLabel}
                  </span>
                  <span className="text-[10px] text-gray-500">{filledCount}</span>
                </button>
                {isExtensionGroup && (
                  <button
                    type="button"
                    onClick={() => applyStyleExtensionGroupDefaults(section, group.id)}
                    className="h-6 w-6 shrink-0 rounded border border-[#3a3d44] bg-[#2a2d33] text-gray-300 hover:bg-[#323640] inline-flex items-center justify-center"
                    aria-label={`${groupLabel} 기본 항목 추가`}
                    title={`${groupLabel} 기본 항목 추가`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {isGroupOpen && (
                <div className="grid grid-cols-2 gap-2">
                  {visibleFields.map((field) => {
                    const fieldType = getBoilerplateFieldType(field);
                    const value = sectionMap[field.key];
                    const valueString = value === undefined ? "" : String(value);
                    const hasValue =
                      value !== undefined && !(typeof value === "string" && value === "");
                    const selectOptions = field.options ?? [];
                    const FieldIcon = v2_getBoilerplateFieldIcon(field, group.id);
                    const counterpartKey = v2_POSITION_MUTEX_MAP[field.key];
                    const isMutedByMutex =
                      isPositionGroup &&
                      !!counterpartKey &&
                      !v2_hasRenderableStyleValue(value) &&
                      v2_hasRenderableStyleValue(sectionMap[counterpartKey]);
                    const fieldWrapperClass =
                      isPositionGroup && field.key === "position"
                        ? "col-span-2 space-y-1"
                        : "space-y-1";
                    const fieldOpacityClass = isMutedByMutex ? "opacity-50" : "";

                    return (
                      <div
                        key={`${section}-${group.id}-style-${field.key}`}
                        className={`${fieldWrapperClass} ${fieldOpacityClass}`.trim()}
                        onMouseEnter={() => setSectionHoverHighlight(section)}
                        onMouseLeave={clearSectionHoverHighlight}
                        onClick={() => setSectionActiveHighlight(section)}
                      >
                        <label className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                          <FieldIcon className="h-3.5 w-3.5 text-gray-500" />
                          {field.label}
                        </label>
                        <div className="grid grid-cols-[1fr_auto] gap-1">
                          {fieldType === "select" ? (
                            <select
                              value={valueString}
                              onChange={(e) =>
                                updateStylePropertyValue(
                                  section,
                                  field.key,
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
                            >
                              <option value="">(비움)</option>
                              {selectOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={fieldType === "number" ? "number" : "text"}
                              step={
                                fieldType === "number"
                                  ? getBoilerplateFieldStep(field)
                                  : undefined
                              }
                              value={valueString}
                              onChange={(e) =>
                                updateStylePropertyValue(
                                  section,
                                  field.key,
                                  e.target.value
                                )
                              }
                              className="w-full rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
                              placeholder={field.placeholder ?? "값"}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeStyleProperty(section, field.key)}
                            className={`rounded border px-2 text-xs ${
                              hasValue
                                ? "border-red-400/40 text-red-300 hover:bg-red-500/10"
                                : "border-transparent text-transparent pointer-events-none"
                            }`}
                            aria-label={`${field.label} 속성 삭제`}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-[#343842] pt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h6 className="text-[11px] font-semibold uppercase tracking-wide text-gray-300 inline-flex items-center gap-1">
              <Braces className="h-3.5 w-3.5 text-gray-400" />
              Custom CSS
            </h6>
            <button
              type="button"
              onClick={() => addStyleProperty(section)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              + CSS 속성 추가
            </button>
          </div>
          {customEntries.length === 0 && (
            <p className="text-xs text-gray-500">추가된 속성이 없습니다.</p>
          )}
          {customEntries.map(([property, value], index) => (
            <div
              key={`style-custom-${section}-${index}`}
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
              onMouseEnter={() => setSectionHoverHighlight(section)}
              onMouseLeave={clearSectionHoverHighlight}
              onClick={() => setSectionActiveHighlight(section)}
            >
              <div className="rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-200 flex items-center">
                {property}
              </div>
              <input
                value={String(value)}
                onChange={(e) =>
                  updateStylePropertyValue(section, property, e.target.value)
                }
                className="rounded border border-[#383c45] bg-[#2a2d33] px-2 py-1 text-xs text-gray-100"
                placeholder="값"
              />
              <button
                type="button"
                onClick={() => removeStyleProperty(section, property)}
                className="rounded border border-red-400/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAutoResizeAlignmentEditor = ({
    title,
    wrapperSection,
    textSection,
  }: {
    title: string;
    wrapperSection: V2StyleSectionId;
    textSection: V2StyleSectionId;
  }) => {
    const wrapperMap = getStyleSectionMap(wrapperSection);
    const textMap = getStyleSectionMap(textSection);
    const horizontalAlign = getHorizontalAlignFromStyle(wrapperMap, textMap);
    const verticalAlign = getVerticalAlignFromStyle(wrapperMap);

    const applyPointAlignment = ({
      horizontal,
      vertical,
    }: {
      horizontal: V2HorizontalAlign;
      vertical: V2VerticalAlign;
    }) => {
      updateAutoResizeHorizontalAlign({
        wrapperSection,
        textSection,
        align: horizontal,
      });
      updateAutoResizeVerticalAlign({
        wrapperSection,
        align: vertical,
      });
    };

    return (
      <div
        className="rounded border border-[#3a3d44] bg-[#1f2126] p-3 space-y-2"
        onMouseEnter={() => setSectionHoverHighlight(wrapperSection)}
        onMouseLeave={clearSectionHoverHighlight}
        onClick={() => setSectionActiveHighlight(wrapperSection)}
      >
        <h5 className="text-xs font-semibold text-gray-100 inline-flex items-center gap-1">
          <AlignHorizontalJustifyCenter className="h-3.5 w-3.5 text-gray-400" />
          {title}
        </h5>
        <p className="text-[11px] text-gray-400">
          점 하나를 클릭하면 가로(`justifyContent` + `textAlign`)와 세로(`alignItems`)가
          함께 반영됩니다.
        </p>

        <div className="rounded border border-[#343842] bg-[#1b1d22] p-2 inline-block">
          <div className="grid grid-cols-3 gap-2">
            {v2_ALIGNMENT_VERTICAL_ORDER.flatMap((vertical) =>
              v2_ALIGNMENT_HORIZONTAL_ORDER.map((horizontal) => {
                const isActive =
                  horizontalAlign === horizontal && verticalAlign === vertical;
                return (
                  <button
                    key={`${title}-point-${vertical}-${horizontal}`}
                    type="button"
                    onClick={() =>
                      applyPointAlignment({
                        horizontal,
                        vertical,
                      })
                    }
                    aria-label={`${v2_VERTICAL_ALIGN_LABELS[vertical]} ${v2_HORIZONTAL_ALIGN_LABELS[horizontal]}`}
                    className={`h-9 w-9 rounded border inline-flex items-center justify-center transition ${
                      isActive
                        ? "border-blue-400 bg-blue-500/20"
                        : "border-[#3a3d44] bg-[#2a2d33] hover:bg-[#323640]"
                    }`}
                  >
                    <span
                      className={`rounded-full ${
                        isActive ? "h-2.5 w-2.5 bg-blue-300" : "h-2 w-2 bg-gray-500"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderBoilerplateSectionEditor = ({
    title,
    section,
  }: {
    title: string;
    section: V2StyleSectionKey;
  }) => {
    const sectionMap = getBoilerplateSectionMap(section);
    const groups = v2_expandDisplayGroups(
      v2_BOILERPLATE_SECTION_GROUPS[section] ?? []
    );
    const presetKeys = new Set(
      groups.flatMap((group) => group.fields.map((field) => field.key))
    );
    const customEntries = Object.entries(sectionMap).filter(
      ([property]) =>
        !presetKeys.has(property) && !v2_LOCKED_STYLE_PROPERTY_KEYS.has(property)
    );
    const autoResizePair = getBoilerplateAutoResizePair(section);
    const horizontalAlign = autoResizePair
      ? getBoilerplateHorizontalAlign(autoResizePair)
      : null;
    const verticalAlign = autoResizePair
      ? getBoilerplateVerticalAlign({ wrapperSection: autoResizePair.wrapperSection })
      : null;

    const applyBoilerplatePointAlignment = ({
      horizontal,
      vertical,
    }: {
      horizontal: V2HorizontalAlign;
      vertical: V2VerticalAlign;
    }) => {
      if (!autoResizePair) return;
      updateBoilerplateAutoResizeHorizontalAlign({
        wrapperSection: autoResizePair.wrapperSection,
        textSection: autoResizePair.textSection,
        align: horizontal,
      });
      updateBoilerplateAutoResizeVerticalAlign({
        wrapperSection: autoResizePair.wrapperSection,
        align: vertical,
      });
    };

    return (
      <div className="rounded border border-gray-300 bg-white p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-xs font-semibold text-gray-700">{title}</h5>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => resetBoilerplateSection(section)}
              className="px-2 py-1 rounded border border-gray-300 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              기본값 복원
            </button>
            <button
              type="button"
              onClick={() => addBoilerplateProperty(section)}
              className="px-2 py-1 rounded border border-blue-300 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              + 커스텀 CSS
            </button>
          </div>
        </div>

        {autoResizePair && (
          <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
            <h6 className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase inline-flex items-center gap-1">
              <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
              Alignment
            </h6>
            <p className="text-[11px] text-gray-500">
              점 하나를 클릭하면 가로(`justifyContent` + `textAlign`)와 세로(`alignItems`)가
              함께 반영됩니다.
            </p>
            <div className="rounded border border-gray-200 bg-white p-2 inline-block">
              <div className="grid grid-cols-3 gap-2">
                {v2_ALIGNMENT_VERTICAL_ORDER.flatMap((vertical) =>
                  v2_ALIGNMENT_HORIZONTAL_ORDER.map((horizontal) => {
                    const isActive =
                      horizontalAlign === horizontal && verticalAlign === vertical;
                    return (
                      <button
                        key={`bp-align-point-${section}-${vertical}-${horizontal}`}
                        type="button"
                        onClick={() =>
                          applyBoilerplatePointAlignment({
                            horizontal,
                            vertical,
                          })
                        }
                        aria-label={`${v2_VERTICAL_ALIGN_LABELS[vertical]} ${v2_HORIZONTAL_ALIGN_LABELS[horizontal]}`}
                        className={`h-9 w-9 rounded border inline-flex items-center justify-center transition ${
                          isActive
                            ? "border-blue-400 bg-blue-50"
                            : "border-gray-300 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`rounded-full ${
                            isActive ? "h-2.5 w-2.5 bg-blue-600" : "h-2 w-2 bg-gray-400"
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {groups.map((group) => {
          const visibleFields = group.fields.filter(
            (field) => !v2_LOCKED_STYLE_PROPERTY_KEYS.has(field.key)
          );
          if (visibleFields.length === 0) return null;

          const GroupIcon =
            v2_BOILERPLATE_GROUP_ICON_MAP[group.id] ?? SlidersHorizontal;

          return (
            <div
              key={`${section}-${group.id}`}
              className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2"
            >
              <h6 className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase inline-flex items-center gap-1">
                <GroupIcon className="h-3.5 w-3.5" />
                {group.label}
              </h6>
              <div className="grid grid-cols-1 gap-2">
                {visibleFields.map((field) => {
                  const fieldType = getBoilerplateFieldType(field);
                  const value = sectionMap[field.key];
                  const valueString = value === undefined ? "" : String(value);
                  const selectOptions = field.options ?? [];
                  const FieldIcon = v2_getBoilerplateFieldIcon(field, group.id);

                  return (
                    <label
                      key={`${section}-${group.id}-${field.key}`}
                      className="grid grid-cols-2 items-center gap-2"
                    >
                      <span className="text-xs text-gray-600 inline-flex items-center gap-1">
                        <FieldIcon className="h-3.5 w-3.5 text-gray-400" />
                        {field.label}
                      </span>
                      {fieldType === "select" ? (
                        <select
                          value={valueString}
                          onChange={(e) =>
                            updateBoilerplatePropertyValue(
                              section,
                              field.key,
                              e.target.value
                            )
                          }
                          className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
                        >
                          <option value="">(비움)</option>
                          {selectOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={fieldType === "number" ? "number" : "text"}
                          step={
                            fieldType === "number"
                              ? getBoilerplateFieldStep(field)
                              : undefined
                          }
                          value={valueString}
                          onChange={(e) =>
                            updateBoilerplatePropertyValue(
                              section,
                              field.key,
                              e.target.value
                            )
                          }
                          className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
                          placeholder={field.placeholder ?? "값"}
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded border border-gray-200 bg-white p-3 space-y-2">
          <h6 className="text-[11px] font-semibold tracking-wide text-gray-600 uppercase inline-flex items-center gap-1">
            <Braces className="h-3.5 w-3.5" />
            Custom CSS
          </h6>
          {customEntries.length === 0 && (
            <p className="text-xs text-gray-400">추가된 커스텀 속성이 없습니다.</p>
          )}
          {customEntries.map(([property, value], index) => (
            <div
              key={`bp-custom-${section}-${index}`}
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <input
                list={`v2-bp-style-props-${section}`}
                value={property}
                onChange={(e) =>
                  renameBoilerplateProperty(section, property, e.target.value)
                }
                className="px-2 py-1 rounded border border-gray-300 text-xs"
              />
              <input
                value={String(value)}
                onChange={(e) =>
                  updateBoilerplatePropertyValue(section, property, e.target.value)
                }
                className="px-2 py-1 rounded border border-gray-300 text-xs"
                placeholder="값"
              />
              <button
                type="button"
                onClick={() => removeBoilerplateProperty(section, property)}
                className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          ))}
        </div>

        <datalist id={`v2-bp-style-props-${section}`}>
          {v2_STYLE_PROPERTY_CATALOG.map((property) => (
            <option key={property} value={property} />
          ))}
        </datalist>
      </div>
    );
  };

  const renderBoilerplateSettingsModal = () => {
    if (!isBoilerplateSettingsOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button
          type="button"
          aria-label="보일러플레이트 설정 닫기"
          className="absolute inset-0 bg-gray-900/45"
          onClick={() => setIsBoilerplateSettingsOpen(false)}
        />
        <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-300 bg-white p-4 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-gray-700">
                보일러플레이트 설정
              </h4>
              <p className="text-xs text-gray-500">
                각 항목의 보일러플레이트 적용 버튼으로 넣을 속성 템플릿을 여기서
                미리 관리합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsBoilerplateSettingsOpen(false)}
              className="px-3 py-2 rounded border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <label className="text-xs text-gray-500">대상 항목</label>
            <select
              value={boilerplateTarget}
              onChange={(e) =>
                setBoilerplateTarget(e.target.value as V2StyleSectionKey)
              }
              className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
            >
              {v2_STYLE_SECTION_ORDER.map((section) => (
                <option key={section} value={section}>
                  {v2_STYLE_SECTION_LABELS[section]}
                </option>
              ))}
            </select>
          </div>
          {renderBoilerplateSectionEditor({
            title: v2_STYLE_SECTION_LABELS[boilerplateTarget],
            section: boilerplateTarget,
          })}
        </div>
      </div>
    );
  };

  const renderCanvasTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">캔버스</h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500">width</label>
        <input
          type="number"
          value={renderConfig.templateSize.width}
          onChange={(e) => updateTemplateSize("width", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
        <label className="text-xs text-gray-500">height</label>
        <input
          type="number"
          value={renderConfig.templateSize.height}
          onChange={(e) => updateTemplateSize("height", Number(e.target.value))}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-500">default theme</label>
        <select
          value={renderConfig.defaultTheme}
          onChange={(e) => {
            const nextTheme = e.target.value;
            safeUpdateConfig((prev) => ({
              ...prev,
              defaultTheme: nextTheme,
            }));
            if (!themeOptions.includes(assetTheme)) {
              setAssetTheme(nextTheme);
            }
          }}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

        <label className="text-xs text-gray-500">preview theme</label>
        <select
          value={currentTheme}
          onChange={(e) => updateTheme(e.target.value as typeof currentTheme)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderSchemaTab = () => (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-gray-100">입력 스키마</h3>
        <button
          type="button"
          onClick={() => {
            appendFormField({
              key: "",
              scope: "entry",
              type: "text",
              placeholder: "새 필드",
            });
          }}
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          + 필드 추가
        </button>
      </div>
      <p className="text-xs text-gray-400">
        여기에서 정의한 필드는 사용자 입력 폼과 오브젝트 바인딩에서 공통으로 사용됩니다.
      </p>
      {formSchemaError ? (
        <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
          {formSchemaError}
        </div>
      ) : null}
      <div className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1.5 text-xs text-gray-300 space-y-1">
        <p>
          총 필드: {formSchemaDiagnostics.totalFields}개 / 미사용 필드:{" "}
          {formSchemaDiagnostics.unusedFields.length}개
        </p>
        {formSchemaDiagnostics.missingBindings.length > 0 ? (
          <p className="text-red-300">
            누락 바인딩 {formSchemaDiagnostics.missingBindings.length}개 (
            {formSchemaDiagnostics.missingBindings
              .map((binding) => `${binding.nodeLabel} -> ${binding.scope}.${binding.key}`)
              .join(", ")}
            )
          </p>
        ) : (
          <p className="text-emerald-300">누락된 바인딩 없음</p>
        )}
      </div>

      <div className="space-y-2">
        {renderConfig.formSchema.fields.map((field, index) => (
          <div
            key={`${field.scope}:${field.key}:${index}`}
            className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 space-y-2"
          >
            <div className="grid grid-cols-[1fr_96px_120px_auto] gap-2 items-center">
              <input
                value={field.key}
                onChange={(event) =>
                  updateFormFieldAt(index, { key: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="field key"
              />
              <select
                value={field.scope}
                onChange={(event) =>
                  updateFormFieldAt(index, {
                    scope:
                      event.target.value === "card" ||
                      event.target.value === "global"
                        ? event.target.value
                        : "entry",
                  })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              >
                {v2_FORM_FIELD_SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={field.type}
                onChange={(event) =>
                  updateFormFieldAt(index, {
                    type: event.target.value as V2TemplateFormField["type"],
                  })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              >
                {v2_FORM_FIELD_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeFormFieldAt(index)}
                className="rounded border border-red-500/40 px-2 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                삭제
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={field.label ?? ""}
                onChange={(event) =>
                  updateFormFieldAt(index, { label: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="label (optional)"
              />
              <input
                value={field.placeholder}
                onChange={(event) =>
                  updateFormFieldAt(index, { placeholder: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="placeholder"
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
              <input
                value={field.defaultValue === undefined ? "" : String(field.defaultValue)}
                onChange={(event) =>
                  updateFormFieldAt(index, { defaultValue: event.target.value })
                }
                className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                placeholder="default value (optional)"
              />
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    updateFormFieldAt(index, { required: event.target.checked })
                  }
                />
                required
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded border border-[#3a3d44] bg-[#1a1c20] p-2 text-xs text-gray-400">
        computed 키: {v2_BINDING_COMPUTED_OPTIONS.join(", ")}
      </div>
    </div>
  );

  const renderStyleTab = () => (
    <div
      ref={inspectorTabRef}
      className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100"
      onMouseLeave={clearSectionHoverHighlight}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget;
        if (!(nextFocused instanceof Node)) {
          setActiveHighlightTarget(null);
          return;
        }
        if (!inspectorTabRef.current?.contains(nextFocused)) {
          setActiveHighlightTarget(null);
        }
      }}
    >
      <h3 className="font-bold text-base text-gray-100">스타일</h3>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-gray-200">
              보일러플레이트 설정
            </h4>
            <p className="text-xs text-gray-400">
              설정 버튼으로 항목별 기본 CSS 속성을 팝업에서 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsBoilerplateSettingsOpen(true)}
            className="shrink-0 px-3 py-2 rounded border border-[#4f8cff] bg-[#1a2c4f] text-xs font-semibold text-blue-200 hover:bg-[#1f3661]"
          >
            설정 열기
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">컴포넌트 색상</h4>
        <div className="space-y-2">
          {v2_TEMPLATE_COLOR_KEYS.map((key) => (
            <label key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{key}</span>
              <input
                type="color"
                value={renderConfig.componentColors[key] || "#000000"}
                onChange={(e) => updateColor(key, e.target.value)}
                className="w-14 h-8 rounded border border-[#3a3d44] bg-[#2a2d33]"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">컴포넌트 폰트 토큰</h4>
        <div className="space-y-2">
          {v2_TEMPLATE_COLOR_KEYS.map((key) => (
            <label key={key} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400">{key}</span>
              <select
                value={renderConfig.componentFonts[key]}
                onChange={(e) => updateComponentFont(key, e.target.value)}
                className="px-2 py-1 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
              >
                {fontTokenOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCardNodeAutoResizeOptions = ({
    node,
    containerSection,
  }: {
    node: V2TemplateCardNode;
    containerSection: V2StyleSectionId;
  }) => {
    if (!node.optionsKey) return null;

    const options = renderConfig.layout.card[node.optionsKey];
    const maxFontSizeFallback =
      v2_isEntryFieldBindingKey(node.binding, "subTitle")
        ? renderConfig.maxFontSizes.SUB_TITLE
        : renderConfig.maxFontSizes.MAIN_TITLE;
    const maxFontSize = options?.maxFontSize ?? maxFontSizeFallback;
    const multiline = options?.multiline ?? true;

    return (
      <>
        <div
          className="grid grid-cols-2 gap-2 items-center"
          onMouseEnter={() => setSectionHoverHighlight(containerSection)}
          onMouseLeave={clearSectionHoverHighlight}
          onClick={() => setSectionActiveHighlight(containerSection)}
        >
          <label className="text-xs text-gray-400">content / maxFontSize</label>
          <input
            type="number"
            value={maxFontSize}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value) || value <= 0) return;
              updateCardOptions(node.optionsKey!, { maxFontSize: value });
              if (v2_isEntryFieldBindingKey(node.binding, "mainTitle")) {
                updateMaxFontSize("MAIN_TITLE", value);
              }
              if (v2_isEntryFieldBindingKey(node.binding, "subTitle")) {
                updateMaxFontSize("SUB_TITLE", value);
              }
            }}
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
        </div>
        <label
          className="flex items-center justify-between gap-2 rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2"
          onMouseEnter={() => setSectionHoverHighlight(containerSection)}
          onMouseLeave={clearSectionHoverHighlight}
          onClick={() => setSectionActiveHighlight(containerSection)}
        >
          <span className="text-sm text-gray-200">content / multiline</span>
          <input
            type="checkbox"
            checked={Boolean(multiline)}
            onChange={(e) =>
              updateCardOptions(node.optionsKey!, {
                multiline: e.target.checked,
              })
            }
          />
        </label>
      </>
    );
  };

  const renderCardNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateCardNode
  ) => {
    const containerSection =
      v2_parseStyleSectionKey(node.containerStyleKey) ?? section;
    const textSection = node.textStyleKey
      ? v2_parseStyleSectionKey(node.textStyleKey)
      : null;
    const wrapperSection = node.wrapperStyleKey
      ? v2_parseStyleSectionKey(node.wrapperStyleKey)
      : null;
    const alignmentWrapperSection = wrapperSection ?? containerSection;
    const hasAutoResizeAlignment =
      node.kind === "flexibleText" && textSection !== null;
    const isRemovable = !v2_FIXED_CARD_NODE_IDS.has(node.id);
    const bindingSelectValue =
      node.binding.mode === "field"
        ? `field:${node.binding.scope}:${node.binding.key}`
        : node.binding.mode === "computed"
          ? `computed:${node.binding.key}`
          : "literal";
    const fieldBinding = node.binding.mode === "field" ? node.binding : null;
    const fieldBindingExists = (() => {
      if (!fieldBinding) return true;
      return renderConfig.formSchema.fields.some(
        (field) =>
          field.scope === fieldBinding.scope && field.key === fieldBinding.key
      );
    })();
    const newFieldDraft = newFieldDraftByNodeId[node.id] ?? {
      key: "",
      scope: "entry" as V2TemplateFieldScope,
    };

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm text-gray-200">Card / {node.label}</h4>
          {isRemovable ? (
            <button
              type="button"
              onClick={() => removeCardNode(node.id)}
              className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
            >
              오브젝트 삭제
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) =>
              updateCardNodeMeta({
                nodeId: node.id,
                label: event.target.value,
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-400">바인딩 키</label>
          <select
            value={bindingSelectValue}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "literal") {
                updateCardNodeBinding(node.id, {
                  mode: "literal",
                  value:
                    node.binding.mode === "literal"
                      ? node.binding.value
                      : v2_bindingRefToLegacyInput(node.binding),
                });
                return;
              }

              if (value.startsWith("computed:")) {
                const computedKey = value.replace("computed:", "");
                if (
                  computedKey === "streamingDay" ||
                  computedKey === "streamingDate" ||
                  computedKey === "streamingTime"
                ) {
                  updateCardNodeBinding(node.id, {
                    mode: "computed",
                    key: computedKey,
                  });
                }
                return;
              }

              if (value.startsWith("field:")) {
                const [, scope, ...rest] = value.split(":");
                const key = rest.join(":");
                if (!key) return;
                if (scope !== "entry" && scope !== "card" && scope !== "global") {
                  return;
                }
                updateCardNodeBinding(node.id, {
                  mode: "field",
                  scope,
                  key,
                });
              }
            }}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            <option value="computed:streamingDay">computed / streamingDay</option>
            <option value="computed:streamingDate">computed / streamingDate</option>
            <option value="computed:streamingTime">computed / streamingTime</option>
            {renderConfig.formSchema.fields.map((field) => (
              <option
                key={`${field.scope}:${field.key}`}
                value={`field:${field.scope}:${field.key}`}
              >
                field / {field.scope}.{field.key}
              </option>
            ))}
            {node.binding.mode === "field" && !fieldBindingExists ? (
              <option
                value={`field:${node.binding.scope}:${node.binding.key}`}
              >
                field / {node.binding.scope}.{node.binding.key} (missing)
              </option>
            ) : null}
            <option value="literal">literal (직접 텍스트)</option>
          </select>
        </div>
        {node.binding.mode === "literal" ? (
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">literal 값</label>
            <input
              value={node.binding.value}
              onChange={(event) =>
                updateCardNodeBinding(node.id, {
                  mode: "literal",
                  value: event.target.value,
                })
              }
              className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
              placeholder="표시할 고정 텍스트"
            />
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_96px_96px] gap-2 items-center">
          <input
            value={newFieldDraft.key}
            onChange={(event) =>
              setNewFieldDraftByNodeId((prev) => ({
                ...prev,
                [node.id]: {
                  ...(prev[node.id] ?? { scope: "entry", key: "" }),
                  key: event.target.value,
                },
              }))
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
            placeholder="새 필드 키"
          />
          <select
            value={newFieldDraft.scope}
            onChange={(event) => {
              const scope =
                event.target.value === "card" || event.target.value === "global"
                  ? event.target.value
                  : "entry";
              setNewFieldDraftByNodeId((prev) => ({
                ...prev,
                [node.id]: {
                  ...(prev[node.id] ?? { key: "" }),
                  scope,
                },
              }));
            }}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
          >
            {v2_FORM_FIELD_SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => createFieldForNodeBinding(node)}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-2 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
          >
            + 필드 생성
          </button>
        </div>
        {!fieldBindingExists ? (
          <p className="text-xs text-red-300">
            현재 바인딩된 필드가 입력 스키마에 없습니다.
          </p>
        ) : null}
        <div
          className="grid grid-cols-2 gap-2 items-center"
          onMouseEnter={() => setSectionHoverHighlight(containerSection)}
          onMouseLeave={clearSectionHoverHighlight}
          onClick={() => setSectionActiveHighlight(containerSection)}
        >
          <label className="text-xs text-gray-400">표시 조건</label>
          <select
            value={node.visibilityMode ?? "always"}
            onChange={(event) =>
              updateCardNodeVisibilityMode(
                node.id,
                event.target.value as V2TemplateVisibilityMode
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {renderStyleSectionEditor({
          title: "container style",
          section: containerSection,
        })}

        {wrapperSection && wrapperSection !== containerSection
          ? renderStyleSectionEditor({
              title: "wrapper > style",
              section: wrapperSection,
            })
          : null}

        {hasAutoResizeAlignment && textSection
          ? renderAutoResizeAlignmentEditor({
              title: "content > alignment",
              wrapperSection: alignmentWrapperSection,
              textSection,
            })
          : null}

        {textSection
          ? renderStyleSectionEditor({
              title: "content > style",
              section: textSection,
            })
          : null}

        {node.kind === "flexibleText"
          ? renderCardNodeAutoResizeOptions({
              node,
              containerSection,
            })
          : null}
      </div>
    );
  };

  const renderCardComponentProperties = (section: V2StyleSectionId) => {
    if (section !== "cardContainer") return null;

    const instanceMode = renderConfig.structure.card.instanceMode ?? "component";
    const instanceTransforms = renderConfig.structure.card.instanceTransforms ?? {};

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-xs font-semibold text-gray-200">Card Component</h5>
          <span className="rounded border border-[#3f6ad8] bg-[#1a2b57] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b9ccff]">
            Component
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">인스턴스 모드</label>
          <select
            value={instanceMode}
            onChange={(event) =>
              updateCardInstanceMode(
                event.target.value === "detached" ? "detached" : "component"
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            <option value="component">공통 컴포넌트</option>
            <option value="detached">개별 인스턴스</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => appendCardNode("text")}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
          >
            + 텍스트 오브젝트
          </button>
          <button
            type="button"
            onClick={() => appendCardNode("flexibleText")}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
          >
            + FlexibleText
          </button>
        </div>

        {instanceMode === "detached" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-400">
              카드 1~7 각각의 개별 보정값(X/Y/회전/스케일/불투명도)을 조정합니다.
            </p>
            <div className="grid grid-cols-[56px_1fr_1fr_1fr_1fr_1fr] gap-2 items-center text-[11px] text-gray-500">
              <span />
              <span>X</span>
              <span>Y</span>
              <span>R</span>
              <span>S</span>
              <span>O</span>
            </div>
            {Array.from({ length: 7 }).map((_, index) => {
              const key = String(index);
              const transform = instanceTransforms[key] ?? {};
              const offsetX =
                typeof transform.offsetX === "number" ? transform.offsetX : 0;
              const offsetY =
                typeof transform.offsetY === "number" ? transform.offsetY : 0;
              const rotateDeg =
                typeof transform.rotateDeg === "number" ? transform.rotateDeg : 0;
              const scale =
                typeof transform.scale === "number" ? transform.scale : 1;
              const opacity =
                typeof transform.opacity === "number" ? transform.opacity : 1;

              return (
                <div
                  key={key}
                  className="grid grid-cols-[56px_1fr_1fr_1fr_1fr_1fr] gap-2 items-center"
                >
                  <span className="text-xs text-gray-300">Card {index + 1}</span>
                  <input
                    type="number"
                    value={offsetX}
                    onChange={(event) =>
                      updateCardInstanceTransform(
                        index,
                        "offsetX",
                        Number(event.target.value)
                      )
                    }
                    className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={offsetY}
                    onChange={(event) =>
                      updateCardInstanceTransform(
                        index,
                        "offsetY",
                        Number(event.target.value)
                      )
                    }
                    className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    placeholder="Y"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={rotateDeg}
                    onChange={(event) =>
                      updateCardInstanceTransform(
                        index,
                        "rotateDeg",
                        Number(event.target.value)
                      )
                    }
                    className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    placeholder="deg"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={scale}
                    onChange={(event) =>
                      updateCardInstanceTransform(
                        index,
                        "scale",
                        Number(event.target.value)
                      )
                    }
                    className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    placeholder="1"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={opacity}
                    onChange={(event) =>
                      updateCardInstanceTransform(
                        index,
                        "opacity",
                        Number(event.target.value)
                      )
                    }
                    className="px-2 py-1.5 rounded border border-[#3a3d44] bg-[#2a2d33] text-xs text-gray-100"
                    placeholder="1"
                  />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const renderSimplePropertiesSection = (section: V2StyleSectionId) => {
    const knownSection = v2_isKnownStyleSectionKey(section) ? section : null;
    const heading =
      structurePropertiesMaps.sectionToLabel[section] ??
      (knownSection ? v2_STYLE_SECTION_LABELS[knownSection] : section);

    const styleTitle =
      section === "topObjectContainer"
        ? "container style"
        : section === "profileImage"
          ? "image style"
          : section === "profileFrame"
            ? "frame style"
            : "style";

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">{heading}</h4>
        {renderCardComponentProperties(section)}
        {renderStyleSectionEditor({ title: styleTitle, section })}
      </div>
    );
  };

  const renderPropertiesPanels = () => {
    const section = selectedPropertiesSection;
    if (!section) return null;

    const cardNode = cardNodeByPropertiesSection.get(section);
    if (cardNode) {
      return renderCardNodeProperties(section, cardNode);
    }

    return renderSimplePropertiesSection(section);
  };

  const renderPropertiesTab = () => (
    <div
      ref={inspectorTabRef}
      className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100"
      onMouseLeave={clearSectionHoverHighlight}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget;
        if (!(nextFocused instanceof Node)) {
          setActiveHighlightTarget(null);
          return;
        }
        if (!inspectorTabRef.current?.contains(nextFocused)) {
          setActiveHighlightTarget(null);
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-gray-100">속성</h3>
        <span className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1 text-[11px] text-gray-300">
          {selectedPropertiesLabel}
        </span>
      </div>
      <p className="text-xs text-gray-400">
        왼쪽 Layers에서 오브젝트를 클릭하면 해당 오브젝트의 속성만 표시됩니다.
      </p>

      {renderPropertiesPanels()}
    </div>
  );

  const renderAssetsTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">에셋 파일</h3>

      <div className="grid grid-cols-2 items-center gap-2">
        <label className="text-xs text-gray-500">theme</label>
        <select
          value={assetTheme}
          onChange={(e) => setAssetTheme(e.target.value)}
          className="px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        >
          {themeOptions.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {v2_ASSET_KEYS.map((key) => {
          const inputId = `v2-asset-upload-${key}-${assetTheme}`;
          const assetUrl = renderConfig.assets[key][assetTheme];
          const assetSize = renderConfig.assetDimensions[key][assetTheme];

          return (
            <div key={key} className="rounded border border-gray-300 bg-white p-3 space-y-2">
              <p className="text-xs text-gray-500">{v2_ASSET_LABELS[key]}</p>

              <input
                id={inputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) =>
                  handleAssetFileUpload(key, assetTheme, e.target.files?.[0] ?? null)
                }
              />

              <div className="flex items-center gap-2">
                <label
                  htmlFor={inputId}
                  className="inline-flex cursor-pointer items-center justify-center rounded border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                >
                  파일 선택
                </label>
                <button
                  type="button"
                  onClick={() => updateAssetUrl(key, assetTheme, "", null)}
                  className="inline-flex items-center justify-center rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>

              <p className="text-[11px] text-gray-500 break-all">
                {assetUrl ? "업로드 완료" : "선택된 파일 없음"}
              </p>
              {assetSize && (
                <p className="text-[11px] text-emerald-700">
                  size: {assetSize.width} x {assetSize.height}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">샘플 데이터</h3>
      <p className="text-xs text-gray-500">
        월요일 카드(첫 번째 카드)만 빠르게 조정해서 프리뷰 확인
      </p>

      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">time</label>
        <input
          type="time"
          value={(firstEntry?.time as string) || "09:00"}
          onChange={(e) => updateFirstEntryField("time", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">mainTitle</label>
        <textarea
          rows={3}
          value={(firstEntry?.mainTitle as string) || ""}
          onChange={(e) => updateFirstEntryField("mainTitle", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-500 block">subTitle</label>
        <input
          type="text"
          value={(firstEntry?.subTitle as string) || ""}
          onChange={(e) => updateFirstEntryField("subTitle", e.target.value)}
          className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-sm"
        />
      </div>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">isGuerrilla</span>
        <input
          type="checkbox"
          checked={Boolean(firstEntry?.isGuerrilla)}
          onChange={(e) => updateFirstEntryField("isGuerrilla", e.target.checked)}
        />
      </label>

      <label className="flex items-center justify-between gap-2 rounded border border-gray-300 bg-white px-3 py-2">
        <span className="text-sm text-gray-700">monday isOffline</span>
        <input
          type="checkbox"
          checked={Boolean(firstCard?.isOffline)}
          onChange={(e) => updateFirstDayOffline(e.target.checked)}
        />
      </label>
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-4">
      <h3 className="font-bold text-base text-gray-800">내보내기</h3>
      <button
        onClick={handleCopyJson}
        className="w-full bg-timetable-primary text-white py-2 rounded text-sm font-semibold hover:bg-timetable-primary-hover transition"
      >
        renderConfig JSON 복사
      </button>
      {copyState === "success" && (
        <p className="text-xs text-green-600">JSON이 클립보드에 복사됐습니다.</p>
      )}
      {copyState === "error" && (
        <p className="text-xs text-red-600">복사에 실패했습니다. 콘솔을 확인해 주세요.</p>
      )}

      <button
        onClick={() =>
          actions.downloadImage(
            renderConfig.templateSize.width,
            renderConfig.templateSize.height
          )
        }
        className="w-full bg-gray-700 text-white py-2 rounded text-sm font-semibold hover:bg-gray-800 transition"
      >
        프리뷰 PNG 저장
      </button>
      <button
        onClick={resetData}
        className="w-full bg-red-500 text-white py-2 rounded text-sm font-semibold hover:bg-red-600 transition"
      >
        샘플 데이터 리셋
      </button>
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === "canvas") return renderCanvasTab();
    if (activeTab === "schema") return renderSchemaTab();
    if (activeTab === "properties") return renderPropertiesTab();
    if (activeTab === "style") return renderStyleTab();
    if (activeTab === "assets") return renderAssetsTab();
    if (activeTab === "data") return renderDataTab();
    return renderExportTab();
  };

  return (
    <div className="h-full min-h-0 w-full">
      <div className="v2-dark-form-theme h-full min-h-0 shrink-0 flex flex-col border-l border-[#303848] bg-gray-100 w-full">
        <div className="flex border-b-2 border-timetable-card-border bg-timetable-card-bg">
          {v2_BUILDER_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-1 text-[11px] font-bold text-center transition-all duration-200 border-b-2 ${
                  isActive
                    ? "text-timetable-primary border-timetable-primary"
                    : "text-gray-500 border-transparent hover:bg-timetable-input-bg hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
          {renderActiveTab()}
        </div>
      </div>
      {renderBoilerplateSettingsModal()}
    </div>
  );
};

export default V2TemplateBuilderForm;
