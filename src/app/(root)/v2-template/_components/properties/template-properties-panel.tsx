import React, { useMemo, useRef, useState } from "react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  useTemplateEditorActions,
  useTemplateEditorData,
} from "@/contexts/v2/template-editor-ui-context";
import {
  V2TemplateCardNode,
  V2TemplateRenderConfig,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { V2TemplateHighlightTarget } from "@/types/time-table/template-editor-ui";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getDefaultCardComponentId,
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import {
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
  v2_collectStructureTargetSectionMaps,
} from "./model/structure-utils";
import { v2_collectFormSchemaDiagnostics } from "./model/form-schema-diagnostics";
import {
  v2_parseNodeBindingFromSelectValue,
} from "./model/binding-utils";
import {
  v2_createStyleKeyToSectionKeyMap,
  v2_isKnownStyleSectionKey,
  v2_parseStyleSectionKey,
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
import useTemplateNodeBindingFieldActions from "./hooks/use-template-node-binding-field-actions";
import useTemplateSampleDataActions from "./hooks/use-template-sample-data-actions";
import useTemplateThemeAssetActions from "./hooks/use-template-theme-asset-actions";

interface V2TemplateBuilderFormProps {
  focusLayerId?: string | null;
  focusLayerNonce?: number;
  focusStyleSection?: string | null;
  focusStyleSectionNonce?: number;
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
  const [selectedPropertiesTarget, setSelectedPropertiesTarget] =
    useState<V2TemplateHighlightTarget>("grid");
  const [selectedPropertiesLayerId, setSelectedPropertiesLayerId] =
    useState<string>("grid");
  const defaultCardComponentId = useMemo(
    () => v2_getDefaultCardComponentId(renderConfig),
    [renderConfig]
  );
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
    if (!next[defaultCardComponentId]) {
      next[defaultCardComponentId] = v2_getRuntimeCardStructureByComponentId(
        renderConfig,
        defaultCardComponentId
      );
    }
    return next;
  }, [defaultCardComponentId, renderConfig]);
  const runtimeCardStructure = useMemo(
    () =>
      runtimeCardStructuresByComponentId[defaultCardComponentId] ??
      v2_getRuntimeCardStructure(renderConfig),
    [defaultCardComponentId, renderConfig, runtimeCardStructuresByComponentId]
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
      return defaultCardComponentId;
    }

    const cardNodeComponentId =
      cardNodeComponentIdByLayerId.get(selectedPropertiesLayerId);
    if (cardNodeComponentId) return cardNodeComponentId;

    const rootLayerComponentId =
      componentIdByRootLayerId.get(selectedPropertiesLayerId);
    if (rootLayerComponentId) return rootLayerComponentId;

    return defaultCardComponentId;
  }, [
    cardNodeComponentIdByLayerId,
    componentIdByRootLayerId,
    defaultCardComponentId,
    runtimeCardStructuresByComponentId,
    sceneNodeByLayerId,
    selectedPropertiesLayerId,
  ]);
  const activeCardStructure = useMemo(
    () =>
      runtimeCardStructuresByComponentId[activeCardComponentId] ??
      runtimeCardStructure,
    [activeCardComponentId, runtimeCardStructure, runtimeCardStructuresByComponentId]
  );
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
    const next: Record<string, string | null> = {};
    const visit = (
      nodes: typeof runtimeSceneNodes,
      parentId: string | null
    ) => {
      nodes.forEach((node) => {
        next[node.id] = parentId;
        if (node.kind === "group") {
          visit(node.children, node.id);
        }
      });
    };
    visit(runtimeSceneNodes, null);
    return next;
  }, [runtimeSceneNodes]);
  const sceneNodeDescendantIdsById = useMemo(() => {
    const next: Record<string, Set<string>> = {};

    const collectDescendants = (node: (typeof runtimeSceneNodes)[number]): Set<string> => {
      if (node.kind !== "group") {
        next[node.id] = new Set();
        return next[node.id];
      }

      const descendants = new Set<string>();
      node.children.forEach((child) => {
        descendants.add(child.id);
        const childDescendants = collectDescendants(child);
        childDescendants.forEach((id) => descendants.add(id));
      });
      next[node.id] = descendants;
      return descendants;
    };

    runtimeSceneNodes.forEach((rootNode) => {
      collectDescendants(rootNode);
    });

    return next;
  }, [runtimeSceneNodes]);
  const sceneGroupParentOptions = useMemo(() => {
    const options: Array<{ value: string | null; label: string }> = [
      { value: null, label: "(루트)" },
    ];

    const visit = (nodes: typeof runtimeSceneNodes, depth: number) => {
      nodes.forEach((node) => {
        if (node.kind !== "group") return;
        options.push({
          value: node.id,
          label: `${"  ".repeat(depth)}${node.label}`,
        });
        visit(node.children, depth + 1);
      });
    };

    visit(runtimeSceneNodes, 0);
    return options;
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
    isSceneCustomNode,
    addSceneSiblingNode,
    addSceneChildNode,
    moveSceneNode,
    relocateSceneNode,
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
    sceneCardCollectionComponentOptions,
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
    cardInstanceMode: activeCardStructure.instanceMode ?? "component",
    cardInstanceTransforms: activeCardStructure.instanceTransforms ?? {},
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
      fields={renderConfig.formSchema.fields}
      entryValues={(firstEntry ?? {}) as Record<string, unknown>}
      cardValues={(firstCard ?? {}) as Record<string, unknown>}
      globalValues={globalData as Record<string, unknown>}
      isOffline={Boolean(firstCard?.isOffline)}
      onChangeField={(scope, key, value) => {
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
          tabs={v2_BUILDER_TABS.map((tab) => ({ ...tab }))}
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
