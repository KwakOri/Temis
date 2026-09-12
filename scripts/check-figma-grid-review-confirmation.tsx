import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import * as route from "../src/app/api/admin/template-studio/figma/analyze/route";
import { StudioFigmaComponentImport } from "../src/components/studio/settings/studio-figma-component-import";
import { createFigmaGridAnalyzeHandler } from "../src/services/server/figmaGridAnalyzeHandler";
import type { StudioBinding } from "../src/types/template-studio";
import type {
  FigmaNormalizedNode,
  FigmaTransientAsset,
  StudioFigmaGridCandidate,
  StudioFigmaNodeReview,
} from "../src/types/template-studio-figma";
import {
  convertFigmaGridCandidate,
  convertFigmaGridOriginCandidate,
  type StudioFigmaGridOriginCandidate,
} from "../src/utils/template-studio/figma-import/figma-node-converter";
import { applyStudioFigmaReviewEdits } from "../src/utils/template-studio/figma-import/figma-review-edits";

const sourceCharacters = "  Original title\nSecond line  ";
const titleNode: FigmaNormalizedNode = {
  id: "title",
  name: "main_title",
  type: "TEXT",
  characters: sourceCharacters,
  absoluteBounds: { left: 20, top: 20, width: 160, height: 40 },
};

const review = (
  node: FigmaNormalizedNode,
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"],
  suggestedBinding: StudioBinding,
): StudioFigmaNodeReview => ({
  sourceNodeId: node.id,
  label: node.name,
  sourceType: node.type,
  suggestedRole: node.type === "TEXT" ? "main_title" : "decoration",
  suggestedStudioType,
  suggestedBinding,
  confidence: 0.9,
  source: "rule",
  decision: "needs_review",
  reason: "Fixture",
});

const convert = (
  node: FigmaNormalizedNode,
  nodeReview: StudioFigmaNodeReview,
  exportedAssets: FigmaTransientAsset[] = [],
) => convertFigmaGridCandidate({
  root: {
    id: "card",
    name: "Monday card",
    type: "FRAME",
    absoluteBounds: { left: 0, top: 0, width: 240, height: 140 },
    children: [node],
  },
  reviews: [nodeReview],
  exportedAssets,
});

const mappedNode = (candidate: StudioFigmaGridCandidate, sourceNodeId: string) =>
  candidate.component.nodes[candidate.reviewNodeIds![sourceNodeId]!]!;

test("review edits stay isolated to the edited origin variant", () => {
  const makeReview = (id: string): StudioFigmaNodeReview => ({
    sourceNodeId: id, label: id, sourceType: "TEXT", suggestedRole: "day_label", suggestedStudioType: "text",
    suggestedBinding: { kind: "builtinField", fieldId: "day.short_label" }, confidence: 0.9, source: "hybrid",
    decision: "auto", agreement: "agree", reason: "Fixture",
  });
  const candidate = convertFigmaGridOriginCandidate({
    label: "GRID", frame: { left: 0, top: 0, width: 100, height: 60 }, placementInstanceIds: [],
    variants: {
      online: { status: "online", origin: { componentId: "on", componentNodeId: "on", componentSetNodeId: "set", componentName: "Online" }, root: { id: "on", name: "Online", type: "COMPONENT", children: [{ id: "on-text", name: "day", type: "TEXT", characters: "MON" }] }, reviews: [makeReview("on-text")], exportedAssets: [] },
      offline: { status: "offline", origin: { componentId: "off", componentNodeId: "off", componentSetNodeId: "set", componentName: "Offline" }, root: { id: "off", name: "Offline", type: "COMPONENT", children: [{ id: "off-text", name: "day", type: "TEXT", characters: "OFFLINE" }] }, reviews: [makeReview("off-text")], exportedAssets: [] },
    },
  });
  const edited = structuredClone(candidate);
  edited.variants.online.reviews[0]!.suggestedBinding = { kind: "builtinField", fieldId: "entry.time" };
  const result = applyStudioFigmaReviewEdits(edited, { "on-text": true });
  const onlineId = result.variants.online.reviewNodeIds!["on-text"]!;
  const offlineId = result.variants.offline.reviewNodeIds!["off-text"]!;
  assert.deepEqual(result.variants.online.component.nodes[onlineId]!.binding, { kind: "builtinField", fieldId: "entry.time" });
  assert.deepEqual(result.variants.offline.component.nodes[offlineId]!.binding, { kind: "builtinField", fieldId: "day.short_label" });
  assert.equal(result.variants.online.reviews[0]!.decision, "manual");
  assert.equal(result.variants.offline.reviews[0]!.decision, "auto");
});

test("compatibility review edits survive JSON round-trip into the online origin variant", () => {
  const makeReview = (id: string): StudioFigmaNodeReview => ({
    sourceNodeId: id, label: id, sourceType: "TEXT", suggestedRole: "main_title", suggestedStudioType: "flexibleText",
    suggestedBinding: { kind: "builtinField", fieldId: "entry.main_title" }, confidence: 0.9, source: "hybrid",
    decision: "auto", agreement: "agree", reason: "Fixture",
  });
  const candidate = convertFigmaGridOriginCandidate({
    label: "GRID", frame: { left: 0, top: 0, width: 100, height: 60 }, placementInstanceIds: [],
    variants: {
      online: { status: "online", origin: { componentId: "on", componentNodeId: "on", componentSetNodeId: "set", componentName: "Online" }, root: { id: "on", name: "Online", type: "COMPONENT", children: [{ id: "on-title", name: "title", type: "TEXT", characters: "Online" }] }, reviews: [makeReview("on-title")], exportedAssets: [] },
      offline: { status: "offline", origin: { componentId: "off", componentNodeId: "off", componentSetNodeId: "set", componentName: "Offline" }, root: { id: "off", name: "Offline", type: "COMPONENT", children: [{ id: "off-title", name: "title", type: "TEXT", characters: "Offline" }] }, reviews: [makeReview("off-title")], exportedAssets: [] },
    },
  });
  const compatibilityCandidate = structuredClone({
    ...candidate,
    component: candidate.variants.online.component,
    reviews: candidate.variants.online.reviews,
    reviewNodeIds: candidate.variants.online.reviewNodeIds,
    reviewDefaults: candidate.variants.online.reviewDefaults,
  });
  const serialized = JSON.parse(JSON.stringify(compatibilityCandidate)) as typeof compatibilityCandidate;
  serialized.reviews[0]!.suggestedBinding = { kind: "builtinField", fieldId: "entry.time" };
  const result = applyStudioFigmaReviewEdits(serialized, { "on-title": true }) as unknown as StudioFigmaGridOriginCandidate;
  const onlineId = result.variants.online.reviewNodeIds!["on-title"]!;
  const offlineId = result.variants.offline.reviewNodeIds!["off-title"]!;
  assert.deepEqual(result.variants.online.component.nodes[onlineId]!.binding, { kind: "builtinField", fieldId: "entry.time" });
  assert.equal(result.variants.online.reviews[0]!.decision, "manual");
  assert.deepEqual(result.variants.offline.component.nodes[offlineId]!.binding, { kind: "builtinField", fieldId: "entry.main_title" });
  assert.equal(result.variants.offline.reviews[0]!.decision, "auto");
});

test("the Next route exports only POST and extraction preserves review inputs", async () => {
  assert.deepEqual(Object.keys(route).sort(), ["POST"]);

  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  process.env.FIGMA_ACCESS_TOKEN = "fixture-token";
  const reviewRequests: Array<{
    nodes: Parameters<NonNullable<Parameters<typeof createFigmaGridAnalyzeHandler>[0]["reviewNodesWithContext"]>>[0]["nodes"];
    evidenceBySourceNodeId: Record<string, { samples: Array<{ variantStatus: string; placementInstanceId: string }> }>;
    componentSetContext?: Record<string, { samples: Array<{ variantStatus: string; placementInstanceId: string }> }>;
  }> = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.searchParams.get("ids")?.includes("origin-online")) {
      return Response.json({ nodes: {
        "origin-online": { document: { id: "origin-online", name: "Online", type: "COMPONENT", children: [{ id: "title", name: "main_title", type: "TEXT", characters: "Title", size: { x: 80, y: 20 } }] } },
        "origin-offline": { document: { id: "origin-offline", name: "Offline", type: "COMPONENT", children: [{ id: "offline-title", name: "main_title", type: "TEXT", characters: "Offline", size: { x: 80, y: 20 } }] } },
      } });
    }
    return Response.json({ nodes: {
      "1:2": { document: { id: "1:2", name: "GRID", type: "FRAME", children: [
        { id: "placement-online", name: "Placement", type: "INSTANCE", componentId: "component-online", componentProperties: { status: { value: "ONLINE" } }, children: [{ id: "placement-title", name: "main_title", type: "TEXT", characters: "Online", size: { x: 80, y: 20 } }] },
        { id: "placement-offline", name: "Placement", type: "INSTANCE", componentId: "component-offline", componentProperties: { status: { value: "OFFLINE" } }, children: [{ id: "placement-offline-title", name: "main_title", type: "TEXT", characters: "Offline", size: { x: 80, y: 20 } }] },
      ] }, components: {
        "component-online": { node_id: "origin-online", name: "Online", componentSetId: "set-1" },
        "component-offline": { node_id: "origin-offline", name: "Offline", componentSetId: "set-1" },
      }, componentSets: { "set-1": { node_id: "set-1", name: "GRID cards" } } },
    } });
  };

  try {
    const handler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      reviewNodesWithContext: async (request) => {
        reviewRequests.push(request as typeof reviewRequests[number]);
        return { reviews: request.nodes.map((node) => ({
          sourceNodeId: node.id,
          label: node.name,
          sourceType: node.type,
          suggestedRole: node.type === "TEXT" ? "main_title" as const : "decoration" as const,
          suggestedStudioType: node.type === "TEXT" ? "flexibleText" as const : "group" as const,
          suggestedBinding: node.type === "TEXT" ? { kind: "builtinField" as const, fieldId: "entry.main_title" as const } : { kind: "staticText" as const, value: "" },
          confidence: 0.9,
          source: "rule" as const,
          decision: "needs_review" as const,
          reason: "Route origin fixture",
        })), warnings: [] };
      },
    });
    const response = await handler(new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        figmaUrl: "https://www.figma.com/design/AbCdEfGhIjKlMnOpQrStUv/Grid?node-id=1-2",
      }),
    }));
    assert.equal(response.status, 200);
    assert.equal(reviewRequests.length, 2);
    const requestsByRoot = new Map(reviewRequests.map((request) => [request.nodes[0]?.id, request]));
    const onlineRequest = requestsByRoot.get("origin-online");
    const offlineRequest = requestsByRoot.get("origin-offline");
    assert.ok(onlineRequest);
    assert.ok(offlineRequest);
    assert.notDeepEqual(onlineRequest?.nodes.map((node) => node.id), offlineRequest?.nodes.map((node) => node.id));
    assert.ok(Object.values(onlineRequest?.evidenceBySourceNodeId ?? {}).some((evidence) => evidence.samples.some((sample) => sample.variantStatus === "online" && sample.placementInstanceId === "placement-online")), JSON.stringify(reviewRequests));
    assert.ok(Object.values(offlineRequest?.evidenceBySourceNodeId ?? {}).some((evidence) => evidence.samples.some((sample) => sample.variantStatus === "offline" && sample.placementInstanceId === "placement-offline")), JSON.stringify(reviewRequests));
    assert.ok(Object.values(onlineRequest?.componentSetContext ?? {}).some((evidence) => evidence.samples.length > 0));
    assert.ok(Object.values(offlineRequest?.componentSetContext ?? {}).some((evidence) => evidence.samples.length > 0));
    const body = await response.json() as { candidates: Array<{ variants: { online: { component: { rootNodeId: string } }; offline: { component: { rootNodeId: string } } } }> };
    assert.equal(body.candidates.length, 1);
    assert.notEqual(body.candidates[0]?.variants.online.component.rootNodeId, body.candidates[0]?.variants.offline.component.rootNodeId);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
});

test("untouched rasterized reviews preserve converter type, binding, and static asset", () => {
  const effectNode: FigmaNormalizedNode = {
    id: "effect",
    name: "Glow",
    type: "RECTANGLE",
    effects: [{ type: "DROP_SHADOW" }],
    absoluteBounds: { left: 10, top: 10, width: 80, height: 60 },
  };
  const candidate = convert(
    effectNode,
    review(effectNode, "shape", { kind: "staticText", value: "" }),
    [{
      sourceNodeId: "effect",
      src: "data:image/png;base64,iVBORw==",
      mimeType: "image/png",
      byteSize: 4,
    }],
  );

  const result = applyStudioFigmaReviewEdits(candidate);
  assert.equal(mappedNode(result, "effect").type, "image");
  assert.equal(mappedNode(result, "effect").binding?.kind, "staticAsset");
  assert.deepEqual(result.component, candidate.component);
});

test("explicit role, type, and binding edits each apply", () => {
  const candidate = convert(
    titleNode,
    review(titleNode, "flexibleText", {
      kind: "builtinField",
      fieldId: "entry.main_title",
    }),
  );

  const roleEdited = structuredClone(candidate);
  roleEdited.reviews[0]!.suggestedRole = "time";
  assert.deepEqual(mappedNode(applyStudioFigmaReviewEdits(roleEdited), "title").binding, {
    kind: "builtinField",
    fieldId: "entry.time",
  });

  const typeEdited = structuredClone(candidate);
  typeEdited.reviews[0]!.suggestedStudioType = "text";
  assert.equal(mappedNode(applyStudioFigmaReviewEdits(typeEdited), "title").type, "text");

  const bindingEdited = structuredClone(candidate);
  bindingEdited.reviews[0]!.suggestedBinding = { kind: "staticText", value: sourceCharacters };
  assert.deepEqual(
    mappedNode(applyStudioFigmaReviewEdits(bindingEdited, { title: true }), "title").binding,
    { kind: "staticText", value: sourceCharacters },
  );
});

const createPanelHarness = () => {
  let candidate = convert(
    titleNode,
    review(titleNode, "flexibleText", {
      kind: "builtinField",
      fieldId: "entry.main_title",
    }),
  );
  const bindingTouched: Record<string, boolean> = {};
  const props = () => ({
    candidates: [candidate],
    errorMessage: null,
    figmaUrl: "",
    isAnalyzing: false,
    isImporting: false,
    isRemoteSyncing: false,
    selectedCandidateId: candidate.candidateId,
    statusMessage: null,
    onAnalyze() {},
    onBindingChange(sourceNodeId: string) { bindingTouched[sourceNodeId] = true; },
    onCancel() {},
    onCandidateSelect() {},
    onConfirm() {},
    onReviewChange(sourceNodeId: string, patch: Partial<StudioFigmaNodeReview>) {
      candidate = {
        ...candidate,
        reviews: candidate.reviews.map((item) =>
          item.sourceNodeId === sourceNodeId ? { ...item, ...patch } : item),
      };
    },
    onUrlChange() {},
  });
  const selects = () => {
    const found: React.ReactElement<{
      value: string;
      onChange: (event: { currentTarget: { value: string } }) => void;
    }>[] = [];
    const visit = (node: React.ReactNode) => React.Children.forEach(node, (child) => {
      if (!React.isValidElement<{ children?: React.ReactNode }>(child)) return;
      if (child.type === "select") found.push(child as typeof found[number]);
      visit(child.props.children);
    });
    visit(StudioFigmaComponentImport(props()));
    return found;
  };
  return {
    confirm: () => applyStudioFigmaReviewEdits(candidate, bindingTouched),
    markup: () => renderToStaticMarkup(<StudioFigmaComponentImport {...props()} />),
    selects,
  };
};

test("role edits update both the displayed and confirmed binding", () => {
  const panel = createPanelHarness();
  panel.selects()[0]!.props.onChange({ currentTarget: { value: "day_label" } });
  assert.equal(panel.selects()[2]!.props.value, "day.short_label");
  assert.match(panel.markup(), /value="day.short_label" selected=""/);
  assert.deepEqual(mappedNode(panel.confirm(), "title").binding, {
    kind: "builtinField",
    fieldId: "day.short_label",
    dayLabelFormat: "shortUpper",
  });
});

test("selecting staticText preserves the original source characters", () => {
  const panel = createPanelHarness();
  panel.selects()[2]!.props.onChange({ currentTarget: { value: "staticText" } });
  assert.deepEqual(mappedNode(panel.confirm(), "title").binding, {
    kind: "staticText",
    value: sourceCharacters,
  });
});
