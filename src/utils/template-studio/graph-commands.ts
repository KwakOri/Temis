import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "@/types/template-studio";
import {
  getStudioCombinedBounds,
  getStudioNodeSiblingIds,
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
  type StudioCombinedBounds,
} from "@/utils/template-studio/graph-nodes";
import { createStudioId } from "@/utils/template-studio/id";
import {
  createStudioNodeClipboardPayload,
  insertStudioClipboardSubtree,
  type StudioNodeCopyPayload,
} from "@/utils/template-studio/node-clipboard";

/**
 * 명령 실행 계획.
 *
 * 문서를 바꾸기 전에 가능한지 판단하고, 가능하면 무엇을 어떻게 바꿀지 값으로
 * 돌려준다. 실패 이유는 사용자에게 그대로 보여줄 문구다.
 */
export type StudioCommandPlan<TPlan> =
  ({ ok: true } & TPlan) | { ok: false; reason: string };

// --- 그룹 만들기 ---

export interface StudioGroupNodesPlan {
  groupNodeId: string;
  groupStyleId: string;
  parentId: string | null;
  /** 저장 순서대로 정렬한 대상 노드 */
  orderedNodeIds: string[];
  bounds: StudioCombinedBounds;
  /** 형제 목록에서 그룹이 들어갈 자리 */
  insertIndex: number;
}

export const planStudioGroupNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioGroupNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);

  if (nodeIds.length < 2) {
    return { ok: false, reason: "Select multiple objects to group" };
  }

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  if (nodes.some((node) => node.meta?.entrySlot)) {
    return { ok: false, reason: "Entry Groups cannot be grouped" };
  }

  if (nodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked object" };
  }

  const parentId = nodes[0]?.parentId ?? null;
  if (nodes.some((node) => node.parentId !== parentId)) {
    return { ok: false, reason: "Group objects must share a parent" };
  }

  const siblings = parentId
    ? (document.graph.nodes[parentId]?.childIds ?? [])
    : document.graph.rootNodeIds;
  const orderedNodeIds = siblings.filter((nodeId) => nodeIds.includes(nodeId));

  if (orderedNodeIds.length < 2) {
    return { ok: false, reason: "Group failed" };
  }

  return {
    ok: true,
    groupNodeId: createStudioId("node"),
    groupStyleId: createStudioId("style"),
    parentId,
    orderedNodeIds,
    bounds: getStudioCombinedBounds(document, orderedNodeIds),
    insertIndex: Math.min(
      ...orderedNodeIds.map((nodeId) => siblings.indexOf(nodeId)),
    ),
  };
};

/**
 * 계획대로 그룹 노드를 만들고 자식을 옮긴다.
 *
 * 자식의 좌표는 그룹 기준으로 다시 계산한다. 화면에서 보이는 위치가 그대로
 * 유지돼야 하기 때문이다.
 */
export const applyStudioGroupNodes = (
  draft: StudioTemplateDocument,
  plan: StudioGroupNodesPlan,
): void => {
  const { groupNodeId, groupStyleId, parentId, orderedNodeIds, bounds } = plan;
  const siblings = parentId
    ? draft.graph.nodes[parentId]?.childIds
    : draft.graph.rootNodeIds;
  if (!siblings) return;

  draft.styles[groupStyleId] = {
    position: "absolute",
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  };
  draft.graph.nodes[groupNodeId] = {
    id: groupNodeId,
    type: "group",
    label: "Group",
    parentId,
    childIds: orderedNodeIds,
    styleId: groupStyleId,
  };

  orderedNodeIds.forEach((nodeId) => {
    const node = draft.graph.nodes[nodeId];
    if (!node) return;

    node.parentId = groupNodeId;
    if (!node.styleId) return;

    const style = draft.styles[node.styleId] ?? {};
    const left = typeof style.left === "number" ? style.left : 0;
    const top = typeof style.top === "number" ? style.top : 0;
    draft.styles[node.styleId] = {
      ...style,
      left: left - bounds.left,
      top: top - bounds.top,
    };
  });

  const groupedNodeIds = new Set(orderedNodeIds);
  const nextChildren = siblings.filter((nodeId) => !groupedNodeIds.has(nodeId));
  nextChildren.splice(plan.insertIndex, 0, groupNodeId);
  siblings.splice(0, siblings.length, ...nextChildren);
};

// --- 그룹 풀기 ---

export interface StudioUngroupNodesPlan {
  groupNodeIds: string[];
}

export const planStudioUngroupNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioUngroupNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  const groupNodeIds = nodeIds.filter(
    (nodeId) => document.graph.nodes[nodeId]?.type === "group",
  );

  if (groupNodeIds.length === 0) {
    return { ok: false, reason: "No group selected" };
  }

  const timetableMountNodeId = document.domains?.timetable?.mountNodeId;
  if (timetableMountNodeId && groupNodeIds.includes(timetableMountNodeId)) {
    return { ok: false, reason: "Root timetable object is locked" };
  }

  if (
    groupNodeIds.some((nodeId) => document.graph.nodes[nodeId]?.meta?.entrySlot)
  ) {
    return { ok: false, reason: "Entry Groups cannot be ungrouped" };
  }

  const groupNodes = groupNodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  if (groupNodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked group" };
  }

  return { ok: true, groupNodeIds };
};

/**
 * 그룹을 지우고 자식을 그룹이 있던 자리에 펼친다.
 *
 * 자식 좌표에 그룹 좌표를 더해서 화면 위치를 유지한다. 풀려난 노드 id를 준다.
 */
export const applyStudioUngroupNodes = (
  draft: StudioTemplateDocument,
  groupNodeIds: string[],
): string[] => {
  const releasedNodeIds: string[] = [];

  groupNodeIds.forEach((groupNodeId) => {
    const groupNode = draft.graph.nodes[groupNodeId];
    if (!groupNode || groupNode.type !== "group") return;

    const parentId = groupNode.parentId;
    const siblings = parentId
      ? draft.graph.nodes[parentId]?.childIds
      : draft.graph.rootNodeIds;
    if (!siblings) return;

    const groupIndex = siblings.indexOf(groupNodeId);
    const groupStyle = groupNode.styleId
      ? draft.styles[groupNode.styleId]
      : undefined;
    const groupLeft =
      typeof groupStyle?.left === "number" ? groupStyle.left : 0;
    const groupTop = typeof groupStyle?.top === "number" ? groupStyle.top : 0;
    const childIds = [...groupNode.childIds];

    childIds.forEach((childId) => {
      const childNode = draft.graph.nodes[childId];
      if (!childNode) return;

      childNode.parentId = parentId;
      if (!childNode.styleId) return;

      const childStyle = draft.styles[childNode.styleId] ?? {};
      const left = typeof childStyle.left === "number" ? childStyle.left : 0;
      const top = typeof childStyle.top === "number" ? childStyle.top : 0;
      draft.styles[childNode.styleId] = {
        ...childStyle,
        left: left + groupLeft,
        top: top + groupTop,
      };
    });

    if (groupIndex >= 0) siblings.splice(groupIndex, 1, ...childIds);
    if (groupNode.styleId) delete draft.styles[groupNode.styleId];
    delete draft.graph.nodes[groupNodeId];
    releasedNodeIds.push(...childIds);
  });

  return releasedNodeIds;
};

// --- 복제 ---

export interface StudioDuplicateNodesPlan {
  payload: StudioNodeCopyPayload;
  /** 복제본을 넣을 부모. 원본과 같은 부모다. */
  parentId: string | null;
  /** 형제 목록에서 복제본이 들어갈 자리를 계산할 기준 노드 */
  sourceNodeIds: string[];
}

export const planStudioDuplicateNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioDuplicateNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);

  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const payload = createStudioNodeClipboardPayload(document, nodeIds);
  if (!payload) return { ok: false, reason: "Duplicate failed" };

  const sourceRoot = payload.nodes[payload.rootNodeIds[0]];
  if (!sourceRoot) return { ok: false, reason: "Duplicate failed" };

  return {
    ok: true,
    payload,
    parentId: sourceRoot.parentId ?? null,
    sourceNodeIds: nodeIds,
  };
};

/** 복제본을 원본 바로 뒤에 넣는다. 만들어진 최상위 노드 id를 준다. */
export const applyStudioDuplicateNodes = (
  draft: StudioTemplateDocument,
  plan: StudioDuplicateNodesPlan,
): string[] => {
  const parentNode = plan.parentId ? draft.graph.nodes[plan.parentId] : null;
  const parentId = parentNode?.id ?? null;
  const siblings = parentNode ? parentNode.childIds : draft.graph.rootNodeIds;

  const duplicateRootIds = plan.payload.rootNodeIds
    .map((rootNodeId) =>
      insertStudioClipboardSubtree(
        draft,
        plan.payload,
        rootNodeId,
        parentId,
        true,
      ),
    )
    .filter(Boolean) as string[];

  if (duplicateRootIds.length === 0) return [];

  const sourceIndexes = plan.sourceNodeIds
    .map((nodeId) => siblings.indexOf(nodeId))
    .filter((index) => index >= 0);
  const insertIndex =
    sourceIndexes.length > 0 ? Math.max(...sourceIndexes) + 1 : siblings.length;

  siblings.splice(insertIndex, 0, ...duplicateRootIds);
  return duplicateRootIds;
};

// --- 레이어 순서 이동 ---

export type StudioLayerMoveCommand = "forward" | "backward" | "front" | "back";

export interface StudioLayerMovePlan {
  nodeId: string;
  targetIndex: number;
}

/**
 * 형제 목록 안에서 옮길 자리를 계산한다.
 *
 * 인덱스는 저장 순서(뒤에서 앞) 기준이라 `front`가 배열의 끝이다.
 */
export const planStudioLayerMove = (
  document: StudioTemplateDocument,
  nodeId: string | null,
  command: StudioLayerMoveCommand,
): StudioCommandPlan<StudioLayerMovePlan> => {
  const node = nodeId ? document.graph.nodes[nodeId] : null;
  if (!node) return { ok: false, reason: "No object selected" };
  if (isStudioNodeLocked(node))
    return { ok: false, reason: "Object is locked" };

  const siblings = getStudioNodeSiblingIds(document, node.id);
  const currentIndex = siblings.indexOf(node.id);
  if (currentIndex < 0) return { ok: false, reason: "Layer move failed" };

  const targetIndex =
    command === "front"
      ? siblings.length - 1
      : command === "back"
        ? 0
        : command === "forward"
          ? Math.min(currentIndex + 1, siblings.length - 1)
          : Math.max(currentIndex - 1, 0);

  if (targetIndex === currentIndex) {
    return {
      ok: false,
      reason:
        command === "front" || command === "forward"
          ? "Already at front"
          : "Already at back",
    };
  }

  return { ok: true, nodeId: node.id, targetIndex };
};

export const applyStudioLayerMove = (
  draft: StudioTemplateDocument,
  plan: StudioLayerMovePlan,
): void => {
  const siblings = getStudioNodeSiblingIds(draft, plan.nodeId);
  const currentIndex = siblings.indexOf(plan.nodeId);
  if (currentIndex < 0) return;

  const [nodeId] = siblings.splice(currentIndex, 1);
  siblings.splice(plan.targetIndex, 0, nodeId);
};

export const getStudioLayerMoveMessage = (
  command: StudioLayerMoveCommand,
): string => {
  if (command === "front") return "Brought to front";
  if (command === "back") return "Sent to back";
  if (command === "forward") return "Brought forward";
  return "Sent backward";
};

// --- 잠금 토글 ---

export interface StudioToggleLockPlan {
  nodeIds: string[];
  nextLocked: boolean;
}

export const planStudioToggleNodeLock = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioToggleLockPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);

  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  return { ok: true, nodeIds, nextLocked: nodes.some((node) => !node.locked) };
};

export const applyStudioToggleNodeLock = (
  draft: StudioTemplateDocument,
  plan: StudioToggleLockPlan,
): void => {
  plan.nodeIds.forEach((nodeId) => {
    const node = draft.graph.nodes[nodeId];
    if (!node) return;
    node.locked = plan.nextLocked;
  });
};

// --- 숨김 토글 ---

export interface StudioToggleHiddenPlan {
  nodeIds: string[];
  nextHidden: boolean;
}

/**
 * 감출지 되살릴지 정한다.
 *
 * 하나라도 보이는 것이 있으면 전부 감춘다. 잠금과 같은 규칙이다. 섞여 있을 때 각각
 * 뒤집으면 여러 개를 고른 상태에서 무엇이 감춰질지 예측할 수 없다.
 *
 * 잠긴 노드도 감출 수 있다. 감추기는 문서 구조를 바꾸지 않고 보이는 것만 바꾸므로,
 * 잠근 배경을 잠시 치우고 그 뒤를 보는 것이 흔한 작업이다.
 */
export const planStudioToggleNodeHidden = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioToggleHiddenPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);

  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  return { ok: true, nodeIds, nextHidden: nodes.some((node) => !node.hidden) };
};

export const applyStudioToggleNodeHidden = (
  draft: StudioTemplateDocument,
  plan: StudioToggleHiddenPlan,
): void => {
  plan.nodeIds.forEach((nodeId) => {
    const node = draft.graph.nodes[nodeId];
    if (!node) return;
    node.hidden = plan.nextHidden;
  });
};

/** 잠금·숨김 토글 결과 안내 문구. */
export const getStudioNodeVisibilityMessage = (nextHidden: boolean): string =>
  nextHidden ? "Hidden" : "Shown";
