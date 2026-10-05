import { getStudioTimetableNodeAsset } from "../src/utils/template-studio/timetable-graph-queries";
import { applyStudioFigmaFrameImport } from "../src/utils/template-studio/figma-import/figma-frame-import";
import assert from "node:assert/strict";
import { TemplateStudioRuntimeShell } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  addStudioTimetableGraphPreset,
  createStudioTimetableGraphDocument,
  parseStudioTimetableGraphDocument,
  validateStudioTimetableGraphDocument,
} from "../src/utils/template-studio/timetable-graph-document";
import type { StudioTimetableGraphDocument } from "../src/types/studio-timetable-graph";
import type { StudioTemplateDocument } from "../src/types/template-studio";
import {
  captureStudioEditorSnapshot,
  createStudioEditorStore,
} from "../src/stores/studio/studio-editor-store";
import { createInitialStudioRuntimeValues } from "../src/utils/template-studio/sample-document";
import { useTimetableObjectCommands } from "../src/app/(root)/template-studio/_hooks/use-timetable-object-commands";
import {
  STUDIO_PRESET_DEFINITIONS,
  isStudioTimetableGraphPreset,
} from "../src/utils/template-studio/preset-registry";
import { applyStudioBindingFormatPatch } from "../src/utils/template-studio/binding-format";
import {
  applyStudioDeleteTimetableGraphNodes,
  planStudioDeleteTimetableGraphNode,
  requireStudioTimetableGraphDocument,
  getStudioTimetableGraphEditTarget,
  setStudioTimetableGraphAsset,
  planStudioDuplicateTimetableGraphNode,
  applyStudioDuplicateTimetableGraphNode,
  resolveStudioTimetableGraphGeometry,
} from "../src/utils/template-studio/timetable-graph-commands";
import {
  createStudioTemplateExportPayload,
  parseStudioTemplateExportJson,
} from "../src/utils/template-studio/serialization";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { mergeStudioSyncedAssetsIntoLatestDocument } from "../src/utils/template-studio/persistence-pipeline";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";

const initial = createStudioTimetableGraphDocument();
const store = createStudioEditorStore({
  document: initial,
  runtimeValues: createInitialStudioRuntimeValues(initial),
  view: {
    selectedLayerId: "day-cards",
    editingVariants: {} as Record<string, string>,
  },
});
const graph = () => store.getState().document as StudioTimetableGraphDocument;
const roundTrip = () =>
  parseStudioTimetableGraphDocument(JSON.stringify(graph()));
const snapshots: ReturnType<typeof captureStudioEditorSnapshot>[] = [];
const capture = () =>
  snapshots.push(captureStudioEditorSnapshot(store.getState()));
const setDocument = (next: StudioTemplateDocument) => {
  requireStudioTimetableGraphDocument(next);
  store.getState().setDocument(next);
};
const update = (
  mutate: (document: StudioTemplateDocument) => void,
  options: { history?: boolean } = {},
) => {
  if (options.history !== false) capture();
  const next = structuredClone(graph());
  mutate(next);
  setDocument(next);
};
let commands!: ReturnType<typeof useTimetableObjectCommands>;
const noop = () => {};
function Harness() {
  commands = useTimetableObjectCommands({
    getDocument: graph,
    getRuntimeValues: () => store.getState().runtimeValues,
    updateDocument: update,
    selectedLayerId: store.getState().view.selectedLayerId,
    onSelectLayer: (id) => store.getState().setView({ selectedLayerId: id }),
    onSelectRuntimeDay: store.getState().setSelectedRuntimeDayId,
    onSelectRuntimeEntryIndex: store.getState().setSelectedRuntimeEntryIndex,
    onOpenLayersPanel: noop,
    onStatusMessage: noop,
    captureHistory: capture,
    setDocument,
    setRuntimeValues: store.getState().setRuntimeValues,
    activeCardComponentId: initial.domains.timetable.entryComponentId,
    componentLabelDraft: "",
    selectedCardStatusId: "online",
    selectedCardVariantRootId: null,
    selectedNode: null,
    selectedTimetableDayId: "mon",
    selectedTimetableDayLabel: "Monday",
    activeRuntimeDayId: "mon",
    onSetPanelMode: noop,
    onSetSelectedCardComponentId: noop,
    onSetComponentLabelDraft: noop,
    onSetSelectedInputId: store.getState().setSelectedInputId,
    onSetSelectedRuntimeEntryIndex:
      store.getState().setSelectedRuntimeEntryIndex,
    onSelectNode: noop,
    onRestoreSelection: noop,
  });
  return null;
}
const refresh = () => renderToStaticMarkup(<Harness />);
const added: Record<string, string> = {};
for (const id of [
  "board",
  "weekDates",
  "artistProfileText",
  "weeklyMemo",
  "profileBlock",
  "topObject",
] as const) {
  refresh();
  const preset = STUDIO_PRESET_DEFINITIONS.find(
    (p) =>
      isStudioTimetableGraphPreset(p) && p.timetableObjectPresetId === id,
  )!;
  assert.ok(isStudioTimetableGraphPreset(preset));
  commands.addPresetObject(preset);
  added[id] = store.getState().view.selectedLayerId;
  assert.deepEqual(
    validateStudioTimetableGraphDocument(graph()),
    [],
    `${id} through the actual editor command hook`,
  );
  assert.equal(graph().domains.timetable.composition, undefined);
}
assert.equal(Object.keys(graph().graph.nodes).length, 42);
const source = JSON.stringify(graph());
const dateStyleId = graph().graph.nodes[added.weekDates].styleId!;
// Editor commands retain stable style identity and renderer output.
assert.equal(
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={graph()}
      runtimeValues={store.getState().runtimeValues}
    />,
  ),
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={roundTrip()}
      runtimeValues={store.getState().runtimeValues}
    />,
  ),
);
refresh();
commands.updateObject(added.weekDates, ({ node: object, style }) => {
  applyStudioBindingFormatPatch(object, {
    dateRangeFormat: "custom",
    dateRangeTemplate: "${start.DD} to ${end.DD}",
  });
  style.fontSize = 110;
  style.textAlign = "center";
});
assert.equal(graph().graph.nodes[added.weekDates].styleId, dateStyleId);
assert.equal(graph().styles[dateStyleId].fontSize, 110);
assert.equal(graph().styles[dateStyleId].dateRangeTemplate, undefined);
assert.equal(JSON.stringify(initial).includes("110"), false);
assert.notEqual(JSON.stringify(graph()), source);
commands.updateLayerPosition(added.weekDates, {
  left: 540,
  top: 220,
  rotateDeg: 12,
});
assert.equal(graph().styles[dateStyleId].left, 540);
assert.equal(graph().styles[dateStyleId].rotateDeg, 12);
const historyCount = snapshots.length;
commands.moveCanvasLayer(added.weekDates, { deltaX: -20, deltaY: 10 });
assert.equal(graph().styles[dateStyleId].left, 520);
assert.equal(graph().styles[dateStyleId].top, 230);
assert.equal(
  snapshots.length,
  historyCount,
  "Pointer movement does not capture a new history entry each frame.",
);
commands.updateDayCardsLayout((layout) => {
  layout.gridPreset = "3x3";
  layout.columnGap = 9;
  layout.rowGap = 1;
});
assert.equal(graph().domains.timetable.dayCardsLayout!.gridPreset, "3x3");
const artist = graph().graph.nodes[added.artistProfileText];
const beforeState = JSON.stringify(graph());
store.getState().setView({ editingVariants: { [artist.id]: "off" } });
assert.equal(
  JSON.stringify(graph()),
  beforeState,
  "State design selection stays out of saved data",
);
const undoSnapshot = captureStudioEditorSnapshot(store.getState());
assert.equal("view" in undoSnapshot, false);
assert.equal(undoSnapshot.document.version, 8);
assert.equal(undoSnapshot.document.domains!.timetable!.composition, undefined);
refresh();
const imageId = Object.entries(graph().domains.timetable.nodeExtensions).find(
  ([, e]) => e.profileRole === "userImage",
)![0];
commands.updateObject(imageId, ({ node }) => {
  setStudioTimetableGraphAsset(
    node,
    "foreground",
    { assetId: Object.keys(graph().assets)[0] },
    "contain",
  );
});
assert.deepEqual(graph().graph.nodes[imageId].binding, {
  kind: "staticAsset",
  assetId: Object.keys(graph().assets)[0],
});
assert.equal(graph().graph.nodes[imageId].fit, "contain");
// Atomic child/variant subtree deletion cleans references and owned styles.
update((next) => {
  const current = requireStudioTimetableGraphDocument(next);
  const plan = planStudioDeleteTimetableGraphNode(current, artist.id);
  assert.ok(plan.ok);
  applyStudioDeleteTimetableGraphNodes(current, plan.nodeIds);
});
assert.equal(graph().graph.nodes[artist.id], undefined);
assert.equal(graph().domains.timetable.nodeExtensions[artist.id], undefined);
assert.equal(graph().styles[artist.styleId!], undefined);
assert.deepEqual(validateStudioTimetableGraphDocument(graph()), []);
store.getState().restoreSnapshot(undoSnapshot);
assert.ok(graph().graph.nodes[artist.id]);
assert.deepEqual(store.getState().view.editingVariants, { [artist.id]: "off" });
assert.deepEqual(validateStudioTimetableGraphDocument(graph()), []);
for (const snapshot of snapshots) {
  assert.equal(snapshot.document.version, 8);
  assert.equal(snapshot.document.domains!.timetable!.composition, undefined);
}
// Duplicate the state owner, preserving all On/Off designs without sharing the original style.
const duplicateDocument = structuredClone(graph());
const clonePlan = planStudioDuplicateTimetableGraphNode(
  duplicateDocument,
  artist.id,
);
assert.ok(clonePlan.ok);
const copyId = applyStudioDuplicateTimetableGraphNode(
  duplicateDocument,
  artist.id,
);
const copy = duplicateDocument.graph.nodes[copyId];
assert.ok(copy.variantSet);
assert.notEqual(copy.styleId, artist.styleId);
for (const [value, rootId] of Object.entries(copy.variantSet.rootByValue)) {
  if (!rootId) continue;
  assert.notEqual(rootId, artist.variantSet!.rootByValue[value]);
  assert.equal(duplicateDocument.graph.nodes[rootId].parentId, copyId);
  assert.ok(copy.childIds.includes(rootId));
}
assert.deepEqual(validateStudioTimetableGraphDocument(duplicateDocument), []);
assert.equal(
  planStudioDuplicateTimetableGraphNode(duplicateDocument, "day-cards").ok,
  false,
);
const branchId = Object.values(copy.variantSet.rootByValue).find(Boolean)!;
assert.equal(
  planStudioDuplicateTimetableGraphNode(duplicateDocument, branchId).ok,
  false,
);
// An empty image still displays its persisted fit choice in the inspector.
const emptyImage = duplicateDocument.graph.nodes[imageId];
setStudioTimetableGraphAsset(
  emptyImage,
  "foreground",
  { assetId: null },
  "fill",
);
assert.equal(emptyImage.binding, undefined);
assert.equal(
  getStudioTimetableNodeAsset(duplicateDocument.graph.nodes[imageId])?.fit,
  "fill",
);
// Removing a branch updates the owner, then undo recovers it from a canonical snapshot.
const branchPlan = planStudioDeleteTimetableGraphNode(
  duplicateDocument,
  branchId,
);
assert.ok(branchPlan.ok);
applyStudioDeleteTimetableGraphNodes(duplicateDocument, branchPlan.nodeIds);
assert.ok(Object.values(copy.variantSet.rootByValue).includes(null));
assert.deepEqual(validateStudioTimetableGraphDocument(duplicateDocument), []);
copy.locked = true;
assert.equal(
  planStudioDeleteTimetableGraphNode(duplicateDocument, copy.childIds[0]).ok,
  false,
);
// Shared style ownership survives deletion; geometry uses the weekly canvas.
const geometryDocument = structuredClone(graph());
const dateNode = geometryDocument.graph.nodes[added.weekDates];
dateNode.layoutMode = "fillParent";
geometryDocument.domains.timetable.canvas = { width: 4200, height: 2300 };
assert.deepEqual(
  resolveStudioTimetableGraphGeometry(geometryDocument, dateNode.id),
  { left: 0, top: 0, width: 4200, height: 2300 },
);
const originalCardNode = geometryDocument.graph.nodes.node_c3;
dateNode.styleId = originalCardNode.styleId;
const sharedDelete = planStudioDeleteTimetableGraphNode(
  geometryDocument,
  dateNode.id,
);
assert.ok(sharedDelete.ok);
applyStudioDeleteTimetableGraphNodes(geometryDocument, sharedDelete.nodeIds);
assert.ok(geometryDocument.styles[originalCardNode.styleId!]);
assert.deepEqual(validateStudioTimetableGraphDocument(geometryDocument), []);
// Inline decoration placement is domain metadata, never CSS/style storage.
refresh();
const artistTextId = Object.entries(
  graph().domains.timetable.nodeExtensions,
).find(([id, extension]) => {
  if (extension.structuredRole !== "text") return false;
  let parentId = graph().graph.nodes[id].parentId;
  while (parentId) {
    if (parentId === artist.id) return true;
    parentId = graph().graph.nodes[parentId].parentId;
  }
  return false;
})![0];
commands.updateObject(artistTextId, ({ extension }) => {
  extension.inlineAssetLayout = {
    mode: "visible",
    position: "right",
    gap: 40,
    size: 180,
  };
});
assert.equal(
  graph().styles[graph().graph.nodes[artistTextId].styleId!].assetGap,
  undefined,
);
assert.equal(
  roundTrip().domains.timetable.nodeExtensions[artistTextId].inlineAssetLayout
    ?.gap,
  40,
);
// Reusing a singleton repairs its input without recreating nodes or resetting style.
const singletonBefore = JSON.stringify(graph().styles);
commands.updateObject(artist.id, ({ node }) => {
  node.variantSet!.inputId = undefined;
});
commands.updateObject(artistTextId, ({ node }) => {
  node.binding = { kind: "staticText", value: "Unlinked" };
});
const singletonPreset = STUDIO_PRESET_DEFINITIONS.find(
  (p) =>
    isStudioTimetableGraphPreset(p) &&
    p.timetableObjectPresetId === "artistProfileText",
)!;
assert.ok(isStudioTimetableGraphPreset(singletonPreset));
commands.addPresetObject(singletonPreset);
assert.equal(store.getState().view.selectedLayerId, artist.id);
assert.equal(JSON.stringify(graph().styles), singletonBefore);
assert.equal(graph().graph.nodes[artistTextId].binding?.kind, "inputText");
assert.ok(graph().graph.nodes[artist.id].variantSet?.inputId);
// Locked ancestor blocks keyboard/pointer movement of a child.
commands.updateObject(artist.id, ({ node }) => {
  node.locked = true;
});
const lockedChildStyle = JSON.stringify(
  graph().styles[graph().graph.nodes[artistTextId].styleId!],
);
commands.moveCanvasLayer(artistTextId, { deltaX: 10, deltaY: 20 });
assert.equal(
  JSON.stringify(graph().styles[graph().graph.nodes[artistTextId].styleId!]),
  lockedChildStyle,
);
commands.updateObject(artist.id, ({ node }) => {
  node.locked = false;
});

// Frame import replaces weekly content directly, retains Cards and the generator, and is atomic on failure.
const frameDocument = structuredClone(graph());
const previousCardNodes = structuredClone(
  Object.fromEntries(
    Object.entries(frameDocument.graph.nodes).filter(([id]) =>
      id.startsWith("node_"),
    ),
  ),
);
const importedAsset = structuredClone(Object.values(frameDocument.assets)[0]);
const framePayload = {
  candidateId: "fixture",
  label: "Frame",
  frame: { width: 4000, height: 2250 },
  grid: null,
  gridCandidates: [],
  warnings: [],
  layers: [
    {
      sourceNodeId: "fixture-layer",
      label: "Background",
      bounds: { left: 10, top: 20, width: 100, height: 200 },
      zIndex: 0,
      asset: importedAsset,
    },
  ],
};
const frameResult = applyStudioFigmaFrameImport(frameDocument, framePayload);
assert.ok(frameResult.ok, frameResult.ok ? "" : frameResult.reason);
assert.equal(frameDocument.version, 8);
assert.equal(frameDocument.domains.timetable.composition, undefined);
assert.equal(frameDocument.domains.timetable.rootNodeIds.length, 2);
assert.ok(frameDocument.graph.nodes["day-cards"]);
for (const [id, node] of Object.entries(previousCardNodes))
  if (id in initial.graph.nodes)
    assert.deepEqual(frameDocument.graph.nodes[id], node);
assert.deepEqual(validateStudioTimetableGraphDocument(frameDocument), []);
const beforeFailedImport = JSON.stringify(frameDocument);
const invalidImport = applyStudioFigmaFrameImport(frameDocument, {
  ...framePayload,
  frame: { width: -1, height: 200 },
});
assert.equal(invalidImport.ok, false);
assert.equal(JSON.stringify(frameDocument), beforeFailedImport);

const exported = createStudioTemplateExportPayload(
  graph(),
  store.getState().runtimeValues,
);
assert.equal(exported.document.version, 8);
const parsed = parseStudioTemplateExportJson(JSON.stringify(exported));
assert.ok(parsed.ok, parsed.ok ? "" : parsed.message);
assert.deepEqual(parsed.document, exported.document);
assert.deepEqual(parsed.migrationWarnings, []);
assert.equal(
  validateStudioDocument(graph()).filter((d) => d.severity === "error").length,
  0,
);
const merged = mergeStudioSyncedAssetsIntoLatestDocument({
  latestDocument: graph(),
  patches: [],
});
assert.equal(merged.document.version, 8);
assert.equal(merged.document.domains!.timetable!.composition, undefined);
assert.equal(JSON.stringify(graph()).includes('"activeValue"'), false);
assert.equal(
  Object.values(graph().graph.nodes).some((n) => "style" in n || "kind" in n),
  false,
);
console.log(
  "PASS v8 editor: actual commands, styles, binding, layout, state, delete, history, export and asset-sync boundary",
);

assert.equal(
  renderToStaticMarkup(
    <TemplateStudioRuntimeShell
      document={graph()}
      initialRuntimeValues={store.getState().runtimeValues}
      source="draft"
    />,
  ),
  renderToStaticMarkup(
    <TemplateStudioRuntimeShell
      document={roundTrip()}
      initialRuntimeValues={store.getState().runtimeValues}
      source="draft"
    />,
  ),
  "The actual runtime shell preserves input grouping, defaults and image crop presentation for v8.",
);

// A direct edit to a shared style updates every consumer, including Cards.
const shared = addStudioTimetableGraphPreset(graph(), "weekDates");
shared.document.graph.nodes[shared.nodeId].styleId = dateStyleId;
getStudioTimetableGraphEditTarget(
  shared.document,
  added.weekDates,
)!.style.fontSize = 211;
assert.equal(shared.document.styles[dateStyleId].fontSize, 211);
assert.equal(shared.document.graph.nodes[shared.nodeId].styleId, dateStyleId);
const cardStyleId = Object.values(shared.document.graph.nodes).find(
  (n) => n.type === "text" && n.styleId,
)!.styleId!;
shared.document.graph.nodes[added.weekDates].styleId = cardStyleId;
getStudioTimetableGraphEditTarget(
  shared.document,
  added.weekDates,
)!.style.fontSize = 212;
assert.equal(shared.document.styles[cardStyleId].fontSize, 212);

// The real server service is exercised with an in-memory client; no DB/network calls.
const checkServerBoundary = async () => {
  process.env.SUPABASE_URL = "http://127.0.0.1:1";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_local_fixture_only";
  const service =
    await import("../src/services/server/templateStudioPersistenceService");
  const calls: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const row = {
    id: "fixture-row",
    template_id: "fixture-template",
    user_id: 1,
    document_version: 8,
    document: exported.document,
    runtime_values: exported.runtimeValues,
    base_revision_no: null,
    published_revision_no: 1,
    is_autosave: false,
    created_at: "2026-10-04T00:00:00Z",
    updated_at: "2026-10-04T00:00:00Z",
  };
  const mock = {
    rpc: async (name: string, payload: Record<string, unknown>) => {
      calls.push({ name, payload });
      return {
        data: name === "publish_template_studio_document" ? 1 : row,
        error: null,
      };
    },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return query;
    },
  } as unknown as NonNullable<
    Parameters<typeof service.saveTemplateStudioDraft>[1]
  >;
  const input = {
    templateId: "fixture-template",
    userId: 1,
    document: exported.document,
    runtimeValues: exported.runtimeValues,
  };
  const draft = await service.saveTemplateStudioDraft(input, mock);
  const published = await service.publishTemplateStudioDocument(input, mock);
  assert.equal(draft.documentVersion, 8);
  assert.equal(published.document.document.version, 8);
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.payload.p_document_version, 8);
    const document = call.payload.p_document as StudioTimetableGraphDocument;
    assert.equal(document.version, 8);
    assert.equal(document.domains.timetable.composition, undefined);
    assert.equal(
      Object.values(document.graph.nodes).some((n) => "style" in n),
      false,
    );
  }
  console.log(
    "PASS v8 persistence: actual draft/publish services and read preparation using a mock client (no DB access)",
  );
};
checkServerBoundary().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
