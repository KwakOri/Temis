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
const modalSource = fs.readFileSync(
  "src/app/(root)/template-studio/_components/studio-settings-modal.tsx",
  "utf8",
);
assert.match(clientSource, /candidateWithEdits/);
assert.match(clientSource, /applyStudioFigmaGridCandidate\(nextDocument, candidateWithEdits\)/);
assert.match(clientSource, /clearFigmaImportState/);
assert.match(clientSource, /setSelectedCardComponentId\(importResult\.current\.componentId\)/);
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
