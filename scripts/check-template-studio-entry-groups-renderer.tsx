import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { cloneStudioComponentVariant } from "../src/utils/template-studio/component-variants";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import {
  addStudioTimetableEntry,
  setStudioTimetableEntryField,
} from "../src/utils/template-studio/timetable-runtime";

const countOccurrences = (source: string, value: string) =>
  source.split(value).length - 1;

const document = createSampleStudioDocument();
const timetable = document.domains!.timetable!;
timetable.capabilities!.multi.enabled = true;
ensureStudioTimetableCapabilityStatus(timetable, "multi");
const component = timetable.components[timetable.entryComponentId];
const cloneResult = cloneStudioComponentVariant(
  document,
  component.id,
  "online",
  "multi",
);
if (!cloneResult.ok) throw new Error(cloneResult.reason);

const dayId = timetable.dayIds[0];
let runtimeValues = createStudioInitialRuntimeValues(document);
runtimeValues = setStudioTimetableEntryField(
  document,
  runtimeValues,
  dayId,
  0,
  "mainTitle",
  "First authored entry",
);
runtimeValues = addStudioTimetableEntry(
  document,
  runtimeValues,
  dayId,
  `${dayId}-entry-2`,
);
runtimeValues = setStudioTimetableEntryField(
  document,
  runtimeValues,
  dayId,
  1,
  "mainTitle",
  "Second authored entry",
);

const markup = renderToStaticMarkup(
  <StudioTimetablePreview document={document} runtimeValues={runtimeValues} />,
);

assert.equal(countOccurrences(markup, "First authored entry"), 1);
assert.equal(countOccurrences(markup, "Second authored entry"), 1);
assert.equal(
  countOccurrences(markup, "Monday"),
  1,
  "Day-level objects must render once even when Multi has two entries.",
);
assert.equal(
  markup.includes("scale("),
  false,
  "Timetable runtime must not scale a full card per entry.",
);

console.log("Template Studio Entry Group renderer checks passed.");
