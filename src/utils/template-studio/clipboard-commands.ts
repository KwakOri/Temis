import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  moveStudioGraphNodes,
  validateStudioGraphMove,
} from "@/utils/template-studio/graph-editor";
import type { StudioCommandPlan } from "@/utils/template-studio/graph-commands";
import {
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import {
  createStudioNodeClipboardPayload,
  insertStudioClipboardSubtree,
  type StudioNodeCopyPayload,
  type StudioNodeCutPayload,
} from "@/utils/template-studio/node-clipboard";

/** 카드 variant 루트 노드 id. 구조를 지켜야 해서 잘라낼 수 없다. */
const getStudioCardVariantRootIds = (
  document: StudioTemplateDocument,
): Set<string> =>
  new Set(
    Object.values(document.domains?.timetable?.components ?? {}).flatMap(
      (component) =>
        Object.values(component.variants).map((variant) => variant.rootNodeId),
    ),
  );

// --- 복사 ---

export const planStudioCopyNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<{ payload: StudioNodeCopyPayload }> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const payload = createStudioNodeClipboardPayload(document, nodeIds);
  if (!payload) return { ok: false, reason: "Copy failed" };

  return { ok: true, payload };
};

// --- 잘라내기 ---

/**
 * 잘라낼 수 있는지 판단한다.
 *
 * 카드 variant 루트와 Entry Group은 자리를 옮기면 시간표 구조가 깨지므로
 * 막는다. 잘라내기는 원본을 옮기는 것이라 id만 기억한다.
 */
export const planStudioCutNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
  selectedNodeId: string | null,
): StudioCommandPlan<{ payload: StudioNodeCutPayload }> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];
  const cardVariantRootIds = getStudioCardVariantRootIds(document);

  if (
    nodes.some(
      (node) => node.meta?.entrySlot || cardVariantRootIds.has(node.id),
    )
  ) {
    return {
      ok: false,
      reason: "Card variant roots and Entry Groups cannot be cut",
    };
  }

  if (nodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked object" };
  }

  return {
    ok: true,
    payload: {
      kind: "cut",
      rootNodeIds: nodeIds,
      primaryNodeId:
        selectedNodeId && nodeIds.includes(selectedNodeId)
          ? selectedNodeId
          : (nodeIds.at(-1) ?? null),
    },
  };
};

// --- 잘라낸 노드 붙여넣기 ---

export interface StudioPasteCutPlan {
  sourceNodeIds: string[];
  targetNodeId: string;
}

export type StudioPasteCutOutcome =
  | ({ ok: true } & StudioPasteCutPlan)
  | { ok: false; reason: string; clearClipboard?: boolean };

/**
 * 잘라낸 노드를 고른 위치 뒤로 옮길 수 있는지 판단한다.
 *
 * 원본이 사라졌으면 클립보드를 비우라고 알린다. 시간표 root 객체는 부모를
 * 바꿀 수 없다.
 */
export const planStudioPasteCut = (
  document: StudioTemplateDocument,
  payload: StudioNodeCutPayload,
  targetNodeId: string | null,
): StudioPasteCutOutcome => {
  const sourceNodeIds = getStudioTopLevelNodeIds(document, payload.rootNodeIds);
  if (sourceNodeIds.length === 0) {
    return { ok: false, reason: "Cut source is missing", clearClipboard: true };
  }

  const sourceNodes = sourceNodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];
  if (sourceNodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked object" };
  }

  const target = targetNodeId ? document.graph.nodes[targetNodeId] : null;
  if (!target) {
    return {
      ok: false,
      reason: "Select a destination before pasting cut objects",
    };
  }

  const validation = validateStudioGraphMove(document, {
    sourceNodeIds,
    targetNodeId: target.id,
    position: "after",
  });
  if (!validation.ok) {
    return { ok: false, reason: validation.reason ?? "Paste move blocked" };
  }

  const timetableMountNodeId = document.domains?.timetable?.mountNodeId;
  if (
    timetableMountNodeId &&
    validation.sourceNodeIds.includes(timetableMountNodeId)
  ) {
    const currentParentId =
      document.graph.nodes[timetableMountNodeId]?.parentId ?? null;
    if (validation.targetParentId !== currentParentId) {
      return {
        ok: false,
        reason: "Root timetable object cannot move to another parent",
      };
    }
  }

  return { ok: true, sourceNodeIds, targetNodeId: target.id };
};

/** 계획대로 노드를 옮긴다. 화면 위치는 유지한다. */
export const applyStudioPasteCut = (
  draft: StudioTemplateDocument,
  plan: StudioPasteCutPlan,
) =>
  moveStudioGraphNodes(draft, {
    sourceNodeIds: plan.sourceNodeIds,
    targetNodeId: plan.targetNodeId,
    position: "after",
    preserveCanvasPosition: true,
  });

// --- 복사한 노드 붙여넣기 ---

/**
 * 복사한 부분 그래프를 새 id로 넣는다.
 *
 * 고른 노드가 있으면 그 뒤에, 없으면 원본 뒤에 놓는다. 부모가 잠겨 있으면
 * 문서 루트로 올린다. 만들어진 최상위 노드 id를 준다.
 */
export const applyStudioPasteCopy = (
  draft: StudioTemplateDocument,
  payload: StudioNodeCopyPayload,
  selectedNode: StudioGraphNode | null,
): string[] => {
  const sourceRoot = payload.nodes[payload.rootNodeIds[0]];
  if (!sourceRoot) return [];

  const sourceParentId = selectedNode?.parentId ?? sourceRoot.parentId;
  const parentNode =
    sourceParentId && !isStudioNodeLocked(draft.graph.nodes[sourceParentId])
      ? draft.graph.nodes[sourceParentId]
      : null;
  const parentId = parentNode?.id ?? null;
  const siblings = parentNode ? parentNode.childIds : draft.graph.rootNodeIds;

  const pastedRootIds = payload.rootNodeIds
    .map((rootNodeId) =>
      insertStudioClipboardSubtree(draft, payload, rootNodeId, parentId, true),
    )
    .filter(Boolean) as string[];

  if (pastedRootIds.length === 0) return [];

  const selectedSiblingIndex =
    selectedNode?.parentId === parentId
      ? siblings.indexOf(selectedNode.id)
      : -1;
  const sourceSiblingIndex = siblings.indexOf(payload.rootNodeIds[0]);
  const insertIndex =
    selectedSiblingIndex >= 0
      ? selectedSiblingIndex + 1
      : sourceSiblingIndex >= 0
        ? sourceSiblingIndex + 1
        : siblings.length;

  siblings.splice(insertIndex, 0, ...pastedRootIds);
  return pastedRootIds;
};

/** 복사한 노드를 붙여넣을 대상이 사라졌는지. */
export const isStudioPasteCopyReady = (
  payload: StudioNodeCopyPayload,
): boolean => Boolean(payload.nodes[payload.rootNodeIds[0]]);
