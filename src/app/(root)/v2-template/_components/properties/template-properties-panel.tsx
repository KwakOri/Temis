import React, { useMemo, useRef, useState } from "react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  useTemplateEditorActions,
  useTemplateEditorData,
} from "@/contexts/v2/template-editor-ui-context";
import {
  V2TemplateAssetMap,
  V2TemplateCardNode,
  V2TemplateCardNodeBinding,
  V2TemplateFieldScope,
  V2TemplateFontFaceSource,
  V2TemplateFontRegistryItem,
  V2TemplateFormField,
  V2TemplateRenderConfig,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import { v2_bindingRefToLegacyInput } from "@/utils/time-table/template-render-config";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import { v2_BOILERPLATE_SELECT_OPTIONS } from "./model/boilerplate-presets";
import {
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
  v2_collectStructureTargetSectionMaps,
  v2_updateSceneTextNodeById,
} from "./model/structure-utils";
import {
  V2NodeNewFieldDraft,
} from "./model/binding-utils";
import {
  v2_createStyleKeyToSectionKeyMap,
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
  v2_resolveCardStyleSection,
} from "./model/style-section-utils";
import TemplateBoilerplateSectionEditor from "./components/template-boilerplate-section-editor";
import TemplateBoilerplateSettingsModal from "./components/template-boilerplate-settings-modal";
import TemplateAutoResizeAlignmentEditor from "./components/template-auto-resize-alignment-editor";
import TemplateSelectedPropertiesPanelRouter from "./components/template-selected-properties-panel-router";
import TemplateStyleSectionEditor from "./components/template-style-section-editor";
import TemplateAssetsTab from "./panels/template-assets-tab";
import TemplateBuilderTabContentRouter, {
  type V2BuilderTabId,
} from "./panels/template-builder-tab-content-router";
import TemplateBuilderTabs from "./panels/template-builder-tabs";
import TemplateCanvasTab from "./panels/template-canvas-tab";
import TemplateDataTab from "./panels/template-data-tab";
import TemplateExportTab from "./panels/template-export-tab";
import TemplatePropertiesTab from "./panels/template-properties-tab";
import TemplateSchemaTab from "./panels/template-schema-tab";
import TemplateStyleTab from "./panels/template-style-tab";
import TemplateStyleThemeSettings from "./panels/template-style-theme-settings";
import useTemplateStyleEditorActions from "./hooks/use-template-style-editor-actions";
import useTemplateBoundTextNodePropertyPanels from "./hooks/use-template-bound-text-node-property-panels";
import useTemplateBoilerplateActions from "./hooks/use-template-boilerplate-actions";
import useTemplateBoilerplateUiEffects from "./hooks/use-template-boilerplate-ui-effects";
import useTemplateCardNodeActions from "./hooks/use-template-card-node-actions";
import useTemplateFormSchemaActions from "./hooks/use-template-form-schema-actions";
import useTemplatePropertiesFocusEffects from "./hooks/use-template-properties-focus-effects";
import useTemplateSceneNodeActions from "./hooks/use-template-scene-node-actions";
import useTemplateSceneNodePropertyPanels from "./hooks/use-template-scene-node-property-panels";
import useTemplateSimplePropertiesPanel from "./hooks/use-template-simple-properties-panel";
import useTemplateThemeAssetActions from "./hooks/use-template-theme-asset-actions";

const v2_BUILDER_TABS: Array<{ id: V2BuilderTabId; label: string }> = [
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
  profileBgByTheme: "프로필 더미 이미지(편집용)",
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
  const { preferProfileDummyImage, updatePreferProfileDummyImage } =
    useTemplateEditorData();

  const [activeTab, setActiveTab] = useState<V2BuilderTabId>("canvas");
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
  const [formSchemaError, setFormSchemaError] = useState<string | null>(null);
  const [newFieldDraftByNodeId, setNewFieldDraftByNodeId] = useState<
    Record<string, V2NodeNewFieldDraft>
  >({});
  const inspectorTabRef = useRef<HTMLDivElement | null>(null);
  const [selectedPropertiesTarget, setSelectedPropertiesTarget] =
    useState<V2TemplateHighlightTarget>("grid");
  const [selectedPropertiesLayerId, setSelectedPropertiesLayerId] =
    useState<string>("grid");
  const runtimeCardStructure = useMemo(
    () => v2_getRuntimeCardStructure(renderConfig),
    [renderConfig]
  );
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const structurePropertiesMaps = useMemo(
    () => v2_collectStructureTargetSectionMaps(runtimeLayerTree),
    [runtimeLayerTree]
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
    Object.values(runtimeCardStructure.nodes).forEach((node) => {
      map.set(node.layerId, node);
    });
    return map;
  }, [runtimeCardStructure.nodes]);
  const sceneNodeByLayerId = useMemo(
    () => v2_collectSceneNodesByLayerId(runtimeSceneNodes),
    [runtimeSceneNodes]
  );
  const sceneStyleSectionKeySet = useMemo(() => {
    const next = new Set<string>();
    runtimeSceneNodes.forEach((node) => {
      v2_collectSceneNodeStyleKeys(node).forEach((key) => next.add(key));
    });
    return next;
  }, [runtimeSceneNodes]);
  const bindableCardNodeLabels = useMemo(() => {
    return runtimeCardStructure.nodeOrder
      .map((nodeId) => runtimeCardStructure.nodes[nodeId])
      .filter((node): node is V2TemplateCardNode => Boolean(node))
      .map((node) => node.label);
  }, [runtimeCardStructure.nodeOrder, runtimeCardStructure.nodes]);
  const bindableSceneTextNodeLabels = useMemo(() => {
    return v2_collectSceneTextNodes(runtimeSceneNodes).map((node) => node.label);
  }, [runtimeSceneNodes]);
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
      ...Object.values(runtimeCardStructure.nodes).map((node) => ({
        nodeLabel: node.label,
        binding: node.binding,
      })),
      ...v2_collectSceneTextNodes(runtimeSceneNodes).map((node) => ({
        nodeLabel: node.label,
        binding: node.binding,
      })),
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
    runtimeCardStructure.nodes,
    runtimeSceneNodes,
  ]);

  useTemplateBoilerplateUiEffects({
    storageKey: v2_BOILERPLATE_STORAGE_KEY,
    styleSectionLabels: v2_STYLE_SECTION_LABELS,
    boilerplateConfig,
    setBoilerplateConfig,
    isBoilerplateSettingsOpen,
    setIsBoilerplateSettingsOpen,
  });

  useTemplatePropertiesFocusEffects({
    activeTab,
    inspectorTabRef,
    setHoverHighlightTarget,
    setActiveHighlightTarget,
    focusLayerId,
    focusLayerNonce,
    focusStyleSection,
    focusStyleSectionNonce,
    layerIdToNode: structurePropertiesMaps.layerIdToNode,
    sectionToLayerId: structurePropertiesMaps.sectionToLayerId,
    sectionToTarget: structurePropertiesMaps.sectionToTarget,
    styleSectionLabels: v2_STYLE_SECTION_LABELS,
    styleSectionHighlightTargetMap: v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
    activatePropertiesTab: () => setActiveTab("properties"),
  });

  const safeUpdateConfig = (
    updater: (prev: typeof renderConfig) => typeof renderConfig
  ) => {
    if (!setRenderConfig) return;
    setRenderConfig((prev) => updater(prev));
  };

  const {
    getStyleSectionMap,
    addStyleProperty,
    removeStyleProperty,
    updateStylePropertyValue,
    updateGridLayoutMode,
    updateFlex42Align,
    updateFlex42ThreeRow,
    pickGridEmptySlot,
    setSectionHoverHighlight,
    clearSectionHoverHighlight,
    setSectionActiveHighlight,
    isStyleGroupOpen,
    toggleStyleGroupOpen,
    applyStyleExtensionGroupDefaults,
    getHorizontalAlignFromStyle,
    getVerticalAlignFromStyle,
    updateAutoResizeHorizontalAlign,
    updateAutoResizeVerticalAlign,
  } = useTemplateStyleEditorActions({
    renderConfig,
    safeUpdateConfig,
    sceneStyleSectionKeySet,
    structureSectionToTarget: structurePropertiesMaps.sectionToTarget,
    setHoverHighlightTarget,
    setActiveHighlightTarget,
    styleSectionLabels: v2_STYLE_SECTION_LABELS,
    rootLayoutStyleSectionKeyMap: v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP,
    cardLayoutStyleSectionKeyMap: v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP,
    styleSectionHighlightTargetMap: v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP,
    stylePropertyCatalog: v2_STYLE_PROPERTY_CATALOG,
    lockedStylePropertyKeys: v2_LOCKED_STYLE_PROPERTY_KEYS,
  });

  const { updateFormFieldAt, appendFormField, removeFormFieldAt } =
    useTemplateFormSchemaActions({
      renderConfig,
      safeUpdateConfig,
      setFormSchemaError,
    });

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

  const {
    getBoilerplateSectionMap,
    addBoilerplateProperty,
    removeBoilerplateProperty,
    renameBoilerplateProperty,
    updateBoilerplatePropertyValue,
    getBoilerplateFieldType,
    getBoilerplateFieldStep,
    resetBoilerplateSection,
    getBoilerplateAutoResizePair,
    getBoilerplateHorizontalAlign,
    getBoilerplateVerticalAlign,
    updateBoilerplateAutoResizeHorizontalAlign,
    updateBoilerplateAutoResizeVerticalAlign,
  } = useTemplateBoilerplateActions({
    boilerplateConfig,
    setBoilerplateConfig,
    lockedStylePropertyKeys: v2_LOCKED_STYLE_PROPERTY_KEYS,
    getHorizontalAlignFromStyle,
    getVerticalAlignFromStyle,
  });

  const {
    updateCardOptions,
    updateCardNodeVisibilityMode,
    updateCardNodeBinding,
    updateCardNodeMeta,
    appendCardNode,
    removeCardNode,
    updateCardInstanceMode,
    updateCardInstanceTransform,
  } = useTemplateCardNodeActions({
    safeUpdateConfig,
    templateColorKeys: v2_TEMPLATE_COLOR_KEYS,
    fixedCardNodeIds: v2_FIXED_CARD_NODE_IDS,
  });

  const {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
    moveSceneNode,
    removeSceneNode,
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  } = useTemplateSceneNodeActions({
    renderConfig,
    safeUpdateConfig,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
    setActiveHighlightTarget,
    sceneCustomNodeIdPrefix: v2_SCENE_CUSTOM_NODE_ID_PREFIX,
    sceneCustomLayerIdPrefix: v2_SCENE_CUSTOM_LAYER_ID_PREFIX,
    templateColorKeys: v2_TEMPLATE_COLOR_KEYS,
  });

  const {
    parseFontWeightInput,
    addFontRegistryItem,
    removeFontRegistryItem,
    updateBaseFontToken,
    updateFontRegistryMeta,
    addFontFace,
    updateFontFace,
    removeFontFace,
    updateColor,
    updateComponentFont,
    updateMaxFontSize,
    updateAssetUrl,
    handleAssetFileUpload,
  } = useTemplateThemeAssetActions({
    renderConfig,
    safeUpdateConfig,
  });

  const updateNodeNewFieldDraft = (
    nodeId: string,
    patch: Partial<V2NodeNewFieldDraft>
  ) => {
    setNewFieldDraftByNodeId((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] ?? { scope: "entry", key: "" }),
        ...patch,
      },
    }));
  };

  const createFieldForNodeBinding = ({
    nodeId,
    nodeLabel,
    onBindField,
  }: {
    nodeId: string;
    nodeLabel: string;
    onBindField: (scope: V2TemplateFieldScope, key: string) => void;
  }) => {
    const draft = newFieldDraftByNodeId[nodeId];
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
      label: nodeLabel,
      defaultValue: "",
    });
    if (!field) return;

    onBindField(field.scope, field.key);
    updateNodeNewFieldDraft(nodeId, { key: "", scope: "entry" });
  };

  const createFieldForCardNodeBinding = (node: V2TemplateCardNode) => {
    createFieldForNodeBinding({
      nodeId: node.id,
      nodeLabel: node.label,
      onBindField: (scope, key) => {
        updateCardNodeBinding(node.id, {
          mode: "field",
          scope,
          key,
        });
      },
    });
  };

  const createFieldForSceneNodeBinding = (node: V2TemplateSceneTextNode) => {
    createFieldForNodeBinding({
      nodeId: node.id,
      nodeLabel: node.label,
      onBindField: (scope, key) => {
        updateSceneTextNodeBinding(node.id, {
          mode: "field",
          scope,
          key,
        });
      },
    });
  };

  const v2_parseBindingFromSelectValue = (
    value: string,
    currentBinding: V2TemplateCardNodeBinding
  ): V2TemplateCardNodeBinding | null => {
    if (value === "literal") {
      return {
        mode: "literal",
        value:
          currentBinding.mode === "literal"
            ? currentBinding.value
            : v2_bindingRefToLegacyInput(currentBinding),
      };
    }

    if (value.startsWith("computed:")) {
      const computedKey = value.replace("computed:", "");
      if (
        computedKey === "streamingDay" ||
        computedKey === "streamingDate" ||
        computedKey === "streamingTime"
      ) {
        return {
          mode: "computed",
          key: computedKey,
        };
      }
      return null;
    }

    if (value.startsWith("field:")) {
      const [, scope, ...rest] = value.split(":");
      const key = rest.join(":");
      if (!key) return null;
      if (scope !== "entry" && scope !== "card" && scope !== "global") {
        return null;
      }
      return {
        mode: "field",
        scope,
        key,
      };
    }

    return null;
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
  }) => (
    <TemplateStyleSectionEditor
      title={title}
      section={section}
      getStyleSectionMap={getStyleSectionMap}
      lockedStylePropertyKeys={v2_LOCKED_STYLE_PROPERTY_KEYS}
      isStyleGroupOpen={isStyleGroupOpen}
      onToggleStyleGroupOpen={toggleStyleGroupOpen}
      onSetSectionHoverHighlight={setSectionHoverHighlight}
      onClearSectionHoverHighlight={clearSectionHoverHighlight}
      onSetSectionActiveHighlight={setSectionActiveHighlight}
      onApplyStyleExtensionGroupDefaults={applyStyleExtensionGroupDefaults}
      onUpdateStylePropertyValue={updateStylePropertyValue}
      onRemoveStyleProperty={removeStyleProperty}
      onAddStyleProperty={addStyleProperty}
      onUpdateGridLayoutMode={updateGridLayoutMode}
      onPickGridEmptySlot={pickGridEmptySlot}
      onUpdateFlex42ThreeRow={updateFlex42ThreeRow}
      onUpdateFlex42Align={updateFlex42Align}
      getBoilerplateFieldType={getBoilerplateFieldType}
      getBoilerplateFieldStep={getBoilerplateFieldStep}
    />
  );

  const renderAutoResizeAlignmentEditor = ({
    title,
    wrapperSection,
    textSection,
  }: {
    title: string;
    wrapperSection: V2StyleSectionId;
    textSection: V2StyleSectionId;
  }) => (
    <TemplateAutoResizeAlignmentEditor
      title={title}
      wrapperSection={wrapperSection}
      textSection={textSection}
      getStyleSectionMap={getStyleSectionMap}
      onUpdateAutoResizeHorizontalAlign={updateAutoResizeHorizontalAlign}
      onUpdateAutoResizeVerticalAlign={updateAutoResizeVerticalAlign}
      onSetSectionHoverHighlight={setSectionHoverHighlight}
      onClearSectionHoverHighlight={clearSectionHoverHighlight}
      onSetSectionActiveHighlight={setSectionActiveHighlight}
    />
  );

  const renderBoilerplateSectionEditor = ({
    title,
    section,
  }: {
    title: string;
    section: V2StyleSectionKey;
  }) => (
    <TemplateBoilerplateSectionEditor
      title={title}
      section={section}
      getBoilerplateSectionMap={(nextSection) =>
        getBoilerplateSectionMap(nextSection as V2StyleSectionKey)
      }
      lockedStylePropertyKeys={v2_LOCKED_STYLE_PROPERTY_KEYS}
      stylePropertyCatalog={v2_STYLE_PROPERTY_CATALOG}
      getBoilerplateAutoResizePair={(nextSection) =>
        getBoilerplateAutoResizePair(nextSection as V2StyleSectionKey)
      }
      getBoilerplateHorizontalAlign={({ wrapperSection, textSection }) =>
        getBoilerplateHorizontalAlign({
          wrapperSection: wrapperSection as V2StyleSectionKey,
          textSection: textSection as V2StyleSectionKey,
        })
      }
      getBoilerplateVerticalAlign={({ wrapperSection }) =>
        getBoilerplateVerticalAlign({
          wrapperSection: wrapperSection as V2StyleSectionKey,
        })
      }
      onUpdateBoilerplateAutoResizeHorizontalAlign={({
        wrapperSection,
        textSection,
        align,
      }) =>
        updateBoilerplateAutoResizeHorizontalAlign({
          wrapperSection: wrapperSection as V2StyleSectionKey,
          textSection: textSection as V2StyleSectionKey,
          align,
        })
      }
      onUpdateBoilerplateAutoResizeVerticalAlign={({ wrapperSection, align }) =>
        updateBoilerplateAutoResizeVerticalAlign({
          wrapperSection: wrapperSection as V2StyleSectionKey,
          align,
        })
      }
      onResetBoilerplateSection={(nextSection) =>
        resetBoilerplateSection(nextSection as V2StyleSectionKey)
      }
      onAddBoilerplateProperty={(nextSection) =>
        addBoilerplateProperty(nextSection as V2StyleSectionKey)
      }
      getBoilerplateFieldType={getBoilerplateFieldType}
      getBoilerplateFieldStep={getBoilerplateFieldStep}
      onUpdateBoilerplatePropertyValue={(nextSection, key, value) =>
        updateBoilerplatePropertyValue(
          nextSection as V2StyleSectionKey,
          key,
          value
        )
      }
      onRenameBoilerplateProperty={(nextSection, currentKey, nextKey) =>
        renameBoilerplateProperty(
          nextSection as V2StyleSectionKey,
          currentKey,
          nextKey
        )
      }
      onRemoveBoilerplateProperty={(nextSection, key) =>
        removeBoilerplateProperty(nextSection as V2StyleSectionKey, key)
      }
    />
  );

  const renderBoilerplateSettingsModal = () => (
    <TemplateBoilerplateSettingsModal
      open={isBoilerplateSettingsOpen}
      target={boilerplateTarget}
      targetOptions={v2_STYLE_SECTION_ORDER.map((section) => ({
        value: section,
        label: v2_STYLE_SECTION_LABELS[section],
      }))}
      onClose={() => setIsBoilerplateSettingsOpen(false)}
      onChangeTarget={(value) => setBoilerplateTarget(value as V2StyleSectionKey)}
      editor={renderBoilerplateSectionEditor({
        title: v2_STYLE_SECTION_LABELS[boilerplateTarget],
        section: boilerplateTarget,
      })}
    />
  );

  const renderCanvasTab = () => (
    <TemplateCanvasTab
      templateWidth={renderConfig.templateSize.width}
      templateHeight={renderConfig.templateSize.height}
      defaultTheme={renderConfig.defaultTheme}
      previewTheme={currentTheme}
      themeOptions={themeOptions}
      onUpdateTemplateSize={updateTemplateSize}
      onChangeDefaultTheme={(nextTheme) => {
        safeUpdateConfig((prev) => ({
          ...prev,
          defaultTheme: nextTheme,
        }));
        if (!themeOptions.includes(assetTheme)) {
          setAssetTheme(nextTheme);
        }
      }}
      onChangePreviewTheme={(nextTheme) =>
        updateTheme(nextTheme as typeof currentTheme)
      }
    />
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

  const {
    renderSceneNodeStructureControls,
    renderSceneAssetNodeProperties,
    renderSceneGroupNodeProperties,
    renderSceneCardCollectionProperties,
  } = useTemplateSceneNodePropertyPanels({
    assetKeys: v2_ASSET_KEYS,
    assetLabels: v2_ASSET_LABELS,
    visibilityOptions: v2_CARD_NODE_VISIBILITY_OPTIONS,
    isSceneCustomNode,
    renderStyleSectionEditor: ({ title, section }) =>
      renderStyleSectionEditor({
        title,
        section: section as V2StyleSectionId,
      }),
    onMoveSceneNode: moveSceneNode,
    onRemoveSceneNode: removeSceneNode,
    onAddSceneSiblingNode: addSceneSiblingNode,
    onAddSceneChildNode: addSceneChildNode,
    onUpdateSceneNodeLabel: updateSceneNodeLabel,
    onUpdateSceneAssetNodeMeta: updateSceneAssetNodeMeta,
    onUpdateSceneNodeVisibilityMode: updateSceneNodeVisibilityMode,
  });

  const { renderCardNodeProperties, renderSceneTextNodeProperties } =
    useTemplateBoundTextNodePropertyPanels({
      renderConfig,
      styleKeyToSectionMap: v2_STYLE_KEY_TO_SECTION_KEY_MAP,
      fixedCardNodeIds: v2_FIXED_CARD_NODE_IDS,
      colorKeys: v2_TEMPLATE_COLOR_KEYS,
      computedOptions: v2_BINDING_COMPUTED_OPTIONS,
      scopeOptions: v2_FORM_FIELD_SCOPE_OPTIONS,
      visibilityOptions: v2_CARD_NODE_VISIBILITY_OPTIONS,
      newFieldDraftByNodeId,
      renderStyleSectionEditor,
      renderAutoResizeAlignmentEditor,
      renderSceneNodeStructureControls,
      parseBindingFromSelectValue: v2_parseBindingFromSelectValue,
      onSetSectionHoverHighlight: setSectionHoverHighlight,
      onClearSectionHoverHighlight: clearSectionHoverHighlight,
      onSetSectionActiveHighlight: setSectionActiveHighlight,
      onUpdateCardOptions: updateCardOptions,
      onUpdateMaxFontSize: updateMaxFontSize,
      onRemoveCardNode: removeCardNode,
      onUpdateCardNodeMeta: updateCardNodeMeta,
      onUpdateCardNodeVisibilityMode: updateCardNodeVisibilityMode,
      onUpdateCardNodeBinding: updateCardNodeBinding,
      onUpdateNodeNewFieldDraft: updateNodeNewFieldDraft,
      onCreateFieldForCardNodeBinding: createFieldForCardNodeBinding,
      onUpdateSceneTextNodeMeta: updateSceneTextNodeMeta,
      onUpdateSceneTextNodeVisibilityMode: updateSceneTextNodeVisibilityMode,
      onUpdateSceneTextNodeBinding: updateSceneTextNodeBinding,
      onCreateFieldForSceneNodeBinding: createFieldForSceneNodeBinding,
    });

  const { renderSimplePropertiesSection } = useTemplateSimplePropertiesPanel({
    sectionToLabel: structurePropertiesMaps.sectionToLabel,
    styleSectionLabels: v2_STYLE_SECTION_LABELS,
    bindableNodeLabels,
    cardInstanceMode: runtimeCardStructure.instanceMode ?? "component",
    cardInstanceTransforms: runtimeCardStructure.instanceTransforms ?? {},
    onChangeCardInstanceMode: updateCardInstanceMode,
    onAppendCardTextNode: () => appendCardNode("text"),
    onAppendCardFlexibleTextNode: () => appendCardNode("flexibleText"),
    onUpdateCardInstanceTransform: updateCardInstanceTransform,
    renderStyleSectionEditor,
  });

  const renderPropertiesTab = () => (
    <TemplatePropertiesTab
      inspectorRef={inspectorTabRef}
      selectedLabel={selectedPropertiesLabel}
      onMouseLeave={clearSectionHoverHighlight}
      onBlurOutside={() => setActiveHighlightTarget(null)}
    >
      <TemplateSelectedPropertiesPanelRouter
        selectedLayerNode={selectedPropertiesLayerNode}
        selectedSection={selectedPropertiesSection}
        cardNodeByLayerId={cardNodeByLayerId}
        sceneNodeByLayerId={sceneNodeByLayerId}
        renderCardNodeProperties={renderCardNodeProperties}
        renderSceneTextNodeProperties={renderSceneTextNodeProperties}
        renderSceneAssetNodeProperties={renderSceneAssetNodeProperties}
        renderSceneGroupNodeProperties={renderSceneGroupNodeProperties}
        renderSceneCardCollectionProperties={renderSceneCardCollectionProperties}
        renderSimplePropertiesSection={renderSimplePropertiesSection}
      />
    </TemplatePropertiesTab>
  );

  const renderAssetsTab = () => (
    <TemplateAssetsTab
      assetTheme={assetTheme}
      themeOptions={themeOptions}
      renderConfig={renderConfig}
      preferProfileDummyImage={preferProfileDummyImage}
      assetKeys={v2_ASSET_KEYS}
      assetLabels={v2_ASSET_LABELS}
      setAssetTheme={setAssetTheme}
      onTogglePreferProfileDummyImage={updatePreferProfileDummyImage}
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

  return (
    <div className="h-full min-h-0 w-full">
      <div className="v2-dark-form-theme h-full min-h-0 shrink-0 flex flex-col border-l border-[#303848] bg-gray-100 w-full">
        <TemplateBuilderTabs
          tabs={v2_BUILDER_TABS}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
        <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
          <TemplateBuilderTabContentRouter
            activeTab={activeTab}
            renderCanvasTab={renderCanvasTab}
            renderSchemaTab={renderSchemaTab}
            renderPropertiesTab={renderPropertiesTab}
            renderStyleTab={renderStyleTab}
            renderAssetsTab={renderAssetsTab}
            renderDataTab={renderDataTab}
            renderExportTab={renderExportTab}
          />
        </div>
      </div>
      {renderBoilerplateSettingsModal()}
    </div>
  );
};

export default V2TemplateBuilderForm;
