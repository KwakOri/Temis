import assert from "node:assert/strict";
import {
  createStudioTimetableGraphDocument,
  addStudioTimetableGraphPreset,
  parseStudioTimetableGraphDocument,
} from "../src/utils/template-studio/timetable-graph-document";
import {
  getStudioTimetableNodeIds,
  getStudioTimetableNodeStyle,
  getStudioTimetableNodeExtension,
  getStudioTimetableNodeAsset,
  getStudioCardsRootNodeIds,
} from "../src/utils/template-studio/timetable-graph-queries";
import { resolveStudioTimetableGraphSelection } from "../src/utils/template-studio/timetable-graph-selection";
import { collectStudioInputConsumers } from "../src/utils/template-studio/input-commands";
import {
  getStudioRuntimeGlobalInputGroups,
  getStudioRuntimeSuppressedInputIds,
} from "../src/utils/template-studio/runtime-global-input-groups";
import { getStudioRuntimeInputMultiline } from "../src/utils/template-studio/runtime-input-presentation";
import { getStudioRuntimeProfileImageCropTarget } from "../src/utils/template-studio/runtime-image-crop";
import { resolveStudioGraphAssetSlotSpec } from "../src/utils/template-studio/timetable-asset-slot-specs";
import { createInitialStudioRuntimeValues } from "../src/utils/template-studio/sample-document";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

let document = createStudioTimetableGraphDocument();
const ids: Record<string, string> = {};
for (const preset of [
  "weekDates",
  "artistProfileText",
  "profileBlock",
  "topObject",
] as const) {
  const result = addStudioTimetableGraphPreset(document, preset);
  document = result.document;
  ids[preset] = result.nodeId;
}
const artist = document.graph.nodes[ids.artistProfileText];
const onRoot = artist.variantSet!.rootByValue.on!;
const offRoot = artist.variantSet!.rootByValue.off!;
const textIn = (id: string) =>
  document.graph.nodes[
    document.graph.nodes[id].childIds.find(
      (child) =>
        getStudioTimetableNodeExtension(document, child).structuredRole ===
        "text",
    )!
  ];
const onText = textIn(onRoot);
const offText = textIn(offRoot);
getStudioTimetableNodeStyle(document, onText).textWrapMode = "single";
getStudioTimetableNodeStyle(document, offText).textWrapMode = "preserve";
const original = JSON.stringify(document);
const selection = resolveStudioTimetableGraphSelection(document, offText.id, {
  [artist.id]: "off",
});
assert.equal(selection.object, offText);
assert.equal(selection.style, document.styles[offText.styleId!]);
assert.equal(
  selection.extension,
  document.domains.timetable.nodeExtensions[offText.id],
);
assert.equal(selection.editingState?.owner, artist);
assert.equal(selection.editingState?.value, "off");
assert.equal(
  resolveStudioTimetableGraphSelection(document, "day-card:mon").dayId,
  "mon",
);
assert.equal(
  resolveStudioTimetableGraphSelection(
    document,
    getStudioCardsRootNodeIds(document)[0],
  ).object,
  null,
);
assert.equal(
  resolveStudioTimetableGraphSelection(document, "day-cards").features
    .resizable,
  false,
);
assert.equal(
  resolveStudioTimetableGraphSelection(document, ids.weekDates).features
    .dateFormatMode,
  "range",
);

const values = createInitialStudioRuntimeValues(document);
const artistInputId =
  onText.binding?.kind === "inputText" ? onText.binding.inputId : "";
const artistInput = document.inputs[artistInputId];
assert.ok(artistInput);
values.global[artist.variantSet!.inputId!] = "on";
assert.equal(
  getStudioRuntimeInputMultiline(document, values, artistInput),
  false,
);
values.global[artist.variantSet!.inputId!] = "off";
assert.equal(
  getStudioRuntimeInputMultiline(document, values, artistInput),
  true,
);
const group = getStudioRuntimeGlobalInputGroups(document).find(
  (candidate) => candidate.toggleInput?.id === artist.variantSet!.inputId,
);
assert.ok(group?.contentInputs.some((input) => input.id === artistInputId));
const consumers = collectStudioInputConsumers(document);
assert.equal(consumers[artistInputId].length, 2);
assert.ok(
  consumers[artistInputId].every(
    (consumer) => consumer.workspaceMode === "timetable",
  ),
);
assert.ok(
  consumers[artist.variantSet!.inputId!].some(
    (consumer) => consumer.targetId === artist.id,
  ),
);
const cardIds = getStudioCardsRootNodeIds(document);
const weekly = getStudioTimetableNodeIds(document);
assert.ok(cardIds.every((id) => !weekly.has(id)));
assert.ok(
  weekly.has(offText.id),
  "Inactive designs still belong to the timetable surface.",
);

const image = [...weekly]
  .map((id) => document.graph.nodes[id])
  .find(
    (node) =>
      getStudioTimetableNodeExtension(document, node.id).profileRole ===
      "userImage",
  )!;
const imageInputId =
  image.binding?.kind === "inputImage" ? image.binding.inputId : "";
const crop = getStudioRuntimeProfileImageCropTarget(document, imageInputId);
assert.ok(crop && crop.width > 0 && crop.height > 0);
assert.equal(crop.objectId, image.id);
assert.equal(getStudioTimetableNodeAsset(image)?.inputId, imageInputId);
const slot = resolveStudioGraphAssetSlotSpec(
  image,
  "profileChild",
  getStudioTimetableNodeExtension(document, image.id),
);
assert.equal(slot.sourceLocked, "input");
assert.equal(slot.defaultFit, "cover");
assert.equal(slot.inputId, imageInputId);
assert.equal(
  JSON.stringify(document),
  original,
  "Selection, runtime reads, and slot specs never mutate the document.",
);
assert.deepEqual(
  validateStudioDocument(document).filter(
    (diagnostic) => diagnostic.severity === "error",
  ),
  [],
);
const top = document.graph.nodes[ids.topObject];
top.variantSet!.mode = "always";
assert.ok(
  getStudioRuntimeSuppressedInputIds(document).has(top.variantSet!.inputId!),
);
assert.ok(
  !getStudioRuntimeGlobalInputGroups(document).some(
    (candidate) => candidate.toggleInput?.id === top.variantSet!.inputId,
  ),
);
const invalid = structuredClone(document);
invalid.graph.nodes[artist.id].variantSet!.defaultValue = "missing";
assert.throws(
  () => parseStudioTimetableGraphDocument(JSON.stringify(invalid)),
  /default/,
);
const invalidRole = structuredClone(document);
invalidRole.graph.nodes[artist.id].meta!.exception!.scope = "cards";
assert.throws(
  () => parseStudioTimetableGraphDocument(JSON.stringify(invalidRole)),
  /exception scope/,
);
console.log(
  "PASS native timetable reads: selection, common style identity, all-state ownership, input groups, wrap, crop, slots and validation",
);
