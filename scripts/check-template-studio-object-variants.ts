import assert from "node:assert/strict";

import type {
  StudioRuntimeValues,
  StudioTimetableDomain,
} from "../src/types/template-studio";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { cloneStudioComponentVariant } from "../src/utils/template-studio/component-variants";
import {
  createStudioStructuredTextPresetObjects,
  getStudioTimetableComposition,
  getStudioTimetableObjectRenderableChildIds,
  getStudioTimetableObjectRuntimeVariantValue,
  setStudioTimetableObjectActiveVariantValue,
} from "../src/utils/template-studio/timetable-composition";
import {
  getStudioTextWrapMode,
  STUDIO_TEXT_WRAP_MODE_STYLE_KEY,
} from "../src/utils/template-studio/text-wrap";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
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

setStudioTimetableObjectActiveVariantValue(structured.group, "off");
assert.deepEqual(
  getStudioTimetableObjectRenderableChildIds(structured.group),
  [offRootId],
  "Changing the authoring state must select the Off subtree.",
);

structured.group.variantSet!.rootByValue.off = null;
assert.deepEqual(
  getStudioTimetableObjectRenderableChildIds(structured.group),
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

const nestedComposition = getStudioTimetableComposition({
  composition: {
    rootObjectIds: ["parent"],
    objects: {
      parent: {
        id: "parent",
        kind: "group",
        label: "Parent",
        parentId: null,
        childIds: ["nested-artist"],
        style: { width: 1200, height: 800 },
      },
      "nested-artist": {
        id: "nested-artist",
        kind: "text",
        label: "Nested Artist",
        presetId: "artistProfileText",
        parentId: "parent",
        style: { left: 10, top: 20, width: 300, height: 80 },
        binding: { kind: "staticText", value: "Artist" },
      },
    },
  },
} as unknown as StudioTimetableDomain);
assert.equal(
  nestedComposition.objects["nested-artist"].parentId,
  "parent",
  "Variant migration must preserve the existing parent.",
);
const nestedOnRootId =
  nestedComposition.objects["nested-artist"].variantSet?.rootByValue.on;
assert.ok(nestedOnRootId);
assert.equal(
  nestedComposition.objects[`${nestedOnRootId}:background-object`].parentId,
  nestedOnRootId,
  "Migrated On children must point to the On state group.",
);

const migrationSource = createSampleStudioDocument();
const timetable = migrationSource.domains?.timetable;
assert.ok(timetable);
const composition = getStudioTimetableComposition(timetable);
const migratedPreset = createStudioStructuredTextPresetObjects(
  "weeklyMemo",
  composition,
);
composition.objects[migratedPreset.group.id] = migratedPreset.group;
migratedPreset.children.forEach((child) => {
  composition.objects[child.id] = child;
});
composition.rootObjectIds.push(migratedPreset.group.id);
timetable.composition = composition;

const migrationResult = migrateStudioTemplateDocument(migrationSource);
if (!migrationResult.ok) throw new Error(migrationResult.message);
assert.equal(migrationResult.ok, true);
const migratedObject =
  migrationResult.document.domains?.timetable?.composition?.objects[
    migratedPreset.group.id
  ];
const migratedInputId = migratedObject?.variantSet?.inputId;
assert.ok(migratedInputId);
assert.equal(migrationResult.document.inputs[migratedInputId].type, "select");
assert.deepEqual(
  validateStudioDocument(migrationResult.document).filter((diagnostic) =>
    diagnostic.id.includes("variant"),
  ),
  [],
  "Migrated object variants must pass document validation.",
);

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
setStudioStatusCardBackgroundAssetSlot(
  onlineBackground,
  "asset_b2",
  "contain",
);
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
  getStudioPresetExistingTargetId(
    cardVariantDocument,
    statusBackgroundPreset,
    { cardRootNodeId: cardComponent.variants.online.rootNodeId },
  ),
  onlineBackground.id,
);
assert.equal(
  getStudioPresetExistingTargetId(
    cardVariantDocument,
    statusBackgroundPreset,
    { cardRootNodeId: cardComponent.variants.offline.rootNodeId },
  ),
  offlineBackground.id,
  "Card singleton lookup must stay inside the selected status variant.",
);

const legacyBackgroundDocument = createSampleStudioDocument();
const legacyBackgroundComponent =
  legacyBackgroundDocument.domains?.timetable?.components.defaultEntryCard;
assert.ok(legacyBackgroundComponent);
const legacyOnlineBackground = findStatusBackgroundNode(
  legacyBackgroundDocument,
  legacyBackgroundComponent.variants.online.rootNodeId,
);
const legacyOfflineBackground = findStatusBackgroundNode(
  legacyBackgroundDocument,
  legacyBackgroundComponent.variants.offline.rootNodeId,
);
assert.ok(legacyOnlineBackground && legacyOfflineBackground);
[legacyOnlineBackground, legacyOfflineBackground].forEach((background) => {
  assert.ok(background.styleId);
  legacyBackgroundDocument.styles[background.styleId].backgroundColor =
    "#ffffff";
  background.assetSlots = {
    online: { assetId: "asset_b2", fit: "cover" },
    offline: { assetId: "asset_c3", fit: "fill" },
  };
  background.meta!.exception!.editableSlots = {
    statusAssets: { source: "status-assets", slots: background.assetSlots },
  };
});
(legacyBackgroundDocument as unknown as { version: number }).version = 4;
const legacyBackgroundMigration = migrateStudioTemplateDocument(
  legacyBackgroundDocument,
);
if (!legacyBackgroundMigration.ok) {
  throw new Error(legacyBackgroundMigration.message);
}
assert.equal(legacyBackgroundMigration.document.version, 6);
assert.ok(
  legacyBackgroundMigration.warnings.some((warning) =>
    warning.includes("status background asset maps"),
  ),
);
assert.ok(
  legacyBackgroundMigration.warnings.some((warning) =>
    warning.includes("legacy white base color"),
  ),
);
const migratedBackgroundComponent =
  legacyBackgroundMigration.document.domains?.timetable?.components
    .defaultEntryCard;
assert.ok(migratedBackgroundComponent);
const migratedOnlineBackground = findStatusBackgroundNode(
  legacyBackgroundMigration.document,
  migratedBackgroundComponent.variants.online.rootNodeId,
);
const migratedOfflineBackground = findStatusBackgroundNode(
  legacyBackgroundMigration.document,
  migratedBackgroundComponent.variants.offline.rootNodeId,
);
assert.ok(migratedOnlineBackground && migratedOfflineBackground);
assert.equal(
  legacyBackgroundMigration.document.styles[migratedOnlineBackground.styleId!]
    ?.backgroundColor,
  "transparent",
);
assert.equal(
  legacyBackgroundMigration.document.styles[
    migratedOfflineBackground.styleId!
  ]?.backgroundColor,
  "transparent",
);
assert.deepEqual(Object.keys(migratedOnlineBackground.assetSlots ?? {}), [
  "asset",
]);
assert.equal(migratedOnlineBackground.assetSlots?.asset?.assetId, "asset_b2");
assert.deepEqual(Object.keys(migratedOfflineBackground.assetSlots ?? {}), [
  "asset",
]);
assert.equal(migratedOfflineBackground.assetSlots?.asset?.assetId, "asset_c3");
assert.equal(migratedOfflineBackground.assetSlots?.asset?.fit, "fill");
assert.equal(
  migratedOfflineBackground.meta?.exception?.editableSlots?.statusAssets,
  undefined,
);

const explicitWhiteBackgroundDocument = createSampleStudioDocument();
const explicitWhiteBackgroundComponent =
  explicitWhiteBackgroundDocument.domains?.timetable?.components
    .defaultEntryCard;
assert.ok(explicitWhiteBackgroundComponent);
const explicitWhiteBackground = findStatusBackgroundNode(
  explicitWhiteBackgroundDocument,
  explicitWhiteBackgroundComponent.variants.online.rootNodeId,
);
assert.ok(explicitWhiteBackground?.styleId);
explicitWhiteBackgroundDocument.styles[
  explicitWhiteBackground.styleId
].backgroundColor = "#ffffff";
const explicitWhiteBackgroundMigration = migrateStudioTemplateDocument(
  explicitWhiteBackgroundDocument,
);
if (!explicitWhiteBackgroundMigration.ok) {
  throw new Error(explicitWhiteBackgroundMigration.message);
}
assert.equal(
  explicitWhiteBackgroundMigration.document.styles[
    explicitWhiteBackground.styleId
  ].backgroundColor,
  "#ffffff",
  "A white base color explicitly saved in a current document must be preserved.",
);
assert.equal(
  explicitWhiteBackgroundMigration.warnings.some((warning) =>
    warning.includes("legacy white base color"),
  ),
  false,
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

const legacyDocument = createSampleStudioDocument();
(legacyDocument as unknown as { version: number }).version = 2;
const legacyComponent =
  legacyDocument.domains!.timetable!.components.defaultEntryCard;
legacyComponent.variants.offline.rootNodeId =
  legacyComponent.variants.online.rootNodeId;
delete legacyComponent.frame;
const legacyRoot =
  legacyDocument.graph.nodes[legacyComponent.variants.online.rootNodeId];
const legacyGroup = getStudioVariantEntryGroups(
  legacyDocument,
  legacyComponent.variants.online,
)[0];
assert.ok(legacyGroup);
const legacyGroupIndex = legacyRoot.childIds.indexOf(legacyGroup.id);
legacyRoot.childIds.splice(legacyGroupIndex, 1, ...legacyGroup.childIds);
legacyGroup.childIds.forEach((childId) => {
  legacyDocument.graph.nodes[childId].parentId = legacyRoot.id;
});
if (legacyGroup.styleId) delete legacyDocument.styles[legacyGroup.styleId];
delete legacyDocument.graph.nodes[legacyGroup.id];

const legacyMigration = migrateStudioTemplateDocument(legacyDocument);
if (!legacyMigration.ok) throw new Error(legacyMigration.message);
assert.equal(legacyMigration.document.version, 6);
const migratedLegacyComponent =
  legacyMigration.document.domains!.timetable!.components.defaultEntryCard;
assert.ok(migratedLegacyComponent.frame);
assert.notEqual(
  migratedLegacyComponent.variants.online.rootNodeId,
  migratedLegacyComponent.variants.offline.rootNodeId,
  "Migration must separate shared base status roots.",
);
assert.deepEqual(
  getStudioVariantEntryGroups(
    legacyMigration.document,
    migratedLegacyComponent.variants.online,
  ).map((group) => group.meta?.entrySlot?.index),
  [0],
  "Migration must wrap entry-scoped nodes exactly once.",
);
const repeatedMigration = migrateStudioTemplateDocument(
  legacyMigration.document,
);
if (!repeatedMigration.ok) throw new Error(repeatedMigration.message);
assert.deepEqual(
  getStudioVariantEntryGroups(
    repeatedMigration.document,
    repeatedMigration.document.domains!.timetable!.components.defaultEntryCard
      .variants.online,
  ).map((group) => group.meta?.entrySlot?.index),
  [0],
  "Version-3 migration must be idempotent.",
);

console.log("Template Studio object variant checks passed.");
