import {
  StudioGraphNode,
  StudioRuntimeValues,
  StudioTemplateDocument,
  StudioTimetableAssetSlot,
  StudioTimetableStatusDefinition,
} from "@/types/template-studio";
import { type StudioRuntimeContext } from "@/utils/template-studio/input-values";
import { createStudioSemanticSlotRecord } from "@/utils/template-studio/semantic-slots";
import { getStudioAvailableTimetableStatuses } from "@/utils/template-studio/timetable-capabilities";

const STATUS_CARD_BACKGROUND_STATUS_ORDER = [
  "online",
  "offline",
  "multi",
  "offlineMemo",
];

export const isStudioStatusCardBackgroundNode = (
  node: StudioGraphNode | null | undefined,
): boolean =>
  node?.meta?.exception?.scope === "cards" &&
  node.meta.exception.semanticKey === "statusCardBackground";

export const createStudioStatusCardBackgroundExceptionMeta = (
  assetSlots?: StudioGraphNode["assetSlots"],
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
    statusAssets: {
      source: "status-assets" as const,
      slots: assetSlots ?? {},
    },
  }),
});

export const getStudioStatusCardBackgroundStatuses = (
  document: StudioTemplateDocument,
): StudioTimetableStatusDefinition[] => {
  const statuses = getStudioAvailableTimetableStatuses(document);
  const orderIndex = (statusId: string) => {
    const index = STATUS_CARD_BACKGROUND_STATUS_ORDER.indexOf(statusId);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...statuses].sort(
    (left, right) =>
      orderIndex(left.id) - orderIndex(right.id) ||
      left.label.localeCompare(right.label),
  );
};

export const setStudioStatusCardBackgroundAssetSlot = (
  node: StudioGraphNode,
  statusId: string,
  assetId: string | null,
  fit: StudioTimetableAssetSlot["fit"] = "cover",
) => {
  const assetSlots = {
    ...(node.assetSlots ?? {}),
  };

  if (assetId) {
    assetSlots[statusId] = {
      assetId,
      fit,
    };
  } else {
    delete assetSlots[statusId];
  }

  node.assetSlots = Object.keys(assetSlots).length > 0 ? assetSlots : undefined;
  node.meta = {
    ...node.meta,
    exception: createStudioStatusCardBackgroundExceptionMeta(node.assetSlots),
  };
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
  const statusId = getStudioRuntimeEntryStatusId(values, context);
  const timetable = document.domains?.timetable;
  const status = statusId ? timetable?.statuses[statusId] : null;
  const candidates = [
    statusId,
    status?.fallbackStatusId,
    status?.baseStatus,
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
