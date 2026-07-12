import type {
  StudioNodeId,
  StudioTemplateDocument,
  StudioTimetableComponentId,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";

export type StudioComponentVariantCloneResult =
  | { ok: true; rootNodeId: StudioNodeId }
  | { ok: false; reason: string };

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const cloneStudioComponentVariant = (
  document: StudioTemplateDocument,
  componentId: StudioTimetableComponentId,
  sourceStatusId: StudioTimetableStatusId,
  targetStatusId: StudioTimetableStatusId,
): StudioComponentVariantCloneResult => {
  const component = document.domains?.timetable?.components[componentId];
  if (!component) return { ok: false, reason: "Entry component is missing" };

  const sourceVariant = component.variants[sourceStatusId];
  if (!sourceVariant) {
    return { ok: false, reason: "Source component variant is missing" };
  }

  const cloneNode = (
    sourceNodeId: StudioNodeId,
    parentId: StudioNodeId | null,
  ): StudioNodeId | null => {
    const sourceNode = document.graph.nodes[sourceNodeId];
    if (!sourceNode) return null;

    const nodeId = createStudioId("node");
    let styleId: string | undefined;

    if (sourceNode.styleId) {
      styleId = createStudioId("style");
      document.styles[styleId] = cloneJson(
        document.styles[sourceNode.styleId] ?? {},
      );
    }

    const childIds = sourceNode.childIds
      .map((childId) => cloneNode(childId, nodeId))
      .filter(Boolean) as StudioNodeId[];

    document.graph.nodes[nodeId] = {
      ...cloneJson(sourceNode),
      id: nodeId,
      label:
        parentId === null
          ? `${sourceNode.label} ${targetStatusId}`
          : sourceNode.label,
      parentId,
      childIds,
      styleId,
    };

    return nodeId;
  };

  const rootNodeId = cloneNode(sourceVariant.rootNodeId, null);
  if (!rootNodeId) return { ok: false, reason: "Variant root is missing" };

  document.graph.rootNodeIds.push(rootNodeId);
  component.variants[targetStatusId] = {
    statusId: targetStatusId,
    rootNodeId,
  };

  return { ok: true, rootNodeId };
};
