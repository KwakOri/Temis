/**
 * 그래프 편집 명령의 기준선 가드.
 *
 * 그룹 만들기·풀기, 복제, 레이어 순서 이동, 잠금 토글은 클라이언트 컴포넌트
 * 안의 콜백에서 순수 함수로 옮겼다. 판단(plan)과 변경(apply)을 나눴으므로 문서
 * 하나로 계약을 그대로 확인할 수 있다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioDuplicateNodes,
  applyStudioGroupNodes,
  applyStudioLayerMove,
  applyStudioToggleNodeHidden,
  applyStudioToggleNodeLock,
  applyStudioUngroupNodes,
  getStudioLayerMoveMessage,
  getStudioNodeVisibilityMessage,
  planStudioDuplicateNodes,
  planStudioGroupNodes,
  planStudioLayerMove,
  planStudioToggleNodeHidden,
  planStudioToggleNodeLock,
  planStudioUngroupNodes,
} from "../src/utils/template-studio/graph-commands";
import { getStudioTopLevelNodeIds } from "../src/utils/template-studio/graph-nodes";

type NodeOverrides = Partial<StudioGraphNode>;

const createNode = (
  id: string,
  overrides: NodeOverrides = {},
): StudioGraphNode => ({
  id,
  type: "text",
  label: id,
  parentId: null,
  childIds: [],
  styleId: `${id}_style`,
  ...overrides,
});

/**
 * 최소 문서.
 *
 * rootNodeIds는 저장 순서(뒤에서 앞)다. 즉 배열 끝이 가장 앞에 그려진다.
 */
const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 1000, height: 1000, background: "#fff" },
    graph: {
      rootNodeIds: ["a", "b", "c"],
      nodes: {
        a: createNode("a"),
        b: createNode("b"),
        c: createNode("c"),
      },
    },
    inputs: {},
    styles: {
      a_style: {
        position: "absolute",
        left: 10,
        top: 20,
        width: 100,
        height: 50,
      },
      b_style: {
        position: "absolute",
        left: 60,
        top: 40,
        width: 100,
        height: 50,
      },
      c_style: {
        position: "absolute",
        left: 500,
        top: 500,
        width: 10,
        height: 10,
      },
    },
    assets: {},
  }) as unknown as StudioTemplateDocument;

const expectFail = (
  result: { ok: boolean; reason?: string },
  reason: string,
  message: string,
) => {
  assert.equal(result.ok, false, message);
  assert.equal(result.reason, reason, message);
};

// --- 최상위 노드만 대상으로 삼는다 ---

const nestedDocument = createDocument();
nestedDocument.graph.nodes.group = createNode("group", {
  type: "group",
  childIds: ["a"],
});
nestedDocument.graph.nodes.a.parentId = "group";
nestedDocument.graph.rootNodeIds = ["group", "b", "c"];

assert.deepEqual(
  getStudioTopLevelNodeIds(nestedDocument, ["group", "a", "b"]),
  ["group", "b"],
  "조상이 함께 선택된 노드는 명령 대상에서 빠진다.",
);

// --- 그룹 만들기 ---

expectFail(
  planStudioGroupNodes(createDocument(), ["a"]),
  "Select multiple objects to group",
  "하나만 선택하면 그룹을 만들 수 없다.",
);

const lockedDocument = createDocument();
lockedDocument.graph.nodes.a.locked = true;
expectFail(
  planStudioGroupNodes(lockedDocument, ["a", "b"]),
  "Selection includes locked object",
  "잠긴 노드가 섞이면 그룹을 만들 수 없다.",
);

const entrySlotDocument = createDocument();
entrySlotDocument.graph.nodes.a.meta = {
  entrySlot: { index: 0 },
};
expectFail(
  planStudioGroupNodes(entrySlotDocument, ["a", "b"]),
  "Entry Groups cannot be grouped",
  "Entry Group은 그룹으로 묶을 수 없다.",
);

const mixedParentDocument = createDocument();
mixedParentDocument.graph.nodes.parent = createNode("parent", {
  type: "group",
  childIds: ["a"],
});
mixedParentDocument.graph.nodes.a.parentId = "parent";
expectFail(
  planStudioGroupNodes(mixedParentDocument, ["a", "b"]),
  "Group objects must share a parent",
  "부모가 다르면 그룹으로 묶을 수 없다.",
);

const groupDocument = createDocument();
const groupPlan = planStudioGroupNodes(groupDocument, ["b", "a"]);
assert.ok(groupPlan.ok, "같은 부모의 노드 둘은 묶을 수 있다.");
assert.deepEqual(
  groupPlan.orderedNodeIds,
  ["a", "b"],
  "그룹 대상은 저장 순서대로 정렬한다.",
);
assert.deepEqual(
  groupPlan.bounds,
  { left: 10, top: 20, width: 150, height: 70 },
  "그룹 크기는 자식을 감싸는 사각형이다.",
);
assert.equal(
  groupPlan.insertIndex,
  0,
  "그룹은 가장 뒤쪽 자식 자리에 들어간다.",
);
assert.equal(groupPlan.parentId, null);

applyStudioGroupNodes(groupDocument, groupPlan);
const groupNode = groupDocument.graph.nodes[groupPlan.groupNodeId];
assert.ok(groupNode, "그룹 노드가 만들어진다.");
assert.equal(groupNode.type, "group");
assert.equal(groupNode.label, "Group");
assert.deepEqual(groupNode.childIds, ["a", "b"]);
assert.deepEqual(
  groupDocument.graph.rootNodeIds,
  [groupPlan.groupNodeId, "c"],
  "묶인 노드는 형제 목록에서 빠지고 그룹이 그 자리에 들어간다.",
);
assert.deepEqual(
  groupDocument.styles[groupPlan.groupStyleId],
  {
    position: "absolute",
    left: 10,
    top: 20,
    width: 150,
    height: 70,
  },
  "그룹 style이 자식을 감싸는 사각형으로 만들어진다.",
);
assert.deepEqual(
  groupDocument.styles.a_style,
  { position: "absolute", left: 0, top: 0, width: 100, height: 50 },
  "자식 좌표는 그룹 기준으로 다시 계산한다.",
);
assert.deepEqual(
  groupDocument.styles.b_style,
  { position: "absolute", left: 50, top: 20, width: 100, height: 50 },
  "화면에서 보이는 위치가 유지돼야 한다.",
);
assert.equal(groupDocument.graph.nodes.a.parentId, groupPlan.groupNodeId);

// --- 그룹 풀기 ---

expectFail(
  planStudioUngroupNodes(createDocument(), ["a"]),
  "No group selected",
  "그룹이 아닌 노드는 풀 수 없다.",
);

const timetableRootDocument = createDocument();
timetableRootDocument.graph.nodes.mount = createNode("mount", {
  type: "group",
  childIds: [],
});
timetableRootDocument.graph.rootNodeIds.push("mount");
timetableRootDocument.domains = {
  timetable: { mountNodeId: "mount" },
} as StudioTemplateDocument["domains"];
expectFail(
  planStudioUngroupNodes(timetableRootDocument, ["mount"]),
  "Root timetable object is locked",
  "시간표 root 객체는 풀 수 없다.",
);

const ungroupDocument = createDocument();
const ungroupPlan = planStudioUngroupNodes(ungroupDocument, ["b", "a"]);
expectFail(ungroupPlan, "No group selected", "그룹이 없으면 실패한다.");

// 그룹을 만든 문서를 그대로 풀어서 좌표가 되돌아오는지 본다.
const roundTripDocument = createDocument();
const roundTripPlan = planStudioGroupNodes(roundTripDocument, ["a", "b"]);
assert.ok(roundTripPlan.ok);
applyStudioGroupNodes(roundTripDocument, roundTripPlan);
const roundTripUngroup = planStudioUngroupNodes(roundTripDocument, [
  roundTripPlan.groupNodeId,
]);
assert.ok(roundTripUngroup.ok, "만든 그룹은 다시 풀 수 있다.");
const releasedNodeIds = applyStudioUngroupNodes(
  roundTripDocument,
  roundTripUngroup.groupNodeIds,
);
assert.deepEqual(releasedNodeIds, ["a", "b"], "풀려난 노드를 알려준다.");
assert.deepEqual(
  roundTripDocument.graph.rootNodeIds,
  ["a", "b", "c"],
  "그룹이 있던 자리에 자식을 펼친다.",
);
assert.equal(
  roundTripDocument.graph.nodes[roundTripPlan.groupNodeId],
  undefined,
  "그룹 노드는 지워진다.",
);
assert.equal(
  roundTripDocument.styles[roundTripPlan.groupStyleId],
  undefined,
  "그룹 style도 지워진다.",
);
assert.deepEqual(
  roundTripDocument.styles.a_style,
  { position: "absolute", left: 10, top: 20, width: 100, height: 50 },
  "묶기와 풀기를 왕복하면 좌표가 원래대로 돌아온다.",
);
assert.deepEqual(roundTripDocument.styles.b_style, {
  position: "absolute",
  left: 60,
  top: 40,
  width: 100,
  height: 50,
});
assert.equal(roundTripDocument.graph.nodes.a.parentId, null);

// --- 복제 ---

expectFail(
  planStudioDuplicateNodes(createDocument(), []),
  "No object selected",
  "선택이 없으면 복제할 수 없다.",
);

const duplicateDocument = createDocument();
const duplicatePlan = planStudioDuplicateNodes(duplicateDocument, ["a"]);
assert.ok(duplicatePlan.ok);
const duplicateRootIds = applyStudioDuplicateNodes(
  duplicateDocument,
  duplicatePlan,
);
assert.equal(duplicateRootIds.length, 1, "복제본 하나가 만들어진다.");
const duplicatedNodeId = duplicateRootIds[0];
assert.notEqual(duplicatedNodeId, "a", "복제본은 새 id를 받는다.");
assert.equal(
  duplicateDocument.graph.nodes[duplicatedNodeId].label,
  "a Copy",
  "복제본 이름에 Copy를 붙인다.",
);
assert.deepEqual(
  duplicateDocument.graph.rootNodeIds,
  ["a", duplicatedNodeId, "b", "c"],
  "복제본은 원본 바로 뒤에 들어간다.",
);
const duplicatedStyleId =
  duplicateDocument.graph.nodes[duplicatedNodeId].styleId ?? "";
assert.deepEqual(
  duplicateDocument.styles[duplicatedStyleId],
  { position: "absolute", left: 34, top: 44, width: 100, height: 50 },
  "복제본은 원본에서 24px 밀린 자리에 놓인다.",
);
assert.deepEqual(
  duplicateDocument.styles.a_style,
  { position: "absolute", left: 10, top: 20, width: 100, height: 50 },
  "원본 좌표는 그대로다.",
);

// 자손도 함께 복제되고 entry slot 표시는 남지 않는다.
const subtreeDocument = createDocument();
subtreeDocument.graph.nodes.parent = createNode("parent", {
  type: "group",
  childIds: ["child"],
});
subtreeDocument.graph.nodes.child = createNode("child", {
  parentId: "parent",
  meta: { entrySlot: { index: 0 } },
});
subtreeDocument.styles.parent_style = { left: 0, top: 0 };
subtreeDocument.styles.child_style = { left: 5, top: 5 };
subtreeDocument.graph.rootNodeIds = ["parent"];

const subtreePlan = planStudioDuplicateNodes(subtreeDocument, ["parent"]);
assert.ok(subtreePlan.ok);
const [duplicatedParentId] = applyStudioDuplicateNodes(
  subtreeDocument,
  subtreePlan,
);
const duplicatedParent = subtreeDocument.graph.nodes[duplicatedParentId];
assert.equal(duplicatedParent.childIds.length, 1, "자손도 함께 복제된다.");
const duplicatedChild =
  subtreeDocument.graph.nodes[duplicatedParent.childIds[0]];
assert.equal(
  duplicatedChild.meta?.entrySlot,
  undefined,
  "복제본은 entry slot 자리를 물려받지 않는다.",
);
assert.equal(
  duplicatedChild.label,
  "child",
  "자손 이름에는 Copy를 붙이지 않는다.",
);
assert.deepEqual(
  subtreeDocument.styles[duplicatedChild.styleId ?? ""],
  { left: 5, top: 5 },
  "자손 좌표는 밀지 않는다. 부모만 밀린다.",
);

// meta가 없는 노드도 복제할 수 있어야 한다. 추출 전에는 여기서 예외가 났다.
const metaFreeDocument = createDocument();
delete metaFreeDocument.graph.nodes.a.meta;
const metaFreePlan = planStudioDuplicateNodes(metaFreeDocument, ["a"]);
assert.ok(metaFreePlan.ok);
const [metaFreeDuplicateId] = applyStudioDuplicateNodes(
  metaFreeDocument,
  metaFreePlan,
);
assert.ok(
  metaFreeDocument.graph.nodes[metaFreeDuplicateId],
  "meta 없는 노드도 복제된다.",
);
assert.equal(
  metaFreeDocument.graph.nodes[metaFreeDuplicateId].meta,
  undefined,
  "meta가 없던 노드는 복제본에도 meta가 없다.",
);

// --- 레이어 순서 이동 ---

expectFail(
  planStudioLayerMove(createDocument(), null, "front"),
  "No object selected",
  "선택이 없으면 순서를 바꿀 수 없다.",
);

const lockedMoveDocument = createDocument();
lockedMoveDocument.graph.nodes.a.locked = true;
expectFail(
  planStudioLayerMove(lockedMoveDocument, "a", "front"),
  "Object is locked",
  "잠긴 노드는 순서를 바꿀 수 없다.",
);

expectFail(
  planStudioLayerMove(createDocument(), "c", "front"),
  "Already at front",
  "가장 앞에 있으면 더 올릴 수 없다.",
);
expectFail(
  planStudioLayerMove(createDocument(), "a", "back"),
  "Already at back",
  "가장 뒤에 있으면 더 내릴 수 없다.",
);
expectFail(
  planStudioLayerMove(createDocument(), "c", "forward"),
  "Already at front",
  "한 칸 올릴 자리가 없으면 알린다.",
);

const frontPlan = planStudioLayerMove(createDocument(), "a", "front");
assert.ok(frontPlan.ok);
assert.equal(frontPlan.targetIndex, 2, "front는 형제 목록의 끝으로 간다.");

const forwardDocument = createDocument();
const forwardPlan = planStudioLayerMove(forwardDocument, "a", "forward");
assert.ok(forwardPlan.ok);
assert.equal(forwardPlan.targetIndex, 1);
applyStudioLayerMove(forwardDocument, forwardPlan);
assert.deepEqual(
  forwardDocument.graph.rootNodeIds,
  ["b", "a", "c"],
  "forward는 한 칸 앞으로 옮긴다.",
);

const backwardDocument = createDocument();
const backwardPlan = planStudioLayerMove(backwardDocument, "c", "backward");
assert.ok(backwardPlan.ok);
applyStudioLayerMove(backwardDocument, backwardPlan);
assert.deepEqual(
  backwardDocument.graph.rootNodeIds,
  ["a", "c", "b"],
  "backward는 한 칸 뒤로 옮긴다.",
);

const backDocument = createDocument();
const backPlan = planStudioLayerMove(backDocument, "c", "back");
assert.ok(backPlan.ok);
applyStudioLayerMove(backDocument, backPlan);
assert.deepEqual(
  backDocument.graph.rootNodeIds,
  ["c", "a", "b"],
  "back은 형제 목록의 맨 앞으로 옮긴다.",
);

// 그룹 안의 노드는 그룹 안에서만 움직인다.
const nestedMoveDocument = createDocument();
nestedMoveDocument.graph.nodes.parent = createNode("parent", {
  type: "group",
  childIds: ["a", "b"],
});
nestedMoveDocument.graph.nodes.a.parentId = "parent";
nestedMoveDocument.graph.nodes.b.parentId = "parent";
nestedMoveDocument.graph.rootNodeIds = ["parent", "c"];
const nestedMovePlan = planStudioLayerMove(nestedMoveDocument, "a", "front");
assert.ok(nestedMovePlan.ok);
applyStudioLayerMove(nestedMoveDocument, nestedMovePlan);
assert.deepEqual(
  nestedMoveDocument.graph.nodes.parent.childIds,
  ["b", "a"],
  "그룹 안의 노드는 형제 안에서만 순서가 바뀐다.",
);
assert.deepEqual(
  nestedMoveDocument.graph.rootNodeIds,
  ["parent", "c"],
  "부모의 순서는 건드리지 않는다.",
);

assert.equal(getStudioLayerMoveMessage("front"), "Brought to front");
assert.equal(getStudioLayerMoveMessage("back"), "Sent to back");
assert.equal(getStudioLayerMoveMessage("forward"), "Brought forward");
assert.equal(getStudioLayerMoveMessage("backward"), "Sent backward");

// --- 잠금 토글 ---

expectFail(
  planStudioToggleNodeLock(createDocument(), []),
  "No object selected",
  "선택이 없으면 잠글 수 없다.",
);

const lockPlan = planStudioToggleNodeLock(createDocument(), ["a", "b"]);
assert.ok(lockPlan.ok);
assert.equal(lockPlan.nextLocked, true, "안 잠긴 게 섞여 있으면 잠근다.");

const partiallyLockedDocument = createDocument();
partiallyLockedDocument.graph.nodes.a.locked = true;
const partialPlan = planStudioToggleNodeLock(partiallyLockedDocument, [
  "a",
  "b",
]);
assert.ok(partialPlan.ok);
assert.equal(
  partialPlan.nextLocked,
  true,
  "일부만 잠긴 상태에서는 전체를 잠근다.",
);

const allLockedDocument = createDocument();
allLockedDocument.graph.nodes.a.locked = true;
allLockedDocument.graph.nodes.b.locked = true;
const unlockPlan = planStudioToggleNodeLock(allLockedDocument, ["a", "b"]);
assert.ok(unlockPlan.ok);
assert.equal(unlockPlan.nextLocked, false, "전부 잠겨 있으면 잠금을 푼다.");
applyStudioToggleNodeLock(allLockedDocument, unlockPlan);
assert.equal(allLockedDocument.graph.nodes.a.locked, false);
assert.equal(allLockedDocument.graph.nodes.b.locked, false);

// --- 숨김 토글 ---

expectFail(
  planStudioToggleNodeHidden(createDocument(), []),
  "No object selected",
  "선택이 없으면 감출 수 없다.",
);

const hidePlan = planStudioToggleNodeHidden(createDocument(), ["a", "b"]);
assert.ok(hidePlan.ok);
assert.equal(hidePlan.nextHidden, true, "보이는 게 섞여 있으면 감춘다.");

const partiallyHiddenDocument = createDocument();
partiallyHiddenDocument.graph.nodes.a.hidden = true;
const partialHiddenPlan = planStudioToggleNodeHidden(partiallyHiddenDocument, [
  "a",
  "b",
]);
assert.ok(partialHiddenPlan.ok);
assert.equal(
  partialHiddenPlan.nextHidden,
  true,
  "섞여 있을 때 각각 뒤집으면 여러 개를 고른 상태에서 무엇이 감춰질지 예측할 수 없다.",
);

const allHiddenDocument = createDocument();
allHiddenDocument.graph.nodes.a.hidden = true;
allHiddenDocument.graph.nodes.b.hidden = true;
const showPlan = planStudioToggleNodeHidden(allHiddenDocument, ["a", "b"]);
assert.ok(showPlan.ok);
assert.equal(showPlan.nextHidden, false, "전부 감춰져 있으면 되살린다.");
applyStudioToggleNodeHidden(allHiddenDocument, showPlan);
assert.equal(allHiddenDocument.graph.nodes.a.hidden, false);
assert.equal(allHiddenDocument.graph.nodes.b.hidden, false);

/**
 * 잠긴 노드도 감출 수 있다.
 *
 * 감추기는 문서 구조를 바꾸지 않고 보이는 것만 바꾼다. 잠근 배경을 잠시 치우고 그 뒤를
 * 보는 것이 흔한 작업이므로 잠금과 같은 규칙으로 막지 않는다.
 */
const lockedHiddenDocument = createDocument();
lockedHiddenDocument.graph.nodes.a.locked = true;
const lockedHiddenPlan = planStudioToggleNodeHidden(lockedHiddenDocument, [
  "a",
]);
assert.ok(lockedHiddenPlan.ok, "잠긴 노드도 감출 수 있어야 한다.");
applyStudioToggleNodeHidden(lockedHiddenDocument, lockedHiddenPlan);
assert.equal(lockedHiddenDocument.graph.nodes.a.hidden, true);
assert.equal(
  lockedHiddenDocument.graph.nodes.a.locked,
  true,
  "감추기가 잠금을 건드리면 안 된다.",
);

// 조상과 자손을 같이 골라도 한 번만 다룬다.
const nestedHiddenDocument = createDocument();
nestedHiddenDocument.graph.nodes.a = createNode("a", {
  type: "group",
  childIds: ["nested"],
});
nestedHiddenDocument.graph.nodes.nested = createNode("nested", {
  parentId: "a",
});
const nestedHiddenPlan = planStudioToggleNodeHidden(nestedHiddenDocument, [
  "a",
  "nested",
]);
assert.ok(nestedHiddenPlan.ok);
assert.deepEqual(
  nestedHiddenPlan.nodeIds,
  ["a"],
  "조상이 함께 선택되면 자손은 대상에서 빠진다. 렌더러가 조상만 보고도 자손을 함께 감춘다.",
);

assert.equal(getStudioNodeVisibilityMessage(true), "Hidden");
assert.equal(getStudioNodeVisibilityMessage(false), "Shown");

console.log("Studio graph command baseline checks passed.");
