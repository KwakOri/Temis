import React, { useEffect, useMemo, useRef, useState } from "react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  useTemplateEditorActions,
  useTemplateEditorData,
} from "@/contexts/v2/template-editor-ui-context";
import {
  V2TemplateCardNode,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
  v2_TEMPLATE_DAY_KEYS,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import { v2_resolveDayLabelByKey } from "@/utils/time-table/template-render-config";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import {
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
} from "./model/structure-utils";
import { v2_collectFormSchemaDiagnostics } from "./model/form-schema-diagnostics";
import {
  v2_parseNodeBindingFromSelectValue,
} from "./model/binding-utils";
import {
  v2_collectCardComponentInstanceDiagnostics,
  v2_collectCardComponentInstances,
  v2_collectSceneGroupParentOptions,
  v2_collectSceneNodeDescendantIdsById,
  v2_collectSceneNodeParentIdById,
} from "./model/properties-aggregators";
import {
  v2_createStyleKeyToSectionKeyMap,
} from "./model/style-section-utils";
import {
  v2_applyTemplatePreset,
  v2_TEMPLATE_PRESET_DEFINITIONS,
} from "./model/template-presets";
import {
  v2_ASSET_KEYS,
  v2_ASSET_LABELS,
  v2_BASE_FONT_TOKEN_KEYS,
  v2_BINDING_COMPUTED_OPTIONS,
  v2_BOILERPLATE_STORAGE_KEY,
  v2_BUILDER_TABS,
  v2_CARD_LAYOUT_STYLE_SECTION_KEY_MAP,
  v2_CARD_NODE_VISIBILITY_OPTIONS,
  v2_FIXED_CARD_NODE_IDS,
  v2_FONT_DISPLAY_OPTIONS,
  v2_FONT_FORMAT_OPTIONS,
  v2_FONT_STYLE_OPTIONS,
  v2_FORM_FIELD_SCOPE_OPTIONS,
  v2_FORM_FIELD_TYPE_OPTIONS,
  v2_HIGHLIGHT_TARGET_LABELS,
  v2_LOCKED_STYLE_PROPERTY_KEYS,
  v2_ROOT_LAYOUT_STYLE_SECTION_KEY_MAP,
  v2_SCENE_CUSTOM_LAYER_ID_PREFIX,
  v2_SCENE_CUSTOM_NODE_ID_PREFIX,
  v2_STYLE_PROPERTY_CATALOG,
  v2_STYLE_SECTION_HIGHLIGHT_TARGET_MAP,
  v2_STYLE_SECTION_LABELS,
  v2_STYLE_SECTION_ORDER,
  type V2StyleSectionId,
  type V2StyleSectionKey,
} from "./model/template-properties-constants";
import TemplateBoilerplateSectionEditor from "./components/template-boilerplate-section-editor";
import TemplateBoilerplateSettingsModal from "./components/template-boilerplate-settings-modal";
import TemplateAutoResizeAlignmentEditor from "./components/template-auto-resize-alignment-editor";
import TemplateSelectedPropertiesPanelRouter from "./components/template-selected-properties-panel-router";
import TemplateStylePresetControls from "./components/template-style-preset-controls";
import TemplateStyleSectionEditor from "./components/template-style-section-editor";
import TemplateBuilderTabs from "./panels/template-builder-tabs";
import TemplatePropertiesTabsRenderer from "./panels/properties-tabs-renderer";
import { type V2BuilderTabId } from "./panels/template-builder-tab-content-router";
import TemplatePropertiesTab from "./panels/template-properties-tab";
import TemplateStyleTab from "./panels/template-style-tab";
import TemplateStyleThemeSettings from "./panels/template-style-theme-settings";
import useTemplateStyleEditorActions from "./hooks/use-template-style-editor-actions";
import useTemplateBoundTextNodePropertyPanels from "./hooks/use-template-bound-text-node-property-panels";
import useTemplateBoilerplateActions from "./hooks/use-template-boilerplate-actions";
import useTemplateBoilerplateUiEffects from "./hooks/use-template-boilerplate-ui-effects";
import useTemplateCardNodeActions from "./hooks/use-template-card-node-actions";
import useTemplateFormSchemaActions from "./hooks/use-template-form-schema-actions";
import useTemplatePropertiesFocusEffects from "./hooks/use-template-properties-focus-effects";
import useTemplatePropertiesSelectionContext from "./hooks/use-template-properties-selection-context";
import useTemplateSceneNodeActions from "./hooks/use-template-scene-node-actions";
import useTemplateSceneNodePropertyPanels from "./hooks/use-template-scene-node-property-panels";
import useTemplateSimplePropertiesPanel from "./hooks/use-template-simple-properties-panel";
import useTemplateNodeBindingFieldActions from "./hooks/use-template-node-binding-field-actions";
import useTemplateSampleDataActions from "./hooks/use-template-sample-data-actions";
import useTemplateThemeAssetActions from "./hooks/use-template-theme-asset-actions";

interface V2TemplateBuilderFormProps {
  focusLayerId?: string | null;
  focusLayerNonce?: number;
  focusStyleSection?: string | null;
  focusStyleSectionNonce?: number;
  focusEditorMode?: "instance" | "master";
}

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

const V2TemplateBuilderForm: React.FC<V2TemplateBuilderFormProps> = ({
  focusLayerId = null,
  focusLayerNonce = 0,
  focusStyleSection = null,
  focusStyleSectionNonce = 0,
  focusEditorMode = "instance",
}) => {
  const { renderConfig, setRenderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    updateData,
    globalData,
    updateGlobalData,
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
  const [selectedPresetId, setSelectedPresetId] = useState(
    v2_TEMPLATE_PRESET_DEFINITIONS[0]?.id ?? "default_boilerplate"
  );
  const [formSchemaError, setFormSchemaError] = useState<string | null>(null);
  const inspectorTabRef = useRef<HTMLDivElement | null>(null);
  const runtimeCardStructuresByComponentId = useMemo(() => {
    const next: Record<
      string,
      ReturnType<typeof v2_getRuntimeCardStructureByComponentId>
    > = {};
    Object.keys(renderConfig.graph.componentDefinitions ?? {}).forEach(
      (componentId) => {
        next[componentId] = v2_getRuntimeCardStructureByComponentId(
          renderConfig,
          componentId
        );
      }
    );
    return next;
  }, [renderConfig]);
  const runtimeCardComponentIds = useMemo(
    () => Object.keys(runtimeCardStructuresByComponentId),
    [runtimeCardStructuresByComponentId]
  );
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const {
    selectedPropertiesTarget,
    setSelectedPropertiesTarget,
    selectedPropertiesLayerId,
    setSelectedPropertiesLayerId,
    selectedPropertiesEditorMode,
    setSelectedPropertiesEditorMode,
    structurePropertiesMaps,
    selectedPropertiesLayerNode,
    selectedPropertiesSection,
    selectedPropertiesLabel,
  } = useTemplatePropertiesSelectionContext({
    runtimeLayerTree,
    styleSectionLabels: v2_STYLE_SECTION_LABELS,
    highlightTargetLabels: v2_HIGHLIGHT_TARGET_LABELS,
  });
  const runtimeSceneNodes = useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );
  const cardNodeByLayerId = useMemo(() => {
    const map = new Map<string, V2TemplateCardNode>();
    Object.values(runtimeCardStructuresByComponentId).forEach((structure) => {
      Object.values(structure.nodes).forEach((node) => {
        map.set(node.layerId, node);
      });
    });
    return map;
  }, [runtimeCardStructuresByComponentId]);
  const cardNodeComponentIdByLayerId = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(runtimeCardStructuresByComponentId).forEach(
      ([componentId, structure]) => {
        Object.values(structure.nodes).forEach((node) => {
          map.set(node.layerId, componentId);
        });
      }
    );
    return map;
  }, [runtimeCardStructuresByComponentId]);
  const componentIdByRootLayerId = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(runtimeCardStructuresByComponentId).forEach(
      ([componentId, structure]) => {
        map.set(structure.containerLayerId, componentId);
      }
    );
    return map;
  }, [runtimeCardStructuresByComponentId]);
  const sceneNodeByLayerId = useMemo(
    () => v2_collectSceneNodesByLayerId(runtimeSceneNodes),
    [runtimeSceneNodes]
  );
  const activeCardComponentId = useMemo(() => {
    const selectedSceneNode = sceneNodeByLayerId.get(selectedPropertiesLayerId);
    if (selectedSceneNode?.kind === "cardCollection") {
      const selectedComponentId = selectedSceneNode.componentId?.trim();
      if (
        selectedComponentId &&
        runtimeCardStructuresByComponentId[selectedComponentId]
      ) {
        return selectedComponentId;
      }
      return runtimeCardComponentIds[0] ?? null;
    }

    const cardNodeComponentId =
      cardNodeComponentIdByLayerId.get(selectedPropertiesLayerId);
    if (cardNodeComponentId) return cardNodeComponentId;

    const rootLayerComponentId =
      componentIdByRootLayerId.get(selectedPropertiesLayerId);
    if (rootLayerComponentId) return rootLayerComponentId;

    return runtimeCardComponentIds[0] ?? null;
  }, [
    cardNodeComponentIdByLayerId,
    componentIdByRootLayerId,
    runtimeCardComponentIds,
    runtimeCardStructuresByComponentId,
    sceneNodeByLayerId,
    selectedPropertiesLayerId,
  ]);
  const activeCardStructure = useMemo(
    () =>
      activeCardComponentId
        ? runtimeCardStructuresByComponentId[activeCardComponentId] ?? null
        : null,
    [activeCardComponentId, runtimeCardStructuresByComponentId]
  );
  const activeCardComponentInstances = useMemo(() => {
    return v2_collectCardComponentInstances({
      componentId: activeCardComponentId,
      sceneNodes: runtimeSceneNodes,
      dayLabelFormat: renderConfig.dayLabelFormat,
      weekdayOption: renderConfig.weekdayOption,
      additionalInstanceIds: Object.keys(
        activeCardStructure?.instanceTransforms ?? {}
      ),
    });
  }, [
    activeCardComponentId,
    activeCardStructure?.instanceTransforms,
    renderConfig.dayLabelFormat,
    renderConfig.weekdayOption,
    runtimeSceneNodes,
  ]);
  const activeCardComponentInstanceDiagnostics = useMemo(() => {
    return v2_collectCardComponentInstanceDiagnostics({
      componentId: activeCardComponentId,
      sceneNodes: runtimeSceneNodes,
    });
  }, [activeCardComponentId, runtimeSceneNodes]);
  const allRuntimeCardNodes = useMemo(() => {
    return Object.values(runtimeCardStructuresByComponentId).flatMap((structure) =>
      structure.nodeOrder
        .map((nodeId) => structure.nodes[nodeId])
        .filter((node): node is V2TemplateCardNode => Boolean(node))
    );
  }, [runtimeCardStructuresByComponentId]);
  const sceneStyleSectionKeySet = useMemo(() => {
    const next = new Set<string>();
    runtimeSceneNodes.forEach((node) => {
      v2_collectSceneNodeStyleKeys(node).forEach((key) => next.add(key));
    });
    return next;
  }, [runtimeSceneNodes]);
  const bindableCardNodeLabels = useMemo(() => {
    return allRuntimeCardNodes.map((node) => node.label);
  }, [allRuntimeCardNodes]);
  const runtimeSceneTextNodes = useMemo(
    () => v2_collectSceneTextNodes(runtimeSceneNodes),
    [runtimeSceneNodes]
  );
  const sceneNodeParentIdById = useMemo(() => {
    return v2_collectSceneNodeParentIdById(runtimeSceneNodes);
  }, [runtimeSceneNodes]);
  const sceneNodeDescendantIdsById = useMemo(() => {
    return v2_collectSceneNodeDescendantIdsById(runtimeSceneNodes);
  }, [runtimeSceneNodes]);
  const sceneGroupParentOptions = useMemo(() => {
    return v2_collectSceneGroupParentOptions(runtimeSceneNodes);
  }, [runtimeSceneNodes]);
  const bindableSceneTextNodeLabels = useMemo(() => {
    return runtimeSceneTextNodes.map((node) => node.label);
  }, [runtimeSceneTextNodes]);
  const bindableNodeLabels = useMemo(() => {
    return Array.from(
      new Set([...bindableCardNodeLabels, ...bindableSceneTextNodeLabels])
    );
  }, [bindableCardNodeLabels, bindableSceneTextNodeLabels]);
  const formSchemaDiagnostics = useMemo(() => {
    return v2_collectFormSchemaDiagnostics({
      fields: renderConfig.formSchema.fields,
      cardNodes: allRuntimeCardNodes,
      sceneTextNodes: runtimeSceneTextNodes,
    });
  }, [
    allRuntimeCardNodes,
    renderConfig.formSchema.fields,
    runtimeSceneTextNodes,
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
  useEffect(() => {
    if (!focusLayerId) return;
    setSelectedPropertiesEditorMode(focusEditorMode);
  }, [focusEditorMode, focusLayerId, focusLayerNonce]);

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
    resolveActiveComponentId: () => activeCardComponentId,
  });

  const {
    updateSceneNodeVisibilityMode,
    updateSceneNodeLabel,
    updateSceneAssetNodeMeta,
    updateSceneCardCollectionComponentId,
    syncSceneCardCollectionChildComponentIds,
    updateSceneComponentInstanceDayKey,
    updateSceneComponentInstanceInstanceId,
    updateSceneComponentInstanceComponentId,
    updateSceneComponentInstanceBindingOverride,
    removeSceneComponentInstanceBindingOverride,
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
    moveSceneNode,
    relocateSceneNode,
    extractSceneComponentInstanceCopy,
    removeSceneNode,
    updateSceneTextNodeBinding,
    updateSceneTextNodeVisibilityMode,
    updateSceneTextNodeMeta,
  } = useTemplateSceneNodeActions({
    safeUpdateConfig,
    setSelectedPropertiesLayerId,
    setSelectedPropertiesTarget,
    setActiveHighlightTarget,
    sceneCustomNodeIdPrefix: v2_SCENE_CUSTOM_NODE_ID_PREFIX,
    sceneCustomLayerIdPrefix: v2_SCENE_CUSTOM_LAYER_ID_PREFIX,
    templateColorKeys: v2_TEMPLATE_COLOR_KEYS,
  });

  const sceneCardCollectionComponentOptions = useMemo(
    () =>
      Object.values(renderConfig.graph.componentDefinitions)
        .map((definition) => ({
          value: definition.id,
          label: definition.label || definition.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [renderConfig.graph.componentDefinitions]
  );

  const dayKeyOptions = useMemo(
    () =>
      v2_TEMPLATE_DAY_KEYS.map((dayKey) => ({
        value: dayKey,
        label: `${dayKey.toUpperCase()} · ${v2_resolveDayLabelByKey({
          dayKey,
          dayLabelFormat: renderConfig.dayLabelFormat,
          fallbackWeekdayOption: renderConfig.weekdayOption,
        })}`,
      })),
    [renderConfig.dayLabelFormat, renderConfig.weekdayOption]
  );

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

  const updateDayLabelFormatMode = (mode: "preset" | "custom") => {
    safeUpdateConfig((prev) => ({
      ...prev,
      dayLabelFormat: {
        ...prev.dayLabelFormat,
        mode,
      },
    }));
  };

  const updateDayLabelFormatPreset = (preset: "kr" | "en" | "jp") => {
    safeUpdateConfig((prev) => ({
      ...prev,
      weekdayOption: preset,
      dayLabelFormat: {
        ...prev.dayLabelFormat,
        preset,
      },
    }));
  };

  const updateDayLabelCustomLabel = (dayKey: V2TemplateDayKey, value: string) => {
    safeUpdateConfig((prev) => {
      const nextCustom: Partial<Record<V2TemplateDayKey, string>> = {
        ...prev.dayLabelFormat.custom,
      };
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        delete nextCustom[dayKey];
      } else {
        nextCustom[dayKey] = trimmed;
      }
      return {
        ...prev,
        dayLabelFormat: {
          ...prev.dayLabelFormat,
          custom: nextCustom,
        },
      };
    });
  };

  const {
    newFieldDraftByNodeId,
    updateNodeNewFieldDraft,
    createFieldForCardNodeBinding,
    createFieldForSceneNodeBinding,
  } = useTemplateNodeBindingFieldActions({
    appendFormField,
    setFormSchemaError,
    onBindCardNodeField: (nodeId, field) => {
      updateCardNodeBinding(nodeId, {
        mode: "field",
        scope: field.scope,
        key: field.key,
      });
    },
    onBindSceneNodeField: (nodeId, field) => {
      updateSceneTextNodeBinding(nodeId, {
        mode: "field",
        scope: field.scope,
        key: field.key,
      });
    },
  });

  const {
    firstCard,
    firstEntry,
    updateFirstEntryField,
    updateFirstCardField,
    updateGlobalSampleField,
    updateFirstDayOffline,
  } = useTemplateSampleDataActions({
    data,
    updateData,
    globalData,
    updateGlobalData,
  });

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

  const applySelectedPreset = () => {
    const presetDefinition = v2_TEMPLATE_PRESET_DEFINITIONS.find(
      (preset) => preset.id === selectedPresetId
    );
    if (!presetDefinition) return;

    safeUpdateConfig((prev) =>
      v2_applyTemplatePreset({
        current: prev,
        preset: presetDefinition.createConfig(),
      })
    );
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

  const renderStyleTab = () => (
    <TemplateStyleTab
      inspectorRef={inspectorTabRef}
      onMouseLeave={clearSectionHoverHighlight}
      onBlurOutside={() => setActiveHighlightTarget(null)}
    >
      <TemplateStylePresetControls
        presetOptions={v2_TEMPLATE_PRESET_DEFINITIONS.map((preset) => ({
          id: preset.id,
          label: preset.label,
          description: preset.description,
        }))}
        selectedPresetId={selectedPresetId}
        onChangePresetId={setSelectedPresetId}
        onApplyPreset={applySelectedPreset}
      />
      <TemplateStyleThemeSettings
        renderConfig={renderConfig}
        colorKeys={v2_TEMPLATE_COLOR_KEYS}
        baseFontTokenKeys={v2_BASE_FONT_TOKEN_KEYS}
        fontDisplayOptions={v2_FONT_DISPLAY_OPTIONS}
        fontStyleOptions={v2_FONT_STYLE_OPTIONS}
        fontFormatOptions={v2_FONT_FORMAT_OPTIONS}
        dayKeyOptions={dayKeyOptions}
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
        onUpdateDayLabelMode={updateDayLabelFormatMode}
        onUpdateDayLabelPreset={updateDayLabelFormatPreset}
        onUpdateDayLabelCustomLabel={updateDayLabelCustomLabel}
      />
    </TemplateStyleTab>
  );

  const {
    renderSceneNodeStructureControls,
    renderSceneAssetNodeProperties,
    renderSceneGroupNodeProperties,
    renderSceneCardCollectionProperties,
    renderSceneComponentInstanceProperties,
  } = useTemplateSceneNodePropertyPanels({
    assetKeys: v2_ASSET_KEYS,
    assetLabels: v2_ASSET_LABELS,
    sceneCardCollectionComponentOptions,
    dayKeyOptions,
    visibilityOptions: v2_CARD_NODE_VISIBILITY_OPTIONS,
    isSceneCustomNode,
    renderStyleSectionEditor: ({ title, section }) =>
      renderStyleSectionEditor({
        title,
        section: section as V2StyleSectionId,
      }),
    onMoveSceneNode: moveSceneNode,
    onRelocateSceneNode: relocateSceneNode,
    getSceneNodeParentId: (nodeId) => sceneNodeParentIdById[nodeId] ?? null,
    getSceneGroupParentOptions: (nodeId) => {
      const descendantIds = sceneNodeDescendantIdsById[nodeId] ?? new Set<string>();
      return sceneGroupParentOptions.filter((option) => {
        if (option.value === null) return true;
        if (option.value === nodeId) return false;
        if (descendantIds.has(option.value)) return false;
        return true;
      });
    },
    onRemoveSceneNode: removeSceneNode,
    onAddSceneSiblingNode: addSceneSiblingNode,
    onAddSceneChildNode: addSceneChildNode,
    onUpdateSceneNodeLabel: updateSceneNodeLabel,
    onUpdateSceneAssetNodeMeta: updateSceneAssetNodeMeta,
    onUpdateSceneNodeVisibilityMode: updateSceneNodeVisibilityMode,
    onUpdateSceneCardCollectionComponentId: updateSceneCardCollectionComponentId,
    onSyncSceneCardCollectionChildComponentIds:
      syncSceneCardCollectionChildComponentIds,
    formFields: renderConfig.formSchema.fields,
    computedOptions: v2_BINDING_COMPUTED_OPTIONS,
    parseBindingFromSelectValue: v2_parseNodeBindingFromSelectValue,
    getComponentBindableNodes: (componentId) => {
      const structure = runtimeCardStructuresByComponentId[componentId];
      if (!structure) return [];
      return structure.nodeOrder
        .map((nodeId) => structure.nodes[nodeId])
        .filter((node): node is V2TemplateCardNode => Boolean(node));
    },
    onUpdateSceneComponentInstanceDayKey: updateSceneComponentInstanceDayKey,
    onUpdateSceneComponentInstanceInstanceId:
      updateSceneComponentInstanceInstanceId,
    onUpdateSceneComponentInstanceComponentId:
      updateSceneComponentInstanceComponentId,
    onUpdateSceneComponentInstanceBindingOverride:
      updateSceneComponentInstanceBindingOverride,
    onRemoveSceneComponentInstanceBindingOverride:
      removeSceneComponentInstanceBindingOverride,
    onExtractSceneComponentInstanceCopy: ({ nodeId }) =>
      extractSceneComponentInstanceCopy({ nodeId }),
    onMoveSceneComponentInstanceToRoot: (nodeId) =>
      relocateSceneNode({
        nodeId,
        targetParentId: null,
      }),
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
      parseBindingFromSelectValue: v2_parseNodeBindingFromSelectValue,
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
    editorMode: selectedPropertiesEditorMode,
    cardContainerSectionKey:
      activeCardStructure?.containerStyleKey ?? "cardContainer",
    cardInstanceMode: activeCardStructure?.instanceMode ?? "component",
    cardInstanceTransforms: activeCardStructure?.instanceTransforms ?? {},
    cardComponentInstances: activeCardComponentInstances,
    cardComponentInstanceDiagnostics: activeCardComponentInstanceDiagnostics,
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
      editorMode={selectedPropertiesEditorMode}
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
        renderSceneComponentInstanceProperties={renderSceneComponentInstanceProperties}
        renderSimplePropertiesSection={renderSimplePropertiesSection}
      />
    </TemplatePropertiesTab>
  );

  return (
    <div className="h-full min-h-0 w-full">
      <div className="v2-dark-form-theme h-full min-h-0 shrink-0 flex flex-col border-l border-[#303848] bg-gray-100 w-full">
        <TemplateBuilderTabs
          tabs={v2_BUILDER_TABS.map((tab) => ({ ...tab }))}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />
        <div className="flex-1 overflow-y-auto p-4 h-full bg-timetable-form-bg">
          <TemplatePropertiesTabsRenderer
            activeTab={activeTab}
            renderConfig={renderConfig}
            currentTheme={currentTheme}
            themeOptions={themeOptions}
            assetTheme={assetTheme}
            setAssetTheme={setAssetTheme}
            preferProfileDummyImage={preferProfileDummyImage}
            formSchemaError={formSchemaError}
            formSchemaDiagnostics={formSchemaDiagnostics}
            copyState={copyState}
            entryValues={(firstEntry ?? {}) as Record<string, unknown>}
            cardValues={(firstCard ?? {}) as Record<string, unknown>}
            globalValues={globalData as Record<string, unknown>}
            isOffline={Boolean(firstCard?.isOffline)}
            fields={renderConfig.formSchema.fields}
            computedKeys={v2_BINDING_COMPUTED_OPTIONS}
            scopeOptions={v2_FORM_FIELD_SCOPE_OPTIONS}
            typeOptions={v2_FORM_FIELD_TYPE_OPTIONS}
            assetKeys={v2_ASSET_KEYS}
            assetLabels={v2_ASSET_LABELS}
            renderPropertiesTab={renderPropertiesTab}
            renderStyleTab={renderStyleTab}
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
            onAppendSchemaField={() =>
              appendFormField({
                key: "",
                scope: "entry",
                type: "text",
                placeholder: "새 필드",
              })
            }
            onRemoveSchemaField={removeFormFieldAt}
            onUpdateSchemaField={updateFormFieldAt}
            onTogglePreferProfileDummyImage={updatePreferProfileDummyImage}
            onUploadAssetFile={handleAssetFileUpload}
            onResetAsset={(key, theme) => updateAssetUrl(key, theme, "", null)}
            onChangeDataField={(scope, key, value) => {
              if (scope === "entry") {
                updateFirstEntryField(key, value);
                return;
              }
              if (scope === "card") {
                updateFirstCardField(key, value);
                return;
              }
              updateGlobalSampleField(key, value);
            }}
            onToggleOffline={updateFirstDayOffline}
            onCopyJson={handleCopyJson}
            onDownloadPreview={() =>
              downloadImage(
                renderConfig.templateSize.width,
                renderConfig.templateSize.height
              )
            }
            onResetData={resetData}
          />
        </div>
      </div>
      {renderBoilerplateSettingsModal()}
    </div>
  );
};

export default V2TemplateBuilderForm;
