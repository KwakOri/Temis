/**
 * 공용 인스펙터 폼 필드의 기준선 가드.
 *
 * 숫자 입력은 편집 중 값을 곧바로 넘기지 않고, 굵기 선택은 폰트가 가진 굵기만
 * 후보로 둔다. 이 두 규칙이 깨지면 값이 조용히 튀거나 화면과 문서가 어긋난다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getStudioNumberFieldDisplayValue,
  parseStudioNumberFieldValue,
  StudioFitParentButton,
  StudioFontWeightField,
  StudioLineBreakField,
  StudioNumberField,
  StudioTextAlignmentField,
  StudioTextareaField,
  StudioTextField,
} from "../src/components/studio/inspector/studio-inspector-fields";
import type { StudioFontWeightOption } from "../src/utils/template-studio/web-fonts";

const noop = () => {};

// --- 숫자 입력 ---

const numberMarkup = renderToStaticMarkup(
  <StudioNumberField label="X" value={12.5} onChange={noop} />,
);

assert.ok(numberMarkup.includes("<span>X</span>"), "이름을 보여준다.");
assert.ok(
  numberMarkup.includes('value="12.5"'),
  "소수점 값을 그대로 보여준다.",
);
assert.ok(
  numberMarkup.includes('inputMode="decimal"'),
  "숫자 자판을 쓰도록 알려준다.",
);
assert.ok(
  numberMarkup.includes('type="text"'),
  "type=number는 화살표 조작과 소수 입력이 브라우저마다 달라서 쓰지 않는다.",
);

assert.ok(
  renderToStaticMarkup(
    <StudioNumberField label="X" value={Number.NaN} onChange={noop} />,
  ).includes('value="0"'),
  "값이 숫자가 아니면 0으로 보여준다.",
);

assert.ok(
  renderToStaticMarkup(
    <StudioNumberField disabled label="X" value={1} onChange={noop} />,
  ).includes("disabled"),
  "잠긴 필드는 입력을 막는다.",
);

// --- 숫자 읽기 규칙 ---
//
// 편집 중에는 값을 넘기지 않고, 초점을 잃을 때 이 규칙으로 한 번만 읽는다.

assert.equal(parseStudioNumberFieldValue("12.5"), 12.5);
assert.equal(
  parseStudioNumberFieldValue("1,200"),
  1200,
  "천 단위 쉼표를 값으로 읽는다.",
);
assert.equal(parseStudioNumberFieldValue("  7  "), 7, "앞뒤 공백은 무시한다.");
assert.equal(parseStudioNumberFieldValue(""), 0, "빈 값은 0으로 본다.");
assert.equal(
  parseStudioNumberFieldValue("abc"),
  null,
  "숫자가 아니면 값을 바꾸지 않는다.",
);
assert.equal(
  parseStudioNumberFieldValue("12."),
  12,
  "아직 소수점만 적은 입력도 숫자로 읽는다.",
);
assert.equal(
  parseStudioNumberFieldValue("Infinity"),
  null,
  "끝없는 값은 좌표로 쓸 수 없다.",
);
assert.equal(parseStudioNumberFieldValue("-3.25"), -3.25, "음수도 읽는다.");

assert.equal(getStudioNumberFieldDisplayValue(12.5), "12.5");
assert.equal(
  getStudioNumberFieldDisplayValue(Number.NaN),
  "0",
  "값이 숫자가 아니면 0으로 보여준다.",
);

// --- 부모 채우기 토글 ---

const fitOnMarkup = renderToStaticMarkup(
  <StudioFitParentButton active onClick={noop} />,
);
const fitOffMarkup = renderToStaticMarkup(
  <StudioFitParentButton active={false} onClick={noop} />,
);

assert.ok(
  fitOnMarkup.includes('aria-pressed="true"'),
  "켜진 상태를 보조 기술에 알린다.",
);
assert.ok(
  fitOnMarkup.includes('title="Use fixed size"'),
  "켜져 있으면 되돌리는 설명을 보여준다.",
);
assert.ok(
  fitOffMarkup.includes('title="Fill parent"'),
  "꺼져 있으면 채우는 설명을 보여준다.",
);

// 섹션 제목 줄에 놓이므로 클릭이 섹션 접기로 번지면 안 된다.
let fitClicked = 0;
let propagationStopped = 0;
const fitElement = StudioFitParentButton({
  active: false,
  onClick: () => {
    fitClicked += 1;
  },
}) as React.ReactElement<{ onClick: (event: unknown) => void }>;

fitElement.props.onClick({
  stopPropagation: () => {
    propagationStopped += 1;
  },
});
assert.equal(fitClicked, 1, "누르면 토글이 불린다.");
assert.equal(propagationStopped, 1, "클릭이 섹션 접기로 번지지 않게 막는다.");

// --- 굵기 선택 ---

const weightOptions: StudioFontWeightOption[] = [
  { value: 400, label: "Regular" },
  { value: 700, label: "Bold" },
];

const weightMarkup = renderToStaticMarkup(
  <StudioFontWeightField options={weightOptions} value={700} onChange={noop} />,
);
assert.ok(
  weightMarkup.includes('value="700" selected=""'),
  "가진 굵기를 그대로 고른다.",
);
assert.equal(
  (weightMarkup.match(/<option/g) ?? []).length,
  2,
  "폰트가 가진 굵기만 후보로 둔다.",
);

assert.ok(
  renderToStaticMarkup(
    <StudioFontWeightField
      options={weightOptions}
      value={600}
      onChange={noop}
    />,
  ).includes('value="700" selected=""'),
  "가지지 않은 굵기는 가장 가까운 굵기로 보여준다.",
);

// 값이 후보에 없으면 초점을 받을 때 문서를 화면과 맞춘다.
const weightCalls: number[] = [];
const weightElement = StudioFontWeightField({
  options: weightOptions,
  value: 600,
  onChange: (value) => weightCalls.push(value),
}) as React.ReactElement<{ children: React.ReactNode[] }>;
const weightSelect = weightElement.props.children[1] as React.ReactElement<{
  onFocus: () => void;
}>;

weightSelect.props.onFocus();
assert.deepEqual(weightCalls, [700], "화면에 보이는 굵기로 문서를 맞춘다.");

const matchedWeightElement = StudioFontWeightField({
  options: weightOptions,
  value: 400,
  onChange: (value) => weightCalls.push(value),
}) as React.ReactElement<{ children: React.ReactNode[] }>;
(
  matchedWeightElement.props.children[1] as React.ReactElement<{
    onFocus: () => void;
  }>
).props.onFocus();
assert.deepEqual(
  weightCalls,
  [700],
  "이미 맞는 굵기면 문서를 건드리지 않는다.",
);

// --- 정렬 선택 ---

const alignMarkup = renderToStaticMarkup(
  <StudioTextAlignmentField value="center" onChange={noop} />,
);
assert.equal(
  (alignMarkup.match(/<button/g) ?? []).length,
  3,
  "왼쪽·가운데·오른쪽 세 후보를 둔다.",
);
assert.ok(
  alignMarkup.includes('aria-label="Align center" aria-pressed="true"'),
  "고른 정렬만 눌린 상태로 알린다.",
);
assert.equal(
  (alignMarkup.match(/aria-pressed="true"/g) ?? []).length,
  1,
  "한 번에 하나만 골라진다.",
);

// --- 줄바꿈 선택 ---

const lineBreakMarkup = renderToStaticMarkup(
  <StudioLineBreakField value="preserve" onChange={noop} />,
);
assert.ok(
  lineBreakMarkup.includes("<span>Line Breaks</span>"),
  "줄바꿈 선택 이름이 유지된다.",
);
assert.ok(
  (lineBreakMarkup.match(/<option/g) ?? []).length >= 2,
  "줄바꿈 후보가 여러 개다.",
);

// --- 글자 입력 ---

const textMarkup = renderToStaticMarkup(
  <StudioTextField
    label="Name"
    placeholder="Enter name"
    value="Temis"
    onChange={noop}
  />,
);
assert.ok(textMarkup.includes('value="Temis"'));
assert.ok(textMarkup.includes('placeholder="Enter name"'));

const textareaMarkup = renderToStaticMarkup(
  <StudioTextareaField label="Memo" rows={6} value="hello" onChange={noop} />,
);
assert.ok(textareaMarkup.includes('rows="6"'), "줄 수를 넘길 수 있다.");
assert.ok(
  renderToStaticMarkup(
    <StudioTextareaField label="Memo" value="hello" onChange={noop} />,
  ).includes('rows="4"'),
  "줄 수를 넘기지 않으면 기본값을 쓴다.",
);

console.log("Studio inspector field baseline checks passed.");
