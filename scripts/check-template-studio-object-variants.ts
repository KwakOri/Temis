import assert from "node:assert/strict";

import type {
  StudioRuntimeValues,
} from "../src/types/template-studio";
import {
  migrateStudioTemplateDocument,
} from "../src/utils/template-studio/migrations";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { cloneStudioComponentVariant } from "../src/utils/template-studio/component-variants";
import {
  createStudioStructuredTextPresetObjects,
  getStudioTimetableObjectRenderableChildIds,
  getStudioTimetableObjectRuntimeVariantValue,
} from "./helpers/studio-timetable-recipe";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "../src/utils/template-studio/text-wrap";
import {
  getStudioNodeRuntimeContext,
  getStudioVariantEntryGroups,
} from "../src/utils/template-studio/entry-groups";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import { resolveStudioBuiltinFieldValue } from "../src/utils/template-studio/builtin-fields";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  ensureStudioCapabilityVariant,
  getStudioOfflineMemoTextNode,
} from "../src/utils/template-studio/status-variants";
import {
  isStudioStatusCardBackgroundNode,
  setStudioStatusCardBackgroundAssetSlot,
} from "../src/utils/template-studio/status-card-background";
import {
  applyStudioVariantStyle,
  pickStudioVariantStyleScope,
} from "../src/utils/template-studio/variant-style-propagation";
import {
  getStudioPresetExistingTargetId,
  isStudioCardStatusBackgroundPreset,
  STUDIO_PRESET_DEFINITIONS,
} from "../src/utils/template-studio/preset-registry";

const findStatusBackgroundNode = (
  document: ReturnType<typeof createSampleStudioDocument>,
  rootNodeId: string,
) => {
  const queue = [rootNodeId];
  const visitedNodeIds = new Set<string>();
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId || visitedNodeIds.has(nodeId)) continue;
    visitedNodeIds.add(nodeId);
    const node = document.graph.nodes[nodeId];
    if (!node) continue;
    if (isStudioStatusCardBackgroundNode(node)) return node;
    queue.push(...node.childIds);
  }
  return null;
};

const stateInputId = "artist-state";
const structured = createStudioStructuredTextPresetObjects(
  "artistProfileText",
  { rootObjectIds: [], objects: {} },
  { variantInputId: stateInputId },
);
const objects = Object.fromEntries(
  [structured.group, ...structured.children].map((object) => [
    object.id,
    object,
  ]),
);
const [onRootId, offRootId] = structured.group.childIds ?? [];

assert.equal(structured.group.variantSet?.inputId, stateInputId);
assert.deepEqual(
  getStudioTimetableObjectRenderableChildIds(structured.group),
  [onRootId],
  "The authoring tree must start on the On state.",
);
assert.equal(
  objects[offRootId].hidden,
  true,
  "The Off state must start hidden until it is authored.",
);
const onTextId = objects[onRootId].childIds?.find(
  (objectId) => objects[objectId].structuredRole === "text",
);
const offTextId = objects[offRootId].childIds?.find(
  (objectId) => objects[objectId].structuredRole === "text",
);
assert.ok(onTextId && offTextId);
assert.notEqual(
  objects[onTextId].style,
  objects[offTextId].style,
  "On and Off objects must not share mutable style records.",
);

const editingValue = "off";
assert.deepEqual(
  getStudioTimetableObjectRenderableChildIds(structured.group, editingValue),
  [offRootId],
  "Changing the authoring state must select the Off subtree.",
);

structured.group.variantSet!.rootByValue.off = null;
assert.deepEqual(
  getStudioTimetableObjectRenderableChildIds(structured.group, editingValue),
  [],
  "An empty state must not fall back to another state's children.",
);
structured.group.variantSet!.rootByValue.off = offRootId;

const runtimeDocument = createSampleStudioDocument();
runtimeDocument.inputs[stateInputId] = {
  id: stateInputId,
  type: "select",
  scope: "global",
  label: "Artist Status",
  defaultValue: "on",
  options: [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ],
};
const runtimeValues: StudioRuntimeValues = {
  global: { [stateInputId]: "off" },
  days: {},
  entries: {},
  timetable: { entriesByDay: {} },
};
assert.equal(
  getStudioTimetableObjectRuntimeVariantValue(
    runtimeDocument,
    runtimeValues,
    structured.group,
  ),
  "off",
  "Runtime state must come from the bound select input.",
);

assert.equal(migrateStudioTemplateDocument(createSampleStudioDocument()).ok, false,
  "Legacy timetable recipes are rejected.");

const cardVariantDocument = createSampleStudioDocument();
const cardComponent =
  cardVariantDocument.domains?.timetable?.components.defaultEntryCard;
assert.ok(cardComponent);
assert.notEqual(
  cardComponent.variants.online.rootNodeId,
  cardComponent.variants.offline.rootNodeId,
  "The sample must start with independent Online/Offline layouts.",
);
const onlineBackground = findStatusBackgroundNode(
  cardVariantDocument,
  cardComponent.variants.online.rootNodeId,
);
const offlineBackground = findStatusBackgroundNode(
  cardVariantDocument,
  cardComponent.variants.offline.rootNodeId,
);
assert.ok(onlineBackground && offlineBackground);
assert.notEqual(onlineBackground.id, offlineBackground.id);
assert.equal(
  cardVariantDocument.styles[onlineBackground.styleId!]?.backgroundColor,
  "transparent",
);
assert.equal(
  cardVariantDocument.styles[offlineBackground.styleId!]?.backgroundColor,
  "transparent",
);
assert.deepEqual(Object.keys(onlineBackground.assetSlots ?? {}), ["asset"]);
assert.deepEqual(Object.keys(offlineBackground.assetSlots ?? {}), ["asset"]);
setStudioStatusCardBackgroundAssetSlot(onlineBackground, "asset_b2", "contain");
assert.equal(onlineBackground.assetSlots?.asset?.assetId, "asset_b2");
assert.equal(onlineBackground.assetSlots?.asset?.fit, "contain");
assert.equal(
  offlineBackground.assetSlots?.asset?.assetId,
  "asset_background",
  "Editing the Online background must not mutate the Offline variant.",
);

const statusBackgroundPreset = STUDIO_PRESET_DEFINITIONS.find(
  (definition) => definition.id === "statusCardBackground",
);
assert.ok(
  statusBackgroundPreset &&
    isStudioCardStatusBackgroundPreset(statusBackgroundPreset),
);
assert.equal(statusBackgroundPreset.style.backgroundColor, "transparent");
assert.equal(
  getStudioPresetExistingTargetId(cardVariantDocument, statusBackgroundPreset, {
    cardRootNodeId: cardComponent.variants.online.rootNodeId,
  }),
  onlineBackground.id,
);
assert.equal(
  getStudioPresetExistingTargetId(cardVariantDocument, statusBackgroundPreset, {
    cardRootNodeId: cardComponent.variants.offline.rootNodeId,
  }),
  offlineBackground.id,
  "Card singleton lookup must stay inside the selected status variant.",
);

const sourceRootId = cardComponent.variants.online.rootNodeId;
const sourceRoot = cardVariantDocument.graph.nodes[sourceRootId];
assert.ok(sourceRoot);
const sourceStyleId = sourceRoot.styleId;
assert.ok(sourceStyleId);

const cloneResult = cloneStudioComponentVariant(
  cardVariantDocument,
  cardComponent.id,
  "online",
  "offline",
);
if (!cloneResult.ok) throw new Error(cloneResult.reason);
assert.equal(cloneResult.ok, true);
assert.notEqual(cloneResult.rootNodeId, sourceRootId);
assert.equal(cardComponent.variants.offline.rootNodeId, cloneResult.rootNodeId);
const clonedRoot = cardVariantDocument.graph.nodes[cloneResult.rootNodeId];
assert.ok(clonedRoot);
assert.notEqual(clonedRoot.styleId, sourceStyleId);
assert.deepEqual(
  cardVariantDocument.styles[clonedRoot.styleId!],
  cardVariantDocument.styles[sourceStyleId],
);
cardVariantDocument.styles[clonedRoot.styleId!].left = 999;
assert.notEqual(
  cardVariantDocument.styles[sourceStyleId].left,
  999,
  "Cloned variants must not share mutable style records.",
);

const multiDocument = createSampleStudioDocument();
const multiTimetable = multiDocument.domains!.timetable!;
multiTimetable.capabilities!.multi.enabled = true;
ensureStudioTimetableCapabilityStatus(multiTimetable, "multi");
ensureStudioCapabilityVariant(multiDocument, "multi");
const multiComponent =
  multiTimetable.components[multiTimetable.entryComponentId];
const multiGroups = getStudioVariantEntryGroups(
  multiDocument,
  multiComponent.variants.multi,
);
assert.deepEqual(
  multiGroups.map((group) => group.meta?.entrySlot?.index),
  [0, 1],
  "The Multi variant must own exactly two authored Entry Groups.",
);
assert.notEqual(multiGroups[0].id, multiGroups[1].id);
assert.notEqual(multiGroups[0].styleId, multiGroups[1].styleId);

const offlineMemoDocument = createSampleStudioDocument();
const offlineMemoTimetable = offlineMemoDocument.domains!.timetable!;
offlineMemoTimetable.capabilities!.offlineMemo.enabled = true;
ensureStudioCapabilityVariant(offlineMemoDocument, "offlineMemo");
const offlineMemoComponent =
  offlineMemoTimetable.components[offlineMemoTimetable.entryComponentId];
assert.ok(offlineMemoComponent.variants.offlineMemo);
assert.notEqual(
  offlineMemoComponent.variants.offlineMemo.rootNodeId,
  offlineMemoComponent.variants.offline.rootNodeId,
);
assert.ok(
  getStudioOfflineMemoTextNode(offlineMemoDocument, offlineMemoComponent),
);
const offlineMemoValues = createStudioInitialRuntimeValues(offlineMemoDocument);
const offlineMemoDayId = offlineMemoTimetable.dayIds[0];
offlineMemoValues.timetable.offlineMemoByDay![offlineMemoDayId] = "Day off";
assert.equal(
  resolveStudioBuiltinFieldValue(
    offlineMemoDocument,
    offlineMemoValues,
    "day.offline_memo",
    { dayId: offlineMemoDayId, entryIndex: 0 },
  ),
  "Day off",
);

const stylePropagationDocument = createSampleStudioDocument();
const stylePropagationComponent =
  stylePropagationDocument.domains!.timetable!.components.defaultEntryCard;
const onlineStyleGroup = getStudioVariantEntryGroups(
  stylePropagationDocument,
  stylePropagationComponent.variants.online,
)[0];
const offlineStyleGroup = getStudioVariantEntryGroups(
  stylePropagationDocument,
  stylePropagationComponent.variants.offline,
)[0];
const onlineMainTitle = onlineStyleGroup.childIds
  .map((nodeId) => stylePropagationDocument.graph.nodes[nodeId])
  .find(
    (node) =>
      node.binding?.kind === "builtinField" &&
      node.binding.fieldId === "entry.main_title",
  );
const offlineMainTitle = offlineStyleGroup.childIds
  .map((nodeId) => stylePropagationDocument.graph.nodes[nodeId])
  .find(
    (node) =>
      node.binding?.kind === "builtinField" &&
      node.binding.fieldId === "entry.main_title",
  );
assert.ok(onlineMainTitle?.styleId && offlineMainTitle?.styleId);
const offlineLeftBefore =
  stylePropagationDocument.styles[offlineMainTitle.styleId].left;
stylePropagationDocument.styles[onlineMainTitle.styleId].fontSize = 55;
stylePropagationDocument.styles[onlineMainTitle.styleId].textAlign = "center";
stylePropagationDocument.styles[onlineMainTitle.styleId].justifyContent =
  "center";
stylePropagationDocument.styles[onlineMainTitle.styleId][
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY
] = "single";
const stylePropagationResult = applyStudioVariantStyle(
  stylePropagationDocument,
  {
    component: stylePropagationComponent,
    sourceNodeId: onlineMainTitle.id,
    sourceStatusId: "online",
    targetStatusIds: ["offline"],
    scope: "visual",
  },
);
assert.equal(stylePropagationResult.appliedNodeCount, 1);
assert.equal(
  stylePropagationDocument.styles[offlineMainTitle.styleId].fontSize,
  55,
);
assert.equal(
  stylePropagationDocument.styles[offlineMainTitle.styleId].textAlign,
  "center",
);
assert.equal(
  stylePropagationDocument.styles[offlineMainTitle.styleId].justifyContent,
  "center",
);
assert.equal(
  stylePropagationDocument.styles[offlineMainTitle.styleId][
    STUDIO_TEXT_WRAP_MODE_STYLE_KEY
  ],
  "single",
  "Typography propagation must copy the Auto Text line break mode.",
);
assert.equal(
  stylePropagationDocument.styles[offlineMainTitle.styleId].left,
  offlineLeftBefore,
  "Visual propagation must not copy layout geometry.",
);

assert.equal(
  getStudioTextWrapMode(undefined),
  "preserve",
  "Auto Text must keep the legacy line break behavior when no mode is stored.",
);
assert.equal(
  getStudioTextWrapMode({ [STUDIO_TEXT_WRAP_MODE_STYLE_KEY]: "single" }),
  "single",
);
assert.equal(
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY in
    pickStudioVariantStyleScope(
      { [STUDIO_TEXT_WRAP_MODE_STYLE_KEY]: "single", left: 10 },
      "layout",
    ),
  false,
  "Line break mode must not travel with Position & Size propagation.",
);

const multiValues = createStudioInitialRuntimeValues(multiDocument, {
  entryCountPerDay: 2,
});
const multiDayId = multiTimetable.dayIds[0];
multiValues.timetable.entriesByDay[multiDayId][0].mainTitle = "First entry";
multiValues.timetable.entriesByDay[multiDayId][1].mainTitle = "Second entry";
const firstContext = getStudioNodeRuntimeContext(multiGroups[0], {
  dayId: multiDayId,
});
const secondContext = getStudioNodeRuntimeContext(multiGroups[1], {
  dayId: multiDayId,
});
assert.equal(
  resolveStudioBuiltinFieldValue(
    multiDocument,
    multiValues,
    "entry.main_title",
    firstContext,
  ),
  "First entry",
);
assert.equal(
  resolveStudioBuiltinFieldValue(
    multiDocument,
    multiValues,
    "entry.main_title",
    secondContext,
  ),
  "Second entry",
);

console.log("Template Studio object variant checks passed.");
