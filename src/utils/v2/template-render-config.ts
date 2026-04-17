import {
  SimpleFieldConfig,
  TLanOpt,
} from "@/types/time-table/data";
import {
  v2_DEFAULT_CARD_COMPONENT_ID,
  v2_TEMPLATE_COMPUTED_BINDING_KEYS,
  v2_TEMPLATE_DAY_KEYS,
  v2_TEMPLATE_COLOR_KEYS,
  v2_TEMPLATE_RENDER_CONFIG_VERSION,
  V2TemplateAutoResizeOptions,
  V2TemplateCardNode,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNodeBinding,
  V2TemplateComponentInstanceMode,
  V2TemplateComputedBindingKey,
  V2TemplateCardStructure,
  V2TemplateAssetRef,
  V2TemplateBuiltinAssetKey,
  V2TemplateColorPalette,
  V2TemplateColorKey,
  V2TemplateEditorOptions,
  V2TemplateFieldScope,
  V2TemplateFormField,
  V2TemplateFormSchema,
  V2TemplateFontFaceMetrics,
  V2TemplateFontRegistryItem,
  V2TemplateGraphComponentDefinition,
  V2TemplateGraphNode,
  V2TemplateGraphNodeOrder,
  V2TemplateGraphNodeType,
  V2TemplateDayKey,
  V2TemplateDayLabelFormat,
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateSceneAssetRole,
  V2TemplateSceneNode,
  V2TemplateStreamingDayFormat,
  V2TemplateStreamingTimeFormat,
  V2TemplateStyleRecord,
  V2TemplateVisibilityMode,
  V2TemplateWeekDateFormat,
} from "@/types/time-table/template-render-config";
import { v2_normalizeGraphOrderKeys } from "@/utils/v2/template-graph-order";
import { v2_resolveStreamingDayLabelByKey } from "@/utils/v2/text-formatting";

const v2_DEFAULT_THEME = "first";

const v2_COMPUTED_BINDING_KEYS = v2_TEMPLATE_COMPUTED_BINDING_KEYS;

const v2_COMPUTED_BINDING_KEY_SET = new Set(v2_COMPUTED_BINDING_KEYS);

const v2_FIELD_SCOPE_SET = new Set(["entry", "card", "global"]);

const v2_ASSET_KEYS = [
  "bgByTheme",
  "topObjectByTheme",
  "memoByTheme",
  "artist",
  "onlineByTheme",
  "online_mon",
  "online_tue",
  "online_wed",
  "online_thu",
  "online_fri",
  "online_sat",
  "online_sun",
  "multi_mon",
  "multi_tue",
  "multi_wed",
  "multi_thu",
  "multi_fri",
  "multi_sat",
  "multi_sun",
  "offlineByTheme",
  "offline_mon",
  "offline_tue",
  "offline_wed",
  "offline_thu",
  "offline_fri",
  "offline_sat",
  "offline_sun",
  "offlineMemo_mon",
  "offlineMemo_tue",
  "offlineMemo_wed",
  "offlineMemo_thu",
  "offlineMemo_fri",
  "offlineMemo_sat",
  "offlineMemo_sun",
  "profileFrameByTheme",
  "profileBgByTheme",
  "guideByTheme",
] as const;

const v2_ASSET_KEY_SET = new Set<string>(v2_ASSET_KEYS);

const v2_isBuiltinAssetKey = (value: unknown): value is V2TemplateBuiltinAssetKey => {
  return typeof value === "string" && v2_ASSET_KEY_SET.has(value);
};

const v2_toBuiltinAssetRef = (
  value: V2TemplateBuiltinAssetKey
): V2TemplateAssetRef => ({
  source: "builtin",
  key: value,
});

const v2_normalizeAssetRef = (candidate: unknown): V2TemplateAssetRef | undefined => {
  if (!v2_isRecord(candidate)) return undefined;
  if (candidate.source === "builtin" && v2_isBuiltinAssetKey(candidate.key)) {
    return v2_toBuiltinAssetRef(candidate.key);
  }
  if (
    candidate.source === "extra" &&
    typeof candidate.key === "string" &&
    candidate.key.trim().length > 0
  ) {
    return {
      source: "extra",
      key: candidate.key.trim(),
    };
  }
  return undefined;
};

const v2_normalizeAssetRefByDayKey = (
  candidate: unknown
): Partial<Record<V2TemplateDayKey, V2TemplateAssetRef>> | undefined => {
  if (!v2_isRecord(candidate)) return undefined;
  const next: Partial<Record<V2TemplateDayKey, V2TemplateAssetRef>> = {};
  Object.entries(candidate).forEach(([rawDayKey, rawAssetRef]) => {
    const dayKey = v2_parseDayKey(rawDayKey);
    if (!dayKey) return;
    const normalizedAssetRef = v2_normalizeAssetRef(rawAssetRef);
    if (!normalizedAssetRef) return;
    next[dayKey] = normalizedAssetRef;
  });
  return Object.keys(next).length > 0 ? next : undefined;
};

export const v2_isEntryFieldBindingKey = (
  binding: V2TemplateCardNodeBinding,
  key: string
): boolean => {
  return binding.mode === "field" && binding.scope === "entry" && binding.key === key;
};

const v2_DAY_KEY_SET = new Set<string>(v2_TEMPLATE_DAY_KEYS);
const v2_DAY_KEY_ALIASES: Record<string, V2TemplateDayKey> = {
  "0": "mon",
  "1": "tue",
  "2": "wed",
  "3": "thu",
  "4": "fri",
  "5": "sat",
  "6": "sun",
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
  월: "mon",
  화: "tue",
  수: "wed",
  목: "thu",
  금: "fri",
  토: "sat",
  일: "sun",
};
const v2_DAY_INDEX_BY_KEY: Record<V2TemplateDayKey, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

export const v2_dayKeyFromIndex = (index: number): V2TemplateDayKey => {
  if (!Number.isFinite(index)) return "mon";
  const normalized = ((Math.trunc(index) % 7) + 7) % 7;
  return v2_TEMPLATE_DAY_KEYS[normalized] ?? "mon";
};

export const v2_dayIndexFromKey = (dayKey: V2TemplateDayKey): number => {
  return v2_DAY_INDEX_BY_KEY[dayKey];
};

export const v2_parseDayKey = (candidate: unknown): V2TemplateDayKey | null => {
  if (typeof candidate === "number" && Number.isFinite(candidate)) {
    return v2_dayKeyFromIndex(candidate);
  }

  if (typeof candidate !== "string") {
    return null;
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;
  if (v2_DAY_KEY_SET.has(normalized)) {
    return normalized as V2TemplateDayKey;
  }

  return v2_DAY_KEY_ALIASES[normalized] ?? null;
};

const v2_createDefaultDayLabelFormat = (
  preset: TLanOpt = "en"
): V2TemplateDayLabelFormat => ({
  mode: "preset",
  preset,
  custom: {},
});

const v2_createDefaultStreamingDayFormat = (
  locale: TLanOpt = "en"
): V2TemplateStreamingDayFormat => ({
  locale,
  width: "short",
  caseStyle: "original",
  custom: {},
});

const v2_createDefaultStreamingTimeFormat =
  (): V2TemplateStreamingTimeFormat => ({
    hourCycle: "h12",
    padHour: true,
    showMeridiem: true,
    meridiemStyle: "upper",
    meridiemPosition: "prefix",
    meridiemSeparator: " ",
    timeSeparator: ":",
  });

const v2_createDefaultWeekDateFormat = (
  locale: TLanOpt = "en"
): V2TemplateWeekDateFormat => ({
  locale,
  dateOrder: "ymd",
  includeYear: true,
  yearStyle: "numeric",
  monthStyle: "2-digit",
  dateStyle: "2-digit",
  caseStyle: "original",
  dateSeparator: ".",
  monthDateSeparator: " ",
  rangeSeparator: " - ",
});

export const v2_resolveDayLabelByKey = ({
  dayKey,
  dayLabelFormat,
  streamingDayFormat,
  fallbackWeekdayOption = "en",
}: {
  dayKey: V2TemplateDayKey;
  dayLabelFormat?: V2TemplateDayLabelFormat;
  streamingDayFormat?: V2TemplateStreamingDayFormat;
  fallbackWeekdayOption?: TLanOpt;
}): string => {
  return v2_resolveStreamingDayLabelByKey({
    dayKey,
    dayLabelFormat,
    streamingDayFormat,
    fallbackWeekdayOption,
  });
};

const v2_DEFAULT_COLOR_PALETTE: V2TemplateColorPalette = {
  primary: "",
  secondary: "",
  tertiary: "",
  quaternary: "",
};

const v2_DEFAULT_FONT_FACE_METRICS: Required<V2TemplateFontFaceMetrics> = {
  ascentOverride: "84%",
  descentOverride: "16%",
  lineGapOverride: "0%",
  sizeAdjust: "100%",
};

const v2_DEFAULT_EDITOR_OPTIONS: V2TemplateEditorOptions = {
  isArtist: true,
  isMultiple: false,
  maxStreamingTimeByDay: 1,
  enableThemeSelection: false,
  useOnlineAssetsByDay: false,
  useOfflineAssetsByDay: false,
};

const v2_DEFAULT_MEMO_TEXT_GLOBAL_FIELD: V2TemplateFormField = {
  key: "memoText",
  scope: "global",
  type: "textarea",
  placeholder: "메모 적는 곳",
  defaultValue: "메모 적는 곳",
  maxLength: 200,
};

const v2_DEFAULT_FORM_SCHEMA: V2TemplateFormSchema = {
  fields: [
    {
      key: "time",
      scope: "entry",
      type: "time",
      placeholder: "10:00",
      required: true,
      defaultValue: "10:00",
    },
    {
      key: "mainTitle",
      scope: "entry",
      type: "textarea",
      placeholder: "메인 타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "subTitle",
      scope: "entry",
      type: "text",
      placeholder: "서브 타이틀 적는 곳",
      defaultValue: "",
      maxLength: 50,
    },
    v2_DEFAULT_MEMO_TEXT_GLOBAL_FIELD,
  ],
  showLabels: false,
  offlineToggle: {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
};

const v2_DEFAULT_LAYER_TREE: V2TemplateLayerNode[] = [
  {
    id: "grid",
    label: "Grid",
    kind: "component",
    componentKey: "grid",
    visibilityMode: "always",
    icon: "grid",
    target: "grid",
    sectionKey: "grid",
    children: [
      {
        id: v2_DEFAULT_CARD_COMPONENT_ID,
        label: "Card",
        kind: "group",
        visibilityMode: "always",
        isTemplateComponent: true,
        icon: "group",
        target: "cardContainer",
        sectionKey: "cardContainer",
        children: [
          {
            id: "online-background",
            label: "OnlineBackground",
            kind: "component",
            visibilityMode: "always",
            icon: "image",
            target: "cardNode:online-background",
            sectionKey: "onlineBackgroundContainer",
          },
          {
            id: "multi-background",
            label: "MultiBackground",
            kind: "component",
            visibilityMode: "always",
            icon: "image",
            target: "cardNode:multi-background",
            sectionKey: "multiBackgroundContainer",
          },
          {
            id: "offline-background",
            label: "OfflineBackground",
            kind: "component",
            visibilityMode: "always",
            icon: "image",
            target: "cardNode:offline-background",
            sectionKey: "offlineBackgroundContainer",
          },
          {
            id: "offline-memo-background",
            label: "OfflineMemoBackground",
            kind: "component",
            visibilityMode: "always",
            icon: "image",
            target: "cardNode:offline-memo-background",
            sectionKey: "offlineMemoBackgroundContainer",
          },
          {
            id: "streaming-day",
            label: "StreamingDay",
            kind: "component",
            visibilityMode: "always",
            icon: "text",
            target: "cardStreamingDay",
            sectionKey: "cardStreamingDay",
          },
          {
            id: "streaming-date",
            label: "StreamingDate",
            kind: "component",
            visibilityMode: "always",
            icon: "text",
            target: "cardStreamingDate",
            sectionKey: "cardStreamingDate",
          },
          {
            id: "streaming-time",
            label: "StreamingTime",
            kind: "component",
            visibilityMode: "always",
            icon: "text",
            target: "cardStreamingTime",
            sectionKey: "cardStreamingTime",
          },
          {
            id: "main-title",
            label: "MainTitle",
            kind: "component",
            visibilityMode: "always",
            icon: "text",
            target: "cardMainTitleContainer",
            sectionKey: "cardMainTitleContainer",
          },
          {
            id: "sub-title",
            label: "SubTitle",
            kind: "component",
            visibilityMode: "always",
            icon: "text",
            target: "cardSubTitleContainer",
            sectionKey: "cardSubTitleContainer",
          },
        ],
      },
    ],
  },
  {
    id: "week-flag",
    label: "WeekFlag",
    kind: "component",
    componentKey: "weekFlag",
    visibilityMode: "always",
    icon: "calendar",
    target: "weekFlag",
    sectionKey: "weekFlag",
  },
  {
    id: "top-object",
    label: "TopObject",
    kind: "component",
    componentKey: "topObject",
    visibilityMode: "always",
    icon: "image",
    target: "topObjectContainer",
    sectionKey: "topObjectContainer",
  },
  {
    id: "profile",
    label: "Profile",
    kind: "component",
    componentKey: "profile",
    visibilityMode: "always",
    icon: "group",
    children: [
      {
        id: "profile-image",
        label: "Image",
        kind: "component",
        visibilityMode: "always",
        icon: "image",
        target: "profileImage",
        sectionKey: "profileImage",
      },
      {
        id: "profile-frame",
        label: "Frame",
        kind: "component",
        visibilityMode: "always",
        icon: "layers",
        target: "profileFrame",
        sectionKey: "profileFrame",
      },
    ],
  },
  {
    id: "profile-text",
    label: "Artist",
    kind: "component",
    visibilityMode: "always",
    icon: "text",
    target: "profileText",
    sectionKey: "profileTextRootStyle",
  },
  {
    id: "artist-object",
    label: "Artist",
    kind: "component",
    visibilityMode: "always",
    icon: "image",
    target: "artistObject",
    sectionKey: "profileTextArtistImageStyle",
  },
  {
    id: "memo",
    label: "Memo",
    kind: "group",
    visibilityMode: "always",
    icon: "group",
    children: [
      {
        id: "memo-object",
        label: "Object",
        kind: "component",
        visibilityMode: "always",
        icon: "image",
        target: "memoObject",
        sectionKey: "memoContainer",
      },
      {
        id: "memo-text",
        label: "Text",
        kind: "component",
        visibilityMode: "always",
        icon: "text",
        target: "memoText",
        sectionKey: "memoContentContainer",
      },
    ],
  },
];

const v2_DEFAULT_CARD_STRUCTURE: V2TemplateCardStructure = {
  containerLayerId: "card",
  containerHighlightTarget: "cardContainer",
  containerStyleKey: "container",
  instanceMode: "component",
  instanceTransforms: {},
  nodeOrder: [
    "online-background",
    "multi-background",
    "offline-background",
    "offline-memo-background",
    "streaming-day",
    "streaming-date",
    "sub-title",
    "main-title",
    "streaming-time",
  ],
  nodes: {
    "online-background": {
      id: "online-background",
      label: "OnlineBackground",
      kind: "image",
      layerId: "online-background",
      highlightTarget: "cardNode:online-background",
      binding: {
        mode: "literal",
        value: "",
      },
      visibilityMode: "onlineSingleOnly",
      containerStyleKey: "onlineBackgroundContainer",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      assetRef: {
        source: "builtin",
        key: "onlineByTheme",
      },
      fit: "cover",
      alt: "online-card-bg",
      containerClassName: "absolute pointer-events-none",
    },
    "multi-background": {
      id: "multi-background",
      label: "MultiBackground",
      kind: "image",
      layerId: "multi-background",
      highlightTarget: "cardNode:multi-background",
      binding: {
        mode: "literal",
        value: "",
      },
      visibilityMode: "onlineMultipleOnly",
      containerStyleKey: "multiBackgroundContainer",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      assetRef: {
        source: "builtin",
        key: "multi_mon",
      },
      fit: "cover",
      alt: "multi-card-bg",
      containerClassName: "absolute pointer-events-none",
    },
    "offline-background": {
      id: "offline-background",
      label: "OfflineBackground",
      kind: "image",
      layerId: "offline-background",
      highlightTarget: "cardNode:offline-background",
      binding: {
        mode: "literal",
        value: "",
      },
      visibilityMode: "offlineNoMemoOnly",
      containerStyleKey: "offlineBackgroundContainer",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      assetRef: {
        source: "builtin",
        key: "offlineByTheme",
      },
      fit: "cover",
      alt: "offline-card-bg",
      containerClassName: "absolute pointer-events-none",
    },
    "offline-memo-background": {
      id: "offline-memo-background",
      label: "OfflineMemoBackground",
      kind: "image",
      layerId: "offline-memo-background",
      highlightTarget: "cardNode:offline-memo-background",
      binding: {
        mode: "literal",
        value: "",
      },
      visibilityMode: "offlineMemoOnly",
      containerStyleKey: "offlineMemoBackgroundContainer",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      assetRef: {
        source: "builtin",
        key: "offlineMemo_mon",
      },
      fit: "cover",
      alt: "offline-memo-card-bg",
      containerClassName: "absolute pointer-events-none",
    },
    "streaming-day": {
      id: "streaming-day",
      label: "StreamingDay",
      kind: "text",
      layerId: "streaming-day",
      highlightTarget: "cardStreamingDay",
      binding: {
        mode: "computed",
        key: "streamingDay",
      },
      visibilityMode: "onlineOnly",
      containerStyleKey: "streamingDay",
      textStyleKey: "streamingDayStyle",
      colorKey: "STREAMING_DAY",
      fontKey: "STREAMING_DAY",
      containerClassName: "absolute flex justify-center items-center",
    },
    "streaming-date": {
      id: "streaming-date",
      label: "StreamingDate",
      kind: "text",
      layerId: "streaming-date",
      highlightTarget: "cardStreamingDate",
      binding: {
        mode: "computed",
        key: "streamingDate",
      },
      visibilityMode: "onlineOnly",
      containerStyleKey: "streamingDate",
      textStyleKey: "streamingDateStyle",
      colorKey: "STREAMING_DATE",
      fontKey: "STREAMING_DATE",
      containerClassName: "absolute flex justify-center items-center",
    },
    "streaming-time": {
      id: "streaming-time",
      label: "StreamingTime",
      kind: "text",
      layerId: "streaming-time",
      highlightTarget: "cardStreamingTime",
      binding: {
        mode: "computed",
        key: "streamingTime",
      },
      visibilityMode: "onlineOnly",
      containerStyleKey: "streamingTime",
      textStyleKey: "streamingTimeStyle",
      colorKey: "STREAMING_TIME",
      fontKey: "STREAMING_TIME",
      containerClassName: "absolute flex justify-center items-center",
    },
    "main-title": {
      id: "main-title",
      label: "MainTitle",
      kind: "flexibleText",
      layerId: "main-title",
      highlightTarget: "cardMainTitleContainer",
      binding: {
        mode: "field",
        scope: "entry",
        key: "mainTitle",
      },
      visibilityMode: "onlineOnly",
      containerStyleKey: "mainTitleContainer",
      wrapperStyleKey: "mainTitleWrapperStyle",
      textStyleKey: "mainTitleTextStyle",
      optionsKey: "mainTitleOptions",
      colorKey: "MAIN_TITLE",
      fontKey: "MAIN_TITLE",
      containerClassName: "absolute flex justify-center items-center shrink-0",
      textClassName: "leading-none text-center",
    },
    "sub-title": {
      id: "sub-title",
      label: "SubTitle",
      kind: "flexibleText",
      layerId: "sub-title",
      highlightTarget: "cardSubTitleContainer",
      binding: {
        mode: "field",
        scope: "entry",
        key: "subTitle",
      },
      visibilityMode: "onlineOnly",
      containerStyleKey: "subTitleContainer",
      wrapperStyleKey: "subTitleWrapperStyle",
      textStyleKey: "subTitleTextStyle",
      optionsKey: "subTitleOptions",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      containerClassName: "absolute flex justify-center items-center",
      textClassName: "leading-none text-center w-full",
    },
  },
};

const v2_DEFAULT_SCENE_NODES: V2TemplateSceneNode[] = [
  {
    id: "scene-top-object",
    label: "TopObject",
    kind: "asset",
    layerId: "top-object",
    assetRef: {
      source: "builtin",
      key: "topObjectByTheme",
    },
    assetRole: "general",
    styleKey: "topObjectContainer",
    fit: "fill",
    alt: "top-object",
    visibilityMode: "always",
  },
  {
    id: "scene-grid",
    label: "Grid",
    kind: "cardCollection",
    layerId: "grid",
    componentId: v2_DEFAULT_CARD_COMPONENT_ID,
    visibilityMode: "always",
  },
  {
    id: "scene-week-flag",
    label: "WeekFlag",
    kind: "text",
    layerId: "week-flag",
    binding: {
      mode: "literal",
      value: "",
    },
    containerStyleKey: "weekFlag",
    colorKey: "WEEKLY_FLAG",
    fontKey: "WEEKLY_FLAG",
    highlightTarget: "weekFlag",
    containerClassName: "absolute flex justify-center items-center",
    visibilityMode: "always",
  },
  {
    id: "scene-memo-object",
    label: "MemoObject",
    kind: "asset",
    layerId: "memo-object",
    assetRef: {
      source: "builtin",
      key: "memoByTheme",
    },
    assetRole: "general",
    styleKey: "memoContainer",
    fit: "fill",
    alt: "memo-object",
    visibilityMode: "always",
  },
  {
    id: "scene-memo-text",
    label: "MemoText",
    kind: "flexibleText",
    layerId: "memo-text",
    binding: {
      mode: "field",
      scope: "global",
      key: "memoText",
    },
    containerStyleKey: "memoContentContainer",
    wrapperStyleKey: "memoTextContainer",
    textStyleKey: "memoTextStyle",
    colorKey: "ARTIST",
    fontKey: "ARTIST",
    highlightTarget: "memoText",
    containerClassName: "absolute flex justify-center items-center",
    textClassName: "text-center",
    visibilityMode: "always",
  },
  {
    id: "scene-profile-text",
    label: "Artist",
    kind: "flexibleText",
    layerId: "profile-text",
    binding: {
      mode: "field",
      scope: "global",
      key: "profileText",
    },
    containerStyleKey: "profileTextRootStyle",
    wrapperStyleKey: "profileTextWrapperStyle",
    textStyleKey: "profileTextStyle",
    colorKey: "ARTIST",
    fontKey: "ARTIST",
    highlightTarget: "profileText",
    containerClassName: "absolute flex justify-end items-center",
    textClassName: "text-center",
    visibilityMode: "always",
  },
  {
    id: "scene-artist-object",
    label: "Artist",
    kind: "asset",
    layerId: "artist-object",
    assetRef: {
      source: "builtin",
      key: "artist",
    },
    assetRole: "general",
    styleKey: "profileTextArtistImageStyle",
    fit: "fill",
    alt: "artist-object",
    visibilityMode: "always",
  },
  {
    id: "scene-profile",
    label: "Profile",
    kind: "group",
    layerId: "profile",
    visibilityMode: "always",
    children: [
      {
        id: "scene-profile-image",
        label: "ProfileImage",
        kind: "asset",
        layerId: "profile-image",
        assetRef: {
          source: "builtin",
          key: "profileBgByTheme",
        },
        assetRole: "profileImage",
        styleKey: "profileImage",
        fit: "cover",
        alt: "profile",
        visibilityMode: "always",
      },
      {
        id: "scene-profile-frame",
        label: "ProfileFrame",
        kind: "asset",
        layerId: "profile-frame",
        assetRef: {
          source: "builtin",
          key: "profileFrameByTheme",
        },
        assetRole: "profileFrame",
        styleKey: "profileFrame",
        fit: "fill",
        alt: "profile-frame",
        visibilityMode: "always",
      },
    ],
  },
  {
    id: "scene-background",
    label: "Background",
    kind: "asset",
    assetRef: {
      source: "builtin",
      key: "bgByTheme",
    },
    assetRole: "background",
    fit: "cover",
    alt: "background",
    visibilityMode: "always",
  },
  {
    id: "scene-guide-overlay",
    label: "GuideOverlay",
    kind: "asset",
    assetRef: {
      source: "builtin",
      key: "guideByTheme",
    },
    assetRole: "guideOverlay",
    fit: "cover",
    alt: "guide-overlay",
    visibilityMode: "always",
  },
];

const v2_mapSceneNodeKindToGraphType = (
  kind: V2TemplateSceneNode["kind"]
): V2TemplateGraphNodeType => {
  if (kind === "group") return "group";
  if (kind === "asset") return "image";
  if (kind === "cardCollection") return "cardCollection";
  if (kind === "componentInstance") return "componentInstance";
  if (kind === "flexibleText") return "flexibleText";
  return "text";
};

const v2_mapCardNodeKindToGraphType = (
  kind: V2TemplateCardNode["kind"]
): V2TemplateGraphNodeType => {
  if (kind === "image") return "image";
  if (kind === "flexibleText") return "flexibleText";
  return "text";
};

const v2_collectLayerNodesById = (
  layers: V2TemplateLayerNode[],
  map: Map<string, V2TemplateLayerNode> = new Map()
): Map<string, V2TemplateLayerNode> => {
  layers.forEach((layerNode) => {
    map.set(layerNode.id, layerNode);
    if (layerNode.children?.length) {
      v2_collectLayerNodesById(layerNode.children, map);
    }
  });
  return map;
};

const v2_areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

const v2_toUniqueStringList = (values: string[]): string[] => {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
};

const v2_DEFAULT_CARD_COLLECTION_INSTANCE_COUNT = 7;

const v2_pickComponentIdForCardCollection = ({
  collectionNode,
  componentDefinitions,
}: {
  collectionNode: V2TemplateGraphNode;
  componentDefinitions: Record<string, V2TemplateGraphComponentDefinition>;
}): string | null => {
  const metaComponentId =
    typeof collectionNode.meta?.componentId === "string" &&
    collectionNode.meta.componentId.trim().length > 0
      ? collectionNode.meta.componentId
      : null;
  if (!metaComponentId) return null;
  return componentDefinitions[metaComponentId] ? metaComponentId : null;
};

const v2_createCardInstanceNode = ({
  nodeId,
  collectionNode,
  componentId,
  instanceId,
  dayKey,
}: {
  nodeId: string;
  collectionNode: V2TemplateGraphNode;
  componentId: string;
  instanceId: string;
  dayKey?: V2TemplateDayKey;
}): V2TemplateGraphNode => {
  const numericIndex = Number.parseInt(instanceId, 10);
  const safeIndex =
    Number.isFinite(numericIndex) && numericIndex >= 0 ? numericIndex : 0;
  const resolvedDayKey = dayKey ?? v2_dayKeyFromIndex(safeIndex);

  return {
    id: nodeId,
    type: "componentInstance",
    label: `Card ${safeIndex + 1}`,
    parentId: collectionNode.id,
    childIds: [],
    layerId: `${collectionNode.layerId ?? collectionNode.id}-instance-${safeIndex + 1}`,
    visibilityMode: "always",
    meta: {
      componentId,
      instanceId,
      dayKey: resolvedDayKey,
      layerIcon: "layers",
      layerTarget: `cardInstance:${instanceId}`,
      layerSectionKey: "grid",
    },
  };
};

const v2_seedDefaultCardCollectionInstances = ({
  nodes,
  componentDefinitions,
  instanceCount = v2_DEFAULT_CARD_COLLECTION_INSTANCE_COUNT,
}: {
  nodes: Record<string, V2TemplateGraphNode>;
  componentDefinitions: Record<string, V2TemplateGraphComponentDefinition>;
  instanceCount?: number;
}): Record<string, V2TemplateGraphNode> => {
  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...nodes,
  };
  const usedIds = new Set(Object.keys(nextNodes));
  let hasChanges = false;

  Object.values(nodes).forEach((node) => {
    if (node.type !== "cardCollection") return;

    const componentId = v2_pickComponentIdForCardCollection({
      collectionNode: node,
      componentDefinitions,
    });
    if (!componentId) return;

    const existingInstanceIds = node.childIds.filter((childId) => {
      const childNode = nextNodes[childId];
      return Boolean(childNode && childNode.type === "componentInstance");
    });
    if (existingInstanceIds.length > 0) return;

    const seededIds: string[] = [];
    for (let index = 0; index < instanceCount; index += 1) {
      const instanceId = String(index);
      let graphNodeId = `${node.id}:instance:${instanceId}`;
      let suffix = 1;
      while (usedIds.has(graphNodeId)) {
        graphNodeId = `${node.id}:instance:${instanceId}:${suffix}`;
        suffix += 1;
      }
      usedIds.add(graphNodeId);
      seededIds.push(graphNodeId);
      nextNodes[graphNodeId] = v2_createCardInstanceNode({
        nodeId: graphNodeId,
        collectionNode: node,
        componentId,
        instanceId,
        dayKey: v2_dayKeyFromIndex(index),
      });
      hasChanges = true;
    }

    nextNodes[node.id] = {
      ...node,
      childIds: seededIds,
    };
    hasChanges = true;
  });

  return hasChanges ? nextNodes : nodes;
};

const v2_ensureCardCollectionComponentInstances = ({
  nodes,
  componentDefinitions,
}: {
  nodes: Record<string, V2TemplateGraphNode>;
  componentDefinitions: Record<string, V2TemplateGraphComponentDefinition>;
}): Record<string, V2TemplateGraphNode> => {
  const nodeList = Object.values(nodes);
  if (nodeList.length === 0) return nodes;

  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...nodes,
  };
  let hasChanges = false;

  nodeList.forEach((node) => {
    if (node.type !== "cardCollection") return;

    const componentId = v2_pickComponentIdForCardCollection({
      collectionNode: node,
      componentDefinitions,
    });
    if (!componentId) return;
    const childInstanceIdsFromChildList = node.childIds.filter((childId) => {
      const childNode = nextNodes[childId];
      return Boolean(childNode && childNode.type === "componentInstance");
    });
    const orderedInstanceIds =
      childInstanceIdsFromChildList.length > 0
        ? v2_toUniqueStringList(childInstanceIdsFromChildList)
        : v2_toUniqueStringList(
            Object.values(nextNodes)
              .filter(
                (candidate) =>
                  candidate.type === "componentInstance" &&
                  candidate.parentId === node.id
              )
              .map((candidate) => candidate.id)
          );

    const desiredInstanceIds = [...orderedInstanceIds];

    desiredInstanceIds.forEach((instanceGraphNodeId, index) => {
      const currentNode = nextNodes[instanceGraphNodeId];
      if (!currentNode || currentNode.type !== "componentInstance") return;

      const instanceId =
        typeof currentNode.meta?.instanceId === "string"
          ? currentNode.meta.instanceId
          : String(index);
      const dayKey = v2_parseDayKey(currentNode.meta?.dayKey) ?? v2_dayKeyFromIndex(index);
      const normalized = v2_createCardInstanceNode({
        nodeId: currentNode.id,
        collectionNode: node,
        componentId:
          typeof currentNode.meta?.componentId === "string" &&
          currentNode.meta.componentId.trim().length > 0
            ? currentNode.meta.componentId.trim()
            : componentId,
        instanceId,
        dayKey,
      });

      const metaChanged =
        currentNode.meta?.componentId !== normalized.meta?.componentId ||
        currentNode.meta?.instanceId !== normalized.meta?.instanceId ||
        currentNode.meta?.dayKey !== normalized.meta?.dayKey ||
        currentNode.meta?.layerIcon !== normalized.meta?.layerIcon ||
        currentNode.meta?.layerTarget !== normalized.meta?.layerTarget ||
        currentNode.meta?.layerSectionKey !== normalized.meta?.layerSectionKey;
      if (
        currentNode.parentId === normalized.parentId &&
        currentNode.layerId === normalized.layerId &&
        currentNode.label === normalized.label &&
        currentNode.visibilityMode === normalized.visibilityMode &&
        metaChanged === false
      ) {
        return;
      }
      nextNodes[instanceGraphNodeId] = {
        ...currentNode,
        parentId: normalized.parentId,
        layerId: normalized.layerId,
        label: normalized.label,
        visibilityMode: normalized.visibilityMode,
        meta: {
          ...(currentNode.meta ?? {}),
          ...(normalized.meta ?? {}),
        },
      };
      hasChanges = true;
    });

    const normalizedCollectionMeta = {
      ...(node.meta ?? {}),
      componentId,
      layerTarget: node.meta?.layerTarget ?? "grid",
      layerSectionKey: node.meta?.layerSectionKey ?? "grid",
      layerIcon: node.meta?.layerIcon ?? "grid",
    };
    const childIdsChanged = !v2_areStringArraysEqual(node.childIds, desiredInstanceIds);
    const metaChanged =
      node.meta?.componentId !== normalizedCollectionMeta.componentId ||
      node.meta?.layerTarget !== normalizedCollectionMeta.layerTarget ||
      node.meta?.layerSectionKey !== normalizedCollectionMeta.layerSectionKey ||
      node.meta?.layerIcon !== normalizedCollectionMeta.layerIcon;
    if (!childIdsChanged && !metaChanged) return;

    nextNodes[node.id] = {
      ...node,
      childIds: desiredInstanceIds,
      meta: normalizedCollectionMeta,
    };
    hasChanges = true;
  });

  return hasChanges ? nextNodes : nodes;
};

const v2_toLayerGraphMeta = (layerNode?: V2TemplateLayerNode) => {
  if (!layerNode) return undefined;

  const nextMeta: NonNullable<V2TemplateGraphNode["meta"]> = {};

  if (layerNode.icon) {
    nextMeta.layerIcon = layerNode.icon;
  }
  if (layerNode.componentKey) {
    nextMeta.layerComponentKey = layerNode.componentKey;
  }
  if (layerNode.target) {
    nextMeta.layerTarget = layerNode.target;
  }
  if (layerNode.sectionKey) {
    nextMeta.layerSectionKey = layerNode.sectionKey;
  }
  if (layerNode.isTemplateComponent) {
    nextMeta.isTemplateComponent = true;
  }

  return Object.keys(nextMeta).length > 0 ? nextMeta : undefined;
};

const v2_createDefaultNodeGraph = ({
  layers,
  sceneNodes,
  card,
}: {
  layers: V2TemplateLayerNode[];
  sceneNodes: V2TemplateSceneNode[];
  card: V2TemplateCardStructure;
}): V2TemplateNodeGraph => {
  const nodes: Record<string, V2TemplateGraphNode> = {};
  const rootNodeIds: string[] = [];
  const layerNodeById = v2_collectLayerNodesById(layers);

  const resolveLayerMeta = ({
    layerId,
    fallbackId,
  }: {
    layerId?: string;
    fallbackId: string;
  }) => {
    return v2_toLayerGraphMeta(
      layerId ? layerNodeById.get(layerId) : layerNodeById.get(fallbackId)
    );
  };

  const visitSceneNode = (
    sceneNode: V2TemplateSceneNode,
    parentId: string | null
  ): void => {
    const childIds =
      sceneNode.kind === "group" || sceneNode.kind === "cardCollection"
        ? (sceneNode.children ?? []).map((child) => child.id)
        : [];

    const nextNode: V2TemplateGraphNode = {
      id: sceneNode.id,
      type: v2_mapSceneNodeKindToGraphType(sceneNode.kind),
      label: sceneNode.label,
      parentId,
      childIds,
      ...(sceneNode.layerId ? { layerId: sceneNode.layerId } : {}),
      ...(sceneNode.visibilityMode ? { visibilityMode: sceneNode.visibilityMode } : {}),
    };
    const layerMeta = resolveLayerMeta({
      layerId: sceneNode.layerId,
      fallbackId: sceneNode.id,
    });
    if (layerMeta) {
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        ...layerMeta,
      };
    }

    if (sceneNode.kind === "asset") {
      nextNode.styles = sceneNode.styleKey ? { styleKey: sceneNode.styleKey } : {};
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        ...(sceneNode.assetRef ? { assetRef: sceneNode.assetRef } : {}),
        ...(sceneNode.assetRole ? { assetRole: sceneNode.assetRole } : {}),
        ...(sceneNode.fit ? { fit: sceneNode.fit } : {}),
        ...(sceneNode.alt ? { alt: sceneNode.alt } : {}),
      };
    } else if (sceneNode.kind === "cardCollection") {
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        ...(sceneNode.componentId ? { componentId: sceneNode.componentId } : {}),
      };
    } else if (sceneNode.kind === "componentInstance") {
      if (sceneNode.styleKey) {
        nextNode.styles = {
          styleKey: sceneNode.styleKey,
        };
      }
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        componentId: sceneNode.componentId,
        instanceId: sceneNode.instanceId,
        dayKey: sceneNode.dayKey,
        layerTarget: sceneNode.styleKey
          ? `sceneNode:${sceneNode.id}`
          : `cardInstance:${sceneNode.instanceId}`,
        layerSectionKey: sceneNode.styleKey ?? "grid",
        layerIcon: "layers",
        ...(sceneNode.bindingOverrides
          ? { bindingOverrides: sceneNode.bindingOverrides }
          : {}),
      };
    } else if (sceneNode.kind === "text" || sceneNode.kind === "flexibleText") {
      nextNode.binding = sceneNode.binding;
      nextNode.styles = {
        containerStyleKey: sceneNode.containerStyleKey,
        ...(sceneNode.textStyleKey ? { textStyleKey: sceneNode.textStyleKey } : {}),
        ...(sceneNode.wrapperStyleKey
          ? { wrapperStyleKey: sceneNode.wrapperStyleKey }
          : {}),
        ...(sceneNode.optionsKey ? { optionsKey: sceneNode.optionsKey } : {}),
      };
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        colorKey: sceneNode.colorKey,
        fontKey: sceneNode.fontKey,
        ...(typeof sceneNode.containerClassName === "string"
          ? { containerClassName: sceneNode.containerClassName }
          : {}),
        ...(typeof sceneNode.textClassName === "string"
          ? { textClassName: sceneNode.textClassName }
          : {}),
      };
      if (sceneNode.highlightTarget) {
        nextNode.highlightTarget = sceneNode.highlightTarget;
      }
    }

    nodes[nextNode.id] = nextNode;

    if (parentId === null) {
      rootNodeIds.push(nextNode.id);
    }

    if (sceneNode.kind === "group" || sceneNode.kind === "cardCollection") {
      (sceneNode.children ?? []).forEach((child) => {
        visitSceneNode(child, sceneNode.id);
      });
    }
  };

  sceneNodes.forEach((sceneNode) => {
    visitSceneNode(sceneNode, null);
  });

  const cardRootId = "component-card-root";
  const cardNodeIds = card.nodeOrder.filter(
    (nodeId) => card.nodes[nodeId] !== undefined
  );
  const cardRootLayerMeta = resolveLayerMeta({
    layerId: card.containerLayerId,
    fallbackId: cardRootId,
  });

  nodes[cardRootId] = {
    id: cardRootId,
    type: "group",
    label: "Card",
    parentId: null,
    childIds: cardNodeIds,
    layerId: card.containerLayerId,
    highlightTarget: card.containerHighlightTarget,
    visibilityMode: "always",
    styles: {
      containerStyleKey: card.containerStyleKey,
    },
    meta: {
      componentId: v2_DEFAULT_CARD_COMPONENT_ID,
      ...(cardRootLayerMeta ?? {}),
    },
  };

  cardNodeIds.forEach((nodeId) => {
    const cardNode = card.nodes[nodeId];
    if (!cardNode) return;
    const layerMeta = resolveLayerMeta({
      layerId: cardNode.layerId,
      fallbackId: cardNode.id,
    });

    nodes[nodeId] = {
      id: cardNode.id,
      type: v2_mapCardNodeKindToGraphType(cardNode.kind),
      label: cardNode.label,
      parentId: cardRootId,
      childIds: [],
      layerId: cardNode.layerId,
      highlightTarget: cardNode.highlightTarget,
      visibilityMode: cardNode.visibilityMode,
      binding: cardNode.binding,
      styles: {
        containerStyleKey: cardNode.containerStyleKey,
        ...(cardNode.kind !== "image" && cardNode.textStyleKey
          ? { textStyleKey: cardNode.textStyleKey }
          : {}),
        ...(cardNode.kind !== "image" && cardNode.wrapperStyleKey
          ? { wrapperStyleKey: cardNode.wrapperStyleKey }
          : {}),
        ...(cardNode.kind !== "image" && cardNode.optionsKey
          ? { optionsKey: cardNode.optionsKey }
          : {}),
      },
      meta: {
        ...(layerMeta ?? {}),
        ...(cardNode.kind !== "image"
          ? {
              colorKey: cardNode.colorKey,
              fontKey: cardNode.fontKey,
            }
          : {}),
        ...(cardNode.kind === "image" && cardNode.assetRef
          ? { assetRef: cardNode.assetRef }
          : {}),
        ...(cardNode.kind === "image" && cardNode.assetRefByDayKey
          ? { assetRefByDayKey: cardNode.assetRefByDayKey }
          : {}),
        ...(cardNode.kind === "image" && cardNode.fit ? { fit: cardNode.fit } : {}),
        ...(cardNode.kind === "image" && cardNode.alt ? { alt: cardNode.alt } : {}),
        ...(typeof cardNode.containerClassName === "string"
          ? { containerClassName: cardNode.containerClassName }
          : {}),
        ...(cardNode.kind !== "image" && typeof cardNode.textClassName === "string"
          ? { textClassName: cardNode.textClassName }
          : {}),
      },
    };
  });

  const componentDefinitions: Record<
    string,
    V2TemplateGraphComponentDefinition
  > = {
    [v2_DEFAULT_CARD_COMPONENT_ID]: {
      id: v2_DEFAULT_CARD_COMPONENT_ID,
      label: "Card",
      rootNodeId: cardRootId,
      description: "Default card component",
      kind: "template",
      instanceMode: card.instanceMode,
      instanceTransforms: card.instanceTransforms,
    },
  };
  const seededNodes = v2_seedDefaultCardCollectionInstances({
    nodes,
    componentDefinitions,
  });
  const nextNodes = v2_ensureCardCollectionComponentInstances({
    nodes: seededNodes,
    componentDefinitions,
  });

  return v2_normalizeGraphOrderKeys({
    rootNodeIds,
    nodes: nextNodes,
    componentDefinitions,
  });
};

const v2_DEFAULT_GRAPH = v2_createDefaultNodeGraph({
  layers: v2_DEFAULT_LAYER_TREE,
  sceneNodes: v2_DEFAULT_SCENE_NODES,
  card: v2_DEFAULT_CARD_STRUCTURE,
});

const v2_DEFAULT_SCHOOL_SAFETY_NOTIFICATION_FACES: V2TemplateFontRegistryItem["faces"] =
  [
    {
      weight: 400,
      style: "normal",
      src: "https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimAllimjangTTF-R.woff2",
      format: "woff2",
    },
    {
      weight: 700,
      style: "normal",
      src: "https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimAllimjangTTF-B.woff2",
      format: "woff2",
    },
  ];

const v2_DEFAULT_BAGEL_FAT_FACES: V2TemplateFontRegistryItem["faces"] = [
  {
    weight: 400,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_JAMO@1.0/BagelFatOne-Regular.woff2",
    format: "woff2",
  },
];

const v2_DEFAULT_ESCOREDREAM_FACES: V2TemplateFontRegistryItem["faces"] = [
  {
    weight: 600,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-6Bold.woff",
    format: "woff",
  },
];

export const v2_DEFAULT_TEMPLATE_RENDER_CONFIG: V2TemplateRenderConfig = {
  version: v2_TEMPLATE_RENDER_CONFIG_VERSION,
  metadata: {
    schema: "v2_template_render_config",
    name: "v2 template default",
    description: "_v2_template 기본 렌더링 설정",
  },
  templateSize: {
    width: 4000,
    height: 2250,
  },
  weekdayOption: "en",
  dayLabelFormat: v2_createDefaultDayLabelFormat("en"),
  monthOption: "en",
  streamingDayFormat: v2_createDefaultStreamingDayFormat("en"),
  streamingTimeFormat: v2_createDefaultStreamingTimeFormat(),
  weekDateFormat: {
    ...v2_createDefaultWeekDateFormat("en"),
    dateOrder: "mdy",
    includeYear: false,
    monthStyle: "numeric",
    dateStyle: "numeric",
    dateSeparator: "/",
    monthDateSeparator: "/",
    rangeSeparator: " - ",
  },
  themes: [v2_DEFAULT_THEME],
  defaultTheme: v2_DEFAULT_THEME,
  buttonThemes: [{ value: v2_DEFAULT_THEME, label: v2_DEFAULT_THEME }],
  fonts: {
    fontFaceDefaults: { ...v2_DEFAULT_FONT_FACE_METRICS },
    registry: {
      schoolSafetyNotification: {
        family: "SchoolSafetyNotification",
        display: "swap",
        faces: v2_DEFAULT_SCHOOL_SAFETY_NOTIFICATION_FACES,
      },
      bagelFat: {
        family: "BagelFat",
        display: "swap",
        faces: v2_DEFAULT_BAGEL_FAT_FACES,
      },
      escoredream: {
        family: "Escoredream",
        display: "swap",
        faces: v2_DEFAULT_ESCOREDREAM_FACES,
      },
    },
  },
  baseFonts: {
    primary: "schoolSafetyNotification",
    secondary: "bagelFat",
    tertiary: "schoolSafetyNotification",
    quaternary: "schoolSafetyNotification",
  },
  baseColors: {
    first: {
      primary: "#FFF6E5",
      secondary: "#EC7363",
      tertiary: "",
      quaternary: "",
    },
    second: { ...v2_DEFAULT_COLOR_PALETTE },
    third: { ...v2_DEFAULT_COLOR_PALETTE },
  },
  componentColors: {
    MAIN_TITLE: "#EC7363",
    SUB_TITLE: "#FFF4E0",
    STREAMING_TIME: "#FFF4E0",
    STREAMING_DATE: "#FFF6E5",
    STREAMING_DAY: "#FFF4E0",
    ARTIST: "#FFF4DF",
    WEEKLY_FLAG: "#FFF6E5",
  },
  componentFonts: {
    MAIN_TITLE: "primary",
    SUB_TITLE: "primary",
    STREAMING_TIME: "primary",
    STREAMING_DATE: "secondary",
    STREAMING_DAY: "primary",
    ARTIST: "primary",
    WEEKLY_FLAG: "primary",
  },
  maxFontSizes: {
    MAIN_TITLE: 82,
    SUB_TITLE: 58,
    ARTIST: 76,
  },
  cardSizes: {
    online: {
      width: 720,
      height: 560,
    },
    offline: {
      width: 720,
      height: 560,
    },
    profile: {
      width: 1540,
      height: 1540,
    },
    frame: {
      width: 4000,
      height: 2250,
    },
  },
  editorOptions: { ...v2_DEFAULT_EDITOR_OPTIONS },
  profileTextPlaceholder: "아티스트 명",
  formSchema: v2_DEFAULT_FORM_SCHEMA,
  assets: {
    bgByTheme: {
      first: null,
    },
    topObjectByTheme: {
      first: null,
    },
    memoByTheme: {
      first: null,
    },
    artist: {
      first: null,
    },
    onlineByTheme: {
      first: null,
    },
    online_mon: {
      first: null,
    },
    online_tue: {
      first: null,
    },
    online_wed: {
      first: null,
    },
    online_thu: {
      first: null,
    },
    online_fri: {
      first: null,
    },
    online_sat: {
      first: null,
    },
    online_sun: {
      first: null,
    },
    multi_mon: {
      first: null,
    },
    multi_tue: {
      first: null,
    },
    multi_wed: {
      first: null,
    },
    multi_thu: {
      first: null,
    },
    multi_fri: {
      first: null,
    },
    multi_sat: {
      first: null,
    },
    multi_sun: {
      first: null,
    },
    offlineByTheme: {
      first: null,
    },
    offline_mon: {
      first: null,
    },
    offline_tue: {
      first: null,
    },
    offline_wed: {
      first: null,
    },
    offline_thu: {
      first: null,
    },
    offline_fri: {
      first: null,
    },
    offline_sat: {
      first: null,
    },
    offline_sun: {
      first: null,
    },
    offlineMemo_mon: {
      first: null,
    },
    offlineMemo_tue: {
      first: null,
    },
    offlineMemo_wed: {
      first: null,
    },
    offlineMemo_thu: {
      first: null,
    },
    offlineMemo_fri: {
      first: null,
    },
    offlineMemo_sat: {
      first: null,
    },
    offlineMemo_sun: {
      first: null,
    },
    profileFrameByTheme: {
      first: null,
    },
    profileBgByTheme: {
      first: null,
    },
    guideByTheme: {
      first: null,
    },
  },
  assetDimensions: {
    bgByTheme: {
      first: null,
    },
    topObjectByTheme: {
      first: null,
    },
    memoByTheme: {
      first: null,
    },
    artist: {
      first: null,
    },
    onlineByTheme: {
      first: null,
    },
    online_mon: {
      first: null,
    },
    online_tue: {
      first: null,
    },
    online_wed: {
      first: null,
    },
    online_thu: {
      first: null,
    },
    online_fri: {
      first: null,
    },
    online_sat: {
      first: null,
    },
    online_sun: {
      first: null,
    },
    multi_mon: {
      first: null,
    },
    multi_tue: {
      first: null,
    },
    multi_wed: {
      first: null,
    },
    multi_thu: {
      first: null,
    },
    multi_fri: {
      first: null,
    },
    multi_sat: {
      first: null,
    },
    multi_sun: {
      first: null,
    },
    offlineByTheme: {
      first: null,
    },
    offline_mon: {
      first: null,
    },
    offline_tue: {
      first: null,
    },
    offline_wed: {
      first: null,
    },
    offline_thu: {
      first: null,
    },
    offline_fri: {
      first: null,
    },
    offline_sat: {
      first: null,
    },
    offline_sun: {
      first: null,
    },
    offlineMemo_mon: {
      first: null,
    },
    offlineMemo_tue: {
      first: null,
    },
    offlineMemo_wed: {
      first: null,
    },
    offlineMemo_thu: {
      first: null,
    },
    offlineMemo_fri: {
      first: null,
    },
    offlineMemo_sat: {
      first: null,
    },
    offlineMemo_sun: {
      first: null,
    },
    profileFrameByTheme: {
      first: null,
    },
    profileBgByTheme: {
      first: null,
    },
    guideByTheme: {
      first: null,
    },
  },
  extraAssets: {},
  extraAssetDimensions: {},
  layout: {
    grid: {
      layoutMode: "grid3x3",
      flex42ThreeRow: "bottom",
      flex42Align: "center",
      left: 33,
      top: 121,
      rowGap: 68,
      columnGap: 20,
      columns: 3,
      width: 2201,
      height: 1816,
      gridEmptySlotA: 3,
      gridEmptySlotB: 6,
    },
    weekFlag: {
      fontSize: 76,
      fontWeight: 700,
      width: 580,
      height: 114,
      top: 568,
      left: 1557,
    },
    topObjectContainer: {
      position: "absolute",
      width: 4000,
      height: 2250,
      zIndex: 50,
    },
    profileImage: {
      top: 496,
      left: 2400,
      zIndex: 20,
    },
    profileFrame: {
      position: "absolute",
      width: 4000,
      height: 2250,
      zIndex: 10,
    },
    profileTextRootStyle: {
      position: "absolute",
      left: 2630,
      top: 1820,
      width: 1000,
      height: 120,
      zIndex: 30,
      justifyContent: "center",
      alignItems: "center",
    },
    profileTextWrapperStyle: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 1000,
      height: 120,
      rotateDeg: 1.8,
    },
    profileTextStyle: {
      fontSize: 76,
      fontWeight: 700,
      lineHeight: 1,
      textAlign: "center",
    },
    profileTextArtistImageStyle: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 4000,
      height: 2250,
    },
    card: {
      onlineBackgroundContainer: {
        width: 720,
        height: 560,
        top: 0,
        left: 0,
      },
      multiBackgroundContainer: {
        width: 720,
        height: 560,
        top: 0,
        left: 0,
      },
      offlineBackgroundContainer: {
        width: 720,
        height: 560,
        top: 0,
        left: 0,
      },
      offlineMemoBackgroundContainer: {
        width: 720,
        height: 560,
        top: 0,
        left: 0,
      },
      streamingDay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        opacity: 0,
        pointerEvents: "none",
      },
      streamingDate: {
        width: 160,
        height: 100,
        position: "absolute",
        top: 3,
        left: 31,
        rotateDeg: -13.5,
        zIndex: 10,
      },
      streamingTime: {
        width: 540,
        height: 40,
        left: 98,
        top: 476,
      },
      mainTitleContainer: {
        width: 540,
        height: 240,
        left: 98,
        top: 123,
      },
      subTitleContainer: {
        width: 540,
        height: 76,
        left: 98,
        top: 404,
      },
      container: {
        width: 720,
        height: 560,
        top: 0,
        left: 0,
      },
      mainTitleTextStyle: {
        fontSize: 82,
        lineHeight: 1,
        fontWeight: 700,
        textAlign: "center",
      },
      subTitleTextStyle: {
        fontSize: 58,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: -1.16,
        textAlign: "center",
      },
      mainTitleOptions: {
        maxFontSize: 82,
        multiline: true,
      },
      subTitleOptions: {
        maxFontSize: 58,
        multiline: false,
      },
      streamingDayStyle: {
        fontSize: 1,
        fontWeight: 400,
        lineHeight: 1,
        opacity: 0,
      },
      streamingDateStyle: {
        fontSize: 68,
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: 0,
      },
      streamingTimeStyle: {
        fontSize: 32,
        fontWeight: 400,
        lineHeight: 1,
        textAlign: "center",
      },
      mainTitleWrapperStyle: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
      subTitleWrapperStyle: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
    },
    scene: {
      memoContainer: {
        position: "absolute",
        left: 1513,
        top: 749,
        width: 720,
        height: 560,
        zIndex: 60,
      },
      memoContentContainer: {
        position: "absolute",
        left: 1513,
        top: 749,
        width: 720,
        height: 560,
      },
      memoTextContainer: {
        position: "absolute",
        left: 100,
        top: 160,
        width: 520,
        height: 300,
      },
      memoTextStyle: {
        fontFamily: "Escoredream",
        color: "#EC6F62",
        fontSize: 56,
        fontWeight: 600,
        lineHeight: 1,
        textAlign: "center",
      },
    },
  },
  graph: v2_DEFAULT_GRAPH,
};

const v2_isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const v2_isFieldType = (
  value: unknown
): value is SimpleFieldConfig["type"] => {
  return (
    value === "text" ||
    value === "textarea" ||
    value === "time" ||
    value === "date" ||
    value === "select" ||
    value === "number"
  );
};

const v2_asString = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const v2_asNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const v2_asBoolean = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const v2_asOptionalBoolean = (value: unknown): boolean | undefined => {
  return typeof value === "boolean" ? value : undefined;
};

const v2_asOptionalNumber = (value: unknown): number | undefined => {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const v2_mergeCssPropertiesRecord = (
  base: Record<string, string | number>,
  candidate: unknown
): Record<string, string | number> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, string | number> = { ...base };
  Object.entries(candidate).forEach(([key, value]) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      merged[key] = value;
      return;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        merged[key] = Number(trimmed);
      } else {
        merged[key] = value;
      }
    }
  });
  return merged;
};

const v2_mergeStyleRecord = (
  base: V2TemplateStyleRecord | undefined,
  candidate: unknown
): V2TemplateStyleRecord => {
  return v2_mergeCssPropertiesRecord(
    (base ?? {}) as Record<string, string | number>,
    candidate
  ) as V2TemplateStyleRecord;
};

const v2_mergeSceneLayoutEntry = (
  base: V2TemplateStyleRecord | V2TemplateAutoResizeOptions | undefined,
  candidate: unknown
): V2TemplateStyleRecord | V2TemplateAutoResizeOptions => {
  const mergedStyle = v2_mergeCssPropertiesRecord(
    (base ?? {}) as Record<string, string | number>,
    candidate
  );

  if (!v2_isRecord(candidate)) {
    return mergedStyle as V2TemplateStyleRecord;
  }

  const maxFontSize = v2_asOptionalNumber(candidate.maxFontSize);
  const multiline = v2_asOptionalBoolean(candidate.multiline);

  if (maxFontSize === undefined && multiline === undefined) {
    return mergedStyle as V2TemplateStyleRecord;
  }

  const next: V2TemplateAutoResizeOptions & Record<string, string | number> = {
    ...(base as Record<string, string | number> | undefined),
    ...mergedStyle,
  };
  if (maxFontSize !== undefined) {
    next.maxFontSize = maxFontSize;
  }
  if (multiline !== undefined) {
    next.multiline = multiline;
  }
  return next;
};

const v2_LAYER_ICON_KEY_SET = new Set([
  "group",
  "grid",
  "calendar",
  "image",
  "layers",
  "text",
]);

const v2_LAYER_COMPONENT_KEY_SET = new Set([
  "grid",
  "weekFlag",
  "topObject",
  "profile",
]);

const v2_VISIBILITY_MODE_SET = new Set([
  "always",
  "onlineOnly",
  "offlineOnly",
  "onlineSingleOnly",
  "onlineMultipleOnly",
  "offlineMemoOnly",
  "offlineNoMemoOnly",
]);

const v2_COMPONENT_INSTANCE_MODE_SET = new Set(["component", "detached"]);

const v2_SCENE_ASSET_FIT_SET = new Set(["cover", "contain", "fill"]);
const v2_SCENE_ASSET_ROLE_SET = new Set([
  "general",
  "background",
  "guideOverlay",
  "profileImage",
  "profileFrame",
]);

const v2_isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const v2_GRAPH_NODE_TYPE_SET = new Set([
  "group",
  "image",
  "text",
  "flexibleText",
  "cardCollection",
  "componentInstance",
]);
const v2_ORDER_KEY_MODEL = "orderKey" as const;

const v2_normalizeGraphNodeType = (
  value: unknown
): V2TemplateGraphNodeType | null => {
  if (typeof value === "string" && v2_GRAPH_NODE_TYPE_SET.has(value)) {
    return value as V2TemplateGraphNodeType;
  }
  return null;
};

const v2_normalizeGraphNodeStyleRefs = (
  candidate: unknown
): V2TemplateGraphNode["styles"] => {
  if (!v2_isRecord(candidate)) return undefined;

  const next: NonNullable<V2TemplateGraphNode["styles"]> = {};

  if (typeof candidate.styleKey === "string") {
    next.styleKey = candidate.styleKey;
  }
  if (typeof candidate.containerStyleKey === "string") {
    next.containerStyleKey = candidate.containerStyleKey;
  }
  if (typeof candidate.textStyleKey === "string") {
    next.textStyleKey = candidate.textStyleKey;
  }
  if (typeof candidate.wrapperStyleKey === "string") {
    next.wrapperStyleKey = candidate.wrapperStyleKey;
  }
  if (typeof candidate.optionsKey === "string") {
    next.optionsKey = candidate.optionsKey;
  }

  return Object.keys(next).length > 0 ? next : undefined;
};

const v2_normalizeGraphNodeOrder = (
  candidate: unknown
): V2TemplateGraphNodeOrder | undefined => {
  if (!v2_isRecord(candidate)) return undefined;

  const candidateModel =
    typeof candidate.model === "string" ? candidate.model : undefined;
  if (candidateModel !== undefined && candidateModel !== v2_ORDER_KEY_MODEL) {
    return undefined;
  }

  const parsedOrderKey =
    typeof candidate.orderKey === "string" && candidate.orderKey.trim().length > 0
      ? candidate.orderKey
      : undefined;
  const next: V2TemplateGraphNodeOrder = {
    model: v2_ORDER_KEY_MODEL,
  };

  if (candidate.prevSiblingId === null) {
    next.prevSiblingId = null;
  } else if (typeof candidate.prevSiblingId === "string") {
    next.prevSiblingId = candidate.prevSiblingId;
  }

  if (parsedOrderKey) {
    next.orderKey = parsedOrderKey;
  }

  return next;
};

const v2_normalizeGraphNodeMeta = (
  candidate: unknown
): V2TemplateGraphNode["meta"] => {
  if (!v2_isRecord(candidate)) return undefined;

  const next: NonNullable<V2TemplateGraphNode["meta"]> = {};
  const normalizedAssetRef = v2_normalizeAssetRef(candidate.assetRef);
  if (normalizedAssetRef) {
    next.assetRef = normalizedAssetRef;
  }
  const normalizedAssetRefByDayKey = v2_normalizeAssetRefByDayKey(
    candidate.assetRefByDayKey
  );
  if (normalizedAssetRefByDayKey) {
    next.assetRefByDayKey = normalizedAssetRefByDayKey;
  }
  if (
    typeof candidate.assetRole === "string" &&
    v2_SCENE_ASSET_ROLE_SET.has(candidate.assetRole)
  ) {
    next.assetRole = candidate.assetRole as V2TemplateSceneAssetRole;
  }
  if (
    typeof candidate.fit === "string" &&
    v2_SCENE_ASSET_FIT_SET.has(candidate.fit)
  ) {
    next.fit = candidate.fit as V2TemplateSceneAssetFit;
  }
  if (typeof candidate.alt === "string") {
    next.alt = candidate.alt;
  }
  if (typeof candidate.componentId === "string") {
    next.componentId = candidate.componentId;
  }
  if (typeof candidate.instanceId === "string") {
    next.instanceId = candidate.instanceId;
  }
  const normalizedDayKey = v2_parseDayKey(candidate.dayKey);
  if (normalizedDayKey) {
    next.dayKey = normalizedDayKey;
  }
  if (
    typeof candidate.colorKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(candidate.colorKey)
  ) {
    next.colorKey = candidate.colorKey as V2TemplateColorKey;
  }
  if (
    typeof candidate.fontKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(candidate.fontKey)
  ) {
    next.fontKey = candidate.fontKey as V2TemplateColorKey;
  }
  if (
    typeof candidate.layerIcon === "string" &&
    v2_LAYER_ICON_KEY_SET.has(candidate.layerIcon)
  ) {
    next.layerIcon = candidate.layerIcon as V2TemplateLayerIconKey;
  }
  if (
    typeof candidate.layerComponentKey === "string" &&
    v2_LAYER_COMPONENT_KEY_SET.has(candidate.layerComponentKey)
  ) {
    next.layerComponentKey =
      candidate.layerComponentKey as V2TemplateLayerComponentKey;
  }
  if (typeof candidate.layerTarget === "string") {
    next.layerTarget = candidate.layerTarget as V2TemplateGraphNode["highlightTarget"];
  }
  if (typeof candidate.layerSectionKey === "string") {
    next.layerSectionKey = candidate.layerSectionKey;
  }
  if (typeof candidate.isTemplateComponent === "boolean") {
    next.isTemplateComponent = candidate.isTemplateComponent;
  }
  if (typeof candidate.containerClassName === "string") {
    next.containerClassName = candidate.containerClassName;
  }
  if (typeof candidate.textClassName === "string") {
    next.textClassName = candidate.textClassName;
  }
  if (v2_isRecord(candidate.bindingOverrides)) {
    const normalizedBindingOverrides: NonNullable<
      NonNullable<V2TemplateGraphNode["meta"]>["bindingOverrides"]
    > = {};
    Object.entries(candidate.bindingOverrides).forEach(([nodeId, rawBinding]) => {
      const trimmedNodeId = nodeId.trim();
      if (!trimmedNodeId) return;
      normalizedBindingOverrides[trimmedNodeId] = v2_normalizeBindingRef(rawBinding);
    });
    if (Object.keys(normalizedBindingOverrides).length > 0) {
      next.bindingOverrides = normalizedBindingOverrides;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
};

const v2_normalizeGraphNode = (
  nodeId: string,
  candidate: unknown
): V2TemplateGraphNode | null => {
  if (!v2_isRecord(candidate)) return null;
  const nodeRecord = candidate;

  const id = v2_asString(nodeRecord.id, nodeId).trim();
  if (!id) return null;

  const type = v2_normalizeGraphNodeType(nodeRecord.type);
  if (!type) return null;

  const childIds = Array.isArray(nodeRecord.childIds)
    ? Array.from(
        new Set(
          nodeRecord.childIds.filter(
            (childId): childId is string =>
              typeof childId === "string" && childId.trim().length > 0
          )
        )
      )
    : [];

  const parentId =
    nodeRecord.parentId === null
      ? null
      : typeof nodeRecord.parentId === "string"
        ? nodeRecord.parentId
        : null;

  const binding =
    nodeRecord.binding !== undefined
      ? v2_normalizeBindingRef(nodeRecord.binding)
      : undefined;

  const visibilityMode: V2TemplateVisibilityMode | undefined =
    typeof nodeRecord.visibilityMode === "string" &&
    v2_VISIBILITY_MODE_SET.has(nodeRecord.visibilityMode)
      ? (nodeRecord.visibilityMode as V2TemplateVisibilityMode)
      : undefined;
  const normalizedStyles = v2_normalizeGraphNodeStyleRefs(nodeRecord.styles);
  const normalizedMeta = v2_normalizeGraphNodeMeta(nodeRecord.meta);
  const normalizedOrder = v2_normalizeGraphNodeOrder(nodeRecord.order);

  const nextLabel =
    nodeId === "scene-profile-text"
      ? "Artist"
      : v2_asString(nodeRecord.label, id);
  const isArtistObjectNode =
    id === "scene-artist-object" || nodeRecord.layerId === "artist-object";

  const nextMeta =
    isArtistObjectNode
      ? {
          ...(normalizedMeta ?? {}),
          ...(normalizedMeta?.assetRef?.source === "builtin" &&
          normalizedMeta.assetRef.key === "profileBgByTheme"
            ? {
                assetRef: v2_toBuiltinAssetRef("artist"),
              }
            : {}),
          ...(normalizedMeta?.layerTarget === "profileText"
            ? {
                layerTarget: "artistObject" as V2TemplateGraphNode["highlightTarget"],
              }
            : {}),
        }
      : normalizedMeta;
  const nextHighlightTarget =
    typeof nodeRecord.highlightTarget === "string"
      ? isArtistObjectNode && nodeRecord.highlightTarget === "profileText"
        ? ("artistObject" as V2TemplateGraphNode["highlightTarget"])
        : (nodeRecord.highlightTarget as V2TemplateGraphNode["highlightTarget"])
      : undefined;

  return {
    id,
    type,
    label: nextLabel,
    parentId,
    childIds,
    ...(typeof nodeRecord.layerId === "string"
      ? { layerId: nodeRecord.layerId }
      : {}),
    ...(nextHighlightTarget ? { highlightTarget: nextHighlightTarget } : {}),
    ...(visibilityMode ? { visibilityMode } : {}),
    ...(binding ? { binding } : {}),
    ...(normalizedStyles ? { styles: normalizedStyles } : {}),
    ...(nextMeta ? { meta: nextMeta } : {}),
    ...(normalizedOrder ? { order: normalizedOrder } : {}),
  };
};

const v2_sanitizeNodeGraph = ({
  graph,
}: {
  graph: V2TemplateNodeGraph;
}): V2TemplateNodeGraph => {
  const validNodeIds = new Set(Object.keys(graph.nodes));
  if (validNodeIds.size === 0) {
    return {
      rootNodeIds: [],
      nodes: {},
      componentDefinitions: {},
    };
  }

  const nextNodes: Record<string, V2TemplateGraphNode> = {};
  Object.entries(graph.nodes).forEach(([id, node]) => {
    nextNodes[id] = {
      ...node,
      childIds: Array.from(
        new Set(
          node.childIds.filter(
            (childId) => childId !== id && validNodeIds.has(childId)
          )
        )
      ),
    };
  });

  const parentByChild = new Map<string, string>();
  Object.values(nextNodes).forEach((node) => {
    node.childIds.forEach((childId) => {
      if (!parentByChild.has(childId)) {
        parentByChild.set(childId, node.id);
      }
    });
  });

  const requestedRootSet = new Set(
    graph.rootNodeIds.filter((nodeId) => validNodeIds.has(nodeId))
  );

  Object.values(nextNodes).forEach((node) => {
    const forcedParentId = parentByChild.get(node.id);
    if (forcedParentId) {
      node.parentId = forcedParentId;
      return;
    }
    if (requestedRootSet.has(node.id)) {
      node.parentId = null;
      return;
    }
    // Graph-only mode: parentId-only links are not trusted.
    // Parent-child relation must be expressed by parent's childIds.
    node.parentId = null;
  });

  const computedRootNodeIds = Object.values(nextNodes)
    .filter((node) => node.parentId === null)
    .map((node) => node.id);
  const prioritizedRootNodeIds = [
    ...graph.rootNodeIds.filter((nodeId) => computedRootNodeIds.includes(nodeId)),
    ...computedRootNodeIds.filter((nodeId) => !graph.rootNodeIds.includes(nodeId)),
  ];

  const nextComponentDefinitions = Object.entries(graph.componentDefinitions).reduce<
    Record<string, V2TemplateGraphComponentDefinition>
  >((acc, [componentId, definition]) => {
    if (!validNodeIds.has(definition.rootNodeId)) return acc;
    acc[componentId] = definition;
    return acc;
  }, {});

  return v2_normalizeGraphOrderKeys({
    rootNodeIds:
      prioritizedRootNodeIds.length > 0
        ? prioritizedRootNodeIds
        : [],
    nodes: nextNodes,
    componentDefinitions:
      Object.keys(nextComponentDefinitions).length > 0
        ? nextComponentDefinitions
        : {},
  });
};

const v2_normalizeNodeGraph = (
  candidate: unknown
): V2TemplateNodeGraph => {
  const emptyGraph: V2TemplateNodeGraph = {
    rootNodeIds: [],
    nodes: {},
    componentDefinitions: {},
  };

  if (!v2_isRecord(candidate)) {
    return emptyGraph;
  }

  const hasCandidateNodes =
    v2_isRecord(candidate.nodes) && Object.keys(candidate.nodes).length > 0;
  const hasCandidateRootNodeIds = Array.isArray(candidate.rootNodeIds);

  const nextNodes: Record<string, V2TemplateGraphNode> = {};

  if (v2_isRecord(candidate.nodes)) {
    Object.entries(candidate.nodes).forEach(([nodeId, rawNode]) => {
      const normalizedNode = v2_normalizeGraphNode(nodeId, rawNode);
      if (!normalizedNode) return;
      nextNodes[normalizedNode.id] = normalizedNode;
    });
  }

  const hasCandidateComponentDefinitions =
    v2_isRecord(candidate.componentDefinitions) &&
    Object.keys(candidate.componentDefinitions).length > 0;
  const hasGraphPayload =
    hasCandidateNodes ||
    hasCandidateComponentDefinitions ||
    hasCandidateRootNodeIds;
  if (!hasGraphPayload) return emptyGraph;
  const nextComponentDefinitions: Record<
    string,
    V2TemplateGraphComponentDefinition
  > = {};

  if (v2_isRecord(candidate.componentDefinitions)) {
    Object.entries(candidate.componentDefinitions).forEach(
      ([componentId, rawDefinition]) => {
        if (!v2_isRecord(rawDefinition)) return;
        const id = v2_asString(
          rawDefinition.id,
          componentId
        ).trim();
        const rootNodeId = v2_asString(
          rawDefinition.rootNodeId,
          ""
        ).trim();
        if (!id || !rootNodeId || !nextNodes[rootNodeId]) return;
        const instanceTransforms = v2_normalizeCardInstanceTransforms(
          rawDefinition.instanceTransforms,
          {}
        );
        nextComponentDefinitions[id] = {
          id,
          label: v2_asString(rawDefinition.label, id),
          rootNodeId,
          ...(typeof rawDefinition.description === "string"
            ? { description: rawDefinition.description }
            : {}),
          ...(rawDefinition.kind === "template" || rawDefinition.kind === "custom"
            ? { kind: rawDefinition.kind }
            : {}),
          ...(typeof rawDefinition.instanceMode === "string" &&
          v2_COMPONENT_INSTANCE_MODE_SET.has(rawDefinition.instanceMode)
            ? {
                instanceMode:
                  rawDefinition.instanceMode as V2TemplateComponentInstanceMode,
              }
            : {}),
          ...(Object.keys(instanceTransforms).length > 0
            ? { instanceTransforms }
            : {}),
          ...(typeof rawDefinition.detachedAt === "string"
            ? { detachedAt: rawDefinition.detachedAt }
            : {}),
        };
      }
    );
  }

  const candidateRootNodeIds = Array.isArray(candidate.rootNodeIds)
    ? Array.from(
        new Set(
          candidate.rootNodeIds.filter(
            (nodeId): nodeId is string =>
              typeof nodeId === "string" &&
              nodeId.trim().length > 0 &&
              nextNodes[nodeId] !== undefined
          )
        )
      )
    : [];
  const upgradedNodes = v2_ensureCardCollectionComponentInstances({
    nodes: nextNodes,
    componentDefinitions: nextComponentDefinitions,
  });

  const v2_splitLegacyArtistGroupNodeGraph = (
    graph: V2TemplateNodeGraph
  ): V2TemplateNodeGraph => {
    const legacyGroup = graph.nodes["scene-artist"];
    if (!legacyGroup || legacyGroup.type !== "group") return graph;

    const nextNodes: Record<string, V2TemplateGraphNode> = {
      ...graph.nodes,
    };
    const rawChildIds = legacyGroup.childIds.filter((childId) => nextNodes[childId]);
    const preferredOrder = ["scene-profile-text", "scene-artist-object"];
    const orderedChildIds = [
      ...preferredOrder.filter((childId) => rawChildIds.includes(childId)),
      ...rawChildIds.filter((childId) => !preferredOrder.includes(childId)),
    ];

    if (orderedChildIds.length === 0) {
      delete nextNodes["scene-artist"];
      return {
        ...graph,
        nodes: nextNodes,
        rootNodeIds: graph.rootNodeIds.filter((nodeId) => nodeId !== "scene-artist"),
      };
    }

    orderedChildIds.forEach((childId) => {
      const childNode = nextNodes[childId];
      if (!childNode) return;
      nextNodes[childId] = {
        ...childNode,
        parentId: null,
      };
    });

    Object.entries(nextNodes).forEach(([nodeId, node]) => {
      if (nodeId === "scene-artist") return;
      if (!node.childIds.includes("scene-artist")) return;
      nextNodes[nodeId] = {
        ...node,
        childIds: node.childIds.filter((childId) => childId !== "scene-artist"),
      };
    });

    const insertionIndex = graph.rootNodeIds.indexOf("scene-artist");
    const rootWithoutLegacy = graph.rootNodeIds
      .filter((nodeId) => nodeId !== "scene-artist")
      .filter((nodeId) => !orderedChildIds.includes(nodeId));
    const safeInsertionIndex =
      insertionIndex >= 0
        ? Math.min(insertionIndex, rootWithoutLegacy.length)
        : rootWithoutLegacy.length;
    const nextRootNodeIds = [...rootWithoutLegacy];
    nextRootNodeIds.splice(safeInsertionIndex, 0, ...orderedChildIds);

    delete nextNodes["scene-artist"];

    return {
      ...graph,
      nodes: nextNodes,
      rootNodeIds: nextRootNodeIds,
    };
  };

  const migratedGraph = v2_splitLegacyArtistGroupNodeGraph({
    rootNodeIds: candidateRootNodeIds.length > 0 ? candidateRootNodeIds : [],
    nodes: upgradedNodes,
    componentDefinitions: nextComponentDefinitions,
  });

  return v2_sanitizeNodeGraph({
    graph: migratedGraph,
  });
};

const v2_parseFieldScope = (
  value: unknown,
  fallback: V2TemplateFieldScope
): V2TemplateFieldScope => {
  if (typeof value === "string" && v2_FIELD_SCOPE_SET.has(value)) {
    return value as V2TemplateFieldScope;
  }
  return fallback;
};

const v2_normalizeEntrySelector = (
  candidate: unknown
): { mode: "index"; index: number } | undefined => {
  if (!v2_isRecord(candidate)) return undefined;
  if (candidate.mode !== "index") return undefined;
  const parsedIndex = Number(candidate.index);
  if (!Number.isFinite(parsedIndex)) return undefined;
  const index = Math.max(0, Math.floor(parsedIndex));
  return {
    mode: "index",
    index,
  };
};

const v2_normalizeBindingRef = (
  candidate: unknown
): V2TemplateCardNodeBinding => {
  const defaultBinding: V2TemplateCardNodeBinding = {
    mode: "literal",
    value: "",
  };

  if (!v2_isRecord(candidate)) {
    return defaultBinding;
  }

  const mode = v2_asString(candidate.mode, "").trim();
  if (mode === "field") {
    const key = v2_asString(candidate.key, "").trim();
    if (!key) return defaultBinding;
    const scope = v2_parseFieldScope(candidate.scope, "entry");
    const entrySelector =
      scope === "entry"
        ? v2_normalizeEntrySelector(candidate.entrySelector)
        : undefined;
    return {
      mode: "field",
      scope,
      key,
      ...(entrySelector ? { entrySelector } : {}),
    };
  }

  if (mode === "computed") {
    const key = v2_asString(candidate.key, "").trim();
    if (
      key &&
      v2_COMPUTED_BINDING_KEY_SET.has(key as V2TemplateComputedBindingKey)
    ) {
      return {
        mode: "computed",
        key: key as V2TemplateComputedBindingKey,
      };
    }
    return defaultBinding;
  }

  if (mode === "literal") {
    return {
      mode: "literal",
      value: v2_asString(candidate.value, ""),
    };
  }

  return defaultBinding;
};

const v2_normalizeFormSchemaField = (
  candidate: unknown
): V2TemplateFormField | null => {
  if (!v2_isRecord(candidate)) return null;
  if (!v2_isNonEmptyString(candidate.key)) return null;
  if (!v2_isFieldType(candidate.type)) return null;
  if (typeof candidate.placeholder !== "string") return null;

  const field: V2TemplateFormField = {
    key: candidate.key,
    scope: v2_parseFieldScope(candidate.scope, "entry"),
    type: candidate.type,
    placeholder: candidate.placeholder,
  };

  if (typeof candidate.label === "string") {
    field.label = candidate.label;
  }
  if (typeof candidate.required === "boolean") {
    field.required = candidate.required;
  }
  if (typeof candidate.maxLength === "number" && Number.isFinite(candidate.maxLength)) {
    field.maxLength = candidate.maxLength;
  }
  if (Array.isArray(candidate.options)) {
    field.options = candidate.options
      .filter(v2_isRecord)
      .map((option) => ({
        value: v2_asString(option.value, ""),
        label: v2_asString(option.label, ""),
      }))
      .filter((option) => option.value.length > 0);
  }
  if (
    typeof candidate.defaultValue === "string" ||
    (typeof candidate.defaultValue === "number" &&
      Number.isFinite(candidate.defaultValue))
  ) {
    field.defaultValue = candidate.defaultValue;
  }

  return field;
};

const v2_normalizeFormSchema = (
  candidate: unknown,
  fallback: V2TemplateFormSchema
): V2TemplateFormSchema => {
  if (!v2_isRecord(candidate)) return fallback;

  const fields = Array.isArray(candidate.fields)
    ? candidate.fields
        .map((field) => v2_normalizeFormSchemaField(field))
        .filter((field): field is V2TemplateFormField => field !== null)
    : [];

  return {
    fields: fields.length > 0 ? fields : fallback.fields,
    showLabels: v2_asOptionalBoolean(candidate.showLabels) ?? fallback.showLabels,
    offlineToggle:
      v2_isRecord(candidate.offlineToggle) &&
      typeof candidate.offlineToggle.label === "string" &&
      typeof candidate.offlineToggle.activeColor === "string" &&
      typeof candidate.offlineToggle.inactiveColor === "string"
        ? {
            label: candidate.offlineToggle.label,
            activeColor: candidate.offlineToggle.activeColor,
            inactiveColor: candidate.offlineToggle.inactiveColor,
          }
        : fallback.offlineToggle,
  };
};

const v2_normalizeCardInstanceTransforms = (
  candidate: unknown,
  fallback: Record<string, V2TemplateCardInstanceTransform>
): Record<string, V2TemplateCardInstanceTransform> => {
  const instanceTransforms: Record<string, V2TemplateCardInstanceTransform> = {};

  if (v2_isRecord(candidate)) {
    Object.entries(candidate).forEach(([key, rawTransform]) => {
      if (!v2_isRecord(rawTransform)) return;
      const nextTransform: V2TemplateCardInstanceTransform = {};
      if (
        typeof rawTransform.offsetX === "number" &&
        Number.isFinite(rawTransform.offsetX)
      ) {
        nextTransform.offsetX = rawTransform.offsetX;
      }
      if (
        typeof rawTransform.offsetY === "number" &&
        Number.isFinite(rawTransform.offsetY)
      ) {
        nextTransform.offsetY = rawTransform.offsetY;
      }
      if (
        typeof rawTransform.width === "number" &&
        Number.isFinite(rawTransform.width) &&
        rawTransform.width > 0
      ) {
        nextTransform.width = rawTransform.width;
      }
      if (
        typeof rawTransform.height === "number" &&
        Number.isFinite(rawTransform.height) &&
        rawTransform.height > 0
      ) {
        nextTransform.height = rawTransform.height;
      }
      if (
        typeof rawTransform.rotateDeg === "number" &&
        Number.isFinite(rawTransform.rotateDeg)
      ) {
        nextTransform.rotateDeg = rawTransform.rotateDeg;
      }
      if (
        typeof rawTransform.scale === "number" &&
        Number.isFinite(rawTransform.scale)
      ) {
        nextTransform.scale = rawTransform.scale;
      }
      if (
        typeof rawTransform.opacity === "number" &&
        Number.isFinite(rawTransform.opacity)
      ) {
        nextTransform.opacity = rawTransform.opacity;
      }
      if (Object.keys(nextTransform).length === 0) return;
      instanceTransforms[key] = nextTransform;
    });
  } else {
    Object.assign(instanceTransforms, fallback);
  }

  return instanceTransforms;
};

const v2_asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter((item): item is string => typeof item === "string");
  return next.length > 0 ? next : fallback;
};

const v2_clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const v2_mergeThemeStringMap = (
  base: Record<string, string | null>,
  candidate: unknown
): Record<string, string | null> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, string | null> = { ...base };

  Object.entries(candidate).forEach(([theme, value]) => {
    if (typeof value === "string" || value === null) {
      merged[theme] = value as string | null;
    }
  });

  return merged;
};

const v2_mergeThemeAssetDimensionMap = (
  base: Record<string, { width: number; height: number } | null>,
  candidate: unknown
): Record<string, { width: number; height: number } | null> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, { width: number; height: number } | null> = {
    ...base,
  };

  Object.entries(candidate).forEach(([theme, value]) => {
    if (value === null) {
      merged[theme] = null;
      return;
    }
    if (!v2_isRecord(value)) return;

    const width = v2_asNumber(value.width, NaN);
    const height = v2_asNumber(value.height, NaN);

    if (!Number.isFinite(width) || !Number.isFinite(height)) return;

    merged[theme] = {
      width: Math.max(0, Math.round(width)),
      height: Math.max(0, Math.round(height)),
    };
  });

  return merged;
};

const v2_normalizeExtraAssetMap = (
  candidate: unknown,
  fallback: Record<string, Record<string, string | null>> = {}
): Record<string, Record<string, string | null>> => {
  const normalized: Record<string, Record<string, string | null>> = {
    ...fallback,
  };
  if (!v2_isRecord(candidate)) return normalized;

  Object.entries(candidate).forEach(([rawKey, value]) => {
    const key = rawKey.trim();
    if (key.length === 0) return;
    normalized[key] = v2_mergeThemeStringMap(normalized[key] ?? {}, value);
  });

  return normalized;
};

const v2_normalizeExtraAssetDimensionMap = (
  candidate: unknown,
  fallback: Record<string, Record<string, { width: number; height: number } | null>> = {}
): Record<string, Record<string, { width: number; height: number } | null>> => {
  const normalized: Record<
    string,
    Record<string, { width: number; height: number } | null>
  > = {
    ...fallback,
  };
  if (!v2_isRecord(candidate)) return normalized;

  Object.entries(candidate).forEach(([rawKey, value]) => {
    const key = rawKey.trim();
    if (key.length === 0) return;
    normalized[key] = v2_mergeThemeAssetDimensionMap(
      normalized[key] ?? {},
      value
    );
  });

  return normalized;
};

const v2_mergePaletteMap = (
  base: Record<string, V2TemplateColorPalette>,
  candidate: unknown
): Record<string, V2TemplateColorPalette> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, V2TemplateColorPalette> = { ...base };

  Object.entries(candidate).forEach(([theme, value]) => {
    if (!v2_isRecord(value)) return;

    const fallbackPalette =
      merged[theme] ??
      v2_clone<V2TemplateColorPalette>(v2_DEFAULT_COLOR_PALETTE);

    merged[theme] = {
      primary: v2_asString(value.primary, fallbackPalette.primary),
      secondary: v2_asString(value.secondary, fallbackPalette.secondary),
      tertiary: v2_asString(value.tertiary, fallbackPalette.tertiary),
      quaternary: v2_asString(value.quaternary, fallbackPalette.quaternary),
    };
  });

  return merged;
};

const v2_mergeKeyedStringMap = (
  base: Record<string, string>,
  candidate: unknown,
  allowedKeys: readonly string[]
): Record<string, string> => {
  if (!v2_isRecord(candidate)) return base;

  const merged: Record<string, string> = { ...base };

  allowedKeys.forEach((key) => {
    merged[key] = v2_asString(candidate[key], merged[key]);
  });

  return merged;
};

const v2_normalizeFontFaceMetrics = (
  metrics: unknown,
  fallback: Required<V2TemplateFontFaceMetrics>
): Required<V2TemplateFontFaceMetrics> => {
  if (!v2_isRecord(metrics)) return fallback;

  return {
    ascentOverride: v2_asString(metrics.ascentOverride, fallback.ascentOverride),
    descentOverride: v2_asString(metrics.descentOverride, fallback.descentOverride),
    lineGapOverride: v2_asString(metrics.lineGapOverride, fallback.lineGapOverride),
    sizeAdjust: v2_asString(metrics.sizeAdjust, fallback.sizeAdjust),
  };
};

const v2_normalizeFontRegistryItem = (
  key: string,
  candidate: unknown,
  fallbackDefaults: Required<V2TemplateFontFaceMetrics>,
  fallbackItem?: V2TemplateFontRegistryItem
): V2TemplateFontRegistryItem | null => {
  if (!v2_isRecord(candidate) || !Array.isArray(candidate.faces)) return null;

  const family = v2_asString(candidate.family, fallbackItem?.family ?? key);
  if (!family.trim()) return null;

  const defaultDisplay = fallbackItem?.display ?? "swap";
  const display =
    candidate.display === "auto" ||
    candidate.display === "block" ||
    candidate.display === "swap" ||
    candidate.display === "fallback" ||
    candidate.display === "optional"
      ? candidate.display
      : defaultDisplay;

  const faces: V2TemplateFontRegistryItem["faces"] = [];

  candidate.faces.filter(v2_isRecord).forEach((face) => {
    const weight =
      typeof face.weight === "number" || typeof face.weight === "string"
        ? face.weight
        : "normal";

    const style =
      face.style === "normal" ||
      face.style === "italic" ||
      face.style === "oblique"
        ? face.style
        : "normal";

    const src = v2_asString(face.src, "");
    const format =
      face.format === "woff2" ||
      face.format === "woff" ||
      face.format === "truetype" ||
      face.format === "opentype"
        ? face.format
        : undefined;

    const unicodeRange = v2_asString(face.unicodeRange, "");
    const metrics = v2_normalizeFontFaceMetrics(face.metrics, fallbackDefaults);
    const faceDisplay =
      face.display === "auto" ||
      face.display === "block" ||
      face.display === "swap" ||
      face.display === "fallback" ||
      face.display === "optional"
        ? face.display
        : undefined;

    if (!src) return;

    faces.push({
      weight,
      style,
      src,
      format,
      unicodeRange: unicodeRange || undefined,
      display: faceDisplay,
      metrics,
    });
  });

  if (faces.length === 0) return null;

  return {
    family,
    display,
    faces,
  };
};

const v2_normalizeDayLabelFormat = (
  value: unknown,
  fallbackPreset: TLanOpt
): V2TemplateDayLabelFormat => {
  const next = v2_createDefaultDayLabelFormat(fallbackPreset);
  if (!v2_isRecord(value)) {
    return next;
  }

  if (value.mode === "custom" || value.mode === "preset") {
    next.mode = value.mode;
  }

  if (value.preset === "kr" || value.preset === "en" || value.preset === "jp") {
    next.preset = value.preset;
  }

  if (v2_isRecord(value.custom)) {
    const customEntries = Object.entries(value.custom).reduce<
      Partial<Record<V2TemplateDayKey, string>>
    >((acc, [rawKey, rawLabel]) => {
      const dayKey = v2_parseDayKey(rawKey);
      if (!dayKey) return acc;
      if (typeof rawLabel !== "string") return acc;
      const label = rawLabel.trim();
      if (!label) return acc;
      acc[dayKey] = label;
      return acc;
    }, {});
    next.custom = customEntries;
  }

  return next;
};

const v2_normalizeStreamingDayFormat = (
  value: unknown,
  fallbackLocale: TLanOpt,
  fallbackDayLabelFormat: V2TemplateDayLabelFormat
): V2TemplateStreamingDayFormat => {
  const next = v2_createDefaultStreamingDayFormat(fallbackLocale);
  next.custom = {
    ...(fallbackDayLabelFormat.custom ?? {}),
  };

  if (!v2_isRecord(value)) {
    return next;
  }

  if (value.locale === "kr" || value.locale === "en" || value.locale === "jp") {
    next.locale = value.locale;
  }

  if (value.width === "narrow" || value.width === "short" || value.width === "long") {
    next.width = value.width;
  }

  if (
    value.caseStyle === "original" ||
    value.caseStyle === "upper" ||
    value.caseStyle === "lower" ||
    value.caseStyle === "capitalize"
  ) {
    next.caseStyle = value.caseStyle;
  }

  if (v2_isRecord(value.custom)) {
    const customEntries = Object.entries(value.custom).reduce<
      Partial<Record<V2TemplateDayKey, string>>
    >((acc, [rawKey, rawLabel]) => {
      const dayKey = v2_parseDayKey(rawKey);
      if (!dayKey) return acc;
      if (typeof rawLabel !== "string") return acc;
      const label = rawLabel.trim();
      if (!label) return acc;
      acc[dayKey] = label;
      return acc;
    }, {});
    next.custom = customEntries;
  }

  return next;
};

const v2_normalizeStreamingTimeFormat = (
  value: unknown
): V2TemplateStreamingTimeFormat => {
  const next = v2_createDefaultStreamingTimeFormat();
  if (!v2_isRecord(value)) {
    return next;
  }

  if (value.hourCycle === "h12" || value.hourCycle === "h24") {
    next.hourCycle = value.hourCycle;
  }

  if (typeof value.padHour === "boolean") {
    next.padHour = value.padHour;
  }

  if (typeof value.showMeridiem === "boolean") {
    next.showMeridiem = value.showMeridiem;
  }

  if (
    value.meridiemStyle === "upper" ||
    value.meridiemStyle === "lower" ||
    value.meridiemStyle === "kr"
  ) {
    next.meridiemStyle = value.meridiemStyle;
  }

  if (value.meridiemPosition === "prefix" || value.meridiemPosition === "suffix") {
    next.meridiemPosition = value.meridiemPosition;
  }

  if (typeof value.meridiemSeparator === "string") {
    next.meridiemSeparator = value.meridiemSeparator;
  }

  if (typeof value.timeSeparator === "string") {
    next.timeSeparator = value.timeSeparator;
  }

  return next;
};

const v2_normalizeWeekDateFormat = (
  value: unknown,
  fallbackLocale: TLanOpt
): V2TemplateWeekDateFormat => {
  const next = v2_createDefaultWeekDateFormat(fallbackLocale);
  if (!v2_isRecord(value)) {
    return next;
  }

  if (value.locale === "kr" || value.locale === "en" || value.locale === "jp") {
    next.locale = value.locale;
  }

  if (
    value.dateOrder === "locale" ||
    value.dateOrder === "ymd" ||
    value.dateOrder === "mdy" ||
    value.dateOrder === "dmy"
  ) {
    next.dateOrder = value.dateOrder;
  }

  if (typeof value.includeYear === "boolean") {
    next.includeYear = value.includeYear;
  }

  if (value.yearStyle === "numeric" || value.yearStyle === "2-digit") {
    next.yearStyle = value.yearStyle;
  }

  if (
    value.monthStyle === "numeric" ||
    value.monthStyle === "2-digit" ||
    value.monthStyle === "short" ||
    value.monthStyle === "long"
  ) {
    next.monthStyle = value.monthStyle;
  }

  if (value.dateStyle === "numeric" || value.dateStyle === "2-digit") {
    next.dateStyle = value.dateStyle;
  }

  if (
    value.caseStyle === "original" ||
    value.caseStyle === "upper" ||
    value.caseStyle === "lower" ||
    value.caseStyle === "capitalize"
  ) {
    next.caseStyle = value.caseStyle;
  }

  if (typeof value.dateSeparator === "string") {
    next.dateSeparator = value.dateSeparator;
  }

  if (typeof value.monthDateSeparator === "string") {
    next.monthDateSeparator = value.monthDateSeparator;
  }

  if (typeof value.rangeSeparator === "string") {
    next.rangeSeparator = value.rangeSeparator;
  }

  return next;
};

export const v2_createDefaultTemplateRenderConfig = (): V2TemplateRenderConfig => {
  return v2_clone(v2_DEFAULT_TEMPLATE_RENDER_CONFIG);
};

export const v2_createEmptyTemplateNodeGraph = (): V2TemplateNodeGraph => {
  return {
    rootNodeIds: [],
    nodes: {},
    componentDefinitions: {},
  };
};

export const v2_createEmptyTemplateRenderConfig = (): V2TemplateRenderConfig => {
  const normalized = v2_createDefaultTemplateRenderConfig();
  return {
    ...normalized,
    graph: v2_createEmptyTemplateNodeGraph(),
  };
};

export const v2_normalizeTemplateRenderConfig = (
  raw: unknown
): V2TemplateRenderConfig => {
  const normalized = v2_createDefaultTemplateRenderConfig();

  if (!v2_isRecord(raw)) {
    return normalized;
  }

  if (v2_isRecord(raw.metadata)) {
    normalized.metadata = {
      schema: "v2_template_render_config",
      name: v2_asString(raw.metadata.name, normalized.metadata.name),
      description: v2_asString(
        raw.metadata.description,
        normalized.metadata.description
      ),
    };
  }

  if (v2_isRecord(raw.templateSize)) {
    normalized.templateSize = {
      width: v2_asNumber(raw.templateSize.width, normalized.templateSize.width),
      height: v2_asNumber(
        raw.templateSize.height,
        normalized.templateSize.height
      ),
    };
  }

  if (
    raw.weekdayOption === "kr" ||
    raw.weekdayOption === "en" ||
    raw.weekdayOption === "jp"
  ) {
    normalized.weekdayOption = raw.weekdayOption;
  }
  normalized.dayLabelFormat = v2_createDefaultDayLabelFormat(
    normalized.weekdayOption
  );
  if (raw.dayLabelFormat !== undefined) {
    normalized.dayLabelFormat = v2_normalizeDayLabelFormat(
      raw.dayLabelFormat,
      normalized.weekdayOption
    );
  }

  if (
    raw.monthOption === "kr" ||
    raw.monthOption === "en" ||
    raw.monthOption === "jp"
  ) {
    normalized.monthOption = raw.monthOption;
  }

  normalized.streamingDayFormat = v2_createDefaultStreamingDayFormat(
    normalized.dayLabelFormat.preset
  );
  normalized.streamingDayFormat.custom = {
    ...normalized.dayLabelFormat.custom,
  };
  if (raw.streamingDayFormat !== undefined) {
    normalized.streamingDayFormat = v2_normalizeStreamingDayFormat(
      raw.streamingDayFormat,
      normalized.dayLabelFormat.preset,
      normalized.dayLabelFormat
    );
  }

  normalized.streamingTimeFormat = v2_createDefaultStreamingTimeFormat();
  if (raw.streamingTimeFormat !== undefined) {
    normalized.streamingTimeFormat = v2_normalizeStreamingTimeFormat(
      raw.streamingTimeFormat
    );
  }

  normalized.weekDateFormat = v2_createDefaultWeekDateFormat(
    normalized.monthOption
  );
  if (raw.weekDateFormat !== undefined) {
    normalized.weekDateFormat = v2_normalizeWeekDateFormat(
      raw.weekDateFormat,
      normalized.monthOption
    );
  }

  normalized.themes = v2_asStringArray(raw.themes, normalized.themes);
  normalized.defaultTheme = v2_asString(raw.defaultTheme, normalized.defaultTheme);

  if (Array.isArray(raw.buttonThemes)) {
    const parsed = raw.buttonThemes
      .filter(v2_isRecord)
      .map((theme) => ({
        value: v2_asString(theme.value, ""),
        label: v2_asString(theme.label, ""),
      }))
      .filter((theme) => theme.value && theme.label);

    if (parsed.length > 0) {
      normalized.buttonThemes = parsed;
    }
  }

  if (v2_isRecord(raw.fonts)) {
    if (v2_isRecord(raw.fonts.fontFaceDefaults)) {
      normalized.fonts.fontFaceDefaults = v2_normalizeFontFaceMetrics(
        raw.fonts.fontFaceDefaults,
        normalized.fonts.fontFaceDefaults
      );
    }

    if (v2_isRecord(raw.fonts.registry)) {
      const mergedRegistry: Record<string, V2TemplateFontRegistryItem> = {
        ...normalized.fonts.registry,
      };

      Object.entries(raw.fonts.registry).forEach(([key, value]) => {
        const normalizedItem = v2_normalizeFontRegistryItem(
          key,
          value,
          normalized.fonts.fontFaceDefaults,
          mergedRegistry[key]
        );

        if (normalizedItem) {
          mergedRegistry[key] = normalizedItem;
        }
      });

      normalized.fonts.registry = mergedRegistry;
    }
  }

  if (v2_isRecord(raw.baseFonts)) {
    normalized.baseFonts = {
      primary: v2_asString(raw.baseFonts.primary, normalized.baseFonts.primary),
      secondary: v2_asString(
        raw.baseFonts.secondary,
        normalized.baseFonts.secondary
      ),
      tertiary: v2_asString(raw.baseFonts.tertiary, normalized.baseFonts.tertiary),
      quaternary: v2_asString(
        raw.baseFonts.quaternary,
        normalized.baseFonts.quaternary
      ),
    };
  }

  normalized.baseColors = v2_mergePaletteMap(
    normalized.baseColors,
    raw.baseColors
  );

  normalized.componentColors = v2_mergeKeyedStringMap(
    normalized.componentColors,
    raw.componentColors,
    v2_TEMPLATE_COLOR_KEYS
  );

  normalized.componentFonts = v2_mergeKeyedStringMap(
    normalized.componentFonts,
    raw.componentFonts,
    v2_TEMPLATE_COLOR_KEYS
  );

  if (v2_isRecord(raw.maxFontSizes)) {
    normalized.maxFontSizes = {
      MAIN_TITLE: v2_asNumber(
        raw.maxFontSizes.MAIN_TITLE,
        normalized.maxFontSizes.MAIN_TITLE
      ),
      SUB_TITLE: v2_asNumber(
        raw.maxFontSizes.SUB_TITLE,
        normalized.maxFontSizes.SUB_TITLE
      ),
      ARTIST: v2_asNumber(raw.maxFontSizes.ARTIST, normalized.maxFontSizes.ARTIST),
    };
  }

  if (v2_isRecord(raw.cardSizes)) {
    const cardSizes = normalized.cardSizes;

    if (v2_isRecord(raw.cardSizes.online)) {
      cardSizes.online = {
        width: v2_asNumber(raw.cardSizes.online.width, cardSizes.online.width),
        height: v2_asNumber(
          raw.cardSizes.online.height,
          cardSizes.online.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.offline)) {
      cardSizes.offline = {
        width: v2_asNumber(raw.cardSizes.offline.width, cardSizes.offline.width),
        height: v2_asNumber(
          raw.cardSizes.offline.height,
          cardSizes.offline.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.profile)) {
      cardSizes.profile = {
        width: v2_asNumber(raw.cardSizes.profile.width, cardSizes.profile.width),
        height: v2_asNumber(
          raw.cardSizes.profile.height,
          cardSizes.profile.height
        ),
      };
    }

    if (v2_isRecord(raw.cardSizes.frame)) {
      cardSizes.frame = {
        width: v2_asNumber(raw.cardSizes.frame.width, cardSizes.frame.width),
        height: v2_asNumber(raw.cardSizes.frame.height, cardSizes.frame.height),
      };
    }
  }

  if (v2_isRecord(raw.editorOptions)) {
    normalized.editorOptions = {
      isArtist: v2_asBoolean(
        raw.editorOptions.isArtist,
        normalized.editorOptions.isArtist
      ),
      isMultiple: v2_asBoolean(
        raw.editorOptions.isMultiple,
        normalized.editorOptions.isMultiple
      ),
      maxStreamingTimeByDay: Math.max(
        1,
        Math.floor(
          v2_asNumber(
            raw.editorOptions.maxStreamingTimeByDay,
            normalized.editorOptions.maxStreamingTimeByDay
          )
        )
      ),
      enableThemeSelection: v2_asBoolean(
        raw.editorOptions.enableThemeSelection,
        normalized.editorOptions.enableThemeSelection
      ),
      useOnlineAssetsByDay: v2_asBoolean(
        raw.editorOptions.useOnlineAssetsByDay,
        normalized.editorOptions.useOnlineAssetsByDay
      ),
      useOfflineAssetsByDay: v2_asBoolean(
        raw.editorOptions.useOfflineAssetsByDay,
        normalized.editorOptions.useOfflineAssetsByDay
      ),
    };
  }

  normalized.profileTextPlaceholder = v2_asString(
    raw.profileTextPlaceholder,
    normalized.profileTextPlaceholder
  );

  if (v2_isRecord(raw.formSchema)) {
    normalized.formSchema = v2_normalizeFormSchema(
      raw.formSchema,
      normalized.formSchema
    );
  }

  if (v2_isRecord(raw.assets)) {
    normalized.assets = {
      bgByTheme: v2_mergeThemeStringMap(
        normalized.assets.bgByTheme,
        raw.assets.bgByTheme
      ),
      topObjectByTheme: v2_mergeThemeStringMap(
        normalized.assets.topObjectByTheme,
        raw.assets.topObjectByTheme
      ),
      memoByTheme: v2_mergeThemeStringMap(
        normalized.assets.memoByTheme,
        raw.assets.memoByTheme
      ),
      artist: v2_mergeThemeStringMap(
        normalized.assets.artist,
        raw.assets.artist
      ),
      onlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.onlineByTheme,
        raw.assets.onlineByTheme
      ),
      online_mon: v2_mergeThemeStringMap(
        normalized.assets.online_mon,
        raw.assets.online_mon
      ),
      online_tue: v2_mergeThemeStringMap(
        normalized.assets.online_tue,
        raw.assets.online_tue
      ),
      online_wed: v2_mergeThemeStringMap(
        normalized.assets.online_wed,
        raw.assets.online_wed
      ),
      online_thu: v2_mergeThemeStringMap(
        normalized.assets.online_thu,
        raw.assets.online_thu
      ),
      online_fri: v2_mergeThemeStringMap(
        normalized.assets.online_fri,
        raw.assets.online_fri
      ),
      online_sat: v2_mergeThemeStringMap(
        normalized.assets.online_sat,
        raw.assets.online_sat
      ),
      online_sun: v2_mergeThemeStringMap(
        normalized.assets.online_sun,
        raw.assets.online_sun
      ),
      multi_mon: v2_mergeThemeStringMap(
        normalized.assets.multi_mon,
        raw.assets.multi_mon
      ),
      multi_tue: v2_mergeThemeStringMap(
        normalized.assets.multi_tue,
        raw.assets.multi_tue
      ),
      multi_wed: v2_mergeThemeStringMap(
        normalized.assets.multi_wed,
        raw.assets.multi_wed
      ),
      multi_thu: v2_mergeThemeStringMap(
        normalized.assets.multi_thu,
        raw.assets.multi_thu
      ),
      multi_fri: v2_mergeThemeStringMap(
        normalized.assets.multi_fri,
        raw.assets.multi_fri
      ),
      multi_sat: v2_mergeThemeStringMap(
        normalized.assets.multi_sat,
        raw.assets.multi_sat
      ),
      multi_sun: v2_mergeThemeStringMap(
        normalized.assets.multi_sun,
        raw.assets.multi_sun
      ),
      offlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.offlineByTheme,
        raw.assets.offlineByTheme
      ),
      offline_mon: v2_mergeThemeStringMap(
        normalized.assets.offline_mon,
        raw.assets.offline_mon
      ),
      offline_tue: v2_mergeThemeStringMap(
        normalized.assets.offline_tue,
        raw.assets.offline_tue
      ),
      offline_wed: v2_mergeThemeStringMap(
        normalized.assets.offline_wed,
        raw.assets.offline_wed
      ),
      offline_thu: v2_mergeThemeStringMap(
        normalized.assets.offline_thu,
        raw.assets.offline_thu
      ),
      offline_fri: v2_mergeThemeStringMap(
        normalized.assets.offline_fri,
        raw.assets.offline_fri
      ),
      offline_sat: v2_mergeThemeStringMap(
        normalized.assets.offline_sat,
        raw.assets.offline_sat
      ),
      offline_sun: v2_mergeThemeStringMap(
        normalized.assets.offline_sun,
        raw.assets.offline_sun
      ),
      offlineMemo_mon: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_mon,
        raw.assets.offlineMemo_mon
      ),
      offlineMemo_tue: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_tue,
        raw.assets.offlineMemo_tue
      ),
      offlineMemo_wed: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_wed,
        raw.assets.offlineMemo_wed
      ),
      offlineMemo_thu: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_thu,
        raw.assets.offlineMemo_thu
      ),
      offlineMemo_fri: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_fri,
        raw.assets.offlineMemo_fri
      ),
      offlineMemo_sat: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_sat,
        raw.assets.offlineMemo_sat
      ),
      offlineMemo_sun: v2_mergeThemeStringMap(
        normalized.assets.offlineMemo_sun,
        raw.assets.offlineMemo_sun
      ),
      profileFrameByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileFrameByTheme,
        raw.assets.profileFrameByTheme
      ),
      profileBgByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileBgByTheme,
        raw.assets.profileBgByTheme
      ),
      guideByTheme: v2_mergeThemeStringMap(
        normalized.assets.guideByTheme,
        raw.assets.guideByTheme
      ),
    };
  }

  if (v2_isRecord(raw.assetDimensions)) {
    normalized.assetDimensions = {
      bgByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.bgByTheme,
        raw.assetDimensions.bgByTheme
      ),
      topObjectByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.topObjectByTheme,
        raw.assetDimensions.topObjectByTheme
      ),
      memoByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.memoByTheme,
        raw.assetDimensions.memoByTheme
      ),
      artist: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.artist,
        raw.assetDimensions.artist
      ),
      onlineByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.onlineByTheme,
        raw.assetDimensions.onlineByTheme
      ),
      online_mon: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_mon,
        raw.assetDimensions.online_mon
      ),
      online_tue: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_tue,
        raw.assetDimensions.online_tue
      ),
      online_wed: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_wed,
        raw.assetDimensions.online_wed
      ),
      online_thu: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_thu,
        raw.assetDimensions.online_thu
      ),
      online_fri: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_fri,
        raw.assetDimensions.online_fri
      ),
      online_sat: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_sat,
        raw.assetDimensions.online_sat
      ),
      online_sun: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.online_sun,
        raw.assetDimensions.online_sun
      ),
      multi_mon: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_mon,
        raw.assetDimensions.multi_mon
      ),
      multi_tue: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_tue,
        raw.assetDimensions.multi_tue
      ),
      multi_wed: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_wed,
        raw.assetDimensions.multi_wed
      ),
      multi_thu: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_thu,
        raw.assetDimensions.multi_thu
      ),
      multi_fri: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_fri,
        raw.assetDimensions.multi_fri
      ),
      multi_sat: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_sat,
        raw.assetDimensions.multi_sat
      ),
      multi_sun: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.multi_sun,
        raw.assetDimensions.multi_sun
      ),
      offlineByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineByTheme,
        raw.assetDimensions.offlineByTheme
      ),
      offline_mon: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_mon,
        raw.assetDimensions.offline_mon
      ),
      offline_tue: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_tue,
        raw.assetDimensions.offline_tue
      ),
      offline_wed: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_wed,
        raw.assetDimensions.offline_wed
      ),
      offline_thu: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_thu,
        raw.assetDimensions.offline_thu
      ),
      offline_fri: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_fri,
        raw.assetDimensions.offline_fri
      ),
      offline_sat: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_sat,
        raw.assetDimensions.offline_sat
      ),
      offline_sun: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offline_sun,
        raw.assetDimensions.offline_sun
      ),
      offlineMemo_mon: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_mon,
        raw.assetDimensions.offlineMemo_mon
      ),
      offlineMemo_tue: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_tue,
        raw.assetDimensions.offlineMemo_tue
      ),
      offlineMemo_wed: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_wed,
        raw.assetDimensions.offlineMemo_wed
      ),
      offlineMemo_thu: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_thu,
        raw.assetDimensions.offlineMemo_thu
      ),
      offlineMemo_fri: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_fri,
        raw.assetDimensions.offlineMemo_fri
      ),
      offlineMemo_sat: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_sat,
        raw.assetDimensions.offlineMemo_sat
      ),
      offlineMemo_sun: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineMemo_sun,
        raw.assetDimensions.offlineMemo_sun
      ),
      profileFrameByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.profileFrameByTheme,
        raw.assetDimensions.profileFrameByTheme
      ),
      profileBgByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.profileBgByTheme,
        raw.assetDimensions.profileBgByTheme
      ),
      guideByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.guideByTheme,
        raw.assetDimensions.guideByTheme
      ),
    };
  }

  normalized.extraAssets = v2_normalizeExtraAssetMap(
    raw.extraAssets,
    normalized.extraAssets
  );
  normalized.extraAssetDimensions = v2_normalizeExtraAssetDimensionMap(
    raw.extraAssetDimensions,
    normalized.extraAssetDimensions
  );

  if (v2_isRecord(raw.layout)) {
    const layout = raw.layout;
    normalized.layout.grid = v2_mergeStyleRecord(normalized.layout.grid, layout.grid);
    normalized.layout.weekFlag = v2_mergeStyleRecord(
      normalized.layout.weekFlag,
      layout.weekFlag
    );
    normalized.layout.topObjectContainer = v2_mergeStyleRecord(
      normalized.layout.topObjectContainer,
      layout.topObjectContainer
    );
    normalized.layout.profileImage = v2_mergeStyleRecord(
      normalized.layout.profileImage,
      layout.profileImage
    );
    normalized.layout.profileFrame = v2_mergeStyleRecord(
      normalized.layout.profileFrame,
      layout.profileFrame
    );
    normalized.layout.profileTextRootStyle = v2_mergeStyleRecord(
      normalized.layout.profileTextRootStyle,
      layout.profileTextRootStyle
    );
    normalized.layout.profileTextWrapperStyle = v2_mergeStyleRecord(
      normalized.layout.profileTextWrapperStyle,
      layout.profileTextWrapperStyle
    );
    normalized.layout.profileTextStyle = v2_mergeStyleRecord(
      normalized.layout.profileTextStyle,
      layout.profileTextStyle
    );
    normalized.layout.profileTextArtistImageStyle = v2_mergeStyleRecord(
      normalized.layout.profileTextArtistImageStyle,
      layout.profileTextArtistImageStyle
    );
    const sceneLayoutSource = v2_isRecord(layout.scene) ? layout.scene : null;
    if (sceneLayoutSource) {
      Object.entries(sceneLayoutSource).forEach(([styleKey, candidate]) => {
        normalized.layout.scene[styleKey] = v2_mergeSceneLayoutEntry(
          normalized.layout.scene[styleKey],
          candidate
        );
      });
    }

    const cardLayoutSource = v2_isRecord(layout.card) ? layout.card : null;

    if (cardLayoutSource) {
      normalized.layout.card.onlineBackgroundContainer = v2_mergeStyleRecord(
        normalized.layout.card.onlineBackgroundContainer,
        cardLayoutSource.onlineBackgroundContainer
      );
      normalized.layout.card.multiBackgroundContainer = v2_mergeStyleRecord(
        normalized.layout.card.multiBackgroundContainer,
        cardLayoutSource.multiBackgroundContainer
      );
      normalized.layout.card.offlineBackgroundContainer = v2_mergeStyleRecord(
        normalized.layout.card.offlineBackgroundContainer,
        cardLayoutSource.offlineBackgroundContainer
      );
      normalized.layout.card.offlineMemoBackgroundContainer = v2_mergeStyleRecord(
        normalized.layout.card.offlineMemoBackgroundContainer,
        cardLayoutSource.offlineMemoBackgroundContainer
      );
      normalized.layout.card.streamingDay = v2_mergeStyleRecord(
        normalized.layout.card.streamingDay,
        cardLayoutSource.streamingDay
      );
      normalized.layout.card.streamingDate = v2_mergeStyleRecord(
        normalized.layout.card.streamingDate,
        cardLayoutSource.streamingDate
      );
      normalized.layout.card.streamingTime = v2_mergeStyleRecord(
        normalized.layout.card.streamingTime,
        cardLayoutSource.streamingTime
      );
      normalized.layout.card.mainTitleContainer = v2_mergeStyleRecord(
        normalized.layout.card.mainTitleContainer,
        cardLayoutSource.mainTitleContainer
      );
      normalized.layout.card.subTitleContainer = v2_mergeStyleRecord(
        normalized.layout.card.subTitleContainer,
        cardLayoutSource.subTitleContainer
      );
      normalized.layout.card.container = v2_mergeStyleRecord(
        normalized.layout.card.container,
        cardLayoutSource.container
      );

      normalized.layout.card.mainTitleTextStyle = v2_mergeStyleRecord(
        normalized.layout.card.mainTitleTextStyle,
        cardLayoutSource.mainTitleTextStyle
      );
      normalized.layout.card.subTitleTextStyle = v2_mergeStyleRecord(
        normalized.layout.card.subTitleTextStyle,
        cardLayoutSource.subTitleTextStyle
      );
      normalized.layout.card.streamingDayStyle = v2_mergeStyleRecord(
        normalized.layout.card.streamingDayStyle,
        cardLayoutSource.streamingDayStyle
      );
      normalized.layout.card.streamingDateStyle = v2_mergeStyleRecord(
        normalized.layout.card.streamingDateStyle,
        cardLayoutSource.streamingDateStyle
      );
      normalized.layout.card.streamingTimeStyle = v2_mergeStyleRecord(
        normalized.layout.card.streamingTimeStyle,
        cardLayoutSource.streamingTimeStyle
      );
      normalized.layout.card.mainTitleWrapperStyle = v2_mergeStyleRecord(
        normalized.layout.card.mainTitleWrapperStyle,
        cardLayoutSource.mainTitleWrapperStyle
      );
      normalized.layout.card.subTitleWrapperStyle = v2_mergeStyleRecord(
        normalized.layout.card.subTitleWrapperStyle,
        cardLayoutSource.subTitleWrapperStyle
      );

      if (v2_isRecord(cardLayoutSource.mainTitleOptions)) {
        const prevOptions = normalized.layout.card.mainTitleOptions ?? {};
        const nextMaxFontSize = v2_asOptionalNumber(
          cardLayoutSource.mainTitleOptions.maxFontSize
        );
        const nextMultiline = v2_asOptionalBoolean(
          cardLayoutSource.mainTitleOptions.multiline
        );

        normalized.layout.card.mainTitleOptions = {
          ...prevOptions,
          ...(nextMaxFontSize !== undefined
            ? { maxFontSize: nextMaxFontSize }
            : {}),
          ...(nextMultiline !== undefined ? { multiline: nextMultiline } : {}),
        };
      }

      if (v2_isRecord(cardLayoutSource.subTitleOptions)) {
        const prevOptions = normalized.layout.card.subTitleOptions ?? {};
        const nextMaxFontSize = v2_asOptionalNumber(
          cardLayoutSource.subTitleOptions.maxFontSize
        );
        const nextMultiline = v2_asOptionalBoolean(
          cardLayoutSource.subTitleOptions.multiline
        );

        normalized.layout.card.subTitleOptions = {
          ...prevOptions,
          ...(nextMaxFontSize !== undefined
            ? { maxFontSize: nextMaxFontSize }
            : {}),
          ...(nextMultiline !== undefined ? { multiline: nextMultiline } : {}),
        };
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(raw, "graph")) {
    normalized.graph = v2_normalizeNodeGraph(raw.graph);
  }
  normalized.version = v2_TEMPLATE_RENDER_CONFIG_VERSION;

  return normalized;
};

export const v2_isVisibleByMode = ({
  mode,
  isOffline,
  entryCount = 1,
  hasOfflineMemo = false,
}: {
  mode?: V2TemplateVisibilityMode;
  isOffline: boolean;
  entryCount?: number;
  hasOfflineMemo?: boolean;
}): boolean => {
  const resolvedMode = mode ?? "always";
  if (resolvedMode === "onlineOnly") return !isOffline;
  if (resolvedMode === "offlineOnly") return isOffline;
  if (resolvedMode === "onlineSingleOnly") return !isOffline && entryCount <= 1;
  if (resolvedMode === "onlineMultipleOnly") return !isOffline && entryCount >= 2;
  if (resolvedMode === "offlineMemoOnly") return isOffline && hasOfflineMemo;
  if (resolvedMode === "offlineNoMemoOnly") return isOffline && !hasOfflineMemo;
  return true;
};

export const v2_getThemedAssetUrl = (
  map: Record<string, string | null>,
  currentTheme: string,
  fallbackTheme: string = v2_DEFAULT_THEME
): string | null => {
  const toValidAssetUrl = (value: string | null | undefined): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return (
    toValidAssetUrl(map[currentTheme]) ??
    toValidAssetUrl(map[fallbackTheme]) ??
    Object.values(map)
      .map((value) => toValidAssetUrl(value))
      .find((value): value is string => typeof value === "string") ??
    null
  );
};

const v2_escapeCssString = (value: string): string => {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
};

const v2_resolveBaseFontToken = (
  renderConfig: V2TemplateRenderConfig,
  token: string
): string => {
  if (
    token === "primary" ||
    token === "secondary" ||
    token === "tertiary" ||
    token === "quaternary"
  ) {
    return renderConfig.baseFonts[token];
  }

  return token;
};

export const v2_resolveFontFamily = (
  renderConfig: V2TemplateRenderConfig,
  fontTokenOrFamily: string
): string => {
  let resolved = fontTokenOrFamily;

  for (let i = 0; i < 3; i += 1) {
    const next = v2_resolveBaseFontToken(renderConfig, resolved);
    if (next === resolved) break;
    resolved = next;
  }

  const registryItem = renderConfig.fonts.registry[resolved];
  return registryItem?.family ?? resolved;
};

export const v2_getComponentFontFamily = (
  renderConfig: V2TemplateRenderConfig,
  key: V2TemplateColorKey
): string => {
  return v2_resolveFontFamily(renderConfig, renderConfig.componentFonts[key]);
};

export const v2_buildFontFaceStyleText = (
  renderConfig: V2TemplateRenderConfig
): string => {
  const defaults = renderConfig.fonts.fontFaceDefaults;
  const blocks: string[] = [];

  Object.values(renderConfig.fonts.registry).forEach((item) => {
    item.faces.forEach((face) => {
      const faceMetrics = v2_normalizeFontFaceMetrics(face.metrics, defaults);
      const fontDisplay = face.display ?? item.display ?? "swap";
      const src = face.format
        ? `url('${v2_escapeCssString(face.src)}') format('${face.format}')`
        : `url('${v2_escapeCssString(face.src)}')`;

      blocks.push(`@font-face {
  font-family: '${v2_escapeCssString(item.family)}';
  src: ${src};
  font-weight: ${face.weight};
  font-style: ${face.style ?? "normal"};
  font-display: ${fontDisplay};
  ascent-override: ${faceMetrics.ascentOverride};
  descent-override: ${faceMetrics.descentOverride};
  line-gap-override: ${faceMetrics.lineGapOverride};
  size-adjust: ${faceMetrics.sizeAdjust};
${face.unicodeRange ? `  unicode-range: ${face.unicodeRange};` : ""}
}`);
    });
  });

  return blocks.join("\n\n");
};

export const v2_isTemplateRenderConfig = (
  candidate: unknown
): candidate is V2TemplateRenderConfig => {
  if (!v2_isRecord(candidate)) return false;
  if (candidate.version !== v2_TEMPLATE_RENDER_CONFIG_VERSION) return false;
  if (!v2_isRecord(candidate.fonts)) return false;
  if (!v2_isRecord(candidate.templateSize)) return false;
  if (!v2_isRecord(candidate.layout)) return false;
  if (!v2_isRecord(candidate.graph)) return false;
  return true;
};
