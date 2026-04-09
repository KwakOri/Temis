import { SimpleFieldConfig } from "@/types/time-table/data";
import {
  v2_TEMPLATE_COLOR_KEYS,
  v2_TEMPLATE_RENDER_CONFIG_VERSION,
  V2TemplateAutoResizeOptions,
  V2TemplateCardNode,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNodeBinding,
  V2TemplateComponentInstanceMode,
  V2TemplateComputedBindingKey,
  V2TemplateCardOptionsKey,
  V2TemplateCardStyleKey,
  V2TemplateCardStructure,
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
  V2TemplateLayerComponentKey,
  V2TemplateLayerIconKey,
  V2TemplateLayerNodeKind,
  V2TemplateLayerNode,
  V2TemplateNodeGraph,
  V2TemplateStructureConfig,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetFit,
  V2TemplateSceneNode,
  V2TemplateSceneNodeKind,
  V2TemplateSceneStyleKey,
  V2TemplateStyleRecord,
  V2TemplateVisibilityMode,
} from "@/types/time-table/template-render-config";
import { v2_normalizePointerOrderInGraph } from "@/utils/time-table/template-graph-order";

const v2_DEFAULT_THEME = "first";

const v2_COMPUTED_BINDING_KEYS = [
  "streamingDay",
  "streamingDate",
  "streamingTime",
] as const;

const v2_COMPUTED_BINDING_KEY_SET = new Set(v2_COMPUTED_BINDING_KEYS);

const v2_FIELD_SCOPE_SET = new Set(["entry", "card", "global"]);

const v2_ASSET_KEYS = [
  "bgByTheme",
  "topObjectByTheme",
  "onlineByTheme",
  "offlineByTheme",
  "profileFrameByTheme",
  "profileBgByTheme",
  "guideByTheme",
] as const;

const v2_ASSET_KEY_SET = new Set<string>(v2_ASSET_KEYS);

const v2_defaultBindingRefFromInputKey = (
  rawKey: string
): V2TemplateCardNodeBinding => {
  const key = rawKey.trim();
  if (!key) {
    return {
      mode: "literal",
      value: "",
    };
  }

  if (v2_COMPUTED_BINDING_KEY_SET.has(key as V2TemplateComputedBindingKey)) {
    return {
      mode: "computed",
      key: key as V2TemplateComputedBindingKey,
    };
  }

  return {
    mode: "field",
    scope: "entry",
    key,
  };
};

export const v2_isEntryFieldBindingKey = (
  binding: V2TemplateCardNodeBinding,
  key: string
): boolean => {
  return binding.mode === "field" && binding.scope === "entry" && binding.key === key;
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
        id: "card",
        label: "Card",
        kind: "group",
        visibilityMode: "always",
        isTemplateComponent: true,
        icon: "group",
        target: "cardContainer",
        sectionKey: "cardContainer",
        children: [
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
      {
        id: "profile-text",
        label: "ProfileText",
        kind: "component",
        visibilityMode: "always",
        icon: "text",
        target: "profileText",
        sectionKey: "profileTextRootStyle",
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
    id: "scene-background",
    label: "Background",
    kind: "asset",
    assetKey: "bgByTheme",
    fit: "cover",
    alt: "background",
    visibilityMode: "always",
  },
  {
    id: "scene-top-object",
    label: "TopObject",
    kind: "asset",
    layerId: "top-object",
    assetKey: "topObjectByTheme",
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
    source: "card",
    componentId: "card",
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
    containerClassName: "absolute flex justify-center items-center z-40",
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
        assetKey: "profileBgByTheme",
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
        assetKey: "profileFrameByTheme",
        styleKey: "profileFrame",
        fit: "fill",
        alt: "profile-frame",
        visibilityMode: "always",
      },
      {
        id: "scene-profile-text",
        label: "ProfileText",
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
        containerClassName: "absolute z-50 flex justify-end items-center",
        textClassName: "text-center",
        visibilityMode: "always",
      },
    ],
  },
  {
    id: "scene-guide-overlay",
    label: "GuideOverlay",
    kind: "asset",
    assetKey: "guideByTheme",
    fit: "cover",
    alt: "guide-overlay",
    visibilityMode: "always",
  },
];

const v2_DEFAULT_STRUCTURE: V2TemplateStructureConfig = {
  layers: v2_DEFAULT_LAYER_TREE,
  card: v2_DEFAULT_CARD_STRUCTURE,
  sceneNodes: v2_DEFAULT_SCENE_NODES,
};

const v2_mapSceneNodeKindToGraphType = (
  kind: V2TemplateSceneNode["kind"]
): V2TemplateGraphNodeType => {
  if (kind === "group") return "group";
  if (kind === "asset") return "image";
  if (kind === "cardCollection") return "cardCollection";
  if (kind === "flexibleText") return "flexibleText";
  return "text";
};

const v2_mapCardNodeKindToGraphType = (
  kind: V2TemplateCardNode["kind"]
): V2TemplateGraphNodeType => {
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

export const v2_createNodeGraphFromStructure = (
  structure: V2TemplateStructureConfig
): V2TemplateNodeGraph => {
  const nodes: Record<string, V2TemplateGraphNode> = {};
  const rootNodeIds: string[] = [];
  const layerNodeById = v2_collectLayerNodesById(structure.layers);

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
      sceneNode.kind === "group" ? sceneNode.children.map((child) => child.id) : [];

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
        assetKey: sceneNode.assetKey,
        ...(sceneNode.fit ? { fit: sceneNode.fit } : {}),
        ...(sceneNode.alt ? { alt: sceneNode.alt } : {}),
      };
    } else if (sceneNode.kind === "cardCollection") {
      nextNode.meta = {
        ...(nextNode.meta ?? {}),
        source: sceneNode.source,
        componentId: sceneNode.componentId ?? "card",
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

    if (sceneNode.kind === "group") {
      sceneNode.children.forEach((child) => {
        visitSceneNode(child, sceneNode.id);
      });
    }
  };

  structure.sceneNodes.forEach((sceneNode) => {
    visitSceneNode(sceneNode, null);
  });

  const cardRootId = "component-card-root";
  const cardNodeIds = structure.card.nodeOrder.filter(
    (nodeId) => structure.card.nodes[nodeId] !== undefined
  );
  const cardRootLayerMeta = resolveLayerMeta({
    layerId: structure.card.containerLayerId,
    fallbackId: cardRootId,
  });

  nodes[cardRootId] = {
    id: cardRootId,
    type: "group",
    label: "Card",
    parentId: null,
    childIds: cardNodeIds,
    layerId: structure.card.containerLayerId,
    highlightTarget: structure.card.containerHighlightTarget,
    visibilityMode: "always",
    styles: {
      containerStyleKey: structure.card.containerStyleKey,
    },
    meta: {
      componentId: "card",
      ...(cardRootLayerMeta ?? {}),
    },
  };

  cardNodeIds.forEach((nodeId) => {
    const cardNode = structure.card.nodes[nodeId];
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
        ...(cardNode.textStyleKey ? { textStyleKey: cardNode.textStyleKey } : {}),
        ...(cardNode.wrapperStyleKey
          ? { wrapperStyleKey: cardNode.wrapperStyleKey }
          : {}),
        ...(cardNode.optionsKey ? { optionsKey: cardNode.optionsKey } : {}),
      },
      meta: {
        ...(layerMeta ?? {}),
        colorKey: cardNode.colorKey,
        fontKey: cardNode.fontKey,
        ...(typeof cardNode.containerClassName === "string"
          ? { containerClassName: cardNode.containerClassName }
          : {}),
        ...(typeof cardNode.textClassName === "string"
          ? { textClassName: cardNode.textClassName }
          : {}),
      },
    };
  });

  const componentDefinitions: Record<
    string,
    V2TemplateGraphComponentDefinition
  > = {
    card: {
      id: "card",
      label: "Card",
      rootNodeId: cardRootId,
      description: "Default card component",
      kind: "template",
      instanceMode: structure.card.instanceMode,
      instanceTransforms: structure.card.instanceTransforms,
    },
  };

  return v2_normalizePointerOrderInGraph({
    rootNodeIds,
    nodes,
    componentDefinitions,
  });
};

const v2_DEFAULT_GRAPH = v2_createNodeGraphFromStructure(v2_DEFAULT_STRUCTURE);

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
  formSchema: v2_DEFAULT_FORM_SCHEMA,
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
    guideByTheme: {
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
    scene: {},
  },
  structure: v2_DEFAULT_STRUCTURE,
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

const v2_collectSceneLayoutKeys = (
  nodes: V2TemplateSceneNode[]
): Set<string> => {
  const next = new Set<string>();
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.kind === "group") {
      stack.unshift(...node.children);
      continue;
    }
    if (node.kind === "asset") {
      if (node.styleKey) next.add(node.styleKey);
      continue;
    }
    if (node.kind === "cardCollection") {
      continue;
    }
    next.add(node.containerStyleKey);
    if (node.textStyleKey) next.add(node.textStyleKey);
    if (node.wrapperStyleKey) next.add(node.wrapperStyleKey);
    if (node.optionsKey) next.add(node.optionsKey);
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

const v2_LAYER_NODE_KIND_SET = new Set(["group", "component"]);

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
]);

const v2_COMPONENT_INSTANCE_MODE_SET = new Set(["component", "detached"]);

const v2_getDefaultLayerComponentKeyById = (
  id: string
): V2TemplateLayerComponentKey | undefined => {
  if (id === "grid") return "grid";
  if (id === "week-flag") return "weekFlag";
  if (id === "top-object") return "topObject";
  if (id === "profile") return "profile";
  return undefined;
};

const v2_getDefaultTemplateComponentFlagById = (id: string): boolean => {
  return id === "card";
};

const v2_CARD_NODE_KIND_SET = new Set([
  "text",
  "flexibleText",
  "autoResizeText",
]);

const v2_SCENE_NODE_KIND_SET = new Set([
  "group",
  "asset",
  "text",
  "flexibleText",
  "cardCollection",
]);

const v2_SCENE_ASSET_FIT_SET = new Set(["cover", "contain", "fill"]);

const v2_isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const v2_isCardStyleKey = (value: unknown): value is V2TemplateCardStyleKey => {
  return v2_isNonEmptyString(value);
};

const v2_isCardOptionsKey = (
  value: unknown
): value is V2TemplateCardOptionsKey => {
  return v2_isNonEmptyString(value);
};

const v2_isSceneStyleKey = (
  value: unknown
): value is V2TemplateSceneStyleKey => {
  return v2_isNonEmptyString(value);
};

const v2_GRAPH_NODE_TYPE_SET = new Set([
  "group",
  "image",
  "text",
  "flexibleText",
  "cardCollection",
  "componentInstance",
]);
const v2_ORDER_MODEL_SET = new Set(["pointer", "orderKey"]);

const v2_normalizeGraphNodeType = (
  value: unknown,
  fallback?: V2TemplateGraphNodeType
): V2TemplateGraphNodeType | null => {
  if (typeof value === "string" && v2_GRAPH_NODE_TYPE_SET.has(value)) {
    return value as V2TemplateGraphNodeType;
  }
  return fallback ?? null;
};

const v2_normalizeGraphNodeStyleRefs = (
  candidate: unknown,
  fallback?: V2TemplateGraphNode["styles"]
): V2TemplateGraphNode["styles"] => {
  if (!v2_isRecord(candidate)) return fallback;

  const next: NonNullable<V2TemplateGraphNode["styles"]> = {
    ...(fallback ?? {}),
  };

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
  candidate: unknown,
  fallback?: V2TemplateGraphNodeOrder
): V2TemplateGraphNodeOrder | undefined => {
  if (!v2_isRecord(candidate)) return fallback;

  const next: V2TemplateGraphNodeOrder = {
    model:
      typeof candidate.model === "string" && v2_ORDER_MODEL_SET.has(candidate.model)
        ? (candidate.model as V2TemplateGraphNodeOrder["model"])
        : fallback?.model ?? "pointer",
  };

  if (candidate.prevSiblingId === null) {
    next.prevSiblingId = null;
  } else if (typeof candidate.prevSiblingId === "string") {
    next.prevSiblingId = candidate.prevSiblingId;
  } else if (fallback?.prevSiblingId !== undefined) {
    next.prevSiblingId = fallback.prevSiblingId;
  }

  if (typeof candidate.orderKey === "string" && candidate.orderKey.trim().length > 0) {
    next.orderKey = candidate.orderKey;
  } else if (typeof fallback?.orderKey === "string" && fallback.orderKey.length > 0) {
    next.orderKey = fallback.orderKey;
  }

  return next;
};

const v2_normalizeGraphNodeMeta = (
  candidate: unknown,
  fallback?: V2TemplateGraphNode["meta"]
): V2TemplateGraphNode["meta"] => {
  if (!v2_isRecord(candidate)) return fallback;

  const next: NonNullable<V2TemplateGraphNode["meta"]> = {
    ...(fallback ?? {}),
  };

  if (typeof candidate.assetKey === "string" && v2_ASSET_KEY_SET.has(candidate.assetKey)) {
    next.assetKey = candidate.assetKey as keyof V2TemplateRenderConfig["assets"];
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
  if (candidate.source === "card") {
    next.source = "card";
  }
  if (typeof candidate.componentId === "string") {
    next.componentId = candidate.componentId;
  }
  if (typeof candidate.instanceId === "string") {
    next.instanceId = candidate.instanceId;
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

  return Object.keys(next).length > 0 ? next : undefined;
};

const v2_normalizeGraphNode = (
  nodeId: string,
  candidate: unknown,
  fallback?: V2TemplateGraphNode
): V2TemplateGraphNode | null => {
  if (!v2_isRecord(candidate) && !fallback) return null;
  const nodeRecord = v2_isRecord(candidate) ? candidate : {};

  const id = v2_asString(nodeRecord.id, nodeId).trim();
  if (!id) return null;

  const type = v2_normalizeGraphNodeType(nodeRecord.type, fallback?.type);
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
    : fallback?.childIds ?? [];

  const parentId =
    nodeRecord.parentId === null
      ? null
      : typeof nodeRecord.parentId === "string"
        ? nodeRecord.parentId
        : fallback?.parentId ?? null;

  const binding =
    nodeRecord.binding !== undefined || fallback?.binding !== undefined
      ? v2_normalizeBindingRef(nodeRecord.binding, fallback?.binding ?? {
          mode: "literal",
          value: "",
        })
      : undefined;

  const visibilityMode: V2TemplateVisibilityMode | undefined =
    typeof nodeRecord.visibilityMode === "string" &&
    v2_VISIBILITY_MODE_SET.has(nodeRecord.visibilityMode)
      ? (nodeRecord.visibilityMode as V2TemplateVisibilityMode)
      : fallback?.visibilityMode;
  const normalizedStyles = v2_normalizeGraphNodeStyleRefs(
    nodeRecord.styles,
    fallback?.styles
  );
  const normalizedMeta = v2_normalizeGraphNodeMeta(
    nodeRecord.meta,
    fallback?.meta
  );
  const normalizedOrder = v2_normalizeGraphNodeOrder(
    nodeRecord.order,
    fallback?.order
  );

  return {
    id,
    type,
    label: v2_asString(nodeRecord.label, fallback?.label ?? id),
    parentId,
    childIds,
    ...(typeof nodeRecord.layerId === "string"
      ? { layerId: nodeRecord.layerId }
      : fallback?.layerId
        ? { layerId: fallback.layerId }
        : {}),
    ...(typeof nodeRecord.highlightTarget === "string"
      ? { highlightTarget: nodeRecord.highlightTarget as V2TemplateGraphNode["highlightTarget"] }
      : fallback?.highlightTarget
        ? { highlightTarget: fallback.highlightTarget }
        : {}),
    ...(visibilityMode ? { visibilityMode } : {}),
    ...(binding ? { binding } : {}),
    ...(normalizedStyles ? { styles: normalizedStyles } : {}),
    ...(normalizedMeta ? { meta: normalizedMeta } : {}),
    ...(normalizedOrder ? { order: normalizedOrder } : {}),
  };
};

const v2_sanitizeNodeGraph = ({
  graph,
  fallback,
}: {
  graph: V2TemplateNodeGraph;
  fallback: V2TemplateNodeGraph;
}): V2TemplateNodeGraph => {
  const validNodeIds = new Set(Object.keys(graph.nodes));
  if (validNodeIds.size === 0) return fallback;

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
    node.parentId = node.parentId && validNodeIds.has(node.parentId) ? node.parentId : null;
  });

  const computedRootNodeIds = Object.values(nextNodes)
    .filter((node) => node.parentId === null)
    .map((node) => node.id);
  const prioritizedRootNodeIds = [
    ...graph.rootNodeIds.filter((nodeId) => computedRootNodeIds.includes(nodeId)),
    ...computedRootNodeIds.filter((nodeId) => !graph.rootNodeIds.includes(nodeId)),
  ];

  Object.values(nextNodes).forEach((node) => {
    if (!node.order || node.order.model !== "pointer") return;
    const prevSiblingId = node.order.prevSiblingId;
    if (prevSiblingId === undefined || prevSiblingId === null) return;
    const prevNode = nextNodes[prevSiblingId];
    if (!prevNode || prevNode.parentId !== node.parentId || prevNode.id === node.id) {
      node.order = {
        ...node.order,
        prevSiblingId: null,
      };
    }
  });

  const nextComponentDefinitions = Object.entries(graph.componentDefinitions).reduce<
    Record<string, V2TemplateGraphComponentDefinition>
  >((acc, [componentId, definition]) => {
    if (!validNodeIds.has(definition.rootNodeId)) return acc;
    acc[componentId] = definition;
    return acc;
  }, {});

  return v2_normalizePointerOrderInGraph({
    rootNodeIds:
      prioritizedRootNodeIds.length > 0
        ? prioritizedRootNodeIds
        : fallback.rootNodeIds.filter((nodeId) => validNodeIds.has(nodeId)),
    nodes: nextNodes,
    componentDefinitions:
      Object.keys(nextComponentDefinitions).length > 0
        ? nextComponentDefinitions
        : fallback.componentDefinitions,
  });
};

const v2_normalizeNodeGraph = (
  candidate: unknown,
  fallback: V2TemplateNodeGraph
): V2TemplateNodeGraph => {
  if (!v2_isRecord(candidate)) return fallback;

  const nextNodes: Record<string, V2TemplateGraphNode> = {
    ...fallback.nodes,
  };

  if (v2_isRecord(candidate.nodes)) {
    Object.entries(candidate.nodes).forEach(([nodeId, rawNode]) => {
      const fallbackNode = nextNodes[nodeId];
      const normalizedNode = v2_normalizeGraphNode(nodeId, rawNode, fallbackNode);
      if (!normalizedNode) return;
      nextNodes[normalizedNode.id] = normalizedNode;
    });
  }

  const nextComponentDefinitions: Record<
    string,
    V2TemplateGraphComponentDefinition
  > = {
    ...fallback.componentDefinitions,
  };

  if (v2_isRecord(candidate.componentDefinitions)) {
    Object.entries(candidate.componentDefinitions).forEach(
      ([componentId, rawDefinition]) => {
        if (!v2_isRecord(rawDefinition)) return;
        const fallbackDefinition = nextComponentDefinitions[componentId];
        const id = v2_asString(
          rawDefinition.id,
          fallbackDefinition?.id ?? componentId
        ).trim();
        const rootNodeId = v2_asString(
          rawDefinition.rootNodeId,
          fallbackDefinition?.rootNodeId ?? ""
        ).trim();
        if (!id || !rootNodeId || !nextNodes[rootNodeId]) return;
        const instanceTransforms = v2_normalizeCardInstanceTransforms(
          rawDefinition.instanceTransforms,
          fallbackDefinition?.instanceTransforms ?? {}
        );
        nextComponentDefinitions[id] = {
          id,
          label: v2_asString(rawDefinition.label, fallbackDefinition?.label ?? id),
          rootNodeId,
          ...(typeof rawDefinition.description === "string"
            ? { description: rawDefinition.description }
            : typeof fallbackDefinition?.description === "string"
              ? { description: fallbackDefinition.description }
            : {}),
          ...(rawDefinition.kind === "template" || rawDefinition.kind === "custom"
            ? { kind: rawDefinition.kind }
            : fallbackDefinition?.kind
              ? { kind: fallbackDefinition.kind }
            : {}),
          ...(typeof rawDefinition.instanceMode === "string" &&
          v2_COMPONENT_INSTANCE_MODE_SET.has(rawDefinition.instanceMode)
            ? {
                instanceMode:
                  rawDefinition.instanceMode as V2TemplateComponentInstanceMode,
              }
            : fallbackDefinition?.instanceMode
              ? {
                  instanceMode: fallbackDefinition.instanceMode,
                }
            : {}),
          ...(Object.keys(instanceTransforms).length > 0
            ? { instanceTransforms }
            : {}),
          ...(typeof rawDefinition.detachedAt === "string"
            ? { detachedAt: rawDefinition.detachedAt }
            : typeof fallbackDefinition?.detachedAt === "string"
              ? { detachedAt: fallbackDefinition.detachedAt }
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

  return v2_sanitizeNodeGraph({
    graph: {
      rootNodeIds:
        candidateRootNodeIds.length > 0
          ? candidateRootNodeIds
          : fallback.rootNodeIds,
      nodes: nextNodes,
      componentDefinitions: nextComponentDefinitions,
    },
    fallback,
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

const v2_normalizeBindingRef = (
  candidate: unknown,
  fallback: V2TemplateCardNodeBinding
): V2TemplateCardNodeBinding => {
  if (typeof candidate === "string") {
    return v2_defaultBindingRefFromInputKey(candidate);
  }

  if (!v2_isRecord(candidate)) {
    return fallback;
  }

  const mode = v2_asString(candidate.mode, "").trim();
  if (mode === "field") {
    const key = v2_asString(candidate.key, "").trim();
    if (!key) return fallback;
    return {
      mode: "field",
      scope: v2_parseFieldScope(candidate.scope, "entry"),
      key,
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
    return fallback;
  }

  if (mode === "literal") {
    return {
      mode: "literal",
      value: v2_asString(candidate.value, ""),
    };
  }

  return fallback;
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
    const visibilityMode: V2TemplateVisibilityMode | undefined =
      typeof rawNode.visibilityMode === "string" &&
      v2_VISIBILITY_MODE_SET.has(rawNode.visibilityMode)
        ? (rawNode.visibilityMode as V2TemplateVisibilityMode)
        : "always";
    const isTemplateComponent =
      typeof rawNode.isTemplateComponent === "boolean"
        ? rawNode.isTemplateComponent
        : v2_getDefaultTemplateComponentFlagById(id);

    const children = Array.isArray(rawNode.children)
      ? rawNode.children
          .map((childNode) => parseNode(childNode))
          .filter((childNode): childNode is V2TemplateLayerNode => childNode !== null)
      : undefined;
    const hasChildren = Boolean(children && children.length > 0);
    const kind: V2TemplateLayerNodeKind =
      typeof rawNode.kind === "string" && v2_LAYER_NODE_KIND_SET.has(rawNode.kind)
        ? (rawNode.kind as V2TemplateLayerNodeKind)
        : hasChildren
          ? "group"
          : "component";
    const componentKey: V2TemplateLayerComponentKey | undefined =
      typeof rawNode.componentKey === "string" &&
      v2_LAYER_COMPONENT_KEY_SET.has(rawNode.componentKey)
        ? (rawNode.componentKey as V2TemplateLayerComponentKey)
        : v2_getDefaultLayerComponentKeyById(id);

    return {
      id,
      label,
      kind,
      ...(kind === "component" && componentKey ? { componentKey } : {}),
      ...(icon ? { icon } : {}),
      ...(target ? { target } : {}),
      ...(sectionKey ? { sectionKey } : {}),
      ...(visibilityMode ? { visibilityMode } : {}),
      ...(isTemplateComponent ? { isTemplateComponent } : {}),
      ...(hasChildren ? { children } : {}),
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
      ? candidate.kind === "autoResizeText"
        ? "flexibleText"
        : (candidate.kind as V2TemplateCardNode["kind"])
      : fallback.kind;
  const binding: V2TemplateCardNode["binding"] = v2_normalizeBindingRef(
    candidate.binding,
    fallback.binding
  );
  const visibilityMode: V2TemplateVisibilityMode | undefined =
    typeof candidate.visibilityMode === "string" &&
    v2_VISIBILITY_MODE_SET.has(candidate.visibilityMode)
      ? (candidate.visibilityMode as V2TemplateVisibilityMode)
      : fallback.visibilityMode ?? "always";
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
    visibilityMode,
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

const v2_createFallbackCardNode = (
  nodeId: string,
  candidate: unknown
): V2TemplateCardNode | null => {
  if (!v2_isRecord(candidate)) return null;

  const id = v2_asString(candidate.id, nodeId).trim();
  if (!id) return null;

  const label = v2_asString(candidate.label, id);
  const kind: V2TemplateCardNode["kind"] =
    typeof candidate.kind === "string" && v2_CARD_NODE_KIND_SET.has(candidate.kind)
      ? candidate.kind === "autoResizeText"
        ? "flexibleText"
        : (candidate.kind as V2TemplateCardNode["kind"])
      : "text";

  return {
    id,
    label,
    kind,
    layerId: v2_asString(candidate.layerId, id),
    highlightTarget: v2_asString(candidate.highlightTarget, "cardContainer"),
    binding: v2_normalizeBindingRef(candidate.binding, {
      mode: "field",
      scope: "entry",
      key: id,
    }),
    visibilityMode: "always",
    containerStyleKey: v2_asString(candidate.containerStyleKey, "container"),
    ...(v2_isNonEmptyString(candidate.textStyleKey)
      ? { textStyleKey: candidate.textStyleKey }
      : {}),
    ...(v2_isNonEmptyString(candidate.wrapperStyleKey)
      ? { wrapperStyleKey: candidate.wrapperStyleKey }
      : {}),
    ...(v2_isNonEmptyString(candidate.optionsKey)
      ? { optionsKey: candidate.optionsKey }
      : {}),
    colorKey: "SUB_TITLE",
    fontKey: "SUB_TITLE",
    containerClassName: "absolute flex justify-center items-center",
    ...(typeof candidate.textClassName === "string"
      ? { textClassName: candidate.textClassName }
      : {}),
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
      const fallbackNode =
        fallback.nodes[nodeId] ?? v2_createFallbackCardNode(nodeId, rawNode);
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

  const baseNodeOrder =
    nodeOrderCandidate.length > 0
      ? Array.from(new Set(nodeOrderCandidate))
      : fallback.nodeOrder;
  const appendedNodeIds = Object.keys(nextNodes).filter(
    (nodeId) => !baseNodeOrder.includes(nodeId)
  );
  const nodeOrder = [...baseNodeOrder, ...appendedNodeIds];

  const instanceMode: V2TemplateComponentInstanceMode =
    typeof candidate.instanceMode === "string" &&
    v2_COMPONENT_INSTANCE_MODE_SET.has(candidate.instanceMode)
      ? (candidate.instanceMode as V2TemplateComponentInstanceMode)
      : fallback.instanceMode;

  const instanceTransforms = v2_normalizeCardInstanceTransforms(
    candidate.instanceTransforms,
    fallback.instanceTransforms
  );

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
    instanceMode,
    instanceTransforms,
    nodeOrder,
    nodes: nextNodes,
  };
};

const v2_normalizeSceneNode = (
  candidate: unknown,
  fallback?: V2TemplateSceneNode
): V2TemplateSceneNode | null => {
  if (!v2_isRecord(candidate) && !fallback) return null;
  const candidateRecord = v2_isRecord(candidate) ? candidate : {};

  const inferredKind: V2TemplateSceneNodeKind | undefined = (() => {
    if (
      typeof candidateRecord.kind === "string" &&
      v2_SCENE_NODE_KIND_SET.has(candidateRecord.kind)
    ) {
      return candidateRecord.kind as V2TemplateSceneNodeKind;
    }
    if (fallback) return fallback.kind;
    if (Array.isArray(candidateRecord.children)) return "group";
    if (
      typeof candidateRecord.assetKey === "string" &&
      v2_ASSET_KEY_SET.has(candidateRecord.assetKey)
    ) {
      return "asset";
    }
    if (candidateRecord.source === "card") return "cardCollection";
    if (candidateRecord.binding !== undefined) return "text";
    return undefined;
  })();

  if (!inferredKind) return null;

  const id = v2_asString(candidateRecord.id, fallback?.id ?? "").trim();
  if (!id) return null;

  const base = {
    id,
    label: v2_asString(candidateRecord.label, fallback?.label ?? id),
    kind: inferredKind,
    ...(typeof candidateRecord.layerId === "string"
      ? { layerId: candidateRecord.layerId }
      : fallback?.layerId
        ? { layerId: fallback.layerId }
        : {}),
    ...(typeof candidateRecord.visibilityMode === "string" &&
    v2_VISIBILITY_MODE_SET.has(candidateRecord.visibilityMode)
      ? { visibilityMode: candidateRecord.visibilityMode as V2TemplateVisibilityMode }
      : fallback?.visibilityMode
        ? { visibilityMode: fallback.visibilityMode }
        : {}),
  } as const;

  if (inferredKind === "group") {
    const fallbackChildren =
      fallback?.kind === "group" ? fallback.children : [];
    const fallbackById = new Map<string, V2TemplateSceneNode>();
    fallbackChildren.forEach((child) => {
      fallbackById.set(child.id, child);
    });

    const parsedChildren = Array.isArray(candidateRecord.children)
      ? candidateRecord.children
          .map((child) => {
            const childRecord = v2_isRecord(child) ? child : null;
            const fallbackChild =
              childRecord && typeof childRecord.id === "string"
                ? fallbackById.get(childRecord.id)
                : undefined;
            return v2_normalizeSceneNode(child, fallbackChild);
          })
          .filter((child): child is V2TemplateSceneNode => child !== null)
      : fallbackChildren;

    return {
      ...base,
      kind: "group",
      children: parsedChildren,
    };
  }

  if (inferredKind === "asset") {
    const fallbackAssetKey =
      fallback?.kind === "asset" ? fallback.assetKey : undefined;
    const assetKeyRaw = v2_asString(
      candidateRecord.assetKey,
      fallbackAssetKey ?? ""
    );
    if (!v2_ASSET_KEY_SET.has(assetKeyRaw)) return null;

    const fitRaw = v2_asString(
      candidateRecord.fit,
      fallback?.kind === "asset" ? fallback.fit ?? "" : ""
    );
    const fit = v2_SCENE_ASSET_FIT_SET.has(fitRaw)
      ? (fitRaw as V2TemplateSceneAssetFit)
      : undefined;
    const styleKey = v2_isSceneStyleKey(candidateRecord.styleKey)
      ? candidateRecord.styleKey
      : fallback?.kind === "asset"
        ? fallback.styleKey
        : undefined;
    const alt = v2_asString(
      candidateRecord.alt,
      fallback?.kind === "asset" ? fallback.alt ?? "" : ""
    );

    return {
      ...base,
      kind: "asset",
      assetKey: assetKeyRaw as keyof V2TemplateRenderConfig["assets"],
      ...(styleKey ? { styleKey } : {}),
      ...(fit ? { fit } : {}),
      ...(alt ? { alt } : {}),
    };
  }

  if (inferredKind === "cardCollection") {
    const source = candidateRecord.source === "card" ? "card" : "card";
    const componentId = v2_asString(
      candidateRecord.componentId,
      fallback?.kind === "cardCollection" ? fallback.componentId ?? "card" : "card"
    ).trim();
    return {
      ...base,
      kind: "cardCollection",
      source,
      componentId: componentId || "card",
    };
  }

  const fallbackTextNode =
    fallback?.kind === "text" || fallback?.kind === "flexibleText"
      ? fallback
      : undefined;
  const binding = v2_normalizeBindingRef(candidateRecord.binding, {
    mode: "literal",
    value: "",
  });
  const colorKey =
    typeof candidateRecord.colorKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(
      candidateRecord.colorKey
    )
      ? (candidateRecord.colorKey as V2TemplateColorKey)
      : fallbackTextNode?.colorKey ?? "SUB_TITLE";
  const fontKey =
    typeof candidateRecord.fontKey === "string" &&
    (v2_TEMPLATE_COLOR_KEYS as readonly string[]).includes(
      candidateRecord.fontKey
    )
      ? (candidateRecord.fontKey as V2TemplateColorKey)
      : fallbackTextNode?.fontKey ?? "SUB_TITLE";
  const containerStyleKey = v2_asString(
    candidateRecord.containerStyleKey,
    fallbackTextNode?.containerStyleKey ?? ""
  ).trim();

  if (!containerStyleKey) return null;

  return {
    ...base,
    kind: inferredKind === "flexibleText" ? "flexibleText" : "text",
    binding,
    containerStyleKey,
    ...(v2_isSceneStyleKey(candidateRecord.textStyleKey)
      ? { textStyleKey: candidateRecord.textStyleKey }
      : fallbackTextNode?.textStyleKey
        ? { textStyleKey: fallbackTextNode.textStyleKey }
        : {}),
    ...(v2_isSceneStyleKey(candidateRecord.wrapperStyleKey)
      ? { wrapperStyleKey: candidateRecord.wrapperStyleKey }
      : fallbackTextNode?.wrapperStyleKey
        ? { wrapperStyleKey: fallbackTextNode.wrapperStyleKey }
        : {}),
    ...(v2_isCardOptionsKey(candidateRecord.optionsKey)
      ? { optionsKey: candidateRecord.optionsKey }
      : fallbackTextNode?.optionsKey
        ? { optionsKey: fallbackTextNode.optionsKey }
        : {}),
    ...(typeof candidateRecord.highlightTarget === "string"
      ? { highlightTarget: candidateRecord.highlightTarget }
      : fallbackTextNode?.highlightTarget
        ? { highlightTarget: fallbackTextNode.highlightTarget }
        : {}),
    colorKey,
    fontKey,
    ...(typeof candidateRecord.containerClassName === "string"
      ? { containerClassName: candidateRecord.containerClassName }
      : fallbackTextNode?.containerClassName
        ? { containerClassName: fallbackTextNode.containerClassName }
        : {}),
    ...(typeof candidateRecord.textClassName === "string"
      ? { textClassName: candidateRecord.textClassName }
      : fallbackTextNode?.textClassName
        ? { textClassName: fallbackTextNode.textClassName }
        : {}),
  };
};

const v2_normalizeSceneNodes = (
  candidate: unknown,
  fallback: V2TemplateSceneNode[]
): V2TemplateSceneNode[] => {
  if (!Array.isArray(candidate)) return fallback;

  const fallbackById = new Map<string, V2TemplateSceneNode>();
  fallback.forEach((node) => {
    fallbackById.set(node.id, node);
  });

  const parsed = candidate
    .map((rawNode) => {
      const nodeRecord = v2_isRecord(rawNode) ? rawNode : null;
      const fallbackNode =
        nodeRecord && typeof nodeRecord.id === "string"
          ? fallbackById.get(nodeRecord.id)
          : undefined;
      return v2_normalizeSceneNode(rawNode, fallbackNode);
    })
    .filter((node): node is V2TemplateSceneNode => node !== null);

  return parsed.length > 0 ? parsed : fallback;
};

const v2_normalizeStructure = (
  candidate: unknown,
  fallback: V2TemplateStructureConfig
): V2TemplateStructureConfig => {
  if (!v2_isRecord(candidate)) return fallback;

  return {
    layers: v2_normalizeLayerTree(candidate.layers, fallback.layers),
    card: v2_normalizeCardStructure(candidate.card, fallback.card),
    sceneNodes: v2_normalizeSceneNodes(candidate.sceneNodes, fallback.sceneNodes),
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
      guideByTheme: v2_mergeThemeAssetDimensionMap(
        normalized.assetDimensions.guideByTheme,
        raw.assetDimensions.guideByTheme
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
  const graphFallback = v2_createNodeGraphFromStructure(normalized.structure);
  normalized.graph = v2_normalizeNodeGraph(raw.graph, graphFallback);

  const sceneLayoutKeys = v2_collectSceneLayoutKeys(normalized.structure.sceneNodes);
  sceneLayoutKeys.forEach((styleKey) => {
    if (!styleKey.startsWith("sceneNode:")) return;
    const legacyCardEntry = normalized.layout.card[styleKey];
    if (!legacyCardEntry || typeof legacyCardEntry !== "object") return;

    normalized.layout.scene[styleKey] = v2_mergeSceneLayoutEntry(
      normalized.layout.scene[styleKey],
      legacyCardEntry
    );
    delete normalized.layout.card[styleKey];
  });

  normalized.version = v2_TEMPLATE_RENDER_CONFIG_VERSION;

  return normalized;
};

export const v2_isVisibleByMode = ({
  mode,
  isOffline,
}: {
  mode?: V2TemplateVisibilityMode;
  isOffline: boolean;
}): boolean => {
  const resolvedMode = mode ?? "always";
  if (resolvedMode === "onlineOnly") return !isOffline;
  if (resolvedMode === "offlineOnly") return isOffline;
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
  if (!v2_isRecord(candidate.structure)) return false;
  if (!v2_isRecord(candidate.graph)) return false;
  return true;
};
