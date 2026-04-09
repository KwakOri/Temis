import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignHorizontalJustifyCenter,
  Braces,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import { useTemplateEditorActions } from "@/contexts/v2/template-editor-ui-context";
import {
  V2TemplateAssetDimension,
  V2TemplateAssetMap,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNodeKind,
  V2TemplateCardNode,
  V2TemplateCardOptionsKey,
  V2TemplateFieldScope,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateFormField,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_bindingRefToLegacyInput,
  v2_createBindingRefFromLegacyInput,
  v2_isEntryFieldBindingKey,
} from "@/utils/time-table/template-render-config";
import {
  v2_ALIGN_ITEMS_TO_VERTICAL_ALIGN,
  v2_HORIZONTAL_ALIGN_TO_JUSTIFY,
  v2_JUSTIFY_TO_HORIZONTAL_ALIGN,
  v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS,
} from "./model/alignment-utils";
import {
  v2_POSITION_MUTEX_MAP,
  v2_getGridEmptySlotsFromMap,
  v2_hasRenderableStyleValue,
  v2_parseFlex42Align,
  v2_parseFlex42ThreeRow,
  v2_parseGridLayoutMode,
} from "./model/layout-utils";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import {
  v2_BOILERPLATE_NUMERIC_KEYS,
  v2_BOILERPLATE_SELECT_OPTIONS,
  v2_STYLE_EXTENSION_GROUPS,
} from "./model/boilerplate-presets";
import { v2_BOILERPLATE_SECTION_GROUPS } from "./model/boilerplate-section-groups";
import {
  v2_collectLayerNodeIds,
  v2_collectSceneNodeIds,
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
  v2_collectStructureTargetSectionMaps,
  v2_createUniqueNodeId,
  v2_findLayerNodeContextById,
  v2_findSceneNodeContextById,
  v2_mapSceneTextNodes,
  v2_updateLayerNodeLabelById,
  v2_updateLayerNodeListByParentId,
  v2_updateSceneNodeById,
  v2_updateSceneNodeListByParentId,
  v2_updateSceneTextNodeById,
} from "./model/structure-utils";
import {
  V2NodeNewFieldDraft,
  v2_getNodeBindingSelectValue,
  v2_getNodeFieldBinding,
  v2_getNodeNewFieldDraft,
  v2_hasNodeBindingField,
} from "./model/binding-utils";
import {
  V2BoilerplateFieldConfig,
  V2BoilerplateGroupConfig,
  V2BoilerplateFieldType,
  v2_expandDisplayGroups,
  v2_getBoilerplateFieldIcon,
  v2_getBoilerplateGroupIcon,
  v2_STYLE_EXTENSION_DEFAULT_VALUES,
  v2_STYLE_EXTENSION_GROUP_IDS,
  v2_STYLE_GROUP_DISPLAY_LABEL,
} from "./model/boilerplate-ui-utils";
import {
  v2_createStyleKeyToSectionKeyMap,
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
  v2_resolveCardStyleSection,
} from "./model/style-section-utils";
import TemplateCardAutoResizeOptions from "./components/template-card-auto-resize-options";
import TemplateAssetsTab from "./panels/template-assets-tab";
import TemplateBuilderTabs from "./panels/template-builder-tabs";
import TemplateDataTab from "./panels/template-data-tab";
import TemplateExportTab from "./panels/template-export-tab";
import TemplatePropertiesTab from "./panels/template-properties-tab";
import TemplateSchemaTab from "./panels/template-schema-tab";
import TemplateStyleTab from "./panels/template-style-tab";
import TemplateStyleThemeSettings from "./panels/template-style-theme-settings";

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

const v2_BASE_FONT_TOKEN_KEYS = [
  "primary",
  "secondary",
  "tertiary",
  "quaternary",
] as const;

const v2_FONT_DISPLAY_OPTIONS: Array<
  NonNullable<V2TemplateFontRegistryItem["display"]>
> = ["auto", "block", "swap", "fallback", "optional"];

const v2_FONT_STYLE_OPTIONS: Array<NonNullable<V2TemplateFontFaceSource["style"]>> = [
  "normal",
  "italic",
  "oblique",
];

const v2_FONT_FORMAT_OPTIONS: Array<NonNullable<V2TemplateFontFaceSource["format"]>> = [
  "woff2",
  "woff",
  "truetype",
  "opentype",
];

const v2_ASSET_KEYS: Array<keyof V2TemplateAssetMap> = [
  "bgByTheme",
  "topObjectByTheme",
  "onlineByTheme",
  "offlineByTheme",
  "profileFrameByTheme",
  "profileBgByTheme",
  "guideByTheme",
];

const v2_ASSET_LABELS: Record<keyof V2TemplateAssetMap, string> = {
  bgByTheme: "배경",
  topObjectByTheme: "상단 오브젝트",
  onlineByTheme: "온라인 카드",
  offlineByTheme: "오프라인 카드",
  profileFrameByTheme: "프로필 프레임",
  profileBgByTheme: "프로필 배경",
  guideByTheme: "가이드 레이어(상단 오버레이)",
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

const v2_SCENE_CUSTOM_NODE_ID_PREFIX = "scene-custom-";
const v2_SCENE_CUSTOM_LAYER_ID_PREFIX = "scene-custom-layer-";

type V2StyleSectionKey =
  | "grid"
  | "weekFlag"
  | "topObjectContainer"
  | "profileImage"
  | "profileFrame"
  | "profileTextRootStyle"
  | "profileTextWrapperStyle"
  | "profileTextStyle"
  | "profileTextArtistImageStyle"
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

interface V2TemplateBuilderFormProps {
  focusLayerId?: string | null;
  focusLayerNonce?: number;
  focusStyleSection?: string | null;
  focusStyleSectionNonce?: number;
}

const v2_STYLE_SECTION_LABELS: Record<V2StyleSectionKey, string> = {
  grid: "Grid",
  weekFlag: "WeekFlag",
  topObjectContainer: "TopObject",
  profileImage: "ProfileImage",
  profileFrame: "ProfileFrame",
  profileTextRootStyle: "ProfileText.RootStyle",
  profileTextWrapperStyle: "ProfileText.WrapperStyle",
  profileTextStyle: "ProfileText.TextStyle",
  profileTextArtistImageStyle: "ProfileText.ImageStyle",
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
  "profileTextRootStyle",
  "profileTextWrapperStyle",
  "profileTextStyle",
  "profileTextArtistImageStyle",
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
  profileTextRootStyle: "profileText",
  profileTextWrapperStyle: "profileText",
  profileTextStyle: "profileText",
  profileTextArtistImageStyle: "profileText",
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
  profileTextRootStyle: "profileTextRootStyle",
  profileTextWrapperStyle: "profileTextWrapperStyle",
  profileTextStyle: "profileTextStyle",
  profileTextArtistImageStyle: "profileTextArtistImageStyle",
};

const v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP: Partial<
  Record<
    V2StyleSectionKey,
    Extract<keyof V2TemplateRenderConfig["layout"]["card"], string>
  >
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
  profileText: "Profile Text",
  cardStreamingDay: "Card / StreamingDay",
  cardStreamingDate: "Card / StreamingDate",
  cardStreamingTime: "Card / StreamingTime",
  cardMainTitleContainer: "Card / MainTitle",
  cardSubTitleContainer: "Card / SubTitle",
  cardContainer: "Card Container",
};


type V2CardLayoutStyleKey = Extract<
  keyof V2TemplateRenderConfig["layout"]["card"],
  string
>;

const v2_STYLE_KEY_TO_SECTION_KEY_MAP: Partial<
  Record<V2CardLayoutStyleKey, V2StyleSectionKey>
> = v2_createStyleKeyToSectionKeyMap<
  V2StyleSectionKey,
  V2CardLayoutStyleKey
>(v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP);

const v2_BOILERPLATE_STORAGE_KEY =
  "v2-template-builder-style-boilerplates-v1";

const V2TemplateBuilderForm: React.FC<V2TemplateBuilderFormProps> = ({
  focusLayerId = null,
  focusLayerNonce = 0,
  focusStyleSection = null,
  focusStyleSectionNonce = 0,
}) => {
  const { renderConfig, setRenderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    updateData,
    currentTheme,
    updateTheme,
    resetData,
    setHoverHighlightTarget,
    setActiveHighlightTarget,
  } = useTemplateEditorRuntimeContext();
  const { downloadImage } = useTemplateEditorActions();

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
    Record<string, V2NodeNewFieldDraft>
  >({});
  const inspectorTabRef = useRef<HTMLDivElement | null>(null);
  const [selectedPropertiesTarget, setSelectedPropertiesTarget] =
    useState<V2TemplateHighlightTarget>("grid");
  const [selectedPropertiesLayerId, setSelectedPropertiesLayerId] =
    useState<string>("grid");
  const structurePropertiesMaps = useMemo(
    () => v2_collectStructureTargetSectionMaps(renderConfig.structure.layers),
    [renderConfig.structure.layers]
  );
  const selectedPropertiesLayerNode = useMemo(
    () => structurePropertiesMaps.layerIdToNode[selectedPropertiesLayerId] ?? null,
    [selectedPropertiesLayerId, structurePropertiesMaps.layerIdToNode]
  );
  const selectedPropertiesSection = useMemo(() => {
    const rawSection = selectedPropertiesLayerNode?.sectionKey;
    return v2_parseStyleSectionKey(rawSection) ?? null;
  }, [selectedPropertiesLayerNode]);
  const selectedPropertiesLabel = useMemo(() => {
    if (selectedPropertiesLayerNode?.label) {
      return selectedPropertiesLayerNode.label;
    }
    if (!selectedPropertiesSection) {
      return v2_HIGHLIGHT_TARGET_LABELS[selectedPropertiesTarget];
    }
    const knownSection = v2_isKnownStyleSectionKey(selectedPropertiesSection, v2_STYLE_SECTION_LABELS)
      ? selectedPropertiesSection
      : null;
    return (
      structurePropertiesMaps.sectionToLabel[selectedPropertiesSection] ??
      (knownSection
        ? v2_STYLE_SECTION_LABELS[knownSection]
        : selectedPropertiesSection)
    );
  }, [
    selectedPropertiesLayerNode,
    selectedPropertiesSection,
    selectedPropertiesTarget,
    structurePropertiesMaps.sectionToLabel,
  ]);
  const cardNodeByLayerId = useMemo(() => {
    const map = new Map<string, V2TemplateCardNode>();
    Object.values(renderConfig.structure.card.nodes).forEach((node) => {
      map.set(node.layerId, node);
    });
    return map;
  }, [renderConfig.structure.card.nodes]);
  const sceneNodeByLayerId = useMemo(
    () => v2_collectSceneNodesByLayerId(renderConfig.structure.sceneNodes),
    [renderConfig.structure.sceneNodes]
  );
  const sceneStyleSectionKeySet = useMemo(() => {
    const next = new Set<string>();
    renderConfig.structure.sceneNodes.forEach((node) => {
      v2_collectSceneNodeStyleKeys(node).forEach((key) => next.add(key));
    });
    return next;
  }, [renderConfig.structure.sceneNodes]);
  const bindableCardNodeLabels = useMemo(() => {
    return renderConfig.structure.card.nodeOrder
      .map((nodeId) => renderConfig.structure.card.nodes[nodeId])
      .filter((node): node is V2TemplateCardNode => Boolean(node))
      .map((node) => node.label);
  }, [renderConfig.structure.card.nodeOrder, renderConfig.structure.card.nodes]);
  const bindableSceneTextNodeLabels = useMemo(() => {
    return v2_collectSceneTextNodes(renderConfig.structure.sceneNodes).map(
      (node) => node.label
    );
  }, [renderConfig.structure.sceneNodes]);
  const bindableNodeLabels = useMemo(() => {
    return Array.from(
      new Set([...bindableCardNodeLabels, ...bindableSceneTextNodeLabels])
    );
  }, [bindableCardNodeLabels, bindableSceneTextNodeLabels]);
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
    const fieldBindingNodes = [
      ...Object.values(renderConfig.structure.card.nodes).map((node) => ({
        nodeLabel: node.label,
        binding: node.binding,
      })),
      ...v2_collectSceneTextNodes(renderConfig.structure.sceneNodes).map(
        (node) => ({
          nodeLabel: node.label,
          binding: node.binding,
        })
      ),
    ];
    fieldBindingNodes.forEach(({ nodeLabel, binding }) => {
      if (binding.mode !== "field") return;
      const fieldId = `${binding.scope}:${binding.key}`;
      if (!fieldIdSet.has(fieldId)) {
        missingBindings.push({
          nodeLabel,
          scope: binding.scope,
          key: binding.key,
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
  }, [
    renderConfig.formSchema.fields,
    renderConfig.structure.card.nodes,
    renderConfig.structure.sceneNodes,
  ]);

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
        if (!v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS)) return;
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
    if (!focusLayerId) return;
    const layerNode = structurePropertiesMaps.layerIdToNode[focusLayerId];
    if (!layerNode) return;

    setSelectedPropertiesLayerId(layerNode.id);
    if (layerNode.target) {
      setSelectedPropertiesTarget(layerNode.target);
      setActiveHighlightTarget(layerNode.target);
    }
    setActiveTab("properties");
  }, [
    focusLayerId,
    focusLayerNonce,
    setActiveHighlightTarget,
    structurePropertiesMaps.layerIdToNode,
  ]);

  useEffect(() => {
    const nextSection = v2_parseStyleSectionKey(focusStyleSection);
    if (!nextSection) return;
    const knownSection = v2_isKnownStyleSectionKey(nextSection, v2_STYLE_SECTION_LABELS)
      ? nextSection
      : null;
    const nextTarget =
      structurePropertiesMaps.sectionToTarget[nextSection] ??
      (knownSection
        ? v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP[knownSection]
        : "cardContainer");
    const nextLayerId = structurePropertiesMaps.sectionToLayerId[nextSection];

    if (nextLayerId) {
      setSelectedPropertiesLayerId(nextLayerId);
    }
    setSelectedPropertiesTarget(nextTarget);
    setActiveHighlightTarget(nextTarget);
    setActiveTab("properties");
  }, [
    focusStyleSection,
    focusStyleSectionNonce,
    setActiveHighlightTarget,
    structurePropertiesMaps.sectionToLayerId,
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
      const nextCardNodes = Object.fromEntries(
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
      const { nodes: nextSceneNodes } = v2_mapSceneTextNodes({
        nodes: prev.structure.sceneNodes,
        mapper: (node) => {
          const shouldRewriteBinding =
            node.binding.mode === "field" &&
            node.binding.scope === prevField.scope &&
            node.binding.key === prevField.key;
          if (!shouldRewriteBinding) return node;
          return {
            ...node,
            binding: {
              mode: "field",
              scope: nextField.scope,
              key: nextField.key,
            },
          };
        },
      });
      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };

      return {
        ...prev,
        formSchema: nextFormSchema,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          card: {
            ...prev.structure.card,
            nodes: nextCardNodes,
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

    const linkedCardNodeIds = Object.values(renderConfig.structure.card.nodes)
      .filter(
        (node) =>
          node.binding.mode === "field" &&
          node.binding.key === targetField.key &&
          node.binding.scope === targetField.scope
      )
      .map((node) => node.id);
    const linkedSceneNodeIds = v2_collectSceneTextNodes(
      renderConfig.structure.sceneNodes
    )
      .filter(
        (node) =>
          node.binding.mode === "field" &&
          node.binding.key === targetField.key &&
          node.binding.scope === targetField.scope
      )
      .map((node) => node.id);
    const linkedNodeCount = linkedCardNodeIds.length + linkedSceneNodeIds.length;

    if (linkedNodeCount > 0) {
      const confirmed = window.confirm(
        `이 필드는 ${linkedNodeCount}개 오브젝트에서 사용 중입니다. 삭제하면 해당 바인딩이 비워집니다. 계속할까요?`
      );
      if (!confirmed) return;
    }

    setFormSchemaError(null);
    safeUpdateConfig((prev) => {
      const nextFields = prev.formSchema.fields.filter((_, i) => i !== index);
      const nextCardNodes = Object.fromEntries(
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
      const { nodes: nextSceneNodes } = v2_mapSceneTextNodes({
        nodes: prev.structure.sceneNodes,
        mapper: (node) => {
          const shouldResetBinding =
            node.binding.mode === "field" &&
            node.binding.key === targetField.key &&
            node.binding.scope === targetField.scope;
          if (!shouldResetBinding) return node;
          return {
            ...node,
            binding: {
              mode: "literal",
              value: "",
            },
          };
        },
      });

      const nextFormSchema = {
        ...prev.formSchema,
        fields: nextFields,
      };

      return {
        ...prev,
        formSchema: nextFormSchema,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          card: {
            ...prev.structure.card,
            nodes: nextCardNodes,
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
  const fontRegistryKeys = useMemo(
    () => Object.keys(renderConfig.fonts.registry ?? {}),
    [renderConfig.fonts.registry]
  );

  const parseFontWeightInput = (rawValue: string): number | string => {
    const trimmed = rawValue.trim();
    if (trimmed === "") return 400;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    return trimmed;
  };

  const addFontRegistryItem = () => {
    safeUpdateConfig((prev) => {
      const nextRegistry = { ...prev.fonts.registry };
      let index = Object.keys(nextRegistry).length + 1;
      let nextKey = `font${index}`;
      while (nextRegistry[nextKey]) {
        index += 1;
        nextKey = `font${index}`;
      }

      nextRegistry[nextKey] = {
        family: nextKey,
        display: "swap",
        faces: [
          {
            weight: 400,
            style: "normal",
            src: "",
            format: "woff2",
          },
        ],
      };

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: nextRegistry,
        },
      };
    });
  };

  const removeFontRegistryItem = (registryKey: string) => {
    safeUpdateConfig((prev) => {
      if (!prev.fonts.registry[registryKey]) return prev;

      const usedByBase = v2_BASE_FONT_TOKEN_KEYS.some(
        (tokenKey) => prev.baseFonts[tokenKey] === registryKey
      );
      const usedByComponent = v2_TEMPLATE_COLOR_KEYS.some(
        (componentKey) => prev.componentFonts[componentKey] === registryKey
      );

      if (usedByBase || usedByComponent) {
        window.alert(
          "사용 중인 폰트입니다. base/component 폰트 토큰 연결을 먼저 변경해 주세요."
        );
        return prev;
      }

      const nextRegistry = { ...prev.fonts.registry };
      delete nextRegistry[registryKey];

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: nextRegistry,
        },
      };
    });
  };

  const updateBaseFontToken = (
    tokenKey: (typeof v2_BASE_FONT_TOKEN_KEYS)[number],
    registryKey: string
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      baseFonts: {
        ...prev.baseFonts,
        [tokenKey]: registryKey,
      },
    }));
  };

  const updateFontRegistryMeta = (
    registryKey: string,
    patch: Partial<Pick<V2TemplateFontRegistryItem, "family" | "display">>
  ) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextItem: V2TemplateFontRegistryItem = {
        ...currentItem,
        ...(patch.family !== undefined ? { family: patch.family } : {}),
        ...(patch.display !== undefined ? { display: patch.display } : {}),
      };

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: nextItem,
          },
        },
      };
    });
  };

  const addFontFace = (registryKey: string) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextFaces = [
        ...currentItem.faces,
        {
          weight: 400,
          style: "normal",
          src: "",
          format: "woff2",
        } satisfies V2TemplateFontFaceSource,
      ];

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

  const updateFontFace = (
    registryKey: string,
    faceIndex: number,
    patch: Partial<V2TemplateFontFaceSource>
  ) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;

      const nextFaces = [...currentItem.faces];
      if (!nextFaces[faceIndex]) return prev;
      nextFaces[faceIndex] = {
        ...nextFaces[faceIndex],
        ...patch,
      };

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

  const removeFontFace = (registryKey: string, faceIndex: number) => {
    safeUpdateConfig((prev) => {
      const currentItem = prev.fonts.registry[registryKey];
      if (!currentItem) return prev;
      if (currentItem.faces.length <= 1) return prev;

      const nextFaces = currentItem.faces.filter((_, index) => index !== faceIndex);

      return {
        ...prev,
        fonts: {
          ...prev.fonts,
          registry: {
            ...prev.fonts.registry,
            [registryKey]: {
              ...currentItem,
              faces: nextFaces,
            },
          },
        },
      };
    });
  };

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
    const knownSection = v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS) ? section : null;
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

    const dynamicSectionSource = sceneStyleSectionKeySet.has(section)
      ? renderConfig.layout.scene[section]
      : renderConfig.layout.card[section];
    if (dynamicSectionSource && typeof dynamicSectionSource === "object") {
      return dynamicSectionSource as Record<string, string | number>;
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
      const knownSection = v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS) ? section : null;
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

      if (sceneStyleSectionKeySet.has(section)) {
        return {
          ...prev,
          layout: {
            ...prev.layout,
            scene: {
              ...prev.layout.scene,
              [section]: nextMap,
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
    const knownSection = v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS) ? section : null;
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

  const updateSceneNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    safeUpdateConfig((prev) => {
      const { nodes: nextSceneNodes, updated } = v2_updateSceneNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => ({
          ...node,
          visibilityMode,
        }),
      });

      if (!updated) return prev;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  const updateSceneNodeLabel = (nodeId: string, rawLabel: string) => {
    const nextLabel = rawLabel.trim();
    if (!nextLabel) return;

    safeUpdateConfig((prev) => {
      const { nodes: nextSceneNodes, updated, matchedNode } =
        v2_updateSceneNodeById({
          nodes: prev.structure.sceneNodes,
          nodeId,
          updater: (node) => ({
            ...node,
            label: nextLabel,
          }),
        });

      if (!updated) return prev;

      const nextLayers = matchedNode?.layerId
        ? v2_updateLayerNodeLabelById(
            prev.structure.layers,
            matchedNode.layerId,
            nextLabel
          )
        : prev.structure.layers;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          layers: nextLayers,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  const updateSceneAssetNodeMeta = ({
    nodeId,
    assetKey,
    fit,
    alt,
  }: {
    nodeId: string;
    assetKey?: keyof V2TemplateAssetMap;
    fit?: V2TemplateSceneAssetNode["fit"];
    alt?: string;
  }) => {
    safeUpdateConfig((prev) => {
      const { nodes: nextSceneNodes, updated } = v2_updateSceneNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => {
          if (node.kind !== "asset") return node;
          const nextAlt = typeof alt === "string" ? alt.trim() : undefined;
          return {
            ...node,
            ...(assetKey ? { assetKey } : {}),
            ...(fit ? { fit } : {}),
            ...(nextAlt !== undefined ? { alt: nextAlt } : {}),
          };
        },
      });

      if (!updated) return prev;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  const isSceneCustomNode = (nodeId: string) =>
    nodeId.startsWith(v2_SCENE_CUSTOM_NODE_ID_PREFIX);

  const createCustomSceneNodePayload = (
    prev: V2TemplateRenderConfig,
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection"
  ): {
    sceneNode: V2TemplateSceneNode;
    layerNode: V2TemplateLayerNode;
    dynamicSceneLayoutPatch: Record<
      string,
      NonNullable<V2TemplateRenderConfig["layout"]["scene"][string]>
    >;
  } => {
    const existingSceneNodeIds = v2_collectSceneNodeIds(prev.structure.sceneNodes);
    const existingLayerNodeIds = v2_collectLayerNodeIds(prev.structure.layers);
    const baseSceneNodeId = v2_createUniqueNodeId(
      v2_SCENE_CUSTOM_NODE_ID_PREFIX,
      existingSceneNodeIds
    );
    const layerId = v2_createUniqueNodeId(
      v2_SCENE_CUSTOM_LAYER_ID_PREFIX,
      existingLayerNodeIds
    );
    const ordinal = baseSceneNodeId.replace(v2_SCENE_CUSTOM_NODE_ID_PREFIX, "");

    if (kind === "group") {
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Group ${ordinal}`,
          kind: "group",
          layerId,
          visibilityMode: "always",
          children: [],
        },
        layerNode: {
          id: layerId,
          label: `Group ${ordinal}`,
          kind: "group",
          icon: "group",
          target: `sceneNode:${baseSceneNodeId}`,
          visibilityMode: "always",
          children: [],
        },
        dynamicSceneLayoutPatch: {},
      };
    }

    if (kind === "cardCollection") {
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `CardCollection ${ordinal}`,
          kind: "cardCollection",
          layerId,
          source: "card",
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `CardCollection ${ordinal}`,
          kind: "component",
          icon: "grid",
          target: `sceneNode:${baseSceneNodeId}`,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: {},
      };
    }

    if (kind === "asset") {
      const styleKey = `sceneNode:${baseSceneNodeId}:style`;
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Asset ${ordinal}`,
          kind: "asset",
          layerId,
          assetKey: "topObjectByTheme",
          styleKey,
          fit: "cover",
          alt: `asset-${ordinal}`,
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `Asset ${ordinal}`,
          kind: "component",
          icon: "image",
          target: `sceneNode:${baseSceneNodeId}`,
          sectionKey: styleKey,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: {
          [styleKey]: {
            position: "absolute",
            top: 0,
            left: 0,
            width: 240,
            height: 240,
          },
        },
      };
    }

    const containerStyleKey = `sceneNode:${baseSceneNodeId}:container`;
    const textStyleKey = `sceneNode:${baseSceneNodeId}:text`;
    if (kind === "text") {
      return {
        sceneNode: {
          id: baseSceneNodeId,
          label: `Text ${ordinal}`,
          kind: "text",
          layerId,
          binding: {
            mode: "literal",
            value: `Text ${ordinal}`,
          },
          containerStyleKey,
          textStyleKey,
          colorKey: "SUB_TITLE",
          fontKey: "SUB_TITLE",
          highlightTarget: `sceneNode:${baseSceneNodeId}`,
          containerClassName: "absolute flex justify-center items-center",
          textClassName: "text-center",
          visibilityMode: "always",
        },
        layerNode: {
          id: layerId,
          label: `Text ${ordinal}`,
          kind: "component",
          icon: "text",
          target: `sceneNode:${baseSceneNodeId}`,
          sectionKey: containerStyleKey,
          visibilityMode: "always",
        },
        dynamicSceneLayoutPatch: {
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
          },
        },
      };
    }

    const wrapperStyleKey = `sceneNode:${baseSceneNodeId}:wrapper`;
    const optionsKey = `sceneNode:${baseSceneNodeId}:options`;
    return {
      sceneNode: {
        id: baseSceneNodeId,
        label: `FlexibleText ${ordinal}`,
        kind: "flexibleText",
        layerId,
        binding: {
          mode: "literal",
          value: `FlexibleText ${ordinal}`,
        },
        containerStyleKey,
        wrapperStyleKey,
        textStyleKey,
        optionsKey,
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        highlightTarget: `sceneNode:${baseSceneNodeId}`,
        containerClassName: "absolute flex justify-center items-center",
        textClassName: "text-center",
        visibilityMode: "always",
      },
      layerNode: {
        id: layerId,
        label: `FlexibleText ${ordinal}`,
        kind: "component",
        icon: "text",
        target: `sceneNode:${baseSceneNodeId}`,
        sectionKey: containerStyleKey,
        visibilityMode: "always",
      },
      dynamicSceneLayoutPatch: {
        [containerStyleKey]: {
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: 96,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        },
        [wrapperStyleKey]: {
          justifyContent: "center",
          alignItems: "center",
        },
        [textStyleKey]: {
          fontSize: 42,
          lineHeight: 1.1,
          textAlign: "center",
          fontWeight: 700,
        },
        [optionsKey]: {
          maxFontSize: 56,
          multiline: true,
        },
      },
    };
  };

  const addSceneSiblingNode = ({
    anchorNodeId,
    kind,
  }: {
    anchorNodeId: string;
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
  }) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const anchorContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId: anchorNodeId,
      });
      if (!anchorContext) return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;
      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: anchorContext.parentId,
          updater: (siblings) => {
            const nextSiblings = [...siblings];
            nextSiblings.splice(anchorContext.index + 1, 0, sceneNode);
            return nextSiblings;
          },
        });
      if (!sceneUpdated) return prev;

      const anchorLayerId = anchorContext.node.layerId;
      let nextLayers = prev.structure.layers;
      if (anchorLayerId) {
        const layerContext = v2_findLayerNodeContextById({
          nodes: prev.structure.layers,
          nodeId: anchorLayerId,
        });
        if (layerContext) {
          const { nodes: updatedLayers } = v2_updateLayerNodeListByParentId({
            nodes: prev.structure.layers,
            parentId: layerContext.parentId,
            updater: (siblings) => {
              const nextSiblings = [...siblings];
              nextSiblings.splice(layerContext.index + 1, 0, layerNode);
              return nextSiblings;
            },
          });
          nextLayers = updatedLayers;
        }
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            ...dynamicSceneLayoutPatch,
          },
        },
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const addSceneChildNode = ({
    parentNodeId,
    kind,
  }: {
    parentNodeId: string;
    kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
  }) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const parentContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId: parentNodeId,
      });
      if (!parentContext || parentContext.node.kind !== "group") return prev;

      const payload = createCustomSceneNodePayload(prev, kind);
      const { sceneNode, layerNode, dynamicSceneLayoutPatch } = payload;
      nextFocusLayerId = layerNode.id;
      nextFocusTarget = layerNode.target ?? null;
      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: parentNodeId,
          updater: (siblings) => [...siblings, sceneNode],
        });
      if (!sceneUpdated) return prev;

      const parentLayerId = parentContext.node.layerId ?? null;
      const { nodes: nextLayers } = v2_updateLayerNodeListByParentId({
        nodes: prev.structure.layers,
        parentId: parentLayerId,
        updater: (siblings) => [...siblings, layerNode],
      });

      return {
        ...prev,
        layout: {
          ...prev.layout,
          scene: {
            ...prev.layout.scene,
            ...dynamicSceneLayoutPatch,
          },
        },
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const moveSceneNode = ({
    nodeId,
    direction,
  }: {
    nodeId: string;
    direction: "up" | "down";
  }) => {
    safeUpdateConfig((prev) => {
      const context = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId,
      });
      if (!context) return prev;
      const targetIndex = direction === "up" ? context.index - 1 : context.index + 1;

      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: context.parentId,
          updater: (siblings) => {
            if (targetIndex < 0 || targetIndex >= siblings.length) return siblings;
            const nextSiblings = [...siblings];
            const [moved] = nextSiblings.splice(context.index, 1);
            if (!moved) return siblings;
            nextSiblings.splice(targetIndex, 0, moved);
            return nextSiblings;
          },
        });
      if (!sceneUpdated) return prev;

      const layerId = context.node.layerId;
      if (!layerId) {
        return {
          ...prev,
          structure: {
            ...prev.structure,
            sceneNodes: nextSceneNodes,
          },
        };
      }

      const layerContext = v2_findLayerNodeContextById({
        nodes: prev.structure.layers,
        nodeId: layerId,
      });
      if (!layerContext) {
        return {
          ...prev,
          structure: {
            ...prev.structure,
            sceneNodes: nextSceneNodes,
          },
        };
      }

      const { nodes: nextLayers } = v2_updateLayerNodeListByParentId({
        nodes: prev.structure.layers,
        parentId: layerContext.parentId,
        updater: (siblings) => {
          const nextSiblings = [...siblings];
          const currentIndex = nextSiblings.findIndex((item) => item.id === layerId);
          if (currentIndex < 0) return siblings;
          const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0 || nextIndex >= nextSiblings.length) return siblings;
          const [moved] = nextSiblings.splice(currentIndex, 1);
          if (!moved) return siblings;
          nextSiblings.splice(nextIndex, 0, moved);
          return nextSiblings;
        },
      });

      return {
        ...prev,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
      };
    });
  };

  const removeSceneNode = (nodeId: string) => {
    let nextFocusLayerId: string | null = null;
    let nextFocusTarget: V2TemplateHighlightTarget | null = null;

    safeUpdateConfig((prev) => {
      const targetContext = v2_findSceneNodeContextById({
        nodes: prev.structure.sceneNodes,
        nodeId,
      });
      if (!targetContext) return prev;
      if (!isSceneCustomNode(targetContext.node.id)) return prev;

      if (targetContext.parentId) {
        const parentSceneContext = v2_findSceneNodeContextById({
          nodes: prev.structure.sceneNodes,
          nodeId: targetContext.parentId,
        });
        if (parentSceneContext?.node.layerId) {
          const parentLayerContext = v2_findLayerNodeContextById({
            nodes: prev.structure.layers,
            nodeId: parentSceneContext.node.layerId,
          });
          if (parentLayerContext) {
            nextFocusLayerId = parentLayerContext.node.id;
            nextFocusTarget = parentLayerContext.node.target ?? null;
          }
        }
      } else if (prev.structure.layers.length > 0) {
        nextFocusLayerId = prev.structure.layers[0].id;
        nextFocusTarget = prev.structure.layers[0].target ?? null;
      }

      const { nodes: nextSceneNodes, updated: sceneUpdated } =
        v2_updateSceneNodeListByParentId({
          nodes: prev.structure.sceneNodes,
          parentId: targetContext.parentId,
          updater: (siblings) =>
            siblings.filter((sibling) => sibling.id !== targetContext.node.id),
        });
      if (!sceneUpdated) return prev;

      const styleKeysToDelete = v2_collectSceneNodeStyleKeys(targetContext.node);
      const nextSceneLayout = {
        ...prev.layout.scene,
      };
      styleKeysToDelete.forEach((styleKey) => {
        if (styleKey in nextSceneLayout) {
          delete nextSceneLayout[styleKey];
        }
      });

      const targetLayerId = targetContext.node.layerId;
      const nextLayers = targetLayerId
        ? (() => {
            const layerContext = v2_findLayerNodeContextById({
              nodes: prev.structure.layers,
              nodeId: targetLayerId,
            });
            if (!layerContext) return prev.structure.layers;
            return v2_updateLayerNodeListByParentId({
              nodes: prev.structure.layers,
              parentId: layerContext.parentId,
              updater: (siblings) =>
                siblings.filter((sibling) => sibling.id !== targetLayerId),
            }).nodes;
          })()
        : prev.structure.layers;

      return {
        ...prev,
        layout: {
          ...prev.layout,
          scene: nextSceneLayout,
        },
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
          layers: nextLayers,
        },
      };
    });

    if (nextFocusLayerId) {
      setSelectedPropertiesLayerId(nextFocusLayerId);
    }
    if (nextFocusTarget) {
      setSelectedPropertiesTarget(nextFocusTarget);
      setActiveHighlightTarget(nextFocusTarget);
    }
  };

  const updateSceneTextNodeBinding = (
    nodeId: string,
    binding: V2TemplateSceneTextNode["binding"]
  ) => {
    safeUpdateConfig((prev) => {
      const { nodes: nextSceneNodes, updated } = v2_updateSceneTextNodeById({
        nodes: prev.structure.sceneNodes,
        nodeId,
        updater: (node) => ({
          ...node,
          binding,
        }),
      });

      if (!updated) return prev;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          sceneNodes: nextSceneNodes,
        },
      };
    });
  };

  const updateSceneTextNodeVisibilityMode = (
    nodeId: string,
    visibilityMode: V2TemplateVisibilityMode
  ) => {
    updateSceneNodeVisibilityMode(nodeId, visibilityMode);
  };

  const updateSceneTextNodeMeta = ({
    nodeId,
    label,
    colorKey,
    fontKey,
  }: {
    nodeId: string;
    label?: string;
    colorKey?: V2TemplateSceneTextNode["colorKey"];
    fontKey?: V2TemplateSceneTextNode["fontKey"];
  }) => {
    safeUpdateConfig((prev) => {
      const nextLabel = typeof label === "string" ? label.trim() : undefined;
      const nextColorKey =
        typeof colorKey === "string" && v2_TEMPLATE_COLOR_KEYS.includes(colorKey)
          ? colorKey
          : undefined;
      const nextFontKey =
        typeof fontKey === "string" && v2_TEMPLATE_COLOR_KEYS.includes(fontKey)
          ? fontKey
          : undefined;

      const { nodes: nextSceneNodes, updated, matchedNode } =
        v2_updateSceneTextNodeById({
          nodes: prev.structure.sceneNodes,
          nodeId,
          updater: (node) => ({
            ...node,
            ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
            ...(nextColorKey ? { colorKey: nextColorKey } : {}),
            ...(nextFontKey ? { fontKey: nextFontKey } : {}),
          }),
        });

      if (!updated) return prev;

      const nextLayers =
        nextLabel && nextLabel.length > 0 && matchedNode?.layerId
          ? v2_updateLayerNodeLabelById(
              prev.structure.layers,
              matchedNode.layerId,
              nextLabel
            )
          : prev.structure.layers;

      return {
        ...prev,
        structure: {
          ...prev.structure,
          layers: nextLayers,
          sceneNodes: nextSceneNodes,
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

  const createFieldForSceneNodeBinding = (node: V2TemplateSceneTextNode) => {
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

    updateSceneTextNodeBinding(node.id, {
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
    colorKey,
    fontKey,
  }: {
    nodeId: string;
    label?: string;
    binding?: string;
    colorKey?: V2TemplateCardNode["colorKey"];
    fontKey?: V2TemplateCardNode["fontKey"];
  }) => {
    safeUpdateConfig((prev) => {
      const prevNode = prev.structure.card.nodes[nodeId];
      if (!prevNode) return prev;

      const nextLabel = typeof label === "string" ? label.trim() : undefined;
      const nextBinding =
        typeof binding === "string" ? binding.trim() : undefined;
      const nextColorKey =
        typeof colorKey === "string" && v2_TEMPLATE_COLOR_KEYS.includes(colorKey)
          ? colorKey
          : undefined;
      const nextFontKey =
        typeof fontKey === "string" && v2_TEMPLATE_COLOR_KEYS.includes(fontKey)
          ? fontKey
          : undefined;

      const nextNode: V2TemplateCardNode = {
        ...prevNode,
        ...(nextLabel && nextLabel.length > 0 ? { label: nextLabel } : {}),
        ...(nextBinding && nextBinding.length > 0
          ? { binding: v2_createBindingRefFromLegacyInput(nextBinding) }
          : {}),
        ...(nextColorKey ? { colorKey: nextColorKey } : {}),
        ...(nextFontKey ? { fontKey: nextFontKey } : {}),
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
    safeUpdateConfig((prev) => {
      const currentMode = prev.structure.card.instanceMode ?? "component";
      if (currentMode === instanceMode) return prev;

      if (currentMode === "detached" && instanceMode === "component") {
        window.alert(
          "개별 인스턴스로 분해한 Card 컴포넌트는 다시 공통 컴포넌트 모드로 되돌릴 수 없습니다."
        );
        return prev;
      }

      if (currentMode === "component" && instanceMode === "detached") {
        const confirmed = window.confirm(
          "Card 컴포넌트를 개별 인스턴스로 분해하면 되돌릴 수 없습니다. 계속할까요?"
        );
        if (!confirmed) return prev;
      }

      return {
        ...prev,
        structure: {
          ...prev.structure,
          card: {
            ...prev.structure.card,
            instanceMode,
          },
        },
      };
    });
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
    const knownSection = v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS) ? section : null;
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

          const GroupIcon = v2_getBoilerplateGroupIcon(group.id);
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

          const GroupIcon = v2_getBoilerplateGroupIcon(group.id);

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
    <TemplateSchemaTab
      formSchemaError={formSchemaError}
      diagnostics={formSchemaDiagnostics}
      fields={renderConfig.formSchema.fields}
      computedKeys={v2_BINDING_COMPUTED_OPTIONS}
      scopeOptions={v2_FORM_FIELD_SCOPE_OPTIONS}
      typeOptions={v2_FORM_FIELD_TYPE_OPTIONS}
      onAppendField={() =>
        appendFormField({
          key: "",
          scope: "entry",
          type: "text",
          placeholder: "새 필드",
        })
      }
      onRemoveField={removeFormFieldAt}
      onUpdateField={updateFormFieldAt}
    />
  );

  const renderStyleTab = () => (
    <TemplateStyleTab
      inspectorRef={inspectorTabRef}
      onMouseLeave={clearSectionHoverHighlight}
      onBlurOutside={() => setActiveHighlightTarget(null)}
    >
      <TemplateStyleThemeSettings
        renderConfig={renderConfig}
        colorKeys={v2_TEMPLATE_COLOR_KEYS}
        baseFontTokenKeys={v2_BASE_FONT_TOKEN_KEYS}
        fontDisplayOptions={v2_FONT_DISPLAY_OPTIONS}
        fontStyleOptions={v2_FONT_STYLE_OPTIONS}
        fontFormatOptions={v2_FONT_FORMAT_OPTIONS}
        fontRegistryKeys={fontRegistryKeys}
        fontTokenOptions={fontTokenOptions}
        onOpenBoilerplateSettings={() => setIsBoilerplateSettingsOpen(true)}
        onUpdateColor={updateColor}
        onUpdateBaseFontToken={updateBaseFontToken}
        onUpdateComponentFont={updateComponentFont}
        onAddFontRegistryItem={addFontRegistryItem}
        onRemoveFontRegistryItem={removeFontRegistryItem}
        onUpdateFontRegistryMeta={updateFontRegistryMeta}
        onAddFontFace={addFontFace}
        onUpdateFontFace={updateFontFace}
        onRemoveFontFace={removeFontFace}
        parseFontWeightInput={parseFontWeightInput}
      />
    </TemplateStyleTab>
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
    const maxFontSizeCandidate = Number(options?.maxFontSize);
    const maxFontSize =
      Number.isFinite(maxFontSizeCandidate) && maxFontSizeCandidate > 0
        ? maxFontSizeCandidate
        : maxFontSizeFallback;
    const multiline =
      typeof options?.multiline === "boolean"
        ? options.multiline
        : options?.multiline === undefined
          ? true
          : String(options.multiline).toLowerCase() === "true";

    return (
      <TemplateCardAutoResizeOptions
        maxFontSize={maxFontSize}
        multiline={multiline}
        onHoverContainer={() => setSectionHoverHighlight(containerSection)}
        onLeaveContainer={clearSectionHoverHighlight}
        onActivateContainer={() => setSectionActiveHighlight(containerSection)}
        onChangeMaxFontSize={(value) => {
          updateCardOptions(node.optionsKey!, { maxFontSize: value });
          if (v2_isEntryFieldBindingKey(node.binding, "mainTitle")) {
            updateMaxFontSize("MAIN_TITLE", value);
          }
          if (v2_isEntryFieldBindingKey(node.binding, "subTitle")) {
            updateMaxFontSize("SUB_TITLE", value);
          }
        }}
        onChangeMultiline={(value) =>
          updateCardOptions(node.optionsKey!, {
            multiline: value,
          })
        }
      />
    );
  };

  const renderCardNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateCardNode
  ) => {
    const containerSection = v2_resolveCardStyleSection(
      node.containerStyleKey,
      section,
      v2_STYLE_KEY_TO_SECTION_KEY_MAP
    );
    const textSection = node.textStyleKey
      ? v2_resolveCardStyleSection(
          node.textStyleKey,
          containerSection,
          v2_STYLE_KEY_TO_SECTION_KEY_MAP
        )
      : null;
    const wrapperSection = node.wrapperStyleKey
      ? v2_resolveCardStyleSection(
          node.wrapperStyleKey,
          containerSection,
          v2_STYLE_KEY_TO_SECTION_KEY_MAP
        )
      : null;
    const alignmentWrapperSection = wrapperSection ?? containerSection;
    const hasAutoResizeAlignment =
      node.kind === "flexibleText" && textSection !== null;
    const isRemovable = !v2_FIXED_CARD_NODE_IDS.has(node.id);
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBinding = v2_getNodeFieldBinding(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

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
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">컬러 테마 토큰</label>
          <select
            value={node.colorKey}
            onChange={(event) =>
              updateCardNodeMeta({
                nodeId: node.id,
                colorKey: event.target.value as V2TemplateCardNode["colorKey"],
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_TEMPLATE_COLOR_KEYS.map((key) => (
              <option key={`color-${key}`} value={key}>
                {key}
              </option>
            ))}
          </select>
          <label className="text-xs text-gray-400">폰트 테마 토큰</label>
          <select
            value={node.fontKey}
            onChange={(event) =>
              updateCardNodeMeta({
                nodeId: node.id,
                fontKey: event.target.value as V2TemplateCardNode["fontKey"],
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_TEMPLATE_COLOR_KEYS.map((key) => (
              <option key={`font-${key}`} value={key}>
                {key}
              </option>
            ))}
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
            <option value="component" disabled={instanceMode === "detached"}>
              공통 컴포넌트
            </option>
            <option value="detached">개별 인스턴스</option>
          </select>
        </div>
        {instanceMode === "detached" ? (
          <p className="text-[11px] text-amber-300">
            개별 인스턴스 분해 상태입니다. 이 모드는 되돌릴 수 없습니다.
          </p>
        ) : null}

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

  const renderSceneTextNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateSceneTextNode
  ) => {
    const containerSection = v2_resolveCardStyleSection(
      node.containerStyleKey,
      section,
      v2_STYLE_KEY_TO_SECTION_KEY_MAP
    );
    const textSection = node.textStyleKey
      ? v2_resolveCardStyleSection(
          node.textStyleKey,
          containerSection,
          v2_STYLE_KEY_TO_SECTION_KEY_MAP
        )
      : null;
    const wrapperSection = node.wrapperStyleKey
      ? v2_resolveCardStyleSection(
          node.wrapperStyleKey,
          containerSection,
          v2_STYLE_KEY_TO_SECTION_KEY_MAP
        )
      : null;
    const alignmentWrapperSection = wrapperSection ?? containerSection;
    const hasAutoResizeAlignment =
      node.kind === "flexibleText" && textSection !== null;
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBinding = v2_getNodeFieldBinding(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">Scene / {node.label}</h4>
        {renderSceneNodeStructureControls({ node, allowChildren: false })}
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) =>
              updateSceneTextNodeMeta({
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
                updateSceneTextNodeBinding(node.id, {
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
                  updateSceneTextNodeBinding(node.id, {
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
                updateSceneTextNodeBinding(node.id, {
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
              <option value={`field:${node.binding.scope}:${node.binding.key}`}>
                field / {node.binding.scope}.{node.binding.key} (missing)
              </option>
            ) : null}
            <option value="literal">literal (직접 텍스트)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">컬러 테마 토큰</label>
          <select
            value={node.colorKey}
            onChange={(event) =>
              updateSceneTextNodeMeta({
                nodeId: node.id,
                colorKey: event.target.value as V2TemplateSceneTextNode["colorKey"],
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_TEMPLATE_COLOR_KEYS.map((key) => (
              <option key={`scene-color-${key}`} value={key}>
                {key}
              </option>
            ))}
          </select>
          <label className="text-xs text-gray-400">폰트 테마 토큰</label>
          <select
            value={node.fontKey}
            onChange={(event) =>
              updateSceneTextNodeMeta({
                nodeId: node.id,
                fontKey: event.target.value as V2TemplateSceneTextNode["fontKey"],
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_TEMPLATE_COLOR_KEYS.map((key) => (
              <option key={`scene-font-${key}`} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>
        {node.binding.mode === "literal" ? (
          <div className="grid grid-cols-2 gap-2 items-center">
            <label className="text-xs text-gray-400">literal 값</label>
            <input
              value={node.binding.value}
              onChange={(event) =>
                updateSceneTextNodeBinding(node.id, {
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
            onClick={() => createFieldForSceneNodeBinding(node)}
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
              updateSceneTextNodeVisibilityMode(
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
      </div>
    );
  };

  const renderSceneNodeStructureControls = ({
    node,
    allowChildren,
  }: {
    node:
      | V2TemplateSceneTextNode
      | V2TemplateSceneAssetNode
      | V2TemplateSceneGroupNode
      | V2TemplateSceneCardCollectionNode;
    allowChildren: boolean;
  }) => {
    const canDelete = isSceneCustomNode(node.id);
    const addButtons: Array<{
      label: string;
      kind: "text" | "flexibleText" | "asset" | "group" | "cardCollection";
    }> = [
      { label: "+ Text", kind: "text" },
      { label: "+ Flexible", kind: "flexibleText" },
      { label: "+ Asset", kind: "asset" },
      { label: "+ Group", kind: "group" },
      { label: "+ Cards", kind: "cardCollection" },
    ];

    return (
      <div className="rounded border border-[#3a3d44] bg-[#141821] p-2 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Structure
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => moveSceneNode({ nodeId: node.id, direction: "up" })}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100 hover:bg-[#323640]"
          >
            위로
          </button>
          <button
            type="button"
            onClick={() => moveSceneNode({ nodeId: node.id, direction: "down" })}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100 hover:bg-[#323640]"
          >
            아래로
          </button>
          <button
            type="button"
            onClick={() => removeSceneNode(node.id)}
            disabled={!canDelete}
            className={`rounded border px-2 py-1.5 text-xs ${
              canDelete
                ? "border-red-400/40 text-red-300 hover:bg-red-500/10"
                : "border-[#3a3d44] text-gray-500 cursor-not-allowed"
            }`}
          >
            삭제
          </button>
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-500">동일 레벨 추가</p>
          <div className="grid grid-cols-3 gap-2">
            {addButtons.map((button) => (
              <button
                key={`${node.id}-sibling-${button.kind}`}
                type="button"
                onClick={() =>
                  addSceneSiblingNode({
                    anchorNodeId: node.id,
                    kind: button.kind,
                  })
                }
                className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#323640]"
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
        {allowChildren ? (
          <div className="space-y-1.5">
            <p className="text-[11px] text-gray-500">하위 추가</p>
            <div className="grid grid-cols-3 gap-2">
              {addButtons.map((button) => (
                <button
                  key={`${node.id}-child-${button.kind}`}
                  type="button"
                  onClick={() =>
                    addSceneChildNode({
                      parentNodeId: node.id,
                      kind: button.kind,
                    })
                  }
                  className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#323640]"
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderSceneAssetNodeProperties = (
    node: V2TemplateSceneAssetNode,
    section: V2StyleSectionId | null
  ) => {
    const styleSection = section ?? v2_parseStyleSectionKey(node.styleKey);

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">Scene Asset / {node.label}</h4>
        {renderSceneNodeStructureControls({ node, allowChildren: false })}
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) => updateSceneNodeLabel(node.id, event.target.value)}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-400">에셋 키</label>
          <select
            value={node.assetKey}
            onChange={(event) =>
              updateSceneAssetNodeMeta({
                nodeId: node.id,
                assetKey: event.target.value as keyof V2TemplateAssetMap,
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_ASSET_KEYS.map((assetKey) => (
              <option key={`scene-asset-key-${assetKey}`} value={assetKey}>
                {v2_ASSET_LABELS[assetKey]}
              </option>
            ))}
          </select>
          <label className="text-xs text-gray-400">Fit</label>
          <select
            value={node.fit ?? "cover"}
            onChange={(event) =>
              updateSceneAssetNodeMeta({
                nodeId: node.id,
                fit: event.target.value as V2TemplateSceneAssetNode["fit"],
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            <option value="cover">cover</option>
            <option value="contain">contain</option>
            <option value="fill">fill</option>
          </select>
          <label className="text-xs text-gray-400">표시 조건</label>
          <select
            value={node.visibilityMode ?? "always"}
            onChange={(event) =>
              updateSceneNodeVisibilityMode(
                node.id,
                event.target.value as V2TemplateVisibilityMode
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
              <option key={`scene-asset-visible-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">alt</label>
          <input
            value={node.alt ?? ""}
            onChange={(event) =>
              updateSceneAssetNodeMeta({
                nodeId: node.id,
                alt: event.target.value,
              })
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
            placeholder="이미지 alt 텍스트"
          />
          <label className="text-xs text-gray-400">style key</label>
          <div className="px-2 py-2 rounded border border-[#3a3d44] bg-[#121418] text-xs text-gray-300">
            {node.styleKey ?? "-"}
          </div>
        </div>
        {styleSection ? (
          renderStyleSectionEditor({
            title: "asset style",
            section: styleSection,
          })
        ) : (
          <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
            이 에셋 노드는 연결된 style section이 없습니다.
          </div>
        )}
      </div>
    );
  };

  const renderSceneGroupNodeProperties = (node: V2TemplateSceneGroupNode) => {
    const childCount = node.children.length;
    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">Scene Group / {node.label}</h4>
        {renderSceneNodeStructureControls({ node, allowChildren: true })}
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) => updateSceneNodeLabel(node.id, event.target.value)}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-400">표시 조건</label>
          <select
            value={node.visibilityMode ?? "always"}
            onChange={(event) =>
              updateSceneNodeVisibilityMode(
                node.id,
                event.target.value as V2TemplateVisibilityMode
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
              <option key={`scene-group-visible-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
          하위 노드: {childCount}개
        </div>
      </div>
    );
  };

  const renderSceneCardCollectionProperties = (
    node: V2TemplateSceneCardCollectionNode,
    section: V2StyleSectionId | null
  ) => {
    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">
          Scene Card Collection / {node.label}
        </h4>
        {renderSceneNodeStructureControls({ node, allowChildren: false })}
        <div className="grid grid-cols-2 gap-2 items-center">
          <label className="text-xs text-gray-400">오브젝트 이름</label>
          <input
            value={node.label}
            onChange={(event) => updateSceneNodeLabel(node.id, event.target.value)}
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-400">표시 조건</label>
          <select
            value={node.visibilityMode ?? "always"}
            onChange={(event) =>
              updateSceneNodeVisibilityMode(
                node.id,
                event.target.value as V2TemplateVisibilityMode
              )
            }
            className="px-2 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
          >
            {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
              <option key={`scene-card-collection-visible-${option.value}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
          source: {node.source}
        </div>
        {section ? renderStyleSectionEditor({ title: "layout style", section }) : null}
      </div>
    );
  };

  const renderSimplePropertiesSection = (section: V2StyleSectionId) => {
    const knownSection = v2_isKnownStyleSectionKey(section, v2_STYLE_SECTION_LABELS) ? section : null;
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
            : section === "profileTextRootStyle"
              ? "root style"
              : section === "profileTextWrapperStyle"
                ? "wrapper style"
                : section === "profileTextStyle"
                  ? "text style"
                  : section === "profileTextArtistImageStyle"
                    ? "artist image style"
            : "style";

    return (
      <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 space-y-3">
        <h4 className="font-semibold text-sm text-gray-200">{heading}</h4>
        {section === "cardContainer" ? (
          <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
            바인딩 키는 카드 컨테이너가 아니라 하위 텍스트 오브젝트에서 설정합니다.
            {bindableNodeLabels.length > 0
              ? ` (${bindableNodeLabels.join(", ")})`
              : ""}
          </div>
        ) : null}
        {renderCardComponentProperties(section)}
        {renderStyleSectionEditor({ title: styleTitle, section })}
      </div>
    );
  };

  const renderPropertiesPanels = () => {
    const selectedLayerNode = selectedPropertiesLayerNode;
    if (!selectedLayerNode) return null;

    const section = selectedPropertiesSection;
    const cardNode = cardNodeByLayerId.get(selectedLayerNode.id);
    if (cardNode) {
      return renderCardNodeProperties(section ?? "cardContainer", cardNode);
    }
    const sceneNode = sceneNodeByLayerId.get(selectedLayerNode.id);
    if (sceneNode) {
      if (sceneNode.kind === "text" || sceneNode.kind === "flexibleText") {
        return renderSceneTextNodeProperties(
          section ?? sceneNode.containerStyleKey,
          sceneNode
        );
      }
      if (sceneNode.kind === "asset") {
        return renderSceneAssetNodeProperties(sceneNode, section);
      }
      if (sceneNode.kind === "group") {
        return renderSceneGroupNodeProperties(sceneNode);
      }
      if (sceneNode.kind === "cardCollection") {
        return renderSceneCardCollectionProperties(sceneNode, section);
      }
    }

    if (!section) {
      return (
        <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 text-xs text-gray-400">
          선택한 레이어에는 스타일 섹션이 연결되어 있지 않습니다.
        </div>
      );
    }

    return renderSimplePropertiesSection(section);
  };

  const renderPropertiesTab = () => (
    <TemplatePropertiesTab
      inspectorRef={inspectorTabRef}
      selectedLabel={selectedPropertiesLabel}
      onMouseLeave={clearSectionHoverHighlight}
      onBlurOutside={() => setActiveHighlightTarget(null)}
    >
      {renderPropertiesPanels()}
    </TemplatePropertiesTab>
  );

  const renderAssetsTab = () => (
    <TemplateAssetsTab
      assetTheme={assetTheme}
      themeOptions={themeOptions}
      renderConfig={renderConfig}
      assetKeys={v2_ASSET_KEYS}
      assetLabels={v2_ASSET_LABELS}
      setAssetTheme={setAssetTheme}
      onUploadFile={handleAssetFileUpload}
      onResetAsset={(key, theme) => updateAssetUrl(key, theme, "", null)}
    />
  );

  const renderDataTab = () => (
    <TemplateDataTab
      timeValue={(firstEntry?.time as string) || "09:00"}
      mainTitleValue={(firstEntry?.mainTitle as string) || ""}
      subTitleValue={(firstEntry?.subTitle as string) || ""}
      isGuerrilla={Boolean(firstEntry?.isGuerrilla)}
      isOffline={Boolean(firstCard?.isOffline)}
      onChangeTime={(value) => updateFirstEntryField("time", value)}
      onChangeMainTitle={(value) => updateFirstEntryField("mainTitle", value)}
      onChangeSubTitle={(value) => updateFirstEntryField("subTitle", value)}
      onToggleGuerrilla={(value) => updateFirstEntryField("isGuerrilla", value)}
      onToggleOffline={updateFirstDayOffline}
    />
  );

  const renderExportTab = () => (
    <TemplateExportTab
      copyState={copyState}
      onCopyJson={handleCopyJson}
      onDownloadPreview={() =>
        downloadImage(
          renderConfig.templateSize.width,
          renderConfig.templateSize.height
        )
      }
      onResetData={resetData}
    />
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
        <TemplateBuilderTabs
          tabs={v2_BUILDER_TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
        <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
          {renderActiveTab()}
        </div>
      </div>
      {renderBoilerplateSettingsModal()}
    </div>
  );
};

export default V2TemplateBuilderForm;
