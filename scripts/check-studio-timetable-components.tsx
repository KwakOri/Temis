/**
 * 시간표 전용 render 함수에서 뽑아낸 컴포넌트의 기준선 가드.
 *
 * 시간표 레이어 행의 아이콘·선택 규칙과 요일 표기 선택 UI를 클라이언트 밖으로
 * 옮겼다. 옮기면서 표현이 달라지지 않았는지 마크업으로 확인한다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioDayLabelFormatField } from "../src/app/(root)/template-studio/_components/studio-day-label-format-field";
import { StudioTimetableLayerRow } from "../src/app/(root)/template-studio/_components/studio-timetable-layer-row";

const noop = () => {};

// --- 레이어 행 아이콘 ---
//
// 종류 이름으로 아이콘을 고르는 규칙은 추출 이전과 같아야 한다.

const rowMarkup = (
  props: Partial<Parameters<typeof StudioTimetableLayerRow>[0]> = {},
) =>
  renderToStaticMarkup(
    <StudioTimetableLayerRow
      id="object"
      label="Memo"
      selectedLayerId={null}
      type="text"
      onSelectLayer={noop}
      {...props}
    />,
  );

/**
 * 행 마크업에서 종류 아이콘 svg만 뽑아낸다.
 *
 * 첫 svg는 접기 화살표라서 두 번째를 본다.
 */
const iconOf = (type: string): string => {
  const icons = rowMarkup({ type }).match(/<svg[\s\S]*?<\/svg>/g) ?? [];
  if (icons.length < 2) {
    throw new Error(`아이콘을 찾지 못했다: ${type}`);
  }
  return icons[1];
};

const groupIcon = iconOf("group");
const dayIcon = iconOf("day");
const blockIcon = iconOf("block");
const imageIcon = iconOf("image");
const textIcon = iconOf("text");
const autoTextIcon = iconOf("auto text");

assert.equal(blockIcon, imageIcon, "block과 image는 같은 아이콘을 쓴다.");
assert.equal(
  autoTextIcon,
  textIcon,
  "이름이 다른 텍스트 종류도 텍스트 아이콘을 쓴다.",
);
assert.equal(
  new Set([groupIcon, dayIcon, imageIcon, textIcon]).size,
  4,
  "group, day, image, text는 서로 다른 아이콘이어야 한다.",
);

// --- 선택 표현 ---

assert.ok(
  rowMarkup({ selectedLayerId: "object" }).includes("bg-[var(--sel)]"),
  "고른 레이어와 id가 같으면 선택 표현이 된다.",
);
assert.ok(
  !rowMarkup({ selectedLayerId: "other" }).includes("bg-[var(--sel)]"),
  "다른 레이어를 골랐으면 선택 표현이 아니다.",
);

// --- 숨김과 막힌 드롭 ---

const hiddenMarkup = rowMarkup({ hidden: true });
assert.ok(hiddenMarkup.includes("opacity-55"), "숨긴 레이어는 흐리게 보인다.");
assert.ok(
  hiddenMarkup.includes("h-3.5 w-3.5 shrink-0 text-[var(--fg3)]"),
  "숨긴 레이어에는 상태 아이콘이 붙는다.",
);
assert.ok(
  !rowMarkup().includes("h-3.5 w-3.5 shrink-0 text-[var(--fg3)]"),
  "숨기지 않은 레이어에는 상태 아이콘이 없다.",
);

const blockedMarkup = rowMarkup({ blockedReason: "Cannot drop here" });
assert.ok(
  blockedMarkup.includes("ring-1 ring-inset ring-rose-400/80"),
  "드롭할 수 없으면 막힌 테두리로 보인다.",
);
assert.ok(
  blockedMarkup.includes('title="Cannot drop here"'),
  "막힌 이유를 title로 알려준다.",
);

// --- 행 클릭 순서 ---
//
// 무엇을 더 하든 고른 레이어가 먼저 바뀌어야 한다.

const calls: string[] = [];
const clickProps: Parameters<typeof StudioTimetableLayerRow>[0] = {
  id: "day-card:mon",
  label: "Mon Card",
  selectedLayerId: null,
  type: "day",
  onSelectLayer: (id) => calls.push(`select:${id}`),
  onSelect: () => calls.push("after"),
};

// 컴포넌트가 만드는 onClick을 직접 불러 순서를 확인한다.
const element = StudioTimetableLayerRow(clickProps) as React.ReactElement<{
  onClick: () => void;
}>;
element.props.onClick();

assert.deepEqual(
  calls,
  ["select:day-card:mon", "after"],
  "행을 누르면 레이어 선택이 먼저, 추가 동작이 나중이다.",
);

// --- 요일 표기 선택 ---

const dayFormatMarkup = (fieldId: string) =>
  renderToStaticMarkup(
    <StudioDayLabelFormatField
      fieldId={
        fieldId as Parameters<typeof StudioDayLabelFormatField>[0]["fieldId"]
      }
      onChange={noop}
    />,
  );

assert.equal(
  dayFormatMarkup("entry.subject"),
  "",
  "요일 필드가 아니면 아무것도 그리지 않는다.",
);

const dayLabelMarkup = dayFormatMarkup("day.label");
assert.ok(
  dayLabelMarkup.includes("<span>Day Format</span>"),
  "요일 필드에는 표기 선택이 나타난다.",
);
assert.ok(
  dayLabelMarkup.includes("Stored on this text binding only."),
  "고른 표기가 이 바인딩에만 저장된다는 안내가 유지된다.",
);
assert.ok(
  dayLabelMarkup.includes('selected=""'),
  "값을 주지 않으면 기본 표기가 골라져 있다.",
);

const optionCount = (dayLabelMarkup.match(/<option/g) ?? []).length;
assert.ok(
  optionCount >= 2,
  `표기 선택에는 여러 후보가 있어야 한다. 현재 ${optionCount}개.`,
);

console.log("Studio timetable component baseline checks passed.");
