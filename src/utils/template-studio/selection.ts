/** 선택 개수 안내에 쓰는 단위 이름. */
export const getStudioSelectionLabel = (count: number) =>
  count === 1 ? "object" : "objects";

export interface StudioResolvedSelection {
  nodeIds: string[];
  /** 속성 패널이 보여줄 기준 노드 */
  primaryNodeId: string | null;
}

/**
 * 선택 목록을 정리한다.
 *
 * 중복을 없애고 사라진 노드를 빼며, 기준 노드가 목록에 없으면 마지막 노드를
 * 기준으로 삼는다.
 */
export const resolveStudioSelection = (
  nodeIds: readonly string[],
  primaryNodeId: string | null | undefined,
  hasNode: (nodeId: string) => boolean,
): StudioResolvedSelection => {
  const nextNodeIds = Array.from(new Set(nodeIds.filter(hasNode)));
  const nextPrimaryNodeId =
    primaryNodeId && nextNodeIds.includes(primaryNodeId)
      ? primaryNodeId
      : (nextNodeIds.at(-1) ?? null);

  return { nodeIds: nextNodeIds, primaryNodeId: nextPrimaryNodeId };
};

export interface StudioSelectionRangeInput {
  /** 레이어 패널에 보이는 순서 */
  orderedNodeIds: readonly string[];
  /** 직전 범위 선택의 기준점 */
  anchorNodeId: string | null;
  /** anchor가 목록에 없을 때 대신 쓸 노드 */
  fallbackNodeId: string | null;
  targetNodeId: string;
  currentNodeIds: readonly string[];
  /** 기존 선택에 더할지 */
  append: boolean;
}

export interface StudioResolvedSelectionRange {
  nodeIds: string[];
  /** 다음 범위 선택이 이어갈 기준점 */
  anchorNodeId: string;
  /** 이번 범위에 들어온 노드 수. 0이면 범위를 만들지 못했다. */
  rangeCount: number;
}

/**
 * 보이는 순서를 기준으로 범위 선택을 계산한다.
 *
 * anchor와 대상 중 하나라도 목록에 없으면 대상만 선택한다.
 */
export const resolveStudioSelectionRange = ({
  orderedNodeIds,
  anchorNodeId,
  fallbackNodeId,
  targetNodeId,
  currentNodeIds,
  append,
}: StudioSelectionRangeInput): StudioResolvedSelectionRange => {
  const resolvedAnchorNodeId =
    anchorNodeId && orderedNodeIds.includes(anchorNodeId)
      ? anchorNodeId
      : fallbackNodeId && orderedNodeIds.includes(fallbackNodeId)
        ? fallbackNodeId
        : targetNodeId;
  const anchorIndex = orderedNodeIds.indexOf(resolvedAnchorNodeId);
  const targetIndex = orderedNodeIds.indexOf(targetNodeId);

  if (anchorIndex < 0 || targetIndex < 0) {
    return {
      nodeIds: [targetNodeId],
      anchorNodeId: targetNodeId,
      rangeCount: 0,
    };
  }

  const startIndex = Math.min(anchorIndex, targetIndex);
  const endIndex = Math.max(anchorIndex, targetIndex);
  const rangeNodeIds = orderedNodeIds.slice(startIndex, endIndex + 1);

  return {
    nodeIds: append ? [...currentNodeIds, ...rangeNodeIds] : rangeNodeIds,
    anchorNodeId: resolvedAnchorNodeId,
    rangeCount: rangeNodeIds.length,
  };
};
