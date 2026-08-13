import type {
  StudioGraphNode,
  StudioGraphNodeType,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioParentCanvasOffset } from "@/utils/template-studio/graph-editor";
import { isStudioNodeLocked } from "@/utils/template-studio/graph-nodes";
import { getStudioNodeDefinition } from "@/utils/template-studio/node-definitions";
import type { StudioCanvasPoint } from "@/utils/template-studio/canvas-viewport-geometry";

export interface StudioNodeInsertionPlan {
  /** 새 노드를 넣을 부모. `null`이면 문서 루트다. */
  parentId: string | null;
  /** 부모 좌표계 기준 위치 */
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * 새 노드를 넣을 부모를 정한다.
 *
 * 묶음을 골라둔 상태면 그 안에 넣는다. 잠근 묶음 안에는 넣지 않는다. 넣더라도
 * 곧바로 옮기거나 지울 수 없어서 사용자는 잘못 들어간 객체를 꺼낼 수 없다.
 * 묶음이 아닌 것을 골랐으면 그것과 같은 부모에 넣는다. 방금 고른 것 옆에 생기는
 * 것이 자연스럽고, 묶음 안에서 작업하다 추가할 때 밖으로 튀어나가지 않는다.
 */
export const resolveStudioThumbnailInsertionParentId = (
  document: StudioTemplateDocument,
  selectedNode: StudioGraphNode | null | undefined,
): string | null => {
  if (!selectedNode) return null;

  const definition = getStudioNodeDefinition(selectedNode.type);
  if (definition?.allowsChildren && !isStudioNodeLocked(selectedNode)) {
    return selectedNode.id;
  }

  const parentNode = selectedNode.parentId
    ? document.graph.nodes[selectedNode.parentId]
    : null;
  if (!parentNode || isStudioNodeLocked(parentNode)) return null;

  return parentNode.id;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * 새 노드를 어디에 얼마 크기로 넣을지 정한다.
 *
 * 세 가지를 지킨다. 지금 보고 있는 화면 중앙에 놓고, 묶음을 골랐으면 그 묶음의
 * 자식으로 넣고, 캔버스를 벗어나지 않게 한다. 캔버스 밖에 놓이면 사용자는 추가가
 * 안 된 것으로 읽는다.
 *
 * 좌표는 부모 좌표계로 돌려준다. 캔버스 기준으로 계산한 값을 그대로 저장하면 묶음
 * 안에 넣은 객체가 묶음 위치만큼 밀려난다.
 */
export const planStudioNodeInsertion = ({
  document,
  type,
  selectedNode,
  viewportCenter,
}: {
  document: StudioTemplateDocument;
  type: StudioGraphNodeType;
  selectedNode: StudioGraphNode | null | undefined;
  /** 지금 보고 있는 캔버스 좌표의 중앙. 모르면 캔버스 가운데로 본다. */
  viewportCenter?: StudioCanvasPoint | null;
}): StudioNodeInsertionPlan => {
  const { width, height } = getStudioNodeDefinition(type).defaultSize;
  const parentId = resolveStudioThumbnailInsertionParentId(
    document,
    selectedNode,
  );
  const center = viewportCenter ?? {
    x: document.canvas.width / 2,
    y: document.canvas.height / 2,
  };

  // 캔버스 좌표에서 먼저 가둔다. 노드가 캔버스보다 크면 가둘 자리가 없으므로 왼쪽
  // 위에 붙인다.
  const canvasLeft = clamp(
    center.x - width / 2,
    0,
    Math.max(0, document.canvas.width - width),
  );
  const canvasTop = clamp(
    center.y - height / 2,
    0,
    Math.max(0, document.canvas.height - height),
  );
  const parentOffset = getStudioParentCanvasOffset(document, parentId);

  return {
    parentId,
    left: Math.round(canvasLeft - parentOffset.left),
    top: Math.round(canvasTop - parentOffset.top),
    width,
    height,
  };
};

/**
 * 계획대로 새 노드 하나를 만든다.
 *
 * 기본 style과 기본 binding은 노드 정의표가 정한다. 화면에서 따로 적으면 추가 메뉴와
 * 인스펙터가 서로 다른 기본값을 쓴다.
 */
export const createStudioThumbnailNode = ({
  nodeId,
  styleId,
  type,
  label,
  plan,
}: {
  nodeId: string;
  styleId: string;
  type: StudioGraphNodeType;
  label: string;
  plan: StudioNodeInsertionPlan;
}): { node: StudioGraphNode; style: Record<string, string | number> } => {
  const definition = getStudioNodeDefinition(type);

  return {
    node: {
      id: nodeId,
      type,
      label,
      parentId: plan.parentId,
      childIds: [],
      styleId,
      fit: definition.defaultFit,
      binding: definition.createDefaultBinding(),
    },
    style: {
      ...definition.createDefaultStyle(),
      left: plan.left,
      top: plan.top,
      width: plan.width,
      height: plan.height,
    } as Record<string, string | number>,
  };
};
