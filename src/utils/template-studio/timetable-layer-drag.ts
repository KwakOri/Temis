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
 * 접힘 목록에서 한 레이어를 뺀다.
 *
 * 이미 펼쳐져 있으면 받은 배열을 그대로 돌려준다. 자동 펼침은 끌고 있는 동안
 * 여러 번 불리므로, 바뀐 것이 없을 때 새 배열을 만들면 트리가 계속 다시 그려진다.
 */
export const expandStudioTimetableLayer = (
  collapsedLayerIds: string[],
  layerId: string,
): string[] =>
  collapsedLayerIds.includes(layerId)
    ? collapsedLayerIds.filter(
        (collapsedLayerId) => collapsedLayerId !== layerId,
      )
    : collapsedLayerIds;
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
      /** 요일 순서 기준. 패널에서 본 그대로다. */
      position: "before" | "after";
    };
/**
 * 놓은 자리에서 무엇을 옮길지 정한다.
 *
 * 최상위 객체는 패널에서 본 위/아래를 뒤집어야 한다. 패널은 앞에 있는 것을 위에
 * 보여 주고 문서는 뒤에 있는 것을 먼저 그리기 때문이다. 요일 카드는 요일 순서
 * 그대로 보여 주므로 뒤집지 않는다. 이 둘을 헷갈리면 옮긴 방향이 반대로 저장되고,
 * 화면은 곧 다시 그려지므로 사용자에게는 옮기기가 튕긴 것처럼 보인다.
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
    position: dropState.position,
  };
};
