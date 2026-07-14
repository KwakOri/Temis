import type {
  StudioGraphNode,
  StudioNodeId,
  StudioTemplateDocument,
  StudioTimetableCapabilityKey,
  StudioTimetableComponentDefinition,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { cloneStudioComponentVariant } from "@/utils/template-studio/component-variants";
import {
  applyStudioTimetableComponentFrames,
  ensureStudioVariantEntryGroups,
  getStudioTimetableComponentFrame,
} from "@/utils/template-studio/entry-groups";
import { createStudioId } from "@/utils/template-studio/id";
import {
  ensureStudioTimetableCapabilityStatus,
  getStudioTimetableCapabilities,
} from "@/utils/template-studio/timetable-capabilities";
import {
  ensureStudioVariantStatusCardBackgroundAssets,
} from "@/utils/template-studio/status-card-background";

const getNodeSyncKey = (
  node: StudioGraphNode,
  isRoot: boolean,
): string | null => {
  if (isRoot) return "component.root";
  if (node.meta?.exception?.semanticKey) {
    return `semantic:${node.meta.exception.semanticKey}`;
  }
  if (node.meta?.entrySlot) return "entry.group";
  if (node.binding?.kind === "builtinField") {
    return `builtin:${node.binding.fieldId}`;
  }
  if (node.binding && "inputId" in node.binding) {
    return `input:${node.binding.inputId}:${node.binding.kind}`;
  }
  return null;
};

export const ensureStudioVariantSyncKeys = (
  document: StudioTemplateDocument,
  rootNodeId: StudioNodeId,
): boolean => {
  let changed = false;
  const visited = new Set<StudioNodeId>();
  const visit = (nodeId: StudioNodeId, isRoot = false) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = document.graph.nodes[nodeId];
    if (!node) return;

    if (!node.meta?.variantSyncKey) {
      node.meta = {
        ...(node.meta ?? {}),
        variantSyncKey:
          getNodeSyncKey(node, isRoot) ?? createStudioId("variant_sync"),
      };
      changed = true;
    }
    node.childIds.forEach((childId) => visit(childId));
  };
  visit(rootNodeId, true);
  return changed;
};

const getVariantSubtreeNodeIds = (
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

export const getStudioOfflineMemoTextNode = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition,
): StudioGraphNode | null => {
  const variant = component.variants.offlineMemo;
  if (!variant) return null;
  return (
    getVariantSubtreeNodeIds(document, variant.rootNodeId)
      .map((nodeId) => document.graph.nodes[nodeId])
      .find(
        (node) =>
          node?.binding?.kind === "builtinField" &&
          node.binding.fieldId === "day.offline_memo",
      ) ?? null
  );
};

const ensureStudioOfflineMemoTextNode = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition,
): boolean => {
  const variant = component.variants.offlineMemo;
  const root = variant ? document.graph.nodes[variant.rootNodeId] : undefined;
  if (!variant || !root || getStudioOfflineMemoTextNode(document, component)) {
    return false;
  }

  const subtreeNodes = getVariantSubtreeNodeIds(document, root.id).map(
    (nodeId) => document.graph.nodes[nodeId],
  );
  const mainTitleNode = subtreeNodes.find(
    (node) =>
      node?.binding?.kind === "builtinField" &&
      node.binding.fieldId === "entry.main_title",
  );

  if (mainTitleNode) {
    const previousParent = mainTitleNode.parentId
      ? document.graph.nodes[mainTitleNode.parentId]
      : undefined;
    if (previousParent) {
      previousParent.childIds = previousParent.childIds.filter(
        (childId) => childId !== mainTitleNode.id,
      );
    }
    mainTitleNode.parentId = root.id;
    mainTitleNode.label = "offline_memo";
    mainTitleNode.binding = {
      kind: "builtinField",
      fieldId: "day.offline_memo",
    };
    mainTitleNode.meta = {
      ...(mainTitleNode.meta ?? {}),
      variantSyncKey: "builtin:day.offline_memo",
    };
    root.childIds.push(mainTitleNode.id);
    return true;
  }

  const frame = getStudioTimetableComponentFrame(document, component);
  const nodeId = createStudioId("node");
  const styleId = createStudioId("style");
  document.styles[styleId] = {
    position: "absolute",
    left: Math.round(frame.width * 0.18),
    top: Math.round(frame.height * 0.32),
    width: Math.round(frame.width * 0.64),
    height: Math.round(frame.height * 0.36),
    fontSize: 32,
    fontWeight: 700,
    color: "#475569",
    display: "flex",
    alignItems: "center",
  };
  document.graph.nodes[nodeId] = {
    id: nodeId,
    type: "flexibleText",
    label: "offline_memo",
    parentId: root.id,
    childIds: [],
    styleId,
    binding: {
      kind: "builtinField",
      fieldId: "day.offline_memo",
    },
    meta: { variantSyncKey: "builtin:day.offline_memo" },
  };
  root.childIds.push(nodeId);
  return true;
};

const getCapabilitySourceStatus = (
  capabilityKey: StudioTimetableCapabilityKey,
): "online" | "offline" => (capabilityKey === "multi" ? "online" : "offline");

export const ensureStudioCapabilityVariant = (
  document: StudioTemplateDocument,
  capabilityKey: StudioTimetableCapabilityKey,
): string[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];
  const warnings: string[] = [];
  ensureStudioTimetableCapabilityStatus(timetable, capabilityKey);

  Object.values(timetable.components).forEach((component) => {
    const sourceStatusId = getCapabilitySourceStatus(capabilityKey);
    const sourceVariant = component.variants[sourceStatusId];
    if (!sourceVariant) return;
    ensureStudioVariantSyncKeys(document, sourceVariant.rootNodeId);

    if (!component.variants[capabilityKey]) {
      const result = cloneStudioComponentVariant(
        document,
        component.id,
        sourceStatusId,
        capabilityKey,
      );
      if (result.ok) {
        const createdRoot = document.graph.nodes[result.rootNodeId];
        if (createdRoot) {
          createdRoot.label = `${component.label} ${
            capabilityKey === "multi" ? "Multi" : "Offline Memo"
          }`;
        }
        warnings.push(
          `Added independent ${capabilityKey} variant for ${component.label}.`,
        );
      }
    }

    const directVariant = component.variants[capabilityKey];
    if (!directVariant) return;
    ensureStudioVariantSyncKeys(document, directVariant.rootNodeId);
    ensureStudioVariantEntryGroups(document, component, capabilityKey);
    if (
      capabilityKey === "offlineMemo" &&
      ensureStudioOfflineMemoTextNode(document, component)
    ) {
      warnings.push(`Added Offline Memo text for ${component.label}.`);
    }
  });

  applyStudioTimetableComponentFrames(document);
  return warnings;
};

export const ensureStudioIndependentStatusVariants = (
  document: StudioTemplateDocument,
): string[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];
  const warnings: string[] = [];

  Object.values(timetable.components).forEach((component) => {
    const onlineVariant = component.variants.online;
    const offlineVariant = component.variants.offline;
    if (onlineVariant) {
      ensureStudioVariantSyncKeys(document, onlineVariant.rootNodeId);
    }
    if (
      onlineVariant &&
      offlineVariant &&
      onlineVariant.rootNodeId === offlineVariant.rootNodeId
    ) {
      const result = cloneStudioComponentVariant(
        document,
        component.id,
        "online",
        "offline",
      );
      if (result.ok) {
        warnings.push(
          `Separated shared Online and Offline variants for ${component.label}.`,
        );
      }
    }

    Object.values(component.variants).forEach((variant) => {
      ensureStudioVariantSyncKeys(document, variant.rootNodeId);
      ensureStudioVariantEntryGroups(document, component, variant.statusId);
    });
  });

  const capabilities = getStudioTimetableCapabilities(timetable);
  (["multi", "offlineMemo"] as const).forEach((capabilityKey) => {
    if (!capabilities[capabilityKey].enabled) return;
    warnings.push(...ensureStudioCapabilityVariant(document, capabilityKey));
  });
  warnings.push(...ensureStudioVariantStatusCardBackgroundAssets(document));
  applyStudioTimetableComponentFrames(document);
  return warnings;
};

export const getStudioVariantStatusForNode = (
  document: StudioTemplateDocument,
  component: StudioTimetableComponentDefinition,
  nodeId: StudioNodeId,
): StudioTimetableStatusId | null => {
  for (const [statusId, variant] of Object.entries(component.variants)) {
    if (
      getVariantSubtreeNodeIds(document, variant.rootNodeId).includes(nodeId)
    ) {
      return statusId;
    }
  }
  return null;
};
