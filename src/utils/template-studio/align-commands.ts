import type { StudioTemplateDocument } from "@/types/template-studio";
import type { StudioCommandPlan } from "@/utils/template-studio/graph-commands";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import { getStudioCanvasNodeDragBlockedReason } from "@/utils/template-studio/layer-drag";
import { resolveStudioGraphNodeGeometry } from "@/utils/template-studio/object-layout";

export type StudioAlignAxis = "horizontal" | "vertical";
export type StudioAlignment = "start" | "center" | "end";

export interface StudioNodePosition {
  nodeId: string;
  left: number;
  top: number;
}

export interface StudioAlignNodesPlan {
  positions: StudioNodePosition[];
}

interface StudioAlignFrame {
  start: number;
  size: number;
}

/**
 * 정렬 기준이 되는 틀.
 *
 * 하나만 골랐으면 부모 안에서 맞춘다. 부모가 없으면 캔버스가 부모 역할을 한다.
 * 캔버스를 기준으로 계산하면 묶음 안의 객체가 묶음 밖으로 튀어나간다. 좌표는
 * 부모 좌표계에 저장되므로 캔버스 좌표를 그대로 넣으면 묶음 위치만큼 밀린다.
 */
const getStudioAlignParentSize = (
  document: StudioTemplateDocument,
  parentId: string | null,
): { width: number; height: number } => {
  if (!parentId) {
    return { width: document.canvas.width, height: document.canvas.height };
  }

  const parentGeometry = resolveStudioGraphNodeGeometry(document, parentId);
  return { width: parentGeometry.width, height: parentGeometry.height };
};

/**
 * 고른 것들이 같은 부모에 있는지 보고 그 부모를 준다.
 *
 * 부모가 섞여 있으면 정렬을 막는다. 각자의 부모 안에서 따로 맞추면 화면에서는
 * 정렬되지 않은 상태로 흩어지고, 한쪽 좌표계로 몰아 맞추면 다른 부모의 자식이
 * 엉뚱한 자리로 튄다.
 */
const resolveStudioSharedParentId = (
  document: StudioTemplateDocument,
  nodeIds: string[],
): { ok: true; parentId: string | null } | { ok: false } => {
  const parentIds = new Set(
    nodeIds.map((nodeId) => document.graph.nodes[nodeId]?.parentId ?? null),
  );
  if (parentIds.size !== 1) return { ok: false };

  return { ok: true, parentId: [...parentIds][0] };
};

const getAlignedStart = (
  frame: StudioAlignFrame,
  size: number,
  alignment: StudioAlignment,
): number => {
  if (alignment === "start") return frame.start;
  if (alignment === "end") return frame.start + frame.size - size;
  return frame.start + (frame.size - size) / 2;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * 정렬한 뒤의 좌표를 계산한다.
 *
 * 하나만 골랐으면 부모 안에서 맞추고, 여럿을 골랐으면 고른 것들을 감싸는 사각형
 * 안에서 맞춘다. 좌표는 모두 부모 좌표계 기준이다.
 */
export const planStudioAlignNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
  axis: StudioAlignAxis,
  alignment: StudioAlignment,
): StudioCommandPlan<StudioAlignNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  if (nodeIds.length === 0) return { ok: false, reason: "No object selected" };

  const blockedReason = getStudioCanvasNodeDragBlockedReason(document, nodeIds);
  if (blockedReason) return { ok: false, reason: blockedReason };

  const sharedParent = resolveStudioSharedParentId(document, nodeIds);
  if (!sharedParent.ok) {
    return { ok: false, reason: "Align objects must share a parent" };
  }

  const geometries = nodeIds.map((nodeId) => ({
    nodeId,
    geometry: resolveStudioGraphNodeGeometry(document, nodeId),
  }));
  const isHorizontal = axis === "horizontal";
  const parentSize = getStudioAlignParentSize(document, sharedParent.parentId);

  const frame: StudioAlignFrame =
    nodeIds.length === 1
      ? {
          start: 0,
          size: isHorizontal ? parentSize.width : parentSize.height,
        }
      : (() => {
          const starts = geometries.map(({ geometry }) =>
            isHorizontal ? geometry.left : geometry.top,
          );
          const ends = geometries.map(({ geometry }) =>
            isHorizontal
              ? geometry.left + geometry.width
              : geometry.top + geometry.height,
          );
          const start = Math.min(...starts);
          return { start, size: Math.max(...ends) - start };
        })();

  return {
    ok: true,
    positions: geometries.map(({ nodeId, geometry }) => {
      const size = isHorizontal ? geometry.width : geometry.height;
      const aligned = round(getAlignedStart(frame, size, alignment));

      return {
        nodeId,
        left: isHorizontal ? aligned : geometry.left,
        top: isHorizontal ? geometry.top : aligned,
      };
    }),
  };
};

/**
 * 고른 것들의 간격을 고르게 나눈 좌표를 계산한다.
 *
 * 양 끝은 그대로 두고 사이만 나눈다. 끝까지 움직이면 사용자가 잡아 둔 범위가 바뀐다.
 * 세 개보다 적으면 나눌 사이가 없다.
 */
export const planStudioDistributeNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
  axis: StudioAlignAxis,
): StudioCommandPlan<StudioAlignNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  if (nodeIds.length < 3) {
    return { ok: false, reason: "Select three or more objects to distribute" };
  }

  const blockedReason = getStudioCanvasNodeDragBlockedReason(document, nodeIds);
  if (blockedReason) return { ok: false, reason: blockedReason };

  const sharedParent = resolveStudioSharedParentId(document, nodeIds);
  if (!sharedParent.ok) {
    return { ok: false, reason: "Distribute objects must share a parent" };
  }

  const isHorizontal = axis === "horizontal";
  const ordered = nodeIds
    .map((nodeId) => ({
      nodeId,
      geometry: resolveStudioGraphNodeGeometry(document, nodeId),
    }))
    .sort((a, b) =>
      isHorizontal
        ? a.geometry.left - b.geometry.left
        : a.geometry.top - b.geometry.top,
    );

  const first = ordered[0].geometry;
  const last = ordered[ordered.length - 1].geometry;
  const spanStart = isHorizontal ? first.left : first.top;
  const spanEnd = isHorizontal
    ? last.left + last.width
    : last.top + last.height;
  const usedSize = ordered.reduce(
    (total, { geometry }) =>
      total + (isHorizontal ? geometry.width : geometry.height),
    0,
  );
  const gap = (spanEnd - spanStart - usedSize) / (ordered.length - 1);

  let cursor = spanStart;
  return {
    ok: true,
    positions: ordered.map(({ nodeId, geometry }) => {
      const position = round(cursor);
      cursor += (isHorizontal ? geometry.width : geometry.height) + gap;

      return {
        nodeId,
        left: isHorizontal ? position : geometry.left,
        top: isHorizontal ? geometry.top : position,
      };
    }),
  };
};

/** 계획한 좌표를 문서에 적는다. style이 없는 노드는 건너뛴다. */
export const applyStudioNodePositions = (
  draft: StudioTemplateDocument,
  positions: StudioNodePosition[],
): void => {
  positions.forEach(({ nodeId, left, top }) => {
    const styleId = draft.graph.nodes[nodeId]?.styleId;
    if (!styleId) return;

    draft.styles[styleId] = { ...draft.styles[styleId], left, top };
  });
};
