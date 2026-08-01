/**
 * 정렬과 분배 규칙의 기준선 가드.
 *
 * 이 검사가 있는 이유는 좌표계다. 좌표는 부모 기준으로 저장되므로 캔버스 기준으로
 * 계산한 값을 그대로 넣으면 묶음 안의 객체가 묶음 밖으로 튀어나간다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 정렬 단추가 어떤 축과 방향을 부르는지. 그것은 `check:studio:thumbnail-editor`가
 *   요소 나무에서 단추를 눌러 확인한다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioNodePositions,
  planStudioAlignNodes,
  planStudioDistributeNodes,
} from "../src/utils/template-studio/align-commands";

const createNode = (
  id: string,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id,
  type: "shape",
  label: id,
  parentId: null,
  childIds: [],
  styleId: `${id}_style`,
  ...overrides,
});

/**
 * 캔버스 1000×500 안에
 * - `a` 100×100 (10, 10)
 * - `b` 200×50  (300, 200)
 * - `c` 50×50   (600, 400)
 * - 묶음 `group` 400×200 (100, 100)과 그 자식 `child` 100×50 (10, 10)
 */
const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 7,
    metadata: { editor: "template-studio", kind: "thumbnail", name: "t" },
    canvas: { width: 1000, height: 500, background: "#fff" },
    graph: {
      rootNodeIds: ["a", "b", "c", "group"],
      nodes: {
        a: createNode("a"),
        b: createNode("b"),
        c: createNode("c"),
        group: createNode("group", { type: "group", childIds: ["child"] }),
        child: createNode("child", { parentId: "group" }),
      },
    },
    inputs: {},
    styles: {
      a_style: { left: 10, top: 10, width: 100, height: 100 },
      b_style: { left: 300, top: 200, width: 200, height: 50 },
      c_style: { left: 600, top: 400, width: 50, height: 50 },
      group_style: { left: 100, top: 100, width: 400, height: 200 },
      child_style: { left: 10, top: 10, width: 100, height: 50 },
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

// --- 하나만 골랐으면 부모 안에서 맞춘다 ---

const document = createDocument();

const singleRight = planStudioAlignNodes(document, ["a"], "horizontal", "end");
assert.ok(singleRight.ok);
assert.deepEqual(
  singleRight.positions,
  [{ nodeId: "a", left: 900, top: 10 }],
  "루트 노드는 캔버스 오른쪽에 붙는다.",
);

const singleCenter = planStudioAlignNodes(
  document,
  ["a"],
  "vertical",
  "center",
);
assert.ok(singleCenter.ok);
assert.deepEqual(singleCenter.positions, [{ nodeId: "a", left: 10, top: 200 }]);

/**
 * 묶음 안의 노드는 묶음 안에서 맞춘다.
 *
 * 캔버스를 기준으로 계산했다면 `left`가 900이 되어 묶음(폭 400) 밖으로 800px 튀어나간다.
 */
const childRight = planStudioAlignNodes(
  document,
  ["child"],
  "horizontal",
  "end",
);
assert.ok(childRight.ok);
assert.deepEqual(
  childRight.positions,
  [{ nodeId: "child", left: 300, top: 10 }],
  "묶음 안의 노드는 부모 좌표계에서 맞춰야 한다.",
);

const childBottom = planStudioAlignNodes(
  document,
  ["child"],
  "vertical",
  "end",
);
assert.ok(childBottom.ok);
assert.deepEqual(childBottom.positions, [
  { nodeId: "child", left: 10, top: 150 },
]);

// --- 여럿을 골랐으면 고른 범위 안에서 맞춘다 ---

const multiLeft = planStudioAlignNodes(
  document,
  ["a", "b", "c"],
  "horizontal",
  "start",
);
assert.ok(multiLeft.ok);
assert.deepEqual(
  multiLeft.positions.map((position) => position.left),
  [10, 10, 10],
  "왼쪽 정렬은 고른 것 가운데 가장 왼쪽에 맞춘다. 캔버스 0이 아니다.",
);
assert.deepEqual(
  multiLeft.positions.map((position) => position.top),
  [10, 200, 400],
  "가로 정렬은 세로 좌표를 건드리지 않는다.",
);

const multiCenter = planStudioAlignNodes(
  document,
  ["a", "b"],
  "horizontal",
  "center",
);
assert.ok(multiCenter.ok);
// 범위는 10..500, 가운데는 255
assert.deepEqual(multiCenter.positions, [
  { nodeId: "a", left: 205, top: 10 },
  { nodeId: "b", left: 155, top: 200 },
]);

// --- 부모가 섞이면 막는다 ---

expectFail(
  planStudioAlignNodes(document, ["a", "child"], "horizontal", "start"),
  "Align objects must share a parent",
  "부모가 다른 것을 함께 맞추면 한쪽이 엉뚱한 자리로 튄다.",
);
expectFail(
  planStudioAlignNodes(document, [], "horizontal", "start"),
  "No object selected",
  "고른 것이 없으면 맞출 대상이 없다.",
);

// --- 잠금과 Fit은 막는다 ---

const lockedDocument = createDocument();
lockedDocument.graph.nodes.a.locked = true;
expectFail(
  planStudioAlignNodes(lockedDocument, ["a"], "horizontal", "start"),
  "Selection includes locked object",
  "잠근 객체는 정렬로도 움직일 수 없어야 한다. 옮기기만 막으면 같은 규칙이 두 갈래가 된다.",
);

const fillParentDocument = createDocument();
fillParentDocument.graph.nodes.child.layoutMode = "fillParent";
expectFail(
  planStudioAlignNodes(fillParentDocument, ["child"], "vertical", "center"),
  "Disable Fit to move this object",
  "부모를 채우는 객체의 자리는 부모가 정한다.",
);

// 조상과 자손을 함께 골라도 한 번만 다룬다.
const nestedPlan = planStudioAlignNodes(
  document,
  ["group", "child"],
  "horizontal",
  "start",
);
assert.ok(nestedPlan.ok);
assert.deepEqual(
  nestedPlan.positions.map((position) => position.nodeId),
  ["group"],
  "조상이 함께 선택되면 자손은 대상에서 빠진다.",
);

// --- 분배 ---

expectFail(
  planStudioDistributeNodes(document, ["a", "b"], "horizontal"),
  "Select three or more objects to distribute",
  "두 개는 나눌 사이가 없다.",
);

const distributed = planStudioDistributeNodes(
  document,
  ["c", "a", "b"],
  "horizontal",
);
assert.ok(distributed.ok);
assert.deepEqual(
  distributed.positions.map((position) => position.nodeId),
  ["a", "b", "c"],
  "고른 순서가 아니라 놓인 순서대로 나눈다.",
);
// 범위 10..650, 쓰는 폭 100+200+50=350, 사이 두 곳에 (640-350)/2=145씩
assert.deepEqual(
  distributed.positions.map((position) => position.left),
  [10, 255, 600],
  "양 끝은 그대로 두고 사이만 고르게 나눈다.",
);
const gaps = [255 - (10 + 100), 600 - (255 + 200)];
assert.deepEqual(gaps, [145, 145], "간격이 서로 같아야 한다.");

const distributedVertical = planStudioDistributeNodes(
  document,
  ["a", "b", "c"],
  "vertical",
);
assert.ok(distributedVertical.ok);
// 범위 10..450, 쓰는 높이 100+50+50=200, 사이 두 곳에 (440-200)/2=120씩
assert.deepEqual(
  distributedVertical.positions.map((position) => position.top),
  [10, 230, 400],
  "세로도 양 끝을 두고 사이를 고르게 나눈다.",
);
assert.deepEqual(
  [230 - (10 + 100), 400 - (230 + 50)],
  [120, 120],
  "세로 간격도 서로 같아야 한다.",
);
assert.deepEqual(
  distributedVertical.positions.map((position) => position.left),
  [10, 300, 600],
  "세로 분배는 가로 좌표를 건드리지 않는다.",
);

// --- 계획을 문서에 적는다 ---

const appliedDocument = createDocument();
const applyPlan = planStudioAlignNodes(
  appliedDocument,
  ["child"],
  "horizontal",
  "end",
);
assert.ok(applyPlan.ok);
applyStudioNodePositions(appliedDocument, applyPlan.positions);
assert.deepEqual(
  appliedDocument.styles.child_style,
  { left: 300, top: 10, width: 100, height: 50 },
  "좌표만 바꾸고 크기는 그대로 둔다.",
);

// style이 없는 노드는 건너뛴다. 새 style을 만들면 없던 좌표가 생긴다.
const noStyleDocument = createDocument();
delete noStyleDocument.graph.nodes.a.styleId;
applyStudioNodePositions(noStyleDocument, [
  { nodeId: "a", left: 5, top: 5 },
  { nodeId: "missing", left: 5, top: 5 },
]);
assert.deepEqual(noStyleDocument.styles.a_style, {
  left: 10,
  top: 10,
  width: 100,
  height: 100,
});

console.log("Studio align command baseline checks passed.");
