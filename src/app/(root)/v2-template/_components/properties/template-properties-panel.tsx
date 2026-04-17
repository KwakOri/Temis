import React, { useEffect, useMemo, useRef, useState } from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  useTemplateRuntimeActions,
  useTemplateRuntimeData,
} from "@/contexts/v2/template-runtime-ui-context";
import {
  V2TemplateCardNode,
  V2TemplateDayKey,
  V2TemplateRenderConfig,
  v2_TEMPLATE_DAY_KEYS,
  v2_TEMPLATE_COLOR_KEYS,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeLayerTree } from "@/utils/v2/template-graph-layers-runtime";
import { v2_getRuntimeComponentLayerTreeNodes } from "@/utils/v2/template-graph-component-layers-runtime";
import { v2_graphInsertSiblingAfter, v2_graphUpdateNode } from "@/utils/v2/template-graph-editor";
import {
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from "@/utils/v2/template-graph-runtime";
import { v2_resolveDayLabelByKey } from "@/utils/v2/template-render-config";
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
  onRequestClose?: () => void;
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
  onRequestClose,
}) => {
  const { templateId, renderConfig, setRenderConfig } = useTemplateRenderConfigContext();
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
  } = useTemplateRuntimeContext();
  const { downloadImage } = useTemplateRuntimeActions();
  const { preferProfileDummyImage, updatePreferProfileDummyImage } =
    useTemplateRuntimeData();

  const [activeTab, setActiveTab] = useState<V2BuilderTabId>("properties");
  const [sampleEntryIndex, setSampleEntryIndex] = useState(0);
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
  const styleInspectorRef = useRef<HTMLDivElement | null>(null);
  const propertiesInspectorRef = useRef<HTMLDivElement | null>(null);
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
  const runtimeComponentLayerTreeNodes = useMemo(
    () => v2_getRuntimeComponentLayerTreeNodes(renderConfig),
    [renderConfig]
  );
  const {
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
    runtimeComponentLayerTrees: runtimeComponentLayerTreeNodes,
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
      streamingDayFormat: renderConfig.streamingDayFormat,
      weekdayOption: renderConfig.weekdayOption,
      additionalInstanceIds: Object.keys(
        activeCardStructure?.instanceTransforms ?? {}
      ),
    });
  }, [
    activeCardComponentId,
    activeCardStructure?.instanceTransforms,
    renderConfig.dayLabelFormat,
    renderConfig.streamingDayFormat,
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
    return allRuntimeCardNodes
      .filter((node) => node.kind !== "image")
      .map((node) => node.label);
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
    inspectorRefs: [styleInspectorRef, propertiesInspectorRef],
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
  });
  useEffect(() => {
    if (!focusLayerId) return;
    setActiveTab("properties");
    setSelectedPropertiesEditorMode(focusEditorMode);
  }, [
    setActiveTab,
    focusEditorMode,
    focusLayerId,
    focusLayerNonce,
    setSelectedPropertiesEditorMode,
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

  const maxSampleEntryCount = useMemo(() => {
    const configured = Math.max(
      1,
      Math.min(2, Number(renderConfig.editorOptions?.maxStreamingTimeByDay ?? 1))
    );
    return renderConfig.editorOptions?.isMultiple ? configured : 1;
  }, [
    renderConfig.editorOptions?.isMultiple,
    renderConfig.editorOptions?.maxStreamingTimeByDay,
  ]);

  const clampDataEntriesByMaxCount = (maxEntries: number) => {
    const safeMax = Math.max(1, maxEntries);
    let hasChanges = false;
    const nextData = data.map((card) => {
      const sourceEntries = Array.isArray(card.entries) ? card.entries : [];
      let nextEntries = sourceEntries;
      if (sourceEntries.length === 0) {
        nextEntries = [
          {
            time: "10:00",
            mainTitle: "",
            subTitle: "",
            isGuerrilla: false,
          },
        ];
      } else if (sourceEntries.length > safeMax) {
        nextEntries = sourceEntries.slice(0, safeMax);
      }

      if (nextEntries !== sourceEntries) {
        hasChanges = true;
        return {
          ...card,
          entries: nextEntries,
        };
      }

      return card;
    });

    if (hasChanges) {
      updateData(nextData);
    }
  };

  const updateIsMultiple = (enabled: boolean) => {
    safeUpdateConfig((prev) => {
      const currentMax = Math.max(
        1,
        Math.min(2, Number(prev.editorOptions?.maxStreamingTimeByDay ?? 1))
      );
      return {
        ...prev,
        editorOptions: {
          ...prev.editorOptions,
          isMultiple: enabled,
          maxStreamingTimeByDay: enabled ? (currentMax > 1 ? currentMax : 2) : 1,
        },
      };
    });
    if (!enabled) {
      clampDataEntriesByMaxCount(1);
    }
  };

  const updateMaxStreamingTimeByDay = (value: number) => {
    const normalized = value >= 2 ? 2 : 1;
    safeUpdateConfig((prev) => ({
      ...prev,
      editorOptions: {
        ...prev.editorOptions,
        maxStreamingTimeByDay: normalized,
        isMultiple: normalized > 1,
      },
    }));
    clampDataEntriesByMaxCount(normalized);
  };

  const applyEntryCountVisibilityPreset = () => {
    safeUpdateConfig((prev) => {
      const nextNodes = {
        ...prev.graph.nodes,
      };
      let hasChanges = false;

      const updateNode = (
        nodeId: string,
        patch: Partial<(typeof nextNodes)[string]>
      ) => {
        const currentNode = nextNodes[nodeId];
        if (!currentNode) return;
        const nextNode = {
          ...currentNode,
          ...patch,
        };
        if (JSON.stringify(currentNode) === JSON.stringify(nextNode)) return;
        nextNodes[nodeId] = nextNode;
        hasChanges = true;
      };

      Object.keys(prev.graph.componentDefinitions ?? {}).forEach((componentId) => {
        const structure = v2_getRuntimeCardStructureByComponentId(prev, componentId);
        const groupedByFieldKey = new Map<string, V2TemplateCardNode[]>();

        structure.nodeOrder.forEach((nodeId) => {
          const node = structure.nodes[nodeId];
          if (!node) return;
          if (node.binding.mode !== "field" || node.binding.scope !== "entry") return;
          const groupKey = `${node.binding.scope}:${node.binding.key}:${node.kind}`;
          const prevGroup = groupedByFieldKey.get(groupKey) ?? [];
          prevGroup.push(node);
          groupedByFieldKey.set(groupKey, prevGroup);
        });

        groupedByFieldKey.forEach((nodes) => {
          if (nodes.length < 2) return;
          nodes.forEach((node, index) => {
            const sourceGraphNode = nextNodes[node.id];
            if (!sourceGraphNode) return;
            if (!sourceGraphNode.binding || sourceGraphNode.binding.mode !== "field") {
              return;
            }
            const entrySelectorIndex = index === 0 ? 0 : 1;
            updateNode(node.id, {
              visibilityMode: index === 0 ? "onlineSingleOnly" : "onlineMultipleOnly",
              binding: {
                ...sourceGraphNode.binding,
                entrySelector: {
                  mode: "index",
                  index: entrySelectorIndex,
                },
              },
            });
          });
        });
      });

      if (!hasChanges) return prev;
      return {
        ...prev,
        graph: {
          ...prev.graph,
          nodes: nextNodes,
        },
      };
    });
  };

  const autoGenerateEntryCountNodes = () => {
    safeUpdateConfig((prev) => {
      const activeComponentIdCandidate = activeCardComponentId?.trim();
      if (!activeComponentIdCandidate) return prev;
      const activeComponentDefinition =
        prev.graph.componentDefinitions[activeComponentIdCandidate];
      if (!activeComponentDefinition) return prev;

      const runtimeCardStructure = v2_getRuntimeCardStructureByComponentId(
        prev,
        activeComponentIdCandidate
      );
      const groupedByFieldKey = new Map<string, V2TemplateCardNode[]>();
      runtimeCardStructure.nodeOrder.forEach((nodeId) => {
        const node = runtimeCardStructure.nodes[nodeId];
        if (!node) return;
        if (node.binding.mode !== "field" || node.binding.scope !== "entry") return;
        const groupKey = `${node.binding.scope}:${node.binding.key}:${node.kind}`;
        const prevGroup = groupedByFieldKey.get(groupKey) ?? [];
        prevGroup.push(node);
        groupedByFieldKey.set(groupKey, prevGroup);
      });

      let nextGraph = prev.graph;
      const nextCardLayout = {
        ...prev.layout.card,
      };
      const usedNodeIds = new Set(Object.keys(nextGraph.nodes));
      const usedLayerIds = new Set(
        Object.values(nextGraph.nodes)
          .map((node) => node.layerId)
          .filter((value): value is string => typeof value === "string")
      );
      const usedStyleKeys = new Set(Object.keys(nextCardLayout));
      const usedHighlightTargets = new Set(
        Object.values(nextGraph.nodes)
          .map((node) => node.highlightTarget)
          .filter((value): value is string => typeof value === "string")
      );
      let hasChanges = false;

      const makeUnique = (base: string, used: Set<string>): string => {
        const safeBase = base.trim().length > 0 ? base.trim() : "node";
        if (!used.has(safeBase)) {
          used.add(safeBase);
          return safeBase;
        }
        let suffix = 2;
        let next = `${safeBase}-${suffix}`;
        while (used.has(next)) {
          suffix += 1;
          next = `${safeBase}-${suffix}`;
        }
        used.add(next);
        return next;
      };

      const cloneStyleKey = (sourceStyleKey?: string): string | undefined => {
        if (!sourceStyleKey || !sourceStyleKey.trim()) return undefined;
        const nextStyleKey = makeUnique(`${sourceStyleKey}:multi`, usedStyleKeys);
        const sourceStyle = nextCardLayout[sourceStyleKey];
        if (sourceStyle && typeof sourceStyle === "object") {
          nextCardLayout[nextStyleKey] = {
            ...(sourceStyle as Record<string, unknown>),
          } as (typeof nextCardLayout)[string];
        } else {
          nextCardLayout[nextStyleKey] = {} as (typeof nextCardLayout)[string];
        }
        return nextStyleKey;
      };

      const updateEntryNodeMode = ({
        nodeId,
        visibilityMode,
        entryIndex,
      }: {
        nodeId: string;
        visibilityMode: "onlineSingleOnly" | "onlineMultipleOnly";
        entryIndex: number;
      }) => {
        const currentNode = nextGraph.nodes[nodeId];
        if (!currentNode || currentNode.binding?.mode !== "field") return;
        if (currentNode.binding.scope !== "entry") return;
        const currentEntryIndex =
          currentNode.binding.entrySelector?.mode === "index"
            ? currentNode.binding.entrySelector.index
            : 0;
        if (
          currentNode.visibilityMode === visibilityMode &&
          currentEntryIndex === entryIndex
        ) {
          return;
        }
        nextGraph = v2_graphUpdateNode(nextGraph, nodeId, (node) => {
          if (!node.binding || node.binding.mode !== "field") return node;
          if (node.binding.scope !== "entry") return node;
          return {
            ...node,
            visibilityMode,
            binding: {
              ...node.binding,
              entrySelector: {
                mode: "index",
                index: entryIndex,
              },
            },
          };
        });
        hasChanges = true;
      };

      groupedByFieldKey.forEach((nodes) => {
        if (nodes.length === 0) return;

        const sourceNode = nodes[0];
        updateEntryNodeMode({
          nodeId: sourceNode.id,
          visibilityMode: "onlineSingleOnly",
          entryIndex: 0,
        });

        if (nodes.length >= 2) {
          nodes.slice(1).forEach((node) => {
            updateEntryNodeMode({
              nodeId: node.id,
              visibilityMode: "onlineMultipleOnly",
              entryIndex: 1,
            });
          });
          return;
        }

        const sourceGraphNode = nextGraph.nodes[sourceNode.id];
        if (!sourceGraphNode || sourceGraphNode.parentId === null) return;
        if (!sourceGraphNode.binding || sourceGraphNode.binding.mode !== "field") return;
        if (sourceGraphNode.binding.scope !== "entry") return;

        const nextNodeId = makeUnique(`${sourceGraphNode.id}-multi`, usedNodeIds);
        const nextLayerId = makeUnique(
          `${sourceGraphNode.layerId ?? sourceGraphNode.id}-multi`,
          usedLayerIds
        );
        const nextContainerStyleKey = cloneStyleKey(
          sourceGraphNode.styles?.containerStyleKey
        );
        const nextTextStyleKey = cloneStyleKey(sourceGraphNode.styles?.textStyleKey);
        const nextWrapperStyleKey = cloneStyleKey(
          sourceGraphNode.styles?.wrapperStyleKey
        );
        const nextOptionsKey = cloneStyleKey(sourceGraphNode.styles?.optionsKey);
        const nextHighlightTarget = makeUnique(
          `${sourceGraphNode.highlightTarget ?? `cardNode:${nextNodeId}`}:multi`,
          usedHighlightTargets
        );

        const nextNode = {
          ...sourceGraphNode,
          id: nextNodeId,
          label: `${sourceGraphNode.label} (2)`,
          layerId: nextLayerId,
          highlightTarget: nextHighlightTarget,
          visibilityMode: "onlineMultipleOnly" as const,
          binding: {
            ...sourceGraphNode.binding,
            entrySelector: {
              mode: "index" as const,
              index: 1,
            },
          },
          childIds: [],
          styles: {
            ...(sourceGraphNode.styles ?? {}),
            ...(nextContainerStyleKey
              ? { containerStyleKey: nextContainerStyleKey }
              : {}),
            ...(nextTextStyleKey ? { textStyleKey: nextTextStyleKey } : {}),
            ...(nextWrapperStyleKey ? { wrapperStyleKey: nextWrapperStyleKey } : {}),
            ...(nextOptionsKey ? { optionsKey: nextOptionsKey } : {}),
          },
          meta: {
            ...(sourceGraphNode.meta ?? {}),
            layerTarget: nextHighlightTarget,
            ...(nextContainerStyleKey
              ? { layerSectionKey: nextContainerStyleKey }
              : {}),
          },
        };

        nextGraph = v2_graphInsertSiblingAfter({
          graph: nextGraph,
          anchorNodeId: sourceGraphNode.id,
          newNode: nextNode,
        });
        hasChanges = true;
      });

      if (!hasChanges) return prev;
      return {
        ...prev,
        graph: nextGraph,
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
      };
    });
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
    updateCardImageNodeAssetRef,
    updateCardImageNodeAssetRefByDayKey,
    updateCardImageNodeFit,
    updateCardImageNodeAlt,
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
          streamingDayFormat: renderConfig.streamingDayFormat,
          fallbackWeekdayOption: renderConfig.weekdayOption,
        })}`,
      })),
    [
      renderConfig.dayLabelFormat,
      renderConfig.streamingDayFormat,
      renderConfig.weekdayOption,
    ]
  );

  const {
    parseFontWeightInput,
    addFontRegistryItem,
    removeFontRegistryItem,
    syncFontRegistryKeyWithFamily,
    applyFontFaceCssSnippet,
    updateBaseFontToken,
    updateFontRegistryMeta,
    addFontFace,
    updateFontFace,
    removeFontFace,
    updateColor,
    updateComponentFont,
    updateAssetUrl,
    updateExtraAssetUrl,
    addExtraAssetKey,
    removeExtraAssetKey,
    handleAssetFileUpload,
    handleExtraAssetFileUpload,
    uploadBulkAssetFiles,
  } = useTemplateThemeAssetActions({
    safeUpdateConfig,
    templateId: templateId ?? null,
  });

  const updateStreamingDayFormat = (
    patch: Partial<V2TemplateRenderConfig["streamingDayFormat"]>
  ) => {
    safeUpdateConfig((prev) => {
      const nextStreamingDayFormat = {
        ...prev.streamingDayFormat,
        ...patch,
      };
      const nextWeekdayOption = patch.locale ?? prev.weekdayOption;
      return {
        ...prev,
        weekdayOption: nextWeekdayOption,
        dayLabelFormat: {
          ...prev.dayLabelFormat,
          preset: nextWeekdayOption,
          custom: nextStreamingDayFormat.custom,
        },
        streamingDayFormat: nextStreamingDayFormat,
      };
    });
  };

  const updateStreamingDayCustomLabel = (dayKey: V2TemplateDayKey, value: string) => {
    safeUpdateConfig((prev) => {
      const nextCustom: Partial<Record<V2TemplateDayKey, string>> = {
        ...prev.streamingDayFormat.custom,
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
        streamingDayFormat: {
          ...prev.streamingDayFormat,
          custom: nextCustom,
        },
      };
    });
  };

  const updateStreamingTimeFormat = (
    patch: Partial<V2TemplateRenderConfig["streamingTimeFormat"]>
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      streamingTimeFormat: {
        ...prev.streamingTimeFormat,
        ...patch,
      },
    }));
  };

  const updateWeekDateFormat = (
    patch: Partial<V2TemplateRenderConfig["weekDateFormat"]>
  ) => {
    safeUpdateConfig((prev) => {
      const nextWeekDateFormat = {
        ...prev.weekDateFormat,
        ...patch,
      };
      const nextMonthOption = patch.locale ?? prev.monthOption;
      return {
        ...prev,
        monthOption: nextMonthOption,
        weekDateFormat: nextWeekDateFormat,
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
    firstEntries,
    firstEntry,
    updateFirstEntryField,
    addFirstEntry,
    removeFirstEntry,
    updateFirstCardField,
    updateGlobalSampleField,
    updateFirstDayOffline,
  } = useTemplateSampleDataActions({
    data,
    updateData,
    globalData,
    updateGlobalData,
  });

  useEffect(() => {
    setSampleEntryIndex((prev) => {
      const entryCount = Math.max(1, firstEntries.length);
      const maxIndex = Math.max(0, Math.min(entryCount, maxSampleEntryCount) - 1);
      if (prev > maxIndex) return maxIndex;
      if (prev < 0) return 0;
      return prev;
    });
  }, [firstEntries.length, maxSampleEntryCount]);

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
      inspectorRef={styleInspectorRef}
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
        onSyncFontRegistryKeyWithFamily={syncFontRegistryKeyWithFamily}
        onApplyFontFaceCssSnippet={applyFontFaceCssSnippet}
        onUpdateFontRegistryMeta={updateFontRegistryMeta}
        onAddFontFace={addFontFace}
        onUpdateFontFace={updateFontFace}
        onRemoveFontFace={removeFontFace}
        parseFontWeightInput={parseFontWeightInput}
        onUpdateStreamingDayFormat={updateStreamingDayFormat}
        onUpdateStreamingDayCustomLabel={updateStreamingDayCustomLabel}
        onUpdateStreamingTimeFormat={updateStreamingTimeFormat}
        onUpdateWeekDateFormat={updateWeekDateFormat}
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
    extraAssetKeys: Object.keys(renderConfig.extraAssets ?? {}),
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
        .filter(
          (node): node is V2TemplateCardNode =>
            Boolean(node) && node.kind !== "image"
        );
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
      onRemoveCardNode: removeCardNode,
      onUpdateCardNodeMeta: updateCardNodeMeta,
      onUpdateCardImageNodeAssetRef: updateCardImageNodeAssetRef,
      onUpdateCardImageNodeAssetRefByDayKey: updateCardImageNodeAssetRefByDayKey,
      onUpdateCardImageNodeFit: updateCardImageNodeFit,
      onUpdateCardImageNodeAlt: updateCardImageNodeAlt,
      onUpdateCardNodeVisibilityMode: updateCardNodeVisibilityMode,
      onUpdateCardNodeBinding: updateCardNodeBinding,
      onUpdateNodeNewFieldDraft: updateNodeNewFieldDraft,
      onCreateFieldForCardNodeBinding: createFieldForCardNodeBinding,
      assetKeys: v2_ASSET_KEYS,
      assetLabels: v2_ASSET_LABELS,
      extraAssetKeys: Object.keys(renderConfig.extraAssets).sort((a, b) =>
        a.localeCompare(b)
      ),
      dayKeyOptions,
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
    onAppendCardImageNode: () => appendCardNode("image"),
    onUpdateCardInstanceTransform: updateCardInstanceTransform,
    renderStyleSectionEditor,
  });

  const renderPropertiesTab = () => (
    <TemplatePropertiesTab
      inspectorRef={propertiesInspectorRef}
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
        renderEmptyPropertiesPanel={() => (
          <div className="rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3 text-xs text-gray-400">
            Layers 탭에서 오브젝트를 선택하거나, 레이어 영역을 우클릭해 새 오브젝트를
            추가하세요.
          </div>
        )}
      />
    </TemplatePropertiesTab>
  );

  return (
    <div className="h-full min-h-0 w-full">
      <div className="v2-dark-form-theme h-full min-h-0 shrink-0 flex flex-col border-l border-[#303848] bg-gray-100 w-full">
        <div className="relative">
          <TemplateBuilderTabs
            tabs={v2_BUILDER_TABS.map((tab) => ({ ...tab }))}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />
          {onRequestClose ? (
            <button
              type="button"
              onClick={onRequestClose}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#3c465e] bg-[#151a24] px-2 py-1 text-xs font-semibold text-[#c9d8f8] hover:bg-[#1c2533]"
              aria-label="프로퍼티 패널 닫기"
            >
              ×
            </button>
          ) : null}
        </div>
        <div className="flex-1 min-h-0 h-full bg-timetable-form-bg overflow-y-auto p-4 pb-[60px]">
            <TemplatePropertiesTabsRenderer
              activeTab={activeTab}
              renderConfig={renderConfig}
              currentTheme={currentTheme}
              isMultiple={Boolean(renderConfig.editorOptions?.isMultiple)}
              maxStreamingTimeByDay={Math.max(
                1,
                Math.min(
                  2,
                  Number(renderConfig.editorOptions?.maxStreamingTimeByDay ?? 1)
                )
              )}
              themeOptions={themeOptions}
              assetTheme={assetTheme}
              setAssetTheme={setAssetTheme}
              preferProfileDummyImage={preferProfileDummyImage}
              formSchemaError={formSchemaError}
              formSchemaDiagnostics={formSchemaDiagnostics}
              copyState={copyState}
              entryValues={
                ((firstEntries[sampleEntryIndex] ?? firstEntry) ?? {}) as Record<
                  string,
                  unknown
                >
              }
              entryCount={Math.max(1, firstEntries.length)}
              selectedEntryIndex={sampleEntryIndex}
              maxEntryCount={maxSampleEntryCount}
              cardValues={(firstCard ?? {}) as Record<string, unknown>}
              globalValues={globalData as Record<string, unknown>}
              isOffline={Boolean(firstCard?.isOffline)}
              fields={renderConfig.formSchema.fields}
              computedKeys={v2_BINDING_COMPUTED_OPTIONS}
              scopeOptions={v2_FORM_FIELD_SCOPE_OPTIONS}
              typeOptions={v2_FORM_FIELD_TYPE_OPTIONS}
              assetKeys={v2_ASSET_KEYS}
              assetLabels={v2_ASSET_LABELS}
              extraAssetKeys={Object.keys(renderConfig.extraAssets ?? {})}
              renderStyleTab={renderStyleTab}
              renderPropertiesTab={renderPropertiesTab}
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
              onToggleMultiple={updateIsMultiple}
              onChangeMaxStreamingTimeByDay={updateMaxStreamingTimeByDay}
              onApplyEntryCountVisibilityPreset={applyEntryCountVisibilityPreset}
              onAutoGenerateEntryCountNodes={autoGenerateEntryCountNodes}
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
              onCreateExtraAssetKey={(key) =>
                addExtraAssetKey(key, renderConfig.themes)
              }
              onRemoveExtraAssetKey={removeExtraAssetKey}
              onUploadExtraAssetFile={handleExtraAssetFileUpload}
              onResetExtraAsset={(key, theme) =>
                updateExtraAssetUrl(key, theme, "", null)
              }
              onUploadBulkAssetFiles={uploadBulkAssetFiles}
              onChangeDataField={(scope, key, value) => {
                if (scope === "entry") {
                  updateFirstEntryField(sampleEntryIndex, key, value);
                  return;
                }
                if (scope === "card") {
                  updateFirstCardField(key, value);
                  return;
                }
                updateGlobalSampleField(key, value);
              }}
              onToggleOffline={updateFirstDayOffline}
              onSelectEntryIndex={setSampleEntryIndex}
              onAddEntry={() => {
                const currentCount = Math.max(1, firstEntries.length);
                if (currentCount >= maxSampleEntryCount) return;
                addFirstEntry(maxSampleEntryCount);
                setSampleEntryIndex(currentCount);
              }}
              onRemoveEntry={(entryIndex) => {
                if (firstEntries.length <= 1) return;
                removeFirstEntry(entryIndex);
                setSampleEntryIndex((prev) =>
                  Math.max(0, prev >= entryIndex ? prev - 1 : prev)
                );
              }}
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
