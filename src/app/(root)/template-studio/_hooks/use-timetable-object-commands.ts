"use client";
import { useCallback } from "react";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableDomain,
} from "@/types/template-studio";
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
import { getStudioPresetExistingTargetId } from "@/utils/template-studio/preset-registry";
import type { StudioTimetableCompositionPreset } from "@/utils/template-studio/preset-registry";
import { getStudioTimetableDayComponent } from "@/utils/template-studio/component-sets";
import { getStudioTimetableEntriesForDay } from "@/utils/template-studio/timetable-runtime";
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
}: TimetableObjectCommandOptions) {
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
  };
}
