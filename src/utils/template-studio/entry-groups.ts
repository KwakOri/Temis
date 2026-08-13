import type {
  StudioGraphNode,
  StudioNodeId,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableComponentDefinition,
  StudioTimetableComponentFrame,
  StudioTimetableComponentVariant,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { createStudioId } from "@/utils/template-studio/id";
import type { StudioRuntimeContext } from "@/utils/template-studio/input-values";
import { isStudioFillParentLayout } from "@/utils/template-studio/object-layout";
import { isStudioTimetableStatusAvailable } from "@/utils/template-studio/timetable-capabilities";

export const STUDIO_MULTI_ENTRY_SLOT_COUNT = 2;

const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getNumericStyleValue = (
  style: StudioStyleRecord | undefined,
  key: string,
  fallback: number,
) => {
  const value = style?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const getVariantRootFrame = (
  document: StudioTemplateDocument,
  variant: StudioTimetableComponentVariant | undefined,
): StudioTimetableComponentFrame | null => {
  const root = variant ? document.graph.nodes[variant.rootNodeId] : undefined;
  const style = root?.styleId ? document.styles[root.styleId] : undefined;
  if (!root) return null;

  return {
    left: getNumericStyleValue(style, "left", 0),
    top: getNumericStyleValue(style, "top", 0),
    width: Math.max(
      1,
      getNumericStyleValue(style, "width", document.canvas.width),
    ),
    height: Math.max(
      1,
      getNumericStyleValue(style, "height", document.canvas.height),
    ),
  };
};

export const getStudioTimetableComponentFrame = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition | undefined,
): StudioTimetableComponentFrame => {
  const defaultVariant = component
    ? (component.variants[component.defaultStatusId] ??
      Object.values(component.variants)[0])
    : undefined;
  const defaultRoot = defaultVariant
    ? document.graph.nodes[defaultVariant.rootNodeId]
    : undefined;

  if (isStudioFillParentLayout(defaultRoot?.layoutMode)) {
    return {
      left: 0,
      top: 0,
      width: Math.max(1, document.canvas.width),
      height: Math.max(1, document.canvas.height),
    };
  }

  if (component?.frame) {
    return {
      left: component.frame.left,
      top: component.frame.top,
      width: Math.max(1, component.frame.width),
      height: Math.max(1, component.frame.height),
    };
  }

  return (
    getVariantRootFrame(document, defaultVariant) ?? {
      left: 0,
      top: 0,
      width: Math.max(1, document.canvas.width),
      height: Math.max(1, document.canvas.height),
    }
  );
};

const ensureNodeStyle = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
): StudioStyleRecord => {
  if (!node.styleId) {
    node.styleId = createStudioId("style");
    document.styles[node.styleId] = {};
  }
  document.styles[node.styleId] ??= {};
  return document.styles[node.styleId];
};

export const applyStudioTimetableComponentFrames = (
  document: StudioTemplateDocument,
) => {
  const timetable = document.domains?.timetable;
  if (!timetable) return;

  Object.values(timetable.components).forEach((component) => {
    const frame = getStudioTimetableComponentFrame(document, component);
    component.frame = frame;

    new Set(
      Object.values(component.variants).map((variant) => variant.rootNodeId),
    ).forEach((rootNodeId) => {
      const root = document.graph.nodes[rootNodeId];
      if (!root) return;
      const style = ensureNodeStyle(document, root);
      Object.assign(style, frame);
    });
  });
};

const nodeConsumesEntryScope = (
  document: StudioTemplateDocument,
  nodeId: StudioNodeId,
  visited = new Set<StudioNodeId>(),
): boolean => {
  if (visited.has(nodeId)) return false;
  visited.add(nodeId);
  const node = document.graph.nodes[nodeId];
  if (!node) return false;

  if (
    node.binding?.kind === "builtinField" &&
    node.binding.fieldId.startsWith("entry.")
  ) {
    return true;
  }

  if (
    node.binding &&
    "inputId" in node.binding &&
    document.inputs[node.binding.inputId]?.scope === "entry"
  ) {
    return true;
  }

  if (
    Object.values(node.assetSlots ?? {}).some(
      (slot) =>
        slot.inputId && document.inputs[slot.inputId]?.scope === "entry",
    )
  ) {
    return true;
  }

  return node.childIds.some((childId) =>
    nodeConsumesEntryScope(document, childId, visited),
  );
};

export const getStudioVariantEntryGroups = (
  document: StudioTemplateDocument,
  variant: StudioTimetableComponentVariant | undefined,
): StudioGraphNode[] => {
  const root = variant ? document.graph.nodes[variant.rootNodeId] : undefined;
  if (!root) return [];

  return root.childIds
    .map((nodeId) => document.graph.nodes[nodeId])
    .filter((node): node is StudioGraphNode => Boolean(node?.meta?.entrySlot))
    .sort(
      (left, right) =>
        (left.meta?.entrySlot?.index ?? 0) -
        (right.meta?.entrySlot?.index ?? 0),
    );
};

const createEntryGroup = (
  document: StudioTemplateDocument,
  root: StudioGraphNode,
  frame: StudioTimetableComponentFrame,
  childIds: StudioNodeId[],
  index: 0 | 1,
) => {
  const groupId = createStudioId("entry_group");
  const styleId = createStudioId("style");
  document.styles[styleId] = {
    position: "absolute",
    left: 0,
    top: 0,
    width: frame.width,
    height: frame.height,
    overflow: "visible",
  };
  document.graph.nodes[groupId] = {
    id: groupId,
    type: "group",
    label: `Entry Group ${index + 1}`,
    parentId: root.id,
    childIds,
    styleId,
    meta: { entrySlot: { index } },
  };
  childIds.forEach((childId) => {
    const child = document.graph.nodes[childId];
    if (child) child.parentId = groupId;
  });
  return document.graph.nodes[groupId];
};

const cloneNodeSubtree = (
  document: StudioTemplateDocument,
  sourceNodeId: StudioNodeId,
  parentId: StudioNodeId | null,
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
    .map((childId) => cloneNodeSubtree(document, childId, nodeId))
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

const compactMultiGroups = (
  document: StudioTemplateDocument,
  groups: StudioGraphNode[],
  frame: StudioTimetableComponentFrame,
  gap: number,
) => {
  const safeGap = Math.min(Math.max(0, gap), Math.max(0, frame.height - 2));
  const slotHeight = Math.max(1, (frame.height - safeGap) / 2);
  const scaleY = slotHeight / Math.max(1, frame.height);

  groups.forEach((group, groupIndex) => {
    const style = ensureNodeStyle(document, group);
    Object.assign(style, {
      position: "absolute",
      left: 0,
      top: groupIndex * (slotHeight + safeGap),
      width: frame.width,
      height: slotHeight,
      overflow: "hidden",
    });
    group.childIds.forEach((childId) => {
      const child = document.graph.nodes[childId];
      if (!child?.styleId) return;
      const childStyle = document.styles[child.styleId] ?? {};
      document.styles[child.styleId] = {
        ...childStyle,
        top:
          typeof childStyle.top === "number"
            ? Number((childStyle.top * scaleY).toFixed(2))
            : childStyle.top,
        height:
          typeof childStyle.height === "number"
            ? Number((childStyle.height * scaleY).toFixed(2))
            : childStyle.height,
        fontSize:
          typeof childStyle.fontSize === "number"
            ? Number((childStyle.fontSize * scaleY).toFixed(2))
            : childStyle.fontSize,
      };
    });
  });
};

export const ensureStudioVariantEntryGroups = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition,
  statusId: StudioTimetableStatusId,
): boolean => {
  const variant = component.variants[statusId];
  const root = variant ? document.graph.nodes[variant.rootNodeId] : undefined;
  if (!variant || !root) return false;
  const frame = getStudioTimetableComponentFrame(document, component);
  let changed = false;
  let groups = getStudioVariantEntryGroups(document, variant);

  if (groups.length === 0) {
    const entryChildIds = root.childIds.filter((childId) =>
      nodeConsumesEntryScope(document, childId),
    );
    const firstIndex =
      entryChildIds.length > 0
        ? Math.min(
            ...entryChildIds.map((childId) => root.childIds.indexOf(childId)),
          )
        : root.childIds.length;
    root.childIds = root.childIds.filter(
      (childId) => !entryChildIds.includes(childId),
    );
    const group = createEntryGroup(document, root, frame, entryChildIds, 0);
    root.childIds.splice(Math.max(0, firstIndex), 0, group.id);
    groups = [group];
    changed = true;
  }

  if (statusId === "multi" && groups.length === 1) {
    const clonedGroupId = cloneNodeSubtree(document, groups[0].id, root.id);
    const clonedGroup = clonedGroupId
      ? document.graph.nodes[clonedGroupId]
      : undefined;
    if (clonedGroup) {
      clonedGroup.label = "Entry Group 2";
      clonedGroup.meta = {
        ...(clonedGroup.meta ?? {}),
        entrySlot: { index: 1 },
      };
      root.childIds.push(clonedGroup.id);
      compactMultiGroups(
        document,
        [groups[0], clonedGroup],
        frame,
        document.domains?.timetable?.dayCardsLayout?.entryGap ?? 0,
      );
      groups = [groups[0], clonedGroup];
      changed = true;
    }
  }

  return changed;
};

export const ensureStudioTimetableEntryGroupContract = (
  document: StudioTemplateDocument,
): string[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];
  const warnings: string[] = [];
  timetable.maxEntriesPerDay = STUDIO_MULTI_ENTRY_SLOT_COUNT;

  Object.values(timetable.components).forEach((component) => {
    if (!component.frame) {
      component.frame = getStudioTimetableComponentFrame(document, component);
      warnings.push(`Added shared frame for ${component.label}.`);
    }
    Object.keys(component.variants).forEach((statusId) => {
      if (
        ensureStudioVariantEntryGroups(document, component, statusId) &&
        statusId === "multi"
      ) {
        warnings.push(
          `Added fixed two-slot Entry Groups for ${component.label}.`,
        );
      }
    });
  });

  applyStudioTimetableComponentFrames(document);
  return warnings;
};

export const getStudioNodeRuntimeContext = (
  node: StudioGraphNode,
  inheritedContext: StudioRuntimeContext | undefined,
): StudioRuntimeContext | undefined => {
  const slotIndex = node.meta?.entrySlot?.index;
  if (slotIndex === undefined) return inheritedContext;
  return { ...(inheritedContext ?? {}), entryIndex: slotIndex };
};

export const resolveStudioTimetableDayVariantStatus = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  dayId: string,
): StudioTimetableStatusId => {
  const timetable = document.domains?.timetable;
  const entries = values.timetable.entriesByDay[dayId] ?? [];
  if (
    entries.length > 1 &&
    isStudioTimetableStatusAvailable(timetable, "multi")
  ) {
    return "multi";
  }
  return entries[0]?.statusId ?? timetable?.defaultEntryStatusId ?? "online";
};
