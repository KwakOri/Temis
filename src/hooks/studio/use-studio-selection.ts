"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getStudioSelectionLabel,
  resolveStudioSelection,
  resolveStudioSelectionRange,
} from "@/utils/template-studio/selection";

export interface StudioSelectionOptions {
  /** 처음 선택할 노드 */
  initialNodeIds?: string[];
  /**
   * 선택할 수 있는 노드인지 판단한다.
   *
   * 보통 문서에 남아 있는 노드만 통과시킨다. 지워진 노드는 선택에서 자동으로
   * 빠진다.
   */
  hasNode: (nodeId: string) => boolean;
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
  /** 콜백 안에서 최신 선택을 읽기 위한 ref */
  selectedNodeIdRef: React.MutableRefObject<string | null>;
  selectedNodeIdsRef: React.MutableRefObject<string[]>;
  /** 존재하는 노드만 남겨서 선택을 바꾼다. */
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
 * 그래프 노드 선택 상태.
 *
 * 단일 선택, 토글 선택, 범위 선택과 지워진 노드 정리를 소유한다. 어떤 노드가
 * 선택 가능한지와 어떤 순서로 보이는지는 호출한 쪽이 알려준다. 시간표
 * composition 선택은 이 훅이 다루지 않는다.
 */
export function useStudioSelection({
  initialNodeIds = [],
  hasNode,
  getVisibleNodeIds,
  onStatusMessage,
}: StudioSelectionOptions): StudioSelectionState {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    () => initialNodeIds.at(-1) ?? null,
  );
  const [selectedNodeIds, setSelectedNodeIds] =
    useState<string[]>(initialNodeIds);
  const selectedNodeIdRef = useRef<string | null>(selectedNodeId);
  const selectedNodeIdsRef = useRef<string[]>(selectedNodeIds);
  const anchorNodeIdRef = useRef<string | null>(selectedNodeId);
  const hasNodeRef = useRef(hasNode);
  const getVisibleNodeIdsRef = useRef(getVisibleNodeIds);

  useEffect(() => {
    hasNodeRef.current = hasNode;
  }, [hasNode]);

  useEffect(() => {
    getVisibleNodeIdsRef.current = getVisibleNodeIds;
  }, [getVisibleNodeIds]);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  const restoreSelection = useCallback(
    (nodeIds: string[], primaryNodeId: string | null) => {
      selectedNodeIdRef.current = primaryNodeId;
      selectedNodeIdsRef.current = [...nodeIds];
      setSelectedNodeId(primaryNodeId);
      setSelectedNodeIds([...nodeIds]);
    },
    [],
  );

  const applySelection = useCallback(
    (nodeIds: string[], primaryNodeId?: string | null) => {
      const resolved = resolveStudioSelection(
        nodeIds,
        primaryNodeId,
        (nodeId) => hasNodeRef.current(nodeId),
      );
      restoreSelection(resolved.nodeIds, resolved.primaryNodeId);
    },
    [restoreSelection],
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
      const currentNodeIds = selectedNodeIdsRef.current;
      const nextNodeIds = currentNodeIds.includes(nodeId)
        ? currentNodeIds.filter((selectedId) => selectedId !== nodeId)
        : [...currentNodeIds, nodeId];

      anchorNodeIdRef.current = nodeId;
      applySelection(nextNodeIds, nodeId);
    },
    [applySelection],
  );

  const selectNodeRange = useCallback(
    (nodeId: string, appendToCurrentSelection: boolean) => {
      const range = resolveStudioSelectionRange({
        anchorNodeId: anchorNodeIdRef.current,
        append: appendToCurrentSelection,
        currentNodeIds: selectedNodeIdsRef.current,
        fallbackNodeId: selectedNodeIdRef.current,
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
    [applySelection, onStatusMessage],
  );

  return {
    selectedNodeId,
    selectedNodeIds,
    selectedNodeIdRef,
    selectedNodeIdsRef,
    applySelection,
    selectSingleNode,
    toggleNodeSelection,
    selectNodeRange,
    restoreSelection,
  };
}
