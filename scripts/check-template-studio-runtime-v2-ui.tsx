import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TemplateStudioRuntimeForm } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form";
import { TemplateStudioRuntimeShell } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import {
  addStudioTimetableEntry,
  setStudioTimetableDayBaseStatus,
  setStudioTimetableEntryStatus,
} from "../src/utils/template-studio/timetable-runtime";

const countOccurrences = (source: string, value: string) =>
  source.split(value).length - 1;

const document = createSampleStudioDocument();
const timetable = document.domains?.timetable;
assert.ok(timetable);
const capabilities = timetable.capabilities;
assert.ok(capabilities);
const dayId = timetable.dayIds[0];
assert.ok(dayId);

capabilities.multi.enabled = true;
capabilities.offlineMemo.enabled = true;
ensureStudioTimetableCapabilityStatus(timetable, "multi");
ensureStudioTimetableCapabilityStatus(timetable, "offlineMemo");

const renderForm = (
  targetDocument: StudioTemplateDocument,
  runtimeValues: StudioRuntimeValues,
) =>
  renderToStaticMarkup(
    <TemplateStudioRuntimeForm
      document={targetDocument}
      runtimeValues={runtimeValues}
      setRuntimeValues={() => undefined}
      onReset={() => undefined}
    />,
  );

const initialValues = createStudioInitialRuntimeValues(document);
const singleEntryMarkup = renderForm(document, initialValues);
assert.match(singleEntryMarkup, /aria-label="Runtime form sections"/);
assert.match(singleEntryMarkup, />Global settings</);
assert.match(singleEntryMarkup, />Weekly timetable</);
assert.equal(
  countOccurrences(singleEntryMarkup, 'aria-label="Entry 1"'),
  0,
  "A single entry must not reserve UI for an entry number.",
);
assert.doesNotMatch(singleEntryMarkup, /aria-label="Remove entry [0-9]+"/);

const multiValues = addStudioTimetableEntry(
  document,
  initialValues,
  dayId,
  `${dayId}-entry-2`,
);
const multiMarkup = renderForm(document, multiValues);
assert.match(multiMarkup, />Multi</);
assert.equal(countOccurrences(multiMarkup, 'aria-label="Entry 1"'), 1);
assert.equal(countOccurrences(multiMarkup, 'aria-label="Entry 2"'), 1);
assert.match(multiMarkup, /aria-label="Remove entry 1"/);
assert.match(multiMarkup, /aria-label="Remove entry 2"/);
assert.doesNotMatch(
  multiMarkup,
  new RegExp(`${dayId}-entry-2`),
  "Internal entry IDs must not be rendered as user-facing text.",
);

const offlineValues = setStudioTimetableDayBaseStatus(
  document,
  initialValues,
  dayId,
  "offline",
);
const offlineMemoValues = setStudioTimetableEntryStatus(
  document,
  offlineValues,
  dayId,
  0,
  "offlineMemo",
);
const offlineMemoMarkup = renderForm(document, offlineMemoValues);
assert.match(offlineMemoMarkup, /aria-label="Mon offline memo"/);
assert.match(offlineMemoMarkup, /aria-checked="true"/);
assert.match(offlineMemoMarkup, />Offline Memo</);

assert.doesNotMatch(singleEntryMarkup, /blue-[0-9]/);
assert.doesNotMatch(multiMarkup, /blue-[0-9]/);
assert.doesNotMatch(offlineMemoMarkup, /blue-[0-9]/);

const dynamicDocument = structuredClone(document);
dynamicDocument.inputs.dynamic_global_check = {
  id: "dynamic_global_check",
  type: "text",
  scope: "global",
  label: "Dynamic Global Check",
};
dynamicDocument.inputs.dynamic_day_check = {
  id: "dynamic_day_check",
  type: "image",
  scope: "day",
  label: "Dynamic Day Check",
};
dynamicDocument.inputs.dynamic_entry_check = {
  id: "dynamic_entry_check",
  type: "select",
  scope: "entry",
  label: "Dynamic Entry Check",
  defaultValue: "one",
  options: [{ value: "one", label: "One" }],
};

const dynamicInitialValues = createStudioInitialRuntimeValues(dynamicDocument);
const dynamicMarkup = renderForm(dynamicDocument, dynamicInitialValues);
assert.equal(countOccurrences(dynamicMarkup, "Dynamic Global Check"), 1);
assert.equal(
  countOccurrences(dynamicMarkup, "Dynamic Day Check"),
  timetable.dayIds.length,
  "A day-scoped input must render in every day card.",
);
assert.equal(
  countOccurrences(dynamicMarkup, "Dynamic Entry Check"),
  timetable.dayIds.length,
  "An entry-scoped input must render once for every initial entry.",
);

const dynamicMultiValues = addStudioTimetableEntry(
  dynamicDocument,
  dynamicInitialValues,
  dayId,
  `${dayId}-dynamic-entry-2`,
);
const dynamicMultiMarkup = renderForm(dynamicDocument, dynamicMultiValues);
assert.equal(
  countOccurrences(dynamicMultiMarkup, "Dynamic Entry Check"),
  timetable.dayIds.length + 1,
  "Adding an entry must also add its dynamic entry-scoped controls.",
);

const movedScopeDocument = structuredClone(dynamicDocument);
movedScopeDocument.inputs.dynamic_global_check.scope = "day";
const movedScopeMarkup = renderForm(
  movedScopeDocument,
  createStudioInitialRuntimeValues(movedScopeDocument),
);
assert.equal(
  countOccurrences(movedScopeMarkup, "Dynamic Global Check"),
  timetable.dayIds.length,
  "Changing an input scope must change its placement without form code changes.",
);

delete movedScopeDocument.inputs.dynamic_global_check;
const removedInputMarkup = renderForm(
  movedScopeDocument,
  createStudioInitialRuntimeValues(movedScopeDocument),
);
assert.doesNotMatch(removedInputMarkup, /Dynamic Global Check/);

const shellMarkup = renderToStaticMarkup(
  <TemplateStudioRuntimeShell
    document={document}
    initialRuntimeValues={initialValues}
    source="draft"
    templateId="runtime-v2-ui-check"
    templateName="Runtime V2 UI Check"
  />,
);
assert.match(shellMarkup, /template-studio-runtime-theme/);
assert.match(shellMarkup, /aria-label="Zoom out"/);
assert.match(shellMarkup, /aria-label="Zoom in"/);
assert.match(shellMarkup, /aria-label="Fit preview"/);
assert.doesNotMatch(shellMarkup, /blue-[0-9]/);

console.log("Template Studio runtime V2 UI checks passed.");
