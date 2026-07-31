/**
 * 요일 카드 배치 컨트롤의 기준선 가드.
 *
 * 프리셋을 고르면 자리 지도를 지우고, 사용자 지정일 때만 지도를 만든다. 3x3은
 * 빈 칸 두 개를 고르는 방식으로만 남는 칸을 정한다. 이 규칙이 깨지면 화면의
 * 격자와 문서의 자리 지도가 어긋난다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  createStudioDayCardSlots,
  StudioTimetableDayCardsLayoutControls,
  type StudioDayCardsLayoutDay,
} from "../src/app/(root)/template-studio/_components/studio-timetable-day-cards-layout-controls";
import type {
  StudioTimetableDayCardsLayout,
  StudioTimetableDayId,
} from "../src/types/template-studio";

const DAYS: StudioDayCardsLayoutDay[] = [
  { id: "mon", label: "Monday", shortLabel: "Mon" },
  { id: "tue", label: "Tuesday", shortLabel: "Tue" },
  { id: "wed", label: "Wednesday", shortLabel: "Wed" },
  { id: "thu", label: "Thursday", shortLabel: "Thu" },
  { id: "fri", label: "Friday", shortLabel: "Fri" },
  { id: "sat", label: "Saturday", shortLabel: "Sat" },
  { id: "sun", label: "Sunday", shortLabel: "Sun" },
] as StudioDayCardsLayoutDay[];

const createLayout = (
  overrides: Partial<StudioTimetableDayCardsLayout> = {},
): StudioTimetableDayCardsLayout =>
  ({
    gridPreset: "1x7",
    columns: 7,
    rows: 1,
    dayGap: 12,
    ...overrides,
  }) as StudioTimetableDayCardsLayout;

const markupOf = (layout: StudioTimetableDayCardsLayout): string =>
  renderToStaticMarkup(
    <StudioTimetableDayCardsLayoutControls
      days={DAYS}
      layout={layout}
      onUpdateLayout={() => {}}
    />,
  );

// --- 자리 지도 만들기 ---

assert.deepEqual(
  createStudioDayCardSlots(["mon", "tue"] as StudioTimetableDayId[], 4),
  ["mon", "tue", null, null],
  "요일을 앞에서부터 채우고 남는 칸은 비운다.",
);
assert.deepEqual(
  createStudioDayCardSlots(["mon", "tue", "wed"] as StudioTimetableDayId[], 2),
  ["mon", "tue"],
  "칸이 요일보다 적으면 칸 수만큼만 만든다.",
);

// --- 프리셋에 따라 보이는 컨트롤 ---

const defaultMarkup = markupOf(createLayout());
assert.ok(defaultMarkup.includes("<span>Grid Preset</span>"));
assert.ok(defaultMarkup.includes("<span>Fill Order</span>"));
assert.ok(defaultMarkup.includes("<span>Remainder</span>"));
assert.ok(
  defaultMarkup.includes("Reset card offsets"),
  "카드 위치 되돌리기는 어떤 프리셋에서도 보인다.",
);
assert.ok(
  !defaultMarkup.includes("Slot Map"),
  "프리셋에서는 자리 지도를 보여주지 않는다.",
);
assert.ok(
  !defaultMarkup.includes("Empty Cells"),
  "3x3이 아니면 빈 칸 선택이 없다.",
);

const customMarkup = markupOf(
  createLayout({ gridPreset: "custom", columns: 3, rows: 3 }),
);
assert.ok(
  customMarkup.includes("Slot Map"),
  "사용자 지정에서는 자리 지도를 보여준다.",
);
assert.ok(
  customMarkup.includes("<span>Columns</span>") &&
    customMarkup.includes("<span>Rows</span>"),
  "사용자 지정에서는 칸 수를 직접 정한다.",
);
assert.equal(
  (customMarkup.match(/>Empty<\/option>/g) ?? []).length,
  9,
  "자리 지도는 칸 수만큼 선택을 만든다.",
);

const threeByThreeMarkup = markupOf(
  createLayout({ gridPreset: "3x3", columns: 3, rows: 3 }),
);
assert.ok(
  threeByThreeMarkup.includes("Empty Cells"),
  "3x3에서는 빈 칸을 고른다.",
);
assert.ok(
  threeByThreeMarkup.includes('title="Controlled by the empty cell selector"'),
  "3x3에서는 남는 칸 정렬을 빈 칸 선택이 대신한다는 것을 알려준다.",
);
assert.ok(
  threeByThreeMarkup.includes('disabled=""'),
  "3x3에서는 남는 칸 정렬을 직접 바꾸지 못하게 막는다.",
);
assert.ok(
  !defaultMarkup.includes('disabled=""'),
  "다른 프리셋에서는 남는 칸 정렬을 바꿀 수 있다.",
);
assert.equal(
  (threeByThreeMarkup.match(/aria-pressed="true"/g) ?? []).length,
  2,
  "요일 일곱 개를 3x3에 놓으면 빈 칸은 두 개다.",
);

// --- 프리셋을 고를 때 자리 지도 처리 ---

const gridPresetSelect = (
  layout: StudioTimetableDayCardsLayout,
): React.ReactElement<{ onChange: (event: unknown) => void }> => {
  const element = StudioTimetableDayCardsLayoutControls({
    days: DAYS,
    layout,
    onUpdateLayout: () => {},
  }) as React.ReactElement<{ children: React.ReactElement[] }>;
  const label = element.props.children[0] as React.ReactElement<{
    children: React.ReactElement[];
  }>;
  return label.props.children[1] as React.ReactElement<{
    onChange: (event: unknown) => void;
  }>;
};

const toPreset = (
  layout: StudioTimetableDayCardsLayout,
  gridPreset: string,
): StudioTimetableDayCardsLayout => {
  const nextLayout = { ...layout };
  const element = StudioTimetableDayCardsLayoutControls({
    days: DAYS,
    layout,
    onUpdateLayout: (recipe) => recipe(nextLayout),
  }) as React.ReactElement<{ children: React.ReactElement[] }>;
  const label = element.props.children[0] as React.ReactElement<{
    children: React.ReactElement[];
  }>;
  const select = label.props.children[1] as React.ReactElement<{
    onChange: (event: unknown) => void;
  }>;

  select.props.onChange({ currentTarget: { value: gridPreset } });
  return nextLayout;
};

assert.ok(
  gridPresetSelect(createLayout()) !== null,
  "격자 프리셋 선택을 찾을 수 있다.",
);

const toCustom = toPreset(
  createLayout({ gridPreset: "1x7", slots: undefined }),
  "custom",
);
assert.equal(toCustom.gridPreset, "custom");
assert.ok(
  Array.isArray(toCustom.slots) && toCustom.slots.length > 0,
  "사용자 지정으로 바꾸면 지금 요일 순서로 자리 지도를 만들어 준다.",
);

const toPresetFromCustom = toPreset(
  createLayout({
    gridPreset: "custom",
    columns: 3,
    rows: 3,
    slots: ["mon", null, "tue"] as StudioTimetableDayCardsLayout["slots"],
  }),
  "3x3",
);
assert.equal(
  toPresetFromCustom.slots,
  undefined,
  "프리셋으로 돌아가면 자리 지도를 지운다. 남겨 두면 화면과 문서가 어긋난다.",
);
assert.deepEqual(
  toPresetFromCustom.emptySlotIndexes,
  [7, 8],
  "3x3으로 바꾸면 빈 칸을 계산해 둔다. 기본은 마지막 두 칸이다.",
);

const toOneBySeven = toPreset(
  createLayout({ gridPreset: "3x3", columns: 3, rows: 3 }),
  "1x7",
);
assert.equal(
  toOneBySeven.emptySlotIndexes,
  undefined,
  "3x3이 아닌 프리셋에는 빈 칸 목록이 남지 않는다.",
);
assert.equal(toOneBySeven.columns, 7, "프리셋의 칸 수를 그대로 쓴다.");

// 요일이 많으면 프리셋보다 줄을 늘려서 모두 담는다.
//
// 한 줄 프리셋에 요일 여덟 개를 담으려면 줄이 두 개여야 한다.

const manyDays = [
  ...DAYS,
  { id: "extra", label: "Extra", shortLabel: "Ex" },
] as StudioDayCardsLayoutDay[];
const manyDaysLayout = createLayout({ gridPreset: "custom" });
const manyDaysElement = StudioTimetableDayCardsLayoutControls({
  days: manyDays,
  layout: createLayout({ gridPreset: "custom" }),
  onUpdateLayout: (recipe) => recipe(manyDaysLayout),
}) as React.ReactElement<{ children: React.ReactElement[] }>;
const manyDaysLabel = manyDaysElement.props.children[0] as React.ReactElement<{
  children: React.ReactElement[];
}>;
(
  manyDaysLabel.props.children[1] as React.ReactElement<{
    onChange: (event: unknown) => void;
  }>
).props.onChange({ currentTarget: { value: "1x7" } });

assert.equal(
  manyDaysLayout.rows,
  2,
  "요일이 한 줄에 안 들어가면 줄을 늘려서 모두 담는다.",
);
assert.equal(manyDaysLayout.columns, 7, "칸 수는 프리셋을 따른다.");

// --- 가로 간격 ---
//
// 가로 간격은 예전 dayGap과 같은 값을 유지해야 기존 문서가 그대로 보인다.

/** 만들어진 요소 나무에서 이름이 맞는 숫자 필드를 찾는다. */
const findNumberField = (
  node: React.ReactNode,
  label: string,
): React.ReactElement<{ onChange: (value: number) => void }> | null => {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findNumberField(child, label);
      if (found) return found;
    }
    return null;
  }

  if (!React.isValidElement(node)) return null;

  const props = node.props as { label?: string; children?: React.ReactNode };
  if (props.label === label) {
    return node as React.ReactElement<{ onChange: (value: number) => void }>;
  }

  return findNumberField(props.children, label);
};

const gapLayout = createLayout();
const gapElement = StudioTimetableDayCardsLayoutControls({
  days: DAYS,
  layout: createLayout(),
  onUpdateLayout: (recipe) => recipe(gapLayout),
});

const gapXField = findNumberField(gapElement, "Gap X");
const gapYField = findNumberField(gapElement, "Gap Y");

assert.ok(gapXField, "가로 간격 필드를 찾을 수 있다.");
assert.ok(gapYField, "세로 간격 필드를 찾을 수 있다.");

gapXField.props.onChange(20);
assert.equal(gapLayout.columnGap, 20, "가로 간격을 저장한다.");
assert.equal(
  gapLayout.dayGap,
  20,
  "가로 간격은 예전 이름의 값도 함께 맞춘다. 기존 문서가 그대로 보이려면 필요하다.",
);

gapYField.props.onChange(8);
assert.equal(gapLayout.rowGap, 8, "세로 간격을 저장한다.");
assert.equal(
  gapLayout.dayGap,
  20,
  "세로 간격은 예전 이름의 값을 건드리지 않는다.",
);

console.log("Studio day cards layout baseline checks passed.");
