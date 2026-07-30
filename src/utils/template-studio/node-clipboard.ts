import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import { createStudioId } from "@/utils/template-studio/id";

/** 복사한 부분 그래프. 원본 문서가 바뀌어도 붙여넣을 수 있도록 값을 복제해서 담는다. */
export interface StudioNodeCopyPayload {
  kind: "copy";
  rootNodeIds: string[];
  nodes: Record<string, StudioGraphNode>;
  styles: Record<string, StudioStyleRecord>;
}

/** 잘라낸 노드. 원본을 옮기는 것이므로 id만 기억한다. */
export interface StudioNodeCutPayload {
  kind: "cut";
  rootNodeIds: string[];
  primaryNodeId: string | null;
}

export type StudioNodeClipboardPayload =
  StudioNodeCopyPayload | StudioNodeCutPayload;

/**
 * 값 복제.
 *
 * `undefined`는 그대로 돌려준다. `JSON.stringify(undefined)`가 문자열이 아니라
 * `undefined`를 주기 때문에 그대로 넘기면 파싱에서 예외가 난다.
 */
const cloneJson = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);

/** 복제한 노드의 이름. 이미 Copy로 끝나면 덧붙이지 않는다. */
export const getStudioCopiedNodeLabel = (label: string): string =>
  label.endsWith(" Copy") ? label : `${label} Copy`;

/** 붙여넣을 때 원본에서 밀어낼 거리. */
export const STUDIO_CLIPBOARD_PASTE_OFFSET = 24;

/**
 * 선택한 노드와 그 자손을 복사 payload로 만든다.
 *
 * 조상이 함께 선택된 노드는 걷어내므로 같은 노드가 두 번 담기지 않는다.
 */
export const createStudioNodeClipboardPayload = (
  document: StudioTemplateDocument,
  rootNodeIds: string | string[],
): StudioNodeCopyPayload | null => {
  const requestedRootNodeIds = Array.isArray(rootNodeIds)
    ? rootNodeIds
    : [rootNodeIds];
  const topLevelRootNodeIds = getStudioTopLevelNodeIds(
    document,
    requestedRootNodeIds,
  );

  if (topLevelRootNodeIds.length === 0) return null;

  const payload: StudioNodeCopyPayload = {
    kind: "copy",
    rootNodeIds: topLevelRootNodeIds,
    nodes: {},
    styles: {},
  };

  const collectNode = (nodeId: string) => {
    const node = document.graph.nodes[nodeId];
    if (!node || payload.nodes[nodeId]) return;

    payload.nodes[nodeId] = cloneJson(node);
    if (node.styleId && document.styles[node.styleId]) {
      payload.styles[node.styleId] = cloneJson(document.styles[node.styleId]);
    }

    node.childIds.forEach(collectNode);
  };

  topLevelRootNodeIds.forEach(collectNode);
  return payload;
};

/**
 * payload의 부분 그래프를 문서에 새 id로 넣는다.
 *
 * 최상위 노드만 위치를 밀고 이름에 Copy를 붙인다. entry slot 표시는 복제본에
 * 남기지 않는다. 복제본이 시간표 entry 자리를 다시 차지하면 안 되기 때문이다.
 *
 * 형제 목록에 넣는 일은 하지 않는다. 넣을 위치는 호출한 쪽이 정한다.
 */
export const insertStudioClipboardSubtree = (
  draft: StudioTemplateDocument,
  payload: StudioNodeCopyPayload,
  sourceNodeId: string,
  parentId: string | null,
  offsetRoot: boolean,
): string | null => {
  const sourceNode = payload.nodes[sourceNodeId];
  if (!sourceNode) return null;

  const nextNodeId = createStudioId("node");
  let nextStyleId: string | undefined;

  if (sourceNode.styleId) {
    nextStyleId = createStudioId("style");
    const sourceStyle = payload.styles[sourceNode.styleId] ?? {};
    draft.styles[nextStyleId] = cloneJson(sourceStyle);

    if (offsetRoot) {
      const nextStyle = draft.styles[nextStyleId];
      const left = typeof nextStyle.left === "number" ? nextStyle.left : 0;
      const top = typeof nextStyle.top === "number" ? nextStyle.top : 0;

      draft.styles[nextStyleId] = {
        ...nextStyle,
        left: left + STUDIO_CLIPBOARD_PASTE_OFFSET,
        top: top + STUDIO_CLIPBOARD_PASTE_OFFSET,
      };
    }
  }

  const nextNode: StudioGraphNode = {
    ...cloneJson(sourceNode),
    id: nextNodeId,
    label: offsetRoot
      ? getStudioCopiedNodeLabel(sourceNode.label)
      : sourceNode.label,
    parentId,
    childIds: [],
    styleId: nextStyleId,
    meta: sourceNode.meta?.entrySlot
      ? { ...cloneJson(sourceNode.meta), entrySlot: undefined }
      : cloneJson(sourceNode.meta),
  };

  draft.graph.nodes[nextNodeId] = nextNode;
  nextNode.childIds = sourceNode.childIds
    .map((childId) =>
      insertStudioClipboardSubtree(draft, payload, childId, nextNodeId, false),
    )
    .filter(Boolean) as string[];

  return nextNodeId;
};
