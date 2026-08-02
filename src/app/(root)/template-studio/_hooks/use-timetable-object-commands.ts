"use client";
import { useCallback } from "react";
import type {
  StudioGraphNode,
  StudioImageFit,
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioSelectOption,
  StudioTemplateDocument,
  StudioTimetableCapabilityKey,
  StudioTimetableComponentId,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableDomain,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  cloneStudioTimetableComponentSet,
  deleteStudioTimetableComponentSet,
  getStudioTimetableComponentSetDeleteReason,
} from "@/utils/template-studio/component-sets";
import { getStudioInputDefaultValue } from "@/utils/template-studio/input-values";
import { createStudioId } from "@/utils/template-studio/id";
import { ensureStudioPresetImageInput } from "@/utils/template-studio/preset-inputs";
import {
  applyStudioInsertNode,
  createStudioSelectConsumerNode,
  planStudioAddCardContextObject,
  planStudioAddCardStatusBackground,
  resolveStudioNodeInsertionParentId,
} from "@/utils/template-studio/node-commands";
import {
  getStudioPresetCreationRule,
  getStudioPresetExistingTargetId,
  type StudioCardContextObjectPreset,
  type StudioCardSelectInputBundlePreset,
  type StudioCardStatusBackgroundPreset,
} from "@/utils/template-studio/preset-registry";
import {
  setStudioCardsGuideAsset,
  setStudioCardsGuideOpacity,
  setStudioCardsGuideVisibility,
  setStudioTimetableGuideAsset,
  setStudioTimetableGuideOpacity,
  setStudioTimetableGuideVisibility,
} from "@/utils/template-studio/timetable-guide";
import {
  addStudioTimetableEntry,
  getStudioTimetableDaysWithMultipleEntries,
  getStudioTimetableEffectiveMaxEntriesPerDay,
  getStudioTimetableEntriesForDay,
  removeStudioTimetableEntry,
  resolveStudioTimetableComponentVariant,
  setStudioTimetableEntryStatus,
} from "@/utils/template-studio/timetable-runtime";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import { ensureStudioCapabilityVariant } from "@/utils/template-studio/status-variants";
import { setStudioStatusCardBackgroundAssetSlot } from "@/utils/template-studio/status-card-background";
import { createInitialStudioRuntimeValues } from "@/utils/template-studio/sample-document";
import {
  isStudioFillParentLayout,
  resolveStudioTimetableObjectGeometry,
} from "@/utils/template-studio/object-layout";
import {
  applyStudioTimetableObjectFitParent,
  applyStudioTimetableObjectOffset,
  applyStudioTimetableObjectPosition,
  getStudioTimetableDayCardLayerId,
  getStudioTimetableOrderedDayIds,
  isStudioPlacedTimetableObject,
  planStudioTimetableDayCardOffset,
  reorderStudioIdList,
  resolveStudioTimetableDragLayerId,
  resolveStudioTimetableLayerTarget,
  roundStudioCoordinate,
  setStudioTimetableDayOffset,
  type StudioTimetableObjectPosition,
} from "@/utils/template-studio/timetable-commands";
import {
  ensureStudioTimetableComposition,
  getStudioTimetableCompositionObjectGeometry,
} from "@/utils/template-studio/timetable-composition";
import {
  getStudioTimetablePresetMessage,
  insertStudioTimetablePresetObject,
  relinkStudioTimetablePresetInput,
  type StudioTimetablePresetInsertResult,
} from "@/utils/template-studio/timetable-preset-commands";
import type { StudioTimetableCompositionPreset } from "@/utils/template-studio/preset-registry";
import { getStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import {
  getStudioTimetableDayCardGeometries,
  getStudioTimetableDayCardGeometry,
  getStudioTimetableDayCardsLayout,
  getStudioTimetableEntryCardSize,
  getStudioTimetablePreviewSize,
  STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
} from "../_components/studio-timetable-preview";
export interface StudioUpdateOptions {
  /** 거짓이면 되돌리기 이력에 남기지 않는다. 끌고 있는 동안처럼 잦은 변경에 쓴다. */
  history?: boolean;
}
export interface TimetableObjectCommandOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  /** 요일 카드 높이가 일정 수에 따라 달라지므로 미리보기 값을 읽는다. */
  getRuntimeValues: () => StudioRuntimeValues;
  /** 문서를 바꾼다. 이력은 이 함수가 소유한다. */
  updateDocument: (
    mutate: (draft: StudioTemplateDocument) => void,
    options?: StudioUpdateOptions,
  ) => void;
  /** 지금 고른 시간표 레이어. 캔버스에서 무엇을 집을지 정할 때 쓴다. */
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  onSelectRuntimeDay: (dayId: string) => void;
  onSelectRuntimeEntryIndex: (entryIndex: number) => void;
  /** 옮긴 결과를 보려면 레이어 탭이어야 한다. */
  onOpenLayersPanel: () => void;
  onStatusMessage: (message: string) => void;
}

export type StudioAdapterPanelMode =
  | "layers"
  | "inputs"
  | "presets"
  | "timetable";

export type StudioAdapterWorkspaceMode = "cards" | "timetable";

export interface TimetableAdapterCommandOptions
  extends TimetableObjectCommandOptions {
  /** 편집기 상태를 하나의 undo 단위로 묶을 때 호출한다. */
  captureHistory: () => void;
  setDocument: (document: StudioTemplateDocument) => void;
  setRuntimeValues: (
    values:
      | StudioRuntimeValues
      | ((currentValues: StudioRuntimeValues) => StudioRuntimeValues),
  ) => void;
  activeCardComponentId: StudioTimetableComponentId;
  componentLabelDraft: string;
  selectedCardStatusId: StudioTimetableStatusId;
  selectedCardVariantRootId: string | null;
  selectedNode: StudioGraphNode | null;
  selectedTimetableDayId: StudioTimetableDayId | null;
  selectedTimetableDayLabel: string | null;
  activeRuntimeDayId: StudioTimetableDayId;
  onSetPanelMode: (mode: StudioAdapterPanelMode) => void;
  onSetSelectedCardComponentId: (
    componentId: StudioTimetableComponentId,
  ) => void;
  onSetComponentLabelDraft: (label: string) => void;
  onSetSelectedInputId: (inputId: string | null) => void;
  onSetSelectedRuntimeEntryIndex: (entryIndex: number) => void;
  onSelectNode: (nodeId: string | null) => void;
  onRestoreSelection: (nodeIds: string[], primaryNodeId: string | null) => void;
}

export interface StudioCanvasSizeUpdate {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

const cloneStudioDocument = (
  document: StudioTemplateDocument,
): StudioTemplateDocument =>
  JSON.parse(JSON.stringify(document)) as StudioTemplateDocument;

const cloneStudioRuntimeValues = (
  values: StudioRuntimeValues,
): StudioRuntimeValues =>
  JSON.parse(JSON.stringify(values)) as StudioRuntimeValues;

const normalizeStudioDimension = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Number(value.toFixed(2)));
};

const getUniqueAssetLabel = (
  document: StudioTemplateDocument,
  baseLabel: string,
) => {
  const labels = new Set(
    Object.values(document.assets).map((asset) =>
      asset.label.trim().toLowerCase(),
    ),
  );
  let label = baseLabel;
  let index = 2;

  while (labels.has(label.trim().toLowerCase())) {
    label = `${baseLabel} ${index}`;
    index += 1;
  }

  return label;
};

const getAssetLabelFromFile = (file: File, fallbackLabel: string) => {
  const fileLabel = file.name.replace(/\.[^.]+$/, "").trim();
  return fileLabel || fallbackLabel;
};

const getUniqueInputLabel = (
  document: StudioTemplateDocument,
  baseLabel: string,
) => {
  const labels = new Set(
    Object.values(document.inputs).map((input) =>
      input.label.trim().toLowerCase(),
    ),
  );
  let label = baseLabel;
  let index = 2;

  while (labels.has(label.trim().toLowerCase())) {
    label = `${baseLabel} ${index}`;
    index += 1;
  }

  return label;
};

const addRuntimeDefaultForInput = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  input: StudioInputDefinition,
): StudioRuntimeValues => {
  const defaultValue = getStudioInputDefaultValue(input);

  if (input.scope === "global") {
    return {
      ...values,
      global: {
        ...values.global,
        [input.id]: values.global[input.id] ?? defaultValue,
      },
    };
  }

  const dayIds = document.domains?.timetable?.dayIds ?? [];
  if (input.scope === "day") {
    return {
      ...values,
      days: Object.fromEntries(
        dayIds.map((dayId) => [
          dayId,
          {
            ...(values.days[dayId] ?? {}),
            [input.id]: values.days[dayId]?.[input.id] ?? defaultValue,
          },
        ]),
      ),
    };
  }

  return {
    ...values,
    entries: Object.fromEntries(
      dayIds.map((dayId) => [
        dayId,
        (values.entries[dayId] ?? []).map((entryValues) => ({
          ...entryValues,
          [input.id]: entryValues[input.id] ?? defaultValue,
        })),
      ]),
    ),
  };
};

const normalizeRuntimeValuesForCapabilities = (
  values: StudioRuntimeValues,
  capabilities: ReturnType<typeof getStudioTimetableCapabilities>,
): StudioRuntimeValues => ({
  ...values,
  timetable: {
    ...values.timetable,
    entriesByDay: Object.fromEntries(
      Object.entries(values.timetable.entriesByDay).map(([dayId, entries]) => [
        dayId,
        entries.map((entry) => {
          if (!capabilities.multi.enabled && entry.statusId === "multi") {
            return { ...entry, statusId: "online" };
          }
          if (
            !capabilities.offlineMemo.enabled &&
            entry.statusId === "offlineMemo"
          ) {
            return { ...entry, statusId: "offline" };
          }
          return entry;
        }),
      ]),
    ),
  },
});
/**
 * 시간표 객체와 레이어를 고치는 명령.
 *
 * 이력에 남기는 것과 남기지 않는 것이 갈린다. 끌고 있는 동안의 이동은 남기지
 * 않는다. 남기면 한 번 끌 때마다 되돌리기가 수백 단계 쌓여 쓸 수 없게 된다.
 * 놓았을 때의 위치 변경만 남는다.
 *
 * 요일 카드는 자동 배치 위에 보정 값으로 얹혀 있다. 그래서 새 위치를 그대로
 * 저장하면 안 되고, 자동 배치가 정한 기준 좌표를 뺀 차이를 저장해야 한다.
 * 이 뺄셈을 빠뜨리면 카드를 옮길 때마다 배치 간격만큼 더 밀린다.
 */
export function useTimetableObjectCommands({
  getDocument,
  getRuntimeValues,
  updateDocument,
  selectedLayerId,
  onSelectLayer,
  onSelectRuntimeDay,
  onSelectRuntimeEntryIndex,
  onOpenLayersPanel,
  onStatusMessage,
  captureHistory,
  setDocument,
  setRuntimeValues,
  activeCardComponentId,
  componentLabelDraft,
  selectedCardStatusId,
  selectedCardVariantRootId,
  selectedNode,
  selectedTimetableDayId,
  selectedTimetableDayLabel,
  activeRuntimeDayId,
  onSetPanelMode,
  onSetSelectedCardComponentId,
  onSetComponentLabelDraft,
  onSetSelectedInputId,
  onSetSelectedRuntimeEntryIndex,
  onSelectNode,
  onRestoreSelection,
}: TimetableAdapterCommandOptions) {
  const updateTimetableCompositionObject = useCallback(
    (
      objectId: string,
      updater: (
        object: StudioTimetableCompositionObject,
        composition: StudioTimetableComposition,
        timetable: StudioTimetableDomain,
      ) => void,
      options: StudioUpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[objectId];
        if (!object) return;

        updater(object, composition, timetable);
      }, options);
    },
    [updateDocument],
  );

  /** 기본값과 dayOffsets를 펼친 day cards 레이아웃 초안. */
  const createTimetableDayCardsLayoutDraft = (
    timetable: StudioTimetableDomain,
  ) => ({
    ...STUDIO_TIMETABLE_DEFAULT_DAY_CARDS_LAYOUT,
    ...(timetable.dayCardsLayout ?? {}),
    dayOffsets: { ...(timetable.dayCardsLayout?.dayOffsets ?? {}) },
  });

  const toggleTimetableObjectFitParent = useCallback(
    (objectId: string) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[objectId];
        if (!isStudioPlacedTimetableObject(object)) return;

        applyStudioTimetableObjectFitParent(
          object,
          !isStudioFillParentLayout(object.layoutMode),
          resolveStudioTimetableObjectGeometry(
            composition,
            objectId,
            getStudioTimetablePreviewSize(timetable),
          ),
        );
      });
    },
    [updateDocument],
  );
  const addTimetablePresetObject = useCallback(
    (preset: StudioTimetableCompositionPreset) => {
      const existingObjectId = getStudioPresetExistingTargetId(
        getDocument(),
        preset,
      );

      if (preset.singleton && existingObjectId) {
        let linkedInput = false;
        updateDocument((nextDocument) => {
          linkedInput = relinkStudioTimetablePresetInput(
            nextDocument,
            preset,
            existingObjectId,
          );
        });

        onSelectLayer(existingObjectId);
        onOpenLayersPanel();
        onStatusMessage(
          getStudioTimetablePresetMessage(preset.label, {
            existing: true,
            linkedInput,
          }),
        );
        return;
      }

      const insertion: { result: StudioTimetablePresetInsertResult | null } = {
        result: null,
      };
      updateDocument((nextDocument) => {
        insertion.result = insertStudioTimetablePresetObject(
          nextDocument,
          preset,
        );
      });

      if (!insertion.result) {
        onStatusMessage("Timetable is not available");
        return;
      }

      onSelectLayer(insertion.result.objectId);
      onOpenLayersPanel();
      onStatusMessage(
        getStudioTimetablePresetMessage(preset.label, {
          existing: false,
          linkedInput: insertion.result.linkedInput,
        }),
      );
    },
    [
      getDocument,
      onOpenLayersPanel,
      onSelectLayer,
      onStatusMessage,
      updateDocument,
    ],
  );
  const moveTimetableRootObjectLayer = useCallback(
    (
      sourceObjectId: string,
      targetObjectId: string,
      position: "before" | "after",
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const nextRootObjectIds = reorderStudioIdList(
          composition.rootObjectIds.filter(
            (objectId) => composition.objects[objectId],
          ),
          sourceObjectId,
          targetObjectId,
          position,
        );
        if (!nextRootObjectIds) return;

        composition.rootObjectIds = nextRootObjectIds;
      });

      onSelectLayer(sourceObjectId);
      onStatusMessage("Moved timetable layer");
    },
    [onSelectLayer, onStatusMessage, updateDocument],
  );
  const moveTimetableDayLayer = useCallback(
    (
      sourceDayId: StudioTimetableDayId,
      targetDayId: StudioTimetableDayId,
      position: "before" | "after",
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const nextDayIds = reorderStudioIdList(
          getStudioTimetableOrderedDayIds(timetable),
          sourceDayId,
          targetDayId,
          position,
        );
        if (!nextDayIds) return;

        timetable.dayIds = nextDayIds;
        nextDayIds.forEach((dayId, order) => {
          timetable.days[dayId].order = order;
        });
      });

      onSelectLayer(getStudioTimetableDayCardLayerId(sourceDayId));
      onSelectRuntimeDay(sourceDayId);
      onSelectRuntimeEntryIndex(0);
      onStatusMessage("Moved day card container");
    },
    [
      onSelectRuntimeDay,
      onSelectRuntimeEntryIndex,
      onSelectLayer,
      onStatusMessage,
      updateDocument,
    ],
  );
  const selectTimetableCanvasLayer = useCallback(
    (layerId: string) => {
      onSelectLayer(layerId);
      onOpenLayersPanel();

      if (!layerId.startsWith("day-card:")) return;

      const dayId = layerId.replace(/^day-card:/, "");
      onSelectRuntimeDay(dayId);
      onSelectRuntimeEntryIndex(0);
    },
    [
      onOpenLayersPanel,
      onSelectRuntimeDay,
      onSelectRuntimeEntryIndex,
      onSelectLayer,
    ],
  );

  const updateTimetableLayerPosition = useCallback(
    (
      layerId: string,
      nextPosition: StudioTimetableObjectPosition,
      options: StudioUpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const composition = ensureStudioTimetableComposition(timetable);
        const object = composition.objects[layerId];

        if (isStudioPlacedTimetableObject(object)) {
          applyStudioTimetableObjectPosition(
            object,
            nextPosition,
            getStudioTimetableCompositionObjectGeometry(object),
          );
          return;
        }

        const layout = createTimetableDayCardsLayoutDraft(timetable);
        const target = resolveStudioTimetableLayerTarget(layerId);

        if (target.kind === "dayCards") {
          layout.left = roundStudioCoordinate(nextPosition.left ?? layout.left);
          layout.top = roundStudioCoordinate(nextPosition.top ?? layout.top);

          const dayCardsObject = composition.objects[layerId];
          if (dayCardsObject && nextPosition.rotateDeg !== undefined) {
            dayCardsObject.style = {
              ...dayCardsObject.style,
              rotateDeg: roundStudioCoordinate(nextPosition.rotateDeg),
            };
          }

          timetable.dayCardsLayout = layout;
          return;
        }

        if (target.kind !== "dayCard") return;

        const { dayId } = target;
        const orderedDayIds = getStudioTimetableOrderedDayIds(timetable);
        const dayIndex = orderedDayIds.indexOf(dayId);
        if (dayIndex < 0) return;

        const getEntryCardSizeForDay = (currentDayId: StudioTimetableDayId) =>
          getStudioTimetableEntryCardSize(
            nextDocument,
            getStudioTimetableDayComponent(nextDocument, currentDayId),
          );
        const getEntryCountForDay = (currentDayId: StudioTimetableDayId) =>
          getStudioTimetableEntriesForDay(
            nextDocument,
            getRuntimeValues(),
            currentDayId,
          ).length;

        // 보정 값을 뺀 기준 좌표를 알아야 새 보정 값을 구할 수 있다.
        const dayGeometry =
          getStudioTimetableDayCardGeometries(
            layout,
            orderedDayIds
              .map((currentDayId) => timetable.days[currentDayId])
              .filter(Boolean),
            getEntryCountForDay,
            getEntryCardSizeForDay,
          )[dayId] ??
          getStudioTimetableDayCardGeometry(
            layout,
            dayId,
            dayIndex,
            getEntryCountForDay(dayId),
            getEntryCardSizeForDay(dayId),
          );
        const currentOffset = layout.dayOffsets[dayId] ?? { left: 0, top: 0 };

        setStudioTimetableDayOffset(
          layout,
          dayId,
          planStudioTimetableDayCardOffset(
            dayGeometry,
            currentOffset,
            nextPosition,
          ),
        );
        timetable.dayCardsLayout = layout;
      }, options);
    },
    [getRuntimeValues, updateDocument],
  );
  const updateTimetableDayCardsLayout = useCallback(
    (
      recipe: (layout: StudioTimetableDayCardsLayout) => void,
      options: StudioUpdateOptions = {},
    ) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;

        const layout = getStudioTimetableDayCardsLayout(timetable);
        recipe(layout);
        timetable.dayCardsLayout = layout;
      }, options);
    },
    [updateDocument],
  );

  const moveTimetableCanvasLayer = useCallback(
    (layerId: string, delta: { deltaX: number; deltaY: number }) => {
      updateDocument(
        (nextDocument) => {
          const timetable = nextDocument.domains?.timetable;
          if (!timetable) return;

          const composition = ensureStudioTimetableComposition(timetable);
          const object = composition.objects[layerId];

          if (isStudioPlacedTimetableObject(object)) {
            applyStudioTimetableObjectOffset(
              object,
              delta,
              getStudioTimetableCompositionObjectGeometry(object),
            );
            return;
          }

          const layout = createTimetableDayCardsLayoutDraft(timetable);
          const target = resolveStudioTimetableLayerTarget(layerId);

          if (target.kind === "dayCards") {
            layout.left = roundStudioCoordinate(layout.left + delta.deltaX);
            layout.top = roundStudioCoordinate(layout.top + delta.deltaY);
            timetable.dayCardsLayout = layout;
            return;
          }

          if (target.kind !== "dayCard") return;

          const currentOffset = layout.dayOffsets[target.dayId] ?? {
            left: 0,
            top: 0,
          };
          setStudioTimetableDayOffset(layout, target.dayId, {
            left: currentOffset.left + delta.deltaX,
            top: currentOffset.top + delta.deltaY,
          });
          timetable.dayCardsLayout = layout;
        },
        { history: false },
      );
    },
    [updateDocument],
  );
  const resolveTimetableDragLayerId = useCallback(
    (hit: {
      targetNodeId: string | null;
      targetNodeIds: string[];
      nodeIdsAtPoint: string[];
    }) => resolveStudioTimetableDragLayerId({ selectedLayerId, ...hit }),
    [selectedLayerId],
  );

  const selectCardComponent = useCallback(
    (componentId: StudioTimetableComponentId) => {
      const document = getDocument();
      const component = document.domains?.timetable?.components[componentId];
      if (!component) return;

      onSetSelectedCardComponentId(componentId);
      onSetComponentLabelDraft(component.label);
      const resolution = resolveStudioTimetableComponentVariant(
        document,
        component,
        selectedCardStatusId,
      );
      const rootNodeId = resolution?.variant.rootNodeId;
      if (rootNodeId) onRestoreSelection([rootNodeId], rootNodeId);
    },
    [
      getDocument,
      onRestoreSelection,
      onSetComponentLabelDraft,
      onSetSelectedCardComponentId,
      selectedCardStatusId,
    ],
  );

  const duplicateSelectedCardComponent = useCallback(() => {
    if (!activeCardComponentId) return;

    let nextComponentId: StudioTimetableComponentId | null = null;
    let failureReason: string | null = null;
    updateDocument((nextDocument) => {
      const result = cloneStudioTimetableComponentSet(
        nextDocument,
        activeCardComponentId,
      );
      if (result.ok) nextComponentId = result.componentId;
      else failureReason = result.reason;
    });

    if (!nextComponentId) {
      onStatusMessage(failureReason ?? "Component set duplicate failed");
      return;
    }

    selectCardComponent(nextComponentId);
    onStatusMessage("Component set duplicated");
  }, [
    activeCardComponentId,
    onStatusMessage,
    selectCardComponent,
    updateDocument,
  ]);

  const commitSelectedCardComponentLabel = useCallback(() => {
    if (!activeCardComponentId) return;
    const document = getDocument();
    const component = document.domains?.timetable?.components[
      activeCardComponentId
    ];
    if (!component) return;

    const nextLabel = componentLabelDraft.trim();
    if (!nextLabel) {
      onSetComponentLabelDraft(component.label);
      return;
    }
    if (nextLabel === component.label) return;

    updateDocument((nextDocument) => {
      const nextComponent =
        nextDocument.domains?.timetable?.components[activeCardComponentId];
      if (nextComponent) nextComponent.label = nextLabel;
    });
    onSetComponentLabelDraft(nextLabel);
    onStatusMessage("Component set renamed");
  }, [
    activeCardComponentId,
    componentLabelDraft,
    getDocument,
    onSetComponentLabelDraft,
    onStatusMessage,
    updateDocument,
  ]);

  const deleteSelectedCardComponent = useCallback(() => {
    if (!activeCardComponentId) return;
    const reason = getStudioTimetableComponentSetDeleteReason(
      getDocument(),
      activeCardComponentId,
    );
    if (reason) {
      onStatusMessage(reason);
      return;
    }
    if (!window.confirm("Delete this unused component set?")) return;

    let failureReason: string | null = null;
    updateDocument((nextDocument) => {
      const result = deleteStudioTimetableComponentSet(
        nextDocument,
        activeCardComponentId,
      );
      if (!result.ok) failureReason = result.reason;
    });
    if (failureReason) {
      onStatusMessage(failureReason);
      return;
    }

    const fallbackComponentId =
      getDocument().domains?.timetable?.entryComponentId;
    if (fallbackComponentId) selectCardComponent(fallbackComponentId);
    onStatusMessage("Component set deleted");
  }, [
    activeCardComponentId,
    getDocument,
    onStatusMessage,
    selectCardComponent,
    updateDocument,
  ]);

  const assignComponentSetToSelectedDay = useCallback(
    (componentId: StudioTimetableComponentId) => {
      if (!selectedTimetableDayId) return;
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        const day = timetable?.days[selectedTimetableDayId];
        if (!timetable || !day || !timetable.components[componentId]) return;

        if (componentId === timetable.entryComponentId) delete day.componentId;
        else day.componentId = componentId;
      });
      onStatusMessage(
        `${selectedTimetableDayLabel ?? "Day"} component set updated`,
      );
    },
    [
      onStatusMessage,
      selectedTimetableDayId,
      selectedTimetableDayLabel,
      updateDocument,
    ],
  );

  const updateTimetableCanvasSize = useCallback(
    (nextSize: StudioCanvasSizeUpdate) => {
      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;
        const currentCanvas = timetable.canvas ?? {
          width: 4000,
          height: 2250,
          backgroundColor: "#eef2f7",
        };
        timetable.canvas = {
          width: normalizeStudioDimension(
            nextSize.width ?? currentCanvas.width,
            currentCanvas.width,
          ),
          height: normalizeStudioDimension(
            nextSize.height ?? currentCanvas.height,
            currentCanvas.height,
          ),
          backgroundColor:
            nextSize.backgroundColor ?? currentCanvas.backgroundColor,
        };
      });
    },
    [updateDocument],
  );

  const addCardContextObject = useCallback(
    (preset: StudioCardContextObjectPreset) => {
      const document = getDocument();
      const existingNodeId = getStudioPresetExistingTargetId(document, preset, {
        cardRootNodeId: selectedCardVariantRootId,
      });
      if (existingNodeId) {
        onSelectNode(existingNodeId);
        onSetPanelMode("layers");
        onStatusMessage(`Selected existing ${preset.label}`);
        return;
      }

      const plan = planStudioAddCardContextObject(
        document,
        preset,
        selectedNode,
        selectedCardVariantRootId,
      );
      updateDocument((nextDocument) => {
        applyStudioInsertNode(nextDocument, plan);
      });
      onSelectNode(plan.node.id);
      onSetPanelMode("layers");
      onStatusMessage(`Added ${preset.label}`);
    },
    [
      getDocument,
      onSelectNode,
      onSetPanelMode,
      onStatusMessage,
      selectedCardVariantRootId,
      selectedNode,
      updateDocument,
    ],
  );

  const addCardStatusBackgroundObject = useCallback(
    (preset: StudioCardStatusBackgroundPreset) => {
      const document = getDocument();
      const existingNodeId = getStudioPresetExistingTargetId(document, preset, {
        cardRootNodeId: selectedCardVariantRootId,
      });
      if (existingNodeId) {
        onSelectNode(existingNodeId);
        onSetPanelMode("layers");
        onStatusMessage(`Selected existing ${preset.label}`);
        return;
      }

      const plan = planStudioAddCardStatusBackground(
        document,
        preset,
        selectedNode,
        selectedCardVariantRootId,
      );
      updateDocument((nextDocument) => {
        applyStudioInsertNode(nextDocument, plan);
      });
      onSelectNode(plan.node.id);
      onSetPanelMode("layers");
      onStatusMessage(`Added ${preset.label}`);
    },
    [
      getDocument,
      onSelectNode,
      onSetPanelMode,
      onStatusMessage,
      selectedCardVariantRootId,
      selectedNode,
      updateDocument,
    ],
  );

  const addCardSelectInputBundle = useCallback(
    (preset: StudioCardSelectInputBundlePreset) => {
      const document = getDocument();
      const inputId = createStudioId("input");
      const parentId = resolveStudioNodeInsertionParentId(
        document,
        selectedNode,
        selectedCardVariantRootId,
      );
      const isSticker = preset.bundleKind === "stickerSelect";
      const creationRule = getStudioPresetCreationRule(preset);
      const inputLabelBase =
        creationRule.mode === "repeatable"
          ? creationRule.labelBase
          : isSticker
            ? "Entry Sticker"
            : "Entry Select";
      const inputLabel = getUniqueInputLabel(document, inputLabelBase);
      const options: StudioSelectOption[] = isSticker
        ? [
            { value: "none", label: "None" },
            { value: "spark", label: "Spark" },
            { value: "heart", label: "Heart" },
          ]
        : [
            { value: "option-a", label: "Option A" },
            { value: "option-b", label: "Option B" },
          ];
      const input: Extract<StudioInputDefinition, { type: "select" }> = {
        id: inputId,
        type: "select",
        scope: "entry",
        label: inputLabel,
        defaultValue: isSticker ? "spark" : "option-a",
        options,
      };
      let nextPrimaryNodeId: string | null = null;

      updateDocument((nextDocument) => {
        nextDocument.inputs[inputId] = input;
        const labelNodeId = createStudioSelectConsumerNode(nextDocument, {
          parentId,
          input,
          kind: "text",
          label: isSticker ? "Selected Sticker Label" : `${inputLabel} Label`,
        });
        nextPrimaryNodeId = labelNodeId;

        if (isSticker) {
          nextPrimaryNodeId = createStudioSelectConsumerNode(nextDocument, {
            parentId,
            input,
            kind: "image",
            label: "Sticker Preview",
            assetByOption: {
              none: null,
              spark:
                Object.values(nextDocument.assets).find(
                  (asset) => asset.label.trim().toLowerCase() === "spark sticker",
                )?.id ?? null,
              heart:
                Object.values(nextDocument.assets).find(
                  (asset) => asset.label.trim().toLowerCase() === "heart sticker",
                )?.id ?? null,
            },
          });
        }
      });

      setRuntimeValues((currentValues) =>
        addRuntimeDefaultForInput(document, currentValues, input),
      );
      onSetSelectedInputId(inputId);
      if (nextPrimaryNodeId) {
        onSelectNode(nextPrimaryNodeId);
        onSetPanelMode("layers");
      } else {
        onSetPanelMode("inputs");
      }
      onStatusMessage(`Added ${preset.label}`);
    },
    [
      getDocument,
      onSelectNode,
      onSetPanelMode,
      onSetSelectedInputId,
      onStatusMessage,
      selectedCardVariantRootId,
      selectedNode,
      setRuntimeValues,
      updateDocument,
    ],
  );

  const createTemplateAssetFromDataUrl = useCallback(
    (
      file: File,
      src: string,
      fallbackLabel: string,
      onAssetCreated?: (
        nextDocument: StudioTemplateDocument,
        assetId: string,
      ) => void,
    ) => {
      if (!src) return;
      const assetId = createStudioId("asset");
      const baseLabel = getAssetLabelFromFile(file, fallbackLabel);
      updateDocument((nextDocument) => {
        nextDocument.assets[assetId] = {
          id: assetId,
          label: getUniqueAssetLabel(nextDocument, baseLabel),
          src,
        };
        onAssetCreated?.(nextDocument, assetId);
      });
      onStatusMessage(`Uploaded ${baseLabel}`);
    },
    [onStatusMessage, updateDocument],
  );

  const uploadGuide = useCallback(
    (workspaceMode: StudioAdapterWorkspaceMode, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageSrc = String(reader.result ?? "");
        if (!imageSrc) return;
        createTemplateAssetFromDataUrl(
          file,
          imageSrc,
          workspaceMode === "cards" ? "Cards Guide" : "Timetable Guide",
          (nextDocument, assetId) => {
            if (workspaceMode === "cards") {
              setStudioCardsGuideAsset(nextDocument, assetId);
            } else {
              setStudioTimetableGuideAsset(nextDocument, assetId);
            }
          },
        );
      };
      reader.readAsDataURL(file);
    },
    [createTemplateAssetFromDataUrl],
  );

  const removeGuide = useCallback(
    (workspaceMode: StudioAdapterWorkspaceMode) => {
      updateDocument((nextDocument) => {
        if (workspaceMode === "cards") {
          setStudioCardsGuideAsset(nextDocument, null);
        } else {
          setStudioTimetableGuideAsset(nextDocument, null);
        }
      });
      onStatusMessage(
        workspaceMode === "cards"
          ? "Removed cards guide"
          : "Removed timetable guide",
      );
    },
    [onStatusMessage, updateDocument],
  );

  const setGuideVisibility = useCallback(
    (workspaceMode: StudioAdapterWorkspaceMode, visible: boolean) => {
      updateDocument(
        (nextDocument) => {
          if (workspaceMode === "cards") {
            setStudioCardsGuideVisibility(nextDocument, visible);
          } else {
            setStudioTimetableGuideVisibility(nextDocument, visible);
          }
        },
        { history: false },
      );
    },
    [updateDocument],
  );

  const setGuideOpacity = useCallback(
    (workspaceMode: StudioAdapterWorkspaceMode, opacity: number) => {
      updateDocument(
        (nextDocument) => {
          if (workspaceMode === "cards") {
            setStudioCardsGuideOpacity(nextDocument, opacity);
          } else {
            setStudioTimetableGuideOpacity(nextDocument, opacity);
          }
        },
        { history: false },
      );
    },
    [updateDocument],
  );

  const linkTimetableAssetSlotToInput = useCallback(
    ({
      objectId,
      assetId,
      inputLabel,
      fit,
      defaultFit = "cover",
      label,
      onUpdateInput,
    }: {
      objectId: string;
      assetId?: string | null;
      inputLabel: string;
      fit?: StudioImageFit;
      defaultFit?: StudioImageFit;
      label: string;
      onUpdateInput: (
        object: StudioTimetableCompositionObject,
        inputId: string,
        fit: StudioImageFit,
      ) => void;
    }) => {
      const currentDocument = getDocument();
      const defaultUrl = assetId
        ? (currentDocument.assets[assetId]?.src ?? "")
        : "";

      updateDocument((nextDocument) => {
        const timetable = nextDocument.domains?.timetable;
        if (!timetable) return;
        const composition = ensureStudioTimetableComposition(timetable);
        const currentObject = composition.objects[objectId];
        if (!currentObject) return;

        const { inputId } = ensureStudioPresetImageInput(nextDocument, {
          label: inputLabel,
          placeholder: "Paste image URL",
          defaultUrl,
        });
        onUpdateInput(currentObject, inputId, fit ?? defaultFit);
      });
      onStatusMessage(`Linked ${label} to input`);
    },
    [getDocument, onStatusMessage, updateDocument],
  );

  const createTimetableAssetForSlot = useCallback(
    ({
      file,
      src,
      fallbackLabel,
      objectId,
      fit,
      defaultFit = "cover",
      onUpdateAsset,
    }: {
      file: File;
      src: string;
      fallbackLabel: string;
      objectId: string;
      fit?: StudioImageFit;
      defaultFit?: StudioImageFit;
      onUpdateAsset: (
        object: StudioTimetableCompositionObject,
        assetId: string | null,
        fit: StudioImageFit,
      ) => void;
    }) => {
      createTemplateAssetFromDataUrl(
        file,
        src,
        fallbackLabel,
        (nextDocument, nextAssetId) => {
          const timetable = nextDocument.domains?.timetable;
          if (!timetable) return;
          const composition = ensureStudioTimetableComposition(timetable);
          const currentObject = composition.objects[objectId];
          if (!currentObject) return;
          onUpdateAsset(currentObject, nextAssetId, fit ?? defaultFit);
        },
      );
    },
    [createTemplateAssetFromDataUrl],
  );

  const createCardAssetForSlot = useCallback(
    ({
      file,
      src,
      fallbackLabel,
      nodeId,
      fit = "cover",
    }: {
      file: File;
      src: string;
      fallbackLabel: string;
      nodeId: string;
      fit?: StudioImageFit;
    }) => {
      createTemplateAssetFromDataUrl(
        file,
        src,
        fallbackLabel,
        (nextDocument, nextAssetId) => {
          const currentNode = nextDocument.graph.nodes[nodeId];
          if (!currentNode) return;
          setStudioStatusCardBackgroundAssetSlot(
            currentNode,
            nextAssetId,
            fit,
          );
        },
      );
    },
    [createTemplateAssetFromDataUrl],
  );

  const resetRuntimeValues = useCallback(() => {
    captureHistory();
    setRuntimeValues(createInitialStudioRuntimeValues(getDocument()));
  }, [captureHistory, getDocument, setRuntimeValues]);

  const addEntryToActiveDay = useCallback(() => {
    if (!activeRuntimeDayId) return;
    const document = getDocument();
    const runtimeValues = getRuntimeValues();
    const activeEntries = getStudioTimetableEntriesForDay(
      document,
      runtimeValues,
      activeRuntimeDayId,
    );
    if (
      activeEntries.length >= getStudioTimetableEffectiveMaxEntriesPerDay(document)
    ) {
      return;
    }

    captureHistory();
    setRuntimeValues((currentValues) =>
      addStudioTimetableEntry(
        document,
        currentValues,
        activeRuntimeDayId,
        createStudioId("entry"),
      ),
    );
    onSetSelectedRuntimeEntryIndex(activeEntries.length);
    onSetPanelMode("timetable");
  }, [
    activeRuntimeDayId,
    captureHistory,
    getDocument,
    getRuntimeValues,
    onSetPanelMode,
    onSetSelectedRuntimeEntryIndex,
    setRuntimeValues,
  ]);

  const removeEntry = useCallback(
    (dayId: string, entryIndex: number) => {
      captureHistory();
      setRuntimeValues((currentValues) =>
        removeStudioTimetableEntry(
          getDocument(),
          currentValues,
          dayId,
          entryIndex,
        ),
      );
      onSetSelectedRuntimeEntryIndex(Math.max(0, entryIndex - 1));
    },
    [
      captureHistory,
      getDocument,
      onSetSelectedRuntimeEntryIndex,
      setRuntimeValues,
    ],
  );

  const updateEntryStatus = useCallback(
    (
      dayId: string,
      entryIndex: number,
      statusId: StudioTimetableStatusId,
    ) => {
      captureHistory();
      setRuntimeValues((currentValues) =>
        setStudioTimetableEntryStatus(
          getDocument(),
          currentValues,
          dayId,
          entryIndex,
          statusId,
        ),
      );
    },
    [captureHistory, getDocument, setRuntimeValues],
  );

  const setTimetableCapability = useCallback(
    (capabilityKey: StudioTimetableCapabilityKey, enabled: boolean) => {
      const currentDocument = getDocument();
      const timetable = currentDocument.domains?.timetable;
      if (!timetable) return;

      const currentCapabilities = getStudioTimetableCapabilities(timetable);
      if (currentCapabilities[capabilityKey].enabled === enabled) return;
      if (
        capabilityKey === "multi" &&
        !enabled &&
        getStudioTimetableDaysWithMultipleEntries(getRuntimeValues()).length > 0
      ) {
        onStatusMessage("Remove extra entries before disabling Multi Status");
        return;
      }

      const nextCapabilities = {
        ...currentCapabilities,
        [capabilityKey]: { enabled },
      };
      const nextDocument = cloneStudioDocument(currentDocument);
      const nextTimetable = nextDocument.domains?.timetable;
      if (!nextTimetable) return;

      captureHistory();
      nextTimetable.capabilities = nextCapabilities;
      if (enabled) {
        ensureStudioTimetableCapabilityStatus(nextTimetable, capabilityKey);
        ensureStudioCapabilityVariant(nextDocument, capabilityKey);
      }

      const nextRuntimeValues = normalizeRuntimeValuesForCapabilities(
        cloneStudioRuntimeValues(getRuntimeValues()),
        nextCapabilities,
      );
      setDocument(nextDocument);
      setRuntimeValues(nextRuntimeValues);
      onStatusMessage(
        `${capabilityKey === "multi" ? "Multi" : "Offline memo"} ${
          enabled ? "enabled" : "disabled"
        }`,
      );
    },
    [
      captureHistory,
      getDocument,
      getRuntimeValues,
      onStatusMessage,
      setDocument,
      setRuntimeValues,
    ],
  );

  /**
   * 요일 카드를 골랐을 때 미리보기가 그 요일을 보게 한다.
   *
   * 요일이 바뀌면 일정 자리도 처음으로 돌린다. 요일마다 일정 수가 다르므로
   * 자리를 그대로 두면 없는 일정을 가리킨 채로 남는다.
   */
  return {
    updateCompositionObject: updateTimetableCompositionObject,
    toggleObjectFitParent: toggleTimetableObjectFitParent,
    addPresetObject: addTimetablePresetObject,
    moveRootObjectLayer: moveTimetableRootObjectLayer,
    moveDayLayer: moveTimetableDayLayer,
    selectCanvasLayer: selectTimetableCanvasLayer,
    updateLayerPosition: updateTimetableLayerPosition,
    updateDayCardsLayout: updateTimetableDayCardsLayout,
    moveCanvasLayer: moveTimetableCanvasLayer,
    resolveDragLayerId: resolveTimetableDragLayerId,
    selectCardComponent,
    duplicateSelectedCardComponent,
    commitSelectedCardComponentLabel,
    deleteSelectedCardComponent,
    assignComponentSetToSelectedDay,
    updateTimetableCanvasSize,
    addCardContextObject,
    addCardStatusBackgroundObject,
    addCardSelectInputBundle,
    createTemplateAssetFromDataUrl,
    uploadGuide,
    removeGuide,
    setGuideVisibility,
    setGuideOpacity,
    linkTimetableAssetSlotToInput,
    createTimetableAssetForSlot,
    createCardAssetForSlot,
    resetRuntimeValues,
    addEntryToActiveDay,
    removeEntry,
    updateEntryStatus,
    setTimetableCapability,
  };
}
