"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  captureStudioHistory,
  createStudioHistoryStacks,
  redoStudioHistory,
  STUDIO_HISTORY_DEFAULT_LIMIT,
  undoStudioHistory,
  type StudioHistoryStacks,
} from "@/utils/template-studio/history-stacks";

export interface StudioDocumentHistoryOptions<TSnapshot> {
  /** 현재 편집 상태를 복원 가능한 값으로 만든다. */
  createSnapshot: () => TSnapshot;
  /** snapshot을 편집 상태로 되돌린다. */
  restoreSnapshot: (snapshot: TSnapshot) => void;
  limit?: number;
}

export interface StudioDocumentHistory {
  /** 변경 직전 상태를 이력에 쌓는다. 복원 중에는 아무 일도 하지 않는다. */
  capture: () => void;
  /** 되돌릴 상태가 없으면 false를 준다. */
  undo: () => boolean;
  /** 다시 실행할 상태가 없으면 false를 준다. */
  redo: () => boolean;
  clear: () => void;
  /** 복원 중인지. 복원이 만든 변경을 다시 이력에 쌓지 않기 위한 표시다. */
  isRestoringRef: React.MutableRefObject<boolean>;
}

/**
 * 문서 편집 이력.
 *
 * snapshot의 내용은 모른다. 무엇을 담고 어떻게 되돌릴지는 도메인이 정하므로
 * 시간표 전용 정규화나 runtime 선택도 이 훅 밖에 남는다.
 */
export function useStudioDocumentHistory<TSnapshot>({
  createSnapshot,
  restoreSnapshot,
  limit = STUDIO_HISTORY_DEFAULT_LIMIT,
}: StudioDocumentHistoryOptions<TSnapshot>): StudioDocumentHistory {
  const stacksRef = useRef<StudioHistoryStacks<TSnapshot>>(
    createStudioHistoryStacks<TSnapshot>(),
  );
  const isRestoringRef = useRef(false);
  const createSnapshotRef = useRef(createSnapshot);
  const restoreSnapshotRef = useRef(restoreSnapshot);

  useEffect(() => {
    createSnapshotRef.current = createSnapshot;
  }, [createSnapshot]);

  useEffect(() => {
    restoreSnapshotRef.current = restoreSnapshot;
  }, [restoreSnapshot]);

  const capture = useCallback(() => {
    if (isRestoringRef.current) return;

    stacksRef.current = captureStudioHistory(
      stacksRef.current,
      createSnapshotRef.current(),
      limit,
    );
  }, [limit]);

  const step = useCallback(
    (
      resolve: (
        stacks: StudioHistoryStacks<TSnapshot>,
        currentSnapshot: TSnapshot,
        limit: number,
      ) => {
        stacks: StudioHistoryStacks<TSnapshot>;
        snapshot: TSnapshot;
      } | null,
    ) => {
      const result = resolve(
        stacksRef.current,
        createSnapshotRef.current(),
        limit,
      );
      if (!result) return false;

      stacksRef.current = result.stacks;
      isRestoringRef.current = true;
      try {
        restoreSnapshotRef.current(result.snapshot);
      } finally {
        isRestoringRef.current = false;
      }
      return true;
    },
    [limit],
  );

  const undo = useCallback(() => step(undoStudioHistory), [step]);
  const redo = useCallback(() => step(redoStudioHistory), [step]);

  const clear = useCallback(() => {
    stacksRef.current = createStudioHistoryStacks<TSnapshot>();
  }, []);

  return { capture, undo, redo, clear, isRestoringRef };
}
