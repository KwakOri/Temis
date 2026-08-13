/** 이력에 쌓아둘 snapshot 개수 기본값. */
export const STUDIO_HISTORY_DEFAULT_LIMIT = 80;

export interface StudioHistoryStacks<TSnapshot> {
  /** 되돌릴 수 있는 과거 상태. 뒤쪽이 가장 최근이다. */
  past: TSnapshot[];
  /** 다시 실행할 수 있는 상태. 앞쪽이 가장 가까운 미래다. */
  future: TSnapshot[];
}

export interface StudioHistoryStep<TSnapshot> {
  stacks: StudioHistoryStacks<TSnapshot>;
  /** 편집 상태로 되돌릴 snapshot */
  snapshot: TSnapshot;
}

export const createStudioHistoryStacks = <
  TSnapshot,
>(): StudioHistoryStacks<TSnapshot> => ({ past: [], future: [] });

/**
 * 변경 직전 상태를 이력에 쌓는다.
 *
 * 새 편집이 생기면 다시 실행할 이력은 버린다.
 */
export const captureStudioHistory = <TSnapshot>(
  stacks: StudioHistoryStacks<TSnapshot>,
  snapshot: TSnapshot,
  limit: number = STUDIO_HISTORY_DEFAULT_LIMIT,
): StudioHistoryStacks<TSnapshot> => ({
  past: [...stacks.past, snapshot].slice(-limit),
  future: [],
});

/** 되돌릴 상태가 없으면 null을 준다. */
export const undoStudioHistory = <TSnapshot>(
  stacks: StudioHistoryStacks<TSnapshot>,
  currentSnapshot: TSnapshot,
  limit: number = STUDIO_HISTORY_DEFAULT_LIMIT,
): StudioHistoryStep<TSnapshot> | null => {
  const snapshot = stacks.past.at(-1);
  if (snapshot === undefined) return null;

  return {
    stacks: {
      past: stacks.past.slice(0, -1),
      future: [currentSnapshot, ...stacks.future].slice(0, limit),
    },
    snapshot,
  };
};

/** 다시 실행할 상태가 없으면 null을 준다. */
export const redoStudioHistory = <TSnapshot>(
  stacks: StudioHistoryStacks<TSnapshot>,
  currentSnapshot: TSnapshot,
  limit: number = STUDIO_HISTORY_DEFAULT_LIMIT,
): StudioHistoryStep<TSnapshot> | null => {
  const snapshot = stacks.future.at(0);
  if (snapshot === undefined) return null;

  return {
    stacks: {
      past: [...stacks.past, currentSnapshot].slice(-limit),
      future: stacks.future.slice(1),
    },
    snapshot,
  };
};
