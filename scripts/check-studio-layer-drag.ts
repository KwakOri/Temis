/**
 * 카드 레이어 끌어 옮기기 규칙의 기준선 가드.
 *
 * 레이어 패널에서는 모든 노드가 똑같은 행으로 보이지만, 시간표가 찾아 쓰는
 * 노드는 부모가 바뀌면 안 된다. 카드 변형의 뿌리나 Entry Group 자리를 다른
 * 부모 밑으로 옮기면 시간표가 그 노드를 못 찾아 요일 카드가 빈 칸으로 그려진다.
 * 화면에서는 옮겨진 것처럼 보이고 저장한 뒤에야 알게 되므로 옮기기 전에 막는다.
 *
 * 이 저장소에는 DOM 테스트 환경이 없어서 훅을 직접 부를 수 없다. 그래서 판단
 * 로직을 순수 함수로 두고 그 계약을 여기서 고정한다.
 */
import assert from "node:assert/strict";
import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  getStudioLayerDropPosition,
  getStudioLayerPointerRatio,
  planStudioLayerDrop,
  resolveStudioLayerDropPosition,
  shouldAutoExpandStudioLayerGroup,
  validateStudioLayerMove,
} from "../src/utils/template-studio/layer-drag";
const createNode = (
  id: string,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode =>
  ({
    id,
    type: "text",
    label: id,
    parentId: null,
    childIds: [],
    ...overrides,
  }) as StudioGraphNode;
const createDocument = (
  nodes: StudioGraphNode[],
  rootNodeIds: string[],
  domains?: StudioTemplateDocument["domains"],
): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: {
      rootNodeIds,
      nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    },
    inputs: {},
    styles: {},
    assets: {},
    domains,
  }) as unknown as StudioTemplateDocument;
// --- 행 안에서의 위치 기준선 ---
//
// 묶음은 가운데 절반이 안쪽이고, 묶음이 아닌 행은 절반으로만 갈린다.
assert.equal(
  getStudioLayerPointerRatio(30, { top: 10, height: 40 }),
  0.5,
  "행 가운데는 0.5다.",
);
assert.equal(
  getStudioLayerPointerRatio(10, { top: 10, height: 0 }),
  0.5,
  "높이를 못 읽은 행은 가운데로 본다. 0으로 나누면 판단이 뒤집힌다.",
);
assert.deepEqual(
  [0, 0.24, 0.25, 0.5, 0.75, 0.76, 1].map((ratio) =>
    getStudioLayerDropPosition(ratio, true),
  ),
  ["before", "before", "inside", "inside", "inside", "after", "after"],
  "묶음은 위아래 4분의 1만 형제 자리이고 나머지는 안쪽이다.",
);
assert.deepEqual(
  [0, 0.49, 0.5, 1].map((ratio) => getStudioLayerDropPosition(ratio, false)),
  ["before", "before", "after", "after"],
  "묶음이 아닌 행에는 안쪽이 없다. 넣을 수 없는 자리를 보여 주면 안 된다.",
);
// --- 놓을 때 쓰는 위치 기준선 ---
assert.equal(
  resolveStudioLayerDropPosition(
    { nodeId: "target", position: "inside" },
    "target",
    "before",
  ),
  "inside",
  "표시선을 보여 준 자리에 놓았으면 그 위치를 쓴다.",
);
assert.equal(
  resolveStudioLayerDropPosition(
    { nodeId: "other", position: "inside" },
    "target",
    "before",
  ),
  "before",
  "다른 행 위에서 놓았으면 포인터로 다시 계산한 위치를 쓴다.",
);
assert.equal(
  resolveStudioLayerDropPosition(null, "target", "after"),
  "after",
  "표시선이 없어도 놓을 수는 있다.",
);
// --- 자동 펼침 대상 기준선 ---
const group = createNode("group", { type: "group", childIds: ["child"] });
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "inside",
    targetNode: group,
    ok: true,
    collapsed: true,
  }),
  true,
  "접힌 묶음 안쪽에 넣으려는 중이면 펼친다.",
);
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "before",
    targetNode: group,
    ok: true,
    collapsed: true,
  }),
  false,
  "형제 자리에 넣으려는 중이면 그 묶음을 열어 줄 이유가 없다.",
);
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "inside",
    targetNode: group,
    ok: false,
    collapsed: true,
  }),
  false,
  "놓을 수 없는 자리를 열어 주면 들어갈 수 없는 곳을 안내하는 셈이다.",
);
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "inside",
    targetNode: createNode("empty", { type: "group" }),
    ok: true,
    collapsed: true,
  }),
  false,
  "빈 묶음은 펼쳐도 보여 줄 것이 없다.",
);
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "inside",
    targetNode: group,
    ok: true,
    collapsed: false,
  }),
  false,
  "이미 펼쳐진 묶음은 다시 펼칠 것이 없다.",
);
assert.equal(
  shouldAutoExpandStudioLayerGroup({
    position: "inside",
    targetNode: createNode("text"),
    ok: true,
    collapsed: true,
  }),
  false,
  "묶음이 아닌 행은 펼칠 대상이 아니다.",
);
// --- 옮길 수 있는지 기준선 ---
//
// 패널에서 본 위/아래는 저장 순서와 반대다. 이 뒤집기를 검증 함수가 직접 하므로
// 호출한 쪽에서 또 뒤집으면 검증과 실제 이동이 다른 자리를 본다.
const plainDocument = createDocument(
  [createNode("a"), createNode("b"), createNode("c")],
  ["a", "b", "c"],
);
const plainMove = validateStudioLayerMove(plainDocument, ["a"], "c", "before");
assert.equal(plainMove.ok, true, "여느 노드는 형제 사이로 옮길 수 있다.");
assert.equal(
  plainMove.targetParentId,
  null,
  "뿌리 노드 사이로 옮기면 부모가 없다.",
);
// 시간표 뿌리 객체는 부모가 바뀌면 안 된다. 시간표가 이 노드를 기준으로 요일
// 카드를 그리므로, 다른 묶음 안으로 들어가면 시간표 전체가 자리를 잃는다.
const mountDocument = createDocument(
  [
    createNode("mount"),
    createNode("group", { type: "group", childIds: ["child"] }),
    createNode("child", { parentId: "group" }),
  ],
  ["mount", "group"],
  { timetable: { mountNodeId: "mount" } } as StudioTemplateDocument["domains"],
);
assert.equal(
  validateStudioLayerMove(mountDocument, ["mount"], "group", "inside").reason,
  "Root timetable object is locked",
  "시간표 뿌리 객체를 다른 묶음 안으로 옮길 수 없다.",
);
assert.equal(
  validateStudioLayerMove(mountDocument, ["mount"], "group", "before").ok,
  true,
  "같은 부모 안에서 순서만 바꾸는 것은 허용한다.",
);
// 카드 변형의 뿌리와 Entry Group 자리도 부모를 바꿀 수 없다.
const cardDocument = createDocument(
  [
    createNode("variantRoot", { parentId: "cardGroup" }),
    createNode("entrySlot", {
      parentId: "cardGroup",
      meta: { entrySlot: { groupId: "g1", index: 0 } },
    } as Partial<StudioGraphNode>),
    createNode("sibling", { parentId: "cardGroup" }),
    createNode("cardGroup", {
      type: "group",
      childIds: ["variantRoot", "entrySlot", "sibling"],
    }),
    createNode("outside", { type: "group", childIds: [] }),
  ],
  ["cardGroup", "outside"],
  {
    timetable: {
      components: {
        c1: { variants: { online: { rootNodeId: "variantRoot" } } },
      },
    },
  } as unknown as StudioTemplateDocument["domains"],
);
assert.equal(
  validateStudioLayerMove(cardDocument, ["variantRoot"], "outside", "inside")
    .reason,
  "Card variant roots and Entry Groups cannot be reparented",
  "카드 변형 뿌리를 다른 부모 밑으로 옮기면 카드가 빈 칸으로 그려진다.",
);
assert.equal(
  validateStudioLayerMove(cardDocument, ["entrySlot"], "outside", "inside")
    .reason,
  "Card variant roots and Entry Groups cannot be reparented",
  "Entry Group 자리도 부모가 바뀌면 안 된다.",
);
assert.equal(
  validateStudioLayerMove(cardDocument, ["variantRoot"], "sibling", "before")
    .ok,
  true,
  "카드 안에서 순서만 바꾸는 것은 허용한다.",
);
assert.equal(
  validateStudioLayerMove(cardDocument, ["sibling"], "outside", "inside").ok,
  true,
  "보호 대상이 아닌 노드는 다른 묶음으로 옮길 수 있다.",
);
// 그래프가 먼저 막는 경우는 시간표 잠금을 보기 전에 그대로 돌려준다.
assert.equal(
  validateStudioLayerMove(cardDocument, ["cardGroup"], "variantRoot", "inside")
    .ok,
  false,
  "자기 자손 안으로는 옮길 수 없다.",
);
// --- 드롭 결과 기준선 ---
//
// 패널에서 본 위/아래를 저장 순서로 뒤집는 일은 여기서 한 번만 한다. 두 곳에서
// 뒤집으면 서로 상쇄되어 옮긴 방향이 반대로 저장된다.
const dragState = { primaryNodeId: "a", nodeIds: ["a"] };
assert.deepEqual(
  planStudioLayerDrop(
    plainDocument,
    dragState,
    { nodeId: "c", position: "before" },
    "c",
    "after",
  ),
  {
    kind: "move",
    params: {
      sourceNodeIds: ["a"],
      targetNodeId: "c",
      position: "after",
      preserveCanvasPosition: true,
    },
    primaryNodeId: "a",
    expandTargetGroup: false,
  },
  "패널에서 위에 놓으면 문서에는 뒤에 저장한다. 좌표는 화면에서 같은 자리에 남도록 다시 계산한다.",
);
assert.equal(
  (
    planStudioLayerDrop(
      plainDocument,
      dragState,
      { nodeId: "c", position: "after" },
      "c",
      "before",
    ) as { params: { position: string } }
  ).params.position,
  "before",
  "패널에서 아래에 놓으면 문서에는 앞에 저장한다.",
);
const insidePlan = planStudioLayerDrop(
  mountDocument,
  { primaryNodeId: "child", nodeIds: ["child"] },
  { nodeId: "group", position: "inside" },
  "group",
  "before",
);
assert.deepEqual(
  insidePlan,
  {
    kind: "move",
    params: {
      sourceNodeIds: ["child"],
      targetNodeId: "group",
      position: "inside",
      preserveCanvasPosition: true,
    },
    primaryNodeId: "child",
    expandTargetGroup: true,
  },
  "안쪽에 넣는 것은 뒤집지 않고, 그 묶음을 펼쳐 두라고 알린다. 접힌 채로 두면 방금 옮긴 것이 사라진 것처럼 보인다.",
);
assert.deepEqual(
  planStudioLayerDrop(
    mountDocument,
    { primaryNodeId: "mount", nodeIds: ["mount"] },
    { nodeId: "group", position: "inside" },
    "group",
    "inside",
  ),
  { kind: "blocked", reason: "Root timetable object is locked" },
  "막힌 자리에 놓으면 이유만 알리고 문서는 그대로 둔다.",
);
assert.equal(
  (
    planStudioLayerDrop(
      plainDocument,
      dragState,
      { nodeId: "b", position: "before" },
      "c",
      "after",
    ) as { params: { position: string } }
  ).params.position,
  "before",
  "표시선을 그려 둔 자리와 놓인 자리가 다르면 포인터로 다시 계산한 위치를 뒤집어 쓴다.",
);
console.log("Studio card layer drag baseline checks passed.");
