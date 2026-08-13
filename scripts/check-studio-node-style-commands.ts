/**
 * 노드 이동·style 변경 명령의 기준선 가드.
 *
 * 캔버스 드래그, 키보드 이동, style 값 변경, 부모 채우기 토글, 상태 사이 style
 * 전파를 클라이언트 콜백에서 순수 함수로 옮겼다. 좌표를 다루는 규칙이라 값으로
 * 고정해 둔다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  applyStudioNodeFitParent,
  applyStudioNodeOffset,
  applyStudioNodeStyleValue,
  applyStudioNodeTextAlignment,
  ensureStudioNodeStyleId,
  getStudioTextAlignment,
  getStudioTextJustifyContent,
  getStudioVariantStyleMessage,
  planStudioNudgeNodes,
  resolveStudioDragTargetNodeIds,
} from "../src/utils/template-studio/node-style-commands";

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
    canvas: { width: 1000, height: 800, background: "#fff" },
    graph: {
      rootNodeIds: ["a", "b", "group"],
      nodes: {
        a: createNode("a"),
        b: createNode("b"),
        group: createNode("group", { type: "group", childIds: ["fitted"] }),
        fitted: createNode("fitted", {
          parentId: "group",
          layoutMode: "fillParent",
        }),
        styleless: createNode("styleless", { styleId: undefined }),
      },
    },
    inputs: {},
    styles: {
      a_style: { left: 10, top: 20 },
      b_style: { left: 100.5, top: 200.25 },
      group_style: { left: 0, top: 0, width: 300, height: 300 },
      fitted_style: { left: 0, top: 0, width: 300, height: 300 },
    },
    assets: {},
  }) as unknown as StudioTemplateDocument;

// --- style 레코드 보장 ---

const ensureDocument = createDocument();
assert.equal(
  ensureStudioNodeStyleId(ensureDocument, ensureDocument.graph.nodes.a),
  "a_style",
  "이미 style이 있으면 그대로 쓴다.",
);

const styleless = ensureDocument.graph.nodes.styleless;
const createdStyleId = ensureStudioNodeStyleId(ensureDocument, styleless);
assert.ok(createdStyleId, "style이 없으면 새로 만든다.");
assert.equal(
  styleless.styleId,
  createdStyleId,
  "만든 style을 노드에 연결한다.",
);
assert.equal(
  ensureDocument.styles[createdStyleId].fontSize,
  20,
  "새 style은 노드 종류의 기본값으로 시작한다.",
);

// --- 위치 이동 ---

const offsetDocument = createDocument();
applyStudioNodeOffset(offsetDocument, ["a", "b"], { deltaX: 5, deltaY: -3 });
assert.deepEqual(
  offsetDocument.styles.a_style,
  { left: 15, top: 17 },
  "여러 노드를 같은 만큼 옮긴다.",
);
assert.deepEqual(
  offsetDocument.styles.b_style,
  { left: 105.5, top: 197.25 },
  "반올림을 끄면 소수를 그대로 둔다.",
);

const roundedDocument = createDocument();
applyStudioNodeOffset(
  roundedDocument,
  ["b"],
  { deltaX: 1 / 3, deltaY: 2 / 3 },
  { round: true },
);
assert.deepEqual(
  roundedDocument.styles.b_style,
  { left: 100.83, top: 200.92 },
  "포인터 이동은 소수점 둘째 자리로 맞춘다.",
);

const lockedOffsetDocument = createDocument();
lockedOffsetDocument.graph.nodes.a.locked = true;
applyStudioNodeOffset(lockedOffsetDocument, ["a", "b"], {
  deltaX: 5,
  deltaY: 5,
});
assert.deepEqual(
  lockedOffsetDocument.styles.a_style,
  { left: 10, top: 20 },
  "잠긴 노드는 움직이지 않는다.",
);
assert.deepEqual(
  lockedOffsetDocument.styles.b_style,
  { left: 105.5, top: 205.25 },
  "잠긴 노드가 섞여도 나머지는 움직인다.",
);

const fitOffsetDocument = createDocument();
applyStudioNodeOffset(
  fitOffsetDocument,
  ["fitted"],
  { deltaX: 10, deltaY: 10 },
  { skipFillParent: true },
);
assert.deepEqual(
  fitOffsetDocument.styles.fitted_style,
  { left: 0, top: 0, width: 300, height: 300 },
  "부모를 채우는 노드는 캔버스 드래그로 움직이지 않는다.",
);

const fitAllowedDocument = createDocument();
applyStudioNodeOffset(fitAllowedDocument, ["fitted"], {
  deltaX: 10,
  deltaY: 10,
});
assert.equal(
  fitAllowedDocument.styles.fitted_style.left,
  10,
  "skipFillParent를 끄면 호출한 쪽이 판단한 대로 옮긴다.",
);

const stylelessOffsetDocument = createDocument();
applyStudioNodeOffset(stylelessOffsetDocument, ["styleless"], {
  deltaX: 7,
  deltaY: 8,
});
const stylelessStyleId =
  stylelessOffsetDocument.graph.nodes.styleless.styleId ?? "";
assert.equal(
  stylelessOffsetDocument.styles[stylelessStyleId].left,
  127,
  "style이 없던 노드는 기본 좌표에서 옮긴다.",
);

// --- 드래그 대상 ---

const dragDocument = createDocument();
assert.deepEqual(
  resolveStudioDragTargetNodeIds(dragDocument, ["a", "b"], "a"),
  ["a", "b"],
  "선택 안의 노드를 끌면 선택 전체가 움직인다.",
);
assert.deepEqual(
  resolveStudioDragTargetNodeIds(dragDocument, ["a", "b"], "group"),
  ["group"],
  "선택 밖의 노드를 끌면 그 노드만 움직인다.",
);
assert.deepEqual(
  resolveStudioDragTargetNodeIds(dragDocument, ["group", "fitted"], "group"),
  ["group"],
  "조상이 함께 선택되면 자손은 대상에서 빠진다.",
);

// --- 키보드 이동 판단 ---

const nudgeEmpty = planStudioNudgeNodes(createDocument(), []);
assert.equal(nudgeEmpty.ok, false, "선택이 없으면 움직이지 않는다.");
assert.equal(
  nudgeEmpty.ok === false ? nudgeEmpty.reason : "x",
  "",
  "선택이 없을 때는 안내 문구를 띄우지 않는다.",
);

const lockedNudgeDocument = createDocument();
lockedNudgeDocument.graph.nodes.a.locked = true;
const lockedNudge = planStudioNudgeNodes(lockedNudgeDocument, ["a"]);
assert.equal(lockedNudge.ok, false);
assert.equal(
  lockedNudge.ok === false ? lockedNudge.reason : "",
  "Selection includes locked object",
  "잠긴 노드는 키보드로도 움직일 수 없다.",
);

const fitNudge = planStudioNudgeNodes(createDocument(), ["fitted"]);
assert.equal(fitNudge.ok, false);
assert.equal(
  fitNudge.ok === false ? fitNudge.reason : "",
  "Disable Fit to move this object",
  "부모를 채우는 노드는 Fit을 꺼야 움직일 수 있다.",
);

const okNudge = planStudioNudgeNodes(createDocument(), ["a", "b"]);
assert.ok(okNudge.ok);
assert.deepEqual(okNudge.nodeIds, ["a", "b"]);

// --- style 값 변경 ---

const styleDocument = createDocument();
applyStudioNodeStyleValue(
  styleDocument,
  styleDocument.graph.nodes.a,
  "fontSize",
  24,
);
assert.equal(
  styleDocument.styles.a_style.fontSize,
  24,
  "style 값을 그대로 넣는다.",
);

const fitStyleDocument = createDocument();
applyStudioNodeStyleValue(
  fitStyleDocument,
  fitStyleDocument.graph.nodes.fitted,
  "left",
  50,
);
assert.equal(
  fitStyleDocument.styles.fitted_style.left,
  0,
  "부모를 채우는 노드의 좌표는 바꿀 수 없다.",
);
applyStudioNodeStyleValue(
  fitStyleDocument,
  fitStyleDocument.graph.nodes.fitted,
  "opacity",
  0.5,
);
assert.equal(
  fitStyleDocument.styles.fitted_style.opacity,
  0.5,
  "좌표가 아닌 값은 부모를 채우는 노드에서도 바꿀 수 있다.",
);

// 카드 variant 루트의 크기를 바꾸면 Component Set frame도 함께 맞춘다.
const componentDocument = createDocument();
componentDocument.domains = {
  timetable: {
    components: {
      comp_1: {
        id: "comp_1",
        label: "Entry",
        defaultStatusId: "online",
        variants: { online: { rootNodeId: "a" } },
      },
    },
  },
} as unknown as StudioTemplateDocument["domains"];

applyStudioNodeStyleValue(
  componentDocument,
  componentDocument.graph.nodes.a,
  "width",
  420,
);
const componentFrame =
  componentDocument.domains?.timetable?.components.comp_1.frame;
assert.equal(
  componentFrame?.width,
  420,
  "카드 variant 루트의 크기는 Component Set frame과 함께 움직인다.",
);
assert.equal(
  componentDocument.styles.a_style.width,
  420,
  "노드 style도 함께 바뀐다.",
);

const componentTextDocument = createDocument();
componentTextDocument.domains = {
  timetable: {
    components: {
      comp_1: {
        id: "comp_1",
        label: "Entry",
        defaultStatusId: "online",
        variants: { online: { rootNodeId: "a" } },
      },
    },
  },
} as unknown as StudioTemplateDocument["domains"];
applyStudioNodeStyleValue(
  componentTextDocument,
  componentTextDocument.graph.nodes.a,
  "color",
  "#ff0000",
);
assert.equal(
  componentTextDocument.domains?.timetable?.components.comp_1.frame,
  undefined,
  "좌표가 아닌 값은 Component Set frame을 건드리지 않는다.",
);

// --- 텍스트 정렬 ---

assert.equal(getStudioTextJustifyContent("left"), "flex-start");
assert.equal(getStudioTextJustifyContent("center"), "center");
assert.equal(getStudioTextJustifyContent("right"), "flex-end");

assert.equal(
  getStudioTextAlignment({ textAlign: "right" }),
  "right",
  "textAlign이 있으면 그대로 쓴다.",
);
assert.equal(
  getStudioTextAlignment({ justifyContent: "center" }),
  "center",
  "예전 문서는 justifyContent로만 정렬을 갖고 있다.",
);
assert.equal(
  getStudioTextAlignment({ justifyContent: "flex-end" }),
  "right",
  "flex-end는 오른쪽 정렬이다.",
);
assert.equal(
  getStudioTextAlignment({ justifyContent: "end" }),
  "right",
  "end도 오른쪽 정렬로 읽는다.",
);
assert.equal(
  getStudioTextAlignment({}),
  "left",
  "정보가 없으면 왼쪽 정렬이다.",
);

const alignDocument = createDocument();
applyStudioNodeTextAlignment(
  alignDocument,
  alignDocument.graph.nodes.a,
  "right",
);
assert.equal(alignDocument.styles.a_style.textAlign, "right");
assert.equal(
  alignDocument.styles.a_style.justifyContent,
  "flex-end",
  "정렬은 문단 정렬과 flex 정렬을 함께 맞춘다.",
);

// --- 부모 채우기 토글 ---

const fitOnDocument = createDocument();
applyStudioNodeFitParent(fitOnDocument, fitOnDocument.graph.nodes.a, true, {
  width: 123,
  height: 45,
});
assert.equal(fitOnDocument.graph.nodes.a.layoutMode, "fillParent");
assert.deepEqual(
  fitOnDocument.styles.a_style,
  { left: 0, top: 0 },
  "부모 채우기를 켜면 좌표를 0으로 맞추고 크기는 부모가 정한다.",
);

const fitOffDocument = createDocument();
applyStudioNodeFitParent(
  fitOffDocument,
  fitOffDocument.graph.nodes.fitted,
  false,
  { width: 123, height: 45 },
);
assert.equal(fitOffDocument.graph.nodes.fitted.layoutMode, "fixed");
assert.deepEqual(
  fitOffDocument.styles.fitted_style,
  { left: 0, top: 0, width: 123, height: 45 },
  "끄면 화면에서 보이던 크기를 고정 값으로 받는다.",
);

// --- style 전파 안내 문구 ---

assert.equal(
  getStudioVariantStyleMessage({
    appliedNodeCount: 0,
    appliedStatusCount: 0,
    skippedStatusCount: 2,
  }),
  "No matching status objects were found",
  "적용된 게 없으면 그렇게 알린다.",
);
assert.equal(
  getStudioVariantStyleMessage({
    appliedNodeCount: 3,
    appliedStatusCount: 2,
    skippedStatusCount: 0,
  }),
  "Applied 3 style update(s) to 2 status(es)",
  "건너뛴 상태가 없으면 뒤에 덧붙이지 않는다.",
);
assert.equal(
  getStudioVariantStyleMessage({
    appliedNodeCount: 3,
    appliedStatusCount: 2,
    skippedStatusCount: 1,
  }),
  "Applied 3 style update(s) to 2 status(es) · 1 skipped",
  "건너뛴 상태가 있으면 개수를 함께 알린다.",
);

console.log("Studio node style command baseline checks passed.");
