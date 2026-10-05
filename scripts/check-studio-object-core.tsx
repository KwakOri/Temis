import { canonicalizeStudioTimetableDocumentStorage } from "../src/utils/template-studio/semantic-slots";
import { createTimetableGraphFixture } from "./helpers/studio-timetable-fixture";
/** Shared editing and rendering must preserve existing Cards and Timetable output. */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudioTimetableCompositionObject } from "../src/types/template-studio";
import {
  createSampleStudioDocument,
  createInitialStudioRuntimeValues,
} from "../src/utils/template-studio/sample-document";
import { getStudioTimetableComposition } from "./helpers/studio-timetable-recipe";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import {
  createStudioTemplateExportPayload,
  parseStudioTemplateExportJson,
} from "../src/utils/template-studio/serialization";
import {
  applyStudioNodeOffset,
  applyStudioNodeFitParent,
} from "../src/utils/template-studio/node-style-commands";
import {
  applyStudioTimetableObjectOffset,
  applyStudioTimetableObjectFitParent,
} from "../src/utils/template-studio/timetable-commands";
import { applyStudioBindingFormatPatch } from "../src/utils/template-studio/binding-format";
import { getStudioTimetableTextBinding } from "../src/utils/template-studio/timetable-bindings";
import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import { resolveStudioWeekDateText } from "../src/utils/template-studio/date-template";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";
import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";

const document = createSampleStudioDocument();
document.domains!.timetable!.week!.startDate = "2026-09-28";
document.domains!.timetable!.week!.endDate = "2026-10-04";
const composition = getStudioTimetableComposition(document.domains!.timetable);
const legacy: StudioTimetableCompositionObject = {
  id: "legacy-dates",
  kind: "text",
  label: "Week Dates",
  presetId: "weekDates",
  style: {
    left: 12,
    top: 20,
    width: 600,
    height: 100,
    dateRangeFormat: "custom",
    dateRangeTemplate: "${start.MM}/${start.DD} → ${end.MM}/${end.DD}",
  },
  binding: {
    kind: "builtinField",
    fieldId: "week.date_range",
    dateRangeFormat: "short",
    dateRangeTemplate: "stale",
  },
};
composition.objects[legacy.id] = legacy;
composition.rootObjectIds.push(legacy.id);
const values = createInitialStudioRuntimeValues(document);
values.timetable.weekStartDate = "2026-09-28";
// Establish the old renderer's style-pair precedence independently of the adapter.
const expected = resolveStudioWeekDateText(document, {
  format: "custom",
  template: String(legacy.style.dateRangeTemplate),
  startDate: values.timetable.weekStartDate,
});
assert.equal(
  resolveStudioTextBinding(
    document,
    values,
    getStudioTimetableTextBinding(legacy),
  ),
  expected,
);
const source = JSON.stringify(document);
const render = (doc: typeof document) =>
  renderToStaticMarkup(
    <StudioTimetablePreview
      document={createTimetableGraphFixture(doc)}
      runtimeValues={values}
    />,
  );
const before = render(document);
assert.ok(before.includes(expected));
const migration = migrateStudioTemplateDocument(document);
assert.equal(migration.ok, false, "Legacy timetable JSON is rejected.");
const migrated = structuredClone(document);
canonicalizeStudioTimetableDocumentStorage(migrated);
const canonical = migrated.domains!.timetable!.composition!.objects[legacy.id];
assert.equal(canonical.style.dateRangeFormat, undefined);
assert.equal(canonical.style.dateRangeTemplate, undefined);
const dateMarkup = (markup: string) =>
  markup
    .match(/<div[^>]*data-node-id="legacy-dates"[\s\S]*?<\/div>/)?.[0]
    ?.replace(
      /style="([^"]*)"/g,
      (_, css: string) =>
        `style="${css.split(";").filter(Boolean).sort().join(";")}"`,
    );
assert.ok(dateMarkup(before));
assert.equal(
  dateMarkup(render(migrated)),
  dateMarkup(before),
  "Moving date format to binding preserves the actual date object output.",
);
assert.equal(
  JSON.stringify(document),
  source,
  "Read and migration do not mutate legacy documents.",
);
const second = migrateStudioTemplateDocument(createTimetableGraphFixture(migrated));
if (!second.ok) throw new Error(second.message);
assert.deepEqual(second.document, createTimetableGraphFixture(migrated));
const imported = parseStudioTemplateExportJson(
  JSON.stringify(createStudioTemplateExportPayload(createTimetableGraphFixture(document), values)),
);
if (!imported.ok) throw new Error(imported.message);
assert.equal(
  dateMarkup(render(imported.document)),
  dateMarkup(before),
  "Export/import preserves legacy date output.",
);

// A single-date field explicitly chosen on a Week Dates object remains a single date.
const single = {
  ...legacy,
  binding: {
    kind: "builtinField" as const,
    fieldId: "week.start_date" as const,
    dateRangeFormat: "day",
  },
};
assert.equal(getStudioTimetableTextBinding(single), single.binding);
assert.equal(
  resolveStudioTextBinding(
    document,
    values,
    getStudioTimetableTextBinding(single),
  ),
  "28",
);
const node = document.graph.nodes[document.graph.rootNodeIds[0]];
node.binding = { kind: "builtinField", fieldId: "week.date_range" };
applyStudioBindingFormatPatch(node, {
  dateRangeFormat: "custom",
  dateRangeTemplate: "${start.DD} to ${end.DD}",
});
applyStudioBindingFormatPatch(canonical, {
  dateRangeFormat: "custom",
  dateRangeTemplate: "${start.DD} to ${end.DD}",
});
assert.equal(
  resolveStudioTextBinding(document, values, node.binding),
  "28 to 04",
);
assert.equal(
  resolveStudioTextBinding(migrated, values, canonical.binding),
  "28 to 04",
);
node.binding = {
  kind: "builtinField",
  fieldId: "day.label",
  dayLabelFormat: "short",
  dateRangeFormat: "custom",
  dateRangeTemplate: "retain",
};
applyStudioBindingFormatPatch(node, { dayLabelFormat: "default" });
assert.deepEqual(
  node.binding,
  {
    kind: "builtinField",
    fieldId: "day.label",
    dateRangeFormat: "custom",
    dateRangeTemplate: "retain",
  },
  "Resetting day label preserves other binding settings.",
);

// Time formats share field-driven patching and preserve runtime entry scope.
values.timetable.entriesByDay.mon[0].time = "21:05";
node.binding = {
  kind: "builtinField",
  fieldId: "entry.time",
  timeFormat: "full",
};
canonical.binding = { ...node.binding };
for (const target of [node, canonical]) {
  applyStudioBindingFormatPatch(target, {
    timeFormat: "half",
    timeAmText: "오전",
    timePmText: "오후",
  });
  assert.equal(
    resolveStudioTextBinding(document, values, target.binding, {
      dayId: "mon",
      entryIndex: 0,
    }),
    "오후 09:05",
  );
  applyStudioBindingFormatPatch(target, { timeFormat: "full" });
  assert.equal(
    resolveStudioTextBinding(document, values, target.binding, {
      dayId: "mon",
      entryIndex: 0,
    }),
    "21:05",
  );
  assert.equal(
    target.binding?.kind === "builtinField" && target.binding.timePmText,
    "오후",
  );
}

// Both storage adapters use the same movement and fit behavior.
const placed: StudioTimetableCompositionObject = {
  id: "placed",
  kind: "group",
  label: "Placed",
  style: { left: 10, top: 20, width: 120, height: 60, rotateDeg: 7 },
};
node.layoutMode = "fixed";
node.styleId = "shared-style";
document.styles[node.styleId] = { ...placed.style };
applyStudioNodeOffset(
  document,
  [node.id],
  { deltaX: 1 / 3, deltaY: -2 / 3 },
  { round: true },
);
applyStudioTimetableObjectOffset(
  placed,
  { deltaX: 1 / 3, deltaY: -2 / 3 },
  { left: 10, top: 20 },
);
assert.deepEqual(document.styles[node.styleId], placed.style);
for (const fill of [true, false]) {
  applyStudioNodeFitParent(document, node, fill, { width: 300, height: 200 });
  applyStudioTimetableObjectFitParent(placed, fill, {
    width: 300,
    height: 200,
  });
  assert.deepEqual(document.styles[node.styleId], placed.style);
  assert.equal(node.layoutMode, placed.layoutMode);
}

// Static image slots, fit and rotation pass through both actual renderers.
const imageObject: StudioTimetableCompositionObject = {
  id: "shared-image",
  kind: "group",
  label: "Shared image",
  style: { left: 35, top: 45, width: 120, height: 90, rotateDeg: 13 },
  assetSlots: { background: { assetId: "shared-image", fit: "contain" } },
};
document.assets[imageObject.id] = {
  id: imageObject.id,
  label: "Shared image",
  src: "/shared-core-test.png",
};
composition.objects[imageObject.id] = imageObject;
composition.rootObjectIds.push(imageObject.id);
document.graph.nodes[imageObject.id] = {
  id: imageObject.id,
  type: "group",
  label: "Shared image",
  parentId: null,
  childIds: [],
  styleId: "image-style",
  assetSlots: { asset: imageObject.assetSlots!.background },
};
document.styles["image-style"] = imageObject.style;
const graphMarkup = renderToStaticMarkup(
  <StudioRenderer
    document={document}
    runtimeValues={values}
    rootNodeIds={[imageObject.id]}
  />,
);
const timetableMarkup = render(document);
for (const markup of [graphMarkup, timetableMarkup]) {
  assert.match(
    markup,
    /background-image:url\(&quot;\/shared-core-test.png&quot;\)/,
  );
  assert.match(markup, /background-size:contain/);
  assert.match(markup, /rotate\(13deg\)/);
  assert.match(markup, /left:35px;top:45px/);
}
console.log(
  "PASS check-studio-object-core: shared adapters, renderers, legacy dates and binding edits",
);
