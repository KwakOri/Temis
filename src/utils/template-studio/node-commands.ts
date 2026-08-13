import type {
  StudioGraphNode,
  StudioGraphNodeType,
  StudioInputDefinition,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { assertStudioNever } from "@/utils/template-studio/assert-never";
import type { StudioCommandPlan } from "@/utils/template-studio/graph-commands";
import {
  getStudioTopLevelNodeIds,
  isStudioNodeLocked,
} from "@/utils/template-studio/graph-nodes";
import { getStudioGraphNodeTypeLabel } from "@/utils/template-studio/graph-node-label";
import { createStudioId } from "@/utils/template-studio/id";
import { getStudioNodeDefinition } from "@/utils/template-studio/node-definitions";
import type {
  StudioCardContextObjectPreset,
  StudioCardStatusBackgroundPreset,
} from "@/utils/template-studio/preset-registry";
import { createStudioStatusCardBackgroundExceptionMeta } from "@/utils/template-studio/status-card-background";

/**
 * 카드 문서에 넣는 새 노드의 기본 style.
 *
 * 카드 한 장은 캔버스보다 훨씬 작으므로 썸네일 기본 크기를 그대로 쓸 수 없다.
 * 그래서 정의표의 기본 크기와 따로 둔다. 정의표에만 있는 종류는 그쪽 값을 쓴다.
 *
 * 종류마다 갈래를 명시한다. 모르는 종류를 글자 style로 받아 주면 새로 넣은 도형이
 * 글자 크기와 굵기를 갖고 태어나 인스펙터가 엉뚱한 칸을 보여준다.
 */
export const getStudioDefaultNodeStyle = (
  type: StudioGraphNodeType,
): StudioStyleRecord => {
  switch (type) {
    case "group":
      return {
        position: "absolute",
        left: 80,
        top: 80,
        width: 320,
        height: 220,
        backgroundColor: "transparent",
        border: "1px solid rgba(148, 163, 184, 0.45)",
        borderRadius: 8,
      };

    case "image":
      return {
        position: "absolute",
        left: 100,
        top: 100,
        width: 180,
        height: 140,
        backgroundColor: "#e2e8f0",
        borderRadius: 8,
        overflow: "hidden",
      };

    case "shape":
      return {
        ...getStudioNodeDefinition("shape").createDefaultStyle(),
        left: 100,
        top: 100,
        width: 180,
        height: 120,
      };

    case "text":
    case "flexibleText":
      return {
        position: "absolute",
        left: 120,
        top: 120,
        width: 240,
        height: 56,
        color: "#111827",
        fontSize: type === "flexibleText" ? 32 : 20,
        fontWeight: type === "flexibleText" ? 800 : 700,
        display: "flex",
        alignItems: "center",
      };

    default:
      return assertStudioNever(type);
  }
};

/**
 * 새 노드를 넣을 부모를 정한다.
 *
 * 그룹을 골라둔 상태면 그 안에 넣고, 아니면 고른 노드의 형제로 넣는다. 고른
 * 게 없으면 카드 루트나 문서의 첫 루트로 올라간다.
 */
export const resolveStudioNodeInsertionParentId = (
  document: StudioTemplateDocument,
  selectedNode: StudioGraphNode | null | undefined,
  cardRootNodeId?: string | null,
): string | null => {
  if (selectedNode?.type === "group") return selectedNode.id;

  return (
    selectedNode?.parentId ??
    cardRootNodeId ??
    document.graph.rootNodeIds[0] ??
    null
  );
};

export interface StudioInsertNodePlan {
  node: StudioGraphNode;
  styleId: string;
  style: StudioStyleRecord;
  /** 형제 목록의 앞(뒤에 그려짐)이나 끝(앞에 그려짐) */
  position: "back" | "front";
}

/** 계획한 노드를 문서에 넣고 형제 목록에 연결한다. */
export const applyStudioInsertNode = (
  draft: StudioTemplateDocument,
  plan: StudioInsertNodePlan,
): void => {
  draft.styles[plan.styleId] = { ...plan.style };
  draft.graph.nodes[plan.node.id] = plan.node;

  const siblings = plan.node.parentId
    ? draft.graph.nodes[plan.node.parentId]?.childIds
    : draft.graph.rootNodeIds;
  if (!siblings) return;

  if (plan.position === "back") {
    siblings.unshift(plan.node.id);
  } else {
    siblings.push(plan.node.id);
  }
};

// --- 새 노드 추가 ---

/**
 * 빈 노드를 만든다.
 *
 * 텍스트는 안내 문구를, 이미지는 문서의 첫 에셋을 기본 값으로 잡는다. 에셋이
 * 없으면 연결하지 않는다.
 */
export const planStudioAddNode = (
  document: StudioTemplateDocument,
  type: StudioGraphNodeType,
  selectedNode: StudioGraphNode | null | undefined,
): StudioInsertNodePlan => {
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  const parentId = resolveStudioNodeInsertionParentId(document, selectedNode);
  const firstAssetId = Object.keys(document.assets)[0];
  const definition = getStudioNodeDefinition(type);

  return {
    node: {
      id: nodeId,
      type,
      label: `New ${getStudioGraphNodeTypeLabel(type)}`,
      parentId,
      childIds: [],
      styleId,
      fit: definition.defaultFit,
      binding:
        definition.createDefaultBinding() ??
        (type === "image" && firstAssetId
          ? { kind: "staticAsset", assetId: firstAssetId }
          : undefined),
    },
    styleId,
    style: getStudioDefaultNodeStyle(type),
    position: "front",
  };
};

// --- select 입력 소비 노드 ---

export interface StudioSelectConsumerInput {
  parentId: string | null;
  input: Extract<StudioInputDefinition, { type: "select" }>;
  kind: "text" | "image";
  label: string;
  /** 옵션별 에셋. 없으면 전부 비운다. */
  assetByOption?: Record<string, string | null>;
}

const getStudioSelectConsumerStyle = (
  kind: "text" | "image",
): StudioStyleRecord =>
  kind === "image"
    ? {
        position: "absolute",
        left: 604,
        top: 292,
        width: 128,
        height: 128,
        borderRadius: 28,
        overflow: "hidden",
        rotateDeg: -8,
      }
    : {
        position: "absolute",
        left: 322,
        top: 178,
        width: 360,
        height: 42,
        fontSize: 18,
        fontWeight: 700,
        color: "#475569",
        display: "flex",
        alignItems: "center",
      };

/**
 * select 입력을 소비하는 노드를 문서에 넣는다.
 *
 * 텍스트는 고른 옵션의 라벨을 보여주고, 이미지는 옵션별 에셋을 보여준다. 만든
 * 노드 id를 준다.
 */
export const createStudioSelectConsumerNode = (
  draft: StudioTemplateDocument,
  { parentId, input, kind, label, assetByOption }: StudioSelectConsumerInput,
): string => {
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  const isImage = kind === "image";

  applyStudioInsertNode(draft, {
    node: {
      id: nodeId,
      type: isImage ? "image" : "text",
      label,
      parentId,
      childIds: [],
      styleId,
      fit: isImage ? "cover" : undefined,
      binding: isImage
        ? {
            kind: "selectAsset",
            inputId: input.id,
            assetByOption:
              assetByOption ??
              Object.fromEntries(
                input.options.map((option) => [option.value, null]),
              ),
          }
        : {
            kind: "selectText",
            inputId: input.id,
            output: "label",
          },
    },
    styleId,
    style: getStudioSelectConsumerStyle(kind),
    position: "front",
  });

  return nodeId;
};

// --- 노드 삭제 ---

export interface StudioDeleteNodesPlan {
  nodeIds: string[];
  /** 삭제 후 고를 노드. 부모가 남아 있으면 부모를 고른다. */
  fallbackSelectionId: string | null;
}

/**
 * 삭제할 수 없는 노드를 걸러낸다.
 *
 * 잠긴 노드, 시간표 root, 카드 variant 루트와 Entry Group은 구조를 지켜야 하고
 * 마지막 루트 노드도 남겨야 한다.
 */
export const planStudioDeleteNodes = (
  document: StudioTemplateDocument,
  selectedNodeIds: string[],
): StudioCommandPlan<StudioDeleteNodesPlan> => {
  const nodeIds = getStudioTopLevelNodeIds(document, selectedNodeIds);

  if (nodeIds.length === 0) {
    return { ok: false, reason: "No object selected" };
  }

  const nodes = nodeIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter(Boolean) as StudioGraphNode[];

  if (nodes.some(isStudioNodeLocked)) {
    return { ok: false, reason: "Selection includes locked object" };
  }

  const timetableMountNodeId = document.domains?.timetable?.mountNodeId;
  if (timetableMountNodeId && nodeIds.includes(timetableMountNodeId)) {
    return { ok: false, reason: "Root timetable object is locked" };
  }

  const protectedNodeIds = new Set<string>();
  Object.values(document.domains?.timetable?.components ?? {}).forEach(
    (component) => {
      Object.values(component.variants).forEach((variant) =>
        protectedNodeIds.add(variant.rootNodeId),
      );
    },
  );
  Object.values(document.graph.nodes).forEach((node) => {
    if (node.meta?.entrySlot) protectedNodeIds.add(node.id);
  });

  if (nodeIds.some((nodeId) => protectedNodeIds.has(nodeId))) {
    return {
      ok: false,
      reason: "Card variant roots and Entry Groups are locked",
    };
  }

  const remainingRootIds = document.graph.rootNodeIds.filter(
    (nodeId) => !nodeIds.includes(nodeId),
  );
  if (remainingRootIds.length === 0) {
    return { ok: false, reason: "Last root object is locked" };
  }

  const parentId = nodes[0]?.parentId ?? null;

  return {
    ok: true,
    nodeIds,
    fallbackSelectionId:
      parentId && document.graph.nodes[parentId] ? parentId : null,
  };
};

/** 노드와 자손, 그리고 그들이 쓰던 style을 지운다. */
export const applyStudioDeleteNodes = (
  draft: StudioTemplateDocument,
  nodeIds: string[],
): void => {
  const nodeIdsToDelete = new Set<string>();
  const styleIdsToDelete = new Set<string>();

  const collectNode = (nodeId: string) => {
    const node = draft.graph.nodes[nodeId];
    if (!node || nodeIdsToDelete.has(nodeId)) return;

    nodeIdsToDelete.add(nodeId);
    if (node.styleId) styleIdsToDelete.add(node.styleId);
    node.childIds.forEach(collectNode);
  };

  nodeIds.forEach(collectNode);

  Object.values(draft.graph.nodes).forEach((node) => {
    node.childIds = node.childIds.filter(
      (childId) => !nodeIdsToDelete.has(childId),
    );
  });

  draft.graph.rootNodeIds = draft.graph.rootNodeIds.filter(
    (nodeId) => !nodeIdsToDelete.has(nodeId),
  );

  nodeIdsToDelete.forEach((nodeId) => {
    delete draft.graph.nodes[nodeId];
  });
  styleIdsToDelete.forEach((styleId) => {
    delete draft.styles[styleId];
  });
};

// --- 카드 프리셋 노드 ---

/**
 * 카드 컨텍스트 객체.
 *
 * 시간표 runtime의 내장 필드에 붙는 텍스트다. 프리셋마다 하나만 둘 수 있고
 * 구조를 바꿀 수 없다는 표시를 meta에 남긴다.
 */
export const planStudioAddCardContextObject = (
  document: StudioTemplateDocument,
  preset: StudioCardContextObjectPreset,
  selectedNode: StudioGraphNode | null | undefined,
  cardRootNodeId: string | null,
): StudioInsertNodePlan => {
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  const parentId = resolveStudioNodeInsertionParentId(
    document,
    selectedNode,
    cardRootNodeId,
  );

  return {
    node: {
      id: nodeId,
      type: "text",
      label: preset.label,
      parentId,
      childIds: [],
      styleId,
      binding: {
        kind: "builtinField",
        fieldId: preset.fieldId,
      },
      meta: {
        exception: {
          semanticKey: preset.semanticKey,
          scope: "cards",
          presetId: preset.id,
          lockedStructure: true,
          singleton: true,
          builtInBindings: {
            text: preset.fieldId,
          },
        },
      },
    },
    styleId,
    style: preset.style,
    position: "front",
  };
};

/**
 * 카드 상태 배경.
 *
 * 다른 객체 뒤에 깔려야 하므로 형제 목록의 앞쪽에 넣는다.
 */
export const planStudioAddCardStatusBackground = (
  document: StudioTemplateDocument,
  preset: StudioCardStatusBackgroundPreset,
  selectedNode: StudioGraphNode | null | undefined,
  cardRootNodeId: string | null,
): StudioInsertNodePlan => {
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  const parentId = resolveStudioNodeInsertionParentId(
    document,
    selectedNode,
    cardRootNodeId,
  );

  return {
    node: {
      id: nodeId,
      type: "group",
      label: preset.label,
      parentId,
      childIds: [],
      styleId,
      meta: {
        exception: createStudioStatusCardBackgroundExceptionMeta(),
      },
    },
    styleId,
    style: preset.style,
    position: "back",
  };
};
