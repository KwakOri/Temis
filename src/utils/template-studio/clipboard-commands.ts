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
  isStudioNodeDescendantOf,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import {
  createStudioNodeClipboardPayload,
  insertStudioClipboardSubtree,
  STUDIO_CLIPBOARD_PASTE_OFFSET,
  type StudioClipboardOffset,
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

/**
 * 이 부모 안의 0,0이 페이지에서 어디인지.
 *
 * 카드 variant 루트가 페이지다. 그 위로는 거슬러 올라가지 않으므로 variant
 * 루트끼리 캔버스 위치가 달라도 카드 안 같은 자리를 가리킨다. 카드 밖이면
 * 캔버스가 페이지다.
 */
const getStudioPageOrigin = (
  document: StudioTemplateDocument,
  parentId: string | null,
  pageRootIds: Set<string>,
): StudioClipboardOffset => {
  const origin = { left: 0, top: 0 };
  const visited = new Set<string>();
  let currentId = parentId;

  while (currentId && !pageRootIds.has(currentId) && !visited.has(currentId)) {
    visited.add(currentId);
    const node = document.graph.nodes[currentId];
    const style = node?.styleId ? document.styles[node.styleId] : undefined;
    origin.left += typeof style?.left === "number" ? style.left : 0;
    origin.top += typeof style?.top === "number" ? style.top : 0;
    currentId = node?.parentId ?? null;
  }

  return origin;
};

// --- 붙여넣을 자리 ---

export interface StudioPasteTarget {
  anchorNodeId: string;
  /** `inside`면 기준 노드 안 맨 위, `after`면 기준 노드 바로 뒤 형제 자리다. */
  position: "inside" | "after";
}

/**
 * 붙여넣을 자리를 정한다.
 *
 * 후보 가운데 지금 보고 있는 범위(`scopeRootNodeId`) 안에 있는 첫 노드 뒤에
 * 넣는다. 카드 variant 루트는 카드 한 장이라서 그 뒤가 아니라 그 안 맨 위에
 * 넣는다. variant 루트는 문서 루트에 있어서 그 뒤에 넣으면 어느 카드에도 보이지
 * 않는다.
 *
 * 범위 안에 후보가 없으면 범위 루트 안 맨 위에 넣는다. 다른 variant에서
 * 복사했거나 다른 variant의 노드를 고른 채여도 지금 보고 있는 카드에 붙게 하려는
 * 것이다. 범위도 없으면 `null`을 준다.
 */
export const resolveStudioPasteTarget = (
  document: StudioTemplateDocument,
  candidateNodeIds: (string | null)[],
  scopeRootNodeId: string | null,
): StudioPasteTarget | null => {
  const scopeRootId =
    scopeRootNodeId && document.graph.nodes[scopeRootNodeId]
      ? scopeRootNodeId
      : null;
  const isInScope = (nodeId: string) =>
    !scopeRootId ||
    nodeId === scopeRootId ||
    isStudioNodeDescendantOf(document, nodeId, scopeRootId);
  const anchorNodeId = candidateNodeIds.find(
    (nodeId): nodeId is string =>
      nodeId !== null &&
      Boolean(document.graph.nodes[nodeId]) &&
      isInScope(nodeId),
  );

  if (!anchorNodeId) {
    return scopeRootId
      ? { anchorNodeId: scopeRootId, position: "inside" }
      : null;
  }

  const isPage =
    anchorNodeId === scopeRootId ||
    getStudioCardVariantRootIds(document).has(anchorNodeId);
  return { anchorNodeId, position: isPage ? "inside" : "after" };
};

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

  const pageRootIds = getStudioCardVariantRootIds(document);
  payload.rootOrigins = Object.fromEntries(
    payload.rootNodeIds.map((nodeId) => [
      nodeId,
      getStudioPageOrigin(
        document,
        document.graph.nodes[nodeId]?.parentId ?? null,
        pageRootIds,
      ),
    ]),
  );

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
  position: StudioPasteTarget["position"];
}

export type StudioPasteCutOutcome =
  | ({ ok: true } & StudioPasteCutPlan)
  | { ok: false; reason: string; clearClipboard?: boolean };

/**
 * 잘라낸 노드를 고른 위치로 옮길 수 있는지 판단한다.
 *
 * 자리는 `resolveStudioPasteTarget`이 정한다. 원본이 사라졌으면 클립보드를
 * 비우라고 알린다. 시간표 root 객체는 부모를 바꿀 수 없다.
 */
export const planStudioPasteCut = (
  document: StudioTemplateDocument,
  payload: StudioNodeCutPayload,
  targetNodeId: string | null,
  scopeRootNodeId: string | null = null,
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

  const target = resolveStudioPasteTarget(
    document,
    [targetNodeId],
    scopeRootNodeId,
  );
  if (!target) {
    return {
      ok: false,
      reason: "Select a destination before pasting cut objects",
    };
  }

  const validation = validateStudioGraphMove(document, {
    sourceNodeIds,
    targetNodeId: target.anchorNodeId,
    position: target.position,
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

  return {
    ok: true,
    sourceNodeIds,
    targetNodeId: target.anchorNodeId,
    position: target.position,
  };
};

/** 계획대로 노드를 옮긴다. 화면 위치는 유지한다. */
export const applyStudioPasteCut = (
  draft: StudioTemplateDocument,
  plan: StudioPasteCutPlan,
) =>
  moveStudioGraphNodes(draft, {
    sourceNodeIds: plan.sourceNodeIds,
    targetNodeId: plan.targetNodeId,
    position: plan.position,
    preserveCanvasPosition: true,
  });

// --- 복사한 노드 붙여넣기 ---

export interface StudioPasteCopyOptions {
  /** 지금 보고 있는 범위의 루트. 카드 편집에서는 보고 있는 variant 루트다. */
  scopeRootNodeId?: string | null;
  /** 원본과 같은 자리에 놓는다. 끄면 원본에서 조금 밀어낸다. */
  inPlace?: boolean;
}

/**
 * 복사한 부분 그래프를 새 id로 넣는다.
 *
 * 자리는 `resolveStudioPasteTarget`이 정한다. 고른 노드가 없으면 원본 뒤가
 * 후보다. 둘 다 쓸 수 없으면 원본 부모 맨 위에 넣는다. 부모가 잠겨 있으면 문서
 * 루트로 올린다.
 *
 * 위치는 페이지 기준으로 원본과 같은 자리다. 다른 카드 variant에 붙여도 카드 안
 * 같은 자리에 놓인다. 만들어진 최상위 노드 id를 준다.
 */
export const applyStudioPasteCopy = (
  draft: StudioTemplateDocument,
  payload: StudioNodeCopyPayload,
  selectedNode: StudioGraphNode | null,
  { scopeRootNodeId = null, inPlace = false }: StudioPasteCopyOptions = {},
): string[] => {
  const sourceRoot = payload.nodes[payload.rootNodeIds[0]];
  if (!sourceRoot) return [];

  const target = resolveStudioPasteTarget(
    draft,
    [selectedNode?.id ?? null, sourceRoot.id],
    scopeRootNodeId,
  );
  const targetParentId = !target
    ? sourceRoot.parentId
    : target.position === "inside"
      ? target.anchorNodeId
      : (draft.graph.nodes[target.anchorNodeId]?.parentId ?? null);
  const parentNode =
    targetParentId && !isStudioNodeLocked(draft.graph.nodes[targetParentId])
      ? draft.graph.nodes[targetParentId]
      : null;
  const parentId = parentNode?.id ?? null;
  const siblings = parentNode ? parentNode.childIds : draft.graph.rootNodeIds;

  const targetOrigin = getStudioPageOrigin(
    draft,
    parentId,
    getStudioCardVariantRootIds(draft),
  );
  const pasteOffset = inPlace ? 0 : STUDIO_CLIPBOARD_PASTE_OFFSET;

  const pastedRootIds = payload.rootNodeIds
    .map((rootNodeId) => {
      const sourceOrigin = payload.rootOrigins?.[rootNodeId] ?? targetOrigin;
      return insertStudioClipboardSubtree(
        draft,
        payload,
        rootNodeId,
        parentId,
        true,
        {
          left: sourceOrigin.left - targetOrigin.left + pasteOffset,
          top: sourceOrigin.top - targetOrigin.top + pasteOffset,
        },
      );
    })
    .filter(Boolean) as string[];

  if (pastedRootIds.length === 0) return [];

  const anchorIndex =
    target?.position === "after" ? siblings.indexOf(target.anchorNodeId) : -1;
  const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : siblings.length;

  siblings.splice(insertIndex, 0, ...pastedRootIds);
  return pastedRootIds;
};

/** 복사한 노드를 붙여넣을 대상이 사라졌는지. */
export const isStudioPasteCopyReady = (
  payload: StudioNodeCopyPayload,
): boolean => Boolean(payload.nodes[payload.rootNodeIds[0]]);
