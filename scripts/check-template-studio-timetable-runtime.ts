import assert from "node:assert/strict";

import { resolveStudioBuiltinFieldValue } from "../src/utils/template-studio/builtin-fields";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { ensureStudioTimetableCapabilityStatus } from "../src/utils/template-studio/timetable-capabilities";
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

const offlineValues = setStudioTimetableDayBaseStatus(
  document,
  withSecondEntry,
  dayId,
  "offline",
);
assert.equal(offlineValues.timetable.entriesByDay[dayId].length, 1);
assert.equal(offlineValues.entries[dayId].length, 1);
assert.equal(
  offlineValues.timetable.entriesByDay[dayId][0].statusId,
  "offline",
);

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
const onlineValues = setStudioTimetableDayBaseStatus(
  document,
  offlineMemoValues,
  dayId,
  "online",
);
assert.equal(onlineValues.timetable.entriesByDay[dayId][0].statusId, "online");

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
const migrationResult = migrateStudioTemplateDocument(migrationSource);
if (!migrationResult.ok) throw new Error(migrationResult.message);
assert.deepEqual(migrationResult.document.domains?.timetable?.statuses.multi, {
  id: "multi",
  label: "Multi",
  kind: "derived",
  baseStatus: "online",
  fallbackStatusId: "online",
});
assert.deepEqual(
  migrationResult.document.domains?.timetable?.statuses.offlineMemo,
  {
    id: "offlineMemo",
    label: "Offline Memo",
    kind: "derived",
    baseStatus: "offline",
    fallbackStatusId: "offline",
  },
);

console.log("Template Studio timetable runtime checks passed.");
