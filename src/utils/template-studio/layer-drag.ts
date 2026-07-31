import type {
  StudioGraphNode,
  StudioNodeId,
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "@/types/template-studio";
import { isStudioNodeLocked } from "@/utils/template-studio/graph-nodes";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import {
  validateStudioGraphMove,
  type StudioGraphDropPosition,
  type StudioGraphMoveParams,
  type StudioGraphMoveValidation,
} from "@/utils/template-studio/graph-editor";
import { getStudioDataDropPosition } from "@/utils/template-studio/layer-order";
/**
 * 지금 집어 든 카드 레이어.
 *
 * 여러 개를 함께 옮길 수 있으므로 목록으로 들고, 처음 집은 것을 따로 기억한다.
 * 옮긴 뒤 무엇을 다시 골라 줄지가 그 값으로 정해진다.
 */
export interface StudioLayerDragState {
  primaryNodeId: StudioNodeId;
  nodeIds: StudioNodeId[];
}
/** 지금 가리키는 드롭 자리. 표시선과 막힌 표현이 여기서 정해진다. */
export interface StudioLayerDropState {
  nodeId: StudioNodeId;
  position: StudioGraphDropPosition;
  blockedReason?: string | null;
}
/**
 * 행 안에서의 포인터 높이를 0~1로 바꾼다.
 *
 * 높이를 못 읽은 행은 가운데로 본다. 0으로 나누면 위/아래 판단이 뒤집힌다.
 */
export const getStudioLayerPointerRatio = (
  pointerY: number,
  bounds: { top: number; height: number },
): number =>
  bounds.height > 0 ? (pointerY - bounds.top) / bounds.height : 0.5;
/**
 * 포인터 높이로 위/아래/안쪽을 가른다.
 *
 * 묶음은 안쪽에 넣는 것도 옮기기이므로 가운데 절반을 안쪽으로 준다. 묶음이
 * 아닌 행에 안쪽을 주면 넣을 수 없는 자리를 보여 주는 셈이 된다.
 */
export const getStudioLayerDropPosition = (
  offsetRatio: number,
  isGroup: boolean,
): StudioGraphDropPosition => {
  if (!isGroup) return offsetRatio < 0.5 ? "before" : "after";
  if (offsetRatio < 0.25) return "before";
  if (offsetRatio > 0.75) return "after";
  return "inside";
};
/**
 * 놓았을 때 쓸 위치를 정한다.
 *
 * 표시선을 보여 준 자리에 그대로 놓았으면 그 위치를 쓴다. 다른 행 위에서 놓았을
 * 때만 포인터로 다시 계산한다. 보여 준 자리와 다른 곳으로 옮기지 않기 위한 것이다.
 */
export const resolveStudioLayerDropPosition = (
  dropState: StudioLayerDropState | null,
  targetNodeId: StudioNodeId,
  pointerPosition: StudioGraphDropPosition,
): StudioGraphDropPosition =>
  dropState?.nodeId === targetNodeId ? dropState.position : pointerPosition;
/**
 * 카드 문서에서 부모를 바꿀 수 없는 노드를 모은다.
 *
 * 카드 변형의 뿌리와 Entry Group 자리는 시간표가 요일 카드를 만들 때 찾아
 * 쓰는 노드다. 다른 부모 밑으로 옮기면 시간표가 그 노드를 못 찾아 카드가 빈
 * 칸으로 렌더링된다. 레이어 패널에서는 여느 노드와 똑같이 보이므로 옮기기 전에
 * 막아야 한다.
 */
const getStudioProtectedNodeIds = (
  document: StudioTemplateDocument,
): Set<StudioNodeId> => {
  const protectedNodeIds = new Set<StudioNodeId>();
  Object.values(document.domains?.timetable?.components ?? {}).forEach(
    (component) => {
      Object.values(component.variants).forEach((variant) =>
        protectedNodeIds.add(variant.rootNodeId),
      );
    },
  );
  Object.values(document.graph.nodes).forEach((node: StudioGraphNode) => {
    if (node.meta?.entrySlot) protectedNodeIds.add(node.id);
  });
  return protectedNodeIds;
};
/**
 * 레이어 패널에서 이 자리로 옮길 수 있는지 본다.
 *
 * 그래프가 허용하는지 먼저 보고, 그 위에 시간표가 걸어 둔 잠금을 더한다.
 * 시간표 뿌리 객체와 카드 변형 뿌리는 부모가 바뀌면 안 된다. 같은 부모 안에서
 * 순서만 바꾸는 것은 허용한다.
 *
 * 위치는 패널에서 본 값으로 받는다. 안쪽에 넣는 것만 판단이 달라지고 위/아래는
 * 어느 쪽이든 같은 부모를 보므로, 여기서는 저장 순서로 뒤집지 않는다. 뒤집기는
 * 실제로 옮길 자리를 정하는 `planStudioLayerDrop`이 한 번만 한다.
 */
export const validateStudioLayerMove = (
  document: StudioTemplateDocument,
  sourceNodeIds: StudioNodeId[],
  targetNodeId: StudioNodeId,
  position: StudioGraphDropPosition,
): StudioGraphMoveValidation => {
  const validation = validateStudioGraphMove(document, {
    sourceNodeIds,
    targetNodeId,
    position,
  });
  if (!validation.ok) return validation;
  const timetableMountNodeId = document.domains?.timetable?.mountNodeId;
  const mountNode = timetableMountNodeId
    ? document.graph.nodes[timetableMountNodeId]
    : null;
  if (
    timetableMountNodeId &&
    validation.sourceNodeIds.includes(timetableMountNodeId) &&
    validation.targetParentId !== (mountNode?.parentId ?? null)
  ) {
    return {
      ...validation,
      ok: false,
      reason: "Root timetable object is locked",
    };
  }
  const protectedNodeIds = getStudioProtectedNodeIds(document);
  const movesProtectedStructure = validation.sourceNodeIds.some((nodeId) => {
    if (!protectedNodeIds.has(nodeId)) return false;
    const node = document.graph.nodes[nodeId];
    return validation.targetParentId !== (node?.parentId ?? null);
  });
  if (movesProtectedStructure) {
    return {
      ...validation,
      ok: false,
      reason: "Card variant roots and Entry Groups cannot be reparented",
    };
  }
  return validation;
};
/**
 * 끌고 머무는 동안 접힌 묶음을 저절로 펼칠지 본다.
 *
 * 안쪽에 넣으려는 중일 때만 펼친다. 위/아래로 넣으려는 중이면 그 묶음을 열어 줄
 * 이유가 없고, 놓을 수 없는 자리를 열어 주면 들어갈 수 없는 곳을 안내하는 셈이다.
 * 비어 있는 묶음은 펼쳐도 보여 줄 것이 없다.
 */
export const shouldAutoExpandStudioLayerGroup = ({
  position,
  targetNode,
  ok,
  collapsed,
}: {
  position: StudioGraphDropPosition;
  targetNode: StudioGraphNode | null | undefined;
  ok: boolean;
  collapsed: boolean;
}): boolean =>
  ok &&
  position === "inside" &&
  targetNode?.type === "group" &&
  targetNode.childIds.length > 0 &&
  collapsed;
/** 놓은 결과 무엇을 할지. `blocked`면 이유만 알리고 문서는 그대로 둔다. */
export type StudioLayerDropPlan =
  | { kind: "blocked"; reason: string }
  | {
      kind: "move";
      params: StudioGraphMoveParams;
      /** 옮긴 뒤 다시 고를 노드. 목록에서 빠졌으면 마지막 것을 고른다. */
      primaryNodeId: StudioNodeId;
      /** 묶음 안에 넣었는지. 그 묶음은 펼쳐 둬야 옮긴 것이 보인다. */
      expandTargetGroup: boolean;
    };
/**
 * 놓았을 때 무엇을 옮길지 정한다.
 *
 * 레이어 패널은 앞에 있는 것을 위에 보여 주고 문서는 뒤에 있는 것을 먼저
 * 그린다. 그래서 패널에서 본 위/아래를 저장 순서로 뒤집어야 한다. 이 뒤집기는
 * 여기서 한 번만 한다. 두 곳에서 뒤집으면 서로 상쇄되어 옮긴 방향이 반대로
 * 저장되고, 화면은 곧 다시 그려지므로 사용자에게는 옮기기가 튕긴 것처럼 보인다.
 *
 * 부모가 바뀌어도 화면에서는 같은 자리에 있어야 하므로 좌표를 다시 계산하도록
 * 표시해 둔다.
 */
export const planStudioLayerDrop = (
  document: StudioTemplateDocument,
  dragState: StudioLayerDragState,
  dropState: StudioLayerDropState | null,
  targetNodeId: StudioNodeId,
  pointerPosition: StudioGraphDropPosition,
): StudioLayerDropPlan => {
  const position = resolveStudioLayerDropPosition(
    dropState,
    targetNodeId,
    pointerPosition,
  );
  const validation = validateStudioLayerMove(
    document,
    dragState.nodeIds,
    targetNodeId,
    position,
  );
  if (!validation.ok) {
    return {
      kind: "blocked",
      reason: validation.reason ?? "Layer move blocked",
    };
  }
  return {
    kind: "move",
    params: {
      sourceNodeIds: dragState.nodeIds,
      targetNodeId,
      position: getStudioDataDropPosition(position),
      preserveCanvasPosition: true,
    },
    primaryNodeId: dragState.primaryNodeId,
    expandTargetGroup: position === "inside",
  };
};
/**
 * 캔버스에서 이 노드를 끌 수 있는지 본다.
 *
 * 잠근 객체는 끌 수 없다. 부모를 채우도록 해 둔 객체도 끌 수 없다. 그 객체의
 * 자리는 부모가 정하므로, 끌어서 옮기면 다음에 다시 그릴 때 원래 자리로 돌아간다.
 * 사용자에게는 옮기기가 튕긴 것으로 보인다.
 *
 * 여러 개를 함께 끌 때는 하나라도 막히면 전부 막는다. 일부만 움직이면 함께 고른
 * 것들의 자리 관계가 깨진다.
 */
export const getStudioCanvasNodeDragBlockedReason = (
  document: StudioTemplateDocument,
  nodeIds: StudioNodeId[],
): string | null => {
  const nodes = nodeIds.map((nodeId) => document.graph.nodes[nodeId]);
  if (nodes.some((node) => isStudioNodeLocked(node))) {
    return "Selection includes locked object";
  }
  if (nodes.some((node) => isStudioFillParentLayout(node?.layoutMode))) {
    return "Disable Fit to move this object";
  }
  return null;
};
/**
 * 캔버스에서 이 시간표 레이어를 끌 수 있는지 본다.
 *
 * composition에 없는 id는 요일 카드일 때만 받는다. 요일 카드는 객체가 아니라 요일
 * 목록에서 만들어지므로 objects에 없다.
 *
 * `blocked`는 이유를 알리고 끌지 않는다는 뜻이고, `missing`은 우리가 다룰 대상이
 * 아니라는 뜻이다. 둘을 같이 다루면 빈 자리를 끌 때마다 안내가 뜬다.
 */
export const getStudioTimetableCanvasDragBlock = (
  object: StudioTimetableCompositionObject | null | undefined,
  layerId: string,
):
  | { kind: "allowed" }
  | { kind: "missing" }
  | { kind: "blocked"; reason: string } => {
  if (!object) {
    return layerId.startsWith("day-card:")
      ? { kind: "allowed" }
      : { kind: "missing" };
  }
  if (object.locked) return { kind: "blocked", reason: "Object is locked" };
  if (isStudioFillParentLayout(object.layoutMode)) {
    return { kind: "blocked", reason: "Disable Fit to move this object" };
  }
  return { kind: "allowed" };
};
