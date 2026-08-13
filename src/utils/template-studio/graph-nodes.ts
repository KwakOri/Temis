import type {
  StudioAssetSlot,
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";
import { resolveStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import {
  getStudioVisualBoundsCorners,
  type StudioPoint,
  type StudioVisualBounds,
} from "@/utils/template-studio/text-effect-outset";

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

/** 선택과 저장 좌표에 사용하는 논리 bounds. 효과 바깥 영역은 포함하지 않는다. */
export const getStudioNodeLogicalBounds = getStudioNodeBounds;

const getBoundsFromPoints = (
  points: readonly StudioPoint[],
): StudioVisualBounds => {
  if (points.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }

  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const right = Math.max(...points.map((point) => point.x));
  const bottom = Math.max(...points.map((point) => point.y));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};

const rotateStudioPoint = (
  point: StudioPoint,
  center: StudioPoint,
  rotateDeg: number,
): StudioPoint => {
  const radians = (rotateDeg * Math.PI) / 180;
  const x = point.x - center.x;
  const y = point.y - center.y;
  return {
    x: center.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: center.y + x * Math.sin(radians) + y * Math.cos(radians),
  };
};

const getStudioNodeRotateDeg = (
  document: StudioTemplateDocument,
  nodeId: string,
): number => {
  const node = document.graph.nodes[nodeId];
  const style = node?.styleId ? document.styles[node.styleId] : undefined;
  return typeof style?.rotateDeg === "number" &&
    Number.isFinite(style.rotateDeg)
    ? style.rotateDeg
    : 0;
};

/** 텍스트 효과와 회전을 포함한 부모 좌표계의 corner. 부모 transform은 아직 적용하지 않는다. */
const getStudioNodeVisualCornersInParent = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioPoint[] => {
  const node = document.graph.nodes[nodeId];
  if (!node || node.hidden) return [];

  const logicalBounds = getStudioNodeBounds(document, nodeId);
  let corners: StudioPoint[];
  if (node && (node.type === "text" || node.type === "flexibleText")) {
    const style = node.styleId ? document.styles[node.styleId] : undefined;
    corners = getStudioVisualBoundsCorners({
      logicalBounds,
      appearance: resolveStudioTextAppearance(node, style),
      rotateDeg: 0,
    });
  } else {
    corners = [
      { x: logicalBounds.left, y: logicalBounds.top },
      { x: logicalBounds.right, y: logicalBounds.top },
      { x: logicalBounds.right, y: logicalBounds.bottom },
      { x: logicalBounds.left, y: logicalBounds.bottom },
    ];
  }

  node?.childIds.forEach((childId) => {
    const childCorners = getStudioNodeVisualCornersInParent(document, childId);
    corners.push(
      ...childCorners.map((point) => ({
        x: point.x + logicalBounds.left,
        y: point.y + logicalBounds.top,
      })),
    );
  });

  const rotateDeg = getStudioNodeRotateDeg(document, nodeId);
  if (!rotateDeg) return corners;

  const center = {
    x: logicalBounds.left + logicalBounds.width / 2,
    y: logicalBounds.top + logicalBounds.height / 2,
  };
  return corners.map((point) => rotateStudioPoint(point, center, rotateDeg));
};

/** 텍스트 효과와 모든 자손 transform을 포함한 부모 좌표계 bounds. */
export const getStudioNodeVisualBounds = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioVisualBounds =>
  getBoundsFromPoints(getStudioNodeVisualCornersInParent(document, nodeId));

/** 선택 overlay와 canvas clipping 진단에 사용하는 canvas 좌표계 bounds. */
export const getStudioNodeVisualBoundsInCanvas = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioVisualBounds => {
  let points = getStudioNodeVisualCornersInParent(document, nodeId);
  let parentId = document.graph.nodes[nodeId]?.parentId ?? null;

  while (parentId) {
    const parent = document.graph.nodes[parentId];
    if (!parent) break;
    const parentBounds = getStudioNodeBounds(document, parentId);
    const parentCenter = {
      x: parentBounds.width / 2,
      y: parentBounds.height / 2,
    };
    const parentRotateDeg = getStudioNodeRotateDeg(document, parentId);
    points = points.map((point) => {
      const rotated = parentRotateDeg
        ? rotateStudioPoint(point, parentCenter, parentRotateDeg)
        : point;
      return {
        x: rotated.x + parentBounds.left,
        y: rotated.y + parentBounds.top,
      };
    });
    parentId = parent.parentId;
  }

  return getBoundsFromPoints(points);
};

export interface StudioGroupOverflowDiagnostic {
  groupId: string;
  childIds: string[];
}

const isStudioNodeOrAncestorHidden = (
  document: StudioTemplateDocument,
  nodeId: string,
): boolean => {
  let node: StudioGraphNode | undefined = document.graph.nodes[nodeId];

  while (node) {
    if (node.hidden) return true;
    node = node.parentId ? document.graph.nodes[node.parentId] : undefined;
  }

  return false;
};

/** overflow hidden/clip 그룹에서 논리 박스를 벗어나는 자식 visual bounds를 찾는다. */
export const getStudioGroupOverflowDiagnostics = (
  document: StudioTemplateDocument,
): StudioGroupOverflowDiagnostic[] =>
  Object.values(document.graph.nodes)
    .filter((node) => {
      if (
        node.type !== "group" ||
        isStudioNodeOrAncestorHidden(document, node.id)
      ) {
        return false;
      }
      const style = node.styleId ? document.styles[node.styleId] : undefined;
      return style?.overflow === "hidden" || style?.overflow === "clip";
    })
    .map((group) => {
      const groupBounds = getStudioNodeBounds(document, group.id);
      const childIds = group.childIds.filter((childId) => {
        const visualBounds = getStudioNodeVisualBounds(document, childId);
        return (
          visualBounds.left < 0 ||
          visualBounds.top < 0 ||
          visualBounds.right > groupBounds.width ||
          visualBounds.bottom > groupBounds.height
        );
      });
      return { groupId: group.id, childIds };
    })
    .filter((diagnostic) => diagnostic.childIds.length > 0);

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
