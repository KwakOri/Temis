import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";

export const isStudioNodeLocked = (
  node: StudioGraphNode | null | undefined,
): boolean => Boolean(node?.locked);

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
