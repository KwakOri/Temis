import { CardInputConfig, SimpleFieldConfig } from "@/types/time-table/data";
import {
  v2_TEMPLATE_COLOR_KEYS,
  v2_TEMPLATE_RENDER_CONFIG_VERSION,
  V2TemplateCardNode,
  V2TemplateCardOptionsKey,
  V2TemplateCardStyleKey,
  V2TemplateCardStructure,
  V2TemplateColorPalette,
  V2TemplateColorKey,
  V2TemplateEditorOptions,
  V2TemplateFontFaceMetrics,
  V2TemplateFontRegistryItem,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateStructureConfig,
  V2TemplateRenderConfig,
  V2TemplateStyleRecord,
} from "@/types/time-table/v2_template_render_config";

const v2_DEFAULT_THEME = "first";

const v2_DEFAULT_CARD_INPUT_CONFIG: CardInputConfig = {
  fields: [
    {
      key: "time",
      type: "time",
      placeholder: "10:00",
      required: true,
      defaultValue: "10:00",
    },
    {
      key: "mainTitle",
      type: "textarea",
      placeholder: "메인 타이틀\n적는 곳",
      defaultValue: "",
      maxLength: 200,
    },
    {
      key: "subTitle",
      type: "text",
      placeholder: "서브 타이틀 적는 곳",
      defaultValue: "",
      maxLength: 50,
    },
  ],
  showLabels: false,
  offlineToggle: {
    label: "휴방",
    activeColor: "bg-[#3E4A82]",
    inactiveColor: "bg-gray-300",
  },
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
};

const v2_CARD_STYLE_KEYS: readonly V2TemplateCardStyleKey[] = [
  "streamingDay",
  "streamingDate",
  "streamingTime",
  "mainTitleContainer",
  "subTitleContainer",
  "container",
  "mainTitleTextStyle",
  "subTitleTextStyle",
  "mainTitleWrapperStyle",
  "streamingDayStyle",
  "streamingDateStyle",
  "streamingTimeStyle",
] as const;

const v2_CARD_OPTIONS_KEYS: readonly V2TemplateCardOptionsKey[] = [
  "mainTitleOptions",
  "subTitleOptions",
] as const;

const v2_DEFAULT_LAYER_TREE: V2TemplateLayerNode[] = [
  {
    id: "grid",
    label: "Grid",
    icon: "grid",
    target: "grid",
    sectionKey: "grid",
    children: [
      {
        id: "card",
        label: "Card",
        icon: "group",
        target: "cardContainer",
        sectionKey: "cardContainer",
        children: [
          {
            id: "streaming-day",
            label: "StreamingDay",
            icon: "text",
            target: "cardStreamingDay",
            sectionKey: "cardStreamingDay",
          },
          {
            id: "streaming-date",
            label: "StreamingDate",
            icon: "text",
            target: "cardStreamingDate",
            sectionKey: "cardStreamingDate",
          },
          {
            id: "streaming-time",
            label: "StreamingTime",
            icon: "text",
            target: "cardStreamingTime",
            sectionKey: "cardStreamingTime",
          },
          {
            id: "main-title",
            label: "MainTitle",
            icon: "text",
            target: "cardMainTitleContainer",
            sectionKey: "cardMainTitleContainer",
          },
          {
            id: "sub-title",
            label: "SubTitle",
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
    icon: "calendar",
    target: "weekFlag",
    sectionKey: "weekFlag",
  },
  {
    id: "top-object",
    label: "TopObject",
    icon: "image",
    target: "topObjectContainer",
    sectionKey: "topObjectContainer",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "group",
    children: [
      {
        id: "profile-image",
        label: "Image",
        icon: "image",
        target: "profileImage",
        sectionKey: "profileImage",
      },
      {
        id: "profile-frame",
        label: "Frame",
        icon: "layers",
        target: "profileFrame",
        sectionKey: "profileFrame",
      },
    ],
  },
];

const v2_DEFAULT_CARD_STRUCTURE: V2TemplateCardStructure = {
  containerLayerId: "card",
  containerHighlightTarget: "cardContainer",
  containerStyleKey: "container",
  nodeOrder: [
    "streaming-day",
    "streaming-date",
    "sub-title",
    "main-title",
    "streaming-time",
  ],
  nodes: {
    "streaming-day": {
      id: "streaming-day",
      label: "StreamingDay",
      kind: "text",
      layerId: "streaming-day",
      highlightTarget: "cardStreamingDay",
      binding: "streamingDay",
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
      binding: "streamingDate",
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
      binding: "streamingTime",
      containerStyleKey: "streamingTime",
      textStyleKey: "streamingTimeStyle",
      colorKey: "STREAMING_TIME",
      fontKey: "STREAMING_TIME",
      containerClassName: "absolute flex justify-center items-center",
    },
    "main-title": {
      id: "main-title",
      label: "MainTitle",
      kind: "autoResizeText",
      layerId: "main-title",
      highlightTarget: "cardMainTitleContainer",
      binding: "mainTitle",
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
      kind: "autoResizeText",
      layerId: "sub-title",
      highlightTarget: "cardSubTitleContainer",
      binding: "subTitle",
      containerStyleKey: "subTitleContainer",
      textStyleKey: "subTitleTextStyle",
      optionsKey: "subTitleOptions",
      colorKey: "SUB_TITLE",
      fontKey: "SUB_TITLE",
      containerClassName: "absolute flex justify-center items-center",
      textClassName: "leading-none text-center w-full",
    },
  },
};

const v2_DEFAULT_STRUCTURE: V2TemplateStructureConfig = {
  layers: v2_DEFAULT_LAYER_TREE,
  card: v2_DEFAULT_CARD_STRUCTURE,
};

const v2_DEFAULT_ESCRODREAM_FACES: V2TemplateFontRegistryItem["faces"] = [
  {
    weight: 100,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-1Thin.woff",
    format: "woff",
  },
  {
    weight: 200,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-2ExtraLight.woff",
    format: "woff",
  },
  {
    weight: 300,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-3Light.woff",
    format: "woff",
  },
  {
    weight: 400,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff",
    format: "woff",
  },
  {
    weight: 500,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-5Medium.woff",
    format: "woff",
  },
  {
    weight: 600,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-6Bold.woff",
    format: "woff",
  },
  {
    weight: 700,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-7ExtraBold.woff",
    format: "woff",
  },
  {
    weight: 800,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-8Heavy.woff",
    format: "woff",
  },
  {
    weight: 900,
    style: "normal",
    src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-9Black.woff",
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
  monthOption: "en",
  themes: [v2_DEFAULT_THEME],
  defaultTheme: v2_DEFAULT_THEME,
  buttonThemes: [{ value: v2_DEFAULT_THEME, label: v2_DEFAULT_THEME }],
  fonts: {
    fontFaceDefaults: { ...v2_DEFAULT_FONT_FACE_METRICS },
    registry: {
      escoredream: {
        family: "Escoredream",
        display: "swap",
        faces: v2_DEFAULT_ESCRODREAM_FACES,
      },
    },
  },
  baseFonts: {
    primary: "escoredream",
    secondary: "escoredream",
    tertiary: "escoredream",
    quaternary: "escoredream",
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
    SUB_TITLE: "#FFF6E5",
    STREAMING_TIME: "#FFF6E5",
    STREAMING_DATE: "#FFF6E5",
    STREAMING_DAY: "#FFF6E5",
    ARTIST: "#FFF6E5",
    WEEKLY_FLAG: "#FFF6E5",
  },
  componentFonts: {
    MAIN_TITLE: "primary",
    SUB_TITLE: "primary",
    STREAMING_TIME: "primary",
    STREAMING_DATE: "primary",
    STREAMING_DAY: "primary",
    ARTIST: "primary",
    WEEKLY_FLAG: "primary",
  },
  maxFontSizes: {
    MAIN_TITLE: 82,
    SUB_TITLE: 57,
    ARTIST: 84,
  },
  cardSizes: {
    online: {
      width: 800,
      height: 617,
    },
    offline: {
      width: 800,
      height: 617,
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
  cardInputConfig: v2_DEFAULT_CARD_INPUT_CONFIG,
  assets: {
    bgByTheme: {
      first: null,
    },
    topObjectByTheme: {
      first: null,
    },
    onlineByTheme: {
      first: null,
    },
    offlineByTheme: {
      first: null,
    },
    profileFrameByTheme: {
      first: null,
    },
    profileBgByTheme: {
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
    onlineByTheme: {
      first: null,
    },
    offlineByTheme: {
      first: null,
    },
    profileFrameByTheme: {
      first: null,
    },
    profileBgByTheme: {
      first: null,
    },
  },
  layout: {
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
      fontSize: 76,
      fontWeight: 700,
      width: 580,
      height: 120,
      top: 564,
      left: 1556,
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
      zIndex: 10,
    },
    profileFrame: {
      position: "absolute",
      width: 4000,
      height: 2250,
      zIndex: 20,
    },
    profileTextRootStyle: {
      left: 4,
      zIndex: 30,
      justifyContent: "flex-start",
      alignItems: "center",
    },
    profileTextWrapperStyle: {
      position: "absolute",
      width: 1318,
      height: 160,
      bottom: 268,
      right: 200,
      rotate: "1.6deg",
    },
    card: {
      streamingDay: {
        top: 0,
        left: 0,
        width: 160,
        height: 100,
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingLeft: 8,
      },
      streamingDate: {
        width: 160,
        height: 100,
        position: "absolute",
        top: -16,
        left: -24,
        zIndex: 10,
      },
      streamingTime: {
        width: 252,
        height: 40,
        top: 508,
      },
      mainTitleContainer: {
        height: 280,
        widthPercent: 100,
        top: 132,
      },
      subTitleContainer: {
        widthPercent: 100,
        height: 64,
        top: 440,
      },
      container: {
        width: 600,
        height: 504,
        top: 68,
        left: 10,
      },
      mainTitleTextStyle: {
        lineHeight: 1.2,
        fontWeight: 700,
      },
      subTitleTextStyle: {
        lineHeight: 1,
        fontWeight: 400,
      },
      mainTitleOptions: {
        maxFontSize: 82,
        multiline: true,
      },
      subTitleOptions: {
        maxFontSize: 57,
        multiline: true,
      },
      streamingDayStyle: {
        fontSize: 56,
        fontWeight: 700,
        lineHeight: 1,
      },
      streamingDateStyle: {
        fontSize: 68,
        fontWeight: 400,
        lineHeight: 1,
        letterSpacing: 3,
        rotate: "-14deg",
      },
      streamingTimeStyle: {
        fontSize: 31,
        fontWeight: 400,
        lineHeight: 1,
      },
      mainTitleWrapperStyle: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
    },
  },
  structure: v2_DEFAULT_STRUCTURE,
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

const v2_LAYER_ICON_KEY_SET = new Set([
  "group",
  "grid",
  "calendar",
  "image",
  "layers",
  "text",
]);

const v2_CARD_NODE_KIND_SET = new Set(["text", "autoResizeText"]);

const v2_CARD_NODE_BINDING_SET = new Set([
  "streamingDay",
  "streamingDate",
  "streamingTime",
  "mainTitle",
  "subTitle",
]);

const v2_isCardStyleKey = (value: unknown): value is V2TemplateCardStyleKey => {
  return (
    typeof value === "string" &&
    (v2_CARD_STYLE_KEYS as readonly string[]).includes(value)
  );
};

const v2_isCardOptionsKey = (
  value: unknown
): value is V2TemplateCardOptionsKey => {
  return (
    typeof value === "string" &&
    (v2_CARD_OPTIONS_KEYS as readonly string[]).includes(value)
  );
};

const v2_normalizeLayerTree = (
  candidate: unknown,
  fallback: V2TemplateLayerNode[]
): V2TemplateLayerNode[] => {
  if (!Array.isArray(candidate)) return fallback;

  const parseNode = (rawNode: unknown): V2TemplateLayerNode | null => {
    if (!v2_isRecord(rawNode)) return null;

    const id = v2_asString(rawNode.id, "").trim();
    const label = v2_asString(rawNode.label, "").trim();
    if (!id || !label) return null;

    const icon: V2TemplateLayerIconKey | undefined =
      typeof rawNode.icon === "string" && v2_LAYER_ICON_KEY_SET.has(rawNode.icon)
        ? (rawNode.icon as V2TemplateLayerIconKey)
        : undefined;
    const target: V2TemplateLayerNode["target"] =
      typeof rawNode.target === "string"
        ? (rawNode.target as V2TemplateLayerNode["target"])
        : undefined;
    const sectionKey =
      typeof rawNode.sectionKey === "string" ? rawNode.sectionKey : undefined;

    const children = Array.isArray(rawNode.children)
      ? rawNode.children
          .map((childNode) => parseNode(childNode))
          .filter((childNode): childNode is V2TemplateLayerNode => childNode !== null)
      : undefined;

    return {
      id,
      label,
      ...(icon ? { icon } : {}),
      ...(target ? { target } : {}),
      ...(sectionKey ? { sectionKey } : {}),
      ...(children && children.length > 0 ? { children } : {}),
    };
  };

  const parsed = candidate
    .map((node) => parseNode(node))
    .filter((node): node is V2TemplateLayerNode => node !== null);

  return parsed.length > 0 ? parsed : fallback;
};

const v2_normalizeCardNode = (
  candidate: unknown,
  fallback: V2TemplateCardNode
): V2TemplateCardNode => {
  if (!v2_isRecord(candidate)) return fallback;

  const kind: V2TemplateCardNode["kind"] =
    typeof candidate.kind === "string" && v2_CARD_NODE_KIND_SET.has(candidate.kind)
      ? (candidate.kind as V2TemplateCardNode["kind"])
      : fallback.kind;
  const binding: V2TemplateCardNode["binding"] =
    typeof candidate.binding === "string" &&
    v2_CARD_NODE_BINDING_SET.has(candidate.binding)
      ? (candidate.binding as V2TemplateCardNode["binding"])
      : fallback.binding;
  const containerStyleKey = v2_isCardStyleKey(candidate.containerStyleKey)
    ? candidate.containerStyleKey
    : fallback.containerStyleKey;
  const textStyleKey = v2_isCardStyleKey(candidate.textStyleKey)
    ? candidate.textStyleKey
    : fallback.textStyleKey;
  const wrapperStyleKey = v2_isCardStyleKey(candidate.wrapperStyleKey)
    ? candidate.wrapperStyleKey
    : fallback.wrapperStyleKey;
  const optionsKey = v2_isCardOptionsKey(candidate.optionsKey)
    ? candidate.optionsKey
    : fallback.optionsKey;
  const colorKey =
    typeof candidate.colorKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(candidate.colorKey)
      ? (candidate.colorKey as V2TemplateColorKey)
      : fallback.colorKey;
  const fontKey =
    typeof candidate.fontKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(candidate.fontKey)
      ? (candidate.fontKey as V2TemplateColorKey)
      : fallback.fontKey;

  return {
    id: v2_asString(candidate.id, fallback.id),
    label: v2_asString(candidate.label, fallback.label),
    kind,
    layerId: v2_asString(candidate.layerId, fallback.layerId),
    highlightTarget:
      typeof candidate.highlightTarget === "string"
        ? (candidate.highlightTarget as V2TemplateCardNode["highlightTarget"])
        : fallback.highlightTarget,
    binding,
    containerStyleKey,
    ...(textStyleKey ? { textStyleKey } : {}),
    ...(wrapperStyleKey ? { wrapperStyleKey } : {}),
    ...(optionsKey ? { optionsKey } : {}),
    colorKey,
    fontKey,
    ...(typeof candidate.containerClassName === "string"
      ? { containerClassName: candidate.containerClassName }
      : fallback.containerClassName
        ? { containerClassName: fallback.containerClassName }
        : {}),
    ...(typeof candidate.textClassName === "string"
      ? { textClassName: candidate.textClassName }
      : fallback.textClassName
        ? { textClassName: fallback.textClassName }
        : {}),
  };
};

const v2_normalizeCardStructure = (
  candidate: unknown,
  fallback: V2TemplateCardStructure
): V2TemplateCardStructure => {
  if (!v2_isRecord(candidate)) return fallback;

  const nextNodes: Record<string, V2TemplateCardNode> = {
    ...fallback.nodes,
  };

  if (v2_isRecord(candidate.nodes)) {
    Object.entries(candidate.nodes).forEach(([nodeId, rawNode]) => {
      const fallbackNode = fallback.nodes[nodeId];
      if (!fallbackNode) return;
      nextNodes[nodeId] = v2_normalizeCardNode(rawNode, fallbackNode);
    });
  }

  const nodeOrderCandidate = Array.isArray(candidate.nodeOrder)
    ? candidate.nodeOrder.filter(
        (nodeId): nodeId is string =>
          typeof nodeId === "string" && nextNodes[nodeId] !== undefined
      )
    : [];

  const nodeOrder = nodeOrderCandidate.length > 0
    ? Array.from(new Set(nodeOrderCandidate))
    : fallback.nodeOrder;

  return {
    containerLayerId: v2_asString(
      candidate.containerLayerId,
      fallback.containerLayerId
    ),
    containerHighlightTarget:
      typeof candidate.containerHighlightTarget === "string"
        ? (candidate.containerHighlightTarget as V2TemplateCardNode["highlightTarget"])
        : fallback.containerHighlightTarget,
    containerStyleKey: v2_isCardStyleKey(candidate.containerStyleKey)
      ? candidate.containerStyleKey
      : fallback.containerStyleKey,
    nodeOrder,
    nodes: nextNodes,
  };
};

const v2_normalizeStructure = (
  candidate: unknown,
  fallback: V2TemplateStructureConfig
): V2TemplateStructureConfig => {
  if (!v2_isRecord(candidate)) return fallback;

  return {
    layers: v2_normalizeLayerTree(candidate.layers, fallback.layers),
    card: v2_normalizeCardStructure(candidate.card, fallback.card),
  };
};

const v2_asStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) return fallback;
  const next = value.filter((item): item is string => typeof item === "string");
  return next.length > 0 ? next : fallback;
};

const v2_clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const v2_isCardInputConfig = (value: unknown): value is CardInputConfig => {
  if (!v2_isRecord(value) || !Array.isArray(value.fields)) return false;

  const areFieldsValid = value.fields.every((field) => {
    if (!v2_isRecord(field)) return false;
    if (typeof field.key !== "string") return false;
    if (!v2_isFieldType(field.type)) return false;
    if (typeof field.placeholder !== "string") return false;

    if (field.label !== undefined && typeof field.label !== "string") return false;
    if (field.required !== undefined && typeof field.required !== "boolean")
      return false;
    if (
      field.maxLength !== undefined &&
      (typeof field.maxLength !== "number" || !Number.isFinite(field.maxLength))
    ) {
      return false;
    }

    if (field.defaultValue !== undefined) {
      const validDefault =
        typeof field.defaultValue === "string" ||
        typeof field.defaultValue === "number";
      if (!validDefault) return false;
    }

    if (field.isOffline !== undefined && typeof field.isOffline !== "boolean") {
      return false;
    }

    if (field.options !== undefined) {
      if (!Array.isArray(field.options)) return false;
      const optionsValid = field.options.every(
        (option) =>
          v2_isRecord(option) &&
          typeof option.value === "string" &&
          typeof option.label === "string"
      );
      if (!optionsValid) return false;
    }

    return true;
  });

  if (!areFieldsValid) return false;

  if (
    value.showLabels !== undefined &&
    typeof value.showLabels !== "boolean"
  ) {
    return false;
  }

  if (value.offlineToggle !== undefined) {
    if (!v2_isRecord(value.offlineToggle)) return false;
    if (typeof value.offlineToggle.label !== "string") return false;
    if (typeof value.offlineToggle.activeColor !== "string") return false;
    if (typeof value.offlineToggle.inactiveColor !== "string") return false;
  }

  return true;
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

export const v2_createDefaultTemplateRenderConfig = (): V2TemplateRenderConfig => {
  return v2_clone(v2_DEFAULT_TEMPLATE_RENDER_CONFIG);
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

  if (
    raw.monthOption === "kr" ||
    raw.monthOption === "en" ||
    raw.monthOption === "jp"
  ) {
    normalized.monthOption = raw.monthOption;
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
    };
  }

  normalized.profileTextPlaceholder = v2_asString(
    raw.profileTextPlaceholder,
    normalized.profileTextPlaceholder
  );

  if (v2_isCardInputConfig(raw.cardInputConfig)) {
    normalized.cardInputConfig = raw.cardInputConfig;
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
      onlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.onlineByTheme,
        raw.assets.onlineByTheme
      ),
      offlineByTheme: v2_mergeThemeStringMap(
        normalized.assets.offlineByTheme,
        raw.assets.offlineByTheme
      ),
      profileFrameByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileFrameByTheme,
        raw.assets.profileFrameByTheme
      ),
      profileBgByTheme: v2_mergeThemeStringMap(
        normalized.assets.profileBgByTheme,
        raw.assets.profileBgByTheme
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
      onlineByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.onlineByTheme,
        raw.assetDimensions.onlineByTheme
      ),
      offlineByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.offlineByTheme,
        raw.assetDimensions.offlineByTheme
      ),
      profileFrameByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.profileFrameByTheme,
        raw.assetDimensions.profileFrameByTheme
      ),
      profileBgByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.profileBgByTheme,
        raw.assetDimensions.profileBgByTheme
      ),
    };
  }

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

    const cardLayoutSource = v2_isRecord(layout.card)
      ? layout.card
      : v2_isRecord(layout.cell)
        ? layout.cell
        : null;

    if (cardLayoutSource) {
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
        cardLayoutSource.container ?? cardLayoutSource.contentArea
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

  normalized.structure = v2_normalizeStructure(
    raw.structure,
    normalized.structure
  );

  normalized.version = v2_TEMPLATE_RENDER_CONFIG_VERSION;

  return normalized;
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
  if (!v2_isRecord(candidate.structure)) return false;
  return true;
};
