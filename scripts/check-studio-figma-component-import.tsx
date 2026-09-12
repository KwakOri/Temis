import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioFigmaComponentImport } from "../src/components/studio/settings/studio-figma-component-import";
import type { StudioFigmaGridCandidate } from "../src/types/template-studio-figma";

const candidate: StudioFigmaGridCandidate = {
  candidateId: "candidate-mon",
  label: "Monday card",
  frame: { left: 0, top: 0, width: 320, height: 180 },
  component: { nodes: {}, styles: {}, rootNodeId: "root", assets: [] },
  reviews: [{
    sourceNodeId: "title",
    label: "Title",
    sourceType: "TEXT",
    suggestedRole: "main_title",
    suggestedStudioType: "flexibleText",
    suggestedBinding: { kind: "builtinField", fieldId: "entry.main_title" },
    confidence: 0.92,
    source: "rule",
    decision: "needs_review",
    reason: "Semantic title mapping",
  }],
  warnings: ["Review this candidate"],
};

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
assert.match(markup, /Title/);
assert.match(markup, /Auto Text/);
assert.match(markup, /entry\.main_title/);
assert.match(markup, /confidence|신뢰도/);
assert.match(markup, /새 컴포넌트 세트로 추가/);
assert.match(markup, /Review this candidate/);

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
assert.match(reviewEditSource, /reviewNodeIds/);
assert.match(reviewEditSource, /bindingTouchedSourceNodeIds/);
assert.match(reviewEditSource, /bindingTouchedSourceNodeIds\[review\.sourceNodeId\] === true/);
assert.match(reviewEditSource, /component\.nodes\[graphNodeId\]/);
assert.doesNotMatch(reviewEditSource, /node\.label === review\.label/);
assert.doesNotMatch(panelSource, /onFocus=/);
assert.match(panelSource, /onBindingChange/);
assert.match(panelSource, /onChange=\{\(event\) => \{[\s\S]*onBindingChange\(review\.sourceNodeId\)/);
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
