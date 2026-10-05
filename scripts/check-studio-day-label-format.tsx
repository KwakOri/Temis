import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StudioDayLabelFormatField } from "../src/app/(root)/template-studio/_components/studio-day-label-format-field";
import type { StudioBinding } from "../src/types/template-studio";
import { applyStudioBindingFormatPatch } from "../src/utils/template-studio/binding-format";
import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import {
  formatStudioDayLabel,
  getStudioAvailableBuiltinFields,
  getStudioBuiltinField,
} from "../src/utils/template-studio/builtin-fields";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  createStudioTemplateExportPayload,
  parseStudioTemplateExportJson,
} from "../src/utils/template-studio/serialization";
import { createStudioTimetableGraphDocument } from "../src/utils/template-studio/timetable-graph-document";

const document = createStudioTimetableGraphDocument();
const dayId = document.domains.timetable.dayIds[0];
const day = document.domains.timetable.days[dayId];
day.label = "Custom Monday";
day.shortLabel = "Custom Mon";
const values = createStudioInitialRuntimeValues(document);
const context = { dayId };
const target: { binding: StudioBinding } = {
  binding: { kind: "builtinField", fieldId: "day.short_label" },
};
assert.equal(
  resolveStudioTextBinding(document, values, target.binding, context),
  "Custom Mon",
);
assert.equal(getStudioBuiltinField("day.short_label")?.id, "day.label");
assert.deepEqual(
  getStudioAvailableBuiltinFields(document)
    .filter(
      (field) => field.id === "day.label" || field.id === "day.short_label",
    )
    .map((field) => field.id),
  ["day.label"],
  "Only one weekday source is offered, while the old source still resolves.",
);
applyStudioBindingFormatPatch(target, { dayLabelFormat: "documentShort" });
assert.deepEqual(target.binding, {
  kind: "builtinField",
  fieldId: "day.label",
  dayLabelFormat: "documentShort",
});
assert.equal(
  resolveStudioTextBinding(document, values, target.binding, context),
  "Custom Mon",
  "Canonicalizing keeps custom document short labels.",
);

const template =
  "${label} / ${shortLabel}\n(${weekdayShortUpper}) · ${weekdayKo} · ${weekdayKoShort}";
applyStudioBindingFormatPatch(target, {
  dayLabelFormat: "custom",
  dayLabelTemplate: template,
});
assert.equal(
  resolveStudioTextBinding(document, values, target.binding, context),
  "Custom Monday / Custom Mon\n(MON) · 월요일 · 월",
);
assert.equal(
  formatStudioDayLabel(
    day,
    "day.label",
    "custom",
    "${unknown} ${weekdayShortLower}",
  ),
  "${unknown} mon",
);
assert.equal(
  formatStudioDayLabel(day, "day.label", "custom", ""),
  "",
  "Empty templates stay empty.",
);
assert.equal(
  formatStudioDayLabel(null, "day.label", "custom", "Day ${weekday}"),
  "",
);

const node = Object.values(document.graph.nodes).find(
  (node) => node.type === "text" || node.type === "flexibleText",
);
assert.ok(node);
node.binding = target.binding;
const restored = parseStudioTemplateExportJson(
  JSON.stringify(createStudioTemplateExportPayload(document, values)),
);
if (!restored.ok) throw new Error(restored.message);
assert.deepEqual(
  restored.document.graph.nodes[node.id].binding,
  target.binding,
);
assert.equal(
  resolveStudioTextBinding(
    restored.document,
    restored.runtimeValues,
    restored.document.graph.nodes[node.id].binding,
    context,
  ),
  "Custom Monday / Custom Mon\n(MON) · 월요일 · 월",
);

applyStudioBindingFormatPatch(target, { dayLabelFormat: "short" });
assert.equal(
  resolveStudioTextBinding(document, values, target.binding, context),
  "Mon",
  "Picking a preset clears the custom template.",
);
applyStudioBindingFormatPatch(target, { dayLabelFormat: "default" });
assert.deepEqual(target.binding, {
  kind: "builtinField",
  fieldId: "day.label",
});
assert.equal(
  resolveStudioTextBinding(document, values, target.binding, context),
  "Custom Monday",
);
const markup = renderToStaticMarkup(
  <StudioDayLabelFormatField fieldId="day.short_label" onChange={() => {}} />,
);
assert.match(markup, /value="documentShort" selected=""/);
assert.match(markup, /사용자 지정/);
assert.match(markup, /\$\{shortLabel\}/);
console.log(
  "Studio day label format checks passed: unified source, legacy short labels, templates, preset reset, export/import.",
);
