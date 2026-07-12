import type {
  StudioGraphNode,
  StudioNodeId,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableComponentId,
  StudioTimetableDayId,
  StudioTimetableDomain,
} from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export type StudioTimetableDayComponentResolutionSource =
  | "day"
  | "default"
  | "fallback";

export interface StudioTimetableDayComponentResolution {
  componentId: StudioTimetableComponentId;
  component: StudioTimetableComponentDefinition;
  requestedComponentId: StudioTimetableComponentId | null;
  source: StudioTimetableDayComponentResolutionSource;
  isFallback: boolean;
}

export const getStudioTimetableDayComponentId = (
  timetable: StudioTimetableDomain | null | undefined,
  dayId: StudioTimetableDayId,
): StudioTimetableComponentId | null => {
  if (!timetable) return null;

  const requestedComponentId = timetable.days[dayId]?.componentId;
  if (
    requestedComponentId &&
    timetable.components[requestedComponentId]
  ) {
    return requestedComponentId;
  }

  if (timetable.components[timetable.entryComponentId]) {
    return timetable.entryComponentId;
  }

  return Object.keys(timetable.components)[0] ?? null;
};

export const resolveStudioTimetableDayComponent = (
  document: StudioTemplateDocument,
  dayId: StudioTimetableDayId,
): StudioTimetableDayComponentResolution | null => {
  const timetable = document.domains?.timetable;
  if (!timetable) return null;

  const requestedComponentId = timetable.days[dayId]?.componentId ?? null;
  const componentId = getStudioTimetableDayComponentId(timetable, dayId);
  if (!componentId) return null;

  const component = timetable.components[componentId];
  if (!component) return null;

  const source: StudioTimetableDayComponentResolutionSource =
    requestedComponentId === componentId
      ? "day"
      : componentId === timetable.entryComponentId
        ? "default"
        : "fallback";

  return {
    componentId,
    component,
    requestedComponentId,
    source,
    isFallback:
      source === "fallback" ||
      Boolean(requestedComponentId && requestedComponentId !== componentId),
  };
};

export const getStudioTimetableDayComponent = (
  document: StudioTemplateDocument,
  dayId: StudioTimetableDayId,
): StudioTimetableComponentDefinition | undefined =>
  resolveStudioTimetableDayComponent(document, dayId)?.component;

export type StudioTimetableComponentSetCloneResult =
  | {
      ok: true;
      componentId: StudioTimetableComponentId;
      rootNodeIds: StudioNodeId[];
    }
  | { ok: false; reason: string };

const getUniqueComponentLabel = (
  document: StudioTemplateDocument,
  sourceLabel: string,
) => {
  const labels = new Set(
    Object.values(document.domains?.timetable?.components ?? {}).map(
      (component) => component.label,
    ),
  );
  const baseLabel = `${sourceLabel} Copy`;
  if (!labels.has(baseLabel)) return baseLabel;

  let suffix = 2;
  while (labels.has(`${baseLabel} ${suffix}`)) suffix += 1;
  return `${baseLabel} ${suffix}`;
};

export const cloneStudioTimetableComponentSet = (
  document: StudioTemplateDocument,
  sourceComponentId: StudioTimetableComponentId,
  label?: string,
): StudioTimetableComponentSetCloneResult => {
  const timetable = document.domains?.timetable;
  const sourceComponent = timetable?.components[sourceComponentId];
  if (!timetable || !sourceComponent) {
    return { ok: false, reason: "Source component set is missing" };
  }

  const componentId = createStudioId("component");
  const rootNodeIds: StudioNodeId[] = [];
  const clonedNodeIdBySourceId = new Map<StudioNodeId, StudioNodeId>();
  const cleanupClonedNodes = () => {
    clonedNodeIdBySourceId.forEach((nodeId) => {
      const styleId = document.graph.nodes[nodeId]?.styleId;
      if (styleId) delete document.styles[styleId];
      delete document.graph.nodes[nodeId];
    });
  };

  const cloneNode = (
    sourceNodeId: StudioNodeId,
    parentId: StudioNodeId | null,
  ): StudioNodeId | null => {
    const sourceNode = document.graph.nodes[sourceNodeId];
    if (!sourceNode) return null;

    const existingNodeId = clonedNodeIdBySourceId.get(sourceNodeId);
    if (existingNodeId) return existingNodeId;

    const nodeId = createStudioId("node");
    let styleId: string | undefined;
    if (sourceNode.styleId) {
      styleId = createStudioId("style");
      document.styles[styleId] = cloneJson(
        document.styles[sourceNode.styleId] ?? {},
      );
    }

    const nextNode: StudioGraphNode = {
      ...cloneJson(sourceNode),
      id: nodeId,
      parentId,
      childIds: [],
      styleId,
    };
    clonedNodeIdBySourceId.set(sourceNodeId, nodeId);
    document.graph.nodes[nodeId] = nextNode;
    nextNode.childIds = sourceNode.childIds
      .map((childId) => cloneNode(childId, nodeId))
      .filter(Boolean) as StudioNodeId[];
    return nodeId;
  };

  const variants = Object.fromEntries(
    Object.entries(sourceComponent.variants).flatMap(([statusId, variant]) => {
      const rootNodeId = cloneNode(variant.rootNodeId, null);
      if (!rootNodeId) return [];
      rootNodeIds.push(rootNodeId);
      return [
        [
          statusId,
          {
            statusId: variant.statusId,
            rootNodeId,
          },
        ],
      ];
    }),
  );

  if (
    Object.keys(variants).length !==
    Object.keys(sourceComponent.variants).length
  ) {
    cleanupClonedNodes();
    return { ok: false, reason: "Source component set has a missing root" };
  }

  document.graph.rootNodeIds.push(...rootNodeIds);
  timetable.components[componentId] = {
    ...cloneJson(sourceComponent),
    id: componentId,
    label:
      label?.trim() ||
      getUniqueComponentLabel(document, sourceComponent.label),
    frame: sourceComponent.frame
      ? { ...sourceComponent.frame }
      : sourceComponent.frame,
    variants,
  };

  return { ok: true, componentId, rootNodeIds };
};

export const getStudioTimetableComponentSetDeleteReason = (
  document: StudioTemplateDocument,
  componentId: StudioTimetableComponentId,
): string | null => {
  const timetable = document.domains?.timetable;
  if (!timetable?.components[componentId]) return "Component set is missing";
  if (timetable.entryComponentId === componentId) {
    return "The default component set cannot be deleted";
  }

  const assignedDay = timetable.dayIds
    .map((dayId) => timetable.days[dayId])
    .find((day) => day?.componentId === componentId);
  return assignedDay
    ? `${assignedDay.label} is assigned to this component set`
    : null;
};

export const deleteStudioTimetableComponentSet = (
  document: StudioTemplateDocument,
  componentId: StudioTimetableComponentId,
): { ok: true } | { ok: false; reason: string } => {
  const reason = getStudioTimetableComponentSetDeleteReason(
    document,
    componentId,
  );
  if (reason) return { ok: false, reason };

  const timetable = document.domains?.timetable;
  const component = timetable?.components[componentId];
  if (!timetable || !component) {
    return { ok: false, reason: "Component set is missing" };
  }

  const nodeIds = new Set<StudioNodeId>();
  const collectNode = (nodeId: StudioNodeId) => {
    if (nodeIds.has(nodeId)) return;
    const node = document.graph.nodes[nodeId];
    if (!node) return;
    nodeIds.add(nodeId);
    node.childIds.forEach(collectNode);
  };
  Object.values(component.variants).forEach((variant) =>
    collectNode(variant.rootNodeId),
  );

  document.graph.rootNodeIds = document.graph.rootNodeIds.filter(
    (nodeId) => !nodeIds.has(nodeId),
  );
  nodeIds.forEach((nodeId) => {
    const styleId = document.graph.nodes[nodeId]?.styleId;
    if (styleId) delete document.styles[styleId];
    delete document.graph.nodes[nodeId];
  });
  delete timetable.components[componentId];
  return { ok: true };
};
