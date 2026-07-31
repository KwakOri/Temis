import type {
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
  StudioTimetableDomain,
} from "@/types/template-studio";
import type { StudioCommandPlan } from "@/utils/template-studio/graph-commands";
import {
  isStudioFillParentLayout,
  isStudioPlacedTimetableCompositionObject,
} from "@/utils/template-studio/object-layout";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "@/utils/template-studio/timetable-composition";

/** 생성된 day card 레이어 id 접두사. */
export const STUDIO_TIMETABLE_DAY_CARD_LAYER_PREFIX = "day-card:";

export const getStudioTimetableDayCardLayerId = (
  dayId: StudioTimetableDayId,
): string => `${STUDIO_TIMETABLE_DAY_CARD_LAYER_PREFIX}${dayId}`;

export type StudioTimetableLayerTarget =
  | { kind: "object"; objectId: string }
  | { kind: "dayCards" }
  | { kind: "dayCard"; dayId: StudioTimetableDayId };

/**
 * 레이어 id가 무엇을 가리키는지 판단한다.
 *
 * 시간표 레이어 목록에는 composition object와 생성된 day card 컨테이너, 그리고
 * 각 day card가 섞여 있다. id 형태로 구분한다.
 */
export const resolveStudioTimetableLayerTarget = (
  layerId: string,
): StudioTimetableLayerTarget => {
  if (layerId === STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)
    return { kind: "dayCards" };

  if (layerId.startsWith(STUDIO_TIMETABLE_DAY_CARD_LAYER_PREFIX)) {
    return {
      kind: "dayCard",
      dayId: layerId.slice(
        STUDIO_TIMETABLE_DAY_CARD_LAYER_PREFIX.length,
      ) as StudioTimetableDayId,
    };
  }

  return { kind: "object", objectId: layerId };
};

/**
 * 순서 값으로 정렬한 day id 목록.
 *
 * `dayIds` 배열 순서와 `days[].order`가 어긋날 수 있어서 항상 order를 기준으로
 * 본다.
 */
export const getStudioTimetableOrderedDayIds = (
  timetable: StudioTimetableDomain,
): StudioTimetableDayId[] =>
  timetable.dayIds
    .filter((dayId) => timetable.days[dayId])
    .sort(
      (leftDayId, rightDayId) =>
        timetable.days[leftDayId].order - timetable.days[rightDayId].order,
    );

/**
 * 목록에서 한 항목을 다른 항목 앞이나 뒤로 옮긴다.
 *
 * 옮길 항목을 먼저 뺀 뒤 목표 위치를 다시 계산해야 한다. 앞에서 뒤로 옮길 때
 * 목표 인덱스가 한 칸 당겨지기 때문이다. 옮길 수 없으면 null을 준다.
 */
export const reorderStudioIdList = <TId extends string>(
  ids: TId[],
  sourceId: TId,
  targetId: TId,
  position: "before" | "after",
): TId[] | null => {
  if (sourceId === targetId) return null;

  const nextIds = [...ids];
  const sourceIndex = nextIds.indexOf(sourceId);
  const targetIndex = nextIds.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return null;

  const [movedId] = nextIds.splice(sourceIndex, 1);
  const adjustedTargetIndex =
    sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  const insertIndex =
    position === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

  nextIds.splice(insertIndex, 0, movedId);
  return nextIds;
};

/** 소수점 둘째 자리로 맞춘 좌표. 포인터 이동은 소수가 생긴다. */
export const roundStudioCoordinate = (value: number): number =>
  Number(value.toFixed(2));

// --- 부모 채우기 ---

/**
 * composition object의 부모 채우기를 켜고 끈다.
 *
 * 그래프 노드와 같은 규칙이다. 켜면 좌표를 0으로 맞추고 크기는 부모가 정한다.
 */
export const applyStudioTimetableObjectFitParent = (
  object: StudioTimetableCompositionObject,
  shouldFillParent: boolean,
  resolvedSize: { width: number; height: number },
): void => {
  object.layoutMode = shouldFillParent ? "fillParent" : "fixed";
  object.style = {
    ...object.style,
    left: 0,
    top: 0,
    ...(shouldFillParent
      ? {}
      : { width: resolvedSize.width, height: resolvedSize.height }),
  };
};

// --- 위치 이동 ---

export interface StudioTimetableObjectPosition {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  rotateDeg?: number;
}

/**
 * 놓인 composition object의 좌표와 크기를 바꾼다.
 *
 * 부모를 채우는 객체의 경계는 부모가 정하므로 바꾸지 않는다. 회전만 바꾸는
 * 요청은 통과시킨다. 바꿨으면 true를 준다.
 */
export const applyStudioTimetableObjectPosition = (
  object: StudioTimetableCompositionObject,
  nextPosition: StudioTimetableObjectPosition,
  currentGeometry: { left: number; top: number; width: number; height: number },
): boolean => {
  const updatesBounds =
    nextPosition.left !== undefined ||
    nextPosition.top !== undefined ||
    nextPosition.width !== undefined ||
    nextPosition.height !== undefined;

  if (updatesBounds && isStudioFillParentLayout(object.layoutMode))
    return false;

  object.style = {
    ...object.style,
    left: roundStudioCoordinate(nextPosition.left ?? currentGeometry.left),
    top: roundStudioCoordinate(nextPosition.top ?? currentGeometry.top),
    width: roundStudioCoordinate(nextPosition.width ?? currentGeometry.width),
    height: roundStudioCoordinate(
      nextPosition.height ?? currentGeometry.height,
    ),
    rotateDeg: roundStudioCoordinate(
      nextPosition.rotateDeg ??
        (typeof object.style.rotateDeg === "number"
          ? object.style.rotateDeg
          : 0),
    ),
  };
  return true;
};

/** 놓인 composition object를 상대 거리만큼 옮긴다. 옮겼으면 true를 준다. */
export const applyStudioTimetableObjectOffset = (
  object: StudioTimetableCompositionObject,
  delta: { deltaX: number; deltaY: number },
  currentGeometry: { left: number; top: number },
): boolean => {
  if (isStudioFillParentLayout(object.layoutMode)) return false;

  object.style = {
    ...object.style,
    left: roundStudioCoordinate(currentGeometry.left + delta.deltaX),
    top: roundStudioCoordinate(currentGeometry.top + delta.deltaY),
  };
  return true;
};

/** day card 하나의 위치 보정 값. */
export const setStudioTimetableDayOffset = (
  layout: StudioTimetableDayCardsLayout,
  dayId: StudioTimetableDayId,
  offset: { left: number; top: number },
): void => {
  layout.dayOffsets = {
    ...layout.dayOffsets,
    [dayId]: {
      left: roundStudioCoordinate(offset.left),
      top: roundStudioCoordinate(offset.top),
    },
  };
};

/**
 * 요일 카드를 옮겼을 때 저장할 보정 값을 정한다.
 *
 * 요일 카드는 자동 배치 위에 보정 값으로 얹혀 있다. 화면에서 읽은 위치를 그대로
 * 저장하면 자동 배치가 정한 좌표에 그 값이 한 번 더 더해져, 카드를 옮길 때마다
 * 배치 간격만큼 더 밀린다. 그래서 지금 보정 값을 빼서 기준 좌표를 구하고, 새
 * 위치에서 그 기준을 뺀 차이를 저장한다.
 *
 * 한쪽만 옮겼으면 다른 쪽 보정 값은 그대로 둔다. 위아래만 옮겼는데 좌우가 기준
 * 자리로 돌아가면 안 된다.
 */
export const planStudioTimetableDayCardOffset = (
  dayGeometry: { left: number; top: number },
  currentOffset: { left: number; top: number },
  nextPosition: { left?: number; top?: number },
): { left: number; top: number } => {
  const baseLeft = dayGeometry.left - currentOffset.left;
  const baseTop = dayGeometry.top - currentOffset.top;
  return {
    left:
      nextPosition.left !== undefined
        ? nextPosition.left - baseLeft
        : currentOffset.left,
    top:
      nextPosition.top !== undefined
        ? nextPosition.top - baseTop
        : currentOffset.top,
  };
};
/**
 * 캔버스에서 무엇을 집었는지 정한다.
 *
 * 지금 고른 레이어가 그 자리에 겹쳐 있으면 그것을 계속 잡는다. 그러지 않으면 겹친
 * 객체 위에서 끌 때마다 선택이 다른 것으로 튀어 옮기던 것을 놓친다.
 *
 * 다음은 요일 카드 묶음이고, 그다음이 개별 요일 카드다. 묶음을 먼저 보는 것은
 * 요일 카드가 묶음 안에서만 움직이기 때문이다.
 */
export const resolveStudioTimetableDragLayerId = ({
  selectedLayerId,
  targetNodeId,
  targetNodeIds,
  nodeIdsAtPoint,
}: {
  selectedLayerId: string | null;
  targetNodeId: string | null;
  targetNodeIds: string[];
  nodeIdsAtPoint: string[];
}): string | null => {
  const hitLayerIds = Array.from(
    new Set([...targetNodeIds, ...nodeIdsAtPoint]),
  );
  if (selectedLayerId && hitLayerIds.includes(selectedLayerId)) {
    return selectedLayerId;
  }
  if (hitLayerIds.includes(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID)) {
    return STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID;
  }
  const dayCardLayerId = hitLayerIds.find((layerId) =>
    layerId.startsWith(STUDIO_TIMETABLE_DAY_CARD_LAYER_PREFIX),
  );
  return dayCardLayerId ?? targetNodeId;
};
// --- 시간표 객체 삭제 ---

export interface StudioDeleteTimetableObjectPlan {
  objectIds: string[];
  /** 삭제 후 고를 레이어. 부모가 남아 있으면 부모, 아니면 day card 컨테이너다. */
  fallbackSelectionId: string;
}

/**
 * 지울 수 없는 시간표 객체를 걸러낸다.
 *
 * day card 컨테이너와 생성된 day card는 시간표 구조 자체라서 지울 수 없다.
 */
export const planStudioDeleteTimetableObject = (
  composition: StudioTimetableComposition,
  layerId: string | null,
): StudioCommandPlan<StudioDeleteTimetableObjectPlan> => {
  if (!layerId) {
    return { ok: false, reason: "No timetable object selected" };
  }

  const target = resolveStudioTimetableLayerTarget(layerId);
  if (target.kind === "dayCards") {
    return { ok: false, reason: "Day Card Containers is locked" };
  }
  if (target.kind === "dayCard") {
    return { ok: false, reason: "Generated day cards are locked" };
  }

  const object = composition.objects[layerId];
  if (!object) return { ok: false, reason: "Timetable object not found" };

  const objectIds = collectStudioTimetableSubtreeIds(composition, layerId);
  if (objectIds.length === 0) {
    return { ok: false, reason: "Timetable delete failed" };
  }

  const parentId = object.parentId;
  const keepsParent =
    parentId && !objectIds.includes(parentId) && composition.objects[parentId];

  return {
    ok: true,
    objectIds,
    fallbackSelectionId: keepsParent
      ? parentId
      : STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  };
};

/** 객체와 그 자손 id. */
export const collectStudioTimetableSubtreeIds = (
  composition: StudioTimetableComposition,
  rootObjectId: string,
): string[] => {
  const objectIds = new Set<string>();

  const collect = (objectId: string) => {
    const object = composition.objects[objectId];
    if (!object || objectIds.has(objectId)) return;

    objectIds.add(objectId);
    (object.childIds ?? []).forEach(collect);
  };

  collect(rootObjectId);
  return [...objectIds];
};

/**
 * 시간표 객체와 자손을 지운다.
 *
 * day card 컨테이너는 어떤 경우에도 남긴다. variant set이 지워진 객체를
 * 가리키고 있으면 그 자리를 비우고, 활성 값이 사라졌으면 남은 값으로 옮긴다.
 */
export const applyStudioDeleteTimetableObject = (
  composition: StudioTimetableComposition,
  objectIds: string[],
): void => {
  const deleteIds = new Set(objectIds);
  deleteIds.delete(STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID);

  Object.values(composition.objects).forEach((object) => {
    if (object.childIds) {
      object.childIds = object.childIds.filter(
        (childId) => !deleteIds.has(childId),
      );
    }

    const variantSet = object.variantSet;
    if (!variantSet) return;

    Object.entries(variantSet.rootByValue).forEach(([value, rootObjectId]) => {
      if (rootObjectId && deleteIds.has(rootObjectId)) {
        variantSet.rootByValue[value] = null;
      }
    });

    const activeRootId =
      variantSet.rootByValue[variantSet.activeValue ?? variantSet.defaultValue];
    if (!activeRootId) {
      const nextActiveOption = variantSet.options.find(
        (option) => variantSet.rootByValue[option.value],
      );
      variantSet.activeValue =
        nextActiveOption?.value ?? variantSet.defaultValue;
    }
  });

  composition.rootObjectIds = composition.rootObjectIds.filter(
    (objectId) => !deleteIds.has(objectId),
  );
  deleteIds.forEach((objectId) => {
    delete composition.objects[objectId];
  });
};

export const getStudioTimetableDeleteMessage = (count: number): string =>
  `Deleted ${count} timetable ${count === 1 ? "object" : "objects"}`;

// --- capability ---

export const getStudioTimetableCapabilityMessage = (
  capabilityKey: "multi" | "offlineMemo",
  enabled: boolean,
): string =>
  `${capabilityKey === "multi" ? "Multi" : "Offline memo"} ${
    enabled ? "enabled" : "disabled"
  }`;

/** 놓인 객체인지 확인하고 좁혀 준다. 위치 명령은 놓인 객체만 다룬다. */
export const isStudioPlacedTimetableObject = (
  object: StudioTimetableCompositionObject | undefined,
): object is StudioTimetableCompositionObject =>
  isStudioPlacedTimetableCompositionObject(object);
