import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TemplateStudioRuntimeForm } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form";
import { TemplateStudioRuntimeShell } from "../src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell";
import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { resolveStudioBuiltinFieldValue } from "../src/utils/template-studio/builtin-fields";
import { createStudioInitialRuntimeValues } from "../src/utils/template-studio/input-values";
import {
  getStudioRuntimeGlobalInputGroups,
  getStudioRuntimeOnOffOptionValues,
} from "../src/utils/template-studio/runtime-global-input-groups";
import {
  formatStudioRuntimeWeekRange,
  getStudioRuntimeCopy,
  normalizeStudioRuntimeLocale,
  type StudioRuntimeLocale,
} from "../src/utils/template-studio/runtime-i18n";
import {
  getStudioRuntimeWeekEndDate,
  getStudioRuntimeWeekStartDate,
  shiftStudioRuntimeWeek,
} from "../src/utils/template-studio/runtime-week";
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
  locale: StudioRuntimeLocale = "en",
) =>
  renderToStaticMarkup(
    <TemplateStudioRuntimeForm
      document={targetDocument}
      locale={locale}
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
assert.match(singleEntryMarkup, /aria-label="Previous week"/);
assert.match(singleEntryMarkup, /aria-label="Next week"/);
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
assert.match(offlineMemoMarkup, /aria-label="Mon Memo"/);
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
assert.equal(countOccurrences(dynamicMarkup, ">Dynamic Global Check</h3>"), 1);
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

const koreanMarkup = renderForm(document, initialValues, "ko");
assert.match(koreanMarkup, />공통 설정</);
assert.match(koreanMarkup, />주간 시간표</);
assert.match(koreanMarkup, /aria-label="이전 주"/);
assert.match(koreanMarkup, /aria-label="월요일 온라인"/);
assert.match(koreanMarkup, />월</);

const japaneseMarkup = renderForm(document, initialValues, "ja");
assert.match(japaneseMarkup, />共通設定</);
assert.match(japaneseMarkup, />週間時間割</);
assert.match(japaneseMarkup, /aria-label="次の週"/);
assert.match(japaneseMarkup, /aria-label="月曜日 オンライン"/);
assert.match(japaneseMarkup, />月</);

assert.equal(normalizeStudioRuntimeLocale("ko-KR"), "ko");
assert.equal(normalizeStudioRuntimeLocale("ja-JP"), "ja");
assert.equal(normalizeStudioRuntimeLocale("fr-FR"), "en");
assert.equal(getStudioRuntimeCopy("ko").reset, "초기화");
assert.match(
  formatStudioRuntimeWeekRange({
    locale: "en",
    startDate: "2026-07-01",
    endDate: "2026-07-07",
    fallback: "Not set",
  }),
  /Jul 1, 2026.*Jul 7/,
);

const nextWeekValues = shiftStudioRuntimeWeek(document, initialValues, 1);
assert.equal(
  getStudioRuntimeWeekStartDate(document, nextWeekValues),
  "2026-07-08",
);
assert.equal(
  getStudioRuntimeWeekEndDate(document, nextWeekValues),
  "2026-07-14",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, nextWeekValues, "day.date", {
    dayId,
  }),
  "07.08",
);
assert.equal(
  resolveStudioBuiltinFieldValue(document, nextWeekValues, "week.date_range"),
  "2026.07.08 - 07.14",
);

const groupedDocument = structuredClone(document);
groupedDocument.inputs.artist_status = {
  id: "artist_status",
  type: "select",
  scope: "global",
  label: "Artist Status",
  defaultValue: "on",
  options: [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ],
};
groupedDocument.inputs.artist_text = {
  id: "artist_text",
  type: "text",
  scope: "global",
  label: "Artist / Profile Text",
};
groupedDocument.inputs.weekly_memo = {
  id: "weekly_memo",
  type: "text",
  scope: "global",
  label: "Weekly Memo",
  multiline: true,
};
groupedDocument.inputs.weekly_memo_status = {
  id: "weekly_memo_status",
  type: "select",
  scope: "global",
  label: "Weekly Memo Status",
  defaultValue: "on",
  options: [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ],
};
groupedDocument.inputs.profile_image = {
  id: "profile_image",
  type: "image",
  scope: "global",
  label: "Profile Image",
};
const groupedComposition = groupedDocument.domains?.timetable?.composition;
assert.ok(groupedComposition);
groupedComposition.rootObjectIds.push("artist-group");
groupedComposition.objects["artist-group"] = {
  id: "artist-group",
  kind: "group",
  label: "Artist",
  style: {},
  variantSet: {
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
    defaultValue: "on",
    inputId: "artist_status",
    rootByValue: { on: "artist-on", off: null },
  },
};
groupedComposition.objects["artist-on"] = {
  id: "artist-on",
  kind: "group",
  label: "Artist On",
  childIds: ["artist-text-object"],
  style: {},
};
groupedComposition.objects["artist-text-object"] = {
  id: "artist-text-object",
  kind: "text",
  label: "Artist Text",
  binding: { kind: "inputText", inputId: "artist_text" },
  style: {},
};

const globalGroups = getStudioRuntimeGlobalInputGroups(groupedDocument);
assert.equal(globalGroups[0]?.label, "Profile Image");
const artistGroup = globalGroups.find((group) => group.label === "Artist");
assert.ok(artistGroup);
assert.equal(artistGroup.toggleInput?.id, "artist_status");
assert.deepEqual(
  artistGroup.contentInputs.map((input) => input.id),
  ["artist_text"],
);
const weeklyMemoGroup = globalGroups.find(
  (group) => group.label === "Weekly Memo",
);
assert.ok(weeklyMemoGroup);
assert.equal(weeklyMemoGroup.toggleInput?.id, "weekly_memo_status");
assert.deepEqual(
  weeklyMemoGroup.contentInputs.map((input) => input.id),
  ["weekly_memo"],
);
assert.ok(
  globalGroups.some(
    (group) =>
      group.label === "Profile Image" &&
      group.contentInputs[0]?.id === "profile_image",
  ),
);
assert.deepEqual(
  getStudioRuntimeOnOffOptionValues(groupedDocument.inputs.artist_status),
  { onValue: "on", offValue: "off" },
);

const groupedMarkup = renderForm(
  groupedDocument,
  createStudioInitialRuntimeValues(groupedDocument),
);
assert.equal(countOccurrences(groupedMarkup, ">Artist</h3>"), 1);
assert.equal(countOccurrences(groupedMarkup, ">Weekly Memo</h3>"), 1);
assert.equal(countOccurrences(groupedMarkup, ">Profile Image</h3>"), 1);
assert.match(groupedMarkup, />Upload new image</);
assert.doesNotMatch(groupedMarkup, /Paste profile image URL/);

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
assert.match(shellMarkup, /aria-label="Language"/);
assert.match(shellMarkup, /aria-label="Zoom out"/);
assert.match(shellMarkup, /aria-label="Zoom in"/);
assert.match(shellMarkup, /aria-label="Fit preview"/);
assert.doesNotMatch(shellMarkup, /blue-[0-9]/);

console.log("Template Studio runtime V2 UI checks passed.");
