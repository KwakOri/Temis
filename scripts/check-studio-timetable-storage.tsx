import { canonicalizeStudioTimetableDocumentStorage } from "../src/utils/template-studio/semantic-slots";
import { createTimetableGraphFixture } from "./helpers/studio-timetable-fixture";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createSampleStudioDocument,
  createInitialStudioRuntimeValues,
} from "../src/utils/template-studio/sample-document";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import {
  createStudioTemplateExportPayload,
  parseStudioTemplateExportJson,
} from "../src/utils/template-studio/serialization";
import {
  createStudioStructuredTextPresetObjects,
  getStudioTimetableComposition,
} from "./helpers/studio-timetable-recipe";
import {
  resolveStudioTimetableSelection,
  type StudioTimetableEditingVariants,
} from "../src/utils/template-studio/timetable-selection";
import {
  setStudioTimetableObjectAssetSlot,
  setStudioTimetableObjectMaskSlot,
  setStudioTimetableObjectVisibilitySlot,
  setStudioTimetableObjectBackgroundInputSlot,
  canonicalizeStudioTimetableObjectStorage,
} from "../src/utils/template-studio/semantic-slots";
import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
} from "../src/stores/studio/studio-editor-store";
import {
  StudioTimetablePreview,
  getStudioTimetableDayCardsLayout,
  getStudioTimetableDayCardGeometries,
  STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS,
} from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import {
  applyStudioTimetableGridPreset,
  getStudioTimetablePlacementMode,
} from "../src/utils/template-studio/timetable-placement";

const source = createSampleStudioDocument();
const timetable = source.domains!.timetable!;
const composition = getStudioTimetableComposition(timetable);
assert.equal(
  composition,
  timetable.composition,
  "Reading returns the stored composition without copying or repairing it.",
);
const artist = createStudioStructuredTextPresetObjects(
  "artistProfileText",
  composition,
);
for (const object of [artist.group, ...artist.children])
  composition.objects[object.id] = object;
composition.rootObjectIds.push(artist.group.id);
artist.group.variantSet!.activeValue = "off"; // saved legacy authoring choice
const text = artist.children.find(
  (object) => object.structuredRole === "text",
)!;
text.binding = { kind: "staticText", value: "On design" };
const offText = artist.children.filter(
  (object) => object.structuredRole === "text",
)[1];
offText.binding = { kind: "staticText", value: "Off design" };
composition.objects[artist.group.variantSet!.rootByValue.off!].hidden = false;
const image = artist.children.find(
  (object) => object.structuredRole === "background",
)!;
source.assets.legacy = {
  id: "legacy",
  label: "Legacy",
  src: "/legacy.png",
};
source.assets.current = {
  id: "current",
  label: "Current",
  src: "/current.png",
};
image.assetSlots = {
  background: { assetId: "current", fit: "contain" },
  asset: { assetId: "current", fit: "cover" },
};
image.backgroundAssetId = "legacy";
image.backgroundFit = "fill";
image.hidden = true;
image.style.borderRadius = 23;
image.meta = {
  exception: {
    semanticKey: "artistProfileText",
    scope: "timetable",
    presetId: "artistProfileText",
    lockedStructure: true,
    editableSlots: {
      visibility: { source: "object-visibility", visible: true },
      mask: { source: "object-mask", radius: 9999, shape: "circle" },
      asset: { source: "template-asset", assetId: "legacy", fit: "fill" },
      customDescriptor: { feature: "preserve me" },
    },
  },
};
const original = JSON.stringify(source);
const migration = migrateStudioTemplateDocument(source);
assert.equal(migration.ok, false, "Legacy timetable recipes are rejected.");
const migrated = structuredClone(source);
canonicalizeStudioTimetableDocumentStorage(migrated);
const storedImage = migrated.domains!.timetable!.composition!.objects[image.id];
assert.equal(
  JSON.stringify(source),
  original,
  "Migration never changes its input.",
);
assert.equal(storedImage.hidden, true);
assert.equal(storedImage.style.borderRadius, 23);
assert.equal(
  storedImage.assetSlots?.background.assetId,
  "current",
  "Existing assetSlots win over stale legacy background fields.",
);
assert.equal(storedImage.backgroundAssetId, undefined);
assert.deepEqual(storedImage.meta?.exception?.editableSlots, {
  customDescriptor: { feature: "preserve me" },
});
assert.equal(
  migrated.domains!.timetable!.composition!.objects[artist.group.id].variantSet
    ?.activeValue,
  undefined,
);
const native = createTimetableGraphFixture(migrated);
const again = migrateStudioTemplateDocument(native);
if (!again.ok) throw new Error(again.message);
assert.deepEqual(
  again.document,
  native,
  "Full document migration is idempotent, including IDs, styles and inputs.",
);

// Setters write the rendered source only, including legacy cleanup after an edit.
setStudioTimetableObjectAssetSlot(storedImage, "asset", "legacy", "contain");
setStudioTimetableObjectVisibilitySlot(storedImage, false);
setStudioTimetableObjectMaskSlot(storedImage, "rounded", 17);
assert.equal(storedImage.assetSlots?.asset.assetId, "legacy");
assert.equal(storedImage.style.borderRadius, 17);
assert.deepEqual(storedImage.meta?.exception?.editableSlots, {
  customDescriptor: { feature: "preserve me" },
});
setStudioTimetableObjectBackgroundInputSlot(storedImage, "image-input");
assert.equal(storedImage.backgroundFit, undefined);
assert.equal(storedImage.assetSlots?.background.inputId, "image-input");

const inputWithFallback: typeof image = {
  ...structuredClone(image),
  assetSlots: { background: { inputId: "image-input" } },
  backgroundAssetId: "legacy",
  backgroundFit: "fill" as const,
};
canonicalizeStudioTimetableObjectStorage(inputWithFallback);
assert.equal(
  inputWithFallback.backgroundAssetId,
  "legacy",
  "An input image's template fallback is preserved as a distinct source.",
);
assert.equal(inputWithFallback.assetSlots?.background.fit, "fill");
const blankLegacySlot: typeof image = {
  ...structuredClone(image),
  assetSlots: { background: { fit: "contain" as const } },
};
canonicalizeStudioTimetableObjectStorage(blankLegacySlot);
assert.equal(blankLegacySlot.assetSlots?.background.assetId, "legacy");
assert.equal(blankLegacySlot.backgroundAssetId, undefined);

const values = createInitialStudioRuntimeValues(source);
const exportPayload = createStudioTemplateExportPayload(createTimetableGraphFixture(source), values);
assert.equal(exportPayload.document.version, 8);
assert.equal(exportPayload.document.domains!.timetable!.composition, undefined);
assert.equal(
  JSON.stringify(source),
  original,
  "Export cleanup does not mutate the editor document.",
);
const imported = parseStudioTemplateExportJson(JSON.stringify(exportPayload));
assert.ok(
  imported.ok,
  "Canonical export can be imported through the regular validation boundary.",
);

const store = createStudioEditorStore({
  document: source,
  runtimeValues: values,
  view: { variants: {} as StudioTimetableEditingVariants },
});
const before = captureStudioEditorSnapshot(store.getState());
store.getState().setView({ variants: { [artist.group.id]: "off" } });
assert.deepEqual(
  captureStudioEditorSnapshot(store.getState()),
  before,
  "Selecting a design state changes neither document nor undo snapshot.",
);
assert.equal(
  resolveStudioTimetableSelection(
    source,
    composition,
    offText.id,
    store.getState().view.variants,
  ).editingState?.value,
  "off",
);
assert.equal(
  resolveStudioTimetableSelection(source, composition, offText.id, {
    [artist.group.id]: "invalid",
  }).editingState?.value,
  "on",
);
const render = (mode: "authoring" | "runtime", choice: string) =>
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={createTimetableGraphFixture(source)}
      runtimeValues={values}
      variantMode={mode}
      editingVariants={{ [artist.group.id]: choice }}
    />,
  );
assert.match(render("authoring", "off"), /Off design/);
assert.doesNotMatch(render("authoring", "off"), /On design/);
assert.match(render("authoring", "on"), /On design/);
assert.equal(
  render("runtime", "on"),
  render("runtime", "off"),
  "Runtime preview ignores editor-only design choices.",
);
assert.equal(
  JSON.stringify(source),
  original,
  "Rendering does not normalize or mutate saved objects.",
);

// Use real layout geometry with unequal card sizes, empty cells, offsets and rotation.
const days = timetable.dayIds
  .map((id) => timetable.days[id])
  .sort((a, b) => a.order - b.order);
const sizeForDay = (dayId: string) => ({
  width: dayId === days[0].id ? 700 : 400,
  height: dayId === days[1].id ? 650 : 350,
});
const positions = (layout: NonNullable<typeof timetable.dayCardsLayout>) =>
  getStudioTimetableDayCardGeometries(
    getStudioTimetableDayCardsLayout({
      dayIds: days.map((day) => day.id),
      dayCardsLayout: layout,
    }),
    days,
    () => 1,
    sizeForDay,
  );
const layout = getStudioTimetableDayCardsLayout(timetable);
layout.gridPreset = "3x3";
layout.columns = layout.rows = 3;
layout.emptySlotIndexes = [0, 4];
layout.dayOffsets = { [days[0].id]: { left: -13.5, top: 25, rotateDeg: 19 } };
const priorPositions = positions(layout);
const transition = (id: "custom" | "3x3") =>
  applyStudioTimetableGridPreset(
    layout,
    STUDIO_TIMETABLE_DAY_CARD_GRID_PRESETS.find((preset) => preset.id === id)!,
    days.map((day) => day.id),
    positions,
    () => [0, 4],
  );
transition("custom");
assert.equal(getStudioTimetablePlacementMode(layout), "absolute");
assert.deepEqual(positions(layout), priorPositions);
assert.equal(layout.dayOffsets?.[days[0].id].rotateDeg, 19);
transition("3x3");
assert.equal(getStudioTimetablePlacementMode(layout), "gridOffset");
assert.deepEqual(positions(layout), priorPositions);
assert.equal(layout.dayOffsets?.[days[0].id].rotateDeg, 19);
console.log("Studio timetable storage and placement checks passed.");
