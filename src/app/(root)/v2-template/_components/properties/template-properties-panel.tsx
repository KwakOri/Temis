import React, { useEffect, useMemo, useRef, useState } from "react";

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
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneTextNode,
  V2TemplateVisibilityMode,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import {
  v2_bindingRefToLegacyInput,
  v2_isEntryFieldBindingKey,
} from "@/utils/time-table/template-render-config";
import {
  v2_HORIZONTAL_ALIGN_TO_JUSTIFY,
  v2_VERTICAL_ALIGN_TO_ALIGN_ITEMS,
} from "./model/alignment-utils";
import {
  v2_POSITION_MUTEX_MAP,
  v2_hasRenderableStyleValue,
} from "./model/layout-utils";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import {
  v2_BOILERPLATE_NUMERIC_KEYS,
  v2_BOILERPLATE_SELECT_OPTIONS,
} from "./model/boilerplate-presets";
import {
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
  v2_collectStructureTargetSectionMaps,
  v2_mapSceneTextNodes,
  v2_updateSceneTextNodeById,
} from "./model/structure-utils";
import {
  V2NodeNewFieldDraft,
  v2_getNodeBindingSelectValue,
  v2_getNodeNewFieldDraft,
  v2_hasNodeBindingField,
} from "./model/binding-utils";
import {
  V2BoilerplateFieldConfig,
  V2BoilerplateFieldType,
} from "./model/boilerplate-ui-utils";
import {
  v2_createStyleKeyToSectionKeyMap,
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
  v2_resolveCardStyleSection,
  v2_resolveTextNodeSections,
} from "./model/style-section-utils";
import TemplateCardAutoResizeOptions from "./components/template-card-auto-resize-options";
import TemplateBoilerplateSectionEditor from "./components/template-boilerplate-section-editor";
import TemplateBoilerplateSettingsModal from "./components/template-boilerplate-settings-modal";
import TemplateBoundTextNodePropertiesPanel from "./components/template-bound-text-node-properties-panel";
import TemplateCardComponentProperties from "./components/template-card-component-properties";
import TemplateAutoResizeAlignmentEditor from "./components/template-auto-resize-alignment-editor";
import TemplateSceneAssetProperties from "./components/template-scene-asset-properties";
import TemplateSceneCardCollectionProperties from "./components/template-scene-card-collection-properties";
import TemplateSceneGroupProperties from "./components/template-scene-group-properties";
import TemplateSceneNodeStructureControls from "./components/template-scene-node-structure-controls";
import TemplateSimplePropertiesSection from "./components/template-simple-properties-section";
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
import useTemplateCardNodeActions from "./hooks/use-template-card-node-actions";
import useTemplateSceneNodeActions from "./hooks/use-template-scene-node-actions";
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

type V2HorizontalAlign = "left" | "center" | "right";
type V2VerticalAlign = "top" | "center" | "bottom";

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
    const {
      containerSection,
      textSection,
      wrapperSection,
      alignmentWrapperSection,
      hasAutoResizeAlignment,
    } = v2_resolveTextNodeSections({
      containerStyleKey: node.containerStyleKey,
      textStyleKey: node.textStyleKey,
      wrapperStyleKey: node.wrapperStyleKey,
      fallbackSection: section,
      styleKeyToSectionMap: v2_STYLE_KEY_TO_SECTION_KEY_MAP,
      isFlexibleText: node.kind === "flexibleText",
    });
    const isRemovable = !v2_FIXED_CARD_NODE_IDS.has(node.id);
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

    const headerAction = isRemovable ? (
      <button
        type="button"
        onClick={() => removeCardNode(node.id)}
        className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
      >
        오브젝트 삭제
      </button>
    ) : null;

    return (
      <TemplateBoundTextNodePropertiesPanel
        heading={`Card / ${node.label}`}
        headerAction={headerAction}
        label={node.label}
        colorKey={node.colorKey}
        fontKey={node.fontKey}
        visibilityMode={node.visibilityMode ?? "always"}
        binding={node.binding}
        bindingSelectValue={bindingSelectValue}
        fields={renderConfig.formSchema.fields}
        computedOptions={v2_BINDING_COMPUTED_OPTIONS}
        scopeOptions={v2_FORM_FIELD_SCOPE_OPTIONS}
        newFieldDraft={newFieldDraft}
        fieldBindingExists={fieldBindingExists}
        colorKeys={v2_TEMPLATE_COLOR_KEYS}
        visibilityOptions={v2_CARD_NODE_VISIBILITY_OPTIONS}
        containerSection={containerSection}
        wrapperSection={wrapperSection}
        alignmentWrapperSection={alignmentWrapperSection}
        textSection={textSection}
        hasAutoResizeAlignment={hasAutoResizeAlignment}
        tailContent={
          node.kind === "flexibleText"
            ? renderCardNodeAutoResizeOptions({
                node,
                containerSection,
              })
            : null
        }
        renderStyleSectionEditor={renderStyleSectionEditor}
        renderAutoResizeAlignmentEditor={renderAutoResizeAlignmentEditor}
        onChangeLabel={(value) =>
          updateCardNodeMeta({
            nodeId: node.id,
            label: value,
          })
        }
        onChangeColorKey={(value) =>
          updateCardNodeMeta({
            nodeId: node.id,
            colorKey: value,
          })
        }
        onChangeFontKey={(value) =>
          updateCardNodeMeta({
            nodeId: node.id,
            fontKey: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          updateCardNodeVisibilityMode(node.id, value)
        }
        onMouseEnterVisibility={() => setSectionHoverHighlight(containerSection)}
        onMouseLeaveVisibility={clearSectionHoverHighlight}
        onClickVisibility={() => setSectionActiveHighlight(containerSection)}
        onSelectBinding={(value) => {
          const nextBinding = v2_parseBindingFromSelectValue(value, node.binding);
          if (!nextBinding) return;
          updateCardNodeBinding(node.id, nextBinding);
        }}
        onChangeLiteral={(value) =>
          updateCardNodeBinding(node.id, {
            mode: "literal",
            value,
          })
        }
        onChangeDraftKey={(value) => updateNodeNewFieldDraft(node.id, { key: value })}
        onChangeDraftScope={(scope) =>
          updateNodeNewFieldDraft(node.id, { scope })
        }
        onCreateField={() => createFieldForCardNodeBinding(node)}
      />
    );
  };

  const renderCardComponentProperties = (section: V2StyleSectionId) => {
    if (section !== "cardContainer") return null;

    const instanceMode = renderConfig.structure.card.instanceMode ?? "component";
    const instanceTransforms = renderConfig.structure.card.instanceTransforms ?? {};

    return (
      <TemplateCardComponentProperties
        instanceMode={instanceMode}
        instanceTransforms={instanceTransforms}
        onChangeInstanceMode={updateCardInstanceMode}
        onAppendTextNode={() => appendCardNode("text")}
        onAppendFlexibleTextNode={() => appendCardNode("flexibleText")}
        onUpdateInstanceTransform={updateCardInstanceTransform}
      />
    );
  };

  const renderSceneTextNodeProperties = (
    section: V2StyleSectionId,
    node: V2TemplateSceneTextNode
  ) => {
    const {
      containerSection,
      textSection,
      wrapperSection,
      alignmentWrapperSection,
      hasAutoResizeAlignment,
    } = v2_resolveTextNodeSections({
      containerStyleKey: node.containerStyleKey,
      textStyleKey: node.textStyleKey,
      wrapperStyleKey: node.wrapperStyleKey,
      fallbackSection: section,
      styleKeyToSectionMap: v2_STYLE_KEY_TO_SECTION_KEY_MAP,
      isFlexibleText: node.kind === "flexibleText",
    });
    const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
    const fieldBindingExists = v2_hasNodeBindingField(
      node.binding,
      renderConfig.formSchema.fields
    );
    const newFieldDraft = v2_getNodeNewFieldDraft(newFieldDraftByNodeId, node.id);

    return (
      <TemplateBoundTextNodePropertiesPanel
        heading={`Scene / ${node.label}`}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: false,
        })}
        label={node.label}
        colorKey={node.colorKey}
        fontKey={node.fontKey}
        visibilityMode={node.visibilityMode ?? "always"}
        binding={node.binding}
        bindingSelectValue={bindingSelectValue}
        fields={renderConfig.formSchema.fields}
        computedOptions={v2_BINDING_COMPUTED_OPTIONS}
        scopeOptions={v2_FORM_FIELD_SCOPE_OPTIONS}
        newFieldDraft={newFieldDraft}
        fieldBindingExists={fieldBindingExists}
        colorKeys={v2_TEMPLATE_COLOR_KEYS}
        visibilityOptions={v2_CARD_NODE_VISIBILITY_OPTIONS}
        containerSection={containerSection}
        wrapperSection={wrapperSection}
        alignmentWrapperSection={alignmentWrapperSection}
        textSection={textSection}
        hasAutoResizeAlignment={hasAutoResizeAlignment}
        renderStyleSectionEditor={renderStyleSectionEditor}
        renderAutoResizeAlignmentEditor={renderAutoResizeAlignmentEditor}
        onChangeLabel={(value) =>
          updateSceneTextNodeMeta({
            nodeId: node.id,
            label: value,
          })
        }
        onChangeColorKey={(value) =>
          updateSceneTextNodeMeta({
            nodeId: node.id,
            colorKey: value,
          })
        }
        onChangeFontKey={(value) =>
          updateSceneTextNodeMeta({
            nodeId: node.id,
            fontKey: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          updateSceneTextNodeVisibilityMode(node.id, value)
        }
        onMouseEnterVisibility={() => setSectionHoverHighlight(containerSection)}
        onMouseLeaveVisibility={clearSectionHoverHighlight}
        onClickVisibility={() => setSectionActiveHighlight(containerSection)}
        onSelectBinding={(value) => {
          const nextBinding = v2_parseBindingFromSelectValue(value, node.binding);
          if (!nextBinding) return;
          updateSceneTextNodeBinding(node.id, nextBinding);
        }}
        onChangeLiteral={(value) =>
          updateSceneTextNodeBinding(node.id, {
            mode: "literal",
            value,
          })
        }
        onChangeDraftKey={(value) => updateNodeNewFieldDraft(node.id, { key: value })}
        onChangeDraftScope={(scope) =>
          updateNodeNewFieldDraft(node.id, { scope })
        }
        onCreateField={() => createFieldForSceneNodeBinding(node)}
      />
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

    return (
      <TemplateSceneNodeStructureControls
        nodeId={node.id}
        allowChildren={allowChildren}
        canDelete={canDelete}
        onMoveUp={() => moveSceneNode({ nodeId: node.id, direction: "up" })}
        onMoveDown={() => moveSceneNode({ nodeId: node.id, direction: "down" })}
        onDelete={() => removeSceneNode(node.id)}
        onAddSibling={(kind) =>
          addSceneSiblingNode({
            anchorNodeId: node.id,
            kind,
          })
        }
        onAddChild={(kind) =>
          addSceneChildNode({
            parentNodeId: node.id,
            kind,
          })
        }
      />
    );
  };

  const renderSceneAssetNodeProperties = (
    node: V2TemplateSceneAssetNode,
    section: V2StyleSectionId | null
  ) => {
    const styleSection = section ?? v2_parseStyleSectionKey(node.styleKey);
    const styleEditor = styleSection ? (
      renderStyleSectionEditor({
        title: "asset style",
        section: styleSection,
      })
    ) : (
      <div className="rounded border border-[#3a3d44] bg-[#141821] px-2 py-1.5 text-[11px] text-gray-300">
        이 에셋 노드는 연결된 style section이 없습니다.
      </div>
    );

    return (
      <TemplateSceneAssetProperties
        node={node}
        assetKeys={v2_ASSET_KEYS}
        assetLabels={v2_ASSET_LABELS}
        visibilityOptions={v2_CARD_NODE_VISIBILITY_OPTIONS}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: false,
        })}
        styleEditor={styleEditor}
        onChangeLabel={(value) => updateSceneNodeLabel(node.id, value)}
        onChangeAssetKey={(value) =>
          updateSceneAssetNodeMeta({
            nodeId: node.id,
            assetKey: value,
          })
        }
        onChangeFit={(value) =>
          updateSceneAssetNodeMeta({
            nodeId: node.id,
            fit: value,
          })
        }
        onChangeVisibilityMode={(value) =>
          updateSceneNodeVisibilityMode(node.id, value)
        }
        onChangeAlt={(value) =>
          updateSceneAssetNodeMeta({
            nodeId: node.id,
            alt: value,
          })
        }
      />
    );
  };

  const renderSceneGroupNodeProperties = (node: V2TemplateSceneGroupNode) => {
    const childCount = node.children.length;
    return (
      <TemplateSceneGroupProperties
        label={node.label}
        childCount={childCount}
        visibilityMode={node.visibilityMode ?? "always"}
        visibilityOptions={v2_CARD_NODE_VISIBILITY_OPTIONS}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: true,
        })}
        onChangeLabel={(value) => updateSceneNodeLabel(node.id, value)}
        onChangeVisibilityMode={(value) =>
          updateSceneNodeVisibilityMode(node.id, value)
        }
      />
    );
  };

  const renderSceneCardCollectionProperties = (
    node: V2TemplateSceneCardCollectionNode,
    section: V2StyleSectionId | null
  ) => {
    const layoutStyleEditor = section
      ? renderStyleSectionEditor({ title: "layout style", section })
      : null;

    return (
      <TemplateSceneCardCollectionProperties
        node={node}
        visibilityOptions={v2_CARD_NODE_VISIBILITY_OPTIONS}
        structureControls={renderSceneNodeStructureControls({
          node,
          allowChildren: false,
        })}
        layoutStyleEditor={layoutStyleEditor}
        onChangeLabel={(value) => updateSceneNodeLabel(node.id, value)}
        onChangeVisibilityMode={(value) =>
          updateSceneNodeVisibilityMode(node.id, value)
        }
      />
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
      <TemplateSimplePropertiesSection
        heading={heading}
        section={section}
        bindableNodeLabels={bindableNodeLabels}
        cardComponentProperties={renderCardComponentProperties(section)}
        styleEditor={renderStyleSectionEditor({ title: styleTitle, section })}
      />
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
