import assert from "node:assert/strict";

import { resolveStudioBuiltinFieldValue } from "../src/utils/template-studio/builtin-fields";
import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
import { resolveStudioTimetableDayVariantStatus } from "../src/utils/template-studio/entry-groups";
import { reconcileStudioUserRuntimeValues } from "../src/utils/template-studio/runtime-state";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import {
  addStudioTimetableEntry,
  getStudioTimetableAddEntryDisabledReason,
  getStudioTimetableDaysWithMultipleEntries,
  getStudioTimetableEffectiveMaxEntriesPerDay,
  removeStudioTimetableEntry,
  setStudioTimetableDayBaseStatus,
  setStudioTimetableEntryField,
  setStudioTimetableEntryGuerrilla,
  setStudioTimetableEntryStatus,
  validateStudioRuntimeValuesForDocument,
} from "../src/utils/template-studio/timetable-runtime";

const document = createSampleStudioDocument();
const dayId = document.domains?.timetable?.dayIds[0];
assert.ok(dayId);

const initialValues = createStudioInitialRuntimeValues(document);
const initialEntry = initialValues.timetable.entriesByDay[dayId]?.[0];
assert.ok(initialEntry);
const initialWeekStartDate = initialValues.timetable.weekStartDate;
assert.ok(initialWeekStartDate);
const initialWeekEndDate = new Date(`${initialWeekStartDate}T00:00:00Z`);
initialWeekEndDate.setUTCDate(initialWeekEndDate.getUTCDate() + 6);
const initialWeekEndIsoDate = initialWeekEndDate.toISOString().slice(0, 10);
const initialWeekEndWeekday = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "short",
}).format(initialWeekEndDate);

assert.equal(
  resolveStudioBuiltinFieldValue(
    document,
    initialValues,
    "week.start_date",
    {},
    { dateRangeFormat: "day" },
  ),
  initialWeekStartDate.slice(8, 10),
  "timetable week.start_date must use the single-date resolver.",
);
assert.equal(
  resolveStudioBuiltinFieldValue(
    document,
    initialValues,
    "week.end_date",
    {},
    {
      dateRangeFormat: "custom",
      dateRangeTemplate: "${YYYY}/${MM}/${DD} (${weekdayShort})",
    },
  ),
  `${initialWeekEndIsoDate.slice(0, 4)}/${initialWeekEndIsoDate.slice(5, 7)}/${initialWeekEndIsoDate.slice(8, 10)} (${initialWeekEndWeekday})`,
  "timetable week.end_date must resolve a custom single-date template.",
);
const invalidTimetableWeekStartFormatDocument = structuredClone(document);
invalidTimetableWeekStartFormatDocument.graph.nodes.node_i9.binding = {
  kind: "builtinField",
  fieldId: "week.start_date",
  dateRangeFormat: "split",
};
assert.ok(
  validateStudioDocument(invalidTimetableWeekStartFormatDocument).some(
    (diagnostic) =>
      diagnostic.id === "binding-date-range-format-invalid:node_i9",
  ),
  "timetable week.start_date must validate single-date format identifiers.",
);
const validTimetableWeekEndFormatDocument = structuredClone(document);
validTimetableWeekEndFormatDocument.graph.nodes.node_i9.binding = {
  kind: "builtinField",
  fieldId: "week.end_date",
  dateRangeFormat: "weekday",
};
assert.equal(
  validateStudioDocument(validTimetableWeekEndFormatDocument).some(
    (diagnostic) =>
      diagnostic.id === "binding-date-range-format-invalid:node_i9",
  ),
  false,
  "timetable week.end_date must accept single-date format identifiers.",
);
const invalidTimeFormatDocument = structuredClone(document);
invalidTimeFormatDocument.graph.nodes.node_i9.binding = {
  kind: "builtinField",
  fieldId: "entry.time",
  timeFormat: "unknown" as never,
};
assert.ok(
  validateStudioDocument(invalidTimeFormatDocument).some(
    (diagnostic) => diagnostic.id === "binding-time-format-invalid:node_i9",
  ),
  "entry.time must validate its time format identifier.",
);

assert.equal(getStudioTimetableEffectiveMaxEntriesPerDay(document), 1);
assert.equal(
  getStudioTimetableAddEntryDisabledReason(document, initialValues, dayId),
  "Enable Multi Status to add entries",
);
assert.equal(
  addStudioTimetableEntry(
    document,
    initialValues,
    dayId,
    `${dayId}-blocked-entry`,
  ),
  initialValues,
  "The runtime mutation must reject entry creation while Multi is disabled.",
);

document.domains!.timetable!.capabilities!.multi.enabled = true;
ensureStudioTimetableCapabilityStatus(document.domains!.timetable!, "multi");
assert.equal(getStudioTimetableEffectiveMaxEntriesPerDay(document), 2);
const withSecondEntry = addStudioTimetableEntry(
  document,
  initialValues,
  dayId,
  `${dayId}-entry-2`,
);
assert.equal(withSecondEntry.timetable.entriesByDay[dayId].length, 2);
assert.deepEqual(
  withSecondEntry.timetable.entriesByDay[dayId].map((entry) => entry.statusId),
  ["multi", "multi"],
  "Adding the second online entry must activate the Multi layout.",
);
assert.deepEqual(getStudioTimetableDaysWithMultipleEntries(withSecondEntry), [
  dayId,
]);
assert.equal(
  getStudioTimetableAddEntryDisabledReason(document, withSecondEntry, dayId),
  "Maximum entries reached",
);
assert.equal(
  addStudioTimetableEntry(document, withSecondEntry, dayId, `${dayId}-entry-3`),
  withSecondEntry,
  "Multi must remain a fixed two-entry layout.",
);
const invalidThreeEntries = structuredClone(withSecondEntry);
invalidThreeEntries.timetable.entriesByDay[dayId].push({
  id: `${dayId}-entry-3`,
  statusId: "multi",
});
assert.ok(
  validateStudioRuntimeValuesForDocument(document, invalidThreeEntries).some(
    (diagnostic) => diagnostic.id === `runtime-entry-limit:${dayId}`,
  ),
);
const invalidMixedStatuses = structuredClone(withSecondEntry);
invalidMixedStatuses.timetable.entriesByDay[dayId][0].statusId = "online";
assert.ok(
  validateStudioRuntimeValuesForDocument(document, invalidMixedStatuses).some(
    (diagnostic) => diagnostic.id === `runtime-multi-status:${dayId}`,
  ),
);
const backToSingleEntry = removeStudioTimetableEntry(
  document,
  withSecondEntry,
  dayId,
  1,
);
assert.equal(
  backToSingleEntry.timetable.entriesByDay[dayId][0].statusId,
  "online",
  "Removing back to one entry must restore the Online layout.",
);

document.inputs.offline_preservation_image = {
  id: "offline_preservation_image",
  type: "image",
  scope: "entry",
  label: "Entry image",
};
document.inputs.offline_preservation_text = {
  id: "offline_preservation_text",
  type: "text",
  scope: "entry",
  label: "Entry notes",
};
const authoredMultiValues = structuredClone(withSecondEntry);
authoredMultiValues.timetable.entriesByDay[dayId].forEach((entry, index) => {
  entry.mainTitle = `Authored title ${index + 1}`;
  entry.subTitle = `Authored subtitle ${index + 1}`;
  entry.time = index === 0 ? "18:30" : "21:00";
  entry.isGuerrilla = index === 1;
  authoredMultiValues.entries[dayId][index] = {
    offline_preservation_image: `https://example.com/entry-${index + 1}.png`,
    offline_preservation_text: `Authored notes ${index + 1}`,
  };
});
const offlineValues = setStudioTimetableDayBaseStatus(
  document,
  authoredMultiValues,
  dayId,
  "offline",
);
assert.equal(offlineValues.timetable.entriesByDay[dayId].length, 2);
assert.deepEqual(offlineValues.entries, authoredMultiValues.entries);
assert.deepEqual(
  offlineValues.timetable.entriesByDay[dayId],
  authoredMultiValues.timetable.entriesByDay[dayId].map((entry) => ({
    ...entry,
    statusId: "offline",
  })),
  "Offline must preserve every authored entry and change only the layout status.",
);
assert.equal(
  resolveStudioTimetableDayVariantStatus(document, offlineValues, dayId),
  "offline",
  "Retained entries must render the single Offline layout.",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, offlineValues, "day.is_offline", {
    dayId,
  }),
  "Yes",
);
assert.deepEqual(validateStudioRuntimeValuesForDocument(document, offlineValues), []);

document.domains!.timetable!.capabilities!.offlineMemo.enabled = true;
ensureStudioTimetableCapabilityStatus(
  document.domains!.timetable!,
  "offlineMemo",
);
const offlineMemoValues = setStudioTimetableEntryStatus(
  document,
  offlineValues,
  dayId,
  0,
  "offlineMemo",
);
assert.equal(
  offlineMemoValues.timetable.entriesByDay[dayId][0].statusId,
  "offlineMemo",
);
assert.equal(
  resolveStudioTimetableDayVariantStatus(document, offlineMemoValues, dayId),
  "offlineMemo",
  "Offline Memo must stay available while additional entries are retained.",
);
assert.deepEqual(
  validateStudioRuntimeValuesForDocument(document, offlineMemoValues),
  [],
);
const reconciledOfflineValues = reconcileStudioUserRuntimeValues(
  document,
  { runtimeValues: offlineMemoValues, baseRevisionNo: 1 },
  2,
).runtimeValues;
assert.deepEqual(
  reconciledOfflineValues,
  offlineMemoValues,
  "A template revision must not discard saved Offline entries or their inputs.",
);
const onlineValues = setStudioTimetableDayBaseStatus(
  document,
  reconciledOfflineValues,
  dayId,
  "online",
);
assert.deepEqual(
  onlineValues.timetable.entriesByDay[dayId],
  authoredMultiValues.timetable.entriesByDay[dayId],
  "Online must restore the original order, IDs, titles, times, and Multi layout.",
);
assert.deepEqual(
  onlineValues.entries,
  authoredMultiValues.entries,
  "Online must restore all custom input values and entry images.",
);
assert.deepEqual(validateStudioRuntimeValuesForDocument(document, onlineValues), []);
assert.deepEqual(
  setStudioTimetableDayBaseStatus(
    document,
    setStudioTimetableDayBaseStatus(document, initialValues, dayId, "offline"),
    dayId,
    "online",
  ).timetable.entriesByDay[dayId],
  initialValues.timetable.entriesByDay[dayId],
  "A single entry must restore its Online layout too.",
);

const withMainTitle = setStudioTimetableEntryField(
  document,
  initialValues,
  dayId,
  0,
  "mainTitle",
  "Updated title",
);
assert.equal(
  withMainTitle.timetable.entriesByDay[dayId][0].mainTitle,
  "Updated title",
);
assert.equal(
  withMainTitle.timetable.entriesByDay[dayId][0].statusId,
  initialEntry.statusId,
  "Editing a built-in field must preserve the entry status.",
);
assert.equal(
  initialValues.timetable.entriesByDay[dayId][0].mainTitle,
  undefined,
  "Editing a built-in field must not mutate the previous runtime values.",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, withMainTitle, "entry.main_title", {
    dayId,
    entryIndex: 0,
  }),
  "Updated title",
  "The renderer-facing built-in resolver must read the edited title.",
);

const withSubTitle = setStudioTimetableEntryField(
  document,
  withMainTitle,
  dayId,
  0,
  "subTitle",
  "Updated subtitle",
);
const withTime = setStudioTimetableEntryField(
  document,
  withSubTitle,
  dayId,
  0,
  "time",
  "18:30",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, withTime, "entry.sub_title", {
    dayId,
    entryIndex: 0,
  }),
  "Updated subtitle",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, withTime, "entry.time", {
    dayId,
    entryIndex: 0,
  }),
  "18:30",
);
assert.equal(
  resolveStudioBuiltinFieldValue(
    document,
    withTime,
    "entry.time",
    { dayId, entryIndex: 0 },
    { timeFormat: "half", timeAmText: "아침", timePmText: "오후" },
  ),
  "오후 06:30",
  "12-hour time formatting must support custom AM/PM text.",
);
assert.equal(
  resolveStudioTextBinding(
    document,
    withTime,
    {
      kind: "builtinField",
      fieldId: "entry.time",
      timeFormat: "full",
      timeAmText: "아침",
      timePmText: "오후",
    },
    { dayId, entryIndex: 0 },
  ),
  "18:30",
  "24-hour time formatting must omit half-day text.",
);

const withGuerrilla = setStudioTimetableEntryGuerrilla(
  document,
  withTime,
  dayId,
  0,
  true,
);
assert.equal(withGuerrilla.timetable.entriesByDay[dayId][0].isGuerrilla, true);
assert.equal(
  resolveStudioBuiltinFieldValue(document, withGuerrilla, "entry.time", {
    dayId,
    entryIndex: 0,
  }),
  "게릴라",
  "The renderer-facing time field must show the guerrilla label while enabled.",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, withTime, "entry.time", {
    dayId,
    entryIndex: 0,
  }),
  "18:30",
  "Enabling guerrilla mode must not mutate the previous runtime values.",
);

const unchangedValues = setStudioTimetableEntryField(
  document,
  withTime,
  dayId,
  99,
  "mainTitle",
  "Ignored",
);
assert.equal(
  unchangedValues,
  withTime,
  "An invalid entry index must leave runtime values unchanged.",
);

const migrationSource = createSampleStudioDocument();
migrationSource.domains!.timetable!.capabilities!.multi.enabled = true;
migrationSource.domains!.timetable!.capabilities!.offlineMemo.enabled = true;
assert.ok(
  validateStudioDocument(migrationSource).some(
    (diagnostic) =>
      diagnostic.id === "timetable-capability-status-missing:multi",
  ),
);
assert.equal(migrateStudioTemplateDocument(migrationSource).ok, false,
  "Legacy timetable recipes must not be silently repaired or migrated.");

console.log("Template Studio timetable runtime checks passed.");
