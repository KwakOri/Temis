/**
 * 시간표 레이어 패널의 기준선 가드.
 *
 * 이 패널은 무엇을 집을 수 있는지를 사용자에게 알려 주는 유일한 화면이다.
 * 최상위 객체만 순서를 바꿀 수 있고 요일 카드는 자기 묶음 안에서만 움직인다.
 * 묶음 안의 자식 객체는 부모가 정한 자리에 있어야 하므로 집을 수 없다. 여기서
 * 집을 수 있게 보이면 사용자는 옮길 수 있다고 믿고 끌었다가 매번 튕긴다.
 *
 * 최상위 객체는 앞에 있는 것을 위에 보여 주고 요일 카드는 요일 순서 그대로
 * 보여 준다. 두 순서 규칙이 섞이면 위/아래가 뒤집혀 저장된다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getStudioTimetableLayerTypeLabel,
  StudioTimetableLayerPanel,
  type StudioTimetableLayerPanelProps,
} from "../src/app/(root)/template-studio/_components/studio-timetable-layer-panel";
import type {
  StudioTimetableComposition,
  StudioTimetableDayDefinition,
} from "../src/types/template-studio";
const noop = () => {};
/** 행 하나에서 종류 아이콘만 골라낸다. 첫 svg는 접기 화살표다. */
const getRowIconNames = (markup: string): string[] =>
  markup
    .split("<button")
    .slice(1)
    .map((row) => {
      const iconClasses = [...row.matchAll(/class="lucide lucide-([a-z-]+)/g)];
      return iconClasses[1]?.[1] ?? "none";
    });
const getRowTitles = (markup: string): string[] =>
  [
    ...markup.matchAll(
      /draggable="(true|false)" style="padding-left:(\d+)px" title="([^"]+)"/g,
    ),
  ].map((match) => `${match[3]}|${match[1]}|${match[2]}`);
const composition = {
  rootObjectIds: ["board", "profile", "dayCards"],
  objects: {
    board: { id: "board", kind: "image", label: "Board", style: {} },
    profile: {
      id: "profile",
      kind: "group",
      label: "Profile",
      childIds: ["profileBack", "profileName"],
      style: {},
    },
    profileBack: {
      id: "profileBack",
      kind: "image",
      label: "Profile Back",
      parentId: "profile",
      style: {},
    },
    profileName: {
      id: "profileName",
      kind: "flexibleText",
      label: "Profile Name",
      parentId: "profile",
      style: {},
    },
    dayCards: {
      id: "dayCards",
      kind: "generatedDayCards",
      label: "Day Cards",
      style: {},
    },
  },
} as unknown as StudioTimetableComposition;
const days = [
  { id: "mon", label: "Monday", shortLabel: "Mon", order: 0 },
  { id: "tue", label: "Tuesday", order: 1 },
] as unknown as StudioTimetableDayDefinition[];
const panelProps: StudioTimetableLayerPanelProps = {
  composition,
  days,
  selectedLayerId: null,
  collapsedLayerIds: [],
  dropState: null,
  onSelectLayer: noop,
  onToggleCollapsed: noop,
  onFocusDay: noop,
  onLayerDragStart: noop,
  onLayerDragOver: noop,
  onLayerDragEnd: noop,
  onLayerDrop: noop,
  onIndicatorDragOver: noop,
};
const markup = renderToStaticMarkup(
  <StudioTimetableLayerPanel {...panelProps} />,
);
// --- 종류 이름 기준선 ---
assert.deepEqual(
  (
    [
      "generatedDayCards",
      "group",
      "profileBlock",
      "image",
      "topObject",
      "flexibleText",
      "text",
    ] as const
  ).map(getStudioTimetableLayerTypeLabel),
  ["group", "group", "block", "image", "image", "auto text", "text"],
  "레이어 종류 이름이 바뀌면 안 된다. 사용자는 이 이름으로 무엇을 채워야 하는지 안다.",
);
assert.equal(
  markup.includes(">auto text</span>"),
  true,
  "글자 길이에 맞춰 늘어나는 글자는 여느 글자와 구별해서 보여 준다.",
);
// --- 보이는 순서 기준선 ---
//
// 최상위 객체는 뒤집어 보여 주고(앞에 있는 것이 위), 요일 카드는 요일 순서
// 그대로 보여 준다. 묶음의 자식도 뒤집는다.
assert.deepEqual(
  getRowTitles(markup),
  [
    "Day Cards|true|10",
    "Mon Card|true|30",
    "Tuesday Card|true|30",
    "Profile|true|10",
    "Profile Name|false|30",
    "Profile Back|false|30",
    "Board|true|10",
  ],
  "행 순서, 집을 수 있는 범위, 들여쓰기가 함께 유지돼야 한다.",
);
assert.equal(
  (markup.match(/draggable="true"/g) ?? []).length,
  5,
  "최상위 객체와 요일 카드만 집을 수 있다. 묶음의 자식은 부모가 정한 자리에 있어야 한다.",
);
// --- 종류 아이콘 기준선 ---
//
// 행마다 svg가 둘이다. 첫째는 접기 화살표이므로 종류 아이콘은 둘째를 본다.
assert.deepEqual(
  getRowIconNames(markup),
  [
    "layers",
    "calendar-days",
    "calendar-days",
    "layers",
    "type",
    "image",
    "image",
  ],
  "요일 카드는 달력, 묶음은 겹장, 사진 자리는 사진 아이콘으로 알아본다.",
);
// --- 접기 기준선 ---
assert.equal(
  (markup.match(/title="Collapse group"/g) ?? []).length,
  2,
  "요일 카드 묶음과 자식이 있는 묶음만 접을 수 있다.",
);
// 빈 묶음은 펼칠 것이 없다. 접기 화살표를 보여 주면 눌러도 아무 일이 없다.
const emptyGroupComposition = {
  rootObjectIds: ["emptyGroup"],
  objects: {
    emptyGroup: {
      id: "emptyGroup",
      kind: "group",
      label: "Empty Group",
      childIds: [],
      style: {},
    },
  },
} as unknown as StudioTimetableComposition;
assert.equal(
  renderToStaticMarkup(
    <StudioTimetableLayerPanel
      {...panelProps}
      composition={emptyGroupComposition}
    />,
  ).includes('title="Collapse group"'),
  false,
  "자식이 없는 묶음은 접을 수 없다.",
);
const collapsedMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel
    {...panelProps}
    collapsedLayerIds={["dayCards", "profile"]}
  />,
);
assert.deepEqual(
  getRowTitles(collapsedMarkup),
  ["Day Cards|true|10", "Profile|true|10", "Board|true|10"],
  "접은 묶음은 자식과 요일 카드를 감춘다.",
);
assert.equal(
  (collapsedMarkup.match(/title="Expand group"/g) ?? []).length,
  2,
  "접힌 묶음은 펼치는 쪽으로 안내한다.",
);
// --- 요일 카드 id 규칙 기준선 ---
//
// 요일 카드 레이어는 composition object가 아니라 `day-card:<dayId>`로 요일을
// 가리킨다. 인스펙터가 이 규칙으로 요일과 객체를 갈라 읽으므로 패널도 같은 id를
// 써야 한다. 다른 id를 쓰면 카드를 눌러도 인스펙터가 비어 보인다.
const selectedDayCardMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel {...panelProps} selectedLayerId="day-card:tue" />,
);
const selectedRow = selectedDayCardMarkup
  .split("<button")
  .find((row) => row.includes("bg-[var(--sel)] font-semibold"));
assert.ok(selectedRow, "고른 레이어는 눌린 모습으로 보여 준다.");
assert.ok(
  selectedRow.includes('title="Tuesday Card"'),
  "`day-card:<dayId>` 규칙으로 고른 요일 카드를 찾는다.",
);
assert.equal(
  (selectedDayCardMarkup.match(/bg-\[var\(--sel\)\] font-semibold/g) ?? [])
    .length,
  1,
  "고른 레이어는 한 줄뿐이다.",
);
// --- 드롭 표시선 기준선 ---
//
// 표시선은 최상위 객체와 요일 카드 자리에만 그린다. 묶음의 자식은 옮길 수 없으니
// 놓을 자리도 없다.
const rootDropMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel
    {...panelProps}
    dropState={{ layerId: "board", position: "before" }}
  />,
);
assert.equal(
  (rootDropMarkup.match(/>Above</g) ?? []).length,
  1,
  "표시선은 가리키는 자리 한 곳에만 그린다.",
);
assert.equal(
  (rootDropMarkup.match(/>Below</g) ?? []).length,
  0,
  "위에 놓으려는 중이면 아래 표시선은 그리지 않는다.",
);
assert.equal(
  (
    renderToStaticMarkup(
      <StudioTimetableLayerPanel
        {...panelProps}
        dropState={{ layerId: "profileName", position: "before" }}
      />,
    ).match(/>Above</g) ?? []
  ).length,
  0,
  "묶음의 자식 자리에는 표시선을 그리지 않는다. 그곳으로는 옮길 수 없다.",
);
assert.equal(
  (
    renderToStaticMarkup(
      <StudioTimetableLayerPanel
        {...panelProps}
        dropState={{ layerId: "day-card:mon", position: "after" }}
      />,
    ).match(/>Below</g) ?? []
  ).length,
  1,
  "요일 카드 사이에도 표시선을 그린다.",
);
const blockedMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel
    {...panelProps}
    dropState={{
      layerId: "board",
      position: "before",
      blockedReason: "Already here",
    }}
  />,
);
assert.equal(
  (blockedMarkup.match(/>Blocked</g) ?? []).length,
  1,
  "놓을 수 없는 자리는 막힌 표시로 알려 준다.",
);
// 표시선에도 같은 이유가 붙으므로 행만 떼어 본다.
const blockedRow = blockedMarkup
  .split("<button")
  .slice(1)
  .find((row) => row.includes("ring-rose-400/80"));
assert.ok(blockedRow, "막힌 행은 테두리로도 알려 준다.");
assert.ok(
  blockedRow.includes('title="Already here"'),
  "막힌 이유를 행에도 붙여 준다. 표시선은 행 사이에만 있어서 행을 가리켰을 때는 보이지 않는다.",
);
// --- 숨김 기준선 ---
//
// 숨김은 아래로 물려받는다. 부모를 숨기면 자식도 화면에 나오지 않으므로 패널도
// 같이 흐려야 한다.
const hiddenComposition = {
  ...composition,
  objects: {
    ...composition.objects,
    profile: { ...composition.objects.profile, hidden: true },
    dayCards: { ...composition.objects.dayCards, hidden: true },
  },
} as unknown as StudioTimetableComposition;
const hiddenMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel {...panelProps} composition={hiddenComposition} />,
);
assert.equal(
  (hiddenMarkup.match(/opacity-55/g) ?? []).length,
  6,
  "숨긴 묶음 둘과 그 아래(요일 카드 둘, 자식 둘)까지 흐리게 보여 준다.",
);
assert.equal(
  (hiddenMarkup.match(/lucide-eye-off/g) ?? []).length,
  6,
  "흐린 표현만으로는 숨김을 알기 어려우므로 아이콘도 함께 붙인다.",
);
// --- 순환 참조 기준선 ---
//
// 묶음이 자기 조상을 자식으로 갖는 문서가 들어오면 재귀가 끝나지 않아 편집기가
// 멈춘다. 지나온 객체를 기억해서 한 번만 그린다.
const cyclicComposition = {
  rootObjectIds: ["outer"],
  objects: {
    outer: {
      id: "outer",
      kind: "group",
      label: "Outer",
      childIds: ["inner"],
      style: {},
    },
    inner: {
      id: "inner",
      kind: "group",
      label: "Inner",
      parentId: "outer",
      childIds: ["outer"],
      style: {},
    },
  },
} as unknown as StudioTimetableComposition;
const cyclicMarkup = renderToStaticMarkup(
  <StudioTimetableLayerPanel {...panelProps} composition={cyclicComposition} />,
);
assert.deepEqual(
  getRowTitles(cyclicMarkup),
  ["Outer|true|10", "Inner|false|30"],
  "순환 참조는 지나온 객체에서 멈춘다.",
);
// --- 요약 기준선 ---
assert.ok(
  markup.includes(">3 placed objects</div>"),
  "요약은 최상위 객체 수를 센다. 요일 카드는 요일에서 만들어지므로 세지 않는다.",
);
assert.ok(
  markup.includes(">Timetable Layers</div>"),
  "카드 레이어 패널과 구별되는 제목을 유지한다.",
);
console.log("Studio timetable layer panel baseline checks passed.");
