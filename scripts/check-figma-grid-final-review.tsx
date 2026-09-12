import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as route from "../src/app/api/admin/template-studio/figma/analyze/route";
import { fetchFigmaGridCandidates, fetchFigmaGridNode } from "../src/services/server/figmaTemplateStudioService";
import { reviewFigmaGridNodes } from "../src/services/server/figmaGridReviewService";
import { convertFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-node-converter";
import { applyStudioFigmaReviewEdits } from "../src/utils/template-studio/figma-import/figma-review-edits";
import { applyStudioFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-component-import";
import { classifyFigmaTextNode } from "../src/utils/template-studio/figma-import/figma-text-classifier";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { resolveStudioSingleDateText } from "../src/utils/template-studio/date-template";
import { StudioFigmaComponentImport } from "../src/components/studio/settings/studio-figma-component-import";
import type { FigmaNormalizedNode, FigmaTransientAsset, StudioFigmaGridCandidate, StudioFigmaNodeReview } from "../src/types/template-studio-figma";

const solid = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }];
const textNode: FigmaNormalizedNode = {
  id: "title", name: "main_title", type: "TEXT", characters: "  Source title\n Second line  ",
  absoluteBounds: { left: 120, top: 220, width: 100, height: 40 },
};
const card = (children: FigmaNormalizedNode[]): FigmaNormalizedNode => ({
  id: "card", name: "Monday card", type: "FRAME",
  absoluteBounds: { left: 100, top: 200, width: 300, height: 180 }, children,
});
const review = (node: FigmaNormalizedNode, type: StudioFigmaNodeReview["suggestedStudioType"] = "shape"): StudioFigmaNodeReview => ({
  sourceNodeId: node.id, label: node.name, sourceType: node.type,
  suggestedRole: node.type === "TEXT" ? "main_title" : "decoration",
  suggestedStudioType: type,
  suggestedBinding: node.type === "TEXT" ? { kind: "builtinField", fieldId: "entry.main_title" } : { kind: "staticText", value: "" },
  confidence: 0.9, source: "rule", decision: "needs_review", reason: "Fixture",
});
const asset = (id: string): FigmaTransientAsset => ({ sourceNodeId: id, src: "data:image/png;base64,iVBORw==", mimeType: "image/png", byteSize: 4 });
const convert = (children: FigmaNormalizedNode[], assets: FigmaTransientAsset[] = []) => convertFigmaGridCandidate({
  root: card(children), reviews: children.map((node) => review(node, node.type === "TEXT" ? "flexibleText" : "shape")), exportedAssets: assets,
});
const mapped = (candidate: StudioFigmaGridCandidate, id: string) => candidate.component.nodes[candidate.reviewNodeIds![id]!]!;
const styleOf = (candidate: StudioFigmaGridCandidate, id: string) => candidate.component.styles[mapped(candidate, id).styleId!]!;

// Only external HTTP is mocked. Normalization, discovery and conversion remain real.
const withFigma = async (raw: Record<string, unknown>, run: (requests: URL[]) => Promise<void>) => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  const requests: URL[] = [];
  process.env.FIGMA_ACCESS_TOKEN = "fixture-token";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.pathname.endsWith("/nodes")) return Response.json({ nodes: { grid: { document: raw } } });
    if (url.pathname === "/v1/files/fixture/images") return Response.json({ meta: { images: { fillref: "https://assets.example/fill.png" } } });
    if (url.pathname === "/v1/images/fixture") return Response.json({ images: { [url.searchParams.get("ids")!]: "https://assets.example/export.png" } });
    if (url.hostname === "assets.example") return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });
    throw new Error(`Unexpected fixture request: ${url.pathname}`);
  };
  try { await run(requests); } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
};
const source = { fileKey: "fixture", nodeId: "grid" };

test("route exports only the supported POST handler", () => {
  assert.deepEqual(Object.keys(route).sort(), ["POST"]);
});

test("untouched effect/stroke reviews preserve converter image types, bindings and assets", () => {
  const decoration: FigmaNormalizedNode = { id: "effect", name: "Glow", type: "RECTANGLE", fills: solid, effects: [{ type: "DROP_SHADOW" }] };
  const candidate = convert([decoration], [asset("effect")]);
  const result = applyStudioFigmaReviewEdits(candidate);
  assert.equal(mapped(result, "effect").type, "image");
  assert.deepEqual(result.component, candidate.component);
  const edited = structuredClone(candidate);
  edited.reviews[0]!.suggestedStudioType = "text";
  edited.reviews[0]!.suggestedBinding = { kind: "staticText", value: "explicit" };
  const applied = applyStudioFigmaReviewEdits(edited, { effect: true });
  assert.equal(mapped(applied, "effect").type, "text");
  assert.deepEqual(mapped(applied, "effect").binding, { kind: "staticText", value: "explicit" });
});

test("normalized small rotations are degrees and are not converted a second time", async () => {
  await withFigma({ id: "small", name: "Label", type: "TEXT", rotation: Math.PI / 180,
    absoluteBoundingBox: { x: 120, y: 220, width: 40.69, height: 40.69 }, size: { x: 40, y: 40 } }, async () => {
    const { node } = await fetchFigmaGridNode(source);
    const result = convert([node]);
    assert.equal(styleOf(result, "small").rotateDeg, 1);
  });
});

test("local geometry stays unrotated and absolute geometry supplies center correction", async () => {
  await withFigma({ id: "rotated", name: "Label", type: "TEXT", rotation: Math.PI / 2,
    absoluteBoundingBox: { x: 120, y: 230, width: 40, height: 100 },
    absoluteRenderBounds: { x: 115, y: 225, width: 50, height: 110 }, size: { x: 100, y: 40 } }, async (requests) => {
    const { node } = await fetchFigmaGridNode(source);
    const result = convert([node]);
    const style = styleOf(result, "rotated");
    assert.deepEqual([style.left, style.top, style.width, style.height, style.rotateDeg], [-10, 60, 100, 40, 90]);
    assert.equal(requests[0]!.searchParams.get("geometry"), "paths");
  });
});

test("nested rotated parents use parent-relative child coordinates", async () => {
  await withFigma({
    id: "parent",
    name: "Rotated group",
    type: "FRAME",
    rotation: Math.PI / 2,
    relativeTransform: [[1, 0, 0], [0, 1, 0]],
    absoluteBoundingBox: { x: 100, y: 200, width: 100, height: 100 },
    size: { x: 100, y: 100 },
    children: [{
      id: "nested",
      name: "main_title",
      type: "TEXT",
      characters: "Nested",
      relativeTransform: [[1, 0, 20], [0, 1, 10]],
      absoluteBoundingBox: { x: 130, y: 220, width: 20, height: 10 },
      size: { x: 20, y: 10 },
    }],
  }, async () => {
    const { node } = await fetchFigmaGridNode(source);
    const candidate = convertFigmaGridCandidate({
      root: card([node]),
      reviews: [review(node, "group"), review(node.children![0]!, "flexibleText")],
      exportedAssets: [],
    });
    assert.equal(styleOf(candidate, "parent").rotateDeg, 90);
    assert.deepEqual([styleOf(candidate, "nested").left, styleOf(candidate, "nested").top], [20, 10]);
  });
});

test("full-node raster exports use rendered bounds without applying opacity/rotation twice", () => {
  const node: FigmaNormalizedNode = { id: "raster", name: "Glow", type: "RECTANGLE", fills: solid,
    effects: [{ type: "DROP_SHADOW" }], rotateDeg: 30, opacity: 0.4,
    localSize: { width: 100, height: 40 },
    absoluteBounds: { left: 120, top: 230, width: 106.6, height: 84.64 },
    absoluteRenderBounds: { left: 110, top: 220, width: 130, height: 110 } };
  const result = convert([node], [asset("raster")]);
  const style = styleOf(result, "raster");
  assert.deepEqual([style.left, style.top, style.width, style.height, style.rotateDeg ?? 0, style.opacity ?? 1], [10, 20, 130, 110, 0, 1]);
  assert.deepEqual([result.component.assets[0]!.width, result.component.assets[0]!.height], [130, 110]);
});

test("image-filled frames keep a background image behind semantic children, with no baked text", async () => {
  const raw = { id: "grid", name: "GRID", type: "FRAME", children: [{
    id: "card", name: "Monday card", type: "FRAME", fills: [{ type: "IMAGE", imageRef: "fillref", scaleMode: "FILL" }],
    absoluteBoundingBox: { x: 100, y: 200, width: 300, height: 180 },
    children: [{ id: "title", name: "main_title", type: "TEXT", characters: "Editable title", absoluteBoundingBox: { x: 120, y: 220, width: 100, height: 40 } }],
  }] };
  await withFigma(raw, async (requests) => {
    const fetched = (await fetchFigmaGridCandidates(source)).candidates[0]!;
    const candidate = convertFigmaGridCandidate({ root: fetched.root, reviews: [review(fetched.root, "image"), review(fetched.root.children![0]!, "flexibleText")], exportedAssets: fetched.assets });
    const result = applyStudioFigmaReviewEdits(candidate);
    const root = mapped(result, "card");
    assert.equal(root.type, "group");
    const images = Object.values(result.component.nodes).filter((node) => node.type === "image");
    assert.equal(images.length, 1);
    assert.equal(images[0]!.binding?.kind, "staticAsset");
    const parent = result.component.nodes[images[0]!.parentId!]!;
    assert.equal(parent.childIds[0], images[0]!.id);
    assert.deepEqual(mapped(result, "title").binding, { kind: "builtinField", fieldId: "entry.main_title" });
    const bgStyle = result.component.styles[images[0]!.styleId!]!;
    assert.deepEqual([bgStyle.left, bgStyle.top, bgStyle.width, bgStyle.height], [0, 0, 300, 180]);
    assert.ok(requests.some((url) => url.pathname === "/v1/files/fixture/images"));
    assert.ok(!requests.some((url) => url.pathname === "/v1/images/fixture" && url.searchParams.get("ids") === "card"));
    assert.equal(applyStudioFigmaGridCandidate(createSampleStudioDocument(), result).ok, true);
  });
});

test("imported component and both variant roots are canvas-local", () => {
  const candidate = convert([textNode]);
  // A caller with old page-coordinate metadata must also be made local by the merger.
  candidate.frame.left = 100;
  candidate.frame.top = 200;
  const document = createSampleStudioDocument();
  const result = applyStudioFigmaGridCandidate(document, candidate);
  assert.ok(result.ok);
  const component = document.domains!.timetable!.components[result.componentId]!;
  assert.deepEqual(component.frame, { left: 0, top: 0, width: 300, height: 180 });
  for (const variant of Object.values(component.variants)) {
    const style = document.styles[document.graph.nodes[variant.rootNodeId]!.styleId!]!;
    assert.deepEqual([style.left, style.top, style.width, style.height], [0, 0, 300, 180]);
  }
});

test("vector decorations are discovered/exported and never silently become rectangles", async () => {
  const types = ["ELLIPSE", "VECTOR", "STAR", "POLYGON", "LINE", "BOOLEAN_OPERATION"];
  await withFigma({ id: "grid", name: "GRID", type: "FRAME", children: [{ id: "card", name: "Monday card", type: "COMPONENT",
    children: [{ id: "title", name: "main", type: "TEXT", characters: "Title" }, ...types.map((type) => ({ id: type, name: type, type, fills: solid }))] }] }, async () => {
    const fetched = (await fetchFigmaGridCandidates(source)).candidates[0]!;
    assert.deepEqual(fetched.assets.map((a) => a.sourceNodeId).sort(), [...types].sort());
    const candidate = convertFigmaGridCandidate({ root: fetched.root, reviews: [], exportedAssets: fetched.assets });
    for (const type of types) assert.equal(Object.values(candidate.component.nodes).find((n) => n.label === type)?.type, "image");
    const noAsset = convert([{ id: "ellipse", name: "Ellipse", type: "ELLIPSE", fills: solid }]);
    assert.equal(mapped(noAsset, "ellipse").shapeFill, undefined);
    assert.ok(noAsset.warnings.some((warning) => /ellipse/i.test(warning)));
  });
});

test("GRID discovery excludes visible decoration even when named as a weekday", async () => {
  await withFigma({ id: "grid", name: "GRID", type: "FRAME", children: [
    { id: "bg", name: "Rectangle 55", type: "RECTANGLE", fills: solid },
    { id: "fake", name: "Monday card", type: "RECTANGLE", fills: solid },
    { id: "frame-bg", name: "Frame 23", type: "FRAME", children: [{ id: "dot", name: "dot", type: "ELLIPSE", fills: solid }] },
    { id: "valid", name: "Frame 24", type: "FRAME", children: [{ id: "main", name: "main_title", type: "TEXT", characters: "Stream" }] },
    { id: "group", name: "Tuesday card", type: "GROUP", children: [{ id: "day", name: "weekday", type: "TEXT", characters: "TUE" }] },
    { id: "hidden", name: "Wednesday card", type: "FRAME", visible: false, children: [{ id: "h", name: "main", type: "TEXT", characters: "X" }] },
  ] }, async () => {
    assert.deepEqual((await fetchFigmaGridCandidates(source)).candidates.map((c) => c.root.id), ["valid", "group"]);
  });
});

test("textAutoResize is read from style with raw compatibility fallback", async () => {
  await withFigma({ id: "grid", name: "GRID", type: "FRAME", children: [
    { id: "a", name: "main", type: "TEXT", textAutoResize: "NONE", style: { textAutoResize: "HEIGHT" } },
    { id: "b", name: "sub", type: "TEXT", textAutoResize: "WIDTH_AND_HEIGHT" },
  ] }, async () => {
    assert.deepEqual((await fetchFigmaGridNode(source)).node.children!.map((n) => n.textAutoResize), ["HEIGHT", "WIDTH_AND_HEIGHT"]);
  });
});

test("all planned aliases and both title defaults are deterministic", () => {
  for (const [names, role, fieldId, studioType] of [
    [["main", "main_title", "mainTitle", "title"], "main_title", "entry.main_title", "flexibleText"],
    [["sub", "sub_title", "subTitle", "subtitle"], "sub_title", "entry.sub_title", "flexibleText"],
    [["streamingTime", "clock"], "time", "entry.time", "text"],
    [["streamingDay", "weekday"], "day_label", "day.short_label", "text"],
    [["streamingDate"], "date", "day.date", "text"],
    [["status", "state"], "status_label", "entry.status_label", "text"],
  ] as const) for (const name of names) {
    const result = classifyFigmaTextNode({ name, characters: "Example" });
    assert.deepEqual([result.role, result.binding.kind === "builtinField" && result.binding.fieldId, result.studioType], [role, fieldId, studioType], name);
    if (role === "day_label") assert.deepEqual(result.binding, { kind: "builtinField", fieldId, dayLabelFormat: "shortUpper" });
  }
});

// Invoke the real stateless panel's handlers, then rerender with the resulting state.
const panelHarness = () => {
  let candidate = convert([textNode]);
  const touched: Record<string, boolean> = {};
  const props = () => ({ candidates: [candidate], errorMessage: null, figmaUrl: "", isAnalyzing: false, isImporting: false, isRemoteSyncing: false,
    selectedCandidateId: candidate.candidateId, statusMessage: null, onAnalyze() {}, onCancel() {}, onCandidateSelect() {}, onUrlChange() {}, onConfirm() {},
    onBindingChange(id: string) { touched[id] = true; },
    onReviewChange(id: string, patch: Partial<StudioFigmaNodeReview>) { candidate = { ...candidate, reviews: candidate.reviews.map((r) => r.sourceNodeId === id ? { ...r, ...patch } : r) }; },
  });
  const selects = (): React.ReactElement<{ value: string; onChange: (event: { currentTarget: { value: string } }) => void }>[] => {
    const found: ReturnType<typeof selects> = [];
    const visit = (node: React.ReactNode) => React.Children.forEach(node, (child) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return;
      if (child.type === "select") found.push(child as ReturnType<typeof selects>[number]);
      visit(child.props.children);
    });
    visit(StudioFigmaComponentImport(props()));
    return found;
  };
  return { selects, result: () => applyStudioFigmaReviewEdits(candidate, touched), markup: () => renderToStaticMarkup(<StudioFigmaComponentImport {...props()} />) };
};

test("role changes update displayed binding and confirmed binding, including after a binding edit", () => {
  const panel = panelHarness();
  panel.selects()[2]!.props.onChange({ currentTarget: { value: "entry.sub_title" } });
  panel.selects()[0]!.props.onChange({ currentTarget: { value: "day_label" } });
  assert.equal(panel.selects()[2]!.props.value, "day.short_label");
  assert.match(panel.markup(), /value="day.short_label" selected=""/);
  assert.deepEqual(mapped(panel.result(), "title").binding, { kind: "builtinField", fieldId: "day.short_label", dayLabelFormat: "shortUpper" });
});

test("selecting staticText and unknown role retain original source characters", () => {
  const panel = panelHarness();
  panel.selects()[2]!.props.onChange({ currentTarget: { value: "staticText" } });
  assert.deepEqual(mapped(panel.result(), "title").binding, { kind: "staticText", value: textNode.characters });
  panel.selects()[0]!.props.onChange({ currentTarget: { value: "time" } });
  panel.selects()[0]!.props.onChange({ currentTarget: { value: "unknown" } });
  assert.deepEqual(mapped(panel.result(), "title").binding, { kind: "staticText", value: textNode.characters });
});

test("static text whitespace survives import and unsafe source URLs cannot persist", () => {
  const node = { ...textNode, name: "Literal text" };
  const candidate = convertFigmaGridCandidate({ root: card([node]), reviews: [], exportedAssets: [] });
  const document = createSampleStudioDocument();
  assert.ok(applyStudioFigmaGridCandidate(document, candidate).ok);
  const literals = Object.values(document.graph.nodes).filter((n) => n.label === "Literal text");
  assert.equal(literals.length, 2);
  for (const literal of literals) assert.deepEqual(literal.binding, { kind: "staticText", value: textNode.characters });
  const unsafe = structuredClone(candidate);
  unsafe.component.nodes[Object.keys(unsafe.component.nodes).find((id) => unsafe.component.nodes[id]!.label === "Literal text")!]!.binding = { kind: "staticText", value: "https://private.example/source" };
  const before = JSON.stringify(document);
  assert.equal(applyStudioFigmaGridCandidate(document, unsafe).ok, false);
  assert.equal(JSON.stringify(document), before);

  const dynamicSourceUrlNode = { ...textNode, id: "dynamic-url", characters: "https://example.com/live" };
  const dynamicSourceUrlCandidate = convert([dynamicSourceUrlNode]);
  assert.equal(
    applyStudioFigmaGridCandidate(createSampleStudioDocument(), dynamicSourceUrlCandidate).ok,
    true,
    "Transient source text URLs do not block dynamic bindings.",
  );
});

test("day classifier remains compatible with the existing user-owned single-date preset", () => {
  const { binding } = classifyFigmaTextNode({ name: "streamingDate", characters: "07" });
  assert.deepEqual(binding, { kind: "builtinField", fieldId: "day.date", dateRangeFormat: "day" });
  assert.equal(resolveStudioSingleDateText({ date: "2026-09-07", format: "day" }), "07");
});

test("deterministic review treats vector leaves as images and image containers as groups", async () => {
  const original = process.env.OPENAI_ACCESS_TOKEN;
  delete process.env.OPENAI_ACCESS_TOKEN;
  try {
    const reviews = await reviewFigmaGridNodes([
      { id: "v", name: "Icon", type: "VECTOR", styleFlags: { hasChildren: false, hasImageFill: false, hasSolidFill: true } },
      { id: "f", name: "Card", type: "FRAME", styleFlags: { hasChildren: true, hasImageFill: true, hasSolidFill: false } },
    ]);
    assert.deepEqual(reviews.map((r) => r.suggestedStudioType), ["image", "group"]);
  } finally { if (original === undefined) delete process.env.OPENAI_ACCESS_TOKEN; else process.env.OPENAI_ACCESS_TOKEN = original; }
});
