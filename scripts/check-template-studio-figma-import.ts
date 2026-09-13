import assert from "node:assert/strict";
import type {
  FigmaNormalizedNode,
  FigmaSemanticEvidence,
  StudioFigmaGridCandidate,
  StudioFigmaGridOriginCandidate,
  StudioFigmaNodeReview,
} from "../src/types/template-studio-figma";
import type { StudioAsset } from "../src/types/template-studio";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { applyStudioFigmaGridCandidate } from "../src/utils/template-studio/figma-import/figma-component-import";
import { ensureStudioIndependentStatusVariants } from "../src/utils/template-studio/status-variants";
import { parseFigmaDesignUrl } from "../src/utils/template-studio/figma-import/figma-url";
import {
  adjustFigmaRectForCssCenterRotation,
  normalizeFigmaRotation,
} from "../src/utils/template-studio/figma-import/figma-rotation";
import {
  classifyFigmaTextNode,
  normalizeFigmaLayerName,
} from "../src/utils/template-studio/figma-import/figma-text-classifier";
import {
  inferFigmaSemanticEvidence,
  mapFigmaPlacementNodesToOrigin,
  normalizeFigmaSemanticValue,
} from "../src/utils/template-studio/figma-import/figma-placement-inference";
import {
  convertFigmaGridCandidate,
  convertFigmaGridOriginCandidate,
} from "../src/utils/template-studio/figma-import/figma-node-converter";
import { applyStudioFigmaReviewEdits } from "../src/utils/template-studio/figma-import/figma-review-edits";
import {
  exportFigmaNodeAsDataUrl,
  fetchFigmaGridCandidates,
  fetchFigmaGridOriginCandidates,
  normalizeFigmaNode,
} from "../src/services/server/figmaTemplateStudioService";
import {
  groupFigmaGridPlacements,
  inferFigmaGridOriginVariantStatus,
  inferFigmaGridVariantStatus,
  resolveFigmaOriginComponent,
} from "../src/utils/template-studio/figma-import/figma-origin";
import { fuseFigmaReview } from "../src/utils/template-studio/figma-import/figma-review-fusion";
import { planStudioAssetSync } from "../src/utils/template-studio/asset-sync";
import {
  reviewFigmaGridNodes,
  reviewFigmaGridNodesWithWarnings,
  type FigmaReviewInput,
} from "../src/services/server/figmaGridReviewService";
import { createFigmaGridAnalyzeHandler } from "../src/services/server/figmaGridAnalyzeHandler";

const validUrl =
  "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1412-5814";

const runTask9AssetSyncChecks = () => {
  const dataUrls = [
    ["image/png", "iVBORw0KGgo="],
    ["image/jpeg", "/9j/4AAQ"],
    ["image/svg+xml", "PHN2Zz48L3N2Zz4="],
    ["image/webp", "UklGRg=="],
  ] as const;

  for (const [mimeType, payload] of dataUrls) {
    const src = `data:${mimeType};base64,${payload}`;
    const asset: StudioAsset = {
      id: `task9-${mimeType}`,
      label: `Task 9 ${mimeType}`,
      src,
    };
    const plan = planStudioAssetSync({
      assets: [asset],
      remoteAssets: [],
      localMetadataByAssetId: {},
    });
    assert.equal(
      plan.uploads.length,
      1,
      `${mimeType} data URL is planned for upload`,
    );
    assert.equal(plan.uploads[0]?.src, src);
    assert.equal(plan.patches.length, 0);
  }
};

runTask9AssetSyncChecks();

assert.deepEqual(parseFigmaDesignUrl(validUrl), {
  fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
  nodeId: "1412:5814",
});
assert.deepEqual(
  parseFigmaDesignUrl(
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=12-34",
  ),
  { fileKey: "T2VDXkMPVFa6yEl9FnVvYo", nodeId: "12:34" },
);
assert.equal(
  parseFigmaDesignUrl(
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid",
  ),
  null,
);
assert.equal(
  parseFigmaDesignUrl(
    "https://www.figma.com/file/T2VDXkMPVFa6yEl9FnVvYo/Weekly-Grid?node-id=1-2",
  ),
  null,
);
assert.equal(
  parseFigmaDesignUrl("https://www.figma.com/design/file/name?node-id=1-2"),
  null,
);

const metadataContract: FigmaNormalizedNode = {
  id: "1:2",
  name: "Title",
  type: "TEXT",
  textAutoResize: "WIDTH_AND_HEIGHT",
  layoutSizingHorizontal: "HUG",
  rotateDeg: -13.5,
  localSize: { width: 160, height: 100 },
};
assert.equal(metadataContract.rotateDeg, -13.5);
assert.equal(metadataContract.textAutoResize, "WIDTH_AND_HEIGHT");

const originComponentSetId = "component-set-1";
const onlineComponentId = "component-online";
const offlineComponentId = "component-offline";
const placementFixture = [
  ["sun", onlineComponentId, "SUN", 720],
  ["mon", onlineComponentId, "MON", 100],
  ["offline-2", offlineComponentId, "SUN", 620],
  ["wed", onlineComponentId, "WED", 300],
  ["offline-1", offlineComponentId, "MON", 500],
  ["tue", onlineComponentId, "TUE", 200],
  ["thu", onlineComponentId, "THU", 400],
] as const;
const rawOriginFixture = {
  id: "grid",
  name: "GRID",
  type: "FRAME",
  children: placementFixture.map(([id, componentId, day, left]) => ({
    id,
    name: `Placement ${day}`,
    type: "INSTANCE",
    componentId,
    componentProperties: { status: { value: componentId === offlineComponentId ? "OFFLINE" : "ONLINE" } },
    overrides: [{ id: `${id}-day`, characters: day }],
    absoluteBoundingBox: { x: left, y: 20 + left / 10, width: 100, height: 80 },
    children: [{ id: `${id}-day`, name: "weekday", type: "TEXT", characters: day }],
  })),
};
const normalizedPlacementFixture = rawOriginFixture.children.map(normalizeFigmaNode);
assert.equal(normalizedPlacementFixture[0]!.componentId, onlineComponentId);
assert.deepEqual(normalizedPlacementFixture[0]!.componentProperties, rawOriginFixture.children[0]!.componentProperties);
assert.deepEqual(normalizedPlacementFixture[0]!.overrides, rawOriginFixture.children[0]!.overrides);
assert.deepEqual(normalizedPlacementFixture[0]!.frame, { left: 720, top: 92, width: 100, height: 80 });
assert.deepEqual(
  resolveFigmaOriginComponent({
    instance: normalizedPlacementFixture[0]!,
    components: {
      [onlineComponentId]: { id: onlineComponentId, name: "Online Origin", componentSetId: originComponentSetId },
    },
    componentSets: { [originComponentSetId]: { id: originComponentSetId, name: "Grid Origins" } },
  }),
  {
    componentId: onlineComponentId,
    componentNodeId: onlineComponentId,
    componentSetNodeId: originComponentSetId,
    componentName: "Online Origin",
    componentSetName: "Grid Origins",
  },
);
assert.deepEqual(
  resolveFigmaOriginComponent({
    instance: normalizedPlacementFixture[0]!,
    components: {
      [onlineComponentId]: {
        id: onlineComponentId,
        node_id: onlineComponentId,
        name: "Online Origin",
        containing_frame: { containingComponentSet: "origin-set-node" },
      },
    },
    componentSets: {
      "origin-set-key": { node_id: "origin-set-node", name: "Grid Origins" },
    },
  }),
  {
    componentId: onlineComponentId,
    componentNodeId: onlineComponentId,
    componentSetNodeId: "origin-set-key",
    componentName: "Online Origin",
    componentSetName: "Grid Origins",
  },
  "Official containing_frame metadata resolves through the component-set response key.",
);
const realFigmaComponentNodeId = "1390:11415";
const realFigmaComponentSetNodeId = "1390:10823";
assert.deepEqual(
  resolveFigmaOriginComponent({
    instance: { componentId: realFigmaComponentNodeId },
    components: {
      [realFigmaComponentNodeId]: {
        key: "library-component-hash",
        name: "Online Origin",
        componentSetId: realFigmaComponentSetNodeId,
      },
    },
    componentSets: {
      [realFigmaComponentSetNodeId]: { name: "Grid Origins" },
    },
  }),
  {
    componentId: realFigmaComponentNodeId,
    componentNodeId: realFigmaComponentNodeId,
    componentSetNodeId: realFigmaComponentSetNodeId,
    componentName: "Online Origin",
    componentSetName: "Grid Origins",
  },
  "Real Figma component map keys are node IDs, not library hashes.",
);
const placementGroups = groupFigmaGridPlacements({
  placements: normalizedPlacementFixture.map((instance) => ({
    instance,
    origin: resolveFigmaOriginComponent({
      instance,
      components: {
        [onlineComponentId]: { id: onlineComponentId, name: "Online Origin", componentSetId: originComponentSetId },
        [offlineComponentId]: { id: offlineComponentId, name: "Offline Origin", componentSetId: originComponentSetId },
      },
      componentSets: { [originComponentSetId]: { id: originComponentSetId, name: "Grid Origins" } },
    })!,
  })),
});
assert.deepEqual(Object.keys(placementGroups), [originComponentSetId]);
assert.equal(placementGroups[originComponentSetId]!.origins.length, 2);
assert.equal(placementGroups[originComponentSetId]!.placementInstanceIds.length, 7);
for (const status of ["online", "offline", "ONLINE", "OFFLINE"] as const) {
  assert.equal(inferFigmaGridVariantStatus({ status }), status.toLowerCase());
}
assert.equal(
  inferFigmaGridVariantStatus({ componentProperties: { status: { value: "ONLINE" } } }),
  "online",
);
assert.equal(
  inferFigmaGridOriginVariantStatus({
    root: { id: "origin-online", name: "Origin", type: "COMPONENT", componentProperties: { status: { value: "ONLINE" } } },
    origin: { componentId: "online", componentNodeId: "origin-online", componentSetNodeId: "set", componentName: "Online" },
  }),
  "online",
);
assert.equal(
  inferFigmaGridOriginVariantStatus({
    root: { id: "origin-conflict", name: "Origin", type: "COMPONENT", componentProperties: { status: { value: "ONLINE" }, variant: { value: "OFFLINE" } } },
    origin: { componentId: "conflict", componentNodeId: "origin-conflict", componentSetNodeId: "set", componentName: "Conflict" },
  }),
  null,
);
for (const input of [{ status: "offlineMemo" }, { status: "multi" }, {}, { status: "ONLINE", variant: "OFFLINE" }]) {
  assert.equal(inferFigmaGridVariantStatus(input), null);
}
const reviewSources = ["rule", "ai", "hybrid"] as const satisfies StudioFigmaNodeReview["source"][];
const reviewDecisions = ["auto", "needs_review", "manual"] as const satisfies StudioFigmaNodeReview["decision"][];
const reviewAgreements = ["agree", "rule_only", "ai_only", "disagree"] as const;
assert.deepEqual(reviewSources, ["rule", "ai", "hybrid"]);
assert.deepEqual(reviewDecisions, ["auto", "needs_review", "manual"]);
assert.deepEqual(reviewAgreements, ["agree", "rule_only", "ai_only", "disagree"]);
const evidenceSample = {
  placementInstanceId: "mon",
  variantStatus: "online",
  originNodeId: "origin-day",
  value: "MON",
} as const;
assert.deepEqual(evidenceSample, {
  placementInstanceId: "mon",
  variantStatus: "online",
  originNodeId: "origin-day",
  value: "MON",
});
const reviewContract = fuseFigmaReview({
  rule: {
    sourceNodeId: "day",
    label: "weekday",
    sourceType: "TEXT",
    suggestedRole: "day_label",
    suggestedStudioType: "text",
    suggestedBinding: { kind: "builtinField", fieldId: "day.short_label", dayLabelFormat: "shortUpper" },
    confidence: 0.9,
    source: "rule",
    decision: "auto",
    reason: "Known weekday values.",
  },
  ai: { suggestedRole: "day_label", suggestedStudioType: "text", confidence: 0.8, reason: "The samples are weekdays." },
  evidence: {
    samples: [evidenceSample, { ...evidenceSample, placementInstanceId: "tue", value: "TUE" }],
    sampleValues: ["MON", "TUE"], matchedPlacementCount: 2, distinctValueCount: 2,
    signals: ["known_weekday_set"], mapping: "stable_path",
  },
});
assert.equal(reviewContract.source, "hybrid");
assert.equal(reviewContract.agreement, "agree");
assert.equal(reviewContract.decision, "auto");
const rulesOnlyReview = fuseFigmaReview({
  rule: { ...reviewContract, source: "rule", decision: "needs_review", agreement: undefined, aiCandidate: undefined },
});
assert.equal(rulesOnlyReview.agreement, "rule_only");
const disagreementReview = fuseFigmaReview({
  rule: { ...reviewContract, suggestedRole: "day_label", source: "rule", decision: "needs_review", agreement: undefined, aiCandidate: undefined },
  ai: { suggestedRole: "unknown", suggestedStudioType: "text", confidence: 0.7, reason: "Ambiguous." },
  evidence: reviewContract.evidence,
});
assert.equal(disagreementReview.agreement, "disagree");
assert.equal(disagreementReview.decision, "needs_review");
const aiOnlyReview = fuseFigmaReview({
  rule: {
    ...reviewContract,
    suggestedRole: "unknown",
    suggestedBinding: { kind: "staticText", value: "Original" },
    source: "rule",
    decision: "needs_review",
    agreement: undefined,
    ruleCandidate: undefined,
    aiCandidate: undefined,
  },
  ai: { suggestedRole: "main_title", suggestedStudioType: "flexibleText", confidence: 0.75, reason: "Title-like content." },
});
assert.equal(aiOnlyReview.source, "hybrid");
assert.equal(aiOnlyReview.agreement, "ai_only");
assert.equal(aiOnlyReview.decision, "needs_review");
assert.deepEqual(aiOnlyReview.suggestedBinding, { kind: "builtinField", fieldId: "entry.main_title" });
for (const [suggestedRole, suggestedBinding] of [
  ["day_label", { kind: "builtinField", fieldId: "day.short_label", dayLabelFormat: "shortUpper" }],
  ["date", { kind: "builtinField", fieldId: "day.date", dateRangeFormat: "day" }],
  ["time", { kind: "builtinField", fieldId: "entry.time" }],
] as const) {
  const stableMappingOnly = fuseFigmaReview({
    rule: {
      ...reviewContract,
      sourceNodeId: `stable-${suggestedRole}`,
      suggestedRole,
      suggestedBinding,
      source: "rule",
      decision: "auto",
      agreement: undefined,
      aiCandidate: undefined,
      ruleCandidate: undefined,
    },
    evidence: {
      samples: [evidenceSample],
      sampleValues: [evidenceSample.value],
      matchedPlacementCount: 1,
      distinctValueCount: 1,
      signals: ["stable_origin_mapping"],
      mapping: "stable_path",
    },
  });
  assert.equal(stableMappingOnly.decision, "needs_review", `${suggestedRole} needs a recognized evidence signal before auto approval`);
}

assert.equal(normalizeFigmaRotation(undefined), undefined);
assert.equal(normalizeFigmaRotation(0), 0);
assert.equal(normalizeFigmaRotation(Math.PI / 2), 90);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 10,
    top: 20,
    width: 40,
    height: 30,
    rotateDeg: 0,
  }),
  { left: 10, top: 20, width: 40, height: 30 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 31,
    top: 3,
    width: 160,
    height: 100,
    rotateDeg: -13.5,
  }),
  // Controller ruling: 20.29 is intentional. Absolute sine/cosine bounds
  // are the project contract; the brief's literal 19.52 is inconsistent.
  { left: 40.46, top: 20.29, width: 160, height: 100 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
    rotatedWidth: 30,
    rotatedHeight: 25,
  }),
  { left: 10, top: 14.5, width: 20, height: 10 },
);
assert.deepEqual(
  adjustFigmaRectForCssCenterRotation({
    left: 5,
    top: 7,
    width: 20,
    height: 10,
    rotateDeg: 45,
  }),
  { left: 5.61, top: 12.61, width: 20, height: 10 },
);

assert.equal(normalizeFigmaLayerName("mainTitle"), "maintitle");
assert.equal(normalizeFigmaLayerName("main_title"), "maintitle");
assert.equal(normalizeFigmaLayerName("main-title"), "maintitle");
assert.equal(normalizeFigmaLayerName("MAIN TITLE"), "maintitle");

const title = classifyFigmaTextNode({
  name: "main_title",
  characters: "A title",
});
assert.equal(title.role, "main_title");
assert.ok(title.confidence > 0);
assert.match(title.reason, /semantic/i);
assert.equal(title.binding.kind, "builtinField");
if (title.binding.kind === "builtinField")
  assert.equal(title.binding.fieldId, "entry.main_title");

const camelTitle = classifyFigmaTextNode({
  name: "mainTitle",
  characters: "A title",
});
assert.equal(camelTitle.role, "main_title");
assert.equal(camelTitle.studioType, "flexibleText");

const subTitle = classifyFigmaTextNode({
  name: "sub_title",
  characters: "Subtitle",
});
assert.equal(subTitle.role, "sub_title");
assert.equal(subTitle.studioType, "flexibleText");
if (subTitle.binding.kind === "builtinField")
  assert.equal(subTitle.binding.fieldId, "entry.sub_title");

for (const name of ["offline_memo", "offlineMemo", "OFFLINE MEMO", "오프라인 메모"]) {
  const offlineMemo = classifyFigmaTextNode({ name, characters: "Closed today" });
  assert.equal(offlineMemo.role, "offline_memo", name);
  assert.equal(offlineMemo.studioType, "flexibleText", name);
  assert.deepEqual(offlineMemo.binding, { kind: "builtinField", fieldId: "day.offline_memo" }, name);
}
const offlineMemoContentCollision = classifyFigmaTextNode({ name: "offline_memo", characters: "offline" });
assert.equal(offlineMemoContentCollision.role, "offline_memo");
assert.equal(offlineMemoContentCollision.studioType, "flexibleText");
assert.deepEqual(offlineMemoContentCollision.binding, { kind: "builtinField", fieldId: "day.offline_memo" });
for (const name of ["weekly_memo", "artist_text", "weeklyMemo", "artistProfileText"]) {
  const excluded = classifyFigmaTextNode({ name, characters: "Keep ordinary" });
  assert.notEqual(excluded.role, "offline_memo", name);
  assert.equal(excluded.studioType, "text", name);
}

const time = classifyFigmaTextNode({
  name: "PM 8:00",
  characters: "PM 8:00",
  layoutSizingHorizontal: "FILL",
});
assert.equal(time.role, "time");
assert.equal(time.studioType, "text");
if (time.binding.kind === "builtinField")
  assert.equal(time.binding.fieldId, "entry.time");

const day = classifyFigmaTextNode({
  name: "MON",
  characters: "MON",
  textAutoResize: "WIDTH_AND_HEIGHT",
});
assert.equal(day.role, "day_label");
assert.equal(day.studioType, "text");
if (day.binding.kind === "builtinField")
  assert.equal(day.binding.fieldId, "day.short_label");

const date = classifyFigmaTextNode({
  name: "07",
  characters: "07",
  layoutSizingHorizontal: "FILL",
});
assert.equal(date.role, "date");
assert.equal(date.studioType, "text");
assert.deepEqual(date.binding, {
  kind: "builtinField",
  fieldId: "day.date",
  dateRangeFormat: "day",
});

const status = classifyFigmaTextNode({
  name: "ONLINE",
  characters: "ONLINE",
  layoutSizingHorizontal: "FILL",
});
assert.equal(status.role, "status_label");
assert.equal(status.studioType, "text");
if (status.binding.kind === "builtinField")
  assert.equal(status.binding.fieldId, "entry.status_label");

const dynamicTitle = classifyFigmaTextNode({
  name: "title",
  characters: "A long dynamic title",
  textAutoResize: "HEIGHT",
  layoutSizingHorizontal: "FILL",
});
assert.equal(dynamicTitle.role, "main_title");
assert.equal(dynamicTitle.studioType, "flexibleText");

const unknown = classifyFigmaTextNode({
  name: "mystery",
  characters: "Keep me",
});
assert.equal(unknown.role, "unknown");
assert.deepEqual(unknown.binding, { kind: "staticText", value: "Keep me" });
assert.match(unknown.reason, /review/i);

const semanticOrigin: FigmaNormalizedNode = {
  id: "origin-card",
  name: "Origin Card",
  type: "COMPONENT",
  children: [
    { id: "origin-day", name: "weekday", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
    { id: "origin-date", name: "date", type: "TEXT", characters: "01", localSize: { width: 20, height: 12 } },
    { id: "origin-time", name: "time", type: "TEXT", characters: "AM 9:05", localSize: { width: 40, height: 12 } },
    { id: "origin-status", name: "status", type: "TEXT", characters: "ONLINE", localSize: { width: 45, height: 12 } },
    { id: "origin-title", name: "Headline", type: "TEXT", characters: "Title", localSize: { width: 80, height: 12 } },
    { id: "origin-memo", name: "MEMO", type: "TEXT", characters: "REST DAY", visible: false },
  ],
};
const semanticValues = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const semanticPlacements = semanticValues.map((value, index) => ({
  instanceId: `placement-${value}`,
  status: index < 5 ? "online" as const : "offline" as const,
  root: {
    id: `placement-${value}`,
    name: "Placement",
    type: "INSTANCE",
    absoluteBounds: { left: 1000 - index * 100, top: 500 + index, width: 140, height: 180 },
    children: [
      { id: `day-${value}`, name: "weekday", type: "TEXT", characters: value, localSize: { width: 30, height: 12 }, overrides: [{ id: "origin-day" }] },
      { id: `date-${value}`, name: "date", type: "TEXT", characters: String(index + 1).padStart(2, "0"), localSize: { width: 20, height: 12 } },
      { id: `time-${value}`, name: "time", type: "TEXT", characters: index % 2 ? "21:05" : "PM 8:00", localSize: { width: 40, height: 12 } },
      { id: `status-${value}`, name: "status", type: "TEXT", characters: index < 5 ? "ONLINE" : "OFFLINE", localSize: { width: 45, height: 12 } },
      { id: `title-${value}`, name: index % 2 ? "제목" : "Title", type: "TEXT", characters: index % 2 ? `다른 제목 ${index}` : `Another title ${index}`, localSize: { width: 80, height: 12 } },
      { id: `memo-${value}`, name: "MEMO", type: "TEXT", characters: "REST DAY", visible: false },
    ],
  },
}));
const semanticMapping = mapFigmaPlacementNodesToOrigin({ origin: semanticOrigin, placements: semanticPlacements });
assert.equal(normalizeFigmaSemanticValue(" Tue "), "tue");
assert.equal(normalizeFigmaSemanticValue("Monday"), "mon");
assert.equal(normalizeFigmaSemanticValue("07"), "7");
assert.equal(Object.values(semanticMapping.evidenceByOriginNodeId).length, 5);
const semanticReviews = inferFigmaSemanticEvidence({
  origin: semanticOrigin,
  evidenceByOriginNodeId: semanticMapping.evidenceByOriginNodeId,
});
assert.equal(semanticReviews.find((entry) => entry.sourceNodeId === "origin-day")?.candidate.suggestedRole, "day_label");
assert.equal(semanticReviews.find((entry) => entry.sourceNodeId === "origin-date")?.candidate.suggestedRole, "date");
assert.equal(semanticReviews.find((entry) => entry.sourceNodeId === "origin-time")?.candidate.suggestedRole, "time");
assert.equal(semanticReviews.find((entry) => entry.sourceNodeId === "origin-status")?.candidate.suggestedRole, "status_label");
assert.equal(semanticReviews.find((entry) => entry.sourceNodeId === "origin-title"), undefined);
assert.equal(semanticReviews.some((entry) => entry.sourceNodeId === "origin-memo"), false);
assert.equal(semanticMapping.warnings.length, 0);
const onlineEvidence = mapFigmaPlacementNodesToOrigin({ origin: semanticOrigin, placements: semanticPlacements.slice(0, 5) });
const offlineEvidence = mapFigmaPlacementNodesToOrigin({ origin: semanticOrigin, placements: semanticPlacements.slice(5) });
const aggregatedDay = inferFigmaSemanticEvidence({
  origin: semanticOrigin,
  evidenceByOriginNodeId: onlineEvidence.evidenceByOriginNodeId,
  componentSetEvidence: offlineEvidence.evidenceByOriginNodeId,
}).find((entry) => entry.sourceNodeId === "origin-day");
assert.equal(aggregatedDay?.candidate.suggestedRole, "day_label");
assert.equal(aggregatedDay?.evidence.samples.length, 7);
const dateOnlyEvidence = {
  "origin-date": onlineEvidence.evidenceByOriginNodeId["origin-date"]!,
};
const dateWithAggregatedDay = inferFigmaSemanticEvidence({
  origin: semanticOrigin,
  evidenceByOriginNodeId: dateOnlyEvidence,
  componentSetEvidence: {
    "origin-day": onlineEvidence.evidenceByOriginNodeId["origin-day"]!,
  },
}).find((entry) => entry.sourceNodeId === "origin-date");
assert.equal(dateWithAggregatedDay?.candidate.suggestedRole, "date");

const reversedOrigin: FigmaNormalizedNode = {
  id: "reversed-origin",
  name: "Card",
  type: "COMPONENT",
  children: [
    { id: "reversed-day", name: "weekday", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
    { id: "reversed-date", name: "date", type: "TEXT", characters: "01", localSize: { width: 20, height: 12 } },
  ],
};
const reversedMapping = mapFigmaPlacementNodesToOrigin({
  origin: reversedOrigin,
  placements: [{ instanceId: "reversed-placement", status: "online", root: {
    id: "reversed-placement", name: "Placement", type: "INSTANCE",
    children: [
      { id: "reversed-date-value", name: "date", type: "TEXT", characters: "07", localSize: { width: 20, height: 12 } },
      { id: "reversed-day-value", name: "weekday", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
    ],
  } }],
});
assert.equal(reversedMapping.evidenceByOriginNodeId["reversed-day"]?.samples[0]?.value, "MON");
assert.equal(reversedMapping.evidenceByOriginNodeId["reversed-date"]?.samples[0]?.value, "07");

const randomNumberOrigin: FigmaNormalizedNode = {
  id: "random-origin",
  name: "Card",
  type: "COMPONENT",
  children: [{ id: "random-number", name: "Headline", type: "TEXT", characters: "42", localSize: { width: 20, height: 12 } }],
};
const randomNumberMapping = mapFigmaPlacementNodesToOrigin({
  origin: randomNumberOrigin,
  placements: [{ instanceId: "random-placement", status: "online", root: {
    id: "random-placement", name: "Placement", type: "INSTANCE",
    children: [{ id: "random-value", name: "Headline", type: "TEXT", characters: "42", localSize: { width: 20, height: 12 } }],
  } }],
});
assert.equal(inferFigmaSemanticEvidence({ origin: randomNumberOrigin, evidenceByOriginNodeId: randomNumberMapping.evidenceByOriginNodeId }).length, 0);

const ambiguousOrigin: FigmaNormalizedNode = {
  id: "ambiguous-origin",
  name: "Card",
  type: "COMPONENT",
  children: [
    { id: "ambiguous-a", name: "value", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
    { id: "ambiguous-b", name: "value", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
  ],
};
const ambiguousMapping = mapFigmaPlacementNodesToOrigin({
  origin: ambiguousOrigin,
  placements: [{ instanceId: "ambiguous-placement", status: "online", root: {
    id: "ambiguous-placement", name: "Placement", type: "INSTANCE",
    children: [{ id: "ambiguous-wrapper", name: "Wrapper", type: "FRAME", children: [
      { id: "ambiguous-value", name: "value", type: "TEXT", characters: "MON", localSize: { width: 30, height: 12 } },
    ] }],
  } }],
});
assert.ok(ambiguousMapping.warnings.some((warning) => /ambiguous/i.test(warning)));
assert.equal(Object.keys(ambiguousMapping.evidenceByOriginNodeId).length, 0);
const coordinateOnlyMapping = mapFigmaPlacementNodesToOrigin({
  origin: semanticOrigin,
  placements: [{ instanceId: "coordinate-only", status: "online", root: {
    id: "coordinate-only", name: "Placement", type: "INSTANCE",
    absoluteBounds: semanticOrigin.absoluteBounds,
    children: [{ id: "coordinate-only-value", name: "Unrelated", type: "TEXT", characters: "MON", localSize: { width: 999, height: 999 }, absoluteBounds: semanticOrigin.children?.[0]?.absoluteBounds }],
  } }],
});
assert.ok(coordinateOnlyMapping.warnings.some((warning) => /no origin descendant/i.test(warning)));
assert.equal(Object.keys(coordinateOnlyMapping.evidenceByOriginNodeId).length, 0);
const sensitiveMapping = mapFigmaPlacementNodesToOrigin({
  origin: { id: "safe-origin", name: "Card", type: "COMPONENT", children: [
    { id: "safe-text", name: "safe", type: "TEXT", characters: "safe", localSize: { width: 30, height: 12 } },
  ] },
  placements: [{ instanceId: "unsafe-placement", status: "online", root: {
    id: "unsafe-placement", name: "https://figma.example/file?token=secret", type: "INSTANCE",
    children: [{ id: "unsafe-text", name: "https://figma.example/file?token=secret", type: "TEXT", characters: "https://figma.example/export.png", localSize: { width: 30, height: 12 } }],
  } }],
});
assert.doesNotMatch(JSON.stringify(sensitiveMapping), /https:\/\/figma\.example|token=secret|export\.png/);
assert.match(JSON.stringify(sensitiveMapping), /redacted/i);

const handoffEvidence: FigmaSemanticEvidence = semanticMapping.evidenceByOriginNodeId["origin-day"]!;

for (const [characters, role, fieldId] of [
  ["PM 8:00", "time", "entry.time"],
  ["MON", "day_label", "day.short_label"],
  ["07", "date", "day.date"],
  ["ONLINE", "status_label", "entry.status_label"],
] as const) {
  const protectedRole = classifyFigmaTextNode({
    name: "value",
    characters,
    layoutSizingHorizontal: "FILL",
  });
  assert.equal(protectedRole.role, role);
  assert.equal(protectedRole.studioType, "text");
  assert.equal(protectedRole.binding.kind, "builtinField");
  if (protectedRole.binding.kind === "builtinField")
    assert.equal(protectedRole.binding.fieldId, fieldId);
  assert.ok(protectedRole.confidence > 0);
  assert.match(protectedRole.reason, /semantic/i);
}

const gridReviewNodes: FigmaReviewInput[] = [
  {
    id: "grid-card-title",
    name: "Title",
    type: "TEXT",
    characters: "Weekly broadcast",
    textAutoResize: "HEIGHT",
    layoutSizingHorizontal: "FILL",
    absoluteBounds: { left: 20, top: 30, width: 120, height: 36 },
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-card-day",
    name: "MON",
    type: "TEXT",
    characters: "MON",
    absoluteBounds: { left: 20, top: 10, width: 32, height: 18 },
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-card-offline-memo",
    name: "offline_memo",
    type: "TEXT",
    characters: "Closed today",
    textAutoResize: "HEIGHT",
    layoutSizingHorizontal: "FILL",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
];

const nonTextGridReviewNodes: FigmaReviewInput[] = [
  {
    id: "grid-decoration-image-1",
    name: "Image decoration one",
    type: "IMAGE",
    styleFlags: { hasSolidFill: false, hasImageFill: true, hasChildren: false },
  },
  {
    id: "grid-decoration-shape-1",
    name: "Shape decoration one",
    type: "RECTANGLE",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-decoration-group-1",
    name: "Group decoration one",
    type: "FRAME",
    styleFlags: { hasSolidFill: false, hasImageFill: false, hasChildren: true },
  },
  {
    id: "grid-decoration-image-2",
    name: "Image decoration two",
    type: "IMAGE",
    styleFlags: { hasSolidFill: false, hasImageFill: true, hasChildren: false },
  },
  {
    id: "grid-decoration-shape-2",
    name: "Shape decoration two",
    type: "RECTANGLE",
    styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
  },
  {
    id: "grid-decoration-group-2",
    name: "Group decoration two",
    type: "FRAME",
    styleFlags: { hasSolidFill: false, hasImageFill: false, hasChildren: true },
  },
];

const runReviewServiceChecks = async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.OPENAI_ACCESS_TOKEN;
  const originalModel = process.env.OPENAI_FIGMA_REVIEW_MODEL;
  const privateFigmaUrl =
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Private-Grid?node-id=1412-5814";
  const temporaryAssetUrl = "https://temporary.example/export.png";
  const openAiSecret = "openai-secret-token";

  const responseJson = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    const handoffReview = await reviewFigmaGridNodesWithWarnings([{
      id: "origin-day",
      name: "weekday",
      type: "TEXT",
      characters: "MON",
      evidence: handoffEvidence,
      componentSetEvidence: aggregatedDay?.evidence,
      styleFlags: { hasSolidFill: true, hasImageFill: false, hasChildren: false },
    }]);
    assert.deepEqual(handoffReview.reviews[0]?.evidence, handoffEvidence);

    delete process.env.OPENAI_ACCESS_TOKEN;
    delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    const rulesOnly = await reviewFigmaGridNodes(gridReviewNodes);
    assert.equal(rulesOnly.length, 3);
    assert.equal(rulesOnly[0]?.source, "rule");
    assert.equal(rulesOnly[0]?.suggestedRole, "main_title");
    assert.equal(rulesOnly[0]?.suggestedStudioType, "flexibleText");
    assert.equal(rulesOnly[1]?.suggestedRole, "day_label");
    assert.equal(rulesOnly[2]?.suggestedRole, "offline_memo");
    assert.equal(rulesOnly[2]?.suggestedStudioType, "flexibleText");
    assert.deepEqual(rulesOnly[2]?.suggestedBinding, { kind: "builtinField", fieldId: "day.offline_memo" });

    const explicitOfflineMemo = await reviewFigmaGridNodesWithWarnings({
      nodes: [gridReviewNodes[2]!],
      evidenceBySourceNodeId: {},
    });
    assert.equal(explicitOfflineMemo.reviews[0]?.suggestedStudioType, "flexibleText");

    const stableDayEvidence: FigmaSemanticEvidence = {
      samples: [
        { placementInstanceId: "p-mon", variantStatus: "online", originNodeId: "grid-card-day", value: "MON" },
        { placementInstanceId: "p-tue", variantStatus: "online", originNodeId: "grid-card-day", value: "TUE" },
      ],
      sampleValues: ["MON", "TUE"],
      matchedPlacementCount: 2,
      distinctValueCount: 2,
      signals: ["stable_origin_mapping", "known_weekday_set"],
      mapping: "stable_path",
    };
    const evidenceRulesOnly = await reviewFigmaGridNodesWithWarnings({
      nodes: [{ ...gridReviewNodes[1]!, evidence: stableDayEvidence }],
      evidenceBySourceNodeId: { "grid-card-day": stableDayEvidence },
    });
    assert.equal(evidenceRulesOnly.reviews[0]?.decision, "auto");
    assert.equal(evidenceRulesOnly.reviews[0]?.source, "rule");
    assert.equal((await reviewFigmaGridNodesWithWarnings({
      nodes: [gridReviewNodes[0]!],
      evidenceBySourceNodeId: {},
    })).reviews[0]?.decision, "needs_review");

    const unavailable = await reviewFigmaGridNodesWithWarnings(gridReviewNodes);
    assert.equal(unavailable.reviews[0]?.source, "rule");
    assert.match(unavailable.warnings[0] ?? "", /automated review/i);

    process.env.OPENAI_ACCESS_TOKEN = openAiSecret;
    process.env.OPENAI_FIGMA_REVIEW_MODEL = "fixed-grid-review-model";
    let aiResponse: unknown = {
      reviews: [
        {
          sourceNodeId: "grid-card-title",
          suggestedRole: "main_title",
          suggestedStudioType: "flexibleText",
          confidence: 0.88,
          reason: "The GRID card title is dynamic.",
        },
      ],
    };
    let capturedOpenAiBody = "";
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(input), "https://api.openai.com/v1/chat/completions");
      capturedOpenAiBody = String(init?.body ?? "");
      return responseJson({
        choices: [{ message: { content: JSON.stringify(aiResponse) } }],
      });
    }) as typeof fetch;

    aiResponse = {
      reviews: [{
        sourceNodeId: "grid-card-day",
        suggestedRole: "day_label",
        suggestedStudioType: "text",
        confidence: 0.9,
        reason: "The node contains a weekday label.",
      }],
    };
    const compatibilityReview = await reviewFigmaGridNodes([{
      ...gridReviewNodes[1]!,
      evidence: stableDayEvidence,
      componentSetEvidence: stableDayEvidence,
    }]);
    assert.equal(compatibilityReview[0]?.decision, "needs_review");
    assert.equal(compatibilityReview[0]?.evidence, undefined);
    assert.doesNotMatch(capturedOpenAiBody, /p-mon|known_weekday_set/);

    aiResponse = {
      reviews: [{
        sourceNodeId: "grid-card-title",
        suggestedRole: "main_title",
        suggestedStudioType: "flexibleText",
        confidence: 0.88,
        reason: "The GRID card title is dynamic.",
      }],
    };

    const redactionInput: FigmaReviewInput[] = [
      {
        ...gridReviewNodes[0]!,
        name: `Title ${privateFigmaUrl} ${temporaryAssetUrl}`,
        characters: `data:image/png;base64,AAAA ${openAiSecret}`,
      },
    ];
    const redactionEvidence = { ...stableDayEvidence, signals: ["stable_origin_mapping"] as FigmaSemanticEvidence["signals"] };
    const aiReview = await reviewFigmaGridNodesWithWarnings({
      nodes: [{ ...redactionInput[0]!, evidence: redactionEvidence }],
      evidenceBySourceNodeId: { "grid-card-title": redactionEvidence },
      componentSetContext: { "grid-card-title": redactionEvidence },
    });
    assert.equal(aiReview.warnings.length, 0);
    assert.equal(aiReview.reviews[0]?.source, "hybrid");
    assert.equal(aiReview.reviews[0]?.suggestedStudioType, "flexibleText");
    assert.deepEqual(aiReview.reviews[0]?.suggestedBinding, {
      kind: "builtinField",
      fieldId: "entry.main_title",
    });
    assert.equal(JSON.parse(capturedOpenAiBody).model, "fixed-grid-review-model");
    assert.equal(capturedOpenAiBody.includes(privateFigmaUrl), false);
    assert.equal(capturedOpenAiBody.includes(temporaryAssetUrl), false);
    assert.equal(capturedOpenAiBody.includes(openAiSecret), false);
    assert.doesNotMatch(capturedOpenAiBody, /data:image\/png;base64/i);
    assert.match(capturedOpenAiBody, /placementInstanceId/);
    assert.match(capturedOpenAiBody, /variantStatus/);
    assert.match(capturedOpenAiBody, /originNodeId/);
    assert.match(capturedOpenAiBody, /stable_origin_mapping/);

    aiResponse = {
      reviews: [{
        sourceNodeId: "grid-card-day",
        suggestedRole: "unknown",
        suggestedStudioType: "text",
        confidence: 0.7,
        reason: "The samples are ambiguous.",
      }],
    };
    const disagreement = await reviewFigmaGridNodesWithWarnings({
      nodes: [{ ...gridReviewNodes[1]!, evidence: stableDayEvidence }],
      evidenceBySourceNodeId: { "grid-card-day": stableDayEvidence },
    });
    assert.equal(disagreement.reviews[0]?.suggestedRole, "day_label");
    assert.equal(disagreement.reviews[0]?.source, "hybrid");
    assert.equal(disagreement.reviews[0]?.agreement, "disagree");
    assert.equal(disagreement.reviews[0]?.decision, "needs_review");

    aiResponse = {
      reviews: [{
        sourceNodeId: "grid-card-offline-memo",
        suggestedRole: "unknown",
        suggestedStudioType: "text",
        confidence: 0.7,
        reason: "The memo may be static.",
      }],
    };
    const offlineMemoDisagreement = await reviewFigmaGridNodesWithWarnings({
      nodes: [{ ...gridReviewNodes[2]!, evidence: undefined }],
      evidenceBySourceNodeId: {},
    });
    assert.equal(offlineMemoDisagreement.reviews[0]?.suggestedRole, "offline_memo");
    assert.equal(offlineMemoDisagreement.reviews[0]?.suggestedStudioType, "flexibleText");
    assert.equal(offlineMemoDisagreement.reviews[0]?.agreement, "disagree");

    aiResponse = {
      reviews: [{
        sourceNodeId: "grid-card-title",
        suggestedRole: "main_title",
        suggestedStudioType: "flexibleText",
        confidence: 0.75,
        reason: "Title-like content.",
      }],
    };
    const aiOnlyTitle = await reviewFigmaGridNodesWithWarnings({
      nodes: [{ ...gridReviewNodes[0]!, name: "arbitrary layer", characters: "Some changing title" }],
      evidenceBySourceNodeId: {},
    });
    assert.equal(aiOnlyTitle.reviews[0]?.aiCandidate?.suggestedRole, "main_title");
    assert.equal(aiOnlyTitle.reviews[0]?.agreement, "ai_only");
    assert.equal(aiOnlyTitle.reviews[0]?.decision, "needs_review");

    for (const invalidReview of [
      { sourceNodeId: "grid-card-title", suggestedRole: "main_title", suggestedStudioType: "flexibleText", confidence: 1.1, reason: "Too confident." },
      { sourceNodeId: "grid-card-title", suggestedRole: "main_title", suggestedStudioType: "flexibleText", confidence: 0.9, reason: "Duplicate." },
    ]) {
      aiResponse = { reviews: [invalidReview, invalidReview] };
      const invalid = await reviewFigmaGridNodesWithWarnings({ nodes: [gridReviewNodes[0]!], evidenceBySourceNodeId: {} });
      assert.equal(invalid.reviews[0]?.source, "rule");
      assert.match(invalid.warnings[0] ?? "", /invalid|unavailable/i);
    }

    aiResponse = {
      reviews: nonTextGridReviewNodes.map((node, index) => ({
        sourceNodeId: node.id,
        suggestedRole: [
          "main_title",
          "sub_title",
          "time",
          "day_label",
          "date",
          "status_label",
        ][index],
        suggestedStudioType: node.type === "IMAGE"
          ? "image"
          : node.type === "FRAME"
            ? "group"
            : "shape",
        confidence: 0.99,
        reason: "The model incorrectly assigned a text-field role to decoration.",
      })),
    };
    const nonTextRejected = await reviewFigmaGridNodesWithWarnings(nonTextGridReviewNodes);
    assert.equal(nonTextRejected.reviews.length, nonTextGridReviewNodes.length);
    assert.ok(nonTextRejected.reviews.every((review) => review.source === "rule"));
    assert.ok(nonTextRejected.reviews.every((review) => review.suggestedRole === "decoration"));
    assert.ok(nonTextRejected.reviews.every((review) => review.suggestedBinding.kind === "staticText"));
    assert.deepEqual(nonTextRejected.reviews.map((review) => review.suggestedStudioType), [
      "image",
      "shape",
      "group",
      "image",
      "shape",
      "group",
    ]);
    assert.match(nonTextRejected.warnings[0] ?? "", /automated review/i);

    for (const invalidReview of [
      {
        sourceNodeId: "grid-card-title",
        suggestedRole: "administrator",
        suggestedStudioType: "text",
        confidence: 0.9,
        reason: "Unknown role.",
      },
      {
        sourceNodeId: "not-a-grid-node",
        suggestedRole: "main_title",
        suggestedStudioType: "text",
        confidence: 0.9,
        reason: "Unknown node.",
      },
      {
        sourceNodeId: "grid-card-title",
        suggestedRole: "main_title",
        suggestedStudioType: "autoText",
        confidence: 0.9,
        reason: "Invalid Studio type.",
      },
    ]) {
      aiResponse = { reviews: [invalidReview] };
      const rejected = await reviewFigmaGridNodesWithWarnings(gridReviewNodes);
      assert.ok(rejected.reviews.every((review) => review.source === "rule"));
      assert.match(rejected.warnings[0] ?? "", /automated review/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.OPENAI_ACCESS_TOKEN;
    else process.env.OPENAI_ACCESS_TOKEN = originalToken;
    if (originalModel === undefined) delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    else process.env.OPENAI_FIGMA_REVIEW_MODEL = originalModel;
  }
};

const runRouteContractChecks = async () => {
  const secretToken = "figma-secret-token";
  const privateFigmaUrl =
    "https://www.figma.com/design/T2VDXkMPVFa6yEl9FnVvYo/Private-Grid?node-id=1412-5814";
  const originRouteFigmaUrl =
    "https://www.figma.com/design/originfixture123456789/Private-Grid?node-id=1412-5814";
  const temporaryAssetUrl = "https://temporary.example/asset.png";
  const invalidFigmaUrl = "https://example.test/private?token=" + secretToken;
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.FIGMA_ACCESS_TOKEN;
  let selectedRootName = "GRID";
  let selectedRootType = "FRAME";
  let figmaFetchCount = 0;
  let streamingAssetPulls = 0;
  const originNodesRequests: string[][] = [];
  const reviewedOriginRootIds: string[] = [];
  let mutateOriginPlacements = false;
  let includeOriginAssets = false;
  let originFixtureMode: "complete" | "conflicting-placement-status" | "missing-component-id" | "unknown-component" | "missing-component-set" | "only-online" | "ambiguous-online" = "complete";

  const responseJson = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  try {
    delete process.env.FIGMA_ACCESS_TOKEN;
    const missingTokenHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    });
    const missingTokenResponse = await missingTokenHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const missingTokenBody = await missingTokenResponse.text();
    assert.equal(missingTokenResponse.status, 503);
    assert.equal(missingTokenBody.includes(secretToken), false);
    assert.equal(missingTokenBody.includes(privateFigmaUrl), false);

    const invalidPayloadHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    });
    const invalidPayloadResponse = await invalidPayloadHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: 42 }),
      }),
    );
    assert.equal(invalidPayloadResponse.status, 400);

    const invalidUrlResponse = await invalidPayloadHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({
          figmaUrl: invalidFigmaUrl,
        }),
      }),
    );
    const invalidUrlBody = await invalidUrlResponse.text();
    assert.equal(invalidUrlResponse.status, 400);
    assert.equal(invalidUrlBody.includes(secretToken), false);
    assert.equal(invalidUrlBody.includes(invalidFigmaUrl), false);

    process.env.FIGMA_ACCESS_TOKEN = secretToken;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      figmaFetchCount += 1;
      if (url.includes("/v1/files/origin-fixture/nodes") || url.includes("/v1/files/originfixture123456789/nodes")) {
        const ids = new URL(url).searchParams.get("ids")?.split(",") ?? [];
        originNodesRequests.push(ids);
        if (ids.length === 1 && ids[0] === "1412:5814") {
          return responseJson({
            nodes: {
              "1412:5814": {
                document: {
                  id: "1412:5814",
                  name: "GRID",
                  type: "FRAME",
                  children: [
                    ...["sun", "mon", "wed", "tue", "thu"].map((id, index) => ({
                      id: `placement-${id}`,
                      name: `Component ${130 + index}`,
                      type: "INSTANCE",
                      componentId: originFixtureMode === "missing-component-id" && id === "sun"
                        ? undefined
                        : originFixtureMode === "unknown-component" && id === "sun"
                          ? "unknown-component"
                          : originFixtureMode === "ambiguous-online" && id === "sun"
                            ? "origin-online-ambiguous"
                            : "origin-online",
                      componentProperties: {
                        status: {
                          value: originFixtureMode === "conflicting-placement-status" ? "OFFLINE" : "ONLINE",
                        },
                      },
                      overrides: [{ id: `${id}-text`, characters: mutateOriginPlacements ? "CHANGED" : id.toUpperCase() }],
                      absoluteBoundingBox: { x: mutateOriginPlacements ? 9000 + index : index * 140, y: mutateOriginPlacements ? 8000 : index * 3, width: 140, height: 180 },
                      rotation: mutateOriginPlacements ? 77 + index : index,
                      children: [
                        { id: `${id}-day`, name: "weekday", type: "TEXT", characters: id.toUpperCase(), overrides: [{ id: "origin-online-day" }] },
                        { id: `${id}-date`, name: "date", type: "TEXT", characters: String(index + 1).padStart(2, "0"), overrides: [{ id: "origin-online-date" }] },
                        { id: `${id}-time`, name: "time", type: "TEXT", characters: index % 2 ? "21:05" : "PM 8:00", overrides: [{ id: "origin-online-time" }] },
                        { id: `${id}-title`, name: id === "wed" ? "제목" : "Headline", type: "TEXT", characters: `Arbitrary ${id}`, overrides: [{ id: "origin-online-title" }] },
                        { id: `${id}-memo`, name: "MEMO", type: "TEXT", characters: "REST DAY", visible: false },
                      ],
                    })),
                    ...["offline-1", "offline-2"].map((id, index) => ({
                      id: `placement-${id}`,
                      name: `Component ${140 + index}`,
                      type: "INSTANCE",
                      componentId: originFixtureMode === "only-online" ? "origin-online" : "origin-offline",
                      componentProperties: {
                        status: {
                          value: originFixtureMode === "conflicting-placement-status"
                            ? "ONLINE"
                            : originFixtureMode === "only-online"
                              ? "ONLINE"
                              : "OFFLINE",
                        },
                      },
                      overrides: [{ id: `${id}-text`, characters: mutateOriginPlacements ? "CHANGED" : "07" }],
                      absoluteBoundingBox: { x: mutateOriginPlacements ? 9000 + index : 700 + index * 140, y: mutateOriginPlacements ? 8000 : 100, width: 140, height: 180 },
                      rotation: mutateOriginPlacements ? 77 + index : 20 + index,
                      children: [
                        { id: `${id}-day`, name: "weekday", type: "TEXT", characters: id === "offline-1" ? "FRI" : "SAT", overrides: [{ id: "origin-offline-day" }] },
                        { id: `${id}-date`, name: "date", type: "TEXT", characters: String(index + 6).padStart(2, "0"), overrides: [{ id: "origin-offline-date" }] },
                        { id: `${id}-time`, name: "time", type: "TEXT", characters: "09:30", overrides: [{ id: "origin-offline-time" }] },
                        { id: `${id}-title`, name: "Headline", type: "TEXT", characters: `Offline ${id}`, overrides: [{ id: "origin-offline-title" }] },
                        { id: `${id}-memo`, name: "OFFLINE_MEMO", type: "TEXT", characters: "REST DAY", visible: false },
                      ],
                    })),
                    { id: "hidden-placement", name: "Hidden", type: "INSTANCE", visible: false, componentId: "origin-online" },
                    { id: "profile", name: "PROFILE", type: "FRAME", children: [] },
                  ],
                },
                components: {
                  "origin-online": { key: "origin-online", node_id: "origin-online", name: "Online Origin", containing_frame: { containingComponentSet: "origin-set-node" } },
                  "origin-offline": { key: "origin-offline", node_id: "origin-offline", name: "Offline Origin", containing_frame: { containingComponentSet: "origin-set-node" } },
                  ...(originFixtureMode === "ambiguous-online"
                    ? { "origin-online-ambiguous": { key: "origin-online-ambiguous", node_id: "origin-online-ambiguous", name: "Ambiguous Online", containing_frame: { containingComponentSet: "origin-set-node" } } }
                    : {}),
                },
                componentSets: originFixtureMode === "missing-component-set" ? {} : {
                  "origin-set": { key: "origin-set", node_id: "origin-set-node", name: "Grid Day Card" },
                },
              },
            },
          });
        }
        return responseJson({
          nodes: {
            "origin-online": {
              document: {
                id: "origin-online",
                name: "Online Origin Root",
                type: "COMPONENT",
                componentProperties: { status: { value: "ONLINE" } },
                absoluteBoundingBox: { x: 10, y: 20, width: 140, height: 180 },
                relativeTransform: [[1, 0, 10], [0, 1, 20]],
                children: [
                  { id: "origin-online-day", name: "weekday", type: "TEXT", characters: "MON" },
                  { id: "origin-online-date", name: "date", type: "TEXT", characters: "01" },
                  { id: "origin-online-time", name: "time", type: "TEXT", characters: "AM 9:05" },
                  { id: "origin-online-title", name: "Headline", type: "TEXT", characters: "Title" },
                  { id: "origin-online-memo", name: "MEMO", type: "TEXT", characters: "REST DAY", visible: false },
                  ...(includeOriginAssets
                    ? [{ id: "effect-leaf", name: "Effect export", type: "FRAME", absoluteBoundingBox: { x: 40, y: 60, width: 20, height: 20 }, effects: [{ type: "DROP_SHADOW", radius: 4 }] }]
                    : []),
                ],
              },
            },
            "origin-offline": {
              document: {
                id: "origin-offline",
                name: "Offline Origin Root",
                type: "COMPONENT",
                componentProperties: { status: { value: "OFFLINE" } },
                absoluteBoundingBox: { x: 10, y: 20, width: 140, height: 180 },
                relativeTransform: [[1, 0, 10], [0, 1, 20]],
                children: [
                  { id: "origin-offline-day", name: "weekday", type: "TEXT", characters: "MON" },
                  { id: "origin-offline-date", name: "date", type: "TEXT", characters: "06" },
                  { id: "origin-offline-time", name: "time", type: "TEXT", characters: "09:30" },
                  { id: "origin-offline-title", name: "Headline", type: "TEXT", characters: "Offline title" },
                  { id: "origin-offline-memo", name: "OFFLINE_MEMO", type: "TEXT", characters: "REST DAY", visible: false },
                ],
              },
            },
          },
        });
      }
      if (url.includes("/v1/files/")) {
        if (new URL(url).searchParams.get("ids")?.includes("origin-online")) {
          return responseJson({
            nodes: {
              "origin-online": {
                document: {
                  id: "origin-online",
                  name: "Monday card",
                  type: "COMPONENT",
                  absoluteBoundingBox: { x: 10, y: 20, width: 140, height: 180 },
                  children: [
                    { id: "title-1", name: "Title", type: "TEXT", characters: "Hello" },
                    { id: "asset-1", name: "Decoration", type: "IMAGE" },
                    { id: "large-asset", name: "Large decoration", type: "IMAGE" },
                    { id: "effect-leaf", name: "Effect export", type: "FRAME", absoluteBoundingBox: { x: 40, y: 60, width: 20, height: 20 }, effects: [{ type: "DROP_SHADOW", radius: 4 }] },
                  ],
                },
              },
              "origin-offline": {
                document: {
                  id: "origin-offline",
                  name: "Tuesday card",
                  type: "COMPONENT",
                  absoluteBoundingBox: { x: 160, y: 20, width: 140, height: 180 },
                  children: [{ id: "day-2", name: "weekday", type: "TEXT", characters: "TUE" }],
                },
              },
            },
          });
        }
        return responseJson({
          nodes: {
            "1412:5814": {
              document: {
                id: "1412:5814",
                name: selectedRootName,
                type: selectedRootType,
                absoluteBoundingBox: { x: 0, y: 0, width: 1000, height: 400 },
                children: [
                  {
                    id: "profile",
                    name: "PROFILE",
                    type: "FRAME",
                    children: [],
                  },
                  {
                    id: "card-1",
                    name: "Monday card",
                    type: "INSTANCE",
                    componentId: "origin-online",
                    componentProperties: { status: { value: "ONLINE" } },
                    absoluteBoundingBox: {
                      x: 10,
                      y: 20,
                      width: 140,
                      height: 180,
                    },
                    children: [
                      {
                        id: "title-1",
                        name: "Title",
                        type: "TEXT",
                        characters: "Hello",
                        textAutoResize: "HEIGHT",
                        rotation: 0.25,
                        visible: true,
                        effects: [{ type: "DROP_SHADOW", radius: 8 }],
                        strokes: [{ type: "SOLID", opacity: 1 }],
                        style: {
                          textAlignHorizontal: "RIGHT",
                          textAlignVertical: "TOP",
                        },
                        fills: [
                          {
                            type: "SOLID",
                            color: { r: 1, g: 0, b: 0 },
                            opacity: 0.5,
                          },
                        ],
                      },
                      { id: "asset-1", name: "Decoration", type: "IMAGE" },
                      {
                        id: "large-asset",
                        name: "Large decoration",
                        type: "IMAGE",
                      },
                      {
                        id: "effect-leaf",
                        name: "Effect export",
                        type: "FRAME",
                        absoluteBoundingBox: {
                          x: 40,
                          y: 60,
                          width: 20,
                          height: 20,
                        },
                        effects: [{ type: "DROP_SHADOW", radius: 4 }],
                      },
                    ],
                  },
                  {
                    id: "card-2",
                    name: "Tuesday card",
                    type: "INSTANCE",
                    componentId: "origin-offline",
                    componentProperties: { status: { value: "OFFLINE" } },
                    absoluteBoundingBox: {
                      x: 160,
                      y: 20,
                      width: 140,
                      height: 180,
                    },
                    children: [
                      {
                        id: "day-2",
                        name: "weekday",
                        type: "TEXT",
                        characters: "TUE",
                      },
                    ],
                  },
                  { id: "board", name: "board", type: "FRAME", children: [] },
                ],
              },
            },
          },
          components: {
            "origin-online": { node_id: "origin-online", name: "Monday origin", component_set_id: "origin-set" },
            "origin-offline": { node_id: "origin-offline", name: "Tuesday origin", component_set_id: "origin-set" },
          },
          componentSets: {
            "origin-set": { node_id: "origin-set", name: "GRID cards" },
          },
        });
      }
      if (url.includes("/v1/images/")) {
        if (url.includes("effect-leaf")) {
          return responseJson({
            images: { "effect-leaf": "https://temporary.example/effect.png" },
          });
        }
        return responseJson({
          images: url.includes("large-asset")
            ? { "large-asset": "https://temporary.example/large.png" }
            : url.includes("stream-asset")
              ? { "stream-asset": "https://temporary.example/stream.png" }
              : { "asset-1": "https://temporary.example/asset.png" },
        });
      }
      if (url === "https://temporary.example/asset.png") {
        return new Response(new Uint8Array([137, 80, 78, 71]), {
          headers: { "content-type": "image/png", "content-length": "4" },
        });
      }
      if (url === "https://temporary.example/effect.png") {
        return new Response(new Uint8Array([137, 80, 78, 71, 1]), {
          headers: { "content-type": "image/png", "content-length": "5" },
        });
      }
      if (url === "https://temporary.example/large.png") {
        return new Response(null, {
          headers: {
            "content-type": "image/png",
            "content-length": String(10 * 1024 * 1024 + 1),
          },
        });
      }
      if (url === "https://temporary.example/stream.png") {
        const chunks = [
          new Uint8Array(10 * 1024 * 1024),
          new Uint8Array([1]),
          new Uint8Array([2]),
        ];
        return new Response(
          new ReadableStream<Uint8Array>(
            {
              pull(controller) {
                const chunk = chunks[streamingAssetPulls++];
                if (chunk) controller.enqueue(chunk);
                else controller.close();
              },
            },
            { highWaterMark: 0 },
          ),
          { headers: { "content-type": "image/png" } },
        );
      }
      throw new Error("Unexpected mocked request");
    }) as typeof fetch;

    const fetchesBeforeDeniedAuth = figmaFetchCount;
    const deniedAuthResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({
        ok: false as const,
        response: new Response("denied", { status: 401 }),
      }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    assert.equal(deniedAuthResponse.status, 401);
    assert.equal(figmaFetchCount, fetchesBeforeDeniedAuth);

    selectedRootName = "PROFILE";
    const nonGridRouteResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    const nonGridRouteBody = await nonGridRouteResponse.text();
    assert.equal(nonGridRouteResponse.status, 422);
    assert.equal(nonGridRouteBody.includes(secretToken), false);
    assert.equal(nonGridRouteBody.includes(privateFigmaUrl), false);

    selectedRootName = "GRID";
    selectedRootType = "GROUP";
    const unsupportedRootTypeResponse = await createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    })(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: privateFigmaUrl }),
      }),
    );
    assert.equal(unsupportedRootTypeResponse.status, 422);

    selectedRootType = "FRAME";

    const discovered = await fetchFigmaGridCandidates({
      fileKey: "T2VDXkMPVFa6yEl9FnVvYo",
      nodeId: "1412:5814",
    });
    assert.equal(discovered.candidates.length, 2);
    assert.equal(discovered.candidates[0]?.root.id, "card-1");
    assert.equal(
      discovered.candidates[0]?.root.children?.[0]?.textAutoResize,
      "HEIGHT",
    );
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.rotateDeg, 14.32);
    assert.deepEqual(discovered.candidates[0]?.root.children?.[0]?.fills, [
      { type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 0.5 },
    ]);
    assert.deepEqual(
      (discovered.candidates[0]?.root.children?.[0] as FigmaNormalizedNode & {
        effects?: unknown[];
        strokes?: unknown[];
      })?.effects,
      [{ type: "DROP_SHADOW", radius: 8 }],
    );
    assert.deepEqual(
      (discovered.candidates[0]?.root.children?.[0] as FigmaNormalizedNode & {
        effects?: unknown[];
        strokes?: unknown[];
      })?.strokes,
      [{ type: "SOLID", opacity: 1 }],
    );
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.textAlignHorizontal, "RIGHT");
    assert.equal(discovered.candidates[0]?.root.children?.[0]?.textAlignVertical, "TOP");
    assert.match(
      discovered.candidates[0]?.assets[0]?.src ?? "",
      /^data:image\/png;base64,/,
    );
    assert.equal(discovered.candidates[0]?.assets[0]?.sourceNodeId, "asset-1");
    assert.equal(discovered.candidates[0]?.assets.length, 2);
    assert.match(
      discovered.candidates[0]?.assets.find((asset) => asset.sourceNodeId === "effect-leaf")?.src ?? "",
      /^data:image\/png;base64,/,
    );
    assert.match(discovered.candidates[0]?.warnings[0] ?? "", /10 MiB/);

    const asset = await exportFigmaNodeAsDataUrl(
      "T2VDXkMPVFa6yEl9FnVvYo",
      "asset-1",
      "png",
    );
    assert.equal(asset.mimeType, "image/png");
    assert.equal(asset.byteSize, 4);
    assert.match(asset.src, /^data:image\/png;base64,/);

    await assert.rejects(
      exportFigmaNodeAsDataUrl("T2VDXkMPVFa6yEl9FnVvYo", "stream-asset", "png"),
      /maximum size/,
    );
    assert.equal(streamingAssetPulls, 2);

    const originDiscovered = await fetchFigmaGridOriginCandidates({
      fileKey: "origin-fixture",
      nodeId: "1412:5814",
    });
    assert.deepEqual(originNodesRequests, [
      ["1412:5814"],
      ["origin-online", "origin-offline"],
    ]);
    assert.equal(originDiscovered.candidates.length, 1);
    const originCandidate = originDiscovered.candidates[0]!;
    assert.equal(originCandidate.label, "Grid Day Card");
    assert.deepEqual(originCandidate.placementInstanceIds, [
      "placement-sun",
      "placement-mon",
      "placement-wed",
      "placement-tue",
      "placement-thu",
      "placement-offline-1",
      "placement-offline-2",
    ]);
    assert.equal(new Set(originCandidate.placementInstanceIds).size, 7);
    assert.equal(originCandidate.variants.online.root.id, "origin-online");
    assert.equal(originCandidate.variants.offline.root.id, "origin-offline");
    assert.equal(Object.keys(originCandidate.variants).length, 2);
    assert.notEqual(originCandidate.variants.online.root.name, "Component 130");
    assert.deepEqual(originCandidate.variants.online.root.frame, { left: 10, top: 20, width: 140, height: 180 });
    assert.deepEqual(originCandidate.variants.online.root.relativeTransform, [[1, 0, 10], [0, 1, 20]]);
    assert.deepEqual(originCandidate.variants.online.assets, []);
    assert.deepEqual(
      originCandidate.variants.online.placementEvidence["origin-online-day"]?.samples.map((sample) => sample.placementInstanceId),
      ["placement-sun", "placement-mon", "placement-wed", "placement-tue", "placement-thu"],
      "Online evidence is aggregated from five placements in shuffled order.",
    );
    assert.deepEqual(
      originCandidate.variants.offline.placementEvidence["origin-offline-day"]?.samples.map((sample) => sample.placementInstanceId),
      ["placement-offline-1", "placement-offline-2"],
      "Offline evidence is aggregated from two placements.",
    );
    assert.equal(originCandidate.variants.online.componentSetEvidence?.["origin-online-day"]?.samples.length, 7);
    assert.equal(originCandidate.variants.online.componentSetEvidence?.["origin-online-day"]?.distinctValueCount, 7);
    assert.equal(originCandidate.variants.online.placementEvidence["origin-online-date"]?.samples.length, 5);
    assert.equal(originCandidate.variants.online.placementEvidence["origin-online-time"]?.samples.length, 5);
    assert.equal(originCandidate.variants.online.placementEvidence["origin-online-memo"], undefined);
    assert.equal(originCandidate.variants.offline.placementEvidence["origin-offline-memo"], undefined);
    assert.equal(originCandidate.variants.online.placementEvidence["origin-online-title"]?.mapping, "override");
    assert.equal(originCandidate.variants.offline.placementEvidence["origin-offline-title"]?.mapping, "override");
    originFixtureMode = "conflicting-placement-status";
    const conflictingPlacementStatus = await fetchFigmaGridOriginCandidates({ fileKey: "origin-fixture", nodeId: "1412:5814" });
    const conflictingCandidate = conflictingPlacementStatus.candidates[0]!;
    assert.equal(conflictingCandidate.variants.online.origin.componentNodeId, "origin-online");
    assert.equal(conflictingCandidate.variants.offline.origin.componentNodeId, "origin-offline");
    assert.deepEqual(
      conflictingCandidate.variants.online.componentSetEvidence?.["origin-online-day"]?.samples.map((sample) => sample.variantStatus),
      ["online", "online", "online", "online", "online", "offline", "offline"].map((status) => status as "online" | "offline"),
      "Origin metadata remains authoritative when placement status metadata conflicts.",
    );
    assert.match(conflictingCandidate.warnings.join(" "), /status|inconsisten/i);
    originFixtureMode = "complete";
    const routeDayReview = inferFigmaSemanticEvidence({
      origin: originCandidate.variants.online.root,
      evidenceByOriginNodeId: originCandidate.variants.online.placementEvidence,
      componentSetEvidence: originCandidate.variants.online.componentSetEvidence,
    }).find((entry) => entry.sourceNodeId === "origin-online-day");
    assert.equal(routeDayReview?.candidate.suggestedRole, "day_label");
    assert.equal(routeDayReview?.evidence.samples.length, 7);
    assert.equal(routeDayReview?.evidence.distinctValueCount, 7);
    assert.equal(routeDayReview?.evidence.mapping, "override");
    assert.equal(
      inferFigmaSemanticEvidence({
        origin: originCandidate.variants.online.root,
        evidenceByOriginNodeId: originCandidate.variants.online.placementEvidence,
        componentSetEvidence: originCandidate.variants.online.componentSetEvidence,
      }).some((entry) => entry.sourceNodeId === "origin-online-title"),
      false,
      "Arbitrary title text remains reviewable rather than becoming an automatic rule binding.",
    );
    mutateOriginPlacements = true;
    const movedPlacements = await fetchFigmaGridOriginCandidates({ fileKey: "origin-fixture", nodeId: "1412:5814" });
    const movedCandidate = movedPlacements.candidates[0]!;
    assert.deepEqual(movedCandidate.variants.online.root, originCandidate.variants.online.root);
    assert.deepEqual(movedCandidate.variants.offline.root, originCandidate.variants.offline.root);
    assert.deepEqual(movedCandidate.frame, originCandidate.frame);
    assert.deepEqual(movedCandidate.variants.online.assets, originCandidate.variants.online.assets);
    mutateOriginPlacements = false;

    originFixtureMode = "missing-component-id";
    const missingComponentId = await fetchFigmaGridOriginCandidates({ fileKey: "origin-fixture", nodeId: "1412:5814" });
    assert.equal(missingComponentId.candidates[0]?.placementInstanceIds.length, 6);
    originFixtureMode = "unknown-component";
    const unknownComponent = await fetchFigmaGridOriginCandidates({ fileKey: "origin-fixture", nodeId: "1412:5814" });
    assert.equal(unknownComponent.candidates[0]?.placementInstanceIds.length, 6);
    for (const mode of ["missing-component-set", "only-online", "ambiguous-online"] as const) {
      originFixtureMode = mode;
      const incomplete = await fetchFigmaGridOriginCandidates({ fileKey: "origin-fixture", nodeId: "1412:5814" });
      assert.equal(incomplete.candidates.length, 0);
      assert.match(incomplete.warnings.join(" "), /excluded|complete/i);
    }
    originFixtureMode = "complete";

    selectedRootName = "GRID";
    const routeHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
      reviewNodes: async (nodes) => {
        const rootId = nodes.find((node) => node.id === "origin-online" || node.id === "origin-offline")?.id;
        assert.ok(rootId, "The route review callback receives an origin root.");
        reviewedOriginRootIds.push(rootId!);
        return {
          reviews: nodes.map((node) => ({
            sourceNodeId: node.id,
            label: node.name,
            sourceType: node.type,
            suggestedRole: "unknown",
            suggestedStudioType: "text",
            suggestedBinding: { kind: "staticText", value: node.characters ?? "" },
            confidence: 0.2,
            source: "rule",
            decision: "needs_review",
            reason: "Route propagation fixture.",
          })),
          warnings: ["Automated review was unavailable; deterministic suggestions are shown."],
        };
      },
    });
    const routeResponse = await routeHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: originRouteFigmaUrl }),
      }),
    );
    const routeBody = await routeResponse.text();
    assert.equal(routeResponse.status, 200);
    assert.equal(routeBody.includes(secretToken), false);
    assert.equal(routeBody.includes(originRouteFigmaUrl), false);
    assert.equal(routeBody.includes(privateFigmaUrl), false);
    assert.equal(routeBody.includes(temporaryAssetUrl), false);
    assert.match(routeBody, /Automated review was unavailable/);
    const routePayload = JSON.parse(routeBody) as {
      candidates: StudioFigmaGridOriginCandidate[];
      warnings: string[];
    };
    assert.equal(reviewedOriginRootIds.length, 2);
    assert.deepEqual([...new Set(reviewedOriginRootIds)].sort(), ["origin-offline", "origin-online"]);
    assert.equal(routePayload.candidates.length, 1);
    const routeCandidate = routePayload.candidates[0]!;
    assert.equal(routeCandidate.label, "Grid Day Card");
    assert.deepEqual(routeCandidate.placementInstanceIds, [
      "placement-sun",
      "placement-mon",
      "placement-wed",
      "placement-tue",
      "placement-thu",
      "placement-offline-1",
      "placement-offline-2",
    ]);
    assert.notEqual(
      routeCandidate.variants.online.component.rootNodeId,
      routeCandidate.variants.offline.component.rootNodeId,
    );
    assert.notEqual(routeCandidate.variants.online.origin.componentNodeId, routeCandidate.variants.offline.origin.componentNodeId);
    assert.equal(routeCandidate.variants.online.component.nodes[routeCandidate.variants.online.component.rootNodeId]?.label, "Online Origin Root");
    assert.equal(routeCandidate.variants.offline.component.nodes[routeCandidate.variants.offline.component.rootNodeId]?.label, "Offline Origin Root");
    const onlineGraphNodeIds = Object.keys(routeCandidate.variants.online.component.nodes);
    const offlineGraphNodeIds = Object.keys(routeCandidate.variants.offline.component.nodes);
    assert.equal(onlineGraphNodeIds.some((id) => offlineGraphNodeIds.includes(id)), false);
    for (const status of ["online", "offline"] as const) {
      const graphJson = JSON.stringify(routeCandidate.variants[status].component);
      assert.equal(graphJson.includes("placement-"), false);
      assert.equal(graphJson.includes("placementEvidence"), false);
      assert.equal(graphJson.includes("componentSetEvidence"), false);
      assert.equal(graphJson.includes("Fixture root"), false);
    }

    const routeDocument = createSampleStudioDocument();
    const routeTimetable = routeDocument.domains?.timetable;
    assert.ok(routeTimetable);
    if (!routeTimetable) return;
    const existingRouteComponents = Object.fromEntries(
      Object.entries(routeTimetable.components).map(([id, component]) => [id, structuredClone(component)]),
    );
    const existingRouteDayAssignments = JSON.stringify(
      routeTimetable.dayIds.map((dayId) => [dayId, routeTimetable.days[dayId]?.componentId]),
    );
    const routeImport = applyStudioFigmaGridCandidate(routeDocument, routeCandidate);
    assert.equal(routeImport.ok, true);
    assert.deepEqual(
      Object.fromEntries(Object.keys(existingRouteComponents).map((id) => [id, routeTimetable.components[id]])),
      existingRouteComponents,
    );
    assert.equal(
      JSON.stringify(routeTimetable.dayIds.map((dayId) => [dayId, routeTimetable.days[dayId]?.componentId])),
      existingRouteDayAssignments,
    );
    const routeDocumentJson = JSON.stringify(routeDocument);
    assert.equal(routeDocumentJson.includes(secretToken), false);
    assert.equal(routeDocumentJson.includes(originRouteFigmaUrl), false);
    assert.equal(routeDocumentJson.includes(privateFigmaUrl), false);
    assert.equal(routeDocumentJson.includes(temporaryAssetUrl), false);
    assert.equal(routeDocumentJson.includes("placement-"), false);
    assert.equal(routeDocumentJson.includes("placementEvidence"), false);
    assert.equal(routeDocumentJson.includes("componentSetEvidence"), false);

    const defaultRouteHandler = createFigmaGridAnalyzeHandler({
      requireActor: async () => ({ ok: true, userId: 1 }),
    });
    includeOriginAssets = true;
    const originalReviewToken = process.env.OPENAI_ACCESS_TOKEN;
    const originalReviewModel = process.env.OPENAI_FIGMA_REVIEW_MODEL;
    delete process.env.OPENAI_ACCESS_TOKEN;
    delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    const defaultRouteResponse = await defaultRouteHandler(
      new Request("http://localhost/api/admin/template-studio/figma/analyze", {
        method: "POST",
        body: JSON.stringify({ figmaUrl: originRouteFigmaUrl }),
      }),
    );
    const defaultRouteBody = await defaultRouteResponse.json() as {
      candidates: StudioFigmaGridOriginCandidate[];
      warnings: string[];
    };
    assert.equal(defaultRouteResponse.status, 200);
    assert.equal(defaultRouteBody.candidates.length, 1);
    const defaultCandidate = defaultRouteBody.candidates[0]!;
    const defaultOnlineReviews = Object.fromEntries(defaultCandidate.variants.online.reviews.map((review) => [review.sourceNodeId, review]));
    const defaultOfflineReviews = Object.fromEntries(defaultCandidate.variants.offline.reviews.map((review) => [review.sourceNodeId, review]));
    for (const [nodeId, role, fieldId] of [
      ["origin-online-day", "day_label", "day.short_label"],
      ["origin-online-date", "date", "day.date"],
      ["origin-online-time", "time", "entry.time"],
    ] as const) {
      assert.equal(defaultOnlineReviews[nodeId]?.suggestedRole, role);
      assert.equal(defaultOnlineReviews[nodeId]?.suggestedBinding.kind, "builtinField");
      assert.equal((defaultOnlineReviews[nodeId]?.suggestedBinding as { fieldId?: string }).fieldId, fieldId);
      assert.equal(defaultOnlineReviews[nodeId]?.decision, "auto");
    }
    assert.equal(defaultOnlineReviews["origin-online-title"]?.decision, "needs_review");
    assert.equal(defaultOfflineReviews["origin-offline-day"]?.suggestedRole, "day_label");
    assert.equal(defaultOfflineReviews["origin-offline-date"]?.suggestedRole, "date");
    assert.equal(defaultOfflineReviews["origin-offline-time"]?.suggestedRole, "time");
    if (originalReviewToken === undefined) delete process.env.OPENAI_ACCESS_TOKEN;
    else process.env.OPENAI_ACCESS_TOKEN = originalReviewToken;
    if (originalReviewModel === undefined) delete process.env.OPENAI_FIGMA_REVIEW_MODEL;
    else process.env.OPENAI_FIGMA_REVIEW_MODEL = originalReviewModel;
    const defaultOnlineComponent = defaultCandidate.variants.online.component;
    assert.ok(Object.keys(defaultOnlineComponent.nodes).length > 0);
    assert.equal(
      Object.values(defaultOnlineComponent.nodes)
        .find((node) => node.label === "Effect export")?.type,
      "image",
    );
    assert.ok(defaultOnlineComponent.assets.every((asset) => asset.src.startsWith("data:image/")));
    assert.equal(defaultRouteBody.warnings.some((warning) => /graph conversion is not connected/i.test(warning)), false);
    assert.equal(JSON.stringify(defaultRouteBody).includes(privateFigmaUrl), false);
    assert.equal(JSON.stringify(defaultRouteBody).includes(secretToken), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN;
    else process.env.FIGMA_ACCESS_TOKEN = originalToken;
  }
};

const converterReview = (
  sourceNodeId: string,
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"],
  suggestedRole: StudioFigmaNodeReview["suggestedRole"] = "decoration",
): StudioFigmaNodeReview => ({
  sourceNodeId,
  label: sourceNodeId,
  sourceType: suggestedStudioType === "text" || suggestedStudioType === "flexibleText"
    ? "TEXT"
    : "FRAME",
  suggestedRole,
  suggestedStudioType,
  suggestedBinding: suggestedRole === "main_title"
    ? { kind: "builtinField", fieldId: "entry.main_title" }
    : { kind: "staticText", value: "Fallback static value" },
  confidence: 0.9,
  source: "rule",
  decision: "needs_review",
  reason: "Converter fixture review.",
});

type FigmaVisualMetadataFixtureNode = FigmaNormalizedNode & {
  effects?: unknown[];
  strokes?: unknown[];
  children?: FigmaVisualMetadataFixtureNode[];
};

const runConverterChecks = () => {
  const root = {
    id: "figma-card-root",
    name: "Monday card",
    type: "FRAME",
    absoluteBounds: { left: 100, top: 200, width: 300, height: 180 },
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.9 }],
    style: { cornerRadius: 12, clipsContent: true },
    children: [
      {
        id: "figma-entry",
        name: "Entry",
        type: "FRAME",
        absoluteBounds: { left: 110, top: 215, width: 220, height: 120 },
        children: [
          {
            id: "figma-title",
            name: "Title",
            type: "TEXT",
            characters: "Weekly broadcast",
            absoluteBounds: { left: 120, top: 225, width: 180, height: 24 },
            opacity: 0.8,
            effects: [{ type: "DROP_SHADOW", radius: 8 }],
            strokes: [{ type: "SOLID", opacity: 1 }],
            textAlignHorizontal: "RIGHT",
            textAlignVertical: "TOP",
            fills: [{ type: "SOLID", color: { r: 0.1, g: 0.2, b: 0.3 }, opacity: 0.5 }],
            style: {
              fontFamily: "Inter",
              fontSize: 20,
              fontWeight: 700,
              fontStyle: "italic",
              letterSpacing: 0.4,
              lineHeightPx: 28,
              lineHeightPercentFontSize: 125,
              textAlignHorizontal: "RIGHT",
              textAlignVertical: "TOP",
              unsupportedFigmaProperty: { nested: true },
            },
          },
          {
            id: "figma-image",
            name: "Banner decoration",
            type: "IMAGE",
            absoluteBounds: { left: 130, top: 260, width: 80, height: 40 },
          },
          {
            id: "figma-solid-shape",
            name: "Accent block",
            type: "RECTANGLE",
            absoluteBounds: { left: 220, top: 260, width: 40, height: 20 },
            fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0.5 }, opacity: 0.25 }],
          },
          {
            id: "figma-rotated-text",
            name: "Rotated label",
            type: "TEXT",
            characters: "NEW",
            absoluteBounds: { left: 160, top: 240, width: 20, height: 40 },
            absoluteRenderBounds: { left: 150, top: 250, width: 40, height: 20 },
            rotateDeg: 90,
            fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
            style: { fontSize: 12, fontWeight: 600 },
          },
          {
            id: "figma-missing-image",
            name: "Missing decoration",
            type: "IMAGE",
            absoluteBounds: { left: 270, top: 260, width: 20, height: 20 },
          },
          {
            id: "figma-effect-leaf",
            name: "Effect export",
            type: "FRAME",
            absoluteBounds: { left: 300, top: 260, width: 20, height: 20 },
            effects: [{ type: "LAYER_BLUR" }],
          },
        ],
      },
      {
        id: "figma-background",
        name: "Card background",
        type: "RECTANGLE",
        absoluteBounds: { left: 100, top: 200, width: 300, height: 180 },
        fills: [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }],
      },
    ],
  } as FigmaVisualMetadataFixtureNode;
  const reviews = [
    converterReview("figma-entry", "group"),
    converterReview("figma-title", "flexibleText", "main_title"),
    converterReview("figma-image", "image"),
    converterReview("figma-solid-shape", "shape"),
    converterReview("figma-rotated-text", "text", "unknown"),
    converterReview("figma-missing-image", "image"),
    converterReview("figma-effect-leaf", "group"),
    converterReview("figma-background", "shape"),
  ];
  const exportedAssets = [
    {
      sourceNodeId: "figma-image",
      src: "data:image/png;base64,AA==",
      mimeType: "image/png" as const,
      byteSize: 1,
    },
    {
      sourceNodeId: "figma-effect-leaf",
      src: "data:image/svg+xml;base64,AA==",
      mimeType: "image/svg+xml" as const,
      byteSize: 1,
    },
  ];
  const before = JSON.stringify({ root, reviews, exportedAssets });

  const candidate = convertFigmaGridCandidate({ root, reviews, exportedAssets });

  assert.equal(JSON.stringify({ root, reviews, exportedAssets }), before);
  assert.match(candidate.candidateId, /^candidate_/);
  assert.deepEqual(candidate.frame, { left: 0, top: 0, width: 300, height: 180 });
  assert.deepEqual(
    candidate.reviews.map((review) => review.sourceNodeId),
    reviews.map((review) => review.sourceNodeId),
    "Reviewed choices remain available to Task 7/8.",
  );
  assert.equal(
    candidate.reviewNodeIds?.["figma-title"],
    Object.values(candidate.component.nodes).find((node) => node.label === "Title")?.id,
    "Figma source review IDs map to converted graph IDs exactly.",
  );

  const nodes = Object.values(candidate.component.nodes);
  const nodeByLabel = (label: string) => nodes.find((node) => node.label === label);
  const candidateRoot = candidate.component.nodes[candidate.component.rootNodeId];
  const entry = nodeByLabel("Entry");
  const titleNode = nodeByLabel("Title");
  const imageNode = nodeByLabel("Banner decoration");
  const shapeNode = nodeByLabel("Accent block");
  const rotatedText = nodeByLabel("Rotated label");
  const missingImage = nodeByLabel("Missing decoration");
  const effectLeaf = nodeByLabel("Effect export");
  const backgroundNode = nodeByLabel("Card background");
  assert.ok(candidateRoot);
  assert.equal(candidateRoot?.parentId, null);
  assert.equal(candidateRoot?.type, "group");
  assert.deepEqual(candidateRoot?.childIds.map((id) => candidate.component.nodes[id]?.label), [
    "Entry",
    "Card background",
  ]);
  assert.equal(entry?.type, "group");
  assert.deepEqual(entry?.meta?.entrySlot, { index: 0 });
  assert.equal(nodes.filter((node) => node.meta?.entrySlot?.index === 0).length, 1);
  assert.deepEqual(entry?.childIds.map((id) => candidate.component.nodes[id]?.label), [
    "Title",
    "Banner decoration",
    "Accent block",
    "Rotated label",
    "Missing decoration",
    "Effect export",
  ]);
  assert.equal(titleNode?.type, "flexibleText");
  assert.deepEqual(titleNode?.binding, { kind: "builtinField", fieldId: "entry.main_title" });
  assert.equal(imageNode?.type, "image");
  assert.equal(imageNode?.fit, "cover");
  assert.equal(imageNode?.binding?.kind, "staticAsset");
  assert.equal(missingImage?.type, "image");
  assert.equal(missingImage?.binding, undefined);
  assert.equal(effectLeaf?.type, "image");
  assert.equal(effectLeaf?.binding?.kind, "staticAsset");
  assert.equal(shapeNode?.type, "shape");
  assert.deepEqual(shapeNode?.shapeFill, { type: "solid", color: "rgba(255, 0, 128, 0.25)" });
  assert.equal(backgroundNode?.type, "shape");

  const rootStyle = candidateRoot?.styleId
    ? candidate.component.styles[candidateRoot.styleId]
    : undefined;
  const entryStyle = entry?.styleId ? candidate.component.styles[entry.styleId] : undefined;
  const titleStyle = titleNode?.styleId ? candidate.component.styles[titleNode.styleId] : undefined;
  const rotatedTextStyle = rotatedText?.styleId
    ? candidate.component.styles[rotatedText.styleId]
    : undefined;
  assert.deepEqual(
    [rootStyle?.left, rootStyle?.top, rootStyle?.width, rootStyle?.height],
    [0, 0, 300, 180],
  );
  assert.deepEqual(
    [entryStyle?.left, entryStyle?.top, entryStyle?.width, entryStyle?.height],
    [10, 15, 220, 120],
  );
  assert.deepEqual([titleStyle?.left, titleStyle?.top], [10, 10]);
  assert.deepEqual(
    [rotatedTextStyle?.left, rotatedTextStyle?.top, rotatedTextStyle?.rotateDeg],
    [50, 25, 90],
  );
  assert.deepEqual(Object.keys(titleStyle ?? {}).sort(), [
    "alignItems",
    "color",
    "display",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "height",
    "justifyContent",
    "left",
    "letterSpacing",
    "lineHeight",
    "opacity",
    "position",
    "textAlign",
    "top",
    "width",
  ]);
  assert.equal(titleStyle?.color, "rgba(26, 51, 77, 0.5)");
  assert.equal(titleStyle?.lineHeight, "28px");
  assert.deepEqual(
    {
      textAlign: titleStyle?.textAlign,
      justifyContent: titleStyle?.justifyContent,
      alignItems: titleStyle?.alignItems,
    },
    {
      textAlign: "right",
      justifyContent: "flex-end",
      alignItems: "flex-start",
    },
  );
  assert.deepEqual(titleNode?.textAppearance, {
    fill: { type: "solid", color: "rgba(26, 51, 77, 0.5)", opacity: 1 },
    strokes: [],
  });
  assert.ok(candidate.warnings.some((warning) => /shadow|stroke|effect/i.test(warning)));
  assert.ok(candidate.warnings.some((warning) => /missing decoration.*unbound/i.test(warning)));
  assert.equal(candidate.component.assets.length, 2);
  assert.match(candidate.component.assets[0]?.id ?? "", /^asset_/);
  assert.match(candidate.component.assets[0]?.src ?? "", /^data:image\/png;base64,/);
  assert.ok(candidate.component.assets.every((asset) => /^data:image\/(?:png|svg\+xml);base64,/.test(asset.src)));
  assert.ok(candidate.component.assets.every((asset) => !/figma|temporary|https?:/i.test(asset.src)));

  const roleEditedCandidate = structuredClone(candidate);
  roleEditedCandidate.reviews = roleEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? { ...review, suggestedRole: "time" as const, suggestedStudioType: "text" as const }
      : review,
  );
  const roleEditedGraphCandidate = applyStudioFigmaReviewEdits(roleEditedCandidate);
  const roleEditedNodeId = roleEditedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    roleEditedNodeId ? roleEditedGraphCandidate.component.nodes[roleEditedNodeId]?.binding : undefined,
    { kind: "builtinField", fieldId: "entry.time" },
    "A role edit derives the matching builtin binding on the mapped graph node.",
  );

  const untouchedImageGraphCandidate = applyStudioFigmaReviewEdits(candidate);
  const untouchedImageNodeId = untouchedImageGraphCandidate.reviewNodeIds?.["figma-image"];
  assert.deepEqual(
    untouchedImageNodeId
      ? untouchedImageGraphCandidate.component.nodes[untouchedImageNodeId]?.binding
      : undefined,
    imageNode?.binding,
    "An untouched decoration image keeps its staticAsset binding without a touched map.",
  );

  const bindingEditedCandidate = structuredClone(candidate);
  bindingEditedCandidate.reviews = bindingEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "main_title" as const,
          suggestedStudioType: "text" as const,
          suggestedBinding: { kind: "builtinField" as const, fieldId: "entry.time" },
        }
      : review,
  );
  const bindingEditedGraphCandidate = applyStudioFigmaReviewEdits(
    bindingEditedCandidate,
    { "figma-title": true },
  );
  const bindingEditedNodeId = bindingEditedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    bindingEditedNodeId
      ? bindingEditedGraphCandidate.component.nodes[bindingEditedNodeId]?.binding
      : undefined,
    { kind: "builtinField", fieldId: "entry.time" },
    "An explicitly edited binding wins over the review role.",
  );

  const roleThenReselectedBindingCandidate = structuredClone(candidate);
  roleThenReselectedBindingCandidate.reviews = roleThenReselectedBindingCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "time" as const,
          suggestedStudioType: "text" as const,
          suggestedBinding: { kind: "builtinField" as const, fieldId: "entry.main_title" },
        }
      : review,
  );
  const roleThenReselectedGraphCandidate = applyStudioFigmaReviewEdits(
    roleThenReselectedBindingCandidate,
    { "figma-title": true },
  );
  const roleThenReselectedNodeId = roleThenReselectedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    roleThenReselectedNodeId
      ? roleThenReselectedGraphCandidate.component.nodes[roleThenReselectedNodeId]?.binding
      : undefined,
    { kind: "builtinField", fieldId: "entry.main_title" },
    "A touched binding preserves the explicitly re-selected original binding.",
  );

  const imageBindingEditedCandidate = structuredClone(candidate);
  imageBindingEditedCandidate.reviews = imageBindingEditedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-image"
      ? {
          ...review,
          suggestedRole: "decoration" as const,
          suggestedStudioType: "image" as const,
          suggestedBinding: { kind: "inputImage" as const, inputId: "image-source" },
        }
      : review,
  );
  const imageBindingEditedGraphCandidate = applyStudioFigmaReviewEdits(
    imageBindingEditedCandidate,
    { "figma-image": true },
  );
  const imageBindingEditedNodeId = imageBindingEditedGraphCandidate.reviewNodeIds?.["figma-image"];
  assert.deepEqual(
    imageBindingEditedNodeId
      ? imageBindingEditedGraphCandidate.component.nodes[imageBindingEditedNodeId]?.binding
      : undefined,
    { kind: "inputImage", inputId: "image-source" },
    "A touched decoration image preserves its explicitly selected image binding.",
  );

  const unknownRoleCandidate = structuredClone(candidate);
  unknownRoleCandidate.reviews = unknownRoleCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? { ...review, suggestedRole: "unknown" as const }
      : review,
  );
  const unknownRoleGraphCandidate = applyStudioFigmaReviewEdits(unknownRoleCandidate);
  const unknownRoleNodeId = unknownRoleGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.deepEqual(
    unknownRoleNodeId
      ? unknownRoleGraphCandidate.component.nodes[unknownRoleNodeId]?.binding
      : undefined,
    { kind: "staticText", value: "Weekly broadcast" },
    "An unknown role falls back to the source characters as safe static text.",
  );

  const editedCandidate = structuredClone(candidate);
  editedCandidate.reviews = editedCandidate.reviews.map((review) =>
    review.sourceNodeId === "figma-title"
      ? {
          ...review,
          suggestedRole: "decoration" as const,
          suggestedStudioType: "shape" as const,
          suggestedBinding: { kind: "staticText" as const, value: "ignored for shape" },
        }
      : review,
  );
  const editedGraphCandidate = applyStudioFigmaReviewEdits(editedCandidate);
  const editedTitleNodeId = editedGraphCandidate.reviewNodeIds?.["figma-title"];
  assert.ok(editedTitleNodeId);
  const editedTitleNode = editedGraphCandidate.component.nodes[editedTitleNodeId!];
  assert.equal(editedTitleNode?.type, "shape");
  assert.equal(editedTitleNode?.binding, undefined);
  assert.equal(editedTitleNode?.textAppearance, undefined);

  const duplicateLabelRoot: FigmaNormalizedNode = {
    id: "duplicate-label-root",
    name: "Grid",
    type: "FRAME",
    absoluteBounds: { left: 0, top: 0, width: 100, height: 100 },
    children: [
      { id: "duplicate-a", name: "Duplicate", type: "TEXT", characters: "A", absoluteBounds: { left: 0, top: 0, width: 40, height: 20 } },
      { id: "duplicate-b", name: "Duplicate", type: "TEXT", characters: "B", absoluteBounds: { left: 0, top: 20, width: 40, height: 20 } },
    ],
  };
  const duplicateLabelCandidate = convertFigmaGridCandidate({
    root: duplicateLabelRoot,
    reviews: [
      converterReview("duplicate-a", "text", "main_title"),
      converterReview("duplicate-b", "text", "sub_title"),
    ],
    exportedAssets: [],
  });
  assert.notEqual(
    duplicateLabelCandidate.reviewNodeIds?.["duplicate-a"],
    duplicateLabelCandidate.reviewNodeIds?.["duplicate-b"],
    "Duplicate Figma labels keep distinct exact review mappings.",
  );

  const ids = [
    ...nodes.map((node) => node.id),
    ...Object.keys(candidate.component.styles),
    ...candidate.component.assets.map((asset) => asset.id),
  ];
  const sourceIds = new Set([
    "figma-card-root",
    "figma-entry",
    "figma-title",
    "figma-image",
    "figma-solid-shape",
    "figma-rotated-text",
    "figma-missing-image",
    "figma-effect-leaf",
    "figma-background",
  ]);
  const allowedStyleKeys = new Set([
    "position", "left", "top", "width", "height", "opacity", "rotateDeg",
    "backgroundColor", "borderRadius", "overflow", "fontFamily", "fontSize",
    "fontWeight", "fontStyle", "letterSpacing", "lineHeight", "textAlign",
    "display", "alignItems", "justifyContent", "color",
  ]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => !sourceIds.has(id)));
  assert.ok(Object.values(candidate.component.styles).every((style) =>
    Object.keys(style).every((key) => allowedStyleKeys.has(key)),
  ));
  assert.equal(JSON.stringify(candidate.component).includes("unsupportedFigmaProperty"), false);

  const generatedEntrySource = structuredClone(root);
  generatedEntrySource.children![0]!.name = "Content";
  generatedEntrySource.children![0]!.children!.push({
    id: "figma-nested-entry",
    name: "entry-slot",
    type: "FRAME",
    absoluteBounds: { left: 115, top: 220, width: 100, height: 40 },
  });
  const generatedEntryCandidate = convertFigmaGridCandidate({
    root: generatedEntrySource,
    reviews,
    exportedAssets,
  });
  const generatedEntries = Object.values(generatedEntryCandidate.component.nodes)
    .filter((node) => node.meta?.entrySlot?.index === 0);
  const nestedEntry = Object.values(generatedEntryCandidate.component.nodes)
    .find((node) => node.label === "entry-slot");
  assert.equal(generatedEntries.length, 1);
  assert.equal(nestedEntry?.type, "group");
  assert.equal(nestedEntry?.meta, undefined);
  assert.deepEqual(
    generatedEntryCandidate.component.nodes[generatedEntryCandidate.component.rootNodeId]?.childIds,
    [generatedEntries[0]?.id],
  );
  assert.ok(
    generatedEntries[0]?.childIds.some((childId) =>
      Object.values(generatedEntryCandidate.component.nodes).some(
        (node) => node.id === childId && node.label === "Content",
      ),
    ),
  );

  const originReview = (sourceNodeId: string, value: string): StudioFigmaNodeReview => ({
    sourceNodeId,
    label: sourceNodeId,
    sourceType: "TEXT",
    suggestedRole: "day_label",
    suggestedStudioType: "text",
    suggestedBinding: { kind: "builtinField", fieldId: "day.short_label" },
    sourceCharacters: value,
    confidence: 0.95,
    source: "hybrid",
    decision: "auto",
    agreement: "agree",
    reason: "Stable origin evidence",
  });
  const onlineOrigin: FigmaNormalizedNode = {
    id: "origin-online",
    name: "Online origin",
    type: "COMPONENT",
    absoluteBounds: { left: 0, top: 0, width: 240, height: 120 },
    children: [{ id: "online-day", name: "weekday", type: "TEXT", characters: "MON", rotateDeg: 90,
      absoluteBounds: { left: 20, top: 20, width: 30, height: 12 }, }],
  };
  const offlineOrigin: FigmaNormalizedNode = {
    id: "origin-offline",
    name: "Offline origin",
    type: "COMPONENT",
    absoluteBounds: { left: 0, top: 0, width: 260, height: 140 },
    children: [{ id: "offline-day", name: "weekday", type: "TEXT", characters: "OFFLINE", fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }] }],
  };
  const originCandidate = convertFigmaGridOriginCandidate({
    label: "GRID cards",
    frame: { left: 900, top: 700, width: 240, height: 120 },
    placementInstanceIds: ["placement-2", "placement-1"],
    variants: {
      online: {
        status: "online",
        origin: { componentId: "component-online", componentNodeId: onlineOrigin.id, componentSetNodeId: "set-1", componentName: onlineOrigin.name },
        root: onlineOrigin,
        reviews: [originReview("online-day", "MON")],
        exportedAssets: [],
      },
      offline: {
        status: "offline",
        origin: { componentId: "component-offline", componentNodeId: offlineOrigin.id, componentSetNodeId: "set-1", componentName: offlineOrigin.name },
        root: offlineOrigin,
        reviews: [originReview("offline-day", "OFFLINE")],
        exportedAssets: [],
      },
    },
  });
  assert.deepEqual(Object.keys(originCandidate.variants).sort(), ["offline", "online"]);
  assert.notEqual(originCandidate.variants.online.component.rootNodeId, originCandidate.variants.offline.component.rootNodeId);
  assert.notDeepEqual(originCandidate.variants.online.component.styles, originCandidate.variants.offline.component.styles);
  assert.deepEqual(originCandidate.placementInstanceIds, ["placement-2", "placement-1"]);
  assert.equal(JSON.stringify(originCandidate.variants).includes("placement-1"), false);
  assert.equal(JSON.stringify(Object.values(originCandidate.variants).map((variant) => variant.component)).includes("componentSetNodeId"), false);
  assert.equal(JSON.stringify(originCandidate.variants).includes("offlineMemo"), false);
  const offlineReviewNodeId = originCandidate.variants.offline.reviewNodeIds?.["offline-day"];
  const onlineReviewNodeId = originCandidate.variants.online.reviewNodeIds?.["online-day"];
  const editedOriginCandidate = structuredClone(originCandidate);
  editedOriginCandidate.variants.online.reviews[0]!.suggestedBinding = { kind: "builtinField", fieldId: "entry.time" };
  const edited = applyStudioFigmaReviewEdits(editedOriginCandidate, { "online-day": true });
  assert.deepEqual(edited.variants.online.component.nodes[onlineReviewNodeId!]?.binding, { kind: "builtinField", fieldId: "entry.time" });
  assert.deepEqual(edited.variants.offline.component.nodes[offlineReviewNodeId!]?.binding, { kind: "builtinField", fieldId: "day.short_label" });
  assert.equal(edited.variants.online.reviews[0]?.decision, "manual");
  assert.equal(edited.variants.offline.reviews[0]?.decision, "auto");
};

type ExplicitComponentImportCandidate = StudioFigmaGridCandidate & {
  variants: {
    online: { status: "online"; component: StudioFigmaGridCandidate["component"]; reviews: StudioFigmaNodeReview[]; reviewNodeIds: Record<string, string>; reviewDefaults?: Record<string, StudioFigmaNodeReview>; warnings: string[]; origin: Record<string, string> };
    offline?: { status: "offline"; component: StudioFigmaGridCandidate["component"]; reviews: StudioFigmaNodeReview[]; reviewNodeIds: Record<string, string>; reviewDefaults?: Record<string, StudioFigmaNodeReview>; warnings: string[]; origin: Record<string, string> };
  };
};

const createComponentImportCandidate = (): ExplicitComponentImportCandidate => {
  const candidate: StudioFigmaGridCandidate = {
  candidateId: "figma-source-card-1412:5814",
  label: "Monday card",
  frame: { left: 10, top: 20, width: 240, height: 140 },
  component: {
    rootNodeId: "figma-root",
    nodes: {
      "figma-root": {
        id: "figma-root",
        type: "group",
        label: "Monday card",
        parentId: null,
        childIds: ["figma-entry"],
        styleId: "figma-root-style",
      },
      "figma-entry": {
        id: "figma-entry",
        type: "group",
        label: "Entry",
        parentId: "figma-root",
        childIds: ["figma-title", "figma-image"],
        styleId: "figma-entry-style",
        meta: { entrySlot: { index: 0 } },
      },
      "figma-title": {
        id: "figma-title",
        type: "flexibleText",
        label: "Title",
        parentId: "figma-entry",
        childIds: [],
        styleId: "figma-title-style",
        binding: { kind: "builtinField", fieldId: "entry.main_title" },
      },
      "figma-image": {
        id: "figma-image",
        type: "image",
        label: "Decoration",
        parentId: "figma-entry",
        childIds: [],
        styleId: "figma-image-style",
        binding: { kind: "staticAsset", assetId: "figma-asset" },
        fit: "cover",
      },
    },
    styles: {
      "figma-root-style": { position: "absolute", left: 0, top: 0, width: 240, height: 140 },
      "figma-entry-style": { position: "absolute", left: 0, top: 0, width: 240, height: 140 },
      "figma-title-style": { position: "absolute", left: 18, top: 20, width: 180, height: 36, fontSize: 24, color: "#111827" },
      "figma-image-style": { position: "absolute", left: 12, top: 76, width: 80, height: 42 },
    },
    assets: [
      {
        id: "figma-asset",
        label: "Decoration",
        src: "data:image/png;base64,AA==",
        mimeType: "image/png",
        byteSize: 1,
      },
    ],
  },
  reviewNodeIds: {
    "figma-title": "figma-title",
    "figma-image": "figma-image",
  },
  reviews: [],
  warnings: ["Unsupported Figma shadow was omitted."],
  };
  const offlineComponent = structuredClone(candidate.component);
  offlineComponent.nodes["figma-root"]!.label = "Monday card OFFLINE";
  offlineComponent.nodes["figma-title"]!.label = "Offline title";
  offlineComponent.assets[0] = {
    ...offlineComponent.assets[0]!,
    label: "Offline decoration",
    src: "data:image/png;base64,AQ==",
  };
  const origin = {
    componentId: "figma-component",
    componentNodeId: "figma-root",
    componentSetNodeId: "figma-set",
    componentName: "Monday card",
  };
  return {
    ...candidate,
    variants: {
      online: {
        status: "online",
        component: candidate.component,
        reviews: [],
        reviewNodeIds: { "figma-title": "figma-title", "figma-image": "figma-image" },
        origin,
        warnings: [],
      },
      offline: {
        status: "offline",
        component: offlineComponent,
        reviews: [],
        reviewNodeIds: { "figma-title": "figma-title", "figma-image": "figma-image" },
        origin: { ...origin, componentId: "figma-component-offline", componentName: "Monday card OFFLINE" },
        warnings: [],
      },
    },
  };
};

const runComponentImportChecks = () => {
  const unsafeCandidateDocument = createSampleStudioDocument();
  const unsafeCandidateBefore = JSON.stringify(unsafeCandidateDocument);
  const unsafeCandidate = createComponentImportCandidate();
  unsafeCandidate.component.nodes["figma-title"]!.binding = {
    kind: "staticText",
    value: "https://www.figma.com/design/private-grid?node-id=1412-5814",
  };
  const unsafeCandidateResult = applyStudioFigmaGridCandidate(
    unsafeCandidateDocument,
    unsafeCandidate,
  );
  assert.equal(
    unsafeCandidateResult.ok,
    false,
    "A candidate containing a remote Figma URL is rejected before persistence.",
  );
  assert.equal(JSON.stringify(unsafeCandidateDocument), unsafeCandidateBefore);

  const transientSourceUrlCandidate = createComponentImportCandidate();
  const transientSourceUrlReview: StudioFigmaNodeReview = {
    sourceNodeId: "figma-title",
    label: "Title",
    sourceType: "TEXT",
    suggestedRole: "main_title",
    suggestedStudioType: "flexibleText",
    suggestedBinding: { kind: "builtinField", fieldId: "entry.main_title" },
    sourceCharacters: "https://example.com/live",
    confidence: 0.9,
    source: "rule",
    decision: "needs_review",
    reason: "Fixture",
  };
  transientSourceUrlCandidate.reviews = [transientSourceUrlReview];
  transientSourceUrlCandidate.reviewDefaults = {
    "figma-title": structuredClone(transientSourceUrlReview),
  };
  assert.equal(
    applyStudioFigmaGridCandidate(createSampleStudioDocument(), transientSourceUrlCandidate).ok,
    true,
    "Transient source text URLs do not block a dynamic binding from being imported.",
  );

  const document = createSampleStudioDocument();
  const timetable = document.domains?.timetable;
  assert.ok(timetable);
  if (!timetable) return;
  timetable.days.mon!.componentId = timetable.entryComponentId;
  const originalEntryComponentId = timetable.entryComponentId;
  const originalDayComponentIds = JSON.stringify(
    Object.fromEntries(timetable.dayIds.map((dayId) => [dayId, timetable.days[dayId]?.componentId])),
  );
  const originalRootNodeIds = [...document.graph.rootNodeIds];
  const originalGraphNodeIds = new Set(Object.keys(document.graph.nodes));
  const originalStyleIds = new Set(Object.keys(document.styles));
  const originalAssetIds = new Set(Object.keys(document.assets));
  const originalExistingComponents = Object.fromEntries(
    Object.entries(timetable.components).map(([componentId, component]) => [componentId, structuredClone(component)]),
  );
  const candidate = createComponentImportCandidate();
  candidate.variants.online.reviews = [{
    sourceNodeId: "figma-title",
    label: "Title",
    sourceType: "TEXT",
    suggestedRole: "main_title",
    suggestedStudioType: "flexibleText",
    suggestedBinding: { kind: "builtinField", fieldId: "entry.main_title" },
    confidence: 0.8,
    source: "ai",
    decision: "needs_review",
    reason: "AI reason must remain transient",
    evidence: {
      samples: [{ placementInstanceId: "placement-1", variantStatus: "online", originNodeId: "figma-title", value: "MON" }],
      sampleValues: ["MON"],
      matchedPlacementCount: 1,
      distinctValueCount: 1,
      signals: ["stable_origin_mapping"],
      mapping: "override",
    },
  }];
  const result = applyStudioFigmaGridCandidate(document, candidate);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.notEqual(result.componentId, originalEntryComponentId);
  assert.equal(timetable.entryComponentId, originalEntryComponentId);
  assert.equal(
    JSON.stringify(Object.fromEntries(timetable.dayIds.map((dayId) => [dayId, timetable.days[dayId]?.componentId]))),
    originalDayComponentIds,
  );
  const component = timetable.components[result.componentId];
  assert.ok(component);
  assert.deepEqual(Object.keys(component?.variants ?? {}).sort(), ["offline", "online"]);
  const onlineRootId = component?.variants.online?.rootNodeId;
  const offlineRootId = component?.variants.offline?.rootNodeId;
  assert.ok(onlineRootId && offlineRootId && onlineRootId !== offlineRootId);
  assert.equal(document.graph.rootNodeIds.slice(0, originalRootNodeIds.length).join(","), originalRootNodeIds.join(","));
  const importedNodeIds = new Set<string>();
  const collectNodeIds = (nodeId: string) => {
    if (importedNodeIds.has(nodeId)) return;
    importedNodeIds.add(nodeId);
    document.graph.nodes[nodeId]?.childIds.forEach(collectNodeIds);
  };
  collectNodeIds(onlineRootId!);
  collectNodeIds(offlineRootId!);
  assert.equal([...importedNodeIds].some((id) => originalGraphNodeIds.has(id)), false);
  assert.equal(Object.keys(document.styles).some((id) => !originalStyleIds.has(id) && id === document.graph.nodes[onlineRootId!]?.styleId), true);
  assert.equal(Object.keys(document.assets).some((id) => !originalAssetIds.has(id)), true);
  assert.equal(
    JSON.stringify(Object.fromEntries(Object.keys(originalExistingComponents).map((id) => [id, timetable.components[id]]))),
    JSON.stringify(originalExistingComponents),
    "Existing component frames and variants remain byte-for-byte unchanged.",
  );
  const collectSubtreeStyleIds = (rootId: string) => {
    const styleIds = new Set<string>();
    const visit = (nodeId: string) => {
      const node = document.graph.nodes[nodeId];
      if (!node) return;
      if (node.styleId) styleIds.add(node.styleId);
      node.childIds.forEach(visit);
    };
    visit(rootId);
    return styleIds;
  };
  const onlineStyleIds = collectSubtreeStyleIds(onlineRootId!);
  const offlineStyleIds = collectSubtreeStyleIds(offlineRootId!);
  assert.equal([...onlineStyleIds].some((styleId) => offlineStyleIds.has(styleId)), false);
  const onlineLabels = new Set(
    [...onlineRootId ? [onlineRootId] : [], ...document.graph.nodes[onlineRootId!]?.childIds ?? []]
      .map((nodeId) => document.graph.nodes[nodeId]?.label),
  );
  const offlineLabels = new Set(
    [...offlineRootId ? [offlineRootId] : [], ...document.graph.nodes[offlineRootId!]?.childIds ?? []]
      .map((nodeId) => document.graph.nodes[nodeId]?.label),
  );
  assert.ok(onlineLabels.has("Monday card"));
  assert.ok(offlineLabels.has("Monday card OFFLINE"));
  for (const rootId of [onlineRootId!, offlineRootId!]) {
    const style = document.styles[document.graph.nodes[rootId]?.styleId ?? ""];
    assert.deepEqual(
      { left: style?.left, top: style?.top, width: style?.width, height: style?.height },
      { left: 0, top: 0, width: candidate.frame.width, height: candidate.frame.height },
      "The shared candidate frame is applied to both variant roots.",
    );
  }
  const onlineAssetIds = new Set(
    Object.values(document.graph.nodes).filter((node) => onlineStyleIds.has(node.styleId ?? "")).flatMap((node) =>
      node.binding?.kind === "staticAsset" ? [node.binding.assetId] : [],
    ),
  );
  const offlineAssetIds = new Set(
    Object.values(document.graph.nodes).filter((node) => offlineStyleIds.has(node.styleId ?? "")).flatMap((node) =>
      node.binding?.kind === "staticAsset" ? [node.binding.assetId] : [],
    ),
  );
  assert.equal([...onlineAssetIds].some((assetId) => offlineAssetIds.has(assetId)), false);
  assert.notEqual(
    document.assets[[...onlineAssetIds][0] ?? ""]?.src,
    document.assets[[...offlineAssetIds][0] ?? ""]?.src,
    "Online and offline assets remain visually distinct.",
  );
  for (const rootId of [onlineRootId!, offlineRootId!]) {
    const directEntryGroups = document.graph.nodes[rootId]?.childIds
      .map((nodeId) => document.graph.nodes[nodeId])
      .filter((node) => node?.meta?.entrySlot?.index === 0);
    assert.equal(directEntryGroups?.length, 1);
  }
  assert.equal(JSON.stringify(document).includes("https://www.figma.com/design/private-grid"), false);
  assert.equal(JSON.stringify(document).includes("reviewNodeIds"), false);
  assert.equal(JSON.stringify(document).includes("bindingTouchedSourceNodeIds"), false);
  assert.equal(JSON.stringify(document).includes("placement-"), false);
  assert.equal(JSON.stringify(document).includes("Stable origin evidence"), false);
  assert.ok(result.warnings.some((warning) => /Unsupported Figma shadow/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /multi/i.test(warning)));
  assert.ok(result.warnings.some((warning) => /offline memo/i.test(warning)));

  const duplicate = applyStudioFigmaGridCandidate(document, candidate);
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) return;
  assert.notEqual(duplicate.componentId, result.componentId);
  assert.notEqual(
    timetable.components[duplicate.componentId]?.label,
    timetable.components[result.componentId]?.label,
  );

  const incompleteDocument = createSampleStudioDocument();
  const incompleteBefore = JSON.stringify(incompleteDocument);
  const incompleteCandidate = createComponentImportCandidate();
  delete incompleteCandidate.variants.offline;
  const incomplete = applyStudioFigmaGridCandidate(incompleteDocument, incompleteCandidate);
  assert.equal(incomplete.ok, false, "A one-status candidate is rejected instead of cloned.");
  assert.match(incomplete.ok ? "" : incomplete.reason, /online and offline|both.*variant|incomplete/i);
  assert.equal(JSON.stringify(incompleteDocument), incompleteBefore);

  const capabilityDocument = createSampleStudioDocument();
  const capabilityTimetable = capabilityDocument.domains?.timetable;
  assert.ok(capabilityTimetable);
  if (!capabilityTimetable) return;
  capabilityTimetable.capabilities!.multi.enabled = true;
  capabilityTimetable.capabilities!.offlineMemo.enabled = true;
  ensureStudioIndependentStatusVariants(capabilityDocument);
  const capabilityBeforeImport = JSON.stringify(capabilityDocument);
  const capabilityImport = applyStudioFigmaGridCandidate(
    capabilityDocument,
    createComponentImportCandidate(),
  );
  assert.deepEqual(capabilityImport, {
    ok: false,
    reason: "Figma GRID candidate has no explicit variants for enabled statuses: multi, offlineMemo",
  });
  assert.equal(JSON.stringify(capabilityDocument), capabilityBeforeImport);

  for (const unsafeSource of [
    "https://www.figma.com/api/temporary-export.png",
    "https://temporary.figma.com/export.png",
  ]) {
    const rejectedDocument = createSampleStudioDocument();
    const rejectedBefore = JSON.stringify(rejectedDocument);
    const remoteAssetCandidate = createComponentImportCandidate();
    remoteAssetCandidate.component.assets[0]!.src = unsafeSource;
    const rejected = applyStudioFigmaGridCandidate(rejectedDocument, remoteAssetCandidate);
    assert.deepEqual(rejected, { ok: false, reason: "online variant: Candidate asset source must be a supported data URL" });
    assert.equal(JSON.stringify(rejectedDocument), rejectedBefore);
  }

  const malformedDocument = createSampleStudioDocument();
  const malformedBefore = JSON.stringify(malformedDocument);
  const malformedCandidate = createComponentImportCandidate();
  malformedCandidate.component.nodes["figma-entry"]!.childIds.push("figma-root");
  const malformed = applyStudioFigmaGridCandidate(malformedDocument, malformedCandidate);
  assert.equal(malformed.ok, false);
  assert.equal(JSON.stringify(malformedDocument), malformedBefore);

  const orphanDocument = createSampleStudioDocument();
  const orphanBefore = JSON.stringify(orphanDocument);
  const orphanCandidate = createComponentImportCandidate();
  delete orphanCandidate.component.nodes["figma-title"];
  const orphan = applyStudioFigmaGridCandidate(orphanDocument, orphanCandidate);
  assert.equal(orphan.ok, false);
  assert.equal(JSON.stringify(orphanDocument), orphanBefore);

  const multiParentDocument = createSampleStudioDocument();
  const multiParentBefore = JSON.stringify(multiParentDocument);
  const multiParentCandidate = createComponentImportCandidate();
  multiParentCandidate.component.nodes["figma-root"]!.childIds.push("figma-title");
  const multiParent = applyStudioFigmaGridCandidate(multiParentDocument, multiParentCandidate);
  assert.equal(multiParent.ok, false);
  assert.equal(JSON.stringify(multiParentDocument), multiParentBefore);

  const unsafeBindingDocument = createSampleStudioDocument();
  const unsafeBindingBefore = JSON.stringify(unsafeBindingDocument);
  const unsafeBindingCandidate = createComponentImportCandidate();
  unsafeBindingCandidate.component.nodes["figma-title"]!.binding = {
    kind: "staticText",
    value: "https://www.figma.com/design/private-grid?node-id=1412-5814",
  };
  const unsafeBinding = applyStudioFigmaGridCandidate(unsafeBindingDocument, unsafeBindingCandidate);
  assert.equal(unsafeBinding.ok, false);
  assert.equal(JSON.stringify(unsafeBindingDocument), unsafeBindingBefore);

  const nonDataAssetDocument = createSampleStudioDocument();
  const nonDataAssetBefore = JSON.stringify(nonDataAssetDocument);
  const nonDataAssetCandidate = createComponentImportCandidate();
  nonDataAssetCandidate.component.assets[0]!.src = "data:text/html;base64,PGh0bWw+";
  const nonDataAsset = applyStudioFigmaGridCandidate(nonDataAssetDocument, nonDataAssetCandidate);
  assert.equal(nonDataAsset.ok, false);
  assert.equal(JSON.stringify(nonDataAssetDocument), nonDataAssetBefore);
};

void runReviewServiceChecks()
  .then(runRouteContractChecks)
  .then(runConverterChecks)
  .then(runComponentImportChecks)
  .then(() => console.log("Figma import contract checks passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
