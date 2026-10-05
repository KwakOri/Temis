import type {
  StudioImageFit,
  StudioStyleRecord,
  StudioTemplateDocument,
} from "@/types/template-studio";
import type {
  StudioTimetableGraphDocument,
  StudioTimetableGraphNode,
  StudioTimetableNodeExtension,
} from "@/types/studio-timetable-graph";
import type { StudioCommandPlan } from "./graph-commands";
import { createStudioId } from "./id";
import {
  isStudioFillParentLayout,
  type StudioObjectGeometry,
} from "./object-layout";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "./timetable-graph-presets";

export const isStudioTimetableGraphNodeLocked = (
  document: StudioTimetableGraphDocument,
  nodeId: string,
): boolean => {
  const visited = new Set<string>();
  let id: string | null = nodeId;
  while (id && !visited.has(id)) {
    visited.add(id);
    const node: StudioTimetableGraphNode | undefined = document.graph.nodes[id];
    if (node?.locked) return true;
    id = node?.parentId ?? null;
  }
  return false;
};

/** Inspector mutations receive the canonical node and its referenced records. */
export interface StudioTimetableGraphEditTarget {
  node: StudioTimetableGraphNode;
  style: StudioStyleRecord;
  extension: StudioTimetableNodeExtension;
}
export type StudioTimetableGraphRecipe = (
  target: StudioTimetableGraphEditTarget,
) => void;

export const requireStudioTimetableGraphDocument = (
  document: StudioTemplateDocument,
): StudioTimetableGraphDocument => {
  if (document.version !== 8 || !document.domains?.timetable)
    throw new Error("Timetable editing requires a v8 graph document.");
  return document as StudioTimetableGraphDocument;
};

export const isStudioTimetableGraphNode = (
  document: StudioTimetableGraphDocument,
  nodeId: string,
): boolean => {
  const roots = new Set(document.domains.timetable.rootNodeIds);
  const visited = new Set<string>();
  let id: string | null = nodeId;
  while (id && !visited.has(id)) {
    if (roots.has(id)) return true;
    visited.add(id);
    id = document.graph.nodes[id]?.parentId ?? null;
  }
  return false;
};

export const getStudioTimetableGraphEditTarget = (
  document: StudioTemplateDocument,
  nodeId: string,
): StudioTimetableGraphEditTarget | null => {
  const graph = requireStudioTimetableGraphDocument(document);
  const node = graph.graph.nodes[nodeId];
  if (!node || !isStudioTimetableGraphNode(graph, nodeId)) return null;
  if (!node.styleId) node.styleId = createStudioId("style");
  const style = graph.styles[node.styleId] ?? (graph.styles[node.styleId] = {});
  const extension =
    graph.domains.timetable.nodeExtensions[nodeId] ??
    (graph.domains.timetable.nodeExtensions[nodeId] = {});
  return { node, style, extension };
};

/** Resolve weekly geometry against the timetable canvas, including nested fillParent. */
export const resolveStudioTimetableGraphGeometry = (
  document: StudioTimetableGraphDocument,
  nodeId: string,
  visited = new Set<string>(),
): StudioObjectGeometry => {
  const node = document.graph.nodes[nodeId];
  if (!node || visited.has(nodeId))
    return { left: 0, top: 0, width: 0, height: 0 };
  const style = document.styles[node.styleId ?? ""] ?? {};
  const number = (key: string) =>
    typeof style[key] === "number" ? (style[key] as number) : 0;
  if (!isStudioFillParentLayout(node.layoutMode))
    return {
      left: number("left"),
      top: number("top"),
      width: number("width"),
      height: number("height"),
    };
  visited.add(nodeId);
  const parent = node.parentId
    ? resolveStudioTimetableGraphGeometry(document, node.parentId, visited)
    : {
        width: document.domains.timetable.canvas?.width ?? 4000,
        height: document.domains.timetable.canvas?.height ?? 2250,
      };
  return { left: 0, top: 0, width: parent.width, height: parent.height };
};

/** Images bind their foreground; other nodes keep decorations/backgrounds in named slots. */
export const setStudioTimetableGraphAsset = (
  node: StudioTimetableGraphNode,
  slot: "foreground" | "background",
  source: { assetId: string | null } | { inputId: string },
  fit: StudioImageFit,
): void => {
  if (slot === "foreground" && node.type === "image") {
    node.binding =
      "inputId" in source
        ? { kind: "inputImage", inputId: source.inputId }
        : source.assetId
          ? { kind: "staticAsset", assetId: source.assetId }
          : undefined;
    node.fit = fit;
    return;
  }
  const key = slot === "background" ? "asset" : "inlineDecoration";
  node.assetSlots = { ...node.assetSlots, [key]: { ...source, fit } };
};

export const planStudioDeleteTimetableGraphNode = (
  document: StudioTimetableGraphDocument,
  nodeId: string | null,
): StudioCommandPlan<{
  nodeIds: string[];
  fallbackSelectionId: string | null;
}> => {
  if (
    !nodeId ||
    !document.graph.nodes[nodeId] ||
    !isStudioTimetableGraphNode(document, nodeId)
  )
    return { ok: false, reason: "Select a timetable object to delete" };
  if (document.domains.timetable.nodeExtensions[nodeId]?.generator)
    return { ok: false, reason: "Day card containers cannot be deleted" };
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id)) return;
    ids.add(id);
    document.graph.nodes[id]?.childIds.forEach(visit);
  };
  visit(nodeId);
  let parentId = document.graph.nodes[nodeId].parentId;
  const parents = new Set<string>();
  while (parentId && !parents.has(parentId)) {
    parents.add(parentId);
    if (document.graph.nodes[parentId]?.locked)
      return { ok: false, reason: "Unlock the object before deleting" };
    parentId = document.graph.nodes[parentId]?.parentId ?? null;
  }
  if ([...ids].some((id) => document.graph.nodes[id]?.locked))
    return { ok: false, reason: "Unlock the object before deleting" };
  return {
    ok: true,
    nodeIds: [...ids],
    fallbackSelectionId:
      document.graph.nodes[nodeId].parentId ??
      STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID,
  };
};

export const applyStudioDeleteTimetableGraphNodes = (
  document: StudioTimetableGraphDocument,
  nodeIds: string[],
): void => {
  const removed = new Set(
    nodeIds.filter(
      (id) =>
        isStudioTimetableGraphNode(document, id) &&
        !document.domains.timetable.nodeExtensions[id]?.generator,
    ),
  );
  const styles = new Set(
    [...removed].map((id) => document.graph.nodes[id]?.styleId),
  );
  document.graph.rootNodeIds = document.graph.rootNodeIds.filter(
    (id) => !removed.has(id),
  );
  document.domains.timetable.rootNodeIds =
    document.domains.timetable.rootNodeIds.filter((id) => !removed.has(id));
  for (const node of Object.values(document.graph.nodes)) {
    node.childIds = node.childIds.filter((id) => !removed.has(id));
    if (node.variantSet)
      for (const [value, root] of Object.entries(node.variantSet.rootByValue))
        if (root && removed.has(root))
          node.variantSet.rootByValue[value] = null;
  }
  for (const id of removed) {
    delete document.graph.nodes[id];
    delete document.domains.timetable.nodeExtensions[id];
  }
  const usedStyles = new Set(
    Object.values(document.graph.nodes).map((node) => node.styleId),
  );
  for (const styleId of styles)
    if (styleId && !usedStyles.has(styleId)) delete document.styles[styleId];
};

export const planStudioDuplicateTimetableGraphNode = (
  document: StudioTimetableGraphDocument,
  nodeId: string | null,
): StudioCommandPlan<{ nodeId: string }> => {
  const deletion = planStudioDeleteTimetableGraphNode(document, nodeId);
  if (!deletion.ok) return deletion;
  const node = document.graph.nodes[nodeId!];
  const parent = node.parentId ? document.graph.nodes[node.parentId] : null;
  if (
    parent?.variantSet &&
    Object.values(parent.variantSet.rootByValue).includes(node.id)
  )
    return {
      ok: false,
      reason: "Select the state owner to duplicate its designs",
    };
  return { ok: true, nodeId: node.id };
};

/** Clone all state branches, remapping node/style/variant references atomically. */
export const applyStudioDuplicateTimetableGraphNode = (
  document: StudioTimetableGraphDocument,
  nodeId: string,
): string => {
  const idMap = new Map<string, string>();
  const allocatedIds = new Set(Object.keys(document.graph.nodes));
  const styleMap = new Map<string, string>();
  const allocate = (prefix: string, occupied: Record<string, unknown>) => {
    let id = createStudioId(prefix);
    while (occupied[id]) id = createStudioId(prefix);
    return id;
  };
  const collect = (id: string) => {
    if (idMap.has(id)) return;
    let newId = createStudioId("node");
    while (allocatedIds.has(newId)) newId = createStudioId("node");
    allocatedIds.add(newId);
    idMap.set(id, newId);
    document.graph.nodes[id].childIds.forEach(collect);
  };
  collect(nodeId);
  const resolve = (id: string) => idMap.get(id) ?? id;
  for (const [id, newId] of idMap) {
    const node = structuredClone(document.graph.nodes[id]);
    node.id = newId;
    node.parentId = node.parentId ? resolve(node.parentId) : null;
    node.childIds = node.childIds.map(resolve);
    if (node.styleId) {
      const previous = node.styleId;
      if (!styleMap.has(previous)) {
        const styleId = allocate("style", document.styles);
        document.styles[styleId] = structuredClone(document.styles[previous]);
        styleMap.set(previous, styleId);
      }
      node.styleId = styleMap.get(previous);
    }
    if (node.variantSet)
      node.variantSet.rootByValue = Object.fromEntries(
        Object.entries(node.variantSet.rootByValue).map(([value, root]) => [
          value,
          root ? resolve(root) : null,
        ]),
      );
    document.graph.nodes[newId] = node;
    document.domains.timetable.nodeExtensions[newId] = structuredClone(
      document.domains.timetable.nodeExtensions[id] ?? {},
    );
  }
  const newRootId = resolve(nodeId);
  const original = document.graph.nodes[nodeId];
  document.graph.nodes[newRootId].label = `${original.label} Copy`;
  const siblings = original.parentId
    ? document.graph.nodes[original.parentId].childIds
    : document.domains.timetable.rootNodeIds;
  siblings.splice(siblings.indexOf(nodeId) + 1, 0, newRootId);
  if (!original.parentId)
    document.graph.rootNodeIds.splice(
      document.graph.rootNodeIds.indexOf(nodeId) + 1,
      0,
      newRootId,
    );
  const target = getStudioTimetableGraphEditTarget(document, newRootId)!;
  if (!isStudioFillParentLayout(target.node.layoutMode)) {
    target.style.left = Number(target.style.left ?? 0) + 24;
    target.style.top = Number(target.style.top ?? 0) + 24;
  }
  return newRootId;
};
