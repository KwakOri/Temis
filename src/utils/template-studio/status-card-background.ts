import {
  StudioGraphNode,
  StudioNodeId,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableAssetSlot,
  StudioTimetableStatusId,
} from "@/types/template-studio";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";
import {
  createStudioSemanticAssetSlot,
  createStudioSemanticImageInputSlot,
  createStudioSemanticSlotRecord,
} from "@/utils/template-studio/semantic-slots";

export const isStudioStatusCardBackgroundNode = (
  node: StudioGraphNode | null | undefined,
): boolean =>
  node?.meta?.exception?.scope === "cards" &&
  node.meta.exception.semanticKey === "statusCardBackground";

export const createStudioStatusCardBackgroundExceptionMeta = (
  assetSlot?: StudioTimetableAssetSlot | null,
) => ({
  semanticKey: "statusCardBackground" as const,
  scope: "cards" as const,
  presetId: "statusCardBackground",
  lockedStructure: true,
  singleton: true,
  builtInBindings: {
    status: "entry.status" as const,
  },
  editableSlots: createStudioSemanticSlotRecord({
    asset: assetSlot?.inputId
      ? createStudioSemanticImageInputSlot({
          inputId: assetSlot.inputId,
          fit: assetSlot.fit ?? "cover",
        })
      : createStudioSemanticAssetSlot({
          assetId: assetSlot?.assetId,
          fit: assetSlot?.fit ?? "cover",
        }),
  }),
});

export const setStudioStatusCardBackgroundAssetSlot = (
  node: StudioGraphNode,
  assetId: string | null,
  fit: StudioTimetableAssetSlot["fit"] = "cover",
) => {
  if (assetId) {
    node.assetSlots = {
      asset: {
        assetId,
        fit,
      },
    };
  } else {
    node.assetSlots = undefined;
  }

  node.meta = {
    ...node.meta,
    exception: createStudioStatusCardBackgroundExceptionMeta(
      node.assetSlots?.asset,
    ),
  };
};

const getStudioGraphSubtreeNodeIds = (
  document: StudioTemplateDocument,
  rootNodeId: StudioNodeId,
): StudioNodeId[] => {
  const nodeIds: StudioNodeId[] = [];
  const visitedNodeIds = new Set<StudioNodeId>();
  const visit = (nodeId: StudioNodeId) => {
    if (visitedNodeIds.has(nodeId)) return;
    visitedNodeIds.add(nodeId);
    const node = document.graph.nodes[nodeId];
    if (!node) return;
    nodeIds.push(nodeId);
    node.childIds.forEach(visit);
  };

  visit(rootNodeId);
  return nodeIds;
};

const resolveStudioLegacyStatusCardBackgroundSlot = (
  document: StudioTemplateDocument,
  node: StudioGraphNode,
  statusId: StudioTimetableStatusId | null,
  componentDefaultStatusId?: StudioTimetableStatusId,
): StudioTimetableAssetSlot | null => {
  const timetable = document.domains?.timetable;
  const status = statusId ? timetable?.statuses[statusId] : null;
  const candidates = [
    statusId,
    status?.fallbackStatusId,
    status?.baseStatus,
    componentDefaultStatusId,
    timetable?.defaultEntryStatusId,
    "online",
  ].filter(Boolean) as string[];

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);

    const slot = node.assetSlots?.[candidate];
    if (slot?.assetId || slot?.inputId) return slot;
  }

  return null;
};

export const ensureStudioVariantStatusCardBackgroundAssets = (
  document: StudioTemplateDocument,
): string[] => {
  const timetable = document.domains?.timetable;
  if (!timetable) return [];

  let migratedNodeCount = 0;
  Object.values(timetable.components).forEach((component) => {
    Object.entries(component.variants).forEach(([statusId, variant]) => {
      getStudioGraphSubtreeNodeIds(document, variant.rootNodeId)
        .map((nodeId) => document.graph.nodes[nodeId])
        .filter(
          (node): node is StudioGraphNode =>
            Boolean(node) && isStudioStatusCardBackgroundNode(node),
        )
        .forEach((node) => {
          const editableSlots = node.meta?.exception?.editableSlots;
          const hasLegacyStatusSlots = Object.keys(node.assetSlots ?? {}).some(
            (slotName) => slotName !== "asset",
          );
          const hasLegacyMeta = Boolean(editableSlots?.statusAssets);
          if (!hasLegacyStatusSlots && !hasLegacyMeta) return;

          const assetSlot =
            node.assetSlots?.asset ??
            resolveStudioLegacyStatusCardBackgroundSlot(
              document,
              node,
              statusId,
              component.defaultStatusId,
            );
          node.assetSlots = assetSlot
            ? { asset: { ...assetSlot, fit: assetSlot.fit ?? "cover" } }
            : undefined;
          node.meta = {
            ...node.meta,
            exception: createStudioStatusCardBackgroundExceptionMeta(
              node.assetSlots?.asset,
            ),
          };
          migratedNodeCount += 1;
        });
    });
  });

  return migratedNodeCount > 0
    ? [
        `Converted ${migratedNodeCount} status background asset map${
          migratedNodeCount === 1 ? "" : "s"
        } to variant-local assets.`,
      ]
    : [];
};

export const ensureStudioStatusCardBackgroundBaseColors = (
  document: StudioTemplateDocument,
): string[] => {
  let migratedNodeCount = 0;

  Object.values(document.graph.nodes).forEach((node) => {
    if (!isStudioStatusCardBackgroundNode(node) || !node.styleId) return;
    const style = document.styles[node.styleId];
    if (!style) return;
    const backgroundColor = String(style.backgroundColor ?? "")
      .trim()
      .toLowerCase();
    if (backgroundColor !== "#ffffff" && backgroundColor !== "#fff") return;

    style.backgroundColor = "transparent";
    migratedNodeCount += 1;
  });

  return migratedNodeCount > 0
    ? [
        `Removed the legacy white base color from ${migratedNodeCount} status background object${
          migratedNodeCount === 1 ? "" : "s"
        }.`,
      ]
    : [];
};

export const getStudioRuntimeEntryStatusId = (
  values: StudioRuntimeValues,
  context: StudioRuntimeContext = {},
): string | null => {
  if (!context.dayId || context.entryIndex === undefined) return null;
  return (
    values.timetable.entriesByDay[context.dayId]?.[context.entryIndex]
      ?.statusId ?? null
  );
};

export const resolveStudioStatusCardBackgroundSlot = (
  document: StudioTemplateDocument,
  values: StudioRuntimeValues,
  context: StudioRuntimeContext | undefined,
  node: StudioGraphNode,
): StudioTimetableAssetSlot | null => {
  const variantAssetSlot = node.assetSlots?.asset;
  if (variantAssetSlot?.assetId || variantAssetSlot?.inputId) {
    return variantAssetSlot;
  }

  const statusId = getStudioRuntimeEntryStatusId(values, context);
  return resolveStudioLegacyStatusCardBackgroundSlot(
    document,
    node,
    statusId,
  );
};
