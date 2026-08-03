import assert from "node:assert/strict";

import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import {
  resolveStudioDateRangeText,
  STUDIO_WEEK_DATE_LONG_TEMPLATE,
} from "../src/utils/template-studio/date-template";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { validateStudioRuntimeValuesForDocument } from "../src/utils/template-studio/timetable-runtime";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import { ensureThumbnailWeekDatesContract } from "../src/utils/thumbnail-studio/week-dates";

assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-01-31",
    dayCount: 7,
  }),
  "2026.01.31 - 02.06",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2024-02-28",
    dayCount: 2,
  }),
  "2024.02.28 - 02.29",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2024-12-30",
    dayCount: 7,
  }),
  "2024.12.30 - 01.05",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-07-01",
    dayCount: 7,
    template: "${start.YYYY}/${start.MM}/${start.DD} → ${end.MM}/${end.DD}",
  }),
  "2026/07/01 → 07/07",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-07-01",
    dayCount: 1,
    format: "localized",
    locale: "ko-KR",
  }).includes("7월"),
  true,
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-07-01",
    dayCount: 7,
    template: STUDIO_WEEK_DATE_LONG_TEMPLATE,
  }),
  "2026.07.01 - 07.07",
);

const document = createThumbnailStudioDocument();
const inputId = ensureThumbnailWeekDatesContract(document);
const reusedInputId = ensureThumbnailWeekDatesContract(document);
assert.equal(reusedInputId, inputId);
assert.equal(document.domains?.thumbnail?.weekDates?.dayCount, 7);
assert.equal(document.inputs[inputId]?.presentation?.control, "date");

const makeWeekDatesNode = (id: string) => ({
  id,
  type: "text" as const,
  label: id,
  parentId: null,
  childIds: [],
  binding: {
    kind: "builtinField" as const,
    fieldId: "week.date_range" as const,
  },
  meta: { semantic: { type: "weekDates" } },
});

document.graph.nodes = {
  first: makeWeekDatesNode("first"),
  second: makeWeekDatesNode("second"),
};
document.graph.rootNodeIds = ["first", "second"];
const weekStartDateInput = document.inputs[inputId];
if (weekStartDateInput.type !== "text") {
  throw new Error("Week Start Date input must be text-backed.");
}
weekStartDateInput.defaultValue = "2024-02-28";

const runtimeValues = createStudioInitialRuntimeValues(document);
runtimeValues.global[inputId] = "2024-02-28";
assert.equal(
  resolveStudioTextBinding(
    document,
    runtimeValues,
    document.graph.nodes.first.binding,
  ),
  "2024.02.28 - 03.05",
);
assert.equal(
  resolveStudioTextBinding(
    document,
    runtimeValues,
    document.graph.nodes.second.binding,
  ),
  "2024.02.28 - 03.05",
);
assert.equal(
  validateStudioDocument(document).some(
    (diagnostic) => diagnostic.severity === "error",
  ),
  false,
);
assert.equal(
  validateStudioRuntimeValuesForDocument(document, runtimeValues).length,
  0,
);

runtimeValues.global[inputId] = "2024-02-30";
assert.equal(
  validateStudioRuntimeValuesForDocument(document, runtimeValues).some(
    (diagnostic) =>
      diagnostic.id === "runtime-thumbnail-week-dates-start-date-invalid",
  ),
  true,
);

document.domains!.thumbnail!.weekDates!.dayCount = 0;
assert.equal(
  validateStudioDocument(document).some(
    (diagnostic) => diagnostic.id === "thumbnail-week-dates-day-count-invalid",
  ),
  true,
);

console.log("check-thumbnail-studio-week-dates: ok");
