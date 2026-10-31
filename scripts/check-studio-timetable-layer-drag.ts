/**
 * 시간표 레이어 끌어 옮기기 규칙의 기준선 가드.
 *
 * 최상위 객체와 요일 카드는 저장되는 값이 다르다. 최상위 객체와 요일 카드는 패널에서 본
 * 위/아래를 뒤집어 저장한다. 이 둘이 섞이면 옮긴
 * 방향이 반대로 저장되고, 화면은 곧 다시 그려지므로 옮기기가 튕긴 것처럼 보인다.
 *
 * 이 저장소에는 DOM 테스트 환경이 없어서 훅을 직접 부를 수 없다. 그래서 판단
 * 로직을 순수 함수로 두고 그 계약을 여기서 고정한다.
 */
import assert from "node:assert/strict";
import type { StudioTimetableDayId } from "../src/types/template-studio";
import {
  getStudioTimetableLayerDropBlockedReason,
  getStudioTimetableLayerDropPosition,
  getStudioTimetableLayerPointerDropState,
  isSameStudioTimetableLayerDropState,
  planStudioTimetableLayerDrop,
  resolveStudioTimetableLayerDropState,
  shouldAutoExpandStudioTimetableLayer,
  type StudioTimetableLayerDragState,
  type StudioTimetableLayerDropState,
} from "../src/utils/template-studio/timetable-layer-drag";
const rootDrag: StudioTimetableLayerDragState = {
  layerId: "board",
  scope: "root",
};
const dayDrag: StudioTimetableLayerDragState = {
  layerId: "day-card:mon",
  scope: "day",
  dayId: "mon" as StudioTimetableDayId,
};
// --- 놓을 수 있는 자리 기준선 ---
assert.equal(
  getStudioTimetableLayerDropBlockedReason(rootDrag, "weekDates"),
  null,
  "최상위 객체는 다른 최상위 객체 옆으로 옮길 수 있다.",
);
assert.equal(
  getStudioTimetableLayerDropBlockedReason(rootDrag, "board"),
  "Already here",
  "제자리에 놓는 것은 옮기기가 아니다.",
);
assert.equal(
  getStudioTimetableLayerDropBlockedReason(
    rootDrag,
    "day-card:tue",
    "tue" as StudioTimetableDayId,
  ),
  "Cannot move root layer into day cards",
  "최상위 객체를 요일 카드 사이에 넣으면 아무 요일에도 속하지 않는다.",
);
assert.equal(
  getStudioTimetableLayerDropBlockedReason(
    dayDrag,
    "day-card:tue",
    "tue" as StudioTimetableDayId,
  ),
  null,
  "요일 카드는 다른 요일 카드 옆으로 옮길 수 있다.",
);
assert.equal(
  getStudioTimetableLayerDropBlockedReason(
    dayDrag,
    "day-card:mon",
    "mon" as StudioTimetableDayId,
  ),
  "Already here",
  "같은 요일 자리는 옮길 곳이 아니다.",
);
assert.equal(
  getStudioTimetableLayerDropBlockedReason(dayDrag, "board"),
  "Cannot move day card outside its group",
  "요일 카드를 묶음 밖으로 빼면 요일 순서와 카드 순서가 어긋난다.",
);
// --- 행 안에서의 위/아래 기준선 ---
//
// 행 가운데를 기준으로 가른다. 가운데와 아래쪽 끝은 아래로 본다.
assert.equal(
  getStudioTimetableLayerDropPosition(10, { top: 0, height: 40 }),
  "before",
  "행의 위쪽 절반은 위에 넣는다.",
);
assert.equal(
  getStudioTimetableLayerDropPosition(20, { top: 0, height: 40 }),
  "after",
  "정확히 가운데는 아래에 넣는다.",
);
assert.equal(
  getStudioTimetableLayerDropPosition(19.9, { top: 0, height: 40 }),
  "before",
  "가운데보다 조금이라도 위면 위에 넣는다.",
);
assert.equal(
  getStudioTimetableLayerDropPosition(110, { top: 100, height: 40 }),
  "before",
  "행이 화면 아래쪽에 있어도 행 자신의 위치를 기준으로 가른다.",
);
assert.equal(
  getStudioTimetableLayerDropPosition(100, { top: 100, height: 0 }),
  "after",
  "높이를 못 읽은 행은 아래로 본다.",
);
// --- 자동 펼침 대상 기준선 ---
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetObjectKind: "generatedDayCards",
    blockedReason: null,
    collapsed: true,
  }),
  true,
  "접힌 요일 카드 묶음 위에 머물면 펼친다.",
);
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetObjectKind: "generatedDayCards",
    blockedReason: null,
    collapsed: false,
  }),
  false,
  "이미 펼쳐진 묶음은 다시 펼칠 것이 없다.",
);
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetObjectKind: "generatedDayCards",
    blockedReason: "Already here",
    collapsed: true,
  }),
  false,
  "놓을 수 없는 자리를 열어 주면 안 된다.",
);
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetObjectKind: "group",
    blockedReason: null,
    collapsed: true,
  }),
  false,
  "요일 카드 묶음이 아닌 묶음은 저절로 펼치지 않는다.",
);
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetObjectKind: null,
    blockedReason: null,
    collapsed: true,
  }),
  false,
  "composition에 없는 레이어는 펼칠 대상이 아니다.",
);
assert.equal(
  shouldAutoExpandStudioTimetableLayer({
    targetDayId: "mon" as StudioTimetableDayId,
    targetObjectKind: "generatedDayCards",
    blockedReason: null,
    collapsed: true,
  }),
  false,
  "요일 카드 행 위에서는 그 묶음을 펼치지 않는다.",
);
// --- 포인터 드롭 자리 기준선 ---
//
// 드롭은 목록 전체가 받고, 포인터에 가장 가까운 대상 행 기준으로 자리를 정한다.
assert.deepEqual(
  [90, 130, 160].map(
    (pointerY) =>
      getStudioTimetableLayerPointerDropState(
        rootDrag,
        { layerId: "weekDates", bounds: { top: 100, height: 40 } },
        pointerY,
      ).position,
  ),
  ["before", "after", "after"],
  "대상 행 밖의 포인터도 행 가운데를 기준으로 위/아래를 가른다.",
);
assert.deepEqual(
  getStudioTimetableLayerPointerDropState(
    rootDrag,
    {
      layerId: "day-card:tue",
      dayId: "tue" as StudioTimetableDayId,
      bounds: { top: 0, height: 40 },
    },
    10,
  ),
  {
    layerId: "day-card:tue",
    position: "before",
    blockedReason: "Cannot move root layer into day cards",
  },
  "포인터 자리에도 놓을 수 있는지 판단을 함께 붙인다.",
);
// --- 놓을 때 쓰는 자리 기준선 ---
//
// 크롬은 새 행에 들어간 직후에는 dragover를 보내지 않는다. 그 사이에 놓으면
// 표시선이 이전 행에 남아 있으므로, 놓은 행이 다르면 포인터로 다시 계산한다.
assert.deepEqual(
  resolveStudioTimetableLayerDropState(
    { layerId: "weekDates", position: "after" },
    { layerId: "weekDates", position: "before" },
  ),
  { layerId: "weekDates", position: "after" },
  "표시선을 그려 둔 행에 놓았으면 그 자리를 쓴다.",
);
assert.deepEqual(
  resolveStudioTimetableLayerDropState(
    { layerId: "profile", position: "after" },
    { layerId: "weekDates", position: "before" },
  ),
  { layerId: "weekDates", position: "before" },
  "다른 행에 놓았으면 놓은 순간의 포인터 자리를 쓴다.",
);
assert.deepEqual(
  resolveStudioTimetableLayerDropState(null, {
    layerId: "weekDates",
    position: "before",
  }),
  { layerId: "weekDates", position: "before" },
  "표시선이 없어도 놓을 수는 있다.",
);
// --- 표시선 갱신 기준선 ---
assert.equal(
  isSameStudioTimetableLayerDropState(
    { layerId: "a", position: "before" },
    { layerId: "a", position: "before", blockedReason: null },
  ),
  true,
  "같은 자리면 상태를 바꾸지 않는다. dragover는 포인터가 멈춰 있어도 계속 들어온다.",
);
assert.deepEqual(
  [
    { layerId: "b", position: "before" as const },
    { layerId: "a", position: "after" as const },
    {
      layerId: "a",
      position: "before" as const,
      blockedReason: "Already here",
    },
    null,
  ].map((next) =>
    isSameStudioTimetableLayerDropState(
      { layerId: "a", position: "before" },
      next,
    ),
  ),
  [false, false, false, false],
  "행, 위치, 막힌 이유 중 하나라도 바뀌면 다시 그린다.",
);
// --- 드롭 결과 기준선 ---
const rootDrop: StudioTimetableLayerDropState = {
  layerId: "weekDates",
  position: "before",
};
assert.deepEqual(
  planStudioTimetableLayerDrop(rootDrag, rootDrop, "weekDates"),
  {
    kind: "root",
    sourceLayerId: "board",
    targetLayerId: "weekDates",
    position: "after",
  },
  "패널에서 위에 놓으면 문서에는 뒤에 저장한다. 패널은 앞에 있는 것을 위에 보여 주기 때문이다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    rootDrag,
    { layerId: "weekDates", position: "after" },
    "weekDates",
  ),
  {
    kind: "root",
    sourceLayerId: "board",
    targetLayerId: "weekDates",
    position: "before",
  },
  "패널에서 아래에 놓으면 문서에는 앞에 저장한다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    dayDrag,
    { layerId: "day-card:tue", position: "before" },
    "day-card:tue",
    "tue" as StudioTimetableDayId,
  ),
  {
    kind: "day",
    sourceDayId: "mon",
    targetDayId: "tue",
    position: "after",
  },
  "요일 카드도 패널에서 위에 놓으면 문서의 뒤에 저장해 앞에 그린다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    dayDrag,
    { layerId: "day-card:tue", position: "after" },
    "day-card:tue",
    "tue",
  ),
  {
    kind: "day",
    sourceDayId: "mon",
    targetDayId: "tue",
    position: "before",
  },
  "요일 카드도 패널에서 아래에 놓으면 문서의 앞에 저장한다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    rootDrag,
    { layerId: "weekDates", position: "before", blockedReason: "Already here" },
    "weekDates",
  ),
  { kind: "none" },
  "막힌 자리에 놓아도 아무 일도 일어나지 않는다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(rootDrag, rootDrop, "profile"),
  { kind: "none" },
  "표시선을 그려 둔 자리와 놓인 자리가 다르면 옮기지 않는다. 화면에 없던 곳으로 옮기는 셈이다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    rootDrag,
    { layerId: "day-card:tue", position: "before" },
    "day-card:tue",
    "tue" as StudioTimetableDayId,
  ),
  { kind: "none" },
  "막힌 이유를 못 받았더라도 최상위 객체는 요일 카드 사이로 가지 않는다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    dayDrag,
    { layerId: "board", position: "before" },
    "board",
  ),
  { kind: "none" },
  "요일 카드는 최상위 객체 자리로 가지 않는다.",
);
assert.deepEqual(
  planStudioTimetableLayerDrop(
    { layerId: "day-card:mon", scope: "day" },
    { layerId: "day-card:tue", position: "before" },
    "day-card:tue",
    "tue" as StudioTimetableDayId,
  ),
  { kind: "none" },
  "어느 요일을 집었는지 모르면 요일 순서를 바꿀 수 없다.",
);
console.log("Studio timetable layer drag baseline checks passed.");
