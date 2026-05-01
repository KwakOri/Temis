import {
  V2TemplateCardFrameNode,
  V2TemplateCardNode,
  V2TemplateCardStructure,
  V2TemplateLayerIconKey,
  V2TemplateLayerNode,
  V2TemplateTimetableCardComponent,
  V2TemplateTimetableCardState,
  V2TemplateTimetableCardStatusKey,
} from "@/types/time-table/template-render-config";

const v2_TIMETABLE_STATUS_LABELS: Record<
  V2TemplateTimetableCardStatusKey,
  string
> = {
  online: "온라인",
  offline: "오프라인",
  multi: "다회차",
  offlineMemo: "오프라인 메모",
};

const v2_getCardNodeLayerIcon = (
  node: V2TemplateCardNode
): V2TemplateLayerIconKey => {
  if (node.kind === "image") return "image";
  if (node.binding.mode === "computed") return "calendar";
  return "text";
};

const v2_getCardObjectLayerId = (
  object: V2TemplateCardNode | V2TemplateCardFrameNode
): string => {
  return typeof object.layerId === "string" && object.layerId.trim().length > 0
    ? object.layerId
    : object.id;
};

export const v2_getTimetableComponentStateForStatus = ({
  component,
  status,
}: {
  component: V2TemplateTimetableCardComponent | null | undefined;
  status: V2TemplateTimetableCardStatusKey;
}): V2TemplateTimetableCardState | null => {
  if (!component) return null;
  return (
    component.states[status] ??
    component.states.online ??
    component.states.offline ??
    null
  );
};

export const v2_findTimetableCardObjectIdByLayerId = ({
  card,
  layerId,
}: {
  card: V2TemplateCardStructure | null | undefined;
  layerId: string | null | undefined;
}): string | null => {
  if (!card || !layerId) return null;

  const frame = Object.values(card.frameNodes ?? {}).find(
    (candidate) => v2_getCardObjectLayerId(candidate) === layerId
  );
  if (frame) return frame.id;

  const node = Object.values(card.nodes).find(
    (candidate) => v2_getCardObjectLayerId(candidate) === layerId
  );
  if (node) return node.id;

  return null;
};

export const v2_findTimetableCardFrameIdByLayerId = ({
  card,
  layerId,
}: {
  card: V2TemplateCardStructure | null | undefined;
  layerId: string | null | undefined;
}): string | null => {
  if (!card || !layerId) return null;
  const frame = Object.values(card.frameNodes ?? {}).find(
    (candidate) => v2_getCardObjectLayerId(candidate) === layerId
  );
  return frame?.id ?? null;
};

const v2_clampInsertIndex = (index: number, length: number): number => {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.floor(index)));
};

const v2_collectTimetableCardFrameDescendantIds = ({
  card,
  frameId,
}: {
  card: V2TemplateCardStructure;
  frameId: string;
}): Set<string> => {
  const frameNodes = card.frameNodes ?? {};
  const descendantFrameIds = new Set<string>();
  const visit = (currentFrameId: string) => {
    const frame = frameNodes[currentFrameId];
    if (!frame) return;
    frame.childIds.forEach((childId) => {
      if (!frameNodes[childId] || descendantFrameIds.has(childId)) return;
      descendantFrameIds.add(childId);
      visit(childId);
    });
  };
  visit(frameId);
  return descendantFrameIds;
};

export const v2_reorderTimetableCardObjects = ({
  card,
  parentFrameId,
  orderedObjectIds,
}: {
  card: V2TemplateCardStructure;
  parentFrameId: string | null;
  orderedObjectIds: string[];
}): V2TemplateCardStructure => {
  const objectIds = new Set([
    ...Object.keys(card.nodes),
    ...Object.keys(card.frameNodes ?? {}),
  ]);
  const nextOrderedObjectIds = orderedObjectIds.filter((objectId) =>
    objectIds.has(objectId)
  );

  if (!parentFrameId) {
    const currentRootObjectIds = card.rootObjectIds ?? card.nodeOrder;
    const nextRootObjectIds = [
      ...nextOrderedObjectIds,
      ...currentRootObjectIds.filter(
        (objectId) => !nextOrderedObjectIds.includes(objectId)
      ),
    ];
    return {
      ...card,
      rootObjectIds: nextRootObjectIds,
    };
  }

  const frame = card.frameNodes?.[parentFrameId];
  if (!frame) return card;
  const nextChildIds = [
    ...nextOrderedObjectIds,
    ...frame.childIds.filter(
      (objectId) => !nextOrderedObjectIds.includes(objectId)
    ),
  ];

  return {
    ...card,
    frameNodes: {
      ...(card.frameNodes ?? {}),
      [parentFrameId]: {
        ...frame,
        childIds: nextChildIds,
      },
    },
  };
};

export const v2_relocateTimetableCardObject = ({
  card,
  objectId,
  targetParentFrameId,
  targetIndex,
}: {
  card: V2TemplateCardStructure;
  objectId: string;
  targetParentFrameId: string | null;
  targetIndex: number;
}): V2TemplateCardStructure => {
  const frame = card.frameNodes?.[objectId];
  const node = card.nodes[objectId];
  if (!frame && !node) return card;
  if (targetParentFrameId && !card.frameNodes?.[targetParentFrameId]) return card;
  if (targetParentFrameId === objectId) return card;

  if (frame && targetParentFrameId) {
    const descendantFrameIds = v2_collectTimetableCardFrameDescendantIds({
      card,
      frameId: frame.id,
    });
    if (descendantFrameIds.has(targetParentFrameId)) return card;
  }

  const frameNodesWithoutObject = Object.fromEntries(
    Object.entries(card.frameNodes ?? {}).map(([frameId, candidateFrame]) => [
      frameId,
      {
        ...candidateFrame,
        childIds: candidateFrame.childIds.filter((childId) => childId !== objectId),
      },
    ])
  );
  const rootObjectIdsWithoutObject = (card.rootObjectIds ?? card.nodeOrder).filter(
    (candidateId) => candidateId !== objectId
  );

  let nextRootObjectIds = rootObjectIdsWithoutObject;
  let nextFrameNodes = frameNodesWithoutObject;

  if (targetParentFrameId) {
    const targetFrame = nextFrameNodes[targetParentFrameId];
    const insertIndex = v2_clampInsertIndex(targetIndex, targetFrame.childIds.length);
    const nextChildIds = [...targetFrame.childIds];
    nextChildIds.splice(insertIndex, 0, objectId);
    nextFrameNodes = {
      ...nextFrameNodes,
      [targetParentFrameId]: {
        ...targetFrame,
        childIds: nextChildIds,
      },
    };
  } else {
    const insertIndex = v2_clampInsertIndex(
      targetIndex,
      rootObjectIdsWithoutObject.length
    );
    nextRootObjectIds = [...rootObjectIdsWithoutObject];
    nextRootObjectIds.splice(insertIndex, 0, objectId);
  }

  const nextNodes = node
    ? {
        ...card.nodes,
        [objectId]: {
          ...node,
          parentId: targetParentFrameId,
        },
      }
    : card.nodes;
  const nextFrames = frame
    ? {
        ...nextFrameNodes,
        [objectId]: {
          ...nextFrameNodes[objectId],
          parentId: targetParentFrameId,
        },
      }
    : nextFrameNodes;

  return {
    ...card,
    nodes: nextNodes,
    frameNodes: nextFrames,
    rootObjectIds: nextRootObjectIds,
  };
};

export const v2_getTimetableComponentLayerTree = ({
  component,
  status,
}: {
  component: V2TemplateTimetableCardComponent | null | undefined;
  status: V2TemplateTimetableCardStatusKey;
}): V2TemplateLayerNode[] => {
  const state = v2_getTimetableComponentStateForStatus({ component, status });
  if (!component || !state) return [];

  const { card } = state;
  const mapObjectToLayerNode = (objectId: string): V2TemplateLayerNode | null => {
    const frame = card.frameNodes?.[objectId];
    if (frame) {
      return {
        id: v2_getCardObjectLayerId(frame),
        label: frame.label,
        kind: "group",
        icon: "group",
        target: frame.highlightTarget,
        sectionKey: frame.styleKey,
        visibilityMode: frame.visibilityMode ?? "always",
        children: frame.childIds
          .map((childId) => mapObjectToLayerNode(childId))
          .filter((node): node is V2TemplateLayerNode => Boolean(node)),
      };
    }

    const node = card.nodes[objectId];
    if (!node) return null;
    return {
      id: v2_getCardObjectLayerId(node),
      label: node.label,
      kind: "component",
      icon: v2_getCardNodeLayerIcon(node),
      target: node.highlightTarget,
      sectionKey: node.containerStyleKey,
      visibilityMode: node.visibilityMode ?? "always",
    };
  };

  const rootObjectIds = card.rootObjectIds?.length
    ? card.rootObjectIds
    : card.nodeOrder;

  return [
    {
      id:
        typeof card.containerLayerId === "string" &&
        card.containerLayerId.trim().length > 0
          ? card.containerLayerId
          : `timetable-card:${component.id}:${status}`,
      label: `${component.label} / ${v2_TIMETABLE_STATUS_LABELS[status]}`,
      kind: "group",
      icon: "layers",
      target: card.containerHighlightTarget,
      sectionKey: card.containerStyleKey,
      visibilityMode: "always",
      isVirtual: true,
      children: rootObjectIds
        .map((objectId) => mapObjectToLayerNode(objectId))
        .filter((node): node is V2TemplateLayerNode => Boolean(node)),
    },
  ];
};
