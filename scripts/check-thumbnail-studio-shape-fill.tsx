import assert from "node:assert/strict";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { applyStudioPasteCopy } from "../src/utils/template-studio/clipboard-commands";
import { createStudioNodeClipboardPayload } from "../src/utils/template-studio/node-clipboard";
import {
  captureStudioHistory,
  createStudioHistoryStacks,
  redoStudioHistory,
  undoStudioHistory,
} from "../src/utils/template-studio/history-stacks";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import {
  applyStudioShapeFill,
  clampStudioShapeFillAngle,
  createStudioShapeFillGradient,
  createStudioShapeFillSolid,
  getStudioShapeFillCss,
  normalizeStudioShapeFill,
  resolveStudioShapeFill,
} from "../src/utils/thumbnail-studio/shape-fill";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createNode = (
  id: string,
  type: StudioGraphNode["type"],
  styleId: string,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id,
  type,
  label: id,
  parentId: null,
  childIds: [],
  styleId,
  ...overrides,
});

const createDocument = (): StudioTemplateDocument => ({
  schema: "studio_template_document",
  version: 7,
  metadata: {
    editor: "template-studio",
    kind: "thumbnail",
    name: "Shape fill check",
  },
  canvas: { width: 800, height: 600, background: "#ffffff" },
  graph: {
    rootNodeIds: ["shape-a", "shape-b", "text"],
    nodes: {
      "shape-a": createNode("shape-a", "shape", "shape-a-style"),
      "shape-b": createNode("shape-b", "shape", "shape-b-style"),
      text: createNode("text", "text", "text-style"),
    },
  },
  inputs: {},
  styles: {
    "shape-a-style": {
      position: "absolute",
      left: 40,
      top: 40,
      width: 220,
      height: 140,
      backgroundColor: "#123456",
      borderRadius: 18,
    },
    "shape-b-style": {
      position: "absolute",
      left: 300,
      top: 40,
      width: 220,
      height: 140,
      backgroundColor: "#654321",
      borderRadius: 18,
    },
    "text-style": {
      position: "absolute",
      left: 40,
      top: 240,
      width: 220,
      height: 60,
      color: "#111827",
      fontSize: 20,
    },
  },
  assets: {},
});

// --- legacy fallback and conversions ---

const legacyDocument = createDocument();
assert.deepEqual(
  resolveStudioShapeFill(
    legacyDocument.graph.nodes["shape-a"].shapeFill,
    legacyDocument.styles["shape-a-style"].backgroundColor,
  ),
  { type: "solid", color: "#123456" },
  "shapeFill이 없는 기존 문서는 backgroundColor를 단색으로 읽어야 한다.",
);
assert.deepEqual(
  createStudioShapeFillGradient({ type: "solid", color: "#123456" }),
  {
    type: "linearGradient",
    startColor: "#123456",
    endColor: "#ffffff",
    angleDeg: 90,
  },
  "solid에서 gradient로 바꾸면 현재 색·흰색·90도가 기본값이어야 한다.",
);
assert.deepEqual(
  createStudioShapeFillSolid({
    type: "linearGradient",
    startColor: "#abcdef",
    endColor: "#ffffff",
    angleDeg: 180,
  }),
  { type: "solid", color: "#abcdef" },
  "gradient에서 solid로 바꾸면 시작색을 사용해야 한다.",
);
assert.equal(clampStudioShapeFillAngle(-10), 0);
assert.equal(clampStudioShapeFillAngle(999), 360);
assert.equal(clampStudioShapeFillAngle(Number.NaN), 90);

// --- one mutation, multi-selection, locked node, and field updates ---

const fillDocument = createDocument();
fillDocument.graph.nodes["shape-b"].locked = true;
let appliedMutationCount = 0;
const nextGradient = {
  type: "linearGradient" as const,
  startColor: "#ff0000",
  endColor: "#00ff00",
  angleDeg: 420,
};
const originalMutate = (document: StudioTemplateDocument) => {
  appliedMutationCount += 1;
  applyStudioShapeFill(document, ["shape-a", "shape-b", "text"], nextGradient);
};
originalMutate(fillDocument);
assert.equal(
  appliedMutationCount,
  1,
  "여러 Shape 변경은 한 document mutation이어야 한다.",
);
assert.deepEqual(fillDocument.graph.nodes["shape-a"].shapeFill, {
  type: "linearGradient",
  startColor: "#ff0000",
  endColor: "#00ff00",
  angleDeg: 360,
});
assert.equal(
  fillDocument.graph.nodes["shape-b"].shapeFill,
  undefined,
  "잠긴 Shape는 fill을 변경하지 않아야 한다.",
);
assert.equal(
  fillDocument.graph.nodes.text.shapeFill,
  undefined,
  "Shape가 아닌 노드는 fill 명령의 대상이 아니어야 한다.",
);

applyStudioShapeFill(fillDocument, ["shape-a"], (current) => {
  const gradient = createStudioShapeFillGradient(current);
  return { ...gradient, startColor: "#112233" };
});
const afterStartColor = resolveStudioShapeFill(
  fillDocument.graph.nodes["shape-a"].shapeFill,
);
assert.equal(
  afterStartColor.type === "linearGradient" ? afterStartColor.startColor : "",
  "#112233",
  "시작색 변경은 기존 끝색과 각도를 보존해야 한다.",
);

applyStudioShapeFill(fillDocument, ["shape-a"], (current) => {
  const gradient = createStudioShapeFillGradient(current);
  return { ...gradient, endColor: "transparent" };
});
const afterEndColor = resolveStudioShapeFill(
  fillDocument.graph.nodes["shape-a"].shapeFill,
);
assert.equal(
  afterEndColor.type === "linearGradient" ? afterEndColor.endColor : "",
  "transparent",
  "끝색은 투명 색상을 보존해야 한다.",
);

// --- one undo unit and redo ---

const beforeFill = clone(createDocument());
const historyDocument = clone(beforeFill);
let history = createStudioHistoryStacks<StudioTemplateDocument>();
history = captureStudioHistory(history, clone(historyDocument));
applyStudioShapeFill(historyDocument, ["shape-a"], nextGradient);
const undone = undoStudioHistory(history, clone(historyDocument));
assert.ok(undone, "fill 변경은 undo 가능한 한 단위여야 한다.");
assert.deepEqual(undone?.snapshot, beforeFill);
const redone = redoStudioHistory(undone!.stacks, clone(undone!.snapshot));
assert.ok(redone, "fill 변경은 redo 가능해야 한다.");
assert.deepEqual(
  redone?.snapshot.graph.nodes["shape-a"].shapeFill,
  historyDocument.graph.nodes["shape-a"].shapeFill,
);

// --- duplicate, clipboard, JSON round trip ---

const copyDocument = createDocument();
applyStudioShapeFill(copyDocument, ["shape-a"], nextGradient);
const clipboardPayload = createStudioNodeClipboardPayload(
  copyDocument,
  "shape-a",
);
assert.ok(clipboardPayload);
const pastedDocument = clone(copyDocument);
const pastedNodeIds = applyStudioPasteCopy(
  pastedDocument,
  clipboardPayload!,
  null,
);
assert.equal(pastedNodeIds.length, 1);
assert.deepEqual(
  pastedDocument.graph.nodes[pastedNodeIds[0]].shapeFill,
  copyDocument.graph.nodes["shape-a"].shapeFill,
  "복제·clipboard 붙여넣기 후 shapeFill을 보존해야 한다.",
);
const roundTripped = JSON.parse(
  JSON.stringify(copyDocument),
) as StudioTemplateDocument;
assert.deepEqual(
  roundTripped.graph.nodes["shape-a"].shapeFill,
  copyDocument.graph.nodes["shape-a"].shapeFill,
  "JSON export/import 왕복에서 shapeFill을 보존해야 한다.",
);

// --- validator ---

const invalidDocument = createDocument();
invalidDocument.graph.nodes["shape-a"].shapeFill = {
  type: "linearGradient",
  startColor: "",
  endColor: "not-a-color",
  angleDeg: 361,
};
(
  invalidDocument.graph.nodes.text as StudioGraphNode & { shapeFill: unknown }
).shapeFill = {
  type: "solid",
  color: "#000000",
};
const diagnostics = validateStudioDocument(invalidDocument);
assert.ok(
  diagnostics.some(
    (diagnostic) =>
      diagnostic.id === "shape-fill-color-empty:shape-a:startColor",
  ),
);
assert.ok(
  diagnostics.some(
    (diagnostic) =>
      diagnostic.id === "shape-fill-color-invalid:shape-a:endColor",
  ),
);
assert.ok(
  diagnostics.some(
    (diagnostic) => diagnostic.id === "shape-fill-angle-out-of-range:shape-a",
  ),
);
assert.ok(
  diagnostics.some(
    (diagnostic) => diagnostic.id === "shape-fill-node-type:text",
  ),
);

// --- renderer ---

const rendererDocument = createDocument();
rendererDocument.graph.nodes["shape-a"].shapeFill = {
  type: "linearGradient",
  startColor: "#ff0000",
  endColor: "transparent",
  angleDeg: 0,
};
const rendererMarkup = renderToStaticMarkup(
  <StudioRenderer
    document={rendererDocument}
    runtimeValues={{
      global: {},
      days: {},
      entries: {},
      timetable: { entriesByDay: {} },
    }}
  />,
);
const rendererCss = getStudioShapeFillCss(
  rendererDocument.graph.nodes["shape-a"].shapeFill!,
);
assert.ok(rendererCss);
assert.ok(rendererMarkup.includes(rendererCss));
assert.ok(rendererMarkup.includes('data-studio-shape-node="true"'));
assert.ok(!rendererMarkup.includes("shapeFill"));
assert.ok(!rendererMarkup.includes("shape-fill"));
assert.equal(
  normalizeStudioShapeFill({ type: "solid", color: "" }, "#aabbcc").type,
  "solid",
);

console.log("Thumbnail Studio Shape fill checks passed.");
