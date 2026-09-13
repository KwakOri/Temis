import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  applyStudioFigmaReviewPatch,
  StudioFigmaComponentImport,
  type ImportCandidate,
} from "../src/components/studio/settings/studio-figma-component-import";
import type { StudioFigmaGridCandidate, StudioFigmaNodeReview } from "../src/types/template-studio-figma";

const onlineReview = {
  sourceNodeId: "title",
  label: "Title",
  sourceType: "TEXT",
  suggestedRole: "main_title" as const,
  suggestedStudioType: "flexibleText" as const,
  suggestedBinding: { kind: "builtinField" as const, fieldId: "entry.main_title" as const },
  confidence: 0.92,
  source: "hybrid" as const,
  decision: "needs_review" as const,
  agreement: "disagree" as const,
  evidence: {
    samples: [],
    sampleValues: ["MON", "TUE", "WED", "THU"],
    matchedPlacementCount: 7,
    distinctValueCount: 4,
    signals: ["stable_origin_mapping", "known_weekday_set"] as const,
    mapping: "stable_path" as const,
  },
  reason: "Rule and AI disagree about the semantic role",
};

const panelReview = (
  sourceNodeId: string,
  label: string,
  suggestedRole: StudioFigmaNodeReview["suggestedRole"],
  suggestedStudioType: StudioFigmaNodeReview["suggestedStudioType"],
  suggestedBinding: StudioFigmaNodeReview["suggestedBinding"],
) => ({
  ...onlineReview,
  sourceNodeId,
  label,
  suggestedRole,
  suggestedStudioType,
  suggestedBinding,
  decision: "auto" as const,
  agreement: "agree" as const,
  reason: "Stable GRID origin evidence",
});

const onlinePanelReviews = [
  onlineReview,
  panelReview("sub-title", "Sub title", "sub_title", "flexibleText", { kind: "builtinField", fieldId: "entry.sub_title" }),
  panelReview("time", "Time", "time", "text", { kind: "builtinField", fieldId: "entry.time" }),
  panelReview("day", "Day", "day_label", "text", { kind: "builtinField", fieldId: "day.short_label" }),
  panelReview("date", "Date", "date", "text", { kind: "builtinField", fieldId: "day.date" }),
  panelReview("status", "Status", "status_label", "text", { kind: "builtinField", fieldId: "entry.status_label" }),
  panelReview("weekly", "Weekly memo", "unknown", "text", { kind: "staticText", value: "Weekly memo" }),
  panelReview("artist", "Artist text", "unknown", "text", { kind: "staticText", value: "Artist text" }),
  panelReview("weekly-camel", "weeklyMemo", "unknown", "text", { kind: "staticText", value: "weeklyMemo" }),
  panelReview("artist-camel", "artistProfileText", "unknown", "text", { kind: "staticText", value: "artistProfileText" }),
];
const offlinePanelReviews = [
  { ...onlineReview, ...panelReview("offline-title", "Offline title", "main_title", "flexibleText", { kind: "builtinField", fieldId: "entry.main_title" }) },
  panelReview("offline-sub-title", "Offline sub title", "sub_title", "flexibleText", { kind: "builtinField", fieldId: "entry.sub_title" }),
  panelReview("offline-day", "Offline day", "day_label", "text", { kind: "builtinField", fieldId: "day.short_label" }),
  panelReview("offline-date", "Offline date", "date", "text", { kind: "builtinField", fieldId: "day.date" }),
  panelReview("offline-time", "Offline time", "time", "text", { kind: "builtinField", fieldId: "entry.time" }),
  panelReview("offline-status", "Offline status", "status_label", "text", { kind: "builtinField", fieldId: "entry.status_label" }),
  panelReview("offline-memo", "Offline memo", "offline_memo", "flexibleText", { kind: "builtinField", fieldId: "day.offline_memo" }),
  panelReview("offline-weekly", "Weekly memo", "unknown", "text", { kind: "staticText", value: "Weekly memo" }),
  panelReview("offline-artist", "Artist text", "unknown", "text", { kind: "staticText", value: "Artist text" }),
  panelReview("offline-weekly-camel", "weeklyMemo", "unknown", "text", { kind: "staticText", value: "weeklyMemo" }),
  panelReview("offline-artist-camel", "artistProfileText", "unknown", "text", { kind: "staticText", value: "artistProfileText" }),
];

const assertPanelRow = (label: string, type: string, binding: string) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const row = new RegExp(
    `>${escapedLabel}</span>[\\s\\S]*?<select aria-label="${escapedLabel} text type"[^>]*>[\\s\\S]*?<option value="${type}" selected="">[\\s\\S]*?</select>[\\s\\S]*?<option value="${binding}" selected="">`,
  );
  assert.match(markup, row, `${label} selects ${type} with ${binding}`);
};

const candidate = {
  candidateId: "candidate-mon",
  label: "Monday card",
  frame: { left: 0, top: 0, width: 320, height: 180 },
  component: { nodes: {}, styles: {}, rootNodeId: "root", assets: [] },
  reviews: onlinePanelReviews,
  variants: {
    online: {
      status: "online" as const,
      origin: { componentId: "online", componentNodeId: "online", componentSetNodeId: "set", componentName: "Online" },
      component: { nodes: {}, styles: {}, rootNodeId: "online-root", assets: [] },
      reviews: onlinePanelReviews,
      warnings: [],
    },
    offline: {
      status: "offline" as const,
      origin: { componentId: "offline", componentNodeId: "offline", componentSetNodeId: "set", componentName: "Offline" },
      component: { nodes: {}, styles: {}, rootNodeId: "offline-root", assets: [] },
      reviews: offlinePanelReviews,
      warnings: [],
    },
  },
  placementInstanceIds: ["placement-1", "placement-2", "placement-3", "placement-4", "placement-5", "placement-6", "placement-7"],
  warnings: ["Review this candidate"],
} as unknown as StudioFigmaGridCandidate;

const markup = renderToStaticMarkup(
  <StudioFigmaComponentImport
    candidates={[candidate]}
    errorMessage={null}
    figmaUrl=""
    isAnalyzing={false}
    isImporting={false}
    isRemoteSyncing={false}
    selectedCandidateId={candidate.candidateId}
    statusMessage={null}
    onAnalyze={() => {}}
    onBindingChange={() => {}}
    onCancel={() => {}}
    onCandidateSelect={() => {}}
    onReviewChange={() => {}}
    onUrlChange={() => {}}
    onConfirm={() => {}}
  />,
);

assert.match(markup, /컴포넌트 카드 링크/);
assert.match(markup, /type="url"/);
assert.match(markup, />분석</);
assert.match(markup, /candidate-mon/);
assert.equal((markup.match(/data-component-set-candidate=/g) ?? []).length, 1, "one component-set candidate row is rendered");
assert.match(markup, /Component Set|컴포넌트 세트/);
assert.match(markup, /Online/);
assert.match(markup, /Offline/);
assert.match(markup, /7.*discovery evidence only|7.*발견 증거/);
assert.match(markup, /Title/);
for (const row of [
  ["Title", "flexibleText", "entry.main_title"],
  ["Sub title", "flexibleText", "entry.sub_title"],
  ["Offline title", "flexibleText", "entry.main_title"],
  ["Offline sub title", "flexibleText", "entry.sub_title"],
  ["Offline memo", "flexibleText", "day.offline_memo"],
] as const) assertPanelRow(...row);
const weeklyTypeSelects = [...markup.matchAll(/<select aria-label="Weekly memo text type"[^>]*>[\s\S]*?<\/select>/g)].map(([select]) => select);
const artistTypeSelects = [...markup.matchAll(/<select aria-label="Artist text text type"[^>]*>[\s\S]*?<\/select>/g)].map(([select]) => select);
assert.equal(weeklyTypeSelects.length, 2);
assert.equal(artistTypeSelects.length, 2);
for (const select of [...weeklyTypeSelects, ...artistTypeSelects]) {
  assert.match(select, /<option value="text" selected="">Text/);
  assert.doesNotMatch(select, /<option value="flexibleText" selected="">/);
}
assertPanelRow("Weekly memo", "text", "staticText");
assertPanelRow("Artist text", "text", "staticText");
for (const label of ["weeklyMemo", "artistProfileText"] as const) {
  const typeSelects = [...markup.matchAll(new RegExp(`<select aria-label="${label} text type"[^>]*>[\\s\\S]*?<\\/select>`, "g"))];
  assert.equal(typeSelects.length, 2, `${label} appears in online and offline rows`);
  for (const [select] of typeSelects) {
    assert.match(select, /<option value="text" selected="">Text/);
    assert.doesNotMatch(select, /<option value="flexibleText" selected="">/);
  }
  assertPanelRow(label, "text", "staticText");
}
assert.match(markup, /confidence|신뢰도/);
assert.match(markup, /MON.*TUE.*WED/);
assert.match(markup, /disagree|불일치/);
assert.match(markup, /needs_review/);
assert.match(markup, /새 컴포넌트 세트로 추가/);
assert.match(markup, /Review this candidate/);

const interactedCandidate = applyStudioFigmaReviewPatch(
  candidate as unknown as ImportCandidate,
  "online",
  "title",
  { suggestedBinding: { kind: "builtinField", fieldId: "entry.time" } },
);
if (!("variants" in interactedCandidate)) throw new Error("expected nested variants");
const interactedVariants = interactedCandidate.variants;
assert.deepEqual(interactedVariants.online.reviews[0]?.suggestedBinding, {
  kind: "builtinField",
  fieldId: "entry.time",
});
assert.equal(interactedVariants.online.reviews[0]?.decision, "manual");
assert.deepEqual(interactedVariants.offline.reviews[0]?.suggestedBinding, offlinePanelReviews[0]?.suggestedBinding);
assert.equal(interactedVariants.offline.reviews[0]?.decision, offlinePanelReviews[0]?.decision);

const clientSource = fs.readFileSync(
  "src/app/(root)/template-studio/_components/template-studio-client.tsx",
  "utf8",
);
const serviceSource = fs.readFileSync("src/services/templateStudioService.ts", "utf8");
const reviewEditSource = fs.readFileSync(
  "src/utils/template-studio/figma-import/figma-review-edits.ts",
  "utf8",
);
const panelSource = fs.readFileSync(
  "src/components/studio/settings/studio-figma-component-import.tsx",
  "utf8",
);
const modalSource = fs.readFileSync(
  "src/app/(root)/template-studio/_components/studio-settings-modal.tsx",
  "utf8",
);
assert.match(clientSource, /candidateWithEdits/);
assert.match(clientSource, /applyStudioFigmaGridCandidate\(nextDocument, candidateWithEdits\)/);
assert.match(clientSource, /applyStudioFigmaReviewEdits/);
assert.match(clientSource, /figmaBindingTouchedSourceNodeIds/);
assert.match(clientSource, /recordFigmaBindingChange/);
assert.match(clientSource, /onBindingChange: recordFigmaBindingChange/);
assert.match(clientSource, /recordFigmaBindingChange = useCallback\(\(statusOrSourceNodeId/);
assert.match(clientSource, /applyStudioFigmaReviewPatch/);
assert.match(clientSource, /\$\{status\}:\$\{touchedSourceNodeId\}/);
assert.match(reviewEditSource, /reviewNodeIds/);
assert.match(reviewEditSource, /bindingTouchedSourceNodeIds/);
assert.match(reviewEditSource, /bindingTouchedSourceNodeIds\[review\.sourceNodeId\] === true/);
assert.match(reviewEditSource, /component\.nodes\[graphNodeId\]/);
assert.doesNotMatch(reviewEditSource, /node\.label === review\.label/);
assert.doesNotMatch(panelSource, /onFocus=/);
assert.match(panelSource, /onBindingChange/);
assert.match(panelSource, /offline_memo/);
assert.match(panelSource, /day\.offline_memo/);
assert.match(panelSource, /onChange=\{\(event\) => \{[\s\S]*emitBindingChange\([^)]*review\.sourceNodeId/);
assert.match(panelSource, /review\.evidence/);
assert.match(panelSource, /candidate\.variants/);
assert.match(panelSource, /decision: "manual"/);
assert.match(panelSource, /variants\[status\]/);
assert.doesNotMatch(clientSource, /graphNodes\.find\(\(node\) => node\.label === review\.label\)/);
assert.match(clientSource, /clearFigmaImportState/);
assert.match(clientSource, /figmaAnalysisSequenceRef/);
assert.match(clientSource, /requestSequence/);
assert.match(clientSource, /handleFigmaUrlChange/);
assert.match(clientSource, /onUrlChange: handleFigmaUrlChange/);
assert.match(clientSource, /captureHistory\(\)/);
assert.match(clientSource, /const importResult = applyStudioFigmaGridCandidate/);
assert.match(clientSource, /figmaAnalysisSequenceRef\.current \+= 1/);
assert.match(clientSource, /figmaAnalysisSequenceRef\.current !== requestSequence/);
assert.match(clientSource, /onClose=\{\(\) => \{/);
const importFunctionSource = clientSource.slice(
  clientSource.indexOf("const importFigmaCandidate"),
  clientSource.indexOf("const updateNode"),
);
assert.ok(
  importFunctionSource.indexOf("const importResult = applyStudioFigmaGridCandidate") <
    importFunctionSource.indexOf("captureHistory();"),
  "Failed candidate validation must happen before the history snapshot.",
);
assert.doesNotMatch(importFunctionSource, /updateDocument\(/);
assert.match(clientSource, /setSelectedCardComponentId\(importResult\.componentId\)/);
assert.match(serviceSource, /fetch\("\/api\/admin\/template-studio\/figma\/analyze"/);
assert.match(serviceSource, /body: JSON\.stringify\(\{ figmaUrl \}\)/);
assert.ok(!serviceSource.includes("console.log(figmaUrl)"));
assert.match(modalSource, /document\.domains\?\.timetable \? \(/);
assert.match(modalSource, /StudioFigmaComponentImport/);

const beforeDocument = JSON.stringify({ domains: { timetable: { components: {} } } });
const renderedDocument = { domains: { timetable: { components: {} } } };
renderToStaticMarkup(<div data-document={JSON.stringify(renderedDocument)} />);
assert.equal(JSON.stringify(renderedDocument), beforeDocument);

console.log("Studio Figma component import panel checks passed");
