"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";

import type { StudioEditorStore } from "@/stores/studio/studio-editor-store";
import {
  getStudioSelectionLabel,
  resolveStudioSelectionRange,
} from "@/utils/template-studio/selection";

export interface StudioSelectionOptions {
  /**
   * 선택 값을 보관하는 store.
   *
   * 이 훅은 값을 들고 있지 않는다. 선택은 되돌리기 한 단위에 함께 들어가므로
   * 문서와 같은 곳에 있어야 한다.
   */
  store: StudioEditorStore;
  /**
   * 레이어 패널에 보이는 순서를 돌려준다.
   *
   * 범위 선택이 이 순서를 기준으로 동작한다. 목록이 훅보다 늦게 계산돼도
   * 되도록 값이 아니라 함수로 받는다.
   */
  getVisibleNodeIds: () => string[];
  /** 범위 선택 결과 같은 짧은 안내 */
  onStatusMessage?: (message: string) => void;
}

export interface StudioSelectionState {
  /** 마지막으로 고른 노드. 속성 패널이 보여줄 대상이다. */
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  /** 문서에 있는 노드만 남겨서 선택을 바꾼다. */
  applySelection: (nodeIds: string[], primaryNodeId?: string | null) => void;
  selectSingleNode: (nodeId: string | null) => void;
  toggleNodeSelection: (nodeId: string) => void;
  /** 보이는 순서 기준으로 anchor부터 대상까지 선택한다. */
  selectNodeRange: (nodeId: string, appendToCurrentSelection: boolean) => void;
  /**
   * 검사 없이 선택을 되돌린다.
   *
   * 이력 복원처럼 문서와 선택을 함께 갈아끼울 때만 쓴다.
   */
  restoreSelection: (nodeIds: string[], primaryNodeId: string | null) => void;
}

/**
 * 그래프 노드 선택 규칙.
 *
 * 단일 선택, 토글 선택, 범위 선택과 지워진 노드 정리를 소유한다. 값 자체는
 * store가 보관하고 이 훅은 무엇을 고를지 정하는 규칙만 다룬다. 어떤 순서로
 * 보이는지는 호출한 쪽이 알려준다.
 *
 * 범위 선택의 기준점은 store에 두지 않는다. 되돌리기가 되살릴 값이 아니라 연속
 * 조작 동안만 사는 값이다.
 */
export function useStudioSelection({
  store,
  getVisibleNodeIds,
  onStatusMessage,
}: StudioSelectionOptions): StudioSelectionState {
  const selectedNodeId = useStore(store, (state) => state.selectedNodeId);
  const selectedNodeIds = useStore(store, (state) => state.selectedNodeIds);
  const anchorNodeIdRef = useRef<string | null>(selectedNodeId);
  const getVisibleNodeIdsRef = useRef(getVisibleNodeIds);

  useEffect(() => {
    getVisibleNodeIdsRef.current = getVisibleNodeIds;
  }, [getVisibleNodeIds]);

  const restoreSelection = useCallback(
    (nodeIds: string[], primaryNodeId: string | null) => {
      store.getState().replaceSelection(nodeIds, primaryNodeId);
    },
    [store],
  );

  const applySelection = useCallback(
    (nodeIds: string[], primaryNodeId?: string | null) => {
      store.getState().setSelection(nodeIds, primaryNodeId);
    },
    [store],
  );

  const selectSingleNode = useCallback(
    (nodeId: string | null) => {
      anchorNodeIdRef.current = nodeId;
      applySelection(nodeId ? [nodeId] : [], nodeId);
    },
    [applySelection],
  );

  const toggleNodeSelection = useCallback(
    (nodeId: string) => {
      const currentNodeIds = store.getState().selectedNodeIds;
      const nextNodeIds = currentNodeIds.includes(nodeId)
        ? currentNodeIds.filter((selectedId) => selectedId !== nodeId)
        : [...currentNodeIds, nodeId];

      anchorNodeIdRef.current = nodeId;
      applySelection(nextNodeIds, nodeId);
    },
    [applySelection, store],
  );

  const selectNodeRange = useCallback(
    (nodeId: string, appendToCurrentSelection: boolean) => {
      const state = store.getState();
      const range = resolveStudioSelectionRange({
        anchorNodeId: anchorNodeIdRef.current,
        append: appendToCurrentSelection,
        currentNodeIds: state.selectedNodeIds,
        fallbackNodeId: state.selectedNodeId,
        orderedNodeIds: getVisibleNodeIdsRef.current(),
        targetNodeId: nodeId,
      });

      anchorNodeIdRef.current = range.anchorNodeId;
      applySelection(range.nodeIds, nodeId);

      if (range.rangeCount > 0) {
        onStatusMessage?.(
          `Selected ${range.rangeCount} ${getStudioSelectionLabel(
            range.rangeCount,
          )}`,
        );
      }
    },
    [applySelection, onStatusMessage, store],
  );

  return {
    selectedNodeId,
    selectedNodeIds,
    applySelection,
    selectSingleNode,
    toggleNodeSelection,
    selectNodeRange,
    restoreSelection,
  };
}
