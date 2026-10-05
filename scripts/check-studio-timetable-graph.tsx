import {
  getStudioCardsRootNodeIds,
  getStudioTimetableNodeStyle,
} from "../src/utils/template-studio/timetable-graph-queries";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addStudioTimetableGraphPreset,
  createStudioTimetableGraphDocument,
  getStudioTimetableGraphNodeIds,
  parseStudioTimetableGraphDocument,
  validateStudioTimetableGraphDocument,
} from "../src/utils/template-studio/timetable-graph-document";
import { StudioTimetableGraphPreview } from "../src/app/(root)/template-studio/_components/studio-timetable-graph-preview";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { createInitialStudioRuntimeValues } from "../src/utils/template-studio/sample-document";
import {
  getStudioObjectFitParentStyle,
  getStudioTextAlignmentStyle,
} from "../src/utils/template-studio/object-style";
import { applyStudioBindingFormatPatch } from "../src/utils/template-studio/binding-format";
import { STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID } from "./helpers/studio-timetable-recipe";

let document = createStudioTimetableGraphDocument();
assert.deepEqual(validateStudioTimetableGraphDocument(document), []);
assert.equal(document.domains.timetable.composition, undefined);
const initial = JSON.stringify(document);
const ids: Record<string, string> = {};
for (const preset of [
  "board",
  "weekDates",
  "artistProfileText",
  "weeklyMemo",
  "profileBlock",
  "topObject",
] as const) {
  const before = JSON.stringify(document);
  const result = addStudioTimetableGraphPreset(document, preset);
  assert.equal(
    JSON.stringify(document),
    before,
    "Preset creation leaves its source immutable.",
  );
  ids[preset] = result.nodeId;
  document = result.document;
  assert.deepEqual(
    validateStudioTimetableGraphDocument(document),
    [],
    `${preset} produces a valid shared graph.`,
  );
}
assert.notEqual(JSON.stringify(document), initial);
const weeklyIds = getStudioTimetableGraphNodeIds(document);
assert.equal(weeklyIds.size, 26);
for (const id of weeklyIds) {
  const node = document.graph.nodes[id];
  assert.equal("style" in node, false, "No inline style storage.");
  assert.equal(
    "kind" in node,
    false,
    "Common node types replace composition kinds.",
  );
  assert.ok(node.styleId && document.styles[node.styleId]);
  assert.equal("activeValue" in (node.variantSet ?? {}), false);
}
const timetable = document.domains.timetable;
assert.equal(
  timetable.rootNodeIds[0],
  ids.board,
  "Board remains behind other weekly objects.",
);
assert.equal(
  document.graph.nodes[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID].childIds.length,
  0,
  "Generated days are not stored children.",
);
assert.ok(
  timetable.nodeExtensions[STUDIO_TIMETABLE_DAY_CARDS_OBJECT_ID].generator,
);
const profileImageId = [...weeklyIds].find(
  (id) => timetable.nodeExtensions[id]?.profileRole === "userImage",
)!;
assert.equal(document.graph.nodes[profileImageId].binding?.kind, "inputImage");
assert.equal(
  document.graph.nodes[profileImageId].assetSlots?.asset,
  undefined,
  "Foreground profile images are not mistaken for graph background slots.",
);
assert.equal(document.graph.nodes[profileImageId].fit, "cover");
const artist = document.graph.nodes[ids.artistProfileText];
assert.ok(artist.variantSet?.inputId);
assert.ok(artist.variantSet?.rootByValue.on);
assert.ok(artist.variantSet?.rootByValue.off);
for (const root of Object.values(artist.variantSet!.rootByValue))
  assert.ok(root && artist.childIds.includes(root));
const artistTextId = document.graph.nodes[
  artist.variantSet!.rootByValue.on!
].childIds.find(
  (id) => timetable.nodeExtensions[id]?.structuredRole === "text",
)!;
// Typography, fit and formats edit the one shared record used by the actual renderer.
const text = document.graph.nodes[artistTextId];
text.binding = { kind: "staticText", value: "Shared graph artist" };
document.styles[text.styleId!] = getStudioTextAlignmentStyle(
  document.styles[text.styleId!],
  "center",
);
const dates = document.graph.nodes[ids.weekDates];
applyStudioBindingFormatPatch(dates, {
  dateRangeFormat: "custom",
  dateRangeTemplate: "${start.DD} to ${end.DD}",
});
document.graph.nodes[ids.board].layoutMode = "fillParent";
document.styles[document.graph.nodes[ids.board].styleId!] =
  getStudioObjectFitParentStyle(
    document.styles[document.graph.nodes[ids.board].styleId!],
    true,
    { width: 4000, height: 2250 },
  );
const singleton = addStudioTimetableGraphPreset(document, "board");
assert.equal(singleton.nodeId, ids.board);
assert.deepEqual(singleton.document, document);
const repeated = addStudioTimetableGraphPreset(document, "weekDates");
assert.notEqual(repeated.nodeId, ids.weekDates);
assert.notEqual(
  repeated.document.graph.nodes[repeated.nodeId].styleId,
  dates.styleId,
);
assert.deepEqual(validateStudioTimetableGraphDocument(repeated.document), []);
const offRootId = artist.variantSet!.rootByValue.off!;
document.graph.nodes[offRootId].hidden = false;
const offTextId = document.graph.nodes[offRootId].childIds.find(
  (id) => timetable.nodeExtensions[id]?.structuredRole === "text",
)!;
document.graph.nodes[offTextId].binding = {
  kind: "staticText",
  value: "Off shared graph",
};
document.graph.nodes[ids.topObject].variantSet!.mode = "always";
const frozenSource = JSON.stringify(document);

const values = createInitialStudioRuntimeValues(document);
const render = (mode: "authoring" | "runtime", selected = "on") =>
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={document}
      runtimeValues={values}
      variantMode={mode}
      editingVariants={{ [artist.id]: selected }}
    />,
  );
assert.match(render("authoring"), /Shared graph artist/);
assert.equal(
  renderToStaticMarkup(
    <StudioTimetableGraphPreview
      document={document}
      runtimeValues={values}
      variantMode="authoring"
    />,
  ),
  render("authoring"),
);
const profileMarkup = (html: string) =>
  html.match(
    new RegExp(`<div[^>]*data-node-id="${profileImageId}"[\\s\\S]*?</div>`),
  )?.[0] ?? "";
assert.match(profileMarkup(render("authoring")), /<img/);
assert.doesNotMatch(profileMarkup(render("runtime")), /<img/);
assert.doesNotMatch(render("authoring", "off"), /Shared graph artist/);
assert.match(render("authoring", "off"), /Off shared graph/);
values.global[artist.variantSet!.inputId!] = "off";
assert.match(render("runtime"), /Off shared graph/);
assert.doesNotMatch(render("runtime"), /Shared graph artist/);
values.global[artist.variantSet!.inputId!] = "on";
const topRender = (selected: string) =>
  renderToStaticMarkup(
    <StudioTimetableGraphPreview
      document={document}
      runtimeValues={values}
      variantMode="authoring"
      editingVariants={{ [ids.topObject]: selected }}
    />,
  );
assert.equal(
  topRender("off"),
  topRender("on"),
  "Always mode forces the On design.",
);
assert.equal(
  render("runtime", "on"),
  render("runtime", "off"),
  "Editor state never overrides runtime state.",
);
assert.match(render("authoring"), /text-align:center/);
assert.match(render("authoring"), /\d{2} to \d{2}/);
assert.equal(
  JSON.stringify(document),
  frozenSource,
  "Projection and render do not change the v8 store.",
);
assert.ok(
  getStudioCardsRootNodeIds(document).every((id) => !weeklyIds.has(id)),
  "Cards roots exclude the weekly surface.",
);
assert.equal(
  getStudioTimetableNodeStyle(document, text),
  document.styles[text.styleId!],
  "Reads use the referenced common style, without copying a render document.",
);
const restored = parseStudioTimetableGraphDocument(JSON.stringify(document));
assert.deepEqual(restored, JSON.parse(frozenSource));
assert.equal(
  renderToStaticMarkup(
    <StudioTimetablePreview document={restored} runtimeValues={values} />,
  ),
  renderToStaticMarkup(
    <StudioTimetablePreview document={document} runtimeValues={values} />,
  ),
);
assert.throws(
  () =>
    parseStudioTimetableGraphDocument(
      JSON.stringify({ ...restored, version: 7 }),
    ),
  /Only new v8/,
);
assert.throws(
  () => parseStudioTimetableGraphDocument('{"version":8}'),
  /Malformed/,
);
// Reject corrupt graphs instead of silently repairing them.
const corruptions: Array<(doc: typeof document) => void> = [
  (doc) => {
    Object.assign(doc.graph.nodes[artist.id], { style: { fontSize: 99 } });
  },
  (doc) => {
    doc.styles[doc.graph.nodes[ids.weekDates].styleId!].dateRangeFormat =
      "short";
  },
  (doc) => {
    Object.assign(doc, { schema: "wrong" });
  },
  (doc) => {
    Object.assign(doc.graph.nodes[artist.id].variantSet!, {
      activeValue: "off",
    });
  },
  (doc) =>
    doc.domains.timetable.rootNodeIds.push(
      doc.domains.timetable.rootNodeIds[0],
    ),
  (doc) => {
    doc.graph.nodes[artist.id].childIds.push("missing");
  },
  (doc) => {
    doc.graph.nodes[artist.id].variantSet!.rootByValue.on = ids.board;
  },
  (doc) => {
    delete doc.styles[doc.graph.nodes[artist.id].styleId!];
  },
  (doc) => {
    doc.domains.timetable.rootNodeIds.push(doc.domains.timetable.mountNodeId);
  },
  (doc) => {
    doc.graph.nodes[artist.id].childIds.push(artist.id);
  },
  (doc) => {
    doc.domains.timetable.nodeExtensions[doc.domains.timetable.mountNodeId] = {
      presetId: "board",
    };
  },
];
for (const corrupt of corruptions) {
  const bad = structuredClone(document);
  corrupt(bad);
  assert.ok(
    validateStudioTimetableGraphDocument(bad).length,
    "Malformed references must fail validation.",
  );
  assert.throws(() => parseStudioTimetableGraphDocument(JSON.stringify(bad)));
}
console.log(
  "PASS timetable graph: new v8 presets, single storage, state, render, JSON and integrity",
);
