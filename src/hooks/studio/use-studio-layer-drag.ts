"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import type {
  StudioNodeId,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  moveStudioGraphNodes,
  type StudioGraphDropPosition,
  type StudioGraphMoveValidation,
} from "@/utils/template-studio/graph-editor";
import {
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import {
  getStudioLayerDropPosition,
  getStudioLayerPointerRatio,
  isSameStudioLayerDropState,
  planStudioLayerDrop,
  shouldAutoExpandStudioLayerGroup,
  validateStudioLayerMove,
  type StudioLayerDragState,
  type StudioLayerDropState,
  type StudioLayerDropTarget,
} from "@/utils/template-studio/layer-drag";
import {
  expandStudioCollapsedLayerId,
  STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
} from "@/utils/template-studio/layer-order";
import { getStudioSelectionLabel } from "@/utils/template-studio/selection";
export interface StudioLayerDragOptions {
  /** 콜백 안에서 최신 문서를 읽는다. */
  getDocument: () => StudioTemplateDocument;
  getSelectedNodeIds: () => StudioNodeId[];
  /**
   * 접힌 묶음 id를 읽고 쓴다.
   *
   * 접힘은 되돌리기가 되살리지 않는 뷰 설정이라 store가 갖고 있다. 끌고 있는
   * 동안 값이 바뀌어도 핸들러를 다시 만들지 않도록 값이 아니라 함수로 받는다.
   */
  getCollapsedNodeIds: () => string[];
  setCollapsedNodeIds: (updater: (current: string[]) => string[]) => void;
  /** 문서를 바꾼다. 이력은 이 함수가 소유한다. */
  updateDocument: (mutate: (draft: StudioTemplateDocument) => void) => void;
  /** 옮긴 노드를 다시 고른다. */
  onSelect: (
    nodeIds: StudioNodeId[],
    primaryNodeId?: StudioNodeId | null,
  ) => void;
  /** 고르지 않은 노드를 집었을 때 그것만 고른다. */
  onSelectSingleNode: (nodeId: StudioNodeId) => void;
  onStatusMessage: (message: string) => void;
  /** 옮기기가 끝난 뒤. 보통 레이어 탭으로 옮긴다. */
  onAfterMove?: () => void;
  autoExpandDelayMs?: number;
}
export interface StudioLayerDrag {
  dropState: StudioLayerDropState | null;
  /** 끌기가 끝났을 때. 표시선과 예약해 둔 자동 펼침을 함께 지운다. */
  clearDragState: () => void;
  handleDragStart: (
    event: DragEvent<HTMLElement>,
    nodeId: StudioNodeId,
  ) => void;
  /**
   * 목록 위를 지날 때. dragenter와 dragover 모두 여기로 온다. 묶음은 가운데
   * 절반이 안쪽이다.
   */
  handleDragOver: (
    event: DragEvent<HTMLElement>,
    target: StudioLayerDropTarget | null,
  ) => void;
  /** 목록 밖으로 나갔을 때. 표시선과 예약해 둔 자동 펼침을 지운다. */
  handleDragLeave: () => void;
  handleDrop: (
    event: DragEvent<HTMLElement>,
    target: StudioLayerDropTarget | null,
  ) => void;
}
/**
 * 카드 레이어 패널의 끌어 옮기기 규칙.
 *
 * 잠근 노드는 집을 수 없고, 시간표가 찾아 쓰는 노드는 부모를 바꿀 수 없다.
 * 어디에 놓을 수 있는지와 자동 펼침 판단은 순수 함수로 빼 두었다. 이 저장소에는
 * DOM 테스트 환경이 없어서 훅을 직접 부를 수 없기 때문이다.
 *
 * 여러 개를 함께 옮길 때는 고른 것 중 부모가 겹치지 않는 것만 남긴다. 부모와
 * 자식을 같이 집으면 자식이 두 번 옮겨진다.
 *
 * 드롭은 행마다 받지 않고 목록 전체가 받는다. 행 사이 틈에서 받지 않으면
 * 브라우저가 그 자리를 놓을 수 없는 곳으로 보고, 표시선이 보이는데도 놓으면 아무
 * 일도 일어나지 않는다.
 */
export function useStudioLayerDrag({
  getDocument,
  getSelectedNodeIds,
  getCollapsedNodeIds,
  setCollapsedNodeIds,
  updateDocument,
  onSelect,
  onSelectSingleNode,
  onStatusMessage,
  onAfterMove,
  autoExpandDelayMs = STUDIO_LAYER_AUTO_EXPAND_DELAY_MS,
}: StudioLayerDragOptions): StudioLayerDrag {
  const [dropState, setDropState] = useState<StudioLayerDropState | null>(null);
  /**
   * 끌고 있는 노드를 상태와 별도로 들고 있는다.
   *
   * dragover는 상태가 반영되기 전에도 이어서 들어온다. 상태만 보면 끌기가
   * 시작된 직후의 첫 몇 번을 놓친다.
   */
  const dragStateRef = useRef<StudioLayerDragState | null>(null);
  /**
   * 표시선을 그린 자리를 상태와 별도로 들고 있는다.
   *
   * 놓을 때 상태를 읽으면 마지막 dragover가 아직 반영되지 않은 값을 볼 수 있다.
   * 같은 자리인지 비교할 때도 이 값을 쓴다.
   */
  const dropStateRef = useRef<StudioLayerDropState | null>(null);
  const autoExpandTimerRef = useRef<number | null>(null);
  const autoExpandTargetRef = useRef<string | null>(null);
  /**
   * 언마운트 때 예약해 둔 자동 펼침을 지운다.
   *
   * 남겨 두면 패널이 사라진 뒤에 접힘 목록이 바뀌어, 다시 열었을 때 펼쳐진
   * 이유를 알 수 없는 상태가 된다.
   */
  useEffect(
    () => () => {
      if (autoExpandTimerRef.current !== null) {
        window.clearTimeout(autoExpandTimerRef.current);
      }
    },
    [],
  );
  /**
   * 표시선 자리를 바꾼다.
   *
   * dragover는 포인터가 멈춰 있어도 계속 들어온다. 같은 자리인데 상태를 바꾸면
   * 그때마다 편집기 전체가 다시 그려진다.
   */
  const updateDropState = useCallback(
    (nextDropState: StudioLayerDropState | null) => {
      if (isSameStudioLayerDropState(dropStateRef.current, nextDropState)) {
        return;
      }
      dropStateRef.current = nextDropState;
      setDropState(nextDropState);
    },
    [],
  );
  const cancelAutoExpand = useCallback(() => {
    if (autoExpandTimerRef.current !== null) {
      window.clearTimeout(autoExpandTimerRef.current);
      autoExpandTimerRef.current = null;
    }
    autoExpandTargetRef.current = null;
  }, []);
  const clearDragState = useCallback(() => {
    cancelAutoExpand();
    dragStateRef.current = null;
    updateDropState(null);
  }, [cancelAutoExpand, updateDropState]);
  const scheduleAutoExpand = useCallback(
    (nodeId: StudioNodeId, shouldExpand: boolean) => {
      if (!shouldExpand) {
        // 예약해 둔 대상에서 벗어났을 때만 취소한다. 다른 행 위에 있었다면
        // 그쪽 예약을 건드릴 이유가 없다.
        if (autoExpandTargetRef.current === nodeId) {
          if (autoExpandTimerRef.current !== null) {
            window.clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          autoExpandTargetRef.current = null;
        }
        return;
      }
      // 같은 행 위에 계속 머무는 동안 시간이 다시 흐르지 않게 한다.
      if (autoExpandTargetRef.current === nodeId) return;
      if (autoExpandTimerRef.current !== null) {
        window.clearTimeout(autoExpandTimerRef.current);
      }
      autoExpandTargetRef.current = nodeId;
      autoExpandTimerRef.current = window.setTimeout(() => {
        setCollapsedNodeIds((currentNodeIds) =>
          expandStudioCollapsedLayerId(currentNodeIds, nodeId),
        );
        autoExpandTimerRef.current = null;
        autoExpandTargetRef.current = null;
      }, autoExpandDelayMs);
    },
    [autoExpandDelayMs, setCollapsedNodeIds],
  );
  /** 포인터가 가리키는 자리를 대상 행의 크기와 종류로 정한다. */
  const getPointerDropPosition = useCallback(
    (
      event: DragEvent<HTMLElement>,
      target: StudioLayerDropTarget,
    ): StudioGraphDropPosition =>
      getStudioLayerDropPosition(
        getStudioLayerPointerRatio(event.clientY, target.bounds),
        getDocument().graph.nodes[target.nodeId]?.type === "group",
      ),
    [getDocument],
  );
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, nodeId: StudioNodeId) => {
      const document = getDocument();
      const node = document.graph.nodes[nodeId];
      if (!node || isStudioNodeLocked(node)) {
        event.preventDefault();
        onStatusMessage("Object is locked");
        return;
      }
      const selectedNodeIds = getSelectedNodeIds();
      // 고른 것 중 하나를 집었으면 고른 것 전부를 옮긴다. 부모와 자식을 같이
      // 골랐다면 부모만 남겨야 자식이 두 번 옮겨지지 않는다.
      const sourceNodeIds = selectedNodeIds.includes(nodeId)
        ? getStudioTopLevelNodeIds(document, selectedNodeIds)
        : [nodeId];
      const hasLockedSource = sourceNodeIds.some((sourceNodeId) =>
        isStudioNodeLocked(document.graph.nodes[sourceNodeId]),
      );
      if (hasLockedSource) {
        event.preventDefault();
        onStatusMessage("Selection includes locked object");
        return;
      }
      if (!selectedNodeIds.includes(nodeId)) onSelectSingleNode(nodeId);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", nodeId);
      dragStateRef.current = { primaryNodeId: nodeId, nodeIds: sourceNodeIds };
      updateDropState(null);
    },
    [
      getDocument,
      getSelectedNodeIds,
      onSelectSingleNode,
      onStatusMessage,
      updateDropState,
    ],
  );
  const handleDragOver = useCallback(
    (event: DragEvent<HTMLElement>, target: StudioLayerDropTarget | null) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      // 끌고 있는 동안에는 목록 어디서든 받는다. 받지 않은 자리는 브라우저가
      // 놓을 수 없는 곳으로 보고 놓아도 drop을 보내지 않는다.
      event.preventDefault();
      event.stopPropagation();
      if (!target) {
        event.dataTransfer.dropEffect = "none";
        return;
      }
      const targetNodeId = target.nodeId;
      const position = getPointerDropPosition(event, target);
      const document = getDocument();
      const validation = validateStudioLayerMove(
        document,
        dragState.nodeIds,
        targetNodeId,
        position,
      );
      scheduleAutoExpand(
        targetNodeId,
        shouldAutoExpandStudioLayerGroup({
          position,
          targetNode: document.graph.nodes[targetNodeId],
          ok: validation.ok,
          collapsed: getCollapsedNodeIds().includes(targetNodeId),
        }),
      );
      event.dataTransfer.dropEffect = validation.ok ? "move" : "none";
      updateDropState({
        nodeId: targetNodeId,
        position,
        blockedReason: validation.ok ? null : validation.reason,
      });
    },
    [
      getCollapsedNodeIds,
      getDocument,
      getPointerDropPosition,
      scheduleAutoExpand,
      updateDropState,
    ],
  );
  const handleDragLeave = useCallback(() => {
    if (!dragStateRef.current) return;
    cancelAutoExpand();
    updateDropState(null);
  }, [cancelAutoExpand, updateDropState]);
  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>, target: StudioLayerDropTarget | null) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      event.preventDefault();
      event.stopPropagation();
      if (!target) {
        clearDragState();
        return;
      }
      const targetNodeId = target.nodeId;
      const plan = planStudioLayerDrop(
        getDocument(),
        dragState,
        dropStateRef.current,
        targetNodeId,
        getPointerDropPosition(event, target),
      );
      if (plan.kind === "blocked") {
        onStatusMessage(plan.reason);
        clearDragState();
        return;
      }
      let moveResult: StudioGraphMoveValidation | null = null;
      updateDocument((nextDocument) => {
        moveResult = moveStudioGraphNodes(nextDocument, plan.params);
      });
      // 문서를 고치는 도중에 그래프가 막으면 옮기기가 일어나지 않는다. 검증을
      // 통과한 뒤에도 다시 볼 수 있으므로 결과를 그대로 알린다.
      const result = moveResult as StudioGraphMoveValidation | null;
      if (!result?.ok) {
        onStatusMessage(result?.reason ?? "Layer move failed");
      } else {
        onSelect(
          result.sourceNodeIds,
          result.sourceNodeIds.includes(plan.primaryNodeId)
            ? plan.primaryNodeId
            : result.sourceNodeIds.at(-1),
        );
        // 안쪽에 넣었으면 그 묶음을 펼쳐 둔다. 접힌 채로 두면 방금 옮긴 것이
        // 사라진 것처럼 보인다.
        if (plan.expandTargetGroup) {
          setCollapsedNodeIds((currentNodeIds) =>
            expandStudioCollapsedLayerId(currentNodeIds, targetNodeId),
          );
        }
        onAfterMove?.();
        onStatusMessage(
          `Moved ${result.sourceNodeIds.length} ${getStudioSelectionLabel(
            result.sourceNodeIds.length,
          )}`,
        );
      }
      clearDragState();
    },
    [
      clearDragState,
      getDocument,
      getPointerDropPosition,
      onAfterMove,
      onSelect,
      onStatusMessage,
      setCollapsedNodeIds,
      updateDocument,
    ],
  );
  return {
    dropState,
    clearDragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
