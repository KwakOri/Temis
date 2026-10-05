import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { StudioTimetableGraphDocument } from "../src/types/studio-timetable-graph";
import {
  addStudioTimetableGraphPreset,
  createStudioTimetableGraphDocument,
  parseStudioTimetableGraphDocument,
  validateStudioTimetableGraphDocument,
} from "../src/utils/template-studio/timetable-graph-document";
import { getStudioTimetablePresetMessage } from "../src/utils/template-studio/timetable-preset-commands";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL } from "../src/utils/template-studio/preset-inputs";

// Compare with a captured result from BEFORE the generator refactor. IDs are random;
// hierarchy paths and input labels identify references without hiding other changes.
const canonical = (doc: StudioTimetableGraphDocument) => {
  const ids: Record<string, string> = {};
  const inputs: Record<string, string> = {};
  Object.values(doc.inputs).forEach((input) => {
    inputs[input.id] = input.label;
  });
  const visit = (id: string, path: string) => {
    ids[id] = path;
    doc.graph.nodes[id].childIds.forEach((child, i) =>
      visit(child, `${path}/${i}`),
    );
  };
  doc.domains.timetable.rootNodeIds.forEach((id, i) => visit(id, `root/${i}`));
  const output: unknown = JSON.parse(
    JSON.stringify({
      roots: doc.domains.timetable.rootNodeIds.map((id) => ids[id]),
      nodes: Object.entries(ids).map(([id, path]) => {
        const { id: ignoredId, styleId, ...node } = doc.graph.nodes[id];
        void ignoredId;
        return {
          path,
          node,
          style: styleId ? doc.styles[styleId] : undefined,
          extension: doc.domains.timetable.nodeExtensions[id],
        };
      }),
      inputs: Object.values(doc.inputs).map((input) => ({
        ...input,
        id: input.label,
      })),
    }),
  );
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") return ids[value] ?? inputs[value] ?? value;
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [key, replace(child)]),
      );
    return value;
  };
  return replace(output);
};
const presets = [
  "board",
  "weekDates",
  "weeklyMemo",
  "profileBlock",
  "artistProfileText",
  "topObject",
] as const;
let document = createStudioTimetableGraphDocument();
const original = JSON.stringify(document);
const cards = structuredClone(document.graph.nodes);
const inserted: Record<string, string> = {};
for (const preset of presets) {
  const before = JSON.stringify(document);
  const result = addStudioTimetableGraphPreset(document, preset);
  assert.equal(
    JSON.stringify(document),
    before,
    "Insertion leaves the caller immutable.",
  );
  document = result.document;
  inserted[preset] = result.nodeId;
  assert.deepEqual(
    validateStudioTimetableGraphDocument(document),
    [],
    `${preset} is valid`,
  );
}
assert.notEqual(JSON.stringify(document), original);
for (const [id, node] of Object.entries(cards))
  assert.deepEqual(
    document.graph.nodes[id],
    node,
    "Card designs and generator are preserved.",
  );
const baseline = JSON.parse(
  readFileSync(
    new URL("./fixtures/studio-timetable-presets-v8.json", import.meta.url),
    "utf8",
  ),
);
assert.deepEqual(
  canonical(document),
  baseline,
  "Six presets preserve pre-refactor defaults, styles, branches and inputs.",
);
assert.deepEqual(
  parseStudioTimetableGraphDocument(JSON.stringify(document)),
  document,
  "Native JSON round trips.",
);
assert.equal(document.domains.timetable.rootNodeIds[0], inserted.board);

for (const preset of presets.filter((preset) => preset !== "weekDates")) {
  const repeated = addStudioTimetableGraphPreset(document, preset);
  assert.equal(repeated.nodeId, inserted[preset], "Singleton is reselected.");
  assert.equal(repeated.linkedInput, false);
  assert.deepEqual(
    repeated.document,
    document,
    "Reselecting keeps styles and IDs.",
  );
}
const repeatedDate = addStudioTimetableGraphPreset(document, "weekDates");
assert.notEqual(repeatedDate.nodeId, inserted.weekDates);
assert.deepEqual(
  validateStudioTimetableGraphDocument(repeatedDate.document),
  [],
);

// Repair a disconnected singleton while preserving custom designs and existing values.
for (const preset of [
  "weeklyMemo",
  "artistProfileText",
  "profileBlock",
  "topObject",
] as const) {
  const broken = structuredClone(document);
  const root = broken.graph.nodes[inserted[preset]];
  const descendants: string[] = [];
  const visit = (id: string) => {
    descendants.push(id);
    broken.graph.nodes[id].childIds.forEach(visit);
  };
  visit(root.id);
  const consumerId = descendants.find((id) => {
    const extension = broken.domains.timetable.nodeExtensions[id];
    return (
      extension?.structuredRole === "text" ||
      extension?.profileRole === "userImage"
    );
  });
  if (consumerId)
    broken.graph.nodes[consumerId].binding = {
      kind: "staticText",
      value: "detached",
    };
  if (root.variantSet) root.variantSet.inputId = undefined;
  broken.styles[root.styleId!].left = 123;
  const inputs = structuredClone(broken.inputs);
  const repaired = addStudioTimetableGraphPreset(broken, preset);
  assert.equal(repaired.nodeId, root.id);
  assert.equal(repaired.linkedInput, true);
  assert.deepEqual(repaired.document.styles, broken.styles);
  assert.deepEqual(
    repaired.document.inputs,
    inputs,
    "Compatible inputs and their values are reused.",
  );
  assert.deepEqual(validateStudioTimetableGraphDocument(repaired.document), []);
}

// Image keyword matching uses asset labels/IDs, not unrelated URL text.
const custom = createStudioTimetableGraphDocument();
custom.assets = {
  unrelated: { id: "unrelated", label: "Unrelated", src: "/avatar-in-url.png" },
  portrait: { id: "portrait", label: "Portrait", src: "/person.png" },
  plate: { id: "plate", label: "Back plate", src: "/plate.png" },
  frame: { id: "frame", label: "Frame", src: "/frame.png" },
};
const profile = addStudioTimetableGraphPreset(custom, "profileBlock");
const children = profile.document.graph.nodes[profile.nodeId].childIds.map(
  (id) => profile.document.graph.nodes[id],
);
assert.deepEqual(children[0].binding, {
  kind: "staticAsset",
  assetId: "plate",
});
assert.deepEqual(children[2].binding, {
  kind: "staticAsset",
  assetId: "frame",
});
assert.equal(children[1].binding?.kind, "inputImage");
const imageInput = Object.values(profile.document.inputs).find(
  (input) => input.label === STUDIO_PROFILE_BLOCK_IMAGE_INPUT_LABEL,
)!;
assert.equal(
  "defaultUrl" in imageInput ? imageInput.defaultUrl : undefined,
  "/person.png",
);
const empty = createStudioTimetableGraphDocument();
empty.assets = {};
for (const node of Object.values(empty.graph.nodes)) {
  node.assetSlots = {};
  if (node.binding?.kind === "staticAsset") node.binding = undefined;
}
for (const preset of presets) {
  const result = addStudioTimetableGraphPreset(empty, preset);
  assert.deepEqual(
    validateStudioTimetableGraphDocument(result.document),
    [],
    `${preset} works without assets`,
  );
}
assert.equal(
  migrateStudioTemplateDocument(createSampleStudioDocument()).ok,
  false,
  "Legacy timetable recipes are rejected.",
);
assert.equal(migrateStudioTemplateDocument(document).ok, true);
assert.equal(
  getStudioTimetablePresetMessage("Board", {
    existing: false,
    linkedInput: false,
  }),
  "Added Board",
);
assert.equal(
  getStudioTimetablePresetMessage("Artist", {
    existing: true,
    linkedInput: true,
  }),
  "Linked Artist to input",
);
console.log(
  "Native timetable preset creation and pre-refactor baseline checks passed.",
);
