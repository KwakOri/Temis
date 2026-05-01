import React, { useEffect, useMemo, useRef, useState } from "react";

import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRenderConfigContext } from "@/contexts/v2/template-render-config-context";
import {
  useTemplateRuntimeActions,
  useTemplateRuntimeData,
} from "@/contexts/v2/template-runtime-ui-context";
import {
  V2TemplateAssetRef,
  V2TemplateCardFrameNode,
  V2TemplateBuiltinAssetKey,
  V2TemplateCardInstanceTransform,
  V2TemplateCardNode,
  V2TemplateCardNodeBinding,
  V2TemplateCardNodeKind,
  V2TemplateCardStructure,
  V2TemplateColorKey,
  V2TemplateDayKey,
  V2TemplateFontKey,
  V2TemplateRenderConfig,
  V2TemplateStyleRecord,
  V2TemplateTimetableCardStatusKey,
  V2TemplateTimetableFlex42Align,
  V2TemplateTimetableFlex42ThreeRow,
  V2TemplateTimetableGridLayoutMode,
  V2TemplateVisibilityMode,
  v2_TEMPLATE_DAY_KEYS,
  v2_TEMPLATE_COLOR_KEYS,
  v2_TIMETABLE_CARD_STATUS_KEYS,
} from "@/types/time-table/template-render-config";
import type {
  V2TemplateEditorSceneUnitScope,
  V2TemplateEditorStatefulSceneScope,
  V2TemplateEditorTimetableComponentScope,
} from "@/types/time-table/template-editor-ui";
import { v2_getRuntimeLayerTree } from "@/utils/v2/template-graph-layers-runtime";
import { v2_getRuntimeComponentLayerTreeNodes } from "@/utils/v2/template-graph-component-layers-runtime";
import { v2_graphInsertSiblingAfter, v2_graphUpdateNode } from "@/utils/v2/template-graph-editor";
import {
  v2_getRuntimeCardStructureByComponentId,
  v2_getRuntimeSceneNodes,
} from "@/utils/v2/template-graph-runtime";
import {
  v2_buildCardInstanceNodeLayerId,
  v2_resolveCardStatusGroupKey,
} from "@/utils/v2/card-instance-highlight-target";
import {
  v2_clampTimetableMultiEntryCount,
  v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT,
  v2_resolveDayLabelByKey,
  v2_withScopedTimetableStyles,
} from "@/utils/v2/template-render-config";
import { v2_findTimetableCardObjectIdByLayerId } from "@/utils/v2/timetable-component-layer-tree";
import { v2_DEFAULT_STYLE_SECTION_BOILERPLATES } from "./model/default-style-section-boilerplates";
import {
  v2_collectSceneNodeStyleKeys,
  v2_collectSceneNodesByLayerId,
  v2_collectSceneTextNodes,
} from "./model/structure-utils";
import { v2_collectFormSchemaDiagnostics } from "./model/form-schema-diagnostics";
import {
  v2_getNodeBindingSelectValue,
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
import { v2_getGridEmptySlotsFromMap } from "./model/layout-utils";
import {
  v2_applyTemplatePreset,
  v2_TEMPLATE_PRESET_DEFINITIONS,
} from "./model/template-presets";
import {
  v2_ASSET_KEYS,
  v2_ASSET_LABELS,
  v2_BASE_FONT_TOKEN_KEYS,
  v2_BINDING_COMPUTED_OPTIONS,
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
  v2_OBJECT_STYLE_SCHEMA_SECTIONS,
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
import {
  v2_createDefaultTextNodeLayoutPatch,
  v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME,
  v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
} from "./model/text-node-defaults";
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
  timetableComponentEditScope?: V2TemplateEditorTimetableComponentScope | null;
  timetableGridEditScope?: boolean;
  sceneUnitEditScope?: V2TemplateEditorSceneUnitScope | null;
  statefulSceneEditScope?: V2TemplateEditorStatefulSceneScope | null;
  onEnterTimetableGridEditScope?: () => void;
  onExitTimetableGridEditScope?: () => void;
  onEnterSceneUnitEditScope?: (scope: V2TemplateEditorSceneUnitScope) => void;
  onExitSceneUnitEditScope?: () => void;
  onEnterTimetableComponentEditScope?: (
    scope?: Partial<V2TemplateEditorTimetableComponentScope>
  ) => void;
  onChangeTimetableComponentEditScope?: (
    scope: V2TemplateEditorTimetableComponentScope
  ) => void;
  onExitTimetableComponentEditScope?: () => void;
  onEnterStatefulSceneEditScope?: (
    scope: V2TemplateEditorStatefulSceneScope
  ) => void;
  onChangeStatefulSceneEditScope?: (
    scope: V2TemplateEditorStatefulSceneScope
  ) => void;
  onExitStatefulSceneEditScope?: () => void;
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

const v2_TIMETABLE_STATUS_LABELS: Record<
  V2TemplateTimetableCardStatusKey,
  string
> = {
  online: "온라인",
  offline: "오프라인",
  multi: "다회차",
  offlineMemo: "오프라인 메모",
};

const v2_isTimetableStatusEnabled = ({
  timetable,
  status,
}: {
  timetable: V2TemplateRenderConfig["timetable"];
  status: V2TemplateTimetableCardStatusKey;
}): boolean => {
  return Boolean(timetable.statusOptions[status]);
};

const v2_getEnabledTimetableStatusKeys = (
  timetable: V2TemplateRenderConfig["timetable"]
): V2TemplateTimetableCardStatusKey[] => {
  return v2_TIMETABLE_CARD_STATUS_KEYS.filter((status) =>
    v2_isTimetableStatusEnabled({ timetable, status })
  );
};

const V2SettingSwitch: React.FC<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
}> = ({ checked, onCheckedChange, ariaLabel }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onCheckedChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked
          ? "border-[#4f8cff] bg-[#1f3b6d]"
          : "border-[#3a3d44] bg-[#20242b]"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
};

type V2TimetableSlotTransformKey = keyof Pick<
  V2TemplateCardInstanceTransform,
  "offsetX" | "offsetY" | "width" | "height" | "rotateDeg" | "scale" | "opacity"
>;

const v2_TIMETABLE_SLOT_TRANSFORM_CONTROLS: Array<{
  key: V2TimetableSlotTransformKey;
  label: string;
  step: number;
  min?: number;
  max?: number;
}> = [
  { key: "offsetX", label: "X", step: 1 },
  { key: "offsetY", label: "Y", step: 1 },
  { key: "width", label: "W", step: 1, min: 1 },
  { key: "height", label: "H", step: 1, min: 1 },
  { key: "rotateDeg", label: "회전", step: 1 },
  { key: "scale", label: "배율", step: 0.05, min: 0.1 },
  { key: "opacity", label: "투명도", step: 0.05, min: 0, max: 1 },
];

const v2_TIMETABLE_ENTRY_FRAME_ID_PATTERN = /^entry-frame-(\d+)$/;
const v2_TIMETABLE_ENTRY_SCOPED_ID_PATTERN = /-entry-\d+$/;
const v2_TIMETABLE_ENTRY_SCOPED_LABEL_PATTERN = /\s+\d+$/;

interface V2TimetableEntryFrameInfo {
  frame: V2TemplateCardFrameNode;
  entryIndex: number;
  entryNumber: number;
}

const v2_getTimetableEntryFrames = (
  card: V2TemplateCardStructure
): V2TimetableEntryFrameInfo[] =>
  Object.values(card.frameNodes ?? {})
    .map((frame) => {
      const matchedEntryNumber =
        frame.bindingContext?.scope === "entry"
          ? frame.bindingContext.entryIndex + 1
          : Number(v2_TIMETABLE_ENTRY_FRAME_ID_PATTERN.exec(frame.id)?.[1]);
      if (!Number.isFinite(matchedEntryNumber) || matchedEntryNumber <= 0) {
        return null;
      }
      const entryNumber = Math.floor(matchedEntryNumber);
      return {
        frame,
        entryNumber,
        entryIndex: entryNumber - 1,
      };
    })
    .filter((entryFrame): entryFrame is V2TimetableEntryFrameInfo =>
      Boolean(entryFrame)
    )
    .sort((left, right) => left.entryNumber - right.entryNumber);

const v2_getTimetableCommonObjectId = (sourceId: string): string =>
  sourceId.replace(v2_TIMETABLE_ENTRY_SCOPED_ID_PATTERN, "");

const v2_getTimetableEntryScopedObjectId = (
  sourceId: string,
  entryNumber: number
): string => `${v2_getTimetableCommonObjectId(sourceId)}-entry-${entryNumber}`;

const v2_getTimetableCommonLayerId = (layerId: string): string =>
  layerId.replace(v2_TIMETABLE_ENTRY_SCOPED_ID_PATTERN, "");

const v2_getTimetableEntryScopedLayerId = (
  layerId: string,
  entryNumber: number
): string => `${v2_getTimetableCommonLayerId(layerId)}-entry-${entryNumber}`;

const v2_getTimetableCommonLabel = (label: string): string =>
  label.replace(v2_TIMETABLE_ENTRY_SCOPED_LABEL_PATTERN, "");

const v2_getTimetableEntryScopedLabel = (
  label: string,
  entryNumber: number
): string => `${v2_getTimetableCommonLabel(label)} ${entryNumber}`;

const v2_withTimetableEntryNodeBinding = (
  binding: V2TemplateCardNodeBinding,
  entryIndex: number
): V2TemplateCardNodeBinding => {
  if (binding.mode !== "field" && binding.mode !== "computed") {
    return binding;
  }
  return {
    ...binding,
    entrySelector: {
      mode: "index",
      index: entryIndex,
    },
  };
};

const v2_withoutTimetableEntryNodeBinding = (
  binding: V2TemplateCardNodeBinding
): V2TemplateCardNodeBinding => {
  if (binding.mode !== "field" && binding.mode !== "computed") {
    return binding;
  }
  const { entrySelector, ...restBinding } = binding;
  void entrySelector;
  return restBinding;
};

const v2_getSlotTransformDefaultValue = (
  key: V2TimetableSlotTransformKey
): number | undefined => {
  if (key === "scale" || key === "opacity") return 1;
  if (key === "offsetX" || key === "offsetY" || key === "rotateDeg") return 0;
  return undefined;
};

const v2_getSlotTransformInputValue = (
  transform: V2TemplateCardInstanceTransform | undefined,
  key: V2TimetableSlotTransformKey
): string => {
  const value = transform?.[key] ?? v2_getSlotTransformDefaultValue(key);
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
};

const v2_toAssetSelectValue = (
  assetRef: V2TemplateAssetRef | undefined
): string => {
  if (!assetRef) return "__none__";
  return assetRef.source === "extra"
    ? `extra:${assetRef.key}`
    : `builtin:${assetRef.key}`;
};

const v2_fromAssetSelectValue = (rawValue: string): V2TemplateAssetRef | null => {
  if (rawValue === "__none__") return null;
  if (rawValue.startsWith("extra:")) {
    const key = rawValue.slice("extra:".length).trim();
    return key ? { source: "extra", key } : null;
  }
  const key = rawValue.replace(/^builtin:/, "") as V2TemplateBuiltinAssetKey;
  return {
    source: "builtin",
    key,
  };
};

type V2TimetableDiagnosticSeverity = "error" | "warning";

interface V2TimetableDiagnostic {
  key: string;
  severity: V2TimetableDiagnosticSeverity;
  title: string;
  detail: string;
}

const v2_collectTimetableDiagnostics = (
  renderConfig: V2TemplateRenderConfig
): V2TimetableDiagnostic[] => {
  const diagnostics: V2TimetableDiagnostic[] = [];
  const seenDiagnosticKeys = new Set<string>();
  const timetable = renderConfig.timetable;
  const cardLayout = renderConfig.layout.card ?? {};
  const componentIds = new Set(Object.keys(timetable.components));

  const pushDiagnostic = ({
    severity,
    title,
    detail,
  }: {
    severity: V2TimetableDiagnosticSeverity;
    title: string;
    detail: string;
  }) => {
    const key = `${severity}:${title}:${detail}`;
    if (seenDiagnosticKeys.has(key)) return;
    seenDiagnosticKeys.add(key);
    diagnostics.push({
      key,
      severity,
      title,
      detail,
    });
  };

  const checkDuplicateIds = (ids: string[], subject: string) => {
    const seenIds = new Set<string>();
    ids.forEach((id) => {
      if (!seenIds.has(id)) {
        seenIds.add(id);
        return;
      }
      pushDiagnostic({
        severity: "warning",
        title: `${subject} 중복`,
        detail: `${id}가 두 번 이상 배치되어 있습니다.`,
      });
    });
  };

  const checkStyleKey = (styleKey: string | undefined, subject: string) => {
    if (!styleKey || cardLayout[styleKey]) return;
    pushDiagnostic({
      severity: "warning",
      title: "스타일 참조 누락",
      detail: `${subject}이(가) 없는 스타일 키 ${styleKey}를 참조합니다.`,
    });
  };

  checkDuplicateIds(timetable.componentOrder, "컴포넌트 순서");
  timetable.componentOrder.forEach((componentId) => {
    if (componentIds.has(componentId)) return;
    pushDiagnostic({
      severity: "error",
      title: "컴포넌트 참조 누락",
      detail: `componentOrder의 ${componentId} 컴포넌트가 없습니다.`,
    });
  });
  Object.keys(timetable.components).forEach((componentId) => {
    if (timetable.componentOrder.includes(componentId)) return;
    pushDiagnostic({
      severity: "warning",
      title: "컴포넌트 순서 누락",
      detail: `${componentId} 컴포넌트가 순서 목록에 없어 선택 UI에서 빠질 수 있습니다.`,
    });
  });

  v2_TEMPLATE_DAY_KEYS.forEach((dayKey) => {
    const slot = timetable.slots[dayKey];
    if (!slot) {
      pushDiagnostic({
        severity: "error",
        title: "요일 슬롯 누락",
        detail: `${dayKey} 슬롯이 없습니다.`,
      });
      return;
    }
    if (slot.dayKey !== dayKey) {
      pushDiagnostic({
        severity: "warning",
        title: "요일 슬롯 키 불일치",
        detail: `${dayKey} 슬롯 내부 dayKey가 ${slot.dayKey}로 저장되어 있습니다.`,
      });
    }
    if (!componentIds.has(slot.componentId)) {
      pushDiagnostic({
        severity: "error",
        title: "요일 슬롯 컴포넌트 누락",
        detail: `${dayKey} 슬롯이 없는 컴포넌트 ${slot.componentId}를 참조합니다.`,
      });
    }
    if (
      timetable.layoutMode === "free" &&
      ((typeof slot.transform?.width === "number" && slot.transform.width <= 0) ||
        (typeof slot.transform?.height === "number" && slot.transform.height <= 0))
    ) {
      pushDiagnostic({
        severity: "warning",
        title: "자유배치 크기 확인",
        detail: `${dayKey} 슬롯의 width 또는 height가 0 이하입니다.`,
      });
    }
  });

  if (
    timetable.statusOptions.multi &&
    renderConfig.editorOptions.maxStreamingTimeByDay < timetable.multiEntryCount
  ) {
    pushDiagnostic({
      severity: "warning",
      title: "다회차 샘플 수 불일치",
      detail: `에디터 샘플 회차 수가 Grid 다회차 수 ${timetable.multiEntryCount}보다 작습니다.`,
    });
  }

  const collectCardDiagnostics = ({
    componentLabel,
    status,
    card,
  }: {
    componentLabel: string;
    status: V2TemplateTimetableCardStatusKey;
    card: V2TemplateCardStructure;
  }) => {
    const statusLabel = v2_TIMETABLE_STATUS_LABELS[status];
    const cardLabel = `${componentLabel}/${statusLabel}`;
    const frameNodes = card.frameNodes ?? {};
    const nodeIds = new Set(Object.keys(card.nodes));
    const frameIds = new Set(Object.keys(frameNodes));
    const objectIds = new Set([...nodeIds, ...frameIds]);
    const rootObjectIds = card.rootObjectIds ?? card.nodeOrder;

    checkDuplicateIds(card.nodeOrder, `${cardLabel} nodeOrder`);
    checkDuplicateIds(rootObjectIds, `${cardLabel} rootObjectIds`);
    checkStyleKey(card.containerStyleKey, `${cardLabel} card frame`);

    card.nodeOrder.forEach((nodeId) => {
      if (nodeIds.has(nodeId)) return;
      pushDiagnostic({
        severity: "error",
        title: "노드 순서 참조 누락",
        detail: `${cardLabel} nodeOrder의 ${nodeId} 노드가 없습니다.`,
      });
    });
    Object.keys(card.nodes).forEach((nodeId) => {
      if (card.nodeOrder.includes(nodeId)) return;
      pushDiagnostic({
        severity: "warning",
        title: "노드 순서 누락",
        detail: `${cardLabel}의 ${nodeId} 노드가 nodeOrder에 없습니다.`,
      });
    });

    rootObjectIds.forEach((objectId) => {
      if (objectIds.has(objectId)) return;
      pushDiagnostic({
        severity: "error",
        title: "루트 오브젝트 참조 누락",
        detail: `${cardLabel} rootObjectIds의 ${objectId} 오브젝트가 없습니다.`,
      });
    });

    Object.values(frameNodes).forEach((frame) => {
      checkStyleKey(frame.styleKey, `${cardLabel}/${frame.label || frame.id}`);
      checkDuplicateIds(frame.childIds, `${cardLabel}/${frame.label || frame.id}`);
      if (frame.parentId) {
        const parentFrame = frameNodes[frame.parentId];
        if (!parentFrame) {
          pushDiagnostic({
            severity: "error",
            title: "Frame 부모 누락",
            detail: `${cardLabel}의 ${frame.id} Frame이 없는 부모 ${frame.parentId}를 참조합니다.`,
          });
        } else if (!parentFrame.childIds.includes(frame.id)) {
          pushDiagnostic({
            severity: "warning",
            title: "Frame 부모/자식 불일치",
            detail: `${cardLabel}의 ${frame.id} Frame 부모에 childIds 연결이 없습니다.`,
          });
        }
      } else if (!rootObjectIds.includes(frame.id)) {
        pushDiagnostic({
          severity: "warning",
          title: "루트 Frame 누락",
          detail: `${cardLabel}의 ${frame.id} Frame이 rootObjectIds에 없습니다.`,
        });
      }

      frame.childIds.forEach((childId) => {
        if (!objectIds.has(childId)) {
          pushDiagnostic({
            severity: "error",
            title: "Frame 자식 참조 누락",
            detail: `${cardLabel}의 ${frame.id} Frame이 없는 자식 ${childId}를 참조합니다.`,
          });
          return;
        }
        const childParentId =
          card.nodes[childId]?.parentId ?? frameNodes[childId]?.parentId ?? null;
        if (childParentId !== frame.id) {
          pushDiagnostic({
            severity: "warning",
            title: "Frame 자식 부모 불일치",
            detail: `${cardLabel}의 ${childId} 오브젝트 parentId가 ${frame.id}이 아닙니다.`,
          });
        }
      });
    });

    Object.values(card.nodes).forEach((node) => {
      checkStyleKey(node.containerStyleKey, `${cardLabel}/${node.label}.container`);
      if (node.kind !== "image") {
        checkStyleKey(node.textStyleKey, `${cardLabel}/${node.label}.text`);
      }
      if (node.kind === "flexibleText") {
        if (node.wrapperStyleKey) {
          checkStyleKey(node.wrapperStyleKey, `${cardLabel}/${node.label}.wrapper`);
        }
        checkStyleKey(node.optionsKey, `${cardLabel}/${node.label}.options`);
      }

      if (node.parentId) {
        const parentFrame = frameNodes[node.parentId];
        if (!parentFrame) {
          pushDiagnostic({
            severity: "error",
            title: "노드 부모 누락",
            detail: `${cardLabel}의 ${node.id} 노드가 없는 부모 ${node.parentId}를 참조합니다.`,
          });
        } else if (!parentFrame.childIds.includes(node.id)) {
          pushDiagnostic({
            severity: "warning",
            title: "노드 부모/자식 불일치",
            detail: `${cardLabel}의 ${node.id} 노드 부모에 childIds 연결이 없습니다.`,
          });
        }
      } else if (!rootObjectIds.includes(node.id)) {
        pushDiagnostic({
          severity: "warning",
          title: "루트 노드 누락",
          detail: `${cardLabel}의 ${node.id} 노드가 rootObjectIds에 없습니다.`,
        });
      }
    });

    const reachableObjectIds = new Set<string>();
    const visitObject = (objectId: string) => {
      if (reachableObjectIds.has(objectId) || !objectIds.has(objectId)) return;
      reachableObjectIds.add(objectId);
      const frame = frameNodes[objectId];
      if (!frame) return;
      frame.childIds.forEach(visitObject);
    };
    rootObjectIds.forEach(visitObject);
    objectIds.forEach((objectId) => {
      if (reachableObjectIds.has(objectId)) return;
      pushDiagnostic({
        severity: "warning",
        title: "렌더 트리 미연결",
        detail: `${cardLabel}의 ${objectId} 오브젝트가 루트에서 도달되지 않습니다.`,
      });
    });

    const visitFrameForCycle = (
      frameId: string,
      visitingFrameIds: Set<string>
    ) => {
      const frame = frameNodes[frameId];
      if (!frame) return;
      if (visitingFrameIds.has(frameId)) {
        pushDiagnostic({
          severity: "error",
          title: "Frame 중첩 순환",
          detail: `${cardLabel}의 ${frameId} Frame에서 순환 참조가 감지되었습니다.`,
        });
        return;
      }
      const nextVisitingFrameIds = new Set(visitingFrameIds);
      nextVisitingFrameIds.add(frameId);
      frame.childIds.forEach((childId) => {
        if (frameNodes[childId]) {
          visitFrameForCycle(childId, nextVisitingFrameIds);
        }
      });
    };
    Object.keys(frameNodes).forEach((frameId) =>
      visitFrameForCycle(frameId, new Set())
    );

    if (status === "multi") {
      const entryFrameCount = Object.values(frameNodes).filter(
        (frame) => frame.bindingContext?.scope === "entry"
      ).length;
      if (entryFrameCount < timetable.multiEntryCount) {
        pushDiagnostic({
          severity: "warning",
          title: "다회차 Frame 수 부족",
          detail: `${cardLabel}의 entry Frame이 ${entryFrameCount}개라 설정값 ${timetable.multiEntryCount}개보다 적습니다.`,
        });
      }
    }
  };

  Object.values(timetable.components).forEach((component) => {
    const componentLabel = component.label || component.id;
    v2_TIMETABLE_CARD_STATUS_KEYS.forEach((status) => {
      const state = component.states[status];
      const isRequiredStatus =
        status === "online" || status === "offline" || timetable.statusOptions[status];
      if (!state) {
        if (isRequiredStatus) {
          pushDiagnostic({
            severity: "error",
            title: "상태 카드 누락",
            detail: `${componentLabel} 컴포넌트에 ${v2_TIMETABLE_STATUS_LABELS[status]} 상태 카드가 없습니다.`,
          });
        }
        return;
      }
      collectCardDiagnostics({
        componentLabel,
        status,
        card: state.card,
      });
    });
  });

  return diagnostics;
};

const V2TemplateBuilderForm: React.FC<V2TemplateBuilderFormProps> = ({
  focusLayerId = null,
  focusLayerNonce = 0,
  focusStyleSection = null,
  focusStyleSectionNonce = 0,
  focusEditorMode = "instance",
  onRequestClose,
  timetableComponentEditScope = null,
  timetableGridEditScope = false,
  sceneUnitEditScope = null,
  statefulSceneEditScope = null,
  onEnterTimetableGridEditScope,
  onExitTimetableGridEditScope,
  onEnterSceneUnitEditScope,
  onExitSceneUnitEditScope,
  onEnterTimetableComponentEditScope,
  onChangeTimetableComponentEditScope,
  onExitTimetableComponentEditScope,
  onEnterStatefulSceneEditScope,
  onChangeStatefulSceneEditScope,
  onExitStatefulSceneEditScope,
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
  const [activeTimetableComponentId, setActiveTimetableComponentId] =
    useState<string | null>(null);
  const [activeTimetableStatus, setActiveTimetableStatus] =
    useState<V2TemplateTimetableCardStatusKey>("online");
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
  const sceneComponentInstanceByLayerId = useMemo(() => {
    const map = new Map<string, { componentId: string; layerId: string }>();
    const stack = [...runtimeSceneNodes];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) continue;
      if (node.kind === "cardCollection") {
        const children = node.children ?? [];
        children.forEach((child) => {
          if (child.kind !== "componentInstance") return;
          const layerId =
            typeof child.layerId === "string" && child.layerId.trim().length > 0
              ? child.layerId
              : child.id;
          map.set(layerId, {
            componentId: child.componentId,
            layerId,
          });
        });
        if (children.length > 0) {
          stack.unshift(...children);
        }
        continue;
      }
      if (node.kind === "group" && node.children?.length) {
        stack.unshift(...node.children);
      }
    }
    return map;
  }, [runtimeSceneNodes]);
  const cardNodeByLayerId = useMemo(() => {
    const map = new Map<string, V2TemplateCardNode>();
    Object.values(runtimeCardStructuresByComponentId).forEach((structure) => {
      Object.values(structure.nodes).forEach((node) => {
        map.set(node.layerId, node);
      });
    });
    sceneComponentInstanceByLayerId.forEach((instanceInfo) => {
      const structure = runtimeCardStructuresByComponentId[instanceInfo.componentId];
      if (!structure) return;
      Object.values(structure.nodes).forEach((node) => {
        const statusGroupKey = v2_resolveCardStatusGroupKey(node.visibilityMode);
        const virtualLayerId = v2_buildCardInstanceNodeLayerId({
          instanceLayerId: instanceInfo.layerId,
          statusGroupKey,
          nodeLayerId: node.layerId,
        });
        map.set(virtualLayerId, node);
      });
    });
    return map;
  }, [runtimeCardStructuresByComponentId, sceneComponentInstanceByLayerId]);
  const cardNodeComponentIdByLayerId = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(runtimeCardStructuresByComponentId).forEach(
      ([componentId, structure]) => {
        Object.values(structure.nodes).forEach((node) => {
          map.set(node.layerId, componentId);
        });
      }
    );
    sceneComponentInstanceByLayerId.forEach((instanceInfo) => {
      const structure = runtimeCardStructuresByComponentId[instanceInfo.componentId];
      if (!structure) return;
      Object.values(structure.nodes).forEach((node) => {
        const statusGroupKey = v2_resolveCardStatusGroupKey(node.visibilityMode);
        const virtualLayerId = v2_buildCardInstanceNodeLayerId({
          instanceLayerId: instanceInfo.layerId,
          statusGroupKey,
          nodeLayerId: node.layerId,
        });
        map.set(virtualLayerId, instanceInfo.componentId);
      });
    });
    return map;
  }, [runtimeCardStructuresByComponentId, sceneComponentInstanceByLayerId]);
  const componentIdByRootLayerId = useMemo(() => {
    const map = new Map<string, string>();
    Object.entries(runtimeCardStructuresByComponentId).forEach(
      ([componentId, structure]) => {
        const layerId =
          typeof structure.containerLayerId === "string" &&
          structure.containerLayerId.trim().length > 0
            ? structure.containerLayerId
            : `timetable-card:${componentId}:online`;
        map.set(layerId, componentId);
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
      Math.min(
        v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
        Number(renderConfig.editorOptions?.maxStreamingTimeByDay ?? 1)
      )
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
        Math.min(
          v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
          Number(prev.editorOptions?.maxStreamingTimeByDay ?? 1)
        )
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
    const normalized =
      value >= v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT
        ? v2_clampTimetableMultiEntryCount(value)
        : 1;
    if (normalized >= v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT) {
      updateTimetableMultiEntryCount(normalized);
      return;
    }
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

  const timetableComponentOptions = useMemo(() => {
    const timetable = renderConfig.timetable;
    const ordered = [
      ...timetable.componentOrder,
      ...Object.keys(timetable.components).filter(
        (componentId) => !timetable.componentOrder.includes(componentId)
      ),
    ];
    return ordered
      .map((componentId) => timetable.components[componentId])
      .filter((component): component is NonNullable<typeof component> =>
        Boolean(component)
      )
      .map((component) => ({
        value: component.id,
        label: component.label || component.id,
      }));
  }, [renderConfig.timetable]);

  const resolvedActiveTimetableComponentId = useMemo(() => {
    if (
      activeTimetableComponentId &&
      renderConfig.timetable.components[activeTimetableComponentId]
    ) {
      return activeTimetableComponentId;
    }
    return renderConfig.timetable.componentOrder[0] ?? null;
  }, [activeTimetableComponentId, renderConfig.timetable]);

  const activeTimetableComponent = resolvedActiveTimetableComponentId
    ? renderConfig.timetable.components[resolvedActiveTimetableComponentId]
    : null;
  const enabledTimetableStatusKeys = useMemo(
    () => v2_getEnabledTimetableStatusKeys(renderConfig.timetable),
    [renderConfig.timetable]
  );
  const activeTimetableState =
    activeTimetableComponent?.states[activeTimetableStatus] ??
    activeTimetableComponent?.states.online ??
    null;
  const activeTimetableCardLayerId =
    activeTimetableState &&
    typeof activeTimetableState.card.containerLayerId === "string" &&
    activeTimetableState.card.containerLayerId.trim().length > 0
      ? activeTimetableState.card.containerLayerId
      : activeTimetableComponent
        ? `timetable-card:${activeTimetableComponent.id}:${activeTimetableStatus}`
        : null;

  useEffect(() => {
    if (!resolvedActiveTimetableComponentId) return;
    if (activeTimetableComponentId === resolvedActiveTimetableComponentId) return;
    setActiveTimetableComponentId(resolvedActiveTimetableComponentId);
  }, [activeTimetableComponentId, resolvedActiveTimetableComponentId]);
  useEffect(() => {
    if (!timetableComponentEditScope) return;
    setActiveTimetableComponentId(timetableComponentEditScope.componentId);
    setActiveTimetableStatus(timetableComponentEditScope.status);
  }, [timetableComponentEditScope]);

  const selectTimetableComponentForEditing = (componentId: string | null) => {
    setActiveTimetableComponentId(componentId);
    if (
      !timetableComponentEditScope ||
      !componentId ||
      !onChangeTimetableComponentEditScope
    ) {
      return;
    }
    onChangeTimetableComponentEditScope({
      componentId,
      status: activeTimetableStatus,
    });
  };

  const selectTimetableStatusForEditing = (
    status: V2TemplateTimetableCardStatusKey
  ) => {
    if (!enabledTimetableStatusKeys.includes(status)) return;
    setActiveTimetableStatus(status);
    if (
      !timetableComponentEditScope ||
      !resolvedActiveTimetableComponentId ||
      !onChangeTimetableComponentEditScope
    ) {
      return;
    }
    onChangeTimetableComponentEditScope({
      componentId: resolvedActiveTimetableComponentId,
      status,
    });
  };

  useEffect(() => {
    if (enabledTimetableStatusKeys.includes(activeTimetableStatus)) return;
    const nextStatus = enabledTimetableStatusKeys[0] ?? "online";
    setActiveTimetableStatus(nextStatus);
    if (
      !timetableComponentEditScope ||
      !resolvedActiveTimetableComponentId ||
      !onChangeTimetableComponentEditScope
    ) {
      return;
    }
    onChangeTimetableComponentEditScope({
      componentId: resolvedActiveTimetableComponentId,
      status: nextStatus,
    });
  }, [
    activeTimetableStatus,
    enabledTimetableStatusKeys,
    onChangeTimetableComponentEditScope,
    resolvedActiveTimetableComponentId,
    timetableComponentEditScope,
  ]);

  const updateTimetableLayoutMode = (
    layoutMode: V2TemplateTimetableGridLayoutMode
  ) => {
    safeUpdateConfig((prev) => {
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          layoutMode,
        },
      };
    });
  };

  const updateTimetableFlex42Option = (
    key: "flex42Align" | "flex42ThreeRow",
    value: V2TemplateTimetableFlex42Align | V2TemplateTimetableFlex42ThreeRow
  ) => {
    safeUpdateConfig((prev) => ({
      ...prev,
      timetable: {
        ...prev.timetable,
        [key]: value,
      },
    }));
  };

  const pickTimetableGridEmptySlot = (slot: number) => {
    safeUpdateConfig((prev) => {
      const currentGridLayout =
        (prev.layout.grid as Record<string, string | number>) ?? {};
      const currentSlots = v2_getGridEmptySlotsFromMap(currentGridLayout);
      const isSelected = currentSlots.includes(slot);

      let nextSlots: number[];
      if (isSelected) {
        nextSlots = currentSlots.filter((value) => value !== slot);
      } else if (currentSlots.length < 2) {
        nextSlots = [...currentSlots, slot];
      } else {
        nextSlots = [currentSlots[1], slot];
      }

      const nextGridLayout: Record<string, string | number> = {
        ...currentGridLayout,
      };
      if (nextSlots[0] !== undefined) {
        nextGridLayout.gridEmptySlotA = nextSlots[0];
      } else {
        delete nextGridLayout.gridEmptySlotA;
      }
      if (nextSlots[1] !== undefined) {
        nextGridLayout.gridEmptySlotB = nextSlots[1];
      } else {
        delete nextGridLayout.gridEmptySlotB;
      }

      return {
        ...prev,
        layout: {
          ...prev.layout,
          grid: nextGridLayout,
        },
      };
    });
  };

  const updateTimetableMultiEntryCount = (value: number) => {
    const nextCount = v2_clampTimetableMultiEntryCount(value);

    safeUpdateConfig((prev) => {
      const createFrameStyle = (entryIndex: number): V2TemplateStyleRecord => {
        const contentTop = 110;
        const contentHeight = 410;
        const gap = 0;
        const frameHeight = Math.max(
          1,
          Math.floor((contentHeight - gap * (nextCount - 1)) / nextCount)
        );
        return {
          position: "absolute",
          left: 98,
          top: contentTop + entryIndex * (frameHeight + gap),
          width: 540,
          height: frameHeight,
          overflow: "visible",
        };
      };

      const nextCardLayout = { ...prev.layout.card };
      Array.from({ length: nextCount }, (_, entryIndex) => {
        const styleKey = `multiEntryFrame${entryIndex + 1}`;
        if (!nextCardLayout[styleKey]) {
          nextCardLayout[styleKey] = createFrameStyle(entryIndex);
        }
      });

      const resizeMultiCard = (
        card: V2TemplateCardStructure
      ): V2TemplateCardStructure => {
        const frameNodes = { ...(card.frameNodes ?? {}) };
        const nodes = { ...card.nodes };
        const rootObjectIds = [...(card.rootObjectIds ?? card.nodeOrder)];
        const nodeOrder = [...card.nodeOrder];
        const templateFrame =
          frameNodes["entry-frame-1"] ??
          Object.values(frameNodes).find(
            (frame) => frame.bindingContext?.scope === "entry"
          );
        if (!templateFrame) return card;
        const getEntryScopedId = (sourceId: string, entryNumber: number) => {
          const baseId = sourceId.replace(/-entry-\d+$/, "");
          return `${baseId}-entry-${entryNumber}`;
        };
        const getEntryScopedLabel = (label: string, entryNumber: number) => {
          const baseLabel = label.replace(/\s+\d+$/, "");
          return `${baseLabel} ${entryNumber}`;
        };
        const getEntryScopedLayerId = (layerId: string, entryNumber: number) => {
          const baseLayerId = layerId.replace(/-entry-\d+$/, "");
          return `${baseLayerId}-entry-${entryNumber}`;
        };
        const updateEntryNodeBinding = (
          node: V2TemplateCardNode,
          entryIndex: number
        ): V2TemplateCardNode["binding"] => {
          if (node.binding.mode !== "field" && node.binding.mode !== "computed") {
            return node.binding;
          }
          return {
            ...node.binding,
            entrySelector: {
              mode: "index",
              index: entryIndex,
            },
          };
        };

        Array.from({ length: nextCount }, (_, entryIndex) => {
          const entryNumber = entryIndex + 1;
          const frameId = `entry-frame-${entryNumber}`;
          if (!frameNodes[frameId]) {
            const cloneTemplateObject = (
              templateObjectId: string,
              parentFrameId: string
            ): string | null => {
              const templateNode = nodes[templateObjectId];
              if (templateNode) {
                const nodeId = getEntryScopedId(templateObjectId, entryNumber);
                nodes[nodeId] = {
                  ...templateNode,
                  id: nodeId,
                  label: getEntryScopedLabel(templateNode.label, entryNumber),
                  layerId: getEntryScopedLayerId(
                    templateNode.layerId,
                    entryNumber
                  ),
                  highlightTarget: `cardNode:${nodeId}`,
                  parentId: parentFrameId,
                  binding: updateEntryNodeBinding(templateNode, entryIndex),
                };
                if (!nodeOrder.includes(nodeId)) {
                  nodeOrder.push(nodeId);
                }
                return nodeId;
              }

              const templateChildFrame = frameNodes[templateObjectId];
              if (!templateChildFrame) return null;
              const childFrameId = getEntryScopedId(
                templateObjectId,
                entryNumber
              );
              const childIds = templateChildFrame.childIds
                .map((childId) => cloneTemplateObject(childId, childFrameId))
                .filter((childId): childId is string => Boolean(childId));
              frameNodes[childFrameId] = {
                ...templateChildFrame,
                id: childFrameId,
                label: getEntryScopedLabel(
                  templateChildFrame.label,
                  entryNumber
                ),
                layerId: getEntryScopedLayerId(
                  templateChildFrame.layerId,
                  entryNumber
                ),
                highlightTarget: `cardFrame:${childFrameId}`,
                parentId: parentFrameId,
                childIds,
                ...(templateChildFrame.bindingContext?.scope === "entry"
                  ? {
                      bindingContext: {
                        scope: "entry" as const,
                        entryIndex,
                      },
                    }
                  : {}),
              };
              return childFrameId;
            };

            const nextChildIds = templateFrame.childIds
              .map((templateChildId) => cloneTemplateObject(templateChildId, frameId))
              .filter((childId): childId is string => Boolean(childId));

            frameNodes[frameId] = {
              ...templateFrame,
              id: frameId,
              label: `Entry Frame ${entryNumber}`,
              layerId: frameId,
              highlightTarget: `cardFrame:${frameId}`,
              parentId: null,
              styleKey: `multiEntryFrame${entryNumber}`,
              childIds: nextChildIds,
              bindingContext: {
                scope: "entry",
                entryIndex,
              },
            };
          } else {
            const updateExistingEntryObject = (
              objectId: string,
              parentFrameId: string
            ) => {
              const childNode = nodes[objectId];
              if (childNode) {
                nodes[objectId] = {
                  ...childNode,
                  parentId: parentFrameId,
                  binding: updateEntryNodeBinding(childNode, entryIndex),
                };
                return;
              }

              const childFrame = frameNodes[objectId];
              if (!childFrame) return;
              frameNodes[objectId] = {
                ...childFrame,
                parentId: parentFrameId,
                ...(childFrame.bindingContext?.scope === "entry"
                  ? {
                      bindingContext: {
                        scope: "entry" as const,
                        entryIndex,
                      },
                    }
                  : {}),
              };
              childFrame.childIds.forEach((childId) =>
                updateExistingEntryObject(childId, objectId)
              );
            };

            frameNodes[frameId] = {
              ...frameNodes[frameId],
              bindingContext: {
                scope: "entry",
                entryIndex,
              },
            };
            frameNodes[frameId].childIds.forEach((childId) => {
              updateExistingEntryObject(childId, frameId);
            });
          }
          if (!rootObjectIds.includes(frameId)) {
            rootObjectIds.push(frameId);
          }
        });

        const removeObjectTree = (
          objectId: string,
          visitedObjectIds = new Set<string>()
        ) => {
          if (visitedObjectIds.has(objectId)) return;
          visitedObjectIds.add(objectId);
          const frame = frameNodes[objectId];
          if (frame) {
            frame.childIds.forEach((childId) =>
              removeObjectTree(childId, visitedObjectIds)
            );
            delete frameNodes[objectId];
            return;
          }
          delete nodes[objectId];
        };
        Object.keys(frameNodes).forEach((frameId) => {
          const match = /^entry-frame-(\d+)$/.exec(frameId);
          if (!match) return;
          const entryNumber = Number(match[1]);
          if (!Number.isFinite(entryNumber) || entryNumber <= nextCount) return;
          removeObjectTree(frameId);
        });

        const validObjectIds = new Set([
          ...Object.keys(nodes),
          ...Object.keys(frameNodes),
        ]);
        Object.values(frameNodes).forEach((frame) => {
          frame.childIds = frame.childIds.filter((childId) =>
            validObjectIds.has(childId)
          );
        });

        return {
          ...card,
          nodes,
          nodeOrder: nodeOrder.filter((nodeId) => nodes[nodeId]),
          frameNodes,
          rootObjectIds: rootObjectIds.filter((objectId) =>
            validObjectIds.has(objectId)
          ),
        };
      };

      const nextComponents = Object.fromEntries(
        Object.entries(prev.timetable.components).map(([componentId, component]) => {
          const multiState = component.states.multi;
          if (!multiState) return [componentId, component];
          return [
            componentId,
            {
              ...component,
              states: {
                ...component.states,
                multi: {
                  ...multiState,
                  card: resizeMultiCard(multiState.card),
                },
              },
            },
          ];
        })
      );

      return v2_withScopedTimetableStyles({
        ...prev,
        editorOptions: {
          ...prev.editorOptions,
          isMultiple: true,
          maxStreamingTimeByDay: nextCount,
        },
        timetable: {
          ...prev.timetable,
          multiEntryCount: nextCount,
          components: nextComponents,
        },
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
      });
    });

    clampDataEntriesByMaxCount(nextCount);
  };

  const updateTimetableStatusOption = (
    key: "multi" | "offlineMemo",
    value: boolean
  ) => {
    safeUpdateConfig((prev) => {
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          statusOptions: {
            ...prev.timetable.statusOptions,
            [key]: value,
          },
        },
      };
    });
  };

  const updateTimetableSlotComponent = (
    dayKey: V2TemplateDayKey,
    componentId: string
  ) => {
    safeUpdateConfig((prev) => {
      if (!prev.timetable.components[componentId]) return prev;
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          slots: {
            ...prev.timetable.slots,
            [dayKey]: {
              ...prev.timetable.slots[dayKey],
              dayKey,
              componentId,
            },
          },
        },
      };
    });
  };

  const updateTimetableSlotTransformValue = ({
    dayKey,
    key,
    value,
  }: {
    dayKey: V2TemplateDayKey;
    key: V2TimetableSlotTransformKey;
    value: number | null;
  }) => {
    safeUpdateConfig((prev) => {
      const fallbackComponentId =
        prev.timetable.componentOrder[0] ??
        Object.keys(prev.timetable.components)[0] ??
        "";
      const currentSlot = prev.timetable.slots[dayKey] ?? {
        dayKey,
        componentId: fallbackComponentId,
      };
      const nextTransform: V2TemplateCardInstanceTransform = {
        ...(currentSlot.transform ?? {}),
      };
      const sanitizedValue =
        typeof value === "number" && Number.isFinite(value) ? value : null;

      if (sanitizedValue === null) {
        delete nextTransform[key];
      } else if (
        (key === "width" || key === "height") &&
        sanitizedValue <= 0
      ) {
        delete nextTransform[key];
      } else if (key === "scale") {
        nextTransform[key] = Math.max(0.1, sanitizedValue);
      } else if (key === "opacity") {
        nextTransform[key] = Math.min(1, Math.max(0, sanitizedValue));
      } else {
        nextTransform[key] = sanitizedValue;
      }

      const hasTransform = Object.keys(nextTransform).length > 0;
      const nextSlot = {
        ...currentSlot,
        dayKey,
        componentId: currentSlot.componentId || fallbackComponentId,
      };
      if (hasTransform) {
        nextSlot.transform = nextTransform;
      } else {
        delete nextSlot.transform;
      }

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          slots: {
            ...prev.timetable.slots,
            [dayKey]: nextSlot,
          },
        },
      };
    });
  };

  const resetTimetableSlotTransform = (dayKey: V2TemplateDayKey) => {
    safeUpdateConfig((prev) => {
      const currentSlot = prev.timetable.slots[dayKey];
      if (!currentSlot?.transform) return prev;
      const nextSlot = { ...currentSlot };
      delete nextSlot.transform;
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          slots: {
            ...prev.timetable.slots,
            [dayKey]: nextSlot,
          },
        },
      };
    });
  };

  const updateTimetableCardStructure = ({
    componentId,
    status,
    updater,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    updater: (card: V2TemplateCardStructure) => V2TemplateCardStructure;
  }) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      if (!component || !state) return prev;

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              states: {
                ...component.states,
                [status]: {
                  ...state,
                  card: updater(state.card),
                },
              },
            },
          },
        },
      };
    });
  };

  const updateTimetableStateNodeMeta = ({
    componentId,
    status,
    nodeId,
    patch,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    nodeId: string;
    patch: Partial<
      Pick<
        V2TemplateCardNode,
        | "label"
        | "colorKey"
        | "fontKey"
        | "visibilityMode"
        | "fit"
        | "alt"
        | "assetRef"
      >
    >;
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const node = card.nodes[nodeId];
        if (!node) return card;
        return {
          ...card,
          nodes: {
            ...card.nodes,
            [nodeId]: {
              ...node,
              ...patch,
            },
          },
        };
      },
    });
  };

  const updateTimetableStateNodeBinding = ({
    componentId,
    status,
    nodeId,
    binding,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    nodeId: string;
    binding: V2TemplateCardNodeBinding;
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const node = card.nodes[nodeId];
        if (!node) return card;
        return {
          ...card,
          nodes: {
            ...card.nodes,
            [nodeId]: {
              ...node,
              binding,
            },
          },
        };
      },
    });
  };

  const updateTimetableStateNodeOptions = ({
    componentId,
    status,
    optionsKey,
    patch,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    optionsKey: string;
    patch: Partial<{ maxFontSize: number; multiline: boolean }>;
  }) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      if (!component || !state) return prev;

      return {
        ...prev,
        layout: {
          ...prev.layout,
          card: {
            ...prev.layout.card,
            [optionsKey]: {
              ...(prev.layout.card[optionsKey] ?? {}),
              ...patch,
            },
          },
        },
      };
    });
  };

  const updateTimetableStateFrameMeta = ({
    componentId,
    status,
    frameId,
    patch,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    frameId: string;
    patch: {
      label?: string;
      visibilityMode?: V2TemplateVisibilityMode;
    };
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const frame = card.frameNodes?.[frameId];
        if (!frame) return card;
        return {
          ...card,
          frameNodes: {
            ...(card.frameNodes ?? {}),
            [frameId]: {
              ...frame,
              ...patch,
            },
          },
        };
      },
    });
  };

  const moveTimetableStateObject = ({
    componentId,
    status,
    objectId,
    direction,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    objectId: string;
    direction: "up" | "down";
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const frame = card.frameNodes?.[objectId];
        const node = card.nodes[objectId];
        if (!frame && !node) return card;
        const parentId = frame?.parentId ?? node?.parentId ?? null;
        const reorder = (ids: string[]) => {
          const index = ids.indexOf(objectId);
          if (index < 0) return ids;
          const targetIndex = direction === "up" ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= ids.length) return ids;
          const nextIds = [...ids];
          [nextIds[index], nextIds[targetIndex]] = [
            nextIds[targetIndex],
            nextIds[index],
          ];
          return nextIds;
        };

        if (parentId && card.frameNodes?.[parentId]) {
          const parentFrame = card.frameNodes[parentId];
          return {
            ...card,
            frameNodes: {
              ...card.frameNodes,
              [parentId]: {
                ...parentFrame,
                childIds: reorder(parentFrame.childIds),
              },
            },
          };
        }

        return {
          ...card,
          rootObjectIds: reorder(card.rootObjectIds ?? card.nodeOrder),
        };
      },
    });
  };

  const relocateTimetableStateObject = ({
    componentId,
    status,
    objectId,
    targetParentId,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    objectId: string;
    targetParentId: string | null;
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const frame = card.frameNodes?.[objectId];
        const node = card.nodes[objectId];
        if (!frame && !node) return card;
        if (targetParentId && !card.frameNodes?.[targetParentId]) return card;
        if (targetParentId === objectId) return card;

        const descendantFrameIds = new Set<string>();
        const collectFrameDescendants = (frameId: string) => {
          const currentFrame = card.frameNodes?.[frameId];
          if (!currentFrame) return;
          currentFrame.childIds.forEach((childId) => {
            if (!card.frameNodes?.[childId] || descendantFrameIds.has(childId)) {
              return;
            }
            descendantFrameIds.add(childId);
            collectFrameDescendants(childId);
          });
        };
        if (frame) {
          collectFrameDescendants(frame.id);
          if (targetParentId && descendantFrameIds.has(targetParentId)) {
            return card;
          }
        }

        const nextRootObjectIds = (card.rootObjectIds ?? card.nodeOrder).filter(
          (id) => id !== objectId
        );
        const nextFrameNodes = Object.fromEntries(
          Object.entries(card.frameNodes ?? {}).map(([frameId, candidateFrame]) => [
            frameId,
            {
              ...candidateFrame,
              childIds: candidateFrame.childIds.filter((id) => id !== objectId),
            },
          ])
        );

        if (targetParentId) {
          const targetFrame = nextFrameNodes[targetParentId];
          nextFrameNodes[targetParentId] = {
            ...targetFrame,
            childIds: [...targetFrame.childIds, objectId],
          };
        } else {
          nextRootObjectIds.push(objectId);
        }

        const nextNodes = node
          ? {
              ...card.nodes,
              [objectId]: {
                ...node,
                parentId: targetParentId,
              },
            }
          : card.nodes;
        const nextFrames = frame
          ? {
              ...nextFrameNodes,
              [objectId]: {
                ...nextFrameNodes[objectId],
                parentId: targetParentId,
              },
            }
          : nextFrameNodes;

        return {
          ...card,
          nodes: nextNodes,
          frameNodes: nextFrames,
          rootObjectIds: nextRootObjectIds,
        };
      },
    });
  };

  const applyTimetableObjectToEntryFrames = ({
    componentId,
    status,
    objectId,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    objectId: string;
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const entryFrames = v2_getTimetableEntryFrames(card);
        if (entryFrames.length === 0) return card;

        const sourceNode = card.nodes[objectId];
        const sourceFrame = card.frameNodes?.[objectId];
        if (!sourceNode && !sourceFrame) return card;

        const entryFrameIds = new Set(
          entryFrames.map((entryFrame) => entryFrame.frame.id)
        );
        const collectObjectTreeIds = (
          targetObjectId: string,
          collectedIds = new Set<string>()
        ) => {
          if (collectedIds.has(targetObjectId)) return collectedIds;
          collectedIds.add(targetObjectId);
          const targetFrame = card.frameNodes?.[targetObjectId];
          targetFrame?.childIds.forEach((childId) =>
            collectObjectTreeIds(childId, collectedIds)
          );
          return collectedIds;
        };
        const sourceTreeIds = collectObjectTreeIds(objectId);
        if (
          Array.from(sourceTreeIds).some((targetObjectId) =>
            entryFrameIds.has(targetObjectId)
          )
        ) {
          return card;
        }

        const nodes = { ...card.nodes };
        const frameNodes = { ...(card.frameNodes ?? {}) };
        let rootObjectIds = [...(card.rootObjectIds ?? card.nodeOrder)];
        let nodeOrder = [...card.nodeOrder];

        const removeObjectTree = (
          targetObjectId: string,
          visitedIds = new Set<string>()
        ) => {
          if (visitedIds.has(targetObjectId)) return;
          visitedIds.add(targetObjectId);
          const targetFrame = frameNodes[targetObjectId];
          targetFrame?.childIds.forEach((childId) =>
            removeObjectTree(childId, visitedIds)
          );
          delete nodes[targetObjectId];
          delete frameNodes[targetObjectId];
          rootObjectIds = rootObjectIds.filter((id) => id !== targetObjectId);
          nodeOrder = nodeOrder.filter((id) => id !== targetObjectId);
          Object.keys(frameNodes).forEach((frameId) => {
            const frame = frameNodes[frameId];
            if (!frame.childIds.includes(targetObjectId)) return;
            frameNodes[frameId] = {
              ...frame,
              childIds: frame.childIds.filter((id) => id !== targetObjectId),
            };
          });
        };

        const cloneObjectTree = (
          sourceObjectId: string,
          parentFrameId: string,
          entryFrame: V2TimetableEntryFrameInfo
        ): string | null => {
          const nextObjectId = v2_getTimetableEntryScopedObjectId(
            sourceObjectId,
            entryFrame.entryNumber
          );
          const templateNode = card.nodes[sourceObjectId];
          if (templateNode) {
            nodes[nextObjectId] = {
              ...templateNode,
              id: nextObjectId,
              label: v2_getTimetableEntryScopedLabel(
                templateNode.label,
                entryFrame.entryNumber
              ),
              layerId: v2_getTimetableEntryScopedLayerId(
                templateNode.layerId,
                entryFrame.entryNumber
              ),
              highlightTarget: `cardNode:${nextObjectId}`,
              parentId: parentFrameId,
              binding: v2_withTimetableEntryNodeBinding(
                templateNode.binding,
                entryFrame.entryIndex
              ),
            };
            if (!nodeOrder.includes(nextObjectId)) {
              nodeOrder.push(nextObjectId);
            }
            return nextObjectId;
          }

          const templateFrame = card.frameNodes?.[sourceObjectId];
          if (!templateFrame) return null;
          const childIds = templateFrame.childIds
            .map((childId) => cloneObjectTree(childId, nextObjectId, entryFrame))
            .filter((childId): childId is string => Boolean(childId));
          frameNodes[nextObjectId] = {
            ...templateFrame,
            id: nextObjectId,
            label: v2_getTimetableEntryScopedLabel(
              templateFrame.label,
              entryFrame.entryNumber
            ),
            layerId: v2_getTimetableEntryScopedLayerId(
              templateFrame.layerId,
              entryFrame.entryNumber
            ),
            highlightTarget: `cardFrame:${nextObjectId}`,
            parentId: parentFrameId,
            childIds,
            ...(templateFrame.bindingContext?.scope === "entry"
              ? {
                  bindingContext: {
                    scope: "entry" as const,
                    entryIndex: entryFrame.entryIndex,
                  },
                }
              : {}),
          };
          return nextObjectId;
        };

        const peerObjectIds = new Set([
          v2_getTimetableCommonObjectId(objectId),
          objectId,
          ...entryFrames.map((entryFrame) =>
            v2_getTimetableEntryScopedObjectId(objectId, entryFrame.entryNumber)
          ),
        ]);
        peerObjectIds.forEach((targetObjectId) =>
          removeObjectTree(targetObjectId)
        );

        entryFrames.forEach((entryFrame) => {
          const clonedObjectId = cloneObjectTree(
            objectId,
            entryFrame.frame.id,
            entryFrame
          );
          if (!clonedObjectId) return;
          const targetFrame = frameNodes[entryFrame.frame.id];
          if (!targetFrame) return;
          frameNodes[entryFrame.frame.id] = {
            ...targetFrame,
            childIds: [
              ...targetFrame.childIds.filter((childId) => childId !== clonedObjectId),
              clonedObjectId,
            ],
          };
        });

        const validObjectIds = new Set([
          ...Object.keys(nodes),
          ...Object.keys(frameNodes),
        ]);
        Object.values(frameNodes).forEach((frame) => {
          frame.childIds = frame.childIds.filter((childId) =>
            validObjectIds.has(childId)
          );
        });

        return {
          ...card,
          nodes,
          nodeOrder: nodeOrder.filter((nodeId) => nodes[nodeId]),
          frameNodes,
          rootObjectIds: rootObjectIds.filter((targetObjectId) =>
            validObjectIds.has(targetObjectId)
          ),
        };
      },
    });
  };

  const mergeTimetableEntryObjectToCommon = ({
    componentId,
    status,
    objectId,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    objectId: string;
  }) => {
    updateTimetableCardStructure({
      componentId,
      status,
      updater: (card) => {
        const entryFrames = v2_getTimetableEntryFrames(card);
        const sourceNode = card.nodes[objectId];
        const sourceFrame = card.frameNodes?.[objectId];
        if (!sourceNode && !sourceFrame) return card;

        const entryFrameIds = new Set(
          entryFrames.map((entryFrame) => entryFrame.frame.id)
        );
        const collectObjectTreeIds = (
          targetObjectId: string,
          collectedIds = new Set<string>()
        ) => {
          if (collectedIds.has(targetObjectId)) return collectedIds;
          collectedIds.add(targetObjectId);
          const targetFrame = card.frameNodes?.[targetObjectId];
          targetFrame?.childIds.forEach((childId) =>
            collectObjectTreeIds(childId, collectedIds)
          );
          return collectedIds;
        };
        const sourceTreeIds = collectObjectTreeIds(objectId);
        if (
          Array.from(sourceTreeIds).some((targetObjectId) =>
            entryFrameIds.has(targetObjectId)
          )
        ) {
          return card;
        }

        const nodes = { ...card.nodes };
        const frameNodes = { ...(card.frameNodes ?? {}) };
        let rootObjectIds = [...(card.rootObjectIds ?? card.nodeOrder)];
        let nodeOrder = [...card.nodeOrder];
        const sourceRootIndex = rootObjectIds.indexOf(objectId);

        const removeObjectTree = (
          targetObjectId: string,
          visitedIds = new Set<string>()
        ) => {
          if (visitedIds.has(targetObjectId)) return;
          visitedIds.add(targetObjectId);
          const targetFrame = frameNodes[targetObjectId];
          targetFrame?.childIds.forEach((childId) =>
            removeObjectTree(childId, visitedIds)
          );
          delete nodes[targetObjectId];
          delete frameNodes[targetObjectId];
          rootObjectIds = rootObjectIds.filter((id) => id !== targetObjectId);
          nodeOrder = nodeOrder.filter((id) => id !== targetObjectId);
          Object.keys(frameNodes).forEach((frameId) => {
            const frame = frameNodes[frameId];
            if (!frame.childIds.includes(targetObjectId)) return;
            frameNodes[frameId] = {
              ...frame,
              childIds: frame.childIds.filter((id) => id !== targetObjectId),
            };
          });
        };

        const cloneObjectTree = (
          sourceObjectId: string,
          parentFrameId: string | null
        ): string | null => {
          const nextObjectId = v2_getTimetableCommonObjectId(sourceObjectId);
          const templateNode = card.nodes[sourceObjectId];
          if (templateNode) {
            nodes[nextObjectId] = {
              ...templateNode,
              id: nextObjectId,
              label: v2_getTimetableCommonLabel(templateNode.label),
              layerId: v2_getTimetableCommonLayerId(templateNode.layerId),
              highlightTarget: `cardNode:${nextObjectId}`,
              parentId: parentFrameId,
              binding: v2_withoutTimetableEntryNodeBinding(templateNode.binding),
            };
            if (!nodeOrder.includes(nextObjectId)) {
              nodeOrder.push(nextObjectId);
            }
            return nextObjectId;
          }

          const templateFrame = card.frameNodes?.[sourceObjectId];
          if (!templateFrame) return null;
          const childIds = templateFrame.childIds
            .map((childId) => cloneObjectTree(childId, nextObjectId))
            .filter((childId): childId is string => Boolean(childId));
          frameNodes[nextObjectId] = {
            ...templateFrame,
            id: nextObjectId,
            label: v2_getTimetableCommonLabel(templateFrame.label),
            layerId: v2_getTimetableCommonLayerId(templateFrame.layerId),
            highlightTarget: `cardFrame:${nextObjectId}`,
            parentId: parentFrameId,
            childIds,
            bindingContext: undefined,
          };
          return nextObjectId;
        };

        const commonObjectId = v2_getTimetableCommonObjectId(objectId);
        const peerObjectIds = new Set([
          commonObjectId,
          objectId,
          ...entryFrames.map((entryFrame) =>
            v2_getTimetableEntryScopedObjectId(objectId, entryFrame.entryNumber)
          ),
        ]);
        peerObjectIds.forEach((targetObjectId) =>
          removeObjectTree(targetObjectId)
        );

        const clonedObjectId = cloneObjectTree(objectId, null);
        if (!clonedObjectId) return card;
        if (!rootObjectIds.includes(clonedObjectId)) {
          if (sourceRootIndex >= 0) {
            rootObjectIds.splice(sourceRootIndex, 0, clonedObjectId);
          } else {
            rootObjectIds.push(clonedObjectId);
          }
        }

        const validObjectIds = new Set([
          ...Object.keys(nodes),
          ...Object.keys(frameNodes),
        ]);
        Object.values(frameNodes).forEach((frame) => {
          frame.childIds = frame.childIds.filter((childId) =>
            validObjectIds.has(childId)
          );
        });

        return {
          ...card,
          nodes,
          nodeOrder: nodeOrder.filter((nodeId) => nodes[nodeId]),
          frameNodes,
          rootObjectIds: rootObjectIds.filter((targetObjectId) =>
            validObjectIds.has(targetObjectId)
          ),
        };
      },
    });
  };

  const addTimetableCardComponent = () => {
    safeUpdateConfig((prev) => {
      const timetable = prev.timetable;
      if (timetable.componentOrder.length >= 7) return prev;
      const usedIds = new Set(Object.keys(timetable.components));
      let index = timetable.componentOrder.length + 1;
      let nextComponentId = `card-${index}`;
      while (usedIds.has(nextComponentId)) {
        index += 1;
        nextComponentId = `card-${index}`;
      }
      const sourceComponent =
        timetable.components[timetable.componentOrder[0] ?? ""] ??
        Object.values(timetable.components)[0];
      if (!sourceComponent) return prev;
      const nextComponent = JSON.parse(
        JSON.stringify(sourceComponent)
      ) as typeof sourceComponent;
      nextComponent.id = nextComponentId;
      nextComponent.label = `Card ${index}`;

      return v2_withScopedTimetableStyles({
        ...prev,
        timetable: {
          ...timetable,
          componentOrder: [...timetable.componentOrder, nextComponentId],
          components: {
            ...timetable.components,
            [nextComponentId]: nextComponent,
          },
        },
      });
    });
  };

  const updateTimetableCardComponentLabel = (
    componentId: string,
    label: string
  ) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      if (!component) return prev;
      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              label,
            },
          },
        },
      };
    });
  };

  const appendTimetableStateNode = (
    componentId: string,
    status: V2TemplateTimetableCardStatusKey,
    kind: V2TemplateCardNodeKind,
    parentFrameId: string | null = null
  ) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      if (!component || !state) return prev;
      const parentFrame =
        parentFrameId && state.card.frameNodes?.[parentFrameId]
          ? state.card.frameNodes[parentFrameId]
          : null;

      const usedIds = new Set(Object.keys(state.card.nodes));
      let nextIndex = state.card.nodeOrder.length + 1;
      const baseId =
        kind === "flexibleText"
          ? "flexible-text"
          : kind === "image"
            ? "image"
            : "text";
      let nodeId = `${baseId}-${nextIndex}`;
      while (usedIds.has(nodeId)) {
        nextIndex += 1;
        nodeId = `${baseId}-${nextIndex}`;
      }

      const label =
        kind === "flexibleText"
          ? `FlexibleText ${nextIndex}`
          : kind === "image"
            ? `Image ${nextIndex}`
            : `Text ${nextIndex}`;
      const containerStyleKey = `timetableDraft:${componentId}:${status}:${nodeId}:container`;
      const textStyleKey = `timetableDraft:${componentId}:${status}:${nodeId}:text`;
      const optionsKey = `timetableDraft:${componentId}:${status}:${nodeId}:options`;

      const nextNode: V2TemplateCardNode = {
        id: nodeId,
        label,
        kind,
        layerId: `${componentId}:${status}:${nodeId}`,
        highlightTarget: `cardNode:${componentId}:${status}:${nodeId}`,
        binding: {
          mode: "literal",
          value: label,
        },
        parentId: parentFrame?.id ?? null,
        visibilityMode: "always",
        containerStyleKey,
        ...(kind !== "image" ? { textStyleKey } : {}),
        ...(kind === "flexibleText" ? { optionsKey } : {}),
        colorKey: "SUB_TITLE",
        fontKey: "SUB_TITLE",
        ...(kind === "image"
          ? {
              fit: "cover" as const,
              containerClassName: "absolute",
          }
          : {
              containerClassName: v2_DEFAULT_TEXT_NODE_CONTAINER_CLASS_NAME,
          }),
        ...(kind === "flexibleText"
          ? { textClassName: v2_DEFAULT_FLEXIBLE_TEXT_NODE_TEXT_CLASS_NAME }
          : {}),
      };

      const layoutPatch =
        kind === "image"
          ? {
              [containerStyleKey]: {
                position: "absolute",
                top: 0,
                left: 0,
                width: 240,
                height: 240,
              } as V2TemplateStyleRecord,
            }
          : v2_createDefaultTextNodeLayoutPatch({
              containerStyleKey,
              textStyleKey,
              optionsKey,
              isFlexibleText: kind === "flexibleText",
            });
      const rootObjectIds = parentFrame
        ? (state.card.rootObjectIds ?? state.card.nodeOrder)
        : [...(state.card.rootObjectIds ?? state.card.nodeOrder), nodeId];
      const frameNodes = parentFrame
        ? {
            ...(state.card.frameNodes ?? {}),
            [parentFrame.id]: {
              ...parentFrame,
              childIds: [...parentFrame.childIds, nodeId],
            },
          }
        : state.card.frameNodes;

      return v2_withScopedTimetableStyles({
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              states: {
                ...component.states,
                [status]: {
                  ...state,
                  card: {
                    ...state.card,
                    nodeOrder: [...state.card.nodeOrder, nodeId],
                    rootObjectIds,
                    nodes: {
                      ...state.card.nodes,
                      [nodeId]: nextNode,
                    },
                    ...(frameNodes ? { frameNodes } : {}),
                  },
                },
              },
            },
          },
        },
        layout: {
          ...prev.layout,
          card: {
            ...prev.layout.card,
            ...layoutPatch,
          },
        },
      });
    });
  };

  const appendTimetableStateFrame = (
    componentId: string,
    status: V2TemplateTimetableCardStatusKey,
    parentFrameId: string | null = null
  ) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      if (!component || !state) return prev;
      const parentFrame =
        parentFrameId && state.card.frameNodes?.[parentFrameId]
          ? state.card.frameNodes[parentFrameId]
          : null;

      const usedFrameIds = new Set(Object.keys(state.card.frameNodes ?? {}));
      let nextIndex = usedFrameIds.size + 1;
      let frameId = `frame-${nextIndex}`;
      while (usedFrameIds.has(frameId)) {
        nextIndex += 1;
        frameId = `frame-${nextIndex}`;
      }

      const styleKey = `timetableDraft:${componentId}:${status}:${frameId}:frame`;
      const rootObjectIds = parentFrame
        ? (state.card.rootObjectIds ?? state.card.nodeOrder)
        : [...(state.card.rootObjectIds ?? state.card.nodeOrder), frameId];
      const nextFrameNode = {
        id: frameId,
        label: `Frame ${nextIndex}`,
        kind: "frame" as const,
        layerId: `${componentId}:${status}:${frameId}`,
        highlightTarget: `cardFrame:${componentId}:${status}:${frameId}`,
        parentId: parentFrame?.id ?? null,
        visibilityMode: "always" as const,
        styleKey,
        childIds: [],
        containerClassName: "absolute",
      };
      const frameNodes = {
        ...(state.card.frameNodes ?? {}),
        ...(parentFrame
          ? {
              [parentFrame.id]: {
                ...parentFrame,
                childIds: [...parentFrame.childIds, frameId],
              },
            }
          : {}),
        [frameId]: nextFrameNode,
      };

      return v2_withScopedTimetableStyles({
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              states: {
                ...component.states,
                [status]: {
                  ...state,
                  card: {
                    ...state.card,
                    rootObjectIds,
                    frameNodes,
                  },
                },
              },
            },
          },
        },
        layout: {
          ...prev.layout,
          card: {
            ...prev.layout.card,
            [styleKey]: {
              position: "absolute",
              left: 0,
              top: 0,
              width: 320,
              height: 180,
              overflow: "visible",
            },
          },
        },
      });
    });
  };

  const removeTimetableStateNode = ({
    componentId,
    status,
    nodeId,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    nodeId: string;
  }) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      const node = state?.card.nodes[nodeId];
      if (!component || !state || !node) return prev;

      const nextNodes = { ...state.card.nodes };
      delete nextNodes[nodeId];
      const nextCardLayout = { ...prev.layout.card };
      [
        node.containerStyleKey,
        node.entryStyleKey,
        node.textStyleKey,
        node.wrapperStyleKey,
        node.optionsKey,
      ].forEach((styleKey) => {
        if (typeof styleKey === "string") {
          delete nextCardLayout[styleKey];
        }
      });

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              states: {
                ...component.states,
                [status]: {
                  ...state,
                  card: {
                    ...state.card,
                    nodeOrder: state.card.nodeOrder.filter((id) => id !== nodeId),
                    nodes: nextNodes,
                    rootObjectIds: (state.card.rootObjectIds ?? state.card.nodeOrder).filter(
                      (id) => id !== nodeId
                    ),
                    ...(state.card.frameNodes
                      ? {
                          frameNodes: Object.fromEntries(
                            Object.entries(state.card.frameNodes).map(
                              ([frameId, frame]) => [
                                frameId,
                                {
                                  ...frame,
                                  childIds: frame.childIds.filter(
                                    (childId) => childId !== nodeId
                                  ),
                                },
                              ]
                            )
                          ),
                        }
                      : {}),
                  },
                },
              },
            },
          },
        },
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
      };
    });
  };

  const removeTimetableStateFrame = ({
    componentId,
    status,
    frameId,
  }: {
    componentId: string;
    status: V2TemplateTimetableCardStatusKey;
    frameId: string;
  }) => {
    safeUpdateConfig((prev) => {
      const component = prev.timetable.components[componentId];
      const state = component?.states[status];
      const frameNodes = state?.card.frameNodes;
      const targetFrame = frameNodes?.[frameId];
      if (!component || !state || !frameNodes || !targetFrame) return prev;

      const removedFrameIds = new Set<string>();
      const removedNodeIds = new Set<string>();
      const collectObject = (objectId: string, visiting = new Set<string>()) => {
        if (visiting.has(objectId)) return;
        const nextVisiting = new Set(visiting);
        nextVisiting.add(objectId);
        const frame = frameNodes[objectId];
        if (frame) {
          removedFrameIds.add(objectId);
          frame.childIds.forEach((childId) => collectObject(childId, nextVisiting));
          return;
        }
        if (state.card.nodes[objectId]) {
          removedNodeIds.add(objectId);
        }
      };
      collectObject(frameId);

      const nextCardLayout = { ...prev.layout.card };
      removedFrameIds.forEach((removedFrameId) => {
        const frame = frameNodes[removedFrameId];
        if (frame) {
          delete nextCardLayout[frame.styleKey];
        }
      });
      removedNodeIds.forEach((removedNodeId) => {
        const node = state.card.nodes[removedNodeId];
        if (!node) return;
        [
          node.containerStyleKey,
          node.entryStyleKey,
          node.textStyleKey,
          node.wrapperStyleKey,
          node.optionsKey,
        ].forEach((styleKey) => {
          if (typeof styleKey === "string") {
            delete nextCardLayout[styleKey];
          }
        });
      });

      const nextNodes = { ...state.card.nodes };
      removedNodeIds.forEach((removedNodeId) => {
        delete nextNodes[removedNodeId];
      });
      const nextFrameNodes = Object.fromEntries(
        Object.entries(frameNodes)
          .filter(([candidateFrameId]) => !removedFrameIds.has(candidateFrameId))
          .map(([candidateFrameId, frame]) => [
            candidateFrameId,
            {
              ...frame,
              childIds: frame.childIds.filter(
                (childId) =>
                  !removedFrameIds.has(childId) && !removedNodeIds.has(childId)
              ),
            },
          ])
      );
      const rootObjectIds = (state.card.rootObjectIds ?? state.card.nodeOrder).filter(
        (objectId) => !removedFrameIds.has(objectId) && !removedNodeIds.has(objectId)
      );

      return {
        ...prev,
        timetable: {
          ...prev.timetable,
          components: {
            ...prev.timetable.components,
            [componentId]: {
              ...component,
              states: {
                ...component.states,
                [status]: {
                  ...state,
                  card: {
                    ...state.card,
                    nodeOrder: state.card.nodeOrder.filter(
                      (nodeId) => !removedNodeIds.has(nodeId)
                    ),
                    nodes: nextNodes,
                    rootObjectIds,
                    frameNodes: nextFrameNodes,
                  },
                },
              },
            },
          },
        },
        layout: {
          ...prev.layout,
          card: nextCardLayout,
        },
      };
    });
  };

  const renderTimetableGridControls = (
    options: {
      componentOnly?: boolean;
      gridOnly?: boolean;
      focusedLayerId?: string | null;
    } = {}
  ) => {
    const timetable = renderConfig.timetable;
    const selectedGridEmptySlots = v2_getGridEmptySlotsFromMap(
      (renderConfig.layout.grid as Record<string, string | number>) ?? {}
    );
    const extraAssetKeys = Object.keys(renderConfig.extraAssets ?? {}).sort(
      (a, b) => a.localeCompare(b)
    );
    const timetableDiagnostics = v2_collectTimetableDiagnostics(renderConfig);
    const getTimetableObjectParentOptions = (
      objectId: string
    ): Array<{ value: string | null; label: string }> => {
      if (!activeTimetableState) return [{ value: null, label: "Root" }];
      const frameNodes = activeTimetableState.card.frameNodes ?? {};
      const excludedFrameIds = new Set<string>([objectId]);
      const collectFrameDescendants = (frameId: string) => {
        const frame = frameNodes[frameId];
        if (!frame) return;
        frame.childIds.forEach((childId) => {
          if (!frameNodes[childId] || excludedFrameIds.has(childId)) return;
          excludedFrameIds.add(childId);
          collectFrameDescendants(childId);
        });
      };
      collectFrameDescendants(objectId);

      return [
        { value: null, label: "Root" },
        ...Object.values(frameNodes)
          .filter((frame) => !excludedFrameIds.has(frame.id))
          .map((frame) => ({
            value: frame.id,
            label: frame.label || frame.id,
          })),
      ];
    };

    const renderTimetableEntryScopeControls = (
      objectId: string
    ): React.ReactNode => {
      if (!activeTimetableState || !resolvedActiveTimetableComponentId) {
        return null;
      }
      const card = activeTimetableState.card;
      const object = card.frameNodes?.[objectId] ?? card.nodes[objectId];
      if (!object) return null;

      const entryFrames = v2_getTimetableEntryFrames(card);
      if (entryFrames.length === 0) return null;

      const entryFrameIds = new Set(
        entryFrames.map((entryFrame) => entryFrame.frame.id)
      );
      if (entryFrameIds.has(objectId)) return null;

      const collectObjectTreeIds = (
        targetObjectId: string,
        collectedIds = new Set<string>()
      ) => {
        if (collectedIds.has(targetObjectId)) return collectedIds;
        collectedIds.add(targetObjectId);
        const targetFrame = card.frameNodes?.[targetObjectId];
        targetFrame?.childIds.forEach((childId) =>
          collectObjectTreeIds(childId, collectedIds)
        );
        return collectedIds;
      };
      const containsEntryFrame = Array.from(collectObjectTreeIds(objectId)).some(
        (targetObjectId) => entryFrameIds.has(targetObjectId)
      );

      const resolveEntryParentFrame = (): V2TimetableEntryFrameInfo | null => {
        let parentId = object.parentId ?? null;
        while (parentId) {
          const parentEntryFrame = entryFrames.find(
            (entryFrame) => entryFrame.frame.id === parentId
          );
          if (parentEntryFrame) return parentEntryFrame;
          parentId = card.frameNodes?.[parentId]?.parentId ?? null;
        }
        return null;
      };

      const parentEntryFrame = resolveEntryParentFrame();
      const spreadLabel =
        entryFrames.length > 1 ? "Entry마다 배치" : "Entry 안에 배치";

      return (
        <div className="space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-100">Entry 배치</p>
            <span className="rounded border border-[#34415a] px-1.5 py-0.5 text-[10px] text-[#9ec1ff]">
              {parentEntryFrame
                ? `Entry ${parentEntryFrame.entryNumber}`
                : "Card 공통"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                applyTimetableObjectToEntryFrames({
                  componentId: resolvedActiveTimetableComponentId,
                  status: activeTimetableStatus,
                  objectId,
                })
              }
              disabled={containsEntryFrame}
              className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#323640] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {spreadLabel}
            </button>
            <button
              type="button"
              onClick={() =>
                mergeTimetableEntryObjectToCommon({
                  componentId: resolvedActiveTimetableComponentId,
                  status: activeTimetableStatus,
                  objectId,
                })
              }
              disabled={containsEntryFrame}
              className="rounded border border-[#3a3d44] bg-[#22252b] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#2b3038] disabled:cursor-not-allowed disabled:opacity-40"
            >
              공통으로 합치기
            </button>
          </div>
          {containsEntryFrame ? (
            <p className="text-[10px] text-[#8ca2c8]">
              Entry Frame을 포함한 묶음은 상위 Frame에서 먼저 분리해야 합니다.
            </p>
          ) : null}
        </div>
      );
    };

    const renderTimetableNodeBindingControls = (
      node: V2TemplateCardNode
    ): React.ReactNode => {
      if (!resolvedActiveTimetableComponentId) return null;
      const bindingSelectValue = v2_getNodeBindingSelectValue(node.binding);
      const updateBinding = (binding: V2TemplateCardNodeBinding) =>
        updateTimetableStateNodeBinding({
          componentId: resolvedActiveTimetableComponentId,
          status: activeTimetableStatus,
          nodeId: node.id,
          binding,
        });

      return (
        <div className="space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2">
          <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
            <label className="text-xs text-gray-400">데이터</label>
            <select
              value={bindingSelectValue}
              onChange={(event) => {
                const nextBinding = v2_parseNodeBindingFromSelectValue(
                  event.target.value,
                  node.binding
                );
                if (!nextBinding) return;
                updateBinding(nextBinding);
              }}
              className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            >
              <option value="literal">직접 입력</option>
              <optgroup label="Form field">
                {renderConfig.formSchema.fields.map((field) => (
                  <option
                    key={`timetable-node-${node.id}-field-${field.scope}-${field.key}`}
                    value={`field:${field.scope}:${field.key}`}
                  >
                    {field.scope}.{field.key}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Computed">
                {v2_BINDING_COMPUTED_OPTIONS.map((key) => (
                  <option
                    key={`timetable-node-${node.id}-computed-${key}`}
                    value={`computed:${key}`}
                  >
                    {key}
                  </option>
                ))}
              </optgroup>
            </select>
            {node.binding.mode === "literal" ? (
              <>
                <label className="text-xs text-gray-400">텍스트</label>
                <input
                  value={node.binding.value}
                  onChange={(event) =>
                    updateBinding({
                      mode: "literal",
                      value: event.target.value,
                    })
                  }
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                />
              </>
            ) : null}
            {(node.binding.mode === "computed" ||
              (node.binding.mode === "field" && node.binding.scope === "entry")) ? (
              <>
                <label className="text-xs text-gray-400">회차</label>
                <input
                  type="number"
                  min={1}
                  value={
                    node.binding.entrySelector?.mode === "index"
                      ? node.binding.entrySelector.index + 1
                      : ""
                  }
                  placeholder="Frame"
                  onChange={(event) => {
                    const rawValue = event.target.value.trim();
                    const index =
                      rawValue.length > 0
                        ? Math.max(0, Number(rawValue) - 1)
                        : null;
                    if (node.binding.mode === "computed") {
                      updateBinding({
                        ...node.binding,
                        ...(index === null
                          ? { entrySelector: undefined }
                          : {
                              entrySelector: {
                                mode: "index",
                                index,
                              },
                            }),
                      });
                      return;
                    }
                    if (node.binding.mode === "field" && node.binding.scope === "entry") {
                      updateBinding({
                        ...node.binding,
                        ...(index === null
                          ? { entrySelector: undefined }
                          : {
                              entrySelector: {
                                mode: "index",
                                index,
                              },
                            }),
                      });
                    }
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100 placeholder:text-gray-500"
                />
              </>
            ) : null}
          </div>
        </div>
      );
    };

    const renderTimetableObjectEditor = (
      objectId: string,
      depth = 0,
      renderDescendants = false
    ): React.ReactNode => {
      if (!activeTimetableState) return null;
      const frame = activeTimetableState.card.frameNodes?.[objectId];
      if (frame) {
        return (
          <div
            key={`timetable-frame-${frame.id}`}
            className="space-y-2 rounded border border-[#2f394d] bg-[#151c28] p-2"
            style={{ marginLeft: depth * 10 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-100">
                  {frame.label}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[#8fa6cf]">
                  frame
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!resolvedActiveTimetableComponentId) return;
                    moveTimetableStateObject({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      objectId: frame.id,
                      direction: "up",
                    });
                  }}
                  className="rounded border border-[#3a3d44] px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-[#22252b]"
                >
                  위
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!resolvedActiveTimetableComponentId) return;
                    moveTimetableStateObject({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      objectId: frame.id,
                      direction: "down",
                    });
                  }}
                  className="rounded border border-[#3a3d44] px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-[#22252b]"
                >
                  아래
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!resolvedActiveTimetableComponentId) return;
                    removeTimetableStateFrame({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      frameId: frame.id,
                    });
                  }}
                  className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
                >
                  삭제
                </button>
              </div>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-2 items-center">
              <label className="text-xs text-gray-400">이름</label>
              <input
                value={frame.label}
                onChange={(event) => {
                  if (!resolvedActiveTimetableComponentId) return;
                  updateTimetableStateFrameMeta({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    frameId: frame.id,
                    patch: { label: event.target.value },
                  });
                }}
                className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              />
              <label className="text-xs text-gray-400">표시</label>
              <select
                value={frame.visibilityMode ?? "always"}
                onChange={(event) => {
                  if (!resolvedActiveTimetableComponentId) return;
                  updateTimetableStateFrameMeta({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    frameId: frame.id,
                    patch: {
                      visibilityMode: event.target.value as V2TemplateVisibilityMode,
                    },
                  });
                }}
                className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              >
                {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
                  <option
                    key={`timetable-frame-${frame.id}-visible-${option.value}`}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-400">부모</label>
              <select
                value={frame.parentId ?? "__root__"}
                onChange={(event) => {
                  if (!resolvedActiveTimetableComponentId) return;
                  relocateTimetableStateObject({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    objectId: frame.id,
                    targetParentId:
                      event.target.value === "__root__"
                        ? null
                        : event.target.value,
                  });
                }}
                className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              >
                {getTimetableObjectParentOptions(frame.id).map((option) => (
                  <option
                    key={`timetable-frame-${frame.id}-parent-${option.value ?? "root"}`}
                    value={option.value ?? "__root__"}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {renderTimetableEntryScopeControls(frame.id)}
            {renderStyleSectionEditor({
              title: `${frame.label}.frame`,
              section: frame.styleKey,
              schemaSection: v2_OBJECT_STYLE_SCHEMA_SECTIONS.frame,
            })}
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  1,
                  enabledTimetableStatusKeys.length
                )}, minmax(0, 1fr))`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  appendTimetableStateNode(
                    resolvedActiveTimetableComponentId,
                    activeTimetableStatus,
                    "text",
                    frame.id
                  );
                }}
                className="rounded border border-[#3a3d44] bg-[#22252b] px-1.5 py-1 text-[10px] font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                + Text
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  appendTimetableStateNode(
                    resolvedActiveTimetableComponentId,
                    activeTimetableStatus,
                    "flexibleText",
                    frame.id
                  );
                }}
                className="rounded border border-[#3a3d44] bg-[#22252b] px-1.5 py-1 text-[10px] font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                + Flex
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  appendTimetableStateNode(
                    resolvedActiveTimetableComponentId,
                    activeTimetableStatus,
                    "image",
                    frame.id
                  );
                }}
                className="rounded border border-[#3a3d44] bg-[#22252b] px-1.5 py-1 text-[10px] font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                + Image
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  appendTimetableStateFrame(
                    resolvedActiveTimetableComponentId,
                    activeTimetableStatus,
                    frame.id
                  );
                }}
                className="rounded border border-[#3a3d44] bg-[#22252b] px-1.5 py-1 text-[10px] font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                + Frame
              </button>
            </div>
            {renderDescendants ? (
              <div className="space-y-2">
                {frame.childIds.length === 0 ? (
                  <div className="rounded border border-[#2f394d] bg-[#111923] px-2 py-1.5 text-[11px] text-[#8ca2c8]">
                    하위 오브젝트가 없습니다.
                  </div>
                ) : null}
                {frame.childIds.map((childId) =>
                  renderTimetableObjectEditor(childId, depth + 1, true)
                )}
              </div>
            ) : null}
          </div>
        );
      }

      const node = activeTimetableState.card.nodes[objectId];
      if (!node) return null;
      const isFlexibleText = node.kind === "flexibleText";
      const flexibleTextOptions =
        isFlexibleText && node.optionsKey
          ? renderConfig.layout.card[node.optionsKey]
          : null;
      const flexibleTextMultiline =
        typeof flexibleTextOptions?.multiline === "boolean"
          ? flexibleTextOptions.multiline
          : flexibleTextOptions?.multiline === undefined
            ? true
            : String(flexibleTextOptions.multiline).toLowerCase() === "true";
      const containerSchemaSection =
        node.kind === "image"
          ? v2_OBJECT_STYLE_SCHEMA_SECTIONS.image
          : isFlexibleText
            ? v2_OBJECT_STYLE_SCHEMA_SECTIONS.flexibleTextContainer
            : v2_OBJECT_STYLE_SCHEMA_SECTIONS.textContainer;
      const textSchemaSection = isFlexibleText
        ? v2_OBJECT_STYLE_SCHEMA_SECTIONS.flexibleTextStyle
        : v2_OBJECT_STYLE_SCHEMA_SECTIONS.textStyle;

      return (
        <div
          key={`timetable-state-node-${node.id}`}
          className="space-y-2 rounded border border-[#2f394d] bg-[#151c28] p-2"
          style={{ marginLeft: depth * 10 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-100">
                {node.label}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-[#8fa6cf]">
                {node.kind}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  moveTimetableStateObject({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    objectId: node.id,
                    direction: "up",
                  });
                }}
                className="rounded border border-[#3a3d44] px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-[#22252b]"
              >
                위
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  moveTimetableStateObject({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    objectId: node.id,
                    direction: "down",
                  });
                }}
                className="rounded border border-[#3a3d44] px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-[#22252b]"
              >
                아래
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!resolvedActiveTimetableComponentId) return;
                  removeTimetableStateNode({
                    componentId: resolvedActiveTimetableComponentId,
                    status: activeTimetableStatus,
                    nodeId: node.id,
                  });
                }}
                className="rounded border border-red-500/40 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10"
              >
                삭제
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[72px_1fr] gap-2 items-center">
            <label className="text-xs text-gray-400">이름</label>
            <input
              value={node.label}
              onChange={(event) => {
                if (!resolvedActiveTimetableComponentId) return;
                updateTimetableStateNodeMeta({
                  componentId: resolvedActiveTimetableComponentId,
                  status: activeTimetableStatus,
                  nodeId: node.id,
                  patch: { label: event.target.value },
                });
              }}
              className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            />
            <label className="text-xs text-gray-400">표시</label>
            <select
              value={node.visibilityMode ?? "always"}
              onChange={(event) => {
                if (!resolvedActiveTimetableComponentId) return;
                updateTimetableStateNodeMeta({
                  componentId: resolvedActiveTimetableComponentId,
                  status: activeTimetableStatus,
                  nodeId: node.id,
                  patch: {
                    visibilityMode: event.target.value as V2TemplateVisibilityMode,
                  },
                });
              }}
              className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              >
                {v2_CARD_NODE_VISIBILITY_OPTIONS.map((option) => (
                  <option
                    key={`timetable-node-${node.id}-visible-${option.value}`}
                  value={option.value}
                >
                  {option.label}
                  </option>
                ))}
              </select>
            <label className="text-xs text-gray-400">부모</label>
            <select
              value={node.parentId ?? "__root__"}
              onChange={(event) => {
                if (!resolvedActiveTimetableComponentId) return;
                relocateTimetableStateObject({
                  componentId: resolvedActiveTimetableComponentId,
                  status: activeTimetableStatus,
                  objectId: node.id,
                  targetParentId:
                    event.target.value === "__root__"
                      ? null
                      : event.target.value,
                });
              }}
              className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            >
              {getTimetableObjectParentOptions(node.id).map((option) => (
                <option
                  key={`timetable-node-${node.id}-parent-${option.value ?? "root"}`}
                  value={option.value ?? "__root__"}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {node.kind !== "image" ? (
              <>
                <label className="text-xs text-gray-400">색상</label>
                <select
                  value={node.colorKey}
                  onChange={(event) => {
                    if (!resolvedActiveTimetableComponentId) return;
                    updateTimetableStateNodeMeta({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      nodeId: node.id,
                      patch: {
                        colorKey: event.target.value as V2TemplateColorKey,
                      },
                    });
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                >
                  {v2_TEMPLATE_COLOR_KEYS.map((colorKey) => (
                    <option
                      key={`timetable-node-${node.id}-color-${colorKey}`}
                      value={colorKey}
                    >
                      {colorKey}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-gray-400">폰트</label>
                <select
                  value={node.fontKey}
                  onChange={(event) => {
                    if (!resolvedActiveTimetableComponentId) return;
                    updateTimetableStateNodeMeta({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      nodeId: node.id,
                      patch: {
                        fontKey: event.target.value as V2TemplateFontKey,
                      },
                    });
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                >
                  {v2_TEMPLATE_COLOR_KEYS.map((fontKey) => (
                    <option
                      key={`timetable-node-${node.id}-font-${fontKey}`}
                      value={fontKey}
                    >
                      {fontKey}
                    </option>
                  ))}
                </select>
              </>
            ) : null}
            {isFlexibleText && node.optionsKey ? (
              <>
                <label className="text-xs text-gray-400">멀티라인</label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-100">
                  <input
                    type="checkbox"
                    checked={Boolean(flexibleTextMultiline)}
                    onChange={(event) => {
                      if (!resolvedActiveTimetableComponentId || !node.optionsKey) {
                        return;
                      }
                      updateTimetableStateNodeOptions({
                        componentId: resolvedActiveTimetableComponentId,
                        status: activeTimetableStatus,
                        optionsKey: node.optionsKey,
                        patch: {
                          multiline: event.target.checked,
                        },
                      });
                    }}
                    className="accent-[#4f8cff]"
                  />
                  사용
                </label>
              </>
            ) : null}
            {node.kind === "image" ? (
              <>
                <label className="text-xs text-gray-400">에셋</label>
                <select
                  value={v2_toAssetSelectValue(node.assetRef)}
                  onChange={(event) => {
                    if (!resolvedActiveTimetableComponentId) return;
                    updateTimetableStateNodeMeta({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      nodeId: node.id,
                      patch: {
                        assetRef:
                          v2_fromAssetSelectValue(event.target.value) ??
                          undefined,
                      },
                    });
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                >
                  <option value="__none__">선택 안함</option>
                  <optgroup label="Built-in">
                    {v2_ASSET_KEYS.map((assetKey) => (
                      <option
                        key={`timetable-node-${node.id}-asset-${assetKey}`}
                        value={`builtin:${assetKey}`}
                      >
                        {v2_ASSET_LABELS[assetKey]}
                      </option>
                    ))}
                  </optgroup>
                  {extraAssetKeys.length > 0 ? (
                    <optgroup label="추가 요소">
                      {extraAssetKeys.map((assetKey) => (
                        <option
                          key={`timetable-node-${node.id}-extra-asset-${assetKey}`}
                          value={`extra:${assetKey}`}
                        >
                          {assetKey}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
                <label className="text-xs text-gray-400">fit</label>
                <select
                  value={node.fit ?? "cover"}
                  onChange={(event) => {
                    if (!resolvedActiveTimetableComponentId) return;
                    updateTimetableStateNodeMeta({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      nodeId: node.id,
                      patch: {
                        fit: event.target.value as V2TemplateCardNode["fit"],
                      },
                    });
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                >
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="fill">fill</option>
                </select>
                <label className="text-xs text-gray-400">alt</label>
                <input
                  value={node.alt ?? ""}
                  onChange={(event) => {
                    if (!resolvedActiveTimetableComponentId) return;
                    updateTimetableStateNodeMeta({
                      componentId: resolvedActiveTimetableComponentId,
                      status: activeTimetableStatus,
                      nodeId: node.id,
                      patch: {
                        alt: event.target.value || undefined,
                      },
                    });
                  }}
                  className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                />
              </>
            ) : null}
          </div>
          {renderTimetableEntryScopeControls(node.id)}
          {node.kind === "image" ? null : renderTimetableNodeBindingControls(node)}
          {renderStyleSectionEditor({
            title: `${node.label}.container`,
            section: node.containerStyleKey,
            schemaSection: containerSchemaSection,
          })}
          {node.textStyleKey ? (
            renderStyleSectionEditor({
              title: `${node.label}.text`,
              section: node.textStyleKey,
              schemaSection: textSchemaSection,
            })
          ) : null}
        </div>
      );
    };

    const gridEditButton = (
      <button
        type="button"
        onClick={() => onEnterTimetableGridEditScope?.()}
        disabled={!onEnterTimetableGridEditScope}
        className="shrink-0 rounded border border-[#4f8cff]/60 bg-[#1f3b6d] px-2.5 py-1.5 text-xs font-semibold text-[#dbe8ff] hover:bg-[#284778] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Grid 편집
      </button>
    );
    const cardComponentEditButton = (
      <button
        type="button"
        onClick={() =>
          onEnterTimetableComponentEditScope?.({
            componentId: resolvedActiveTimetableComponentId ?? undefined,
            status: activeTimetableStatus,
          })
        }
        disabled={
          !resolvedActiveTimetableComponentId ||
          !onEnterTimetableComponentEditScope
        }
        className="rounded border border-[#4f8cff]/60 bg-[#1f3b6d] px-2.5 py-1.5 text-xs font-semibold text-[#dbe8ff] hover:bg-[#284778] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Card Component 편집
      </button>
    );

    const timetableDiagnosticsPanel = (
      <div
        className={`rounded border px-2.5 py-2 text-[11px] ${
          timetableDiagnostics.length > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
            : "border-[#2f394d] bg-[#101722] text-[#8ca2c8]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-100">구조 진단</p>
          <span className="text-[10px] uppercase tracking-wide text-[#8fa6cf]">
            {timetableDiagnostics.length > 0
              ? `${timetableDiagnostics.length} issue`
              : "clean"}
          </span>
        </div>
        {timetableDiagnostics.length > 0 ? (
          <ul className="mt-1.5 space-y-1">
            {timetableDiagnostics.slice(0, 8).map((diagnostic) => (
              <li key={diagnostic.key} className="flex gap-1.5">
                <span
                  className={
                    diagnostic.severity === "error"
                      ? "font-semibold text-red-300"
                      : "font-semibold text-amber-200"
                  }
                >
                  {diagnostic.severity === "error" ? "오류" : "주의"}
                </span>
                <span>
                  {diagnostic.title}: {diagnostic.detail}
                </span>
              </li>
            ))}
            {timetableDiagnostics.length > 8 ? (
              <li className="text-[#f2d49a]">
                외 {timetableDiagnostics.length - 8}개 문제가 더 있습니다.
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-1 text-[#8ca2c8]">
            현재 선택된 시간표 구조에서 깨진 참조가 감지되지 않았습니다.
          </p>
        )}
      </div>
    );

    const timetableLayoutControls = (
      <div className="grid grid-cols-2 gap-2 items-center">
        <label className="text-xs text-gray-400">배치 모드</label>
        <select
          value={timetable.layoutMode}
          onChange={(event) =>
            updateTimetableLayoutMode(
              event.target.value as V2TemplateTimetableGridLayoutMode
            )
          }
          className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
        >
          <option value="grid3x3">3 x 3</option>
          <option value="flex4x2">4 x 2</option>
          <option value="free">자유배치</option>
        </select>
        {timetable.layoutMode === "grid3x3" ? (
          <div className="col-span-2 space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-100">
                비울 칸 선택
              </span>
              <span className="text-[10px] text-[#8ca2c8]">
                최대 2칸
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, index) => index + 1).map((slot) => {
                const isSelected = selectedGridEmptySlots.includes(slot);
                return (
                  <button
                    key={`timetable-grid-empty-slot-${slot}`}
                    type="button"
                    onClick={() => pickTimetableGridEmptySlot(slot)}
                    className={`relative h-10 rounded border px-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-[#4f8cff] bg-[#1f3b6d] text-[#dbe8ff]"
                        : "border-[#3a3d44] bg-[#2a2d33] text-gray-200 hover:bg-[#323640]"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {timetable.layoutMode === "flex4x2" ? (
          <>
            <label className="text-xs text-gray-400">3칸 줄</label>
            <select
              value={timetable.flex42ThreeRow}
              onChange={(event) =>
                updateTimetableFlex42Option(
                  "flex42ThreeRow",
                  event.target.value as V2TemplateTimetableFlex42ThreeRow
                )
              }
              className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            >
              <option value="top">위</option>
              <option value="bottom">아래</option>
            </select>
            <label className="text-xs text-gray-400">3칸 정렬</label>
            <select
              value={timetable.flex42Align}
              onChange={(event) =>
                updateTimetableFlex42Option(
                  "flex42Align",
                  event.target.value as V2TemplateTimetableFlex42Align
                )
              }
              className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            >
              <option value="left">왼쪽</option>
              <option value="center">가운데</option>
              <option value="right">오른쪽</option>
            </select>
          </>
        ) : null}
        <label className="text-xs text-gray-400">다회차 상태</label>
        <div className="inline-flex items-center gap-2 justify-self-start text-xs text-gray-100">
          <V2SettingSwitch
            checked={timetable.statusOptions.multi}
            onCheckedChange={(checked) =>
              updateTimetableStatusOption("multi", checked)
            }
            ariaLabel="다회차 상태 사용"
          />
          <span>{timetable.statusOptions.multi ? "사용" : "미사용"}</span>
        </div>
        {timetable.statusOptions.multi ? (
          <>
            <label className="text-xs text-gray-400">다회차 수</label>
            <input
              type="number"
              min={v2_MIN_TIMETABLE_MULTI_ENTRY_COUNT}
              max={v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT}
              value={timetable.multiEntryCount}
              onChange={(event) =>
                updateTimetableMultiEntryCount(Number(event.target.value))
              }
              className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
            />
          </>
        ) : null}
        <label className="text-xs text-gray-400">오프라인 메모</label>
        <div className="inline-flex items-center gap-2 justify-self-start text-xs text-gray-100">
          <V2SettingSwitch
            checked={timetable.statusOptions.offlineMemo}
            onCheckedChange={(checked) =>
              updateTimetableStatusOption("offlineMemo", checked)
            }
            ariaLabel="오프라인 메모 사용"
          />
          <span>{timetable.statusOptions.offlineMemo ? "사용" : "미사용"}</span>
        </div>
      </div>
    );

    const timetableSlotControls = (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-100">
            카드 컴포넌트 {timetable.componentOrder.length}/7
          </p>
          <button
            type="button"
            onClick={addTimetableCardComponent}
            disabled={timetable.componentOrder.length >= 7}
            className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#333844] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + 컴포넌트
          </button>
        </div>

        <div className="space-y-1.5">
          {dayKeyOptions.map((option) => {
            const slot = timetable.slots[option.value] ?? {
              dayKey: option.value,
              componentId: timetable.componentOrder[0] ?? "",
            };
            const isFreeLayout = timetable.layoutMode === "free";
            return (
              <div
                key={`timetable-slot-${option.value}`}
                className={
                  isFreeLayout
                    ? "space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2"
                    : "grid grid-cols-[88px_1fr] gap-2 items-center"
                }
              >
                <div
                  className={
                    isFreeLayout
                      ? "grid grid-cols-[64px_1fr_auto] gap-2 items-center"
                      : "contents"
                  }
                >
                  <span className="text-xs text-gray-400">{option.label}</span>
                  <select
                    value={slot.componentId}
                    onChange={(event) =>
                      updateTimetableSlotComponent(
                        option.value,
                        event.target.value
                      )
                    }
                    className="min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                  >
                    {timetableComponentOptions.map((componentOption) => (
                      <option
                        key={`timetable-slot-${option.value}-${componentOption.value}`}
                        value={componentOption.value}
                      >
                        {componentOption.label}
                      </option>
                    ))}
                  </select>
                  {isFreeLayout ? (
                    <button
                      type="button"
                      onClick={() => resetTimetableSlotTransform(option.value)}
                      disabled={!slot.transform}
                      className="rounded border border-[#3a3d44] bg-[#22252b] px-2 py-1.5 text-[11px] font-semibold text-gray-100 hover:bg-[#2b3038] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      초기화
                    </button>
                  ) : null}
                </div>
                {isFreeLayout ? (
                  <div className="grid grid-cols-2 gap-2">
                    {v2_TIMETABLE_SLOT_TRANSFORM_CONTROLS.map((control) => (
                      <label
                        key={`timetable-slot-${option.value}-${control.key}`}
                        className="min-w-0 space-y-1"
                      >
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#8fa6cf]">
                          {control.label}
                        </span>
                        <input
                          type="number"
                          value={v2_getSlotTransformInputValue(
                            slot.transform,
                            control.key
                          )}
                          step={control.step}
                          min={control.min}
                          max={control.max}
                          onChange={(event) => {
                            const rawValue = event.target.value.trim();
                            updateTimetableSlotTransformValue({
                              dayKey: option.value,
                              key: control.key,
                              value:
                                rawValue.length > 0 ? Number(rawValue) : null,
                            });
                          }}
                          className="w-full min-w-0 rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );

    const timetableGridSettingsPanel = (
      <div className="space-y-3 rounded border border-[#2f394d] bg-[#101722] p-2">
        <div>
          <p className="font-semibold text-gray-100">Grid 설정</p>
          <p className="text-[#9ec1ff]">
            배치와 요일 슬롯은 Grid 편집 화면에서만 조정합니다.
          </p>
        </div>
        {timetableDiagnosticsPanel}
        {timetableLayoutControls}
        {timetableSlotControls}
      </div>
    );

    if (options.gridOnly) {
      return (
        <div className="space-y-3 rounded border border-[#3a3d44] bg-[#141821] px-2.5 py-2 text-[11px] text-gray-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-100">Timetable Grid</p>
              <p className="text-[#9ec1ff]">
                Grid 배치와 요일 슬롯만 편집합니다.
              </p>
            </div>
            {onExitTimetableGridEditScope ? (
              <button
                type="button"
                onClick={onExitTimetableGridEditScope}
                className="shrink-0 rounded border border-[#3a3d44] bg-[#22252b] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                Scene으로
              </button>
            ) : null}
          </div>

          {timetableGridSettingsPanel}

          <div className="space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2">
            <div>
              <p className="font-semibold text-gray-100">Card Component</p>
              <p className="text-[#8ca2c8]">
                Card 내부 오브젝트와 상태별 스타일은 상세 편집에서 조정합니다.
              </p>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-2 items-center">
              <label className="text-xs text-gray-400">컴포넌트</label>
              <select
                value={resolvedActiveTimetableComponentId ?? ""}
                onChange={(event) =>
                  selectTimetableComponentForEditing(event.target.value || null)
                }
                className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              >
                {timetableComponentOptions.map((componentOption) => (
                  <option
                    key={`timetable-grid-component-${componentOption.value}`}
                    value={componentOption.value}
                  >
                    {componentOption.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">{cardComponentEditButton}</div>
          </div>
        </div>
      );
    }

    if (options.componentOnly) {
      const focusedTimetableObjectId = v2_findTimetableCardObjectIdByLayerId({
        card: activeTimetableState?.card,
        layerId: options.focusedLayerId,
      });
      const focusedTimetableObject = activeTimetableState && focusedTimetableObjectId
        ? activeTimetableState.card.frameNodes?.[focusedTimetableObjectId] ??
          activeTimetableState.card.nodes[focusedTimetableObjectId]
        : null;
      const isCardFrameFocused = Boolean(
        activeTimetableState &&
          options.focusedLayerId &&
          options.focusedLayerId === activeTimetableCardLayerId
      );
      const renderedObjectIds = focusedTimetableObjectId
        ? [focusedTimetableObjectId]
        : [];
      const selectedObjectLabel = focusedTimetableObject
        ? `선택: ${focusedTimetableObject.label}`
        : isCardFrameFocused
          ? "선택: Card frame"
          : "오브젝트 선택";
      const selectedObjectKind = focusedTimetableObject
        ? focusedTimetableObject.kind
        : isCardFrameFocused
          ? "card"
          : null;

      return (
        <div className="space-y-3 rounded border border-[#3a3d44] bg-[#141821] px-2.5 py-2 text-[11px] text-gray-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-100">Card Component</p>
              <p className="text-[#9ec1ff]">
                Grid 편집 화면에서는 선택한 카드 컴포넌트만 편집합니다.
              </p>
            </div>
            {onExitTimetableComponentEditScope ? (
              <button
                type="button"
                onClick={onExitTimetableComponentEditScope}
                className="shrink-0 rounded border border-[#3a3d44] bg-[#22252b] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                Grid로
              </button>
            ) : null}
          </div>

          <div className="space-y-2 rounded border border-[#2f394d] bg-[#101722] p-2">
            <div className="grid grid-cols-[88px_1fr] gap-2 items-center">
              <label className="text-xs text-gray-400">컴포넌트</label>
              <select
                value={resolvedActiveTimetableComponentId ?? ""}
                onChange={(event) =>
                  selectTimetableComponentForEditing(event.target.value || null)
                }
                className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              >
                {timetableComponentOptions.map((componentOption) => (
                  <option
                    key={`timetable-scope-component-${componentOption.value}`}
                    value={componentOption.value}
                  >
                    {componentOption.label}
                  </option>
                ))}
              </select>
              <label className="text-xs text-gray-400">이름</label>
              <input
                value={activeTimetableComponent?.label ?? ""}
                onChange={(event) => {
                  if (!resolvedActiveTimetableComponentId) return;
                  updateTimetableCardComponentLabel(
                    resolvedActiveTimetableComponentId,
                    event.target.value
                  );
                }}
                className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs text-gray-100"
              />
            </div>

            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${Math.max(
                  1,
                  enabledTimetableStatusKeys.length
                )}, minmax(0, 1fr))`,
              }}
            >
              {enabledTimetableStatusKeys.map((status) => (
                <button
                  key={`timetable-scope-status-${status}`}
                  type="button"
                  onClick={() => selectTimetableStatusForEditing(status)}
                  className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                    activeTimetableStatus === status
                      ? "border-[#4f8cff] bg-[#1f3b6d] text-[#dbe8ff]"
                      : "border-[#3a3d44] bg-[#22252b] text-gray-300 hover:bg-[#2b3038]"
                  }`}
                >
                  {v2_TIMETABLE_STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            {activeTimetableState ? (
              <div className="space-y-2">
                {isCardFrameFocused
                  ? renderStyleSectionEditor({
                      title: "card frame",
                      section: activeTimetableState.card.containerStyleKey,
                      schemaSection: v2_OBJECT_STYLE_SCHEMA_SECTIONS.frame,
                    })
                  : null}

                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!resolvedActiveTimetableComponentId) return;
                      appendTimetableStateNode(
                        resolvedActiveTimetableComponentId,
                        activeTimetableStatus,
                        "text"
                      );
                    }}
                    className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
                  >
                    + Text
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!resolvedActiveTimetableComponentId) return;
                      appendTimetableStateNode(
                        resolvedActiveTimetableComponentId,
                        activeTimetableStatus,
                        "flexibleText"
                      );
                    }}
                    className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
                  >
                    + FlexibleText
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!resolvedActiveTimetableComponentId) return;
                      appendTimetableStateNode(
                        resolvedActiveTimetableComponentId,
                        activeTimetableStatus,
                        "image"
                      );
                    }}
                    className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
                  >
                    + Image
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!resolvedActiveTimetableComponentId) return;
                      appendTimetableStateFrame(
                        resolvedActiveTimetableComponentId,
                        activeTimetableStatus
                      );
                    }}
                    className="rounded border border-[#3a3d44] bg-[#2a2d33] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
                  >
                    + Frame
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-100">
                      {selectedObjectLabel}
                    </p>
                    {selectedObjectKind ? (
                      <span className="text-[10px] uppercase tracking-wide text-[#8fa6cf]">
                        {selectedObjectKind}
                      </span>
                    ) : null}
                  </div>
                  {!isCardFrameFocused && renderedObjectIds.length === 0 ? (
                    <div className="rounded border border-[#2f394d] bg-[#111923] px-2 py-1.5 text-[11px] text-[#8ca2c8]">
                      왼쪽 Layers에서 편집할 오브젝트를 선택해 주세요.
                    </div>
                  ) : null}
                  {renderedObjectIds.map((objectId) =>
                    renderTimetableObjectEditor(objectId)
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-2 text-[11px] text-gray-400">
                편집할 카드 컴포넌트가 없습니다.
              </div>
            )}
          </div>
        </div>
      );
    }

    return <div className="flex justify-end">{gridEditButton}</div>;
  };

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
    schemaSection,
  }: {
    title: string;
    section: V2StyleSectionId;
    schemaSection?: V2StyleSectionId;
  }) => (
    <TemplateStyleSectionEditor
      title={title}
      section={section}
      schemaSection={schemaSection}
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
    renderStyleSectionEditor: ({ title, section, schemaSection }) =>
      renderStyleSectionEditor({
        title,
        section: section as V2StyleSectionId,
        schemaSection: schemaSection as V2StyleSectionId | undefined,
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
    renderTimetableGridControls: () => renderTimetableGridControls(),
    renderSceneGroupExtraControls: (node) => {
      const feature =
        node.layerId === "artist"
          ? "artist"
          : node.layerId === "memo"
            ? "memo"
            : null;
      if (!feature && node.layerId && onEnterSceneUnitEditScope) {
        return (
          <div className="rounded border border-[#3a3d44] bg-[#141821] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-100">
                  내부 오브젝트 편집
                </p>
                <p className="mt-1 text-[11px] leading-5 text-gray-400">
                  이 scene unit의 자식 오브젝트를 별도 편집 화면에서 조정합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onEnterSceneUnitEditScope({
                    layerId: node.layerId ?? node.id,
                    label: node.label,
                  })
                }
                className="shrink-0 rounded border border-[#4f8cff] bg-[#1f3f75] px-3 py-2 text-xs font-semibold text-[#dbe8ff] hover:bg-[#294c86]"
              >
                편집
              </button>
            </div>
          </div>
        );
      }
      if (!feature || !onEnterStatefulSceneEditScope) return null;
      const label = feature === "artist" ? "Artist" : "Memo";
      return (
        <div className="rounded border border-[#3a3d44] bg-[#141821] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-100">
                {label} 상태 편집
              </p>
              <p className="mt-1 text-[11px] leading-5 text-gray-400">
                ON/OFF 상태별 내부 오브젝트를 별도 편집 화면에서 조정합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onEnterStatefulSceneEditScope({
                  feature,
                  status: "on",
                })
              }
              className="shrink-0 rounded border border-[#4f8cff] bg-[#1f3f75] px-3 py-2 text-xs font-semibold text-[#dbe8ff] hover:bg-[#294c86]"
            >
              편집
            </button>
          </div>
        </div>
      );
    },
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
    getComponentContainerStyleKey: (componentId) =>
      runtimeCardStructuresByComponentId[componentId]?.containerStyleKey ?? null,
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
    cardInstanceTransforms: activeCardStructure?.instanceTransforms ?? {},
    cardComponentInstances: activeCardComponentInstances,
    cardComponentInstanceDiagnostics: activeCardComponentInstanceDiagnostics,
    onAppendCardTextNode: () => appendCardNode("text"),
    onAppendCardFlexibleTextNode: () => appendCardNode("flexibleText"),
    onAppendCardImageNode: () => appendCardNode("image"),
    onUpdateCardInstanceTransform: updateCardInstanceTransform,
    renderStyleSectionEditor,
  });

  const renderStatefulSceneScopeControls = () => {
    if (!statefulSceneEditScope) return null;
    const label = statefulSceneEditScope.feature === "artist" ? "Artist" : "Memo";
    const statusOptions = [
      { value: "on" as const, label: "ON" },
      { value: "off" as const, label: "OFF" },
    ];
    return (
      <div className="mb-3 rounded-xl border border-[#3a3d44] bg-[#1a1c20] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-100">
              {label} 상태 편집
            </p>
            <p className="mt-1 text-[11px] leading-5 text-gray-400">
              현재 상태에 해당하는 레이어만 왼쪽 목록과 프리뷰에 표시합니다.
            </p>
          </div>
          {onExitStatefulSceneEditScope ? (
            <button
              type="button"
              onClick={onExitStatefulSceneEditScope}
              className="rounded border border-[#4f8cff] bg-[#1f3f75] px-3 py-2 text-xs font-semibold text-[#dbe8ff] hover:bg-[#294c86]"
            >
              Scene으로
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {statusOptions.map((option) => {
            const active = statefulSceneEditScope.status === option.value;
            return (
              <button
                key={`stateful-scene-status-${option.value}`}
                type="button"
                onClick={() =>
                  onChangeStatefulSceneEditScope?.({
                    feature: statefulSceneEditScope.feature,
                    status: option.value,
                  })
                }
                className={`rounded border px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "border-[#4f8cff] bg-[#1f3f75] text-[#dbe8ff]"
                    : "border-[#3a3d44] bg-[#141821] text-gray-400 hover:bg-[#202838] hover:text-gray-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPropertiesTab = () => (
    <TemplatePropertiesTab
      inspectorRef={propertiesInspectorRef}
      selectedLabel={
        timetableComponentEditScope
          ? "Card Component"
          : timetableGridEditScope
            ? "Grid"
            : sceneUnitEditScope
              ? sceneUnitEditScope.label
              : statefulSceneEditScope
                ? `${statefulSceneEditScope.feature === "artist" ? "Artist" : "Memo"} State`
                : selectedPropertiesLabel
      }
      editorMode={selectedPropertiesEditorMode}
      onMouseLeave={clearSectionHoverHighlight}
      onBlurOutside={() => setActiveHighlightTarget(null)}
    >
      {timetableComponentEditScope ? (
        renderTimetableGridControls({
          componentOnly: true,
          focusedLayerId: focusLayerId,
        })
      ) : timetableGridEditScope ? (
        renderTimetableGridControls({
          gridOnly: true,
        })
      ) : (
        <>
          {sceneUnitEditScope && onExitSceneUnitEditScope ? (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={onExitSceneUnitEditScope}
                className="rounded border border-[#3a3d44] bg-[#22252b] px-2 py-1.5 text-xs font-semibold text-gray-100 hover:bg-[#2b3038]"
              >
                Scene으로
              </button>
            </div>
          ) : null}
          {renderStatefulSceneScopeControls()}
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
                Layers 탭에서 오브젝트를 선택하거나, 레이어 영역을 우클릭해 새
                오브젝트를 추가하세요.
              </div>
            )}
          />
        </>
      )}
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
                  v2_MAX_TIMETABLE_MULTI_ENTRY_COUNT,
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
