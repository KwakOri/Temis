import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { getStudioTimetableComponentFrame } from "@/utils/template-studio/entry-groups";
import type { StudioCommandPlan } from "@/utils/template-studio/graph-commands";
import {
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioDefaultNodeStyle } from "@/utils/template-studio/node-commands";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";

export type StudioTextAlignment = "left" | "center" | "right";

/**
 * style에서 텍스트 정렬을 읽는다.
 *
 * 예전 문서는 정렬을 `justifyContent`로만 갖고 있어서 그 값도 함께 본다.
 */
export const getStudioTextAlignment = (
  styleRecord: StudioStyleRecord,
): StudioTextAlignment => {
  const value = styleRecord.textAlign;
  if (value === "center" || value === "right") return value;
  if (value === "left") return value;

  const justifyContent =
    typeof styleRecord.justifyContent === "string"
      ? styleRecord.justifyContent
      : "flex-start";

  if (justifyContent === "center") return "center";
  if (justifyContent === "flex-end" || justifyContent === "end") return "right";
  return "left";
};

/** 좌표를 다루는 style 키. fillParent 노드에서는 바꿀 수 없다. */
export const STUDIO_GEOMETRY_STYLE_KEYS = [
  "left",
  "top",
  "width",
  "height",
] as const;

/**
 * 노드에 style 레코드를 붙이고 그 id를 준다.
 *
 * style 없이 만들어진 노드도 편집할 수 있어야 하므로 없으면 기본 style을
 * 만들어 연결한다.
 */
export const ensureStudioNodeStyleId = (
  draft: StudioTemplateDocument,
  node: StudioGraphNode,
): string => {
  if (node.styleId) return node.styleId;

  const styleId = createStudioId("style");
  node.styleId = styleId;
  draft.styles[styleId] = getStudioDefaultNodeStyle(node.type);
  return styleId;
};

const readStyleNumber = (
  style: StudioStyleRecord,
  key: "left" | "top",
): number => (typeof style[key] === "number" ? (style[key] as number) : 0);

// --- 위치 이동 ---

export interface StudioNodeOffsetOptions {
  /**
   * `fillParent` 노드를 건너뛴다.
   *
   * 캔버스 드래그는 여러 노드를 한 번에 옮기므로 여기서 걸러내고, 키보드
   * 이동은 미리 판단해서 안내 문구를 보여준다.
   */
  skipFillParent?: boolean;
  /** 소수점 둘째 자리로 맞춘다. 포인터 이동은 소수가 생긴다. */
  round?: boolean;
}

/** 노드들의 좌표를 같은 만큼 옮긴다. 잠긴 노드는 건드리지 않는다. */
export const applyStudioNodeOffset = (
  draft: StudioTemplateDocument,
  nodeIds: string[],
  delta: { deltaX: number; deltaY: number },
  { skipFillParent = false, round = false }: StudioNodeOffsetOptions = {},
): void => {
  nodeIds.forEach((nodeId) => {
    const node = draft.graph.nodes[nodeId];
    if (!node || isStudioNodeLocked(node)) return;
    if (skipFillParent && isStudioFillParentLayout(node.layoutMode)) return;

    const styleId = ensureStudioNodeStyleId(draft, node);
    const style = draft.styles[styleId] ?? {};
    const left = readStyleNumber(style, "left") + delta.deltaX;
    const top = readStyleNumber(style, "top") + delta.deltaY;

    draft.styles[styleId] = {
      ...style,
      left: round ? Number(left.toFixed(2)) : left,
      top: round ? Number(top.toFixed(2)) : top,
    };
  });
};

/**
 * 캔버스에서 끌기 시작한 노드로 옮길 대상을 정한다.
 *
 * 이미 선택된 노드를 끌면 선택 전체가 함께 움직이고, 선택 밖의 노드를 끌면 그
 * 노드만 움직인다.
 */
export const resolveStudioDragTargetNodeIds = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
  draggedNodeId: string,
): string[] =>
  selectedNodeIds.includes(draggedNodeId)
    ? getStudioTopLevelNodeIds(document, selectedNodeIds)
    : [draggedNodeId];

export interface StudioNudgeNodesPlan {
  nodeIds: string[];
}

/** 키보드로 옮길 수 있는 상태인지 판단한다. */
export const planStudioNudgeNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioNudgeNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);
  if (nodeIds.length === 0) return { ok: false, reason: "" };

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  if (nodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked object" };
  }

  if (nodes.some((node) => isStudioFillParentLayout(node.layoutMode))) {
    return { ok: false, reason: "Disable Fit to move this object" };
  }

  return { ok: true, nodeIds };
};

// --- style 값 변경 ---

/**
 * 노드 style의 한 값을 바꾼다.
 *
 * `fillParent` 노드의 좌표는 부모가 정하므로 바꾸지 않는다. 카드 variant의
 * 루트 노드라면 Component Set의 frame도 함께 맞춰서 상태별 카드 크기가
 * 어긋나지 않게 한다.
 */
export const applyStudioNodeStyleValue = (
  draft: StudioTemplateDocument,
  node: StudioGraphNode,
  key: string,
  value: string | number | undefined,
): void => {
  const isGeometryKey = (
    STUDIO_GEOMETRY_STYLE_KEYS as readonly string[]
  ).includes(key);

  if (isStudioFillParentLayout(node.layoutMode) && isGeometryKey) return;

  const component = Object.values(
    draft.domains?.timetable?.components ?? {},
  ).find((candidate) =>
    Object.values(candidate.variants).some(
      (variant) => variant.rootNodeId === node.id,
    ),
  );

  if (component && isGeometryKey && typeof value === "number") {
    component.frame = {
      ...getStudioTimetableComponentFrame(draft, component),
      [key]: value,
    };
  }

  const styleId = ensureStudioNodeStyleId(draft, node);
  draft.styles[styleId] = {
    ...draft.styles[styleId],
    [key]: value,
  };
};

/** 텍스트 정렬에 맞는 flex 정렬 값. */
export const getStudioTextJustifyContent = (
  textAlign: StudioTextAlignment,
): string =>
  textAlign === "left"
    ? "flex-start"
    : textAlign === "right"
      ? "flex-end"
      : "center";

/** 텍스트 정렬은 문단 정렬과 flex 정렬을 함께 맞춘다. */
export const applyStudioNodeTextAlignment = (
  draft: StudioTemplateDocument,
  node: StudioGraphNode,
  textAlign: StudioTextAlignment,
): void => {
  const styleId = ensureStudioNodeStyleId(draft, node);
  draft.styles[styleId] = {
    ...draft.styles[styleId],
    textAlign,
    justifyContent: getStudioTextJustifyContent(textAlign),
  };
};

/**
 * 부모 채우기를 켜고 끈다.
 *
 * 켜면 좌표를 0으로 맞추고 크기는 부모가 정한다. 끄면 화면에서 보이던 크기를
 * 그대로 고정 값으로 받아서 크기가 튀지 않게 한다.
 */
export const applyStudioNodeFitParent = (
  draft: StudioTemplateDocument,
  node: StudioGraphNode,
  shouldFillParent: boolean,
  resolvedSize: { width: number; height: number },
): void => {
  const styleId = ensureStudioNodeStyleId(draft, node);
  const style = draft.styles[styleId] ?? {};

  node.layoutMode = shouldFillParent ? "fillParent" : "fixed";
  draft.styles[styleId] = {
    ...style,
    left: 0,
    top: 0,
    ...(shouldFillParent
      ? {}
      : { width: resolvedSize.width, height: resolvedSize.height }),
  };
};

// --- 상태 사이 style 전파 ---

export interface StudioVariantStyleOutcome {
  appliedNodeCount: number;
  appliedStatusCount: number;
  skippedStatusCount: number;
}

/** style 전파 결과 안내 문구. */
export const getStudioVariantStyleMessage = ({
  appliedNodeCount,
  appliedStatusCount,
  skippedStatusCount,
}: StudioVariantStyleOutcome): string => {
  if (appliedNodeCount === 0) return "No matching status objects were found";

  const skippedSuffix =
    skippedStatusCount > 0 ? ` · ${skippedStatusCount} skipped` : "";
  return `Applied ${appliedNodeCount} style update(s) to ${appliedStatusCount} status(es)${skippedSuffix}`;
};
