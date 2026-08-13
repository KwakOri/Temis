/**
 * 요일·일정 편집 패널의 기준선 가드.
 *
 * 일정이 둘 이상인 요일에서는 상태를 바꿀 수 없다. 상태는 요일 카드 한 장의 모습을
 * 정하는 값이라, 일정이 여러 개인 요일에서는 어느 일정의 상태인지 정할 수 없다.
 * 여기서 바꿀 수 있게 보이면 눌러도 아무 일이 없거나 엉뚱한 일정이 바뀐다.
 *
 * 일정을 더 넣을 수 없을 때는 이유를 그 자리에 알려준다. 흐리게만 두면 왜 눌리지
 * 않는지 알 수 없다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  StudioTimetableDayPanel,
  type StudioTimetableDayPanelProps,
} from "../src/app/(root)/template-studio/_components/studio-timetable-day-panel";
import type {
  StudioRuntimeValues,
  StudioTimetableDayDefinition,
  StudioTimetableRuntimeEntry,
  StudioTimetableStatusDefinition,
} from "../src/types/template-studio";
const noop = () => {};
const days = [
  { id: "mon", label: "Monday", shortLabel: "Mon", order: 0 },
  { id: "tue", label: "Tuesday", order: 1 },
  // 짧은 이름이 앞 세 글자와 다른 요일. 앞 세 글자로만 자르면 이 값이 사라진다.
  { id: "wed", label: "Wednesday", shortLabel: "We", order: 2 },
] as unknown as StudioTimetableDayDefinition[];
const entries = [
  { id: "mon-entry-1", statusId: "online" },
  { id: "mon-entry-2", statusId: "offline" },
] as unknown as StudioTimetableRuntimeEntry[];
const statusOptions = [
  { id: "online", label: "Online", kind: "base" },
  { id: "offline", label: "Offline", kind: "base" },
] as unknown as StudioTimetableStatusDefinition[];
const panelProps: StudioTimetableDayPanelProps = {
  hasTimetable: true,
  days,
  activeDayId: "mon",
  activeDay: days[0],
  entries: [entries[0]],
  activeEntryIndex: 0,
  activeEntry: entries[0],
  maxEntries: 3,
  addEntryDisabledReason: null,
  statusOptions,
  inputsByScope: { global: [], day: [], entry: [] },
  runtimeValues: {} as StudioRuntimeValues,
  onSelectDay: noop,
  onSelectEntryIndex: noop,
  onAddEntry: noop,
  onRemoveEntry: noop,
  onUpdateEntryStatus: noop,
  onChangeInput: noop,
  onRequestImageCrop: noop,
};
const markupOf = (overrides: Partial<StudioTimetableDayPanelProps> = {}) =>
  renderToStaticMarkup(
    <StudioTimetableDayPanel {...panelProps} {...overrides} />,
  );
// --- 시간표가 없는 문서 ---
assert.ok(
  markupOf({ hasTimetable: false }).includes("No timetable domain"),
  "시간표가 없는 문서에서는 채울 것이 없다고 알린다.",
);
// --- 요일 고르기 ---
const markup = markupOf();
assert.ok(
  markup.includes(">3 days · 1/3 entries<"),
  "요일 수와 일정 수를 센다.",
);
assert.deepEqual(
  [...markup.matchAll(/>(Mon|Tue|Wed|We)<\/button>/g)].map((match) => match[1]),
  ["Mon", "Tue", "We"],
  "짧은 이름이 있으면 그것을 쓰고, 없으면 앞 세 글자를 쓴다.",
);
assert.equal(
  (markup.match(/border-\[var\(--accent\)\] bg-\[var\(--sel\)\]/g) ?? [])
    .length,
  2,
  "지금 보는 요일과 고른 일정이 눌린 모습이어야 한다.",
);
assert.ok(
  markup.includes(">Monday Entries<"),
  "어느 요일의 일정을 보는 중인지 적는다.",
);
assert.ok(
  markupOf({ activeDay: null }).includes(">Day Entries<"),
  "요일을 아직 고르지 않았어도 제목 자리는 남는다.",
);
// --- 일정 늘리기 ---
assert.ok(
  markup.includes('title="Add entry"'),
  "넣을 수 있으면 넣는 동작임을 알려준다.",
);
const blockedMarkup = markupOf({
  addEntryDisabledReason: "Day is full",
});
assert.ok(
  blockedMarkup.includes('title="Day is full"'),
  "넣을 수 없는 이유를 그 자리에 알려준다.",
);
assert.ok(
  blockedMarkup.includes('disabled=""'),
  "넣을 수 없으면 누를 수 없어야 한다.",
);
// --- 빈 요일 ---
assert.ok(
  markupOf({ entries: [], activeEntry: null }).includes("Empty day"),
  "일정이 없는 요일은 비었다고 알린다.",
);
assert.equal(
  markupOf({ entries: [], activeEntry: null }).includes("Remove entry"),
  false,
  "지울 일정이 없으면 지우기도 없다.",
);
// --- 일정이 여러 개일 때 상태 ---
const singleEntryMarkup = markupOf({ entries: [entries[0]] });
const multiEntryMarkup = markupOf({ entries });
assert.equal(
  (singleEntryMarkup.match(/<select[^>]*disabled=""/g) ?? []).length,
  0,
  "일정이 하나면 그 일정의 상태를 바꿀 수 있다.",
);
assert.equal(
  (multiEntryMarkup.match(/<select[^>]*disabled=""/g) ?? []).length,
  2,
  "일정이 여러 개면 어느 일정의 상태인지 정할 수 없으므로 모두 바꿀 수 없다.",
);
assert.equal(
  (multiEntryMarkup.match(/Remove entry/g) ?? []).length,
  2,
  "일정이 여러 개면 각각 지울 수 있다.",
);
assert.ok(
  multiEntryMarkup.includes('value="offline" selected=""'),
  "일정마다 저장해 둔 상태를 보여준다.",
);
assert.deepEqual(
  [...multiEntryMarkup.matchAll(/>([12])<\/span>/g)].map((match) => match[1]),
  ["1", "2"],
  "일정은 1부터 센 번호로 구별한다.",
);
console.log("Studio timetable day panel baseline checks passed.");
