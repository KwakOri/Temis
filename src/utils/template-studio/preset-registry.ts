import {
  StudioBuiltinFieldId,
  StudioGraphNode,
  StudioNodeId,
  StudioSemanticKey,
  StudioSemanticPresetScope,
  StudioStyleRecord,
  StudioTemplateDocument,
  StudioTimetableCapabilityKey,
  StudioTimetableObjectPresetId,
} from "@/types/template-studio";

import { isStudioTimetableCapabilityEnabled } from "./timetable-capabilities";
import { getStudioTimetableComposition } from "./timetable-composition";

export type StudioPresetCategory =
  "semanticException" | "inputBundle" | "freeObject";

export type StudioPresetCreationRule =
  | {
      mode: "singleton";
    }
  | {
      mode: "repeatable";
      idPrefix: string;
      labelBase: string;
      target: "graphObject" | "inputBundle";
    };

interface StudioPresetDefinitionBase {
  id: string;
  scope: StudioSemanticPresetScope;
  label: string;
  groupLabel: string;
  typeLabel: string;
  category: StudioPresetCategory;
  implemented: boolean;
  singleton?: boolean;
  semanticKey?: StudioSemanticKey;
  capabilityFlags?: StudioTimetableCapabilityKey[];
  visibleInPanel?: boolean;
  description?: string;
}

export interface StudioCardContextObjectPreset extends StudioPresetDefinitionBase {
  scope: "cards";
  kind: "cardContextObject";
  implemented: true;
  semanticKey: StudioSemanticKey;
  fieldId: StudioBuiltinFieldId;
  style: StudioStyleRecord;
}

export interface StudioCardStatusBackgroundPreset extends StudioPresetDefinitionBase {
  scope: "cards";
  kind: "cardStatusBackgroundObject";
  implemented: true;
  semanticKey: "statusCardBackground";
  style: StudioStyleRecord;
}

export type StudioSelectInputBundleKind = "genericSelect" | "stickerSelect";

export interface StudioCardSelectInputBundlePreset extends StudioPresetDefinitionBase {
  scope: "cards";
  kind: "cardSelectInputBundle";
  implemented: true;
  bundleKind: StudioSelectInputBundleKind;
}

export interface StudioTimetableCompositionPreset extends StudioPresetDefinitionBase {
  scope: "timetable";
  kind: "timetableCompositionObject";
  implemented: true;
  semanticKey: StudioSemanticKey;
  timetableObjectPresetId: StudioTimetableObjectPresetId;
}

export interface StudioPlannedPreset extends StudioPresetDefinitionBase {
  kind: "planned";
  implemented: false;
}

export type StudioPresetDefinition =
  | StudioCardContextObjectPreset
  | StudioCardStatusBackgroundPreset
  | StudioCardSelectInputBundlePreset
  | StudioTimetableCompositionPreset
  | StudioPlannedPreset;

export interface StudioPresetListItem {
  definition: StudioPresetDefinition;
  existingTargetId: string | null;
  disabledReason: string | null;
}

export interface StudioPresetGroup {
  title: string;
  presets: StudioPresetListItem[];
}

export interface StudioPresetLookupContext {
  cardRootNodeId?: StudioNodeId | null;
}

const STUDIO_CAPABILITY_LABELS: Record<StudioTimetableCapabilityKey, string> = {
  multi: "Multi",
  offlineMemo: "Offline memo",
};

export const STUDIO_PRESET_DEFINITIONS: readonly StudioPresetDefinition[] = [
  {
    id: "dayCards",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Day Card Containers",
    groupLabel: "Generated",
    typeLabel: "Generated",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "dayCardContainers",
    timetableObjectPresetId: "dayCards",
    visibleInPanel: false,
    description:
      "Generated weekly card region exposed as a single timetable layer.",
  },
  {
    id: "board",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Board",
    groupLabel: "Background",
    typeLabel: "Image",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "board",
    timetableObjectPresetId: "board",
    description:
      "Single full-canvas background image fixed by the template creator.",
  },
  {
    id: "weekDates",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Week Dates",
    groupLabel: "Text",
    typeLabel: "Label",
    category: "semanticException",
    implemented: true,
    singleton: false,
    semanticKey: "weekDates",
    timetableObjectPresetId: "weekDates",
    description:
      "Repeatable week-date label for independently placing start and end date parts.",
  },
  {
    id: "weeklyMemo",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Weekly Memo",
    groupLabel: "Structured Blocks",
    typeLabel: "Block",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "weeklyMemo",
    timetableObjectPresetId: "weeklyMemo",
  },
  {
    id: "profileBlock",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Profile Block",
    groupLabel: "Structured Blocks",
    typeLabel: "Block",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "profileBlock",
    timetableObjectPresetId: "profileBlock",
    description:
      "Timetable-only profile image block with fixed structure and editable slots.",
  },
  {
    id: "artistProfileText",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Artist",
    groupLabel: "Structured Blocks",
    typeLabel: "Block",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "artistProfileText",
    timetableObjectPresetId: "artistProfileText",
    description:
      "Artist text and background asset exposed as independently editable children.",
  },
  {
    id: "topObject",
    scope: "timetable",
    kind: "timetableCompositionObject",
    label: "Top Object",
    groupLabel: "Structured Blocks",
    typeLabel: "Image",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "topObject",
    timetableObjectPresetId: "topObject",
    description:
      "Optional top-area visual preset with fixed structure and editable asset slot.",
  },
  {
    id: "dayLabel",
    scope: "cards",
    kind: "cardContextObject",
    label: "Day Label",
    groupLabel: "Context Objects",
    typeLabel: "Built-in",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "dayLabel",
    fieldId: "day.label",
    style: {
      position: "absolute",
      left: 56,
      top: 54,
      width: 180,
      height: 42,
      fontSize: 26,
      fontWeight: 800,
      color: "#172033",
      display: "flex",
      alignItems: "center",
    },
  },
  {
    id: "dayDate",
    scope: "cards",
    kind: "cardContextObject",
    label: "Day Date",
    groupLabel: "Context Objects",
    typeLabel: "Built-in",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "dayDate",
    fieldId: "day.date",
    style: {
      position: "absolute",
      left: 56,
      top: 104,
      width: 180,
      height: 34,
      fontSize: 18,
      fontWeight: 800,
      color: "#94a3b8",
      display: "flex",
      alignItems: "center",
    },
  },
  {
    id: "entryStatusLabel",
    scope: "cards",
    kind: "cardContextObject",
    label: "Status Label",
    groupLabel: "Context Objects",
    typeLabel: "Built-in",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "entryStatusLabel",
    fieldId: "entry.status_label",
    style: {
      position: "absolute",
      left: 322,
      top: 226,
      width: 180,
      height: 34,
      fontSize: 16,
      fontWeight: 800,
      color: "#2563eb",
      display: "flex",
      alignItems: "center",
    },
  },
  {
    id: "statusCardBackground",
    scope: "cards",
    kind: "cardStatusBackgroundObject",
    label: "Status Background",
    groupLabel: "Context Objects",
    typeLabel: "Background",
    category: "semanticException",
    implemented: true,
    singleton: true,
    semanticKey: "statusCardBackground",
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 780,
      height: 500,
      backgroundColor: "transparent",
      borderRadius: 24,
      overflow: "hidden",
    },
    description:
      "Card-level status formatting surface for online/offline/multi variants.",
  },
  {
    id: "selectInputBundle",
    scope: "cards",
    kind: "cardSelectInputBundle",
    bundleKind: "genericSelect",
    label: "Select Bundle",
    groupLabel: "Input Bundles",
    typeLabel: "Select",
    category: "inputBundle",
    implemented: true,
    singleton: false,
    description:
      "Create a select input that can drive text and image consumers.",
  },
  {
    id: "stickerSelect",
    scope: "cards",
    kind: "cardSelectInputBundle",
    bundleKind: "stickerSelect",
    label: "Sticker Select",
    groupLabel: "Input Bundles",
    typeLabel: "Select",
    category: "inputBundle",
    implemented: true,
    singleton: false,
    description:
      "Create a sticker-oriented select input with label and image consumers.",
  },
];

export const isStudioCardContextObjectPreset = (
  preset: StudioPresetDefinition,
): preset is StudioCardContextObjectPreset =>
  preset.kind === "cardContextObject";

export const isStudioCardStatusBackgroundPreset = (
  preset: StudioPresetDefinition,
): preset is StudioCardStatusBackgroundPreset =>
  preset.kind === "cardStatusBackgroundObject";

export const isStudioCardSelectInputBundlePreset = (
  preset: StudioPresetDefinition,
): preset is StudioCardSelectInputBundlePreset =>
  preset.kind === "cardSelectInputBundle";

export const isStudioTimetableCompositionPreset = (
  preset: StudioPresetDefinition,
): preset is StudioTimetableCompositionPreset =>
  preset.kind === "timetableCompositionObject";

export const getStudioPresetExistingTargetId = (
  document: StudioTemplateDocument,
  preset: StudioPresetDefinition,
  context: StudioPresetLookupContext = {},
): string | null => {
  if (!preset.singleton) return null;
  if (!preset.semanticKey) return null;

  if (preset.scope === "cards") {
    const graphNodes = context.cardRootNodeId
      ? (() => {
          const nodes: StudioGraphNode[] = [];
          const visitedNodeIds = new Set<StudioNodeId>();
          const visit = (nodeId: StudioNodeId) => {
            if (visitedNodeIds.has(nodeId)) return;
            visitedNodeIds.add(nodeId);
            const node = document.graph.nodes[nodeId];
            if (!node) return;
            nodes.push(node);
            node.childIds.forEach(visit);
          };
          visit(context.cardRootNodeId);
          return nodes;
        })()
      : Object.values(document.graph.nodes);

    return (
      graphNodes.find(
        (node) =>
          node.meta?.exception?.scope === "cards" &&
          node.meta.exception.semanticKey === preset.semanticKey,
      )?.id ?? null
    );
  }

  const composition = getStudioTimetableComposition(
    document.domains?.timetable,
  );
  return (
    Object.values(composition.objects).find(
      (object) =>
        object.meta?.exception?.scope === "timetable" &&
        object.meta.exception.semanticKey === preset.semanticKey,
    )?.id ?? null
  );
};

export const getStudioPresetDisabledReason = (
  document: StudioTemplateDocument,
  preset: StudioPresetDefinition,
): string | null => {
  if (!preset.implemented) return "Planned";

  const missingCapability = preset.capabilityFlags?.find(
    (capabilityKey) =>
      !isStudioTimetableCapabilityEnabled(
        document.domains?.timetable,
        capabilityKey,
      ),
  );

  if (missingCapability) {
    return `Enable ${STUDIO_CAPABILITY_LABELS[missingCapability]}`;
  }

  return null;
};

export const getStudioPresetCreationRule = (
  preset: StudioPresetDefinition,
): StudioPresetCreationRule => {
  if (preset.singleton) return { mode: "singleton" };

  if (isStudioCardSelectInputBundlePreset(preset)) {
    return {
      mode: "repeatable",
      idPrefix: preset.bundleKind === "stickerSelect" ? "sticker" : "select",
      labelBase:
        preset.bundleKind === "stickerSelect"
          ? "Entry Sticker"
          : "Entry Select",
      target: "inputBundle",
    };
  }

  return {
    mode: "repeatable",
    idPrefix: preset.id,
    labelBase: preset.label,
    target: "graphObject",
  };
};

export const getStudioPresetDefinitionsForScope = (
  scope: StudioSemanticPresetScope,
): StudioPresetDefinition[] =>
  STUDIO_PRESET_DEFINITIONS.filter(
    (definition) =>
      definition.scope === scope && definition.visibleInPanel !== false,
  );

export const getStudioPresetGroups = (
  document: StudioTemplateDocument,
  scope: StudioSemanticPresetScope,
  context: StudioPresetLookupContext = {},
): StudioPresetGroup[] => {
  const groups: StudioPresetGroup[] = [];

  getStudioPresetDefinitionsForScope(scope).forEach((definition) => {
    let group = groups.find(
      (candidate) => candidate.title === definition.groupLabel,
    );

    if (!group) {
      group = {
        title: definition.groupLabel,
        presets: [],
      };
      groups.push(group);
    }

    group.presets.push({
      definition,
      existingTargetId: getStudioPresetExistingTargetId(
        document,
        definition,
        context,
      ),
      disabledReason: getStudioPresetDisabledReason(document, definition),
    });
  });

  return groups;
};
