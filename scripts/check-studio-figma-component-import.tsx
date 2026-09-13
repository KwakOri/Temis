import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  applyStudioFigmaReviewPatch,
  StudioFigmaComponentImport,
  type ImportCandidate,
} from "../src/components/studio/settings/studio-figma-component-import";
import type { StudioFigmaGridCandidate } from "../src/types/template-studio-figma";

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

const offlineReview = {
  ...onlineReview,
  sourceNodeId: "title",
  decision: "auto" as const,
  agreement: "agree" as const,
  reason: "Offline origin evidence is stable",
};

const candidate = {
  candidateId: "candidate-mon",
  label: "Monday card",
  frame: { left: 0, top: 0, width: 320, height: 180 },
  component: { nodes: {}, styles: {}, rootNodeId: "root", assets: [] },
  reviews: [onlineReview],
  variants: {
    online: {
      status: "online" as const,
      origin: { componentId: "online", componentNodeId: "online", componentSetNodeId: "set", componentName: "Online" },
      component: { nodes: {}, styles: {}, rootNodeId: "online-root", assets: [] },
      reviews: [onlineReview],
      warnings: [],
    },
    offline: {
      status: "offline" as const,
      origin: { componentId: "offline", componentNodeId: "offline", componentSetNodeId: "set", componentName: "Offline" },
      component: { nodes: {}, styles: {}, rootNodeId: "offline-root", assets: [] },
      reviews: [offlineReview],
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
assert.match(markup, /Auto Text/);
assert.match(markup, /entry\.main_title/);
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
assert.deepEqual(interactedVariants.offline.reviews[0]?.suggestedBinding, offlineReview.suggestedBinding);
assert.equal(interactedVariants.offline.reviews[0]?.decision, offlineReview.decision);

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
