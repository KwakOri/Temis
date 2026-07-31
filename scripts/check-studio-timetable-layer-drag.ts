/**
 * 시간표 레이어 끌어 옮기기 규칙의 기준선 가드.
 *
 * 최상위 객체와 요일 카드는 저장되는 값이 다르다. 최상위 객체는 패널에서 본
 * 위/아래를 뒤집어 저장하고 요일 카드는 그대로 저장한다. 이 둘이 섞이면 옮긴
 * 방향이 반대로 저장되고, 화면은 곧 다시 그려지므로 옮기기가 튕긴 것처럼 보인다.
 *
 * 이 저장소에는 DOM 테스트 환경이 없어서 훅을 직접 부를 수 없다. 그래서 판단
 * 로직을 순수 함수로 두고 그 계약을 여기서 고정한다.
 */
import assert from "node:assert/strict";
import type { StudioTimetableDayId } from "../src/types/template-studio";
import {
  expandStudioTimetableLayer,
  getStudioTimetableLayerDropBlockedReason,
  getStudioTimetableLayerDropPosition,
  planStudioTimetableLayerDrop,
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
// --- 접힘 목록 기준선 ---
const collapsedLayerIds = ["dayCards", "profile"];
assert.deepEqual(
  expandStudioTimetableLayer(collapsedLayerIds, "dayCards"),
  ["profile"],
  "펼친 레이어만 목록에서 빠진다.",
);
assert.equal(
  expandStudioTimetableLayer(collapsedLayerIds, "board"),
  collapsedLayerIds,
  "바뀐 것이 없으면 받은 배열을 그대로 돌려준다. 새 배열을 만들면 끌고 있는 동안 트리가 계속 다시 그려진다.",
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
    position: "before",
  },
  "요일 카드는 보이는 순서가 요일 순서라 위/아래를 뒤집지 않는다.",
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
