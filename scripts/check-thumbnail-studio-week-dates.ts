import assert from "node:assert/strict";

import { resolveStudioTextBinding } from "../src/utils/template-studio/binding-resolver";
import {
  getStudioDateFormatMode,
  resolveStudioDateRangeText,
  resolveStudioSingleDateText,
  STUDIO_WEEK_DATE_LONG_TEMPLATE,
} from "../src/utils/template-studio/date-template";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import { migrateStudioTemplateDocument } from "../src/utils/template-studio/migrations";
import { validateStudioRuntimeValuesForDocument } from "../src/utils/template-studio/timetable-runtime";
import { validateStudioDocument } from "../src/utils/template-studio/validator";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";
import {
  ensureThumbnailWeekDatesContract,
  getThumbnailLocalIsoDate,
  withThumbnailCurrentDate,
} from "../src/utils/thumbnail-studio/week-dates";

assert.equal(getStudioDateFormatMode("week.date_range"), "range");
assert.equal(getStudioDateFormatMode("day.date"), "single");
assert.equal(getStudioDateFormatMode("week.start_date"), "single");
assert.equal(getStudioDateFormatMode("week.end_date"), "single");
assert.equal(getStudioDateFormatMode("day.label"), null);
assert.equal(getStudioDateFormatMode("entry.time"), null);

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
    startDate: "2026-04-27",
    dayCount: 7,
    template:
      "${start.monthName} ${start.D} - ${end.monthShort} ${end.D}, ${end.YYYY}",
  }),
  "April 27 - May 3, 2026",
);
assert.equal(
  resolveStudioSingleDateText({
    date: "2026-12-05",
    format: "custom",
    template: "${monthShort}. ${DD} / ${monthName}",
  }),
  "Dec. 05 / December",
);
assert.equal(
  resolveStudioDateRangeText({
    startDate: "2026-04-27",
    dayCount: 7,
    template:
      "${start.monthNameUpper} ${start.D} - ${end.monthShortUpper} ${end.D}",
  }),
  "APRIL 27 - MAY 3",
);
assert.equal(
  resolveStudioSingleDateText({
    date: "2026-09-01",
    format: "custom",
    template: "${monthShortUpper} ${DD} ${monthNameUpper}",
  }),
  "SEP 01 SEPTEMBER",
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
assert.equal(document.domains?.thumbnail?.weekDates?.dateInputId, inputId);
assert.equal(
  "dayCount" in (document.domains?.thumbnail?.weekDates ?? {}),
  false,
);
assert.equal(document.inputs[inputId]?.presentation?.control, "date");

const makeWeekDatesNode = (id: string) => ({
  id,
  type: "text" as const,
  label: id,
  parentId: null,
  childIds: [],
  binding: {
    kind: "builtinField" as const,
    fieldId: "week.start_date" as const,
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
  "2024.02.28",
);
assert.equal(
  resolveStudioTextBinding(
    document,
    runtimeValues,
    document.graph.nodes.second.binding,
  ),
  "2024.02.28",
);
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, {
    kind: "builtinField",
    fieldId: "week.date_range",
    dateRangeFormat: "long",
  }),
  "2024.02.28 - 03.05",
);
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, {
    kind: "builtinField",
    fieldId: "week.date_range",
    dateRangeFormat: "custom",
    dateRangeTemplate:
      "${start.YYYY}/${start.MM}/${start.DD} → ${end.MM}/${end.DD}",
  }),
  "2024/02/28 → 03/05",
);
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, {
    kind: "builtinField",
    fieldId: "week.start_date",
    dateRangeFormat: "long",
  }),
  "2024.02.28",
);
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, {
    kind: "builtinField",
    fieldId: "week.date_range",
  }),
  "2024.02.28 - 03.05",
);
assert.equal(
  validateStudioDocument({
    ...document,
    graph: {
      ...document.graph,
      nodes: {
        ...document.graph.nodes,
        range: {
          ...makeWeekDatesNode("range"),
          meta: undefined,
          binding: {
            kind: "builtinField",
            fieldId: "week.date_range",
            dateRangeFormat: "long",
            dateRangeTemplate: STUDIO_WEEK_DATE_LONG_TEMPLATE,
          },
        },
      },
    },
  }).some((diagnostic) => diagnostic.severity === "error"),
  false,
);
assert.equal(
  validateStudioDocument({
    ...document,
    graph: {
      ...document.graph,
      nodes: {
        ...document.graph.nodes,
        invalidStart: {
          ...makeWeekDatesNode("invalidStart"),
          binding: {
            kind: "builtinField",
            fieldId: "week.start_date",
            dateRangeFormat: "split",
          },
        },
      },
    },
  }).some(
    (diagnostic) =>
      diagnostic.id === "binding-date-range-format-invalid:invalidStart",
  ),
  true,
);
assert.equal(
  validateStudioDocument(document).some(
    (diagnostic) => diagnostic.severity === "error",
  ),
  false,
);
assert.equal(
  resolveStudioTextBinding(document, runtimeValues, {
    kind: "builtinField",
    fieldId: "week.date_range",
  }),
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

// 런타임은 문서에 저장된 날짜 기본값 대신 에디터를 연 날짜로 시작한다.
assert.equal(
  getThumbnailLocalIsoDate(new Date(2026, 0, 5, 23, 59)),
  "2026-01-05",
);
const storedDefaultValues = createStudioInitialRuntimeValues(document);
assert.equal(storedDefaultValues.global[inputId], "2024-02-28");
const todayValues = withThumbnailCurrentDate(
  document,
  storedDefaultValues,
  new Date(2026, 10, 17, 9, 30),
);
assert.equal(todayValues.global[inputId], "2026-11-17");
assert.equal(storedDefaultValues.global[inputId], "2024-02-28");
assert.equal(
  resolveStudioTextBinding(
    document,
    todayValues,
    document.graph.nodes.first.binding,
  ),
  "2026.11.17",
);
const documentWithoutDates = createThumbnailStudioDocument();
const valuesWithoutDates =
  createStudioInitialRuntimeValues(documentWithoutDates);
assert.equal(
  withThumbnailCurrentDate(documentWithoutDates, valuesWithoutDates),
  valuesWithoutDates,
);

const legacyDocument = createThumbnailStudioDocument();
const legacyInputId = ensureThumbnailWeekDatesContract(legacyDocument);
const legacyWeekDates = legacyDocument.domains!.thumbnail!
  .weekDates as unknown as Record<string, unknown>;
legacyWeekDates.startDateInputId = legacyWeekDates.dateInputId;
legacyWeekDates.dayCount = 7;
delete legacyWeekDates.dateInputId;
legacyDocument.graph.nodes.legacy = makeWeekDatesNode("legacy");
legacyDocument.graph.nodes.legacy.binding = {
  kind: "builtinField",
  fieldId: "week.date_range",
  dateRangeFormat: "long",
  dateRangeTemplate: STUDIO_WEEK_DATE_LONG_TEMPLATE,
};
legacyDocument.graph.nodes.legacyCustom = makeWeekDatesNode("legacyCustom");
legacyDocument.graph.nodes.legacyCustom.binding = {
  kind: "builtinField",
  fieldId: "week.date_range",
  dateRangeFormat: "custom",
  dateRangeTemplate: "${YYYY}년 ${M}월 ${D}일 ${weekdayShort}",
};

const migrated = migrateStudioTemplateDocument(legacyDocument);
assert.equal(migrated.ok, true);
if (!migrated.ok) throw new Error("Legacy Week Dates migration failed.");
assert.equal(
  migrated.document.domains?.thumbnail?.weekDates?.dateInputId,
  legacyInputId,
);
assert.deepEqual(migrated.document.graph.nodes.legacy.binding, {
  kind: "builtinField",
  fieldId: "week.start_date",
  dateRangeFormat: "long",
  dateRangeTemplate: "${YYYY}.${MM}.${DD}",
});
assert.deepEqual(migrated.document.graph.nodes.legacyCustom.binding, {
  kind: "builtinField",
  fieldId: "week.start_date",
  dateRangeFormat: "custom",
  dateRangeTemplate: "${YYYY}년 ${M}월 ${D}일 ${weekdayShort}",
});

runtimeValues.global[inputId] = "2024-02-30";
assert.equal(
  validateStudioRuntimeValuesForDocument(document, runtimeValues).some(
    (diagnostic) =>
      diagnostic.id === "runtime-thumbnail-week-dates-date-invalid",
  ),
  true,
);

console.log("check-thumbnail-studio-week-dates: ok");
