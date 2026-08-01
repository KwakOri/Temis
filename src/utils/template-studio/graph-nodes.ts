import type {
  StudioAssetSlot,
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";

export const isStudioNodeLocked = (
  node: StudioGraphNode | null | undefined,
): boolean => Boolean(node?.locked);

/**
 * 편집 중 감춘 노드인지.
 *
 * 조상이 감춰져 있으면 자식도 그려지지 않는다. 그 판단은 트리를 타고 내려가는
 * 렌더러가 하고, 여기서는 노드 하나의 표시만 본다.
 */
export const isStudioNodeHidden = (
  node: StudioGraphNode | null | undefined,
): boolean => Boolean(node?.hidden);

/**
 * 노드 배경으로 그릴 그림 자리의 이름.
 *
 * 노드 하나에 배경 그림 자리는 하나다. 이름을 도메인마다 다르게 두면 같은 칸을
 * 두 벌 만들게 된다.
 */
export const STUDIO_NODE_BACKGROUND_ASSET_SLOT = "asset";

/**
 * 노드 배경으로 그릴 그림 자리.
 *
 * 어떤 도메인의 노드인지 모른다. 시간표의 상태 카드 배경처럼 도메인이 자리를 더
 * 따져야 하면 렌더러에 판단 함수를 넘긴다.
 */
export const getStudioNodeBackgroundAssetSlot = (
  node: StudioGraphNode | null | undefined,
): StudioAssetSlot | null =>
  node?.assetSlots?.[STUDIO_NODE_BACKGROUND_ASSET_SLOT] ?? null;

/** `nodeId`가 `maybeAncestorId`의 자손인지. */
export const isStudioNodeDescendantOf = (
  document: StudioTemplateDocument,
  nodeId: string,
  maybeAncestorId: string,
): boolean => {
  let current = document.graph.nodes[nodeId];

  while (current?.parentId) {
    if (current.parentId === maybeAncestorId) return true;
    current = document.graph.nodes[current.parentId];
  }

  return false;
};

/**
 * 선택 목록에서 조상이 함께 선택된 노드를 걷어낸다.
 *
 * 그룹과 그 자식을 같이 선택한 상태에서 명령을 실행하면 자식이 두 번 처리되기
 * 때문에, 명령은 항상 최상위 노드만 대상으로 삼는다.
 */
export const getStudioTopLevelNodeIds = (
  document: StudioTemplateDocument,
  nodeIds: string[],
): string[] => {
  const selected = new Set(nodeIds);

  return nodeIds.filter(
    (nodeId) =>
      document.graph.nodes[nodeId] &&
      !Array.from(selected).some(
        (otherNodeId) =>
          otherNodeId !== nodeId &&
          isStudioNodeDescendantOf(document, nodeId, otherNodeId),
      ),
  );
};

export interface StudioNodeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export const getStudioNodeBounds = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioNodeBounds => {
  const { left, top, width, height } = resolveStudioGraphNodeGeometry(
    document,
    nodeId,
  );

  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
};

export interface StudioCombinedBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 여러 노드를 감싸는 사각형. 그룹을 만들 때 쓴다. */
export const getStudioCombinedBounds = (
  document: StudioTemplateDocument,
  nodeIds: string[],
): StudioCombinedBounds => {
  const bounds = nodeIds.map((nodeId) => getStudioNodeBounds(document, nodeId));
  const left = Math.min(...bounds.map((bound) => bound.left));
  const top = Math.min(...bounds.map((bound) => bound.top));
  const right = Math.max(...bounds.map((bound) => bound.right));
  const bottom = Math.max(...bounds.map((bound) => bound.bottom));

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
};

/** 노드의 형제 목록. 저장 순서(뒤에서 앞)를 그대로 준다. */
export const getStudioNodeSiblingIds = (
  document: StudioTemplateDocument,
  nodeId: string,
): string[] => {
  const node = document.graph.nodes[nodeId];
  if (!node) return [];

  return node.parentId
    ? (document.graph.nodes[node.parentId]?.childIds ?? [])
    : document.graph.rootNodeIds;
};
