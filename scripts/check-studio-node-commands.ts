/**
 * 노드 추가·삭제 명령의 기준선 가드.
 *
 * 새 노드 추가, 카드 프리셋 노드, select 소비 노드, 삭제를 클라이언트 콜백에서
 * 순수 함수로 옮겼다. 삽입 위치와 삭제 금지 규칙이 이 편집기의 구조 규칙이라
 * 값으로 고정해 둔다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioInputDefinition,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioDeleteNodes,
  applyStudioInsertNode,
  createStudioSelectConsumerNode,
  getStudioDefaultNodeStyle,
  planStudioAddNode,
  planStudioDeleteNodes,
  resolveStudioNodeInsertionParentId,
} from "../src/utils/template-studio/node-commands";

const createNode = (
  id: string,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id,
  type: "text",
  label: id,
  parentId: null,
  childIds: [],
  styleId: `${id}_style`,
  ...overrides,
});

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 1000, height: 1000, background: "#fff" },
    graph: {
      rootNodeIds: ["root", "loose"],
      nodes: {
        root: createNode("root", { type: "group", childIds: ["child"] }),
        child: createNode("child", { parentId: "root" }),
        loose: createNode("loose"),
      },
    },
    inputs: {},
    styles: {
      root_style: { left: 0, top: 0 },
      child_style: { left: 5, top: 5 },
      loose_style: { left: 10, top: 10 },
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

// --- 삽입 위치 규칙 ---

const insertionDocument = createDocument();

assert.equal(
  resolveStudioNodeInsertionParentId(
    insertionDocument,
    insertionDocument.graph.nodes.root,
  ),
  "root",
  "그룹을 고른 상태면 그 그룹 안에 넣는다.",
);
assert.equal(
  resolveStudioNodeInsertionParentId(
    insertionDocument,
    insertionDocument.graph.nodes.child,
  ),
  "root",
  "그룹이 아닌 노드를 고르면 그 형제로 넣는다.",
);

// 부모가 있는 그룹을 골랐을 때 형제가 아니라 그룹 안으로 들어가야 한다.
const nestedGroupDocument = createDocument();
nestedGroupDocument.graph.nodes.nested = createNode("nested", {
  type: "group",
  parentId: "root",
  childIds: [],
});
nestedGroupDocument.graph.nodes.root.childIds.push("nested");
assert.equal(
  resolveStudioNodeInsertionParentId(
    nestedGroupDocument,
    nestedGroupDocument.graph.nodes.nested,
  ),
  "nested",
  "부모가 있는 그룹을 골라도 그 그룹 안에 넣는다.",
);
assert.equal(
  resolveStudioNodeInsertionParentId(insertionDocument, null),
  "root",
  "고른 게 없으면 문서의 첫 루트로 넣는다.",
);
assert.equal(
  resolveStudioNodeInsertionParentId(insertionDocument, null, "card_root"),
  "card_root",
  "카드 루트를 넘기면 문서 루트보다 먼저 쓴다.",
);
assert.equal(
  resolveStudioNodeInsertionParentId(
    insertionDocument,
    insertionDocument.graph.nodes.loose,
    "card_root",
  ),
  "card_root",
  "루트 노드를 고른 상태면 카드 루트로 넣는다.",
);

const emptyDocument = createDocument();
emptyDocument.graph = { rootNodeIds: [], nodes: {} };
assert.equal(
  resolveStudioNodeInsertionParentId(emptyDocument, null),
  null,
  "빈 문서에서는 부모가 없다.",
);

// --- 기본 style ---

assert.equal(
  getStudioDefaultNodeStyle("group").backgroundColor,
  "transparent",
  "그룹 기본 배경은 투명이다.",
);
assert.equal(
  getStudioDefaultNodeStyle("image").overflow,
  "hidden",
  "이미지는 넘치는 부분을 잘라낸다.",
);
assert.equal(
  getStudioDefaultNodeStyle("text").fontSize,
  20,
  "일반 텍스트 기본 크기가 바뀌면 안 된다.",
);
assert.equal(
  getStudioDefaultNodeStyle("flexibleText").fontSize,
  32,
  "Auto Text는 더 큰 기본 크기로 시작한다.",
);
assert.equal(getStudioDefaultNodeStyle("flexibleText").fontWeight, 800);

// --- 새 노드 추가 ---

const textPlan = planStudioAddNode(createDocument(), "text", null);
assert.equal(textPlan.node.label, "New Text", "새 텍스트 이름 규칙.");
assert.deepEqual(
  textPlan.node.binding,
  { kind: "staticText", value: "New text" },
  "새 텍스트는 안내 문구를 기본 값으로 갖는다.",
);
assert.equal(textPlan.node.fit, undefined, "텍스트에는 fit이 없다.");
assert.equal(textPlan.position, "front", "새 노드는 가장 앞에 그려진다.");

const autoTextPlan = planStudioAddNode(createDocument(), "flexibleText", null);
assert.equal(autoTextPlan.node.label, "New Auto Text");
assert.equal(autoTextPlan.node.binding?.kind, "staticText");

const imageDocument = createDocument();
const imagePlanWithoutAsset = planStudioAddNode(imageDocument, "image", null);
assert.equal(
  imagePlanWithoutAsset.node.binding,
  undefined,
  "에셋이 없으면 이미지 노드를 비워 둔다.",
);
assert.equal(
  imagePlanWithoutAsset.node.fit,
  "cover",
  "이미지 기본 fit은 cover다.",
);

imageDocument.assets = {
  asset_1: { id: "asset_1", label: "A", src: "" },
} as unknown as StudioTemplateDocument["assets"];
const imagePlanWithAsset = planStudioAddNode(imageDocument, "image", null);
assert.deepEqual(
  imagePlanWithAsset.node.binding,
  { kind: "staticAsset", assetId: "asset_1" },
  "에셋이 있으면 첫 에셋을 연결한다.",
);

// 삽입 방향
const frontDocument = createDocument();
applyStudioInsertNode(frontDocument, {
  node: createNode("front_node", { parentId: "root" }),
  styleId: "front_style",
  style: { left: 1 },
  position: "front",
});
assert.deepEqual(
  frontDocument.graph.nodes.root.childIds,
  ["child", "front_node"],
  "front는 형제 목록의 끝에 넣는다.",
);
assert.deepEqual(
  frontDocument.styles.front_style,
  { left: 1 },
  "style도 함께 들어간다.",
);

const backDocument = createDocument();
applyStudioInsertNode(backDocument, {
  node: createNode("back_node", { parentId: "root" }),
  styleId: "back_style",
  style: { left: 1 },
  position: "back",
});
assert.deepEqual(
  backDocument.graph.nodes.root.childIds,
  ["back_node", "child"],
  "back은 형제 목록의 앞에 넣어 다른 객체 뒤에 깔린다.",
);

const rootInsertDocument = createDocument();
applyStudioInsertNode(rootInsertDocument, {
  node: createNode("root_node"),
  styleId: "root_node_style",
  style: {},
  position: "front",
});
assert.deepEqual(
  rootInsertDocument.graph.rootNodeIds,
  ["root", "loose", "root_node"],
  "부모가 없으면 문서 루트 목록에 넣는다.",
);

// --- select 소비 노드 ---

const selectInput = {
  id: "input_1",
  type: "select",
  scope: "entry",
  label: "Pick",
  defaultValue: "a",
  options: [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ],
} as Extract<StudioInputDefinition, { type: "select" }>;

const textConsumerDocument = createDocument();
const textConsumerId = createStudioSelectConsumerNode(textConsumerDocument, {
  parentId: null,
  input: selectInput,
  kind: "text",
  label: "Pick Label",
});
const textConsumer = textConsumerDocument.graph.nodes[textConsumerId];
assert.equal(textConsumer.type, "text");
assert.deepEqual(
  textConsumer.binding,
  { kind: "selectText", inputId: "input_1", output: "label" },
  "텍스트 소비 노드는 고른 옵션의 라벨을 보여준다.",
);
assert.equal(
  textConsumerDocument.styles[textConsumer.styleId ?? ""].fontSize,
  18,
  "텍스트 소비 노드 기본 style이 바뀌면 안 된다.",
);

const imageConsumerDocument = createDocument();
const imageConsumerId = createStudioSelectConsumerNode(imageConsumerDocument, {
  parentId: null,
  input: selectInput,
  kind: "image",
  label: "Pick Image",
});
const imageConsumer = imageConsumerDocument.graph.nodes[imageConsumerId];
assert.equal(imageConsumer.type, "image");
assert.equal(imageConsumer.fit, "cover");
assert.deepEqual(
  imageConsumer.binding,
  {
    kind: "selectAsset",
    inputId: "input_1",
    assetByOption: { a: null, b: null },
  },
  "이미지 소비 노드는 옵션마다 빈 자리를 만든다.",
);

const presetAssetDocument = createDocument();
const presetAssetId = createStudioSelectConsumerNode(presetAssetDocument, {
  parentId: null,
  input: selectInput,
  kind: "image",
  label: "Pick Image",
  assetByOption: { a: "asset_a", b: null },
});
assert.deepEqual(
  presetAssetDocument.graph.nodes[presetAssetId].binding,
  {
    kind: "selectAsset",
    inputId: "input_1",
    assetByOption: { a: "asset_a", b: null },
  },
  "옵션별 에셋을 넘기면 그대로 쓴다.",
);

// --- 삭제 ---

expectFail(
  planStudioDeleteNodes(createDocument(), []),
  "No object selected",
  "선택이 없으면 지울 수 없다.",
);

const lockedDeleteDocument = createDocument();
lockedDeleteDocument.graph.nodes.loose.locked = true;
expectFail(
  planStudioDeleteNodes(lockedDeleteDocument, ["loose"]),
  "Selection includes locked object",
  "잠긴 노드는 지울 수 없다.",
);

const mountDeleteDocument = createDocument();
mountDeleteDocument.domains = {
  timetable: { mountNodeId: "loose" },
} as StudioTemplateDocument["domains"];
expectFail(
  planStudioDeleteNodes(mountDeleteDocument, ["loose"]),
  "Root timetable object is locked",
  "시간표 root 객체는 지울 수 없다.",
);

const variantDeleteDocument = createDocument();
variantDeleteDocument.domains = {
  timetable: {
    components: {
      comp_1: { variants: { online: { rootNodeId: "loose" } } },
    },
  },
} as unknown as StudioTemplateDocument["domains"];
expectFail(
  planStudioDeleteNodes(variantDeleteDocument, ["loose"]),
  "Card variant roots and Entry Groups are locked",
  "카드 variant 루트는 지울 수 없다.",
);

const entrySlotDeleteDocument = createDocument();
entrySlotDeleteDocument.graph.nodes.loose.meta = { entrySlot: { index: 0 } };
expectFail(
  planStudioDeleteNodes(entrySlotDeleteDocument, ["loose"]),
  "Card variant roots and Entry Groups are locked",
  "Entry Group은 지울 수 없다.",
);

const lastRootDocument = createDocument();
lastRootDocument.graph.rootNodeIds = ["loose"];
expectFail(
  planStudioDeleteNodes(lastRootDocument, ["loose"]),
  "Last root object is locked",
  "마지막 루트 객체는 남겨야 한다.",
);

// 자식을 지우면 부모가 다음 선택이 된다.
const childDeleteDocument = createDocument();
const childPlan = planStudioDeleteNodes(childDeleteDocument, ["child"]);
assert.ok(childPlan.ok);
assert.equal(
  childPlan.fallbackSelectionId,
  "root",
  "자식을 지운 뒤에는 부모를 고른다.",
);
applyStudioDeleteNodes(childDeleteDocument, childPlan.nodeIds);
assert.equal(
  childDeleteDocument.graph.nodes.child,
  undefined,
  "지운 노드는 사라진다.",
);
assert.deepEqual(
  childDeleteDocument.graph.nodes.root.childIds,
  [],
  "부모의 자식 목록에서도 빠진다.",
);
assert.equal(
  childDeleteDocument.styles.child_style,
  undefined,
  "쓰던 style도 지운다.",
);

// 그룹을 지우면 자손까지 함께 사라진다.
const subtreeDeleteDocument = createDocument();
const subtreePlan = planStudioDeleteNodes(subtreeDeleteDocument, ["root"]);
assert.ok(subtreePlan.ok);
assert.equal(
  subtreePlan.fallbackSelectionId,
  null,
  "루트를 지우면 다음 선택이 없다.",
);
applyStudioDeleteNodes(subtreeDeleteDocument, subtreePlan.nodeIds);
assert.equal(subtreeDeleteDocument.graph.nodes.root, undefined);
assert.equal(
  subtreeDeleteDocument.graph.nodes.child,
  undefined,
  "자손도 함께 지운다.",
);
assert.equal(subtreeDeleteDocument.styles.root_style, undefined);
assert.equal(subtreeDeleteDocument.styles.child_style, undefined);
assert.deepEqual(
  subtreeDeleteDocument.graph.rootNodeIds,
  ["loose"],
  "루트 목록에서도 빠진다.",
);

// 조상과 자손을 같이 골라도 한 번만 처리한다.
const bothDeleteDocument = createDocument();
const bothPlan = planStudioDeleteNodes(bothDeleteDocument, ["root", "child"]);
assert.ok(bothPlan.ok);
assert.deepEqual(
  bothPlan.nodeIds,
  ["root"],
  "조상이 함께 선택되면 자손은 대상에서 빠진다.",
);

console.log("Studio node command baseline checks passed.");
