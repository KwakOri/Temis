/**
 * 시간표 레이어 명령의 기준선 가드.
 *
 * 레이어 순서 이동, 위치 변경, 부모 채우기, 시간표 객체 삭제를 클라이언트
 * 콜백에서 순수 함수로 옮겼다. 순서 계산과 삭제 금지 규칙이 시간표 구조를
 * 지키는 규칙이라 값으로 고정해 둔다.
 */
import assert from "node:assert/strict";

import type {
  StudioTimetableComposition,
  StudioTimetableCompositionObject,
  StudioTimetableDayCardsLayout,
  StudioTimetableDomain,
} from "../src/types/template-studio";
import {
  applyStudioDeleteTimetableObject,
  applyStudioTimetableObjectFitParent,
  applyStudioTimetableObjectOffset,
  applyStudioTimetableObjectPosition,
  collectStudioTimetableSubtreeIds,
  getStudioTimetableCapabilityMessage,
  getStudioTimetableDayCardLayerId,
  getStudioTimetableDeleteMessage,
  getStudioTimetableOrderedDayIds,
  planStudioDeleteTimetableObject,
  reorderStudioIdList,
  resolveStudioTimetableLayerTarget,
  roundStudioCoordinate,
  setStudioTimetableDayOffset,
} from "../src/utils/template-studio/timetable-commands";

const createObject = (
  id: string,
  overrides: Partial<StudioTimetableCompositionObject> = {},
): StudioTimetableCompositionObject => ({
  id,
  kind: "text",
  label: id,
  parentId: null,
  childIds: [],
  style: { left: 10, top: 20, width: 100, height: 50 },
  ...overrides,
});

const createComposition = (): StudioTimetableComposition =>
  ({
    rootObjectIds: ["day-cards", "group", "solo"],
    objects: {
      "day-cards": createObject("day-cards", { kind: "generatedDayCards" }),
      group: createObject("group", {
        kind: "group",
        childIds: ["child", "grandchildHost"],
      }),
      child: createObject("child", { parentId: "group" }),
      grandchildHost: createObject("grandchildHost", {
        kind: "group",
        parentId: "group",
        childIds: ["grandchild"],
      }),
      grandchild: createObject("grandchild", { parentId: "grandchildHost" }),
      solo: createObject("solo"),
    },
  }) as unknown as StudioTimetableComposition;

const expectFail = (
  result: { ok: boolean; reason?: string },
  reason: string,
  message: string,
) => {
  assert.equal(result.ok, false, message);
  assert.equal(result.reason, reason, message);
};

// --- 레이어 id 판독 ---

assert.deepEqual(
  resolveStudioTimetableLayerTarget("day-cards"),
  { kind: "dayCards" },
  "day-cards는 생성된 카드 컨테이너를 가리킨다.",
);
assert.deepEqual(
  resolveStudioTimetableLayerTarget("day-card:mon"),
  { kind: "dayCard", dayId: "mon" },
  "day-card: 접두사는 각 날짜 카드를 가리킨다.",
);
assert.deepEqual(
  resolveStudioTimetableLayerTarget("object_1"),
  { kind: "object", objectId: "object_1" },
  "나머지는 composition object다.",
);
assert.equal(
  getStudioTimetableDayCardLayerId("tue"),
  "day-card:tue",
  "day card 레이어 id 규칙이 바뀌면 안 된다.",
);

// --- 날짜 순서 ---

const timetable = {
  dayIds: ["wed", "mon", "gone", "tue"],
  days: {
    mon: { id: "mon", order: 0 },
    tue: { id: "tue", order: 1 },
    wed: { id: "wed", order: 2 },
  },
} as unknown as StudioTimetableDomain;

assert.deepEqual(
  getStudioTimetableOrderedDayIds(timetable),
  ["mon", "tue", "wed"],
  "날짜는 배열 순서가 아니라 order 값으로 정렬한다.",
);

// --- 순서 이동 계산 ---

const ids = ["a", "b", "c", "d"];

assert.deepEqual(
  reorderStudioIdList(ids, "a", "c", "after"),
  ["b", "c", "a", "d"],
  "앞에서 뒤로 옮기면 목표 뒤에 놓인다.",
);
assert.deepEqual(
  reorderStudioIdList(ids, "a", "c", "before"),
  ["b", "a", "c", "d"],
  "앞에서 뒤로 옮길 때 목표 인덱스가 한 칸 당겨지는 것을 반영한다.",
);
assert.deepEqual(
  reorderStudioIdList(ids, "d", "b", "before"),
  ["a", "d", "b", "c"],
  "뒤에서 앞으로 옮기면 목표 앞에 놓인다.",
);
assert.deepEqual(
  reorderStudioIdList(ids, "d", "b", "after"),
  ["a", "b", "d", "c"],
  "뒤에서 앞으로 옮길 때는 목표 인덱스를 그대로 쓴다.",
);
assert.deepEqual(
  reorderStudioIdList(ids, "a", "b", "before"),
  ["a", "b", "c", "d"],
  "바로 앞으로 옮기면 순서가 그대로다.",
);
assert.equal(
  reorderStudioIdList(ids, "a", "a", "after"),
  null,
  "자기 자신으로 옮기면 아무 일도 하지 않는다.",
);
assert.equal(
  reorderStudioIdList(ids, "a", "gone", "after"),
  null,
  "목표가 목록에 없으면 아무 일도 하지 않는다.",
);
assert.equal(
  reorderStudioIdList(ids, "gone", "a", "after"),
  null,
  "옮길 항목이 목록에 없으면 아무 일도 하지 않는다.",
);
assert.deepEqual(ids, ["a", "b", "c", "d"], "원본 배열을 바꾸지 않는다.");

// --- 좌표 반올림 ---

assert.equal(roundStudioCoordinate(1 / 3), 0.33);
assert.equal(roundStudioCoordinate(10), 10);
assert.equal(roundStudioCoordinate(-0.005), -0.01);

// --- 부모 채우기 ---

const fitOnObject = createObject("x");
applyStudioTimetableObjectFitParent(fitOnObject, true, {
  width: 300,
  height: 200,
});
assert.equal(fitOnObject.layoutMode, "fillParent");
assert.deepEqual(
  fitOnObject.style,
  { left: 0, top: 0, width: 100, height: 50 },
  "켜면 좌표만 0으로 맞추고 크기는 그대로 남긴다. 렌더가 부모 크기를 쓴다.",
);

const fitOffObject = createObject("x", { layoutMode: "fillParent" });
applyStudioTimetableObjectFitParent(fitOffObject, false, {
  width: 300,
  height: 200,
});
assert.equal(fitOffObject.layoutMode, "fixed");
assert.deepEqual(
  fitOffObject.style,
  { left: 0, top: 0, width: 300, height: 200 },
  "끄면 화면에서 보이던 크기를 고정 값으로 받는다.",
);

// --- 위치 변경 ---

const positionObject = createObject("x");
assert.equal(
  applyStudioTimetableObjectPosition(
    positionObject,
    { left: 1 / 3, width: 250 },
    { left: 10, top: 20, width: 100, height: 50 },
  ),
  true,
);
assert.deepEqual(
  positionObject.style,
  { left: 0.33, top: 20, width: 250, height: 50, rotateDeg: 0 },
  "넘기지 않은 값은 현재 값을 유지하고 소수는 둘째 자리로 맞춘다.",
);

const fitPositionObject = createObject("x", { layoutMode: "fillParent" });
assert.equal(
  applyStudioTimetableObjectPosition(
    fitPositionObject,
    { left: 50 },
    { left: 10, top: 20, width: 100, height: 50 },
  ),
  false,
  "부모를 채우는 객체의 경계는 바꿀 수 없다.",
);
assert.equal(fitPositionObject.style.left, 10, "값이 그대로 남는다.");

const fitRotateObject = createObject("x", { layoutMode: "fillParent" });
assert.equal(
  applyStudioTimetableObjectPosition(
    fitRotateObject,
    { rotateDeg: 15 },
    { left: 10, top: 20, width: 100, height: 50 },
  ),
  true,
  "회전만 바꾸는 요청은 부모를 채우는 객체에서도 통한다.",
);
assert.equal(fitRotateObject.style.rotateDeg, 15);

const rotateKeepObject = createObject("x", {
  style: { left: 0, top: 0, rotateDeg: 30 },
});
applyStudioTimetableObjectPosition(
  rotateKeepObject,
  { left: 5 },
  { left: 0, top: 0, width: 10, height: 10 },
);
assert.equal(
  rotateKeepObject.style.rotateDeg,
  30,
  "회전을 넘기지 않으면 현재 회전을 유지한다.",
);

// --- 상대 이동 ---

const offsetObject = createObject("x");
assert.equal(
  applyStudioTimetableObjectOffset(
    offsetObject,
    { deltaX: 5 + 1 / 3, deltaY: -3 },
    { left: 10, top: 20 },
  ),
  true,
);
assert.equal(offsetObject.style.left, 15.33);
assert.equal(offsetObject.style.top, 17);

const fitOffsetObject = createObject("x", { layoutMode: "fillParent" });
assert.equal(
  applyStudioTimetableObjectOffset(
    fitOffsetObject,
    { deltaX: 5, deltaY: 5 },
    { left: 10, top: 20 },
  ),
  false,
  "부모를 채우는 객체는 끌어서 옮길 수 없다.",
);

// --- day card 보정 값 ---

const layout = {
  left: 0,
  top: 0,
  dayOffsets: { mon: { left: 1, top: 2 } },
} as unknown as StudioTimetableDayCardsLayout;
setStudioTimetableDayOffset(layout, "tue", { left: 1 / 3, top: 4 });
assert.deepEqual(
  layout.dayOffsets,
  { mon: { left: 1, top: 2 }, tue: { left: 0.33, top: 4 } },
  "다른 날짜의 보정 값은 건드리지 않는다.",
);

// --- 시간표 객체 삭제 ---

expectFail(
  planStudioDeleteTimetableObject(createComposition(), null),
  "No timetable object selected",
  "선택이 없으면 지울 수 없다.",
);
expectFail(
  planStudioDeleteTimetableObject(createComposition(), "day-cards"),
  "Day Card Containers is locked",
  "day card 컨테이너는 지울 수 없다.",
);
expectFail(
  planStudioDeleteTimetableObject(createComposition(), "day-card:mon"),
  "Generated day cards are locked",
  "생성된 day card는 지울 수 없다.",
);
expectFail(
  planStudioDeleteTimetableObject(createComposition(), "missing"),
  "Timetable object not found",
  "없는 객체는 지울 수 없다.",
);

assert.deepEqual(
  collectStudioTimetableSubtreeIds(createComposition(), "group"),
  ["group", "child", "grandchildHost", "grandchild"],
  "자손을 깊이까지 모은다.",
);

const soloPlan = planStudioDeleteTimetableObject(createComposition(), "solo");
assert.ok(soloPlan.ok);
assert.equal(
  soloPlan.fallbackSelectionId,
  "day-cards",
  "부모가 없으면 day card 컨테이너를 고른다.",
);

const childPlan = planStudioDeleteTimetableObject(createComposition(), "child");
assert.ok(childPlan.ok);
assert.equal(
  childPlan.fallbackSelectionId,
  "group",
  "부모가 남아 있으면 부모를 고른다.",
);

const deleteComposition = createComposition();
const groupPlan = planStudioDeleteTimetableObject(deleteComposition, "group");
assert.ok(groupPlan.ok);
applyStudioDeleteTimetableObject(deleteComposition, groupPlan.objectIds);
assert.equal(deleteComposition.objects.group, undefined);
assert.equal(
  deleteComposition.objects.grandchild,
  undefined,
  "자손까지 지운다.",
);
assert.deepEqual(
  deleteComposition.rootObjectIds,
  ["day-cards", "solo"],
  "루트 목록에서도 빠진다.",
);

// day card 컨테이너는 삭제 목록에 섞여도 남는다.
const guardComposition = createComposition();
applyStudioDeleteTimetableObject(guardComposition, ["day-cards", "solo"]);
assert.ok(
  guardComposition.objects["day-cards"],
  "day card 컨테이너는 어떤 경우에도 남긴다.",
);
assert.equal(guardComposition.objects.solo, undefined);

// variant set이 지워진 객체를 가리키면 그 자리를 비우고 활성 값을 옮긴다.
const variantComposition = createComposition();
variantComposition.objects.host = createObject("host", {
  kind: "group",
  variantSet: {
    options: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
    defaultValue: "off",
    activeValue: "on",
    rootByValue: { on: "solo", off: "child" },
  },
} as Partial<StudioTimetableCompositionObject>);
applyStudioDeleteTimetableObject(variantComposition, ["solo"]);
const variantSet = variantComposition.objects.host.variantSet;
assert.equal(
  variantSet?.rootByValue.on,
  null,
  "지워진 객체를 가리키던 자리는 비운다.",
);
assert.equal(
  variantSet?.activeValue,
  "off",
  "활성 값이 사라지면 남아 있는 값으로 옮긴다.",
);

const emptyVariantComposition = createComposition();
emptyVariantComposition.objects.host = createObject("host", {
  kind: "group",
  variantSet: {
    options: [{ value: "on", label: "On" }],
    defaultValue: "off",
    activeValue: "on",
    rootByValue: { on: "solo" },
  },
} as Partial<StudioTimetableCompositionObject>);
applyStudioDeleteTimetableObject(emptyVariantComposition, ["solo"]);
assert.equal(
  emptyVariantComposition.objects.host.variantSet?.activeValue,
  "off",
  "남은 값이 없으면 기본 값으로 돌아간다.",
);

// 부모의 자식 목록에서도 빠진다.
const childLinkComposition = createComposition();
applyStudioDeleteTimetableObject(childLinkComposition, ["child"]);
assert.deepEqual(
  childLinkComposition.objects.group.childIds,
  ["grandchildHost"],
  "부모의 자식 목록에서 빠진다.",
);

// --- 안내 문구 ---

assert.equal(getStudioTimetableDeleteMessage(1), "Deleted 1 timetable object");
assert.equal(getStudioTimetableDeleteMessage(3), "Deleted 3 timetable objects");
assert.equal(
  getStudioTimetableCapabilityMessage("multi", true),
  "Multi enabled",
);
assert.equal(
  getStudioTimetableCapabilityMessage("offlineMemo", false),
  "Offline memo disabled",
);

console.log("Studio timetable command baseline checks passed.");
