import {
  StudioObjectLayoutMode,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableComposition,
} from "@/types/template-studio";

export type StudioObjectGeometry = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const getStyleNumber = (
  style: StudioStyleRecord | undefined,
  key: "left" | "top" | "width" | "height",
) => (typeof style?.[key] === "number" ? style[key] : 0);

export const isStudioFillParentLayout = (layoutMode: unknown) =>
  layoutMode === "fillParent";

export const getStudioObjectRenderStyle = (
  style: StudioStyleRecord,
  layoutMode?: StudioObjectLayoutMode,
): StudioStyleRecord =>
  isStudioFillParentLayout(layoutMode)
    ? {
        ...style,
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
      }
    : style;

export const resolveStudioGraphNodeGeometry = (
  document: StudioTemplateDocument,
  nodeId: string,
  visitedNodeIds = new Set<string>(),
): StudioObjectGeometry => {
  const node = document.graph.nodes[nodeId];
  if (!node || visitedNodeIds.has(nodeId)) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const style = node.styleId ? document.styles[node.styleId] : undefined;
  if (!isStudioFillParentLayout(node.layoutMode)) {
    return {
      left: getStyleNumber(style, "left"),
      top: getStyleNumber(style, "top"),
      width: getStyleNumber(style, "width"),
      height: getStyleNumber(style, "height"),
    };
  }

  if (!node.parentId) {
    return {
      left: 0,
      top: 0,
      width: document.canvas.width,
      height: document.canvas.height,
    };
  }

  const nextVisitedNodeIds = new Set(visitedNodeIds);
  nextVisitedNodeIds.add(nodeId);
  const parentGeometry = resolveStudioGraphNodeGeometry(
    document,
    node.parentId,
    nextVisitedNodeIds,
  );

  return {
    left: 0,
    top: 0,
    width: parentGeometry.width,
    height: parentGeometry.height,
  };
};

export const resolveStudioTimetableObjectGeometry = (
  composition: StudioTimetableComposition,
  objectId: string,
  canvas: { width: number; height: number },
  visitedObjectIds = new Set<string>(),
): StudioObjectGeometry => {
  const object = composition.objects[objectId];
  if (!object || visitedObjectIds.has(objectId)) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  if (!isStudioFillParentLayout(object.layoutMode)) {
    return {
      left: getStyleNumber(object.style, "left"),
      top: getStyleNumber(object.style, "top"),
      width: getStyleNumber(object.style, "width"),
      height: getStyleNumber(object.style, "height"),
    };
  }

  if (!object.parentId) {
    return {
      left: 0,
      top: 0,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const nextVisitedObjectIds = new Set(visitedObjectIds);
  nextVisitedObjectIds.add(objectId);
  const parentGeometry = resolveStudioTimetableObjectGeometry(
    composition,
    object.parentId,
    canvas,
    nextVisitedObjectIds,
  );

  return {
    left: 0,
    top: 0,
    width: parentGeometry.width,
    height: parentGeometry.height,
  };
};
