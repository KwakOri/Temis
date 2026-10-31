import type {
  StudioGraphNode,
  StudioNodeId,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import {
  applyStudioTimetableComponentFrames,
  ensureStudioVariantEntryGroups,
  getStudioVariantEntryGroups,
} from "@/utils/template-studio/entry-groups";
import { getStudioTopLevelNodeIds } from "@/utils/template-studio/graph-nodes";
import { createStudioId } from "@/utils/template-studio/id";
import { applyStudioDeleteNodes } from "@/utils/template-studio/node-commands";
import { ensureStudioVariantSyncKeys } from "@/utils/template-studio/status-variants";
import { getStudioNodeEntrySlotIndex } from "@/utils/template-studio/variant-style-propagation";

const MULTI_STATUS_ID = "multi";
const OFFLINE_MEMO_STATUS_ID = "offlineMemo";

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getSubtreeNodeIds = (
  document: StudioTemplateDocument,
  rootNodeId: StudioNodeId,
): StudioNodeId[] => {
  const result: StudioNodeId[] = [];
  const visited = new Set<StudioNodeId>();
  const visit = (nodeId: StudioNodeId) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = document.graph.nodes[nodeId];
    if (!node) return;
    result.push(nodeId);
    node.childIds.forEach(visit);
  };
  visit(rootNodeId);
  return result;
};

/**
 * 이 부모 안의 0,0이 카드에서 어디인지.
 *
 * 상태마다 카드 루트의 캔버스 위치가 달라도 카드 안 같은 자리를 가리키도록
 * 카드 루트에서 멈춘다.
 */
const getCardOrigin = (
  document: StudioTemplateDocument,
  parentId: StudioNodeId | null,
  cardRootId: StudioNodeId,
) => {
  const origin = { left: 0, top: 0 };
  const visited = new Set<StudioNodeId>();
  let currentId = parentId;

  while (currentId && currentId !== cardRootId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = document.graph.nodes[currentId];
    const style = node?.styleId ? document.styles[node.styleId] : undefined;
    origin.left += typeof style?.left === "number" ? style.left : 0;
    origin.top += typeof style?.top === "number" ? style.top : 0;
    currentId = node?.parentId ?? null;
  }

  return origin;
};

/** id만 새로 받는 복제. variant sync key와 entry slot 표시는 그대로 둔다. */
const cloneSubtree = (
  document: StudioTemplateDocument,
  sourceNodeId: StudioNodeId,
  parentId: StudioNodeId,
): StudioNodeId | null => {
  const source = document.graph.nodes[sourceNodeId];
  if (!source) return null;
  const nodeId = createStudioId("node");
  let styleId: string | undefined;
  if (source.styleId) {
    styleId = createStudioId("style");
    document.styles[styleId] = cloneJson(document.styles[source.styleId] ?? {});
  }
  const childIds = source.childIds
    .map((childId) => cloneSubtree(document, childId, nodeId))
    .filter(Boolean) as StudioNodeId[];
  document.graph.nodes[nodeId] = {
    ...cloneJson(source),
    id: nodeId,
    parentId,
    childIds,
    styleId,
  };
  return nodeId;
};

/** 다른 부모 아래로 옮겨도 카드 안 같은 자리에 놓이도록 위치를 민다. */
const shiftNode = (
  document: StudioTemplateDocument,
  nodeId: StudioNodeId,
  delta: { left: number; top: number },
) => {
  if (delta.left === 0 && delta.top === 0) return;
  const styleId = document.graph.nodes[nodeId]?.styleId;
  const style = styleId ? document.styles[styleId] : undefined;
  if (!style) return;
  if (typeof style.left === "number") style.left += delta.left;
  if (typeof style.top === "number") style.top += delta.top;
};

/** 다른 상태 카드에서 같은 레이어. sync key와 entry slot이 모두 같아야 한다. */
const findLayer = (
  document: StudioTemplateDocument,
  targetRootId: StudioNodeId,
  sourceNode: StudioGraphNode,
  excludedNodeIds: Set<StudioNodeId> = new Set(),
): StudioGraphNode | null => {
  const syncKey = sourceNode.meta?.variantSyncKey;
  if (!syncKey) return null;
  const sourceSlotIndex = getStudioNodeEntrySlotIndex(document, sourceNode);
  return (
    getSubtreeNodeIds(document, targetRootId)
      .filter((nodeId) => nodeId !== targetRootId)
      .map((nodeId) => document.graph.nodes[nodeId])
      .find(
        (candidate): candidate is StudioGraphNode =>
          Boolean(candidate) &&
          !excludedNodeIds.has(candidate.id) &&
          candidate.meta?.variantSyncKey === syncKey &&
          getStudioNodeEntrySlotIndex(document, candidate) === sourceSlotIndex,
      ) ?? null
  );
};

/**
 * 대상 부모 안에서 넣을 자리.
 *
 * 원본에서 바로 앞이나 뒤에 있던 형제가 대상 부모에도 있으면 그 옆에 넣는다.
 * 겹침 순서가 원본과 같아야 배경이 글자를 덮지 않는다.
 */
const getInsertIndex = (
  document: StudioTemplateDocument,
  sourceNode: StudioGraphNode,
  targetParent: StudioGraphNode,
  targetRootId: StudioNodeId,
): number => {
  const siblings = sourceNode.parentId
    ? (document.graph.nodes[sourceNode.parentId]?.childIds ?? [])
    : [];
  const sourceIndex = siblings.indexOf(sourceNode.id);
  const findSiblingLayer = (siblingId: StudioNodeId) => {
    const sibling = document.graph.nodes[siblingId];
    const layer = sibling ? findLayer(document, targetRootId, sibling) : null;
    return layer?.parentId === targetParent.id ? layer : null;
  };

  for (let index = sourceIndex - 1; index >= 0; index -= 1) {
    const layer = findSiblingLayer(siblings[index]);
    if (layer) return targetParent.childIds.indexOf(layer.id) + 1;
  }
  for (let index = sourceIndex + 1; index < siblings.length; index += 1) {
    const layer = findSiblingLayer(siblings[index]);
    if (layer) return targetParent.childIds.indexOf(layer.id);
  }
  return Math.min(Math.max(sourceIndex, 0), targetParent.childIds.length);
};

/**
 * Multi 카드의 두 entry 자리를 원본 Entry Group으로 다시 만든다.
 *
 * Multi는 Entry Group 하나를 반 높이로 줄여 두 칸에 나눠 쓴다. 한 칸만 바꾸면
 * 크기가 맞지 않으므로 둘 다 지우고 Multi variant를 처음 만들 때처럼 다시 나눈다.
 */
const rebuildMultiEntryGroups = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition,
  targetRoot: StudioGraphNode,
  sourceGroup: StudioGraphNode,
) => {
  const groupIds = getStudioVariantEntryGroups(
    document,
    component.variants[MULTI_STATUS_ID],
  ).map((group) => group.id);
  const groupIndexes = groupIds.map((groupId) =>
    targetRoot.childIds.indexOf(groupId),
  );
  const insertIndex =
    groupIndexes.length > 0
      ? Math.min(...groupIndexes)
      : targetRoot.childIds.length;

  applyStudioDeleteNodes(document, groupIds);
  const cloneId = cloneSubtree(document, sourceGroup.id, targetRoot.id);
  if (!cloneId) return;
  targetRoot.childIds.splice(insertIndex, 0, cloneId);
  ensureStudioVariantEntryGroups(document, component, MULTI_STATUS_ID);
};

const isOfflineMemoTextNode = (node: StudioGraphNode) =>
  node.binding?.kind === "builtinField" &&
  node.binding.fieldId === "day.offline_memo";

export interface CopyStudioVariantNodesOptions {
  component: StudioTimetableComponentDefinition;
  sourceStatusId: StudioTimetableStatusId;
  /** 카드 루트가 들어 있으면 카드 전체를 복사한다. */
  sourceNodeIds: StudioNodeId[];
  targetStatusIds: StudioTimetableStatusId[];
}

export interface CopyStudioVariantNodesResult {
  replacedNodeCount: number;
  addedNodeCount: number;
  skippedNodeCount: number;
  copiedStatusIds: StudioTimetableStatusId[];
  skippedStatusIds: StudioTimetableStatusId[];
}

/**
 * 선택한 레이어를 다른 상태 카드로 복사한다.
 *
 * 대상 카드에 같은 레이어가 있으면 내용, 연결, 스타일, 자식까지 원본으로 바꾸고
 * 없으면 원본과 같은 자리에 넣는다. 대상 카드에만 있는 레이어는 건드리지 않는다.
 * 카드 루트를 고르면 루트 스타일과 루트의 모든 자식을 이 규칙으로 복사한다.
 *
 * entry 자리는 상태마다 칸 수가 달라서 따로 다룬다. Multi로 Entry Group을 보내면
 * 두 칸을 다시 나누고, Entry Group 안 레이어 하나만 Multi로 보내는 것은 칸 크기가
 * 맞지 않아 건너뛴다. Multi의 두 번째 칸은 칸이 하나인 상태로 보내지 않는다.
 */
export const copyStudioVariantNodes = (
  document: StudioTemplateDocument,
  options: CopyStudioVariantNodesOptions,
): CopyStudioVariantNodesResult => {
  const { component, sourceStatusId } = options;
  const result: CopyStudioVariantNodesResult = {
    replacedNodeCount: 0,
    addedNodeCount: 0,
    skippedNodeCount: 0,
    copiedStatusIds: [],
    skippedStatusIds: [],
  };
  const sourceVariant = component.variants[sourceStatusId];
  const sourceRoot = sourceVariant
    ? document.graph.nodes[sourceVariant.rootNodeId]
    : undefined;
  if (!sourceRoot) {
    result.skippedStatusIds = [...options.targetStatusIds];
    return result;
  }

  ensureStudioVariantSyncKeys(document, sourceRoot.id);
  const sourceOrder = getSubtreeNodeIds(document, sourceRoot.id);
  const requestedNodeIds = options.sourceNodeIds.filter((nodeId) =>
    sourceOrder.includes(nodeId),
  );
  const copiesWholeCard = requestedNodeIds.includes(sourceRoot.id);
  const layerIds = copiesWholeCard
    ? [...sourceRoot.childIds]
    : getStudioTopLevelNodeIds(document, requestedNodeIds).sort(
        (left, right) => sourceOrder.indexOf(left) - sourceOrder.indexOf(right),
      );
  const sourceIsMulti = sourceStatusId === MULTI_STATUS_ID;

  options.targetStatusIds.forEach((targetStatusId) => {
    const targetVariant = component.variants[targetStatusId];
    const targetRoot = targetVariant
      ? document.graph.nodes[targetVariant.rootNodeId]
      : undefined;
    if (
      !targetRoot ||
      targetStatusId === sourceStatusId ||
      targetRoot.id === sourceRoot.id
    ) {
      result.skippedStatusIds.push(targetStatusId);
      return;
    }

    ensureStudioVariantSyncKeys(document, targetRoot.id);
    const targetIsMulti = targetStatusId === MULTI_STATUS_ID;
    const copiedNodeIds = new Set<StudioNodeId>();
    let copiedCount = 0;

    if (copiesWholeCard && sourceRoot.styleId) {
      targetRoot.styleId ??= createStudioId("style");
      document.styles[targetRoot.styleId] = cloneJson(
        document.styles[sourceRoot.styleId] ?? {},
      );
      copiedCount += 1;
    }

    layerIds.forEach((sourceNodeId) => {
      const sourceNode = document.graph.nodes[sourceNodeId];
      if (!sourceNode) return;
      const slotIndex = getStudioNodeEntrySlotIndex(document, sourceNode);
      const isEntryGroup = Boolean(sourceNode.meta?.entrySlot);

      if (
        (isOfflineMemoTextNode(sourceNode) &&
          targetStatusId !== OFFLINE_MEMO_STATUS_ID) ||
        (slotIndex === 1 && !targetIsMulti) ||
        (slotIndex !== null && targetIsMulti && !sourceIsMulti && !isEntryGroup)
      ) {
        result.skippedNodeCount += 1;
        return;
      }

      if (isEntryGroup && targetIsMulti && !sourceIsMulti) {
        rebuildMultiEntryGroups(document, component, targetRoot, sourceNode);
        result.replacedNodeCount += 1;
        copiedCount += 1;
        return;
      }

      const sourceOrigin = getCardOrigin(
        document,
        sourceNode.parentId,
        sourceRoot.id,
      );
      const match = findLayer(
        document,
        targetRoot.id,
        sourceNode,
        copiedNodeIds,
      );
      const sourceParent = sourceNode.parentId
        ? document.graph.nodes[sourceNode.parentId]
        : undefined;
      const targetParent = match?.parentId
        ? document.graph.nodes[match.parentId]
        : sourceParent && sourceParent.id !== sourceRoot.id
          ? (findLayer(document, targetRoot.id, sourceParent) ?? targetRoot)
          : targetRoot;
      if (!targetParent) {
        result.skippedNodeCount += 1;
        return;
      }

      const insertIndex = match
        ? targetParent.childIds.indexOf(match.id)
        : getInsertIndex(document, sourceNode, targetParent, targetRoot.id);
      if (match) applyStudioDeleteNodes(document, [match.id]);
      const cloneId = cloneSubtree(document, sourceNode.id, targetParent.id);
      if (!cloneId) return;
      targetParent.childIds.splice(insertIndex, 0, cloneId);

      const targetOrigin = getCardOrigin(
        document,
        targetParent.id,
        targetRoot.id,
      );
      shiftNode(document, cloneId, {
        left: sourceOrigin.left - targetOrigin.left,
        top: sourceOrigin.top - targetOrigin.top,
      });
      getSubtreeNodeIds(document, cloneId).forEach((nodeId) =>
        copiedNodeIds.add(nodeId),
      );

      if (match) result.replacedNodeCount += 1;
      else result.addedNodeCount += 1;
      copiedCount += 1;
    });

    if (copiedCount > 0) result.copiedStatusIds.push(targetStatusId);
    else result.skippedStatusIds.push(targetStatusId);
  });

  applyStudioTimetableComponentFrames(document);
  return result;
};

export const getStudioVariantCopyMessage = ({
  replacedNodeCount,
  addedNodeCount,
  skippedNodeCount,
  copiedStatusIds,
}: CopyStudioVariantNodesResult): string => {
  if (copiedStatusIds.length === 0) {
    return "Nothing could be copied to the selected statuses";
  }

  const skippedSuffix =
    skippedNodeCount > 0 ? ` · ${skippedNodeCount} skipped` : "";
  return `Copied to ${copiedStatusIds.length} status(es): ${replacedNodeCount} replaced, ${addedNodeCount} added${skippedSuffix}`;
};
