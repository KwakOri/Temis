/**
 * 미리보기 값 편집 패널의 기준선 가드.
 *
 * 같은 입력이 요일마다 다른 값을 갖는다. 그래서 편집 칸은 어느 요일·일정의 값을
 * 고치는 중인지 문맥과 함께 만들어져야 한다. 문맥이 빠지면 요일을 바꿨는데 앞
 * 요일의 값이 칸에 남고, 사용자는 채운 값이 저장되지 않았다고 읽는다.
 *
 * 사진 입력은 주소를 붙이는 길과 파일을 올리는 길이 둘 다 있어야 한다. 올린
 * 파일은 자를 창을 지나야 한다. 템플릿이 정한 자리 비율과 다른 사진이 그대로
 * 들어가면 미리보기가 실제 결과와 달라진다.
 *
 * 마크업으로는 콜백 안에서 무엇을 하는지 볼 수 없다. 그래서 문맥으로 칸을
 * 구별하는 규칙과 자르기 창 크기를 정하는 규칙은 순수 함수로 빼서 값으로
 * 검증한다. 값을 넘기는 배선 자체는 이 검사가 덮지 못한다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getStudioRuntimeInputKey,
  StudioRuntimeInputField,
  StudioRuntimeInputGroups,
  StudioRuntimeInputPanel,
  type StudioRuntimeInputPanelProps,
} from "../src/app/(root)/template-studio/_components/studio-runtime-input-panel";
import {
  resolveStudioRuntimeCropSize,
  STUDIO_RUNTIME_FALLBACK_CROP_SIZE,
} from "../src/utils/template-studio/runtime-image-crop";
import type {
  StudioInputDefinition,
  StudioRuntimeValues,
  StudioTimetableDayDefinition,
  StudioTimetableRuntimeEntry,
} from "../src/types/template-studio";
const noop = () => {};
const createInput = (
  overrides: Partial<StudioInputDefinition> = {},
): StudioInputDefinition =>
  ({
    id: "input_text",
    label: "Title",
    type: "text",
    scope: "global",
    ...overrides,
  }) as StudioInputDefinition;
const runtimeValues = {
  global: { input_text: "global value" },
  days: { mon: { input_day: "monday value" } },
  entries: { mon: [{ input_entry: "entry value" }] },
} as unknown as StudioRuntimeValues;
const days = [
  { id: "mon", label: "Monday", order: 0 },
  { id: "tue", label: "Tuesday", order: 1 },
] as unknown as StudioTimetableDayDefinition[];
const entries = [
  { id: "mon-entry-100001", statusId: "online" },
  { id: "mon-entry-200002", statusId: "offline" },
] as unknown as StudioTimetableRuntimeEntry[];
const panelProps: StudioRuntimeInputPanelProps = {
  inputsByScope: {
    global: [createInput()],
    day: [createInput({ id: "input_day", label: "Day Note", scope: "day" })],
    entry: [
      createInput({ id: "input_entry", label: "Entry Note", scope: "entry" }),
    ],
  },
  runtimeValues,
  days,
  activeDayId: "mon",
  activeEntries: entries,
  activeEntryIndex: 0,
  activeEntry: entries[0],
  onChangeInput: noop,
  onRequestImageCrop: noop,
  onSelectDay: noop,
  onSelectEntryIndex: noop,
  onReset: noop,
};
// --- 칸을 구별하는 기준선 ---
//
// 같은 입력이 요일마다 다른 값을 갖는다. 칸의 식별자에 문맥이 빠지면 요일을
// 바꿔도 React가 같은 칸으로 보고 앞 요일의 값을 남긴다.
assert.equal(
  getStudioRuntimeInputKey(createInput(), {}),
  "input_text:global:none",
  "문맥이 없는 값은 전체 공통 칸이다.",
);
assert.notEqual(
  getStudioRuntimeInputKey(createInput(), { dayId: "mon" }),
  getStudioRuntimeInputKey(createInput(), { dayId: "tue" }),
  "요일이 다르면 다른 칸이다.",
);
assert.notEqual(
  getStudioRuntimeInputKey(createInput(), { dayId: "mon", entryIndex: 0 }),
  getStudioRuntimeInputKey(createInput(), { dayId: "mon", entryIndex: 1 }),
  "같은 요일이라도 일정이 다르면 다른 칸이다.",
);
assert.notEqual(
  getStudioRuntimeInputKey(createInput(), { dayId: "mon" }),
  getStudioRuntimeInputKey(createInput({ id: "input_other" }), {
    dayId: "mon",
  }),
  "입력이 다르면 다른 칸이다.",
);
// --- 자르기 창 크기 기준선 ---
assert.deepEqual(
  resolveStudioRuntimeCropSize({ width: 320, height: 180 }),
  { width: 320, height: 180 },
  "고른 객체의 크기로 자른다. 템플릿이 정한 자리와 비율이 다르면 미리보기가 실제 결과와 달라진다.",
);
assert.deepEqual(
  resolveStudioRuntimeCropSize(null),
  STUDIO_RUNTIME_FALLBACK_CROP_SIZE,
  "고른 것이 없을 때만 기본 크기로 연다.",
);
assert.deepEqual(
  STUDIO_RUNTIME_FALLBACK_CROP_SIZE,
  { width: 400, height: 400 },
  "기본 자르기 크기는 정사각이다.",
);
// --- 값이 붙는 자리 기준선 ---
//
// 범위마다 값을 읽는 곳이 다르다. 한 곳에서만 읽으면 요일 값을 채워도 칸이 빈다.
const markup = renderToStaticMarkup(
  <StudioRuntimeInputPanel {...panelProps} />,
);
assert.ok(
  markup.includes('value="global value"'),
  "전체 공통 값은 문맥 없이 읽는다.",
);
assert.ok(
  markup.includes('value="monday value"'),
  "요일 범위 값은 고른 요일에서 읽는다.",
);
assert.ok(
  markup.includes('value="entry value"'),
  "일정 범위 값은 고른 일정에서 읽는다.",
);
assert.deepEqual(
  [...markup.matchAll(/>(Global|Day|Entry)<\/h3>/g)].map((match) => match[1]),
  ["Global", "Day", "Entry"],
  "범위 제목은 전체·요일·일정 순으로 한 번씩만 나온다.",
);
// --- 문맥 선택 기준선 ---
assert.equal(
  (markup.match(/>Day Context</g) ?? []).length,
  1,
  "요일 범위 입력이 있으면 어느 요일을 보는지 고를 수 있어야 한다.",
);
assert.ok(
  markup.includes(">Entry 1 · 100001</option>"),
  "일정은 번호와 id 끝자리로 구별한다. 같은 요일에 비슷한 일정이 여러 개 있을 수 있다.",
);
assert.ok(
  markup.includes('value="mon" selected'),
  "지금 보는 요일이 고른 상태로 보여야 한다.",
);
// 요일이 없는 문서에서는 문맥 칸을 감춘다. 고를 것이 없는 선택 칸은 채워야 할
// 것이 남았다는 오해만 준다.
assert.equal(
  renderToStaticMarkup(
    <StudioRuntimeInputPanel {...panelProps} days={[]} />,
  ).includes(">Day Context<"),
  false,
  "요일이 없으면 요일 문맥 칸을 감춘다.",
);
assert.equal(
  renderToStaticMarkup(
    <StudioRuntimeInputPanel
      {...panelProps}
      inputsByScope={{ ...panelProps.inputsByScope, day: [], entry: [] }}
    />,
  ).includes(">Day Context<"),
  false,
  "요일·일정 범위 입력이 없으면 문맥을 고를 이유가 없다.",
);
assert.equal(
  renderToStaticMarkup(
    <StudioRuntimeInputPanel
      {...panelProps}
      inputsByScope={{ ...panelProps.inputsByScope, entry: [] }}
    />,
  ).includes(">Entry Context<"),
  false,
  "일정 범위 입력이 없으면 일정을 고를 이유가 없다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioRuntimeInputPanel {...panelProps} activeEntries={[]} />,
  ).includes(">No entries<"),
  "일정이 없으면 없다고 알린다.",
);
// --- 문맥이 없을 때 기준선 ---
//
// 볼 요일이 정해지지 않았으면 요일·일정 칸을 그리지 않는다. 어느 요일 값을
// 고치는지 알 수 없는 칸을 보여 주면 엉뚱한 요일에 값이 들어간다.
const noDayMarkup = renderToStaticMarkup(
  <StudioRuntimeInputGroups
    activeDayId={null}
    activeEntry={null}
    activeEntryIndex={0}
    inputsByScope={panelProps.inputsByScope}
    runtimeValues={runtimeValues}
    onChangeInput={noop}
    onRequestImageCrop={noop}
  />,
);
assert.ok(noDayMarkup.includes(">Global</h3>"), "전체 공통 값은 늘 보여 준다.");
assert.equal(
  noDayMarkup.includes(">Day</h3>"),
  false,
  "볼 요일이 없으면 요일 범위 칸을 그리지 않는다.",
);
assert.equal(
  renderToStaticMarkup(
    <StudioRuntimeInputGroups
      activeDayId="mon"
      activeEntry={null}
      activeEntryIndex={0}
      inputsByScope={panelProps.inputsByScope}
      runtimeValues={runtimeValues}
      onChangeInput={noop}
      onRequestImageCrop={noop}
    />,
  ).includes(">Entry</h3>"),
  false,
  "고른 일정이 없으면 일정 범위 칸을 그리지 않는다.",
);
assert.equal(
  renderToStaticMarkup(
    <StudioRuntimeInputGroups
      activeDayId="mon"
      activeEntry={entries[0]}
      activeEntryIndex={0}
      inputsByScope={{ global: [], day: [], entry: [] }}
      runtimeValues={runtimeValues}
      onChangeInput={noop}
      onRequestImageCrop={noop}
    />,
  ),
  "",
  "채울 입력이 없으면 제목도 남기지 않는다.",
);
// --- 입력 종류별 칸 기준선 ---
const renderField = (input: StudioInputDefinition, context = {}) =>
  renderToStaticMarkup(
    <StudioRuntimeInputField
      context={context}
      input={input}
      runtimeValues={runtimeValues}
      onChange={noop}
      onRequestImageCrop={noop}
    />,
  );
assert.ok(
  renderField(createInput()).includes("<input"),
  "한 줄 글자는 한 줄 칸으로 받는다.",
);
assert.ok(
  renderField(createInput({ multiline: true })).includes("<textarea"),
  "여러 줄 글자는 여러 줄 칸으로 받는다.",
);
assert.ok(
  renderField(createInput({ multiline: true, minRows: 7 })).includes(
    'rows="7"',
  ),
  "여러 줄 칸의 높이는 입력이 정한 값을 쓴다.",
);
assert.ok(
  renderField(createInput({ multiline: true })).includes('rows="4"'),
  "높이를 정하지 않은 여러 줄 칸에도 기본 높이가 있다.",
);
const imageMarkup = renderField(
  createInput({ id: "input_image", label: "Photo", type: "image" }),
);
assert.ok(
  imageMarkup.includes("<input") && imageMarkup.includes(">Upload"),
  "사진은 주소를 붙이는 길과 파일을 올리는 길이 둘 다 있어야 한다.",
);
assert.ok(
  imageMarkup.includes('accept="image/*"'),
  "파일 고르기는 사진만 받는다.",
);
assert.ok(
  imageMarkup.includes("cursor-pointer"),
  "올리기 자리는 누를 수 있게 보여야 한다. 파일 고르기 칸 자체는 숨겨 두므로 이 라벨이 유일한 입구다.",
);
assert.ok(
  imageMarkup.includes("lucide-upload"),
  "올리기 자리는 아이콘으로 알아본다.",
);
const selectMarkup = renderField(
  createInput({
    id: "input_select",
    label: "Status",
    type: "select",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  } as Partial<StudioInputDefinition>),
);
assert.equal(
  (selectMarkup.match(/<option/g) ?? []).length,
  2,
  "고르는 입력은 정해 둔 값만 보여 준다.",
);
console.log("Studio runtime input panel baseline checks passed.");
