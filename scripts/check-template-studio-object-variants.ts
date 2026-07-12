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
import { validateStudioDocument } from "../src/utils/template-studio/validator";

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
assert.equal(
  cardComponent.variants.online.rootNodeId,
  cardComponent.variants.offline.rootNodeId,
  "The sample starts with a shared Online/Offline layout.",
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
assert.equal(
  cardComponent.variants.offline.rootNodeId,
  cloneResult.rootNodeId,
);
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

console.log("Template Studio object variant checks passed.");
