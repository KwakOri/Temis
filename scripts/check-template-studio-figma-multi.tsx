import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFigmaGridAnalyzeHandler } from "../src/services/server/figmaGridAnalyzeHandler";
import { normalizeFigmaNode } from "../src/services/server/figmaTemplateStudioService";
import { convertFigmaGridVariant } from "../src/utils/template-studio/figma-import/figma-node-converter";
import { reviewFigmaGridNodes } from "../src/services/server/figmaGridReviewService";
import {
  StudioFigmaComponentImport,
  applyStudioFigmaReviewPatch,
} from "../src/components/studio/settings/studio-figma-component-import";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import type { StudioFigmaGridOriginCandidate } from "../src/types/template-studio-figma";
import type { StudioGraphNode } from "../src/types/template-studio";
import {
  inferFigmaGridVariantStatus,
  inferFigmaGridOriginVariantFamily,
} from "../src/utils/template-studio/figma-import/figma-origin";
import { applyStudioFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-component-import";
import { applyStudioFigmaFrameImport } from "../src/utils/template-studio/figma-import/figma-frame-import";
import { applyStudioFigmaReviewEdits } from "../src/utils/template-studio/figma-import/figma-review-edits";
import { getStudioVariantEntryGroups } from "../src/utils/template-studio/entry-groups";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  addStudioTimetableEntry,
  setStudioTimetableEntryField,
} from "../src/utils/template-studio/timetable-runtime";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const box = (x = 0, y = 0, width = 240, height = 180) => ({
  x,
  y,
  width,
  height,
});
const text = (id: string, name: string, characters: string, y = 0) => ({
  id,
  name,
  type: "TEXT",
  characters,
  absoluteBoundingBox: box(0, y, 180, 24),
});
const entry = (index: number, y: number) => ({
  id: `entry-${index}`,
  name: `ENTRY_0${index}`,
  type: "GROUP",
  absoluteBoundingBox: box(20, y, 180, 60),
  children: [
    text(`title-${index}`, "main_title", `Source title ${index}`, y),
    text(`time-${index}`, "time", "21:00", y + 25),
  ],
});
const origins = {
  online: {
    id: "online",
    name: "State=ONLINE",
    type: "COMPONENT",
    absoluteBoundingBox: box(),
    children: [text("online-title", "main_title", "Online")],
  },
  offline: {
    id: "offline",
    name: "State=OFFLINE",
    type: "COMPONENT",
    absoluteBoundingBox: box(),
    children: [text("offline-day", "day", "MON")],
  },
  multi: {
    id: "multi",
    name: "State=MULTI",
    type: "COMPONENT",
    absoluteBoundingBox: box(),
    children: [
      {
        id: "inputs",
        name: "INPUTS",
        type: "GROUP",
        absoluteBoundingBox: box(10, 5),
        children: [
          text("multi-day", "day", "MON"),
          entry(2, 100),
          entry(1, 30),
          text("shared-overlay", "shared overlay", "Shared overlay"),
        ],
      },
      text("root-overlay", "root overlay", "Root overlay"),
    ],
  },
};
const components = Object.fromEntries(
  Object.keys(origins).map((id) => [
    id,
    { name: origins[id as keyof typeof origins].name, componentSetId: "set" },
  ]),
);
const grid = {
  id: "100:1",
  name: "GRID",
  type: "GROUP",
  absoluteBoundingBox: box(0, 0, 720),
  children: Object.entries(origins).map(([id, origin], index) => ({
    ...origin,
    id: `placement-${id}`,
    type: "INSTANCE",
    componentId: id,
    absoluteBoundingBox: box(index * 240),
  })),
};

async function analyzeFixture() {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  try {
    process.env.FIGMA_ACCESS_TOKEN = "fixture-token";
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.figma.com");
      const ids = url.searchParams.get("ids")!.split(",");
      return Response.json({
        nodes: Object.fromEntries(
          ids.map((id) => [
            id,
            {
              document:
                id === grid.id ? grid : origins[id as keyof typeof origins],
              components,
              componentSets: { set: { name: "Day cards" } },
            },
          ]),
        ),
      });
    }) as typeof fetch;
    const handler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      reviewNodes: async (nodes) => ({
        reviews: await reviewFigmaGridNodes(nodes),
        warnings: [],
      }),
    });
    const response = await handler({
      json: async () => ({
        figmaUrl:
          "https://www.figma.com/design/originfixture123456789/Test?node-id=100-1",
      }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(
      body.candidates.length,
      1,
      "ONLINE/MULTI/OFFLINE must remain one importable set",
    );
    return body.candidates[0] as StudioFigmaGridOriginCandidate;
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
}

async function main() {
  assert.equal(
    inferFigmaGridVariantStatus({ status: { value: "MULTI" } }),
    "multi",
  );
  assert.equal(
    inferFigmaGridVariantStatus({ status: { value: "LONG_MULTI" } }),
    "multi",
  );
  assert.equal(
    inferFigmaGridOriginVariantFamily({ componentName: "State=LONG_MULTI" }),
    "LONG",
  );
  const candidate = await analyzeFixture();
  const multi = candidate.variants.multi;
  assert.ok(multi, "Analysis must review and convert the Multi graph");
  const translucent = convertFigmaGridVariant({
    status: "multi",
    origin: multi.origin,
    root: normalizeFigmaNode({
      ...origins.multi,
      children: origins.multi.children.map((child) =>
        child.id === "inputs" ? { ...child, opacity: 0.5 } : child,
      ),
    }),
    reviews: [],
    exportedAssets: [],
  });
  assert.ok(
    translucent.warnings.some((warning) =>
      /translucent ancestor/.test(warning),
    ),
    "Unsupported shared opacity must be disclosed",
  );
  const root = multi.component.nodes[multi.component.rootNodeId]!;
  const slots = root.childIds
    .map((id) => multi.component.nodes[id]!)
    .filter((node) => node.meta?.entrySlot);
  assert.deepEqual(
    slots.map((node) => node.meta!.entrySlot!.index).sort(),
    [0, 1],
  );
  assert.deepEqual(
    slots.map((node) => node.meta!.entrySlot!.index),
    [1, 0],
    "Authored layer order is independent of slot numbering",
  );
  assert.equal(
    root.childIds.at(-1),
    multi.reviewNodeIds!["root-overlay"],
    "Root overlays must remain above the slots",
  );
  const sharedOverlay =
    multi.component.nodes[multi.reviewNodeIds!["shared-overlay"]!]!;
  assert.ok(
    root.childIds.indexOf(sharedOverlay.parentId!) >
      Math.max(...slots.map((node) => root.childIds.indexOf(node.id))),
    "Nested overlays must remain above the slots",
  );
  for (const index of [1, 2]) {
    const titleId = multi.reviewNodeIds![`title-${index}`]!;
    let node: StudioGraphNode = multi.component.nodes[titleId]!;
    while (!node.meta?.entrySlot && node.parentId)
      node = multi.component.nodes[node.parentId]!;
    assert.equal(
      node.meta?.entrySlot?.index,
      index - 1,
      "ENTRY_01/02 use their number, even when layer order is reversed",
    );
  }
  assert.ok(multi.reviews.some((review) => review.sourceNodeId === "title-2"));

  const patched = applyStudioFigmaReviewEdits(
    applyStudioFigmaReviewPatch(candidate, "multi", "title-2", {
      suggestedBinding: {
        kind: "staticText",
        value: "Only second slot changed",
      },
    }),
  );
  assert.equal(
    patched.variants.multi!.component.nodes[multi.reviewNodeIds!["title-2"]!]!
      .binding?.kind,
    "staticText",
  );
  assert.deepEqual(
    patched.variants.online,
    candidate.variants.online,
    "Multi edits must not touch Online",
  );
  const importMarkup = renderToStaticMarkup(
    <StudioFigmaComponentImport
      candidates={[candidate]}
      selectedCandidateId={candidate.candidateId}
      errorMessage={null}
      figmaUrl=""
      isAnalyzing={false}
      isImporting={false}
      isRemoteSyncing={false}
      statusMessage={null}
      onAnalyze={() => {}}
      onCancel={() => {}}
      onConfirm={() => {}}
      onCandidateSelect={() => {}}
      onReviewChange={() => {}}
      onBindingChange={() => {}}
      onUrlChange={() => {}}
    />,
  );
  assert.match(importMarkup, /Multi/);
  assert.match(importMarkup, /data-review-section="multi"/);

  const document = createStudioTimetableGraphDocument();
  const timetable = document.domains!.timetable!;
  assert.equal(timetable.capabilities!.multi.enabled, false);
  const result = applyStudioFigmaGridCandidate(document, candidate);
  assert.ok(result.ok, result.ok ? "" : result.reason);
  assert.equal(result.rootNodeIds.length, 3);
  assert.equal(
    timetable.capabilities!.multi.enabled,
    true,
    "Importing Multi enables its existing runtime capability",
  );
  const component = timetable.components[result.componentId]!;
  assert.deepEqual(
    getStudioVariantEntryGroups(document, component.variants.multi).map(
      (n) => n.meta!.entrySlot!.index,
    ),
    [0, 1],
  );
  assert.deepEqual(
    validateStudioDocument(document).filter((d) => d.severity === "error"),
    [],
  );

  const dayId = timetable.dayIds[0]!;
  timetable.days[dayId]!.componentId = component.id;
  let values = createStudioInitialRuntimeValues(document);
  values = setStudioTimetableEntryField(
    document,
    values,
    dayId,
    0,
    "mainTitle",
    "FIRST INDEPENDENT SHOW",
  );
  values = addStudioTimetableEntry(document, values, dayId, "second-entry");
  values = setStudioTimetableEntryField(
    document,
    values,
    dayId,
    1,
    "mainTitle",
    "SECOND INDEPENDENT SHOW",
  );
  const markup = renderToStaticMarkup(
    <StudioTimetablePreview document={document} runtimeValues={values} />,
  );
  for (const title of ["FIRST INDEPENDENT SHOW", "SECOND INDEPENDENT SHOW"]) {
    assert.equal(
      markup.split(title).length - 1,
      1,
      `${title} must render once in its own slot`,
    );
  }

  const baseCandidate = structuredClone(candidate);
  delete baseCandidate.variants.multi;
  baseCandidate.placementInstanceIds = ["placement-online"];
  for (const gridCandidates of [
    [candidate, baseCandidate],
    [baseCandidate, candidate],
  ]) {
    const frameDocument = createStudioTimetableGraphDocument();
    const frameResult = applyStudioFigmaFrameImport(frameDocument, {
      candidateId: "frame",
      label: "Multi frame",
      frame: { width: 720, height: 180 },
      layers: [],
      grid: {
        sourceNodeId: "grid",
        bounds: { left: 0, top: 0, width: 720, height: 180 },
        zIndex: 0,
        placements: Object.keys(origins).map((id, index) => ({
          sourceNodeId: `placement-${id}`,
          bounds: { left: index * 240, top: 0, width: 240, height: 180 },
        })),
      },
      gridCandidates,
      warnings: [],
    });
    assert.ok(frameResult.ok, frameResult.ok ? "" : frameResult.reason);
    assert.equal(
      frameDocument.domains!.timetable!.capabilities!.multi.enabled,
      true,
    );
    assert.deepEqual(
      validateStudioDocument(frameDocument).filter(
        (d) => d.severity === "error",
      ),
      [],
    );
  }

  const invalid = structuredClone(candidate);
  const invalidMulti = invalid.variants.multi!.component;
  const invalidSlot = Object.values(invalidMulti.nodes).find(
    (node) => node.meta?.entrySlot?.index === 1,
  )!;
  invalidSlot.meta!.entrySlot!.index = 0;
  const before = JSON.stringify(document);
  assert.equal(
    applyStudioFigmaGridCandidate(document, invalid).ok,
    false,
    "Duplicate Multi slots must be rejected",
  );
  assert.equal(
    JSON.stringify(document),
    before,
    "Rejected Multi imports must leave the document intact",
  );
  console.log("Figma Multi import checks passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
