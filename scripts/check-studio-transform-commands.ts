/**
 * 크기·회전·캔버스 크기 규칙의 기준선 가드.
 *
 * 손잡이를 끄는 계산과 각도 정리는 화면 콜백 안에 있으면 검증할 수 없다. 그래서
 * 판단을 순수 함수로 빼 두고 값으로 고정한다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 손잡이를 실제로 잡았을 때 포인터 이벤트가 캔버스 밀기로 번지지 않는지. 그것은
 *   `check:studio:thumbnail-editor`가 overlay 마크업으로 본다.
 * - 실제 브라우저에서 회전 CSS와 PNG가 일치하는지. geometry corner 계산은 여기서 본다.
 */
import assert from "node:assert/strict";

import type {
  StudioTemplateDocument,
  StudioTextAppearance,
} from "../src/types/template-studio";
import { getStudioVisibleCanvasCenter } from "../src/utils/template-studio/canvas-viewport-geometry";
import {
  getStudioGroupOverflowDiagnostics,
  getStudioNodeVisualBounds,
  getStudioNodeVisualBoundsInCanvas,
} from "../src/utils/template-studio/graph-nodes";
import {
  getStudioSharedNumberValue,
  getStudioSharedStringValue,
} from "../src/utils/template-studio/multi-selection";
import {
  getStudioNodeIdsClippedByCanvas,
  getStudioNodeIdsOutsideCanvas,
  getStudioPointerRotationDeg,
  normalizeStudioCanvasSize,
  normalizeStudioRotationDeg,
  resolveStudioResizeGeometry,
  rotateStudioDelta,
  STUDIO_MIN_CANVAS_SIZE,
  STUDIO_MIN_NODE_SIZE,
  STUDIO_RESIZE_HANDLES,
} from "../src/utils/template-studio/transform-commands";
import { getStudioVisualBounds } from "../src/utils/template-studio/text-effect-outset";

const START = { left: 100, top: 50, width: 200, height: 100 };

// --- 손잡이 여덟 개 ---

assert.deepEqual(
  [...STUDIO_RESIZE_HANDLES],
  ["nw", "n", "ne", "e", "se", "s", "sw", "w"],
  "손잡이 목록과 순서가 바뀌면 화면의 손잡이 자리도 바뀐다.",
);

// --- 반대쪽 변은 고정한다 ---

const eastDrag = resolveStudioResizeGeometry({
  start: START,
  handle: "e",
  deltaX: 60,
  deltaY: 0,
});
assert.deepEqual(
  eastDrag,
  { left: 100, top: 50, width: 260, height: 100 },
  "오른쪽 손잡이를 끌면 왼쪽 변은 그대로 있어야 한다. 따라 움직이면 객체가 미끄러진다.",
);

const westDrag = resolveStudioResizeGeometry({
  start: START,
  handle: "w",
  deltaX: -60,
  deltaY: 0,
});
assert.deepEqual(
  westDrag,
  { left: 40, top: 50, width: 260, height: 100 },
  "왼쪽 손잡이를 왼쪽으로 끌면 커지면서 왼쪽 변이 움직여야 한다.",
);

const northDrag = resolveStudioResizeGeometry({
  start: START,
  handle: "n",
  deltaX: 0,
  deltaY: -40,
});
assert.deepEqual(
  northDrag,
  { left: 100, top: 10, width: 200, height: 140 },
  "위쪽 손잡이는 세로만 바꾸고 가로는 그대로 둔다.",
);

const southEastDrag = resolveStudioResizeGeometry({
  start: START,
  handle: "se",
  deltaX: 30,
  deltaY: 20,
});
assert.deepEqual(southEastDrag, {
  left: 100,
  top: 50,
  width: 230,
  height: 120,
});

// 움직이지 않는 축은 시작 위치를 지킨다.
assert.equal(
  resolveStudioResizeGeometry({
    start: START,
    handle: "e",
    deltaX: 10,
    deltaY: 999,
  }).height,
  START.height,
  "좌우 손잡이는 세로 크기를 건드리지 않는다.",
);

// --- 최소 크기 ---

const collapsed = resolveStudioResizeGeometry({
  start: START,
  handle: "e",
  deltaX: -1000,
});
assert.equal(
  collapsed.width,
  STUDIO_MIN_NODE_SIZE,
  "0까지 줄어들면 화면에서 사라지고 다시 잡을 수 없다.",
);
assert.equal(collapsed.left, START.left);

const collapsedFromWest = resolveStudioResizeGeometry({
  start: START,
  handle: "w",
  deltaX: 1000,
});
assert.equal(collapsedFromWest.width, STUDIO_MIN_NODE_SIZE);
assert.equal(
  collapsedFromWest.left,
  START.left + START.width - STUDIO_MIN_NODE_SIZE,
  "왼쪽 손잡이로 줄일 때도 오른쪽 변이 고정돼야 한다.",
);

// --- 비율 잠금 ---

const lockedCorner = resolveStudioResizeGeometry({
  start: START,
  handle: "se",
  deltaX: 100,
  deltaY: 0,
  lockAspectRatio: true,
});
assert.deepEqual(
  lockedCorner,
  { left: 100, top: 50, width: 300, height: 150 },
  "모서리를 끌 때는 가로가 기준이다.",
);

const lockedVerticalEdge = resolveStudioResizeGeometry({
  start: START,
  handle: "s",
  deltaX: 0,
  deltaY: 50,
  lockAspectRatio: true,
});
assert.deepEqual(
  lockedVerticalEdge,
  { left: 100, top: 50, width: 300, height: 150 },
  "위아래 변만 끌 때는 세로가 기준이어야 한다. 가로를 기준으로 삼으면 손을 움직인 방향과 크기 변화가 어긋난다.",
);

const lockedRatioCollapse = resolveStudioResizeGeometry({
  start: START,
  handle: "e",
  deltaX: -1000,
  lockAspectRatio: true,
});
assert.equal(
  lockedRatioCollapse.width / lockedRatioCollapse.height,
  START.width / START.height,
  "최소 크기까지 줄여도 비율은 지켜야 한다.",
);
assert.ok(lockedRatioCollapse.height >= STUDIO_MIN_NODE_SIZE);

// --- 회전한 객체의 끌기 방향 ---

assert.deepEqual(
  rotateStudioDelta({ deltaX: 10, deltaY: 0, rotateDeg: 0 }),
  { deltaX: 10, deltaY: 0 },
  "회전이 없으면 화면 거리를 그대로 쓴다.",
);
const rotatedDelta = rotateStudioDelta({
  deltaX: 10,
  deltaY: 0,
  rotateDeg: 90,
});
assert.ok(
  Math.abs(rotatedDelta.deltaX) < 1e-9 &&
    Math.abs(rotatedDelta.deltaY + 10) < 1e-9,
  "90도 돌린 객체에서 화면의 오른쪽은 객체의 위쪽이다.",
);

// --- 각도 정리 ---

assert.equal(normalizeStudioRotationDeg(370), 10);
assert.equal(normalizeStudioRotationDeg(-190), 170);
assert.equal(normalizeStudioRotationDeg(540), 180);
assert.equal(normalizeStudioRotationDeg(720), 0);
assert.equal(
  normalizeStudioRotationDeg(Number.NaN),
  0,
  "숫자가 아니면 0으로 본다. 그대로 흘리면 회전이 CSS에서 무시되고 각도 칸이 비어 보인다.",
);
assert.ok(
  Object.is(normalizeStudioRotationDeg(-0), 0),
  "-0은 사람에게 뜻 없는 값이다.",
);
assert.ok(
  normalizeStudioRotationDeg(200) <= 180 &&
    normalizeStudioRotationDeg(200) > -180,
  "여러 바퀴 돌려도 값이 계속 커지면 안 된다.",
);

// --- 회전 손잡이 각도 ---

const center = { x: 100, y: 100 };
assert.equal(
  getStudioPointerRotationDeg({ center, pointer: { x: 100, y: 0 } }),
  0,
  "손잡이가 위를 가리킬 때가 0도다.",
);
assert.equal(
  getStudioPointerRotationDeg({ center, pointer: { x: 200, y: 100 } }),
  90,
  "오른쪽을 가리키면 90도다.",
);
assert.equal(
  getStudioPointerRotationDeg({ center, pointer: { x: 100, y: 200 } }),
  180,
);
assert.equal(
  getStudioPointerRotationDeg({
    center,
    pointer: { x: 120, y: 8 },
    snapToStep: true,
  }),
  15,
  "Shift를 누르면 15도 간격에 붙는다.",
);

// --- 캔버스 최소 크기 ---

assert.deepEqual(
  normalizeStudioCanvasSize({ width: 0, height: 0 }),
  { width: STUDIO_MIN_CANVAS_SIZE, height: STUDIO_MIN_CANVAS_SIZE },
  "0이 들어오면 미리보기가 사라져서 무엇을 편집하는지 볼 수 없다.",
);
assert.deepEqual(
  normalizeStudioCanvasSize({ width: Number.NaN, height: Number.NaN }),
  { width: STUDIO_MIN_CANVAS_SIZE, height: STUDIO_MIN_CANVAS_SIZE },
  "숫자 칸을 지우는 중에는 NaN이 들어온다.",
);
assert.deepEqual(normalizeStudioCanvasSize({ width: 1280.4, height: 719.6 }), {
  width: 1280,
  height: 720,
});
assert.deepEqual(normalizeStudioCanvasSize({ width: -50, height: 1080 }), {
  width: STUDIO_MIN_CANVAS_SIZE,
  height: 1080,
});

// --- 캔버스 밖 노드 ---

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 7,
    metadata: { editor: "template-studio", kind: "thumbnail", name: "t" },
    canvas: { width: 1000, height: 500, background: "#fff" },
    graph: {
      rootNodeIds: ["inside", "partial", "outside", "hiddenOutside"],
      nodes: {
        inside: {
          id: "inside",
          type: "shape",
          label: "inside",
          parentId: null,
          childIds: [],
          styleId: "inside_style",
        },
        partial: {
          id: "partial",
          type: "shape",
          label: "partial",
          parentId: null,
          childIds: [],
          styleId: "partial_style",
        },
        outside: {
          id: "outside",
          type: "shape",
          label: "outside",
          parentId: null,
          childIds: [],
          styleId: "outside_style",
        },
        hiddenOutside: {
          id: "hiddenOutside",
          type: "shape",
          label: "hiddenOutside",
          parentId: null,
          childIds: [],
          styleId: "hidden_style",
          hidden: true,
        },
      },
    },
    inputs: {},
    styles: {
      inside_style: { left: 10, top: 10, width: 100, height: 100 },
      partial_style: { left: -50, top: 10, width: 100, height: 100 },
      outside_style: { left: 1200, top: 10, width: 100, height: 100 },
      hidden_style: { left: 1400, top: 10, width: 100, height: 100 },
    },
    assets: {},
  }) as unknown as StudioTemplateDocument;

assert.deepEqual(
  getStudioNodeIdsOutsideCanvas(createDocument()),
  ["outside"],
  "완전히 밖으로 나간 것만 알린다. 걸쳐 있는 것은 아직 보이므로 알릴 이유가 없고, 감춘 것은 애초에 그리지 않는다.",
);
assert.deepEqual(
  getStudioNodeIdsClippedByCanvas(createDocument()),
  ["partial"],
  "partial clipping is diagnosed separately and fully outside nodes keep the old warning",
);

// 캔버스를 줄이면 알림 대상이 늘어난다. 그래도 노드는 지우지 않는다.
const shrunkDocument = createDocument();
shrunkDocument.canvas.width = 100;
const shrunkOutsideNodeIds = getStudioNodeIdsOutsideCanvas(shrunkDocument);
assert.ok(shrunkOutsideNodeIds.includes("outside"));
assert.equal(
  Object.keys(shrunkDocument.graph.nodes).length,
  4,
  "캔버스를 줄여도 노드는 남아야 한다. 지우면 되돌릴 수 없는 손실이 된다.",
);

const textAppearance: StudioTextAppearance = {
  fill: { type: "solid", color: "#fff", opacity: 1 },
  strokes: [],
  shadow: {
    enabled: true,
    color: "#000",
    offsetX: 80,
    offsetY: 0,
    blur: 0,
    opacity: 1,
  },
};
const clippedDocument = createDocument();
clippedDocument.canvas.width = 200;
clippedDocument.canvas.height = 200;
clippedDocument.graph.rootNodeIds = ["text"];
clippedDocument.graph.nodes = {
  text: {
    id: "text",
    type: "text",
    label: "text",
    parentId: null,
    childIds: [],
    styleId: "text-style",
    textAppearance,
  },
};
clippedDocument.styles = {
  "text-style": { left: 50, top: 50, width: 100, height: 40 },
};
assert.deepEqual(
  getStudioNodeIdsOutsideCanvas(clippedDocument),
  [],
  "logical text bounds remain inside the canvas",
);
assert.deepEqual(
  getStudioNodeIdsClippedByCanvas(clippedDocument),
  ["text"],
  "one-sided visual shadow clipping is diagnosed separately from fully outside nodes",
);

const rotatedTextDocument = createDocument();
rotatedTextDocument.graph.rootNodeIds = ["text"];
rotatedTextDocument.graph.nodes = {
  text: {
    id: "text",
    type: "text",
    label: "text",
    parentId: null,
    childIds: [],
    styleId: "text-style",
    textAppearance: {
      ...textAppearance,
      shadow: { ...textAppearance.shadow!, offsetX: 20 },
    },
  },
};
rotatedTextDocument.styles = {
  "text-style": { left: 100, top: 60, width: 80, height: 40, rotateDeg: 30 },
};
const rotatedTextBounds = getStudioNodeVisualBoundsInCanvas(
  rotatedTextDocument,
  "text",
);
const expectedRotatedTextBounds = getStudioVisualBounds({
  logicalBounds: { left: 100, top: 60, width: 80, height: 40 },
  appearance: rotatedTextDocument.graph.nodes.text.textAppearance,
  rotateDeg: 30,
});
assert.deepEqual(
  rotatedTextBounds,
  expectedRotatedTextBounds,
  "rotated text visual bounds stay in canvas coordinates instead of being inverse-rotated inside selection",
);

const rotatedGroupDocument = createDocument();
rotatedGroupDocument.graph.rootNodeIds = ["group"];
rotatedGroupDocument.graph.nodes = {
  group: {
    id: "group",
    type: "group",
    label: "group",
    parentId: null,
    childIds: ["child"],
    styleId: "group-style",
  },
  child: {
    id: "child",
    type: "text",
    label: "child",
    parentId: "group",
    childIds: [],
    styleId: "child-style",
    textAppearance: {
      fill: { type: "solid", color: "#fff", opacity: 1 },
      strokes: [],
    },
  },
};
rotatedGroupDocument.styles = {
  "group-style": {
    left: 100,
    top: 100,
    width: 100,
    height: 100,
    rotateDeg: 45,
  },
  "child-style": { left: 0, top: 40, width: 50, height: 20 },
};
const rotatedChildBounds = getStudioNodeVisualBoundsInCanvas(
  rotatedGroupDocument,
  "child",
);
assert.ok(Math.abs(rotatedChildBounds.left - 107.573593) < 0.00001);
assert.ok(Math.abs(rotatedChildBounds.top - 107.573593) < 0.00001);
assert.ok(Math.abs(rotatedChildBounds.right - 157.071068) < 0.00001);
assert.ok(Math.abs(rotatedChildBounds.bottom - 157.071068) < 0.00001);

const overflowDocument = createDocument();
overflowDocument.graph.rootNodeIds = ["group"];
overflowDocument.graph.nodes = {
  group: {
    id: "group",
    type: "group",
    label: "group",
    parentId: null,
    childIds: ["child"],
    styleId: "group-style",
  },
  child: {
    id: "child",
    type: "text",
    label: "child",
    parentId: "group",
    childIds: [],
    styleId: "child-style",
    textAppearance: {
      fill: { type: "solid", color: "#fff", opacity: 1 },
      strokes: [
        { id: "stroke", enabled: true, color: "#000", outset: 10, opacity: 1 },
      ],
    },
  },
};
overflowDocument.styles = {
  "group-style": {
    left: 20,
    top: 20,
    width: 100,
    height: 100,
    overflow: "clip",
  },
  "child-style": { left: 90, top: 10, width: 30, height: 30 },
};
assert.deepEqual(getStudioGroupOverflowDiagnostics(overflowDocument), [
  { groupId: "group", childIds: ["child"] },
]);

const hiddenChildDocument = createDocument();
hiddenChildDocument.graph.rootNodeIds = ["group"];
hiddenChildDocument.graph.nodes = {
  group: {
    id: "group",
    type: "group",
    label: "group",
    parentId: null,
    childIds: ["hidden-child"],
    styleId: "hidden-group-style",
  },
  "hidden-child": {
    id: "hidden-child",
    type: "text",
    label: "hidden child",
    parentId: "group",
    childIds: [],
    styleId: "hidden-child-style",
    hidden: true,
    textAppearance: {
      fill: { type: "solid", color: "#fff", opacity: 1 },
      strokes: [
        {
          id: "hidden-stroke",
          enabled: true,
          color: "#000",
          outset: 20,
          opacity: 1,
        },
      ],
    },
  },
};
hiddenChildDocument.styles = {
  "hidden-group-style": {
    left: 950,
    top: 20,
    width: 40,
    height: 40,
    overflow: "clip",
  },
  "hidden-child-style": { left: 100, top: 0, width: 30, height: 30 },
};
assert.deepEqual(
  getStudioNodeVisualBounds(hiddenChildDocument, "group"),
  { left: 950, top: 20, right: 990, bottom: 60, width: 40, height: 40 },
  "hidden child does not expand its group visual bounds",
);
assert.deepEqual(
  getStudioNodeIdsClippedByCanvas(hiddenChildDocument),
  [],
  "hidden child does not create a canvas clipping warning",
);
assert.deepEqual(
  getStudioGroupOverflowDiagnostics(hiddenChildDocument),
  [],
  "hidden child does not create a group overflow warning",
);

const hiddenGroupDocument = createDocument();
hiddenGroupDocument.graph.rootNodeIds = ["hidden-group"];
hiddenGroupDocument.graph.nodes = {
  "hidden-group": {
    id: "hidden-group",
    type: "group",
    label: "hidden group",
    parentId: null,
    childIds: ["visible-child"],
    styleId: "hidden-group-style",
    hidden: true,
  },
  "visible-child": {
    id: "visible-child",
    type: "shape",
    label: "visible child",
    parentId: "hidden-group",
    childIds: [],
    styleId: "overflowing-child-style",
  },
};
hiddenGroupDocument.styles = {
  "hidden-group-style": {
    left: 950,
    top: 20,
    width: 40,
    height: 40,
    overflow: "clip",
  },
  "overflowing-child-style": { left: 100, top: 0, width: 30, height: 30 },
};
assert.deepEqual(
  getStudioGroupOverflowDiagnostics(hiddenGroupDocument),
  [],
  "a hidden group does not report overflow from a visible child",
);

const hiddenAncestorGroupDocument = createDocument();
hiddenAncestorGroupDocument.graph.rootNodeIds = ["hidden-ancestor"];
hiddenAncestorGroupDocument.graph.nodes = {
  "hidden-ancestor": {
    id: "hidden-ancestor",
    type: "group",
    label: "hidden ancestor",
    parentId: null,
    childIds: ["nested-group"],
    styleId: "hidden-ancestor-style",
    hidden: true,
  },
  "nested-group": {
    id: "nested-group",
    type: "group",
    label: "nested group",
    parentId: "hidden-ancestor",
    childIds: ["nested-child"],
    styleId: "nested-group-style",
  },
  "nested-child": {
    id: "nested-child",
    type: "shape",
    label: "nested child",
    parentId: "nested-group",
    childIds: [],
    styleId: "nested-overflowing-child-style",
  },
};
hiddenAncestorGroupDocument.styles = {
  "hidden-ancestor-style": {
    left: 950,
    top: 20,
    width: 40,
    height: 40,
  },
  "nested-group-style": {
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    overflow: "hidden",
  },
  "nested-overflowing-child-style": {
    left: 100,
    top: 0,
    width: 30,
    height: 30,
  },
};
assert.deepEqual(
  getStudioGroupOverflowDiagnostics(hiddenAncestorGroupDocument),
  [],
  "a group below a hidden ancestor does not report overflow",
);

// --- 보이는 영역의 중앙 ---

assert.deepEqual(
  getStudioVisibleCanvasCenter({
    viewportRect: { left: 0, top: 0, width: 800, height: 600 },
    canvasRect: { left: 0, top: 0, width: 1280, height: 720 },
    canvasWidth: 1280,
    canvasHeight: 720,
    scale: 1,
  }),
  { x: 400, y: 300 },
  "화면 중앙이 캔버스의 어느 점인지 계산한다.",
);
assert.deepEqual(
  getStudioVisibleCanvasCenter({
    viewportRect: { left: 0, top: 0, width: 800, height: 600 },
    canvasRect: { left: 0, top: 0, width: 640, height: 360 },
    canvasWidth: 1280,
    canvasHeight: 720,
    scale: 0.5,
  }),
  { x: 800, y: 600 },
  "확대 비율을 되돌려 캔버스 좌표로 바꿔야 한다.",
);
assert.deepEqual(
  getStudioVisibleCanvasCenter({
    viewportRect: { left: 0, top: 0, width: 800, height: 600 },
    canvasRect: { left: 5000, top: 5000, width: 1280, height: 720 },
    canvasWidth: 1280,
    canvasHeight: 720,
    scale: 1,
  }),
  { x: 0, y: 0 },
  "캔버스를 화면 밖으로 밀어 둔 상태에서는 중앙을 캔버스 안으로 되돌린다. 그러지 않으면 새 객체가 보이지 않는 곳에 생긴다.",
);
assert.deepEqual(
  getStudioVisibleCanvasCenter({
    viewportRect: { left: 0, top: 0, width: 800, height: 600 },
    canvasRect: { left: 0, top: 0, width: 1280, height: 720 },
    canvasWidth: 1280,
    canvasHeight: 720,
    scale: 0,
  }),
  { x: 640, y: 360 },
  "확대 비율이 0이면 나눌 수 없으므로 캔버스 가운데로 본다.",
);

// --- 여러 개를 골랐을 때의 칸 값 ---

assert.deepEqual(getStudioSharedNumberValue([10, 10, 10]), {
  value: 10,
  mixed: false,
});
assert.deepEqual(
  getStudioSharedNumberValue([10, 20]),
  { value: 10, mixed: true },
  "값이 갈렸으면 알려야 한다. 첫 값만 보여주면 고른 것 전부가 그 값이라고 읽힌다.",
);
assert.deepEqual(getStudioSharedNumberValue([]), { value: 0, mixed: false });
assert.deepEqual(
  getStudioSharedNumberValue([undefined, undefined], 100),
  { value: 100, mixed: false },
  "값이 없는 것끼리는 갈린 것이 아니다.",
);
assert.deepEqual(getStudioSharedNumberValue([Number.NaN, 0]), {
  value: 0,
  mixed: false,
});
assert.deepEqual(getStudioSharedStringValue(["#fff", "#fff"]), {
  value: "#fff",
  mixed: false,
});
assert.deepEqual(getStudioSharedStringValue(["#fff", "#000"]), {
  value: "#fff",
  mixed: true,
});

console.log("Studio transform command baseline checks passed.");
