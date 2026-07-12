import assert from "node:assert/strict";

import { createSampleStudioDocument } from "../src/utils/template-studio/sample-document";
import {
  cloneStudioTimetableComponentSet,
  deleteStudioTimetableComponentSet,
  getStudioTimetableDayComponent,
  getStudioTimetableDayComponentId,
  getStudioTimetableComponentSetDeleteReason,
  resolveStudioTimetableDayComponent,
} from "../src/utils/template-studio/component-sets";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { validateStudioDocument } from "../src/utils/template-studio/validator";

const document = createSampleStudioDocument();
const timetable = document.domains?.timetable;
assert.ok(timetable);
const [mondayId, tuesdayId] = timetable.dayIds;
assert.ok(mondayId && tuesdayId);

assert.equal(timetable.version, 2);
assert.equal(
  getStudioTimetableDayComponentId(timetable, mondayId),
  timetable.entryComponentId,
);
assert.equal(
  getStudioTimetableDayComponent(document, mondayId)?.id,
  timetable.entryComponentId,
);
assert.equal(
  resolveStudioTimetableDayComponent(document, mondayId)?.source,
  "default",
);

const defaultComponent = timetable.components[timetable.entryComponentId];
assert.ok(defaultComponent);
const cloneResult = cloneStudioTimetableComponentSet(
  document,
  defaultComponent.id,
  "Alternate component set",
);
if (!cloneResult.ok) throw new Error(cloneResult.reason);
assert.equal(cloneResult.ok, true);
const alternateId = cloneResult.componentId;
timetable.days[tuesdayId].componentId = alternateId;

assert.equal(
  getStudioTimetableDayComponentId(timetable, tuesdayId),
  alternateId,
);
assert.equal(
  resolveStudioTimetableDayComponent(document, tuesdayId)?.source,
  "day",
);
assert.ok(
  !validateStudioDocument(document).some(
    (diagnostic) =>
      diagnostic.id === `timetable-component-unused:${alternateId}`,
  ),
);
assert.equal(
  new Set([
    ...Object.values(defaultComponent.variants).map(
      (variant) => variant.rootNodeId,
    ),
    ...Object.values(timetable.components[alternateId].variants).map(
      (variant) => variant.rootNodeId,
    ),
  ]).size,
  Object.keys(defaultComponent.variants).length * 2,
);
assert.match(
  getStudioTimetableComponentSetDeleteReason(document, alternateId) ?? "",
  /Tuesday/,
);
assert.equal(
  deleteStudioTimetableComponentSet(document, alternateId).ok,
  false,
);

timetable.days[tuesdayId].componentId = undefined;
assert.equal(
  getStudioTimetableComponentSetDeleteReason(document, alternateId),
  null,
);
assert.equal(deleteStudioTimetableComponentSet(document, alternateId).ok, true);
assert.equal(timetable.components[alternateId], undefined);

timetable.days[tuesdayId].componentId = "missing";
assert.equal(
  getStudioTimetableDayComponentId(timetable, tuesdayId),
  timetable.entryComponentId,
  "Broken explicit assignments must use the default as runtime safety.",
);
assert.ok(
  validateStudioDocument(document).some(
    (diagnostic) =>
      diagnostic.id ===
      `timetable-day-component-missing:${tuesdayId}:missing`,
  ),
);

const legacyDocument = createSampleStudioDocument();
(legacyDocument as unknown as { version: number }).version = 3;
(legacyDocument.domains!.timetable as unknown as { version: number }).version =
  1;
const migration = migrateStudioTemplateDocument(legacyDocument);
if (!migration.ok) throw new Error(migration.message);
assert.equal(migration.document.version, 4);
assert.equal(migration.document.domains?.timetable?.version, 2);
assert.ok(
  migration.warnings.includes("Migrated timetable domain to version 2."),
);

console.log("Template Studio component set checks passed.");
