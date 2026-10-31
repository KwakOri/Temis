import type {
  StudioTimetableCompositionObjectKind,
  StudioTimetableDayId,
} from "@/types/template-studio";
import { getStudioDataDropPosition } from "@/utils/template-studio/layer-order";
/**
 * 지금 집어 든 시간표 레이어.
 *
 * 최상위 객체와 요일 카드는 옮길 수 있는 자리가 아예 다르다. 요일 카드는
 * composition object가 아니라 요일 목록의 순서를 가리키므로 집는 순간 어느
 * 쪽인지 적어 둬야 드롭할 때 두 규칙을 섞지 않는다.
 */
export interface StudioTimetableLayerDragState {
  layerId: string;
  /** root: composition 최상위 객체, day: 요일 카드 */
  scope: "root" | "day";
  /** 요일 카드를 집었을 때의 요일 id. */
  dayId?: StudioTimetableDayId;
}
/**
 * 목록이 포인터에 가장 가까운 행으로 찾은 드롭 대상.
 *
 * 묶음의 자식처럼 옮길 수 없는 행 위에 있어도 이웃한 대상 행이 잡힌다. 위/아래는
 * 이 행의 크기로 판단하므로 행 밖의 포인터도 같은 기준으로 갈린다.
 */
export interface StudioTimetableLayerDropTarget {
  layerId: string;
  /** 요일 카드 행일 때의 요일 id. */
  dayId?: StudioTimetableDayId;
  bounds: { top: number; height: number };
}
/** 지금 가리키는 드롭 자리. 표시선을 어디에 그릴지가 여기서 정해진다. */
export interface StudioTimetableLayerDropState {
  layerId: string;
  /** 패널에서 본 위치. 저장 순서와는 다를 수 있다. */
  position: "before" | "after";
  /** 드롭할 수 없는 이유. 있으면 놓아도 아무 일도 일어나지 않는다. */
  blockedReason?: string | null;
}
/**
 * 이 자리에 놓을 수 있는지 본다.
 *
 * 최상위 객체를 요일 카드 사이에 넣으면 그 객체가 요일마다 복제되는 것처럼
 * 보이지만 실제로는 아무 요일에도 속하지 않는다. 반대로 요일 카드를 묶음 밖으로
 * 빼면 요일 순서가 카드 순서와 어긋난다. 둘 다 화면에서는 옮겨진 것처럼 보이고
 * 저장한 뒤에야 깨진 것을 알게 되므로 집는 쪽의 종류로 미리 막는다.
 */
export const getStudioTimetableLayerDropBlockedReason = (
  dragState: StudioTimetableLayerDragState,
  targetLayerId: string,
  targetDayId?: StudioTimetableDayId,
): string | null => {
  if (dragState.scope === "root") {
    if (targetDayId) return "Cannot move root layer into day cards";
    if (dragState.layerId === targetLayerId) return "Already here";
    return null;
  }
  if (!targetDayId) return "Cannot move day card outside its group";
  if (dragState.dayId === targetDayId) return "Already here";
  return null;
};
/**
 * 행 위에서의 포인터 높이로 위/아래를 가른다.
 *
 * 행 가운데를 기준으로 삼는다. 높이가 0인 행은 아래로 본다.
 */
export const getStudioTimetableLayerDropPosition = (
  pointerY: number,
  bounds: { top: number; height: number },
): "before" | "after" =>
  pointerY < bounds.top + bounds.height / 2 ? "before" : "after";
/**
 * 끌고 머무는 동안 접힌 묶음을 저절로 펼칠지 본다.
 *
 * 접힌 요일 카드 묶음 위에 있을 때만 펼친다. 놓을 수 없는 자리에서 펼치면
 * 들어갈 수 없는 곳을 열어 주는 셈이라 막힌 이유가 있으면 펼치지 않는다.
 */
export const shouldAutoExpandStudioTimetableLayer = ({
  targetDayId,
  targetObjectKind,
  blockedReason,
  collapsed,
}: {
  targetDayId?: StudioTimetableDayId;
  targetObjectKind?: StudioTimetableCompositionObjectKind | null;
  blockedReason: string | null;
  collapsed: boolean;
}): boolean =>
  !targetDayId &&
  !blockedReason &&
  targetObjectKind === "generatedDayCards" &&
  collapsed;
/**
 * 포인터가 가리키는 드롭 자리를 대상 행 기준으로 계산한다.
 *
 * 포인터가 행 밖의 틈이나 옮길 수 없는 행 위에 있어도 대상 행의 가운데를 기준으로
 * 위/아래를 가른다. 대상 행보다 위에 있으면 위, 아래에 있으면 아래다.
 */
export const getStudioTimetableLayerPointerDropState = (
  dragState: StudioTimetableLayerDragState,
  target: StudioTimetableLayerDropTarget,
  pointerY: number,
): StudioTimetableLayerDropState => ({
  layerId: target.layerId,
  position: getStudioTimetableLayerDropPosition(pointerY, target.bounds),
  blockedReason: getStudioTimetableLayerDropBlockedReason(
    dragState,
    target.layerId,
    target.dayId,
  ),
});
/** 표시선을 다시 그릴 필요가 있는지 본다. 같은 자리면 상태를 바꾸지 않는다. */
export const isSameStudioTimetableLayerDropState = (
  current: StudioTimetableLayerDropState | null,
  next: StudioTimetableLayerDropState | null,
): boolean =>
  current === next ||
  (current !== null &&
    next !== null &&
    current.layerId === next.layerId &&
    current.position === next.position &&
    (current.blockedReason ?? null) === (next.blockedReason ?? null));
/**
 * 놓았을 때 쓸 드롭 자리를 정한다.
 *
 * 표시선을 그려 둔 행에 놓았으면 그 자리를 쓴다. 다른 행에 놓았으면 놓은 순간의
 * 포인터로 다시 계산한 자리를 쓴다. 크롬은 새 행에 들어간 직후에는 dragover를
 * 보내지 않으므로, 그 사이에 놓으면 표시선이 아직 이전 행에 남아 있다. 그 자리를
 * 고집하면 사용자가 가리킨 행에 놓았는데도 아무 일도 일어나지 않는다.
 */
export const resolveStudioTimetableLayerDropState = (
  shownDropState: StudioTimetableLayerDropState | null,
  pointerDropState: StudioTimetableLayerDropState,
): StudioTimetableLayerDropState =>
  shownDropState?.layerId === pointerDropState.layerId
    ? shownDropState
    : pointerDropState;
/** 드롭한 결과 무엇을 옮길지. `none`이면 아무것도 하지 않는다. */
export type StudioTimetableLayerDropPlan =
  | { kind: "none" }
  | {
      kind: "root";
      sourceLayerId: string;
      targetLayerId: string;
      /** 저장 순서 기준. 패널에서 본 위/아래와 반대다. */
      position: "before" | "after";
    }
  | {
      kind: "day";
      sourceDayId: StudioTimetableDayId;
      targetDayId: StudioTimetableDayId;
      /** 저장 순서 기준. 패널에서 본 위/아래와 반대다. */
      position: "before" | "after";
    };
/**
 * 놓은 자리에서 무엇을 옮길지 정한다.
 *
 * 최상위 객체와 요일 카드 모두 패널에서 본 위/아래를 뒤집어야 한다. 패널은 앞에
 * 있는 것을 위에 보여 주고 문서는 뒤에 있는 것을 먼저 그리기 때문이다.
 * 방향이 어긋나면 옮긴 순서가 반대로 저장돼 옮기기가 튕긴 것처럼 보인다.
 *
 * 표시선을 그려 둔 자리와 실제로 놓인 자리가 다르면 옮기지 않는다. 화면에 없던
 * 자리로 옮기는 셈이기 때문이다.
 */
export const planStudioTimetableLayerDrop = (
  dragState: StudioTimetableLayerDragState,
  dropState: StudioTimetableLayerDropState,
  targetLayerId: string,
  targetDayId?: StudioTimetableDayId,
): StudioTimetableLayerDropPlan => {
  if (dropState.layerId !== targetLayerId || dropState.blockedReason) {
    return { kind: "none" };
  }
  if (dragState.scope === "root") {
    if (targetDayId || dragState.layerId === targetLayerId) {
      return { kind: "none" };
    }
    return {
      kind: "root",
      sourceLayerId: dragState.layerId,
      targetLayerId,
      position: getStudioDataDropPosition(dropState.position),
    };
  }
  if (!dragState.dayId || !targetDayId || dragState.dayId === targetDayId) {
    return { kind: "none" };
  }
  return {
    kind: "day",
    sourceDayId: dragState.dayId,
    targetDayId,
    position: getStudioDataDropPosition(dropState.position),
  };
};
