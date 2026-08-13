/**
 * 빈 썸네일 문서와 새 노드 기본값의 기준선 가드.
 *
 * 노드를 넣는 자리가 이 편집기의 규칙이다. 캔버스 밖에 놓이면 사용자는 추가가 되지 않은
 * 것으로 읽고, 묶음을 골랐는데 밖에 생기면 묶어 둔 구조가 흐트러진다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 화면 중앙 값을 실제로 뷰포트에서 읽어 오는 배선. 그 값을 계산하는 규칙은
 *   `check:studio:transform-commands`가 본다.
 */
import assert from "node:assert/strict";

import type { StudioTemplateDocument } from "../src/types/template-studio";
import {
  createThumbnailStudioDocument,
  THUMBNAIL_CANVAS_PRESETS,
  THUMBNAIL_STUDIO_DEFAULT_CANVAS,
} from "../src/utils/thumbnail-studio/document-factory";
import {
  createStudioThumbnailNode,
  planStudioNodeInsertion,
  resolveStudioThumbnailInsertionParentId,
} from "../src/utils/thumbnail-studio/node-defaults";
import { getStudioNodeDefinition } from "../src/utils/template-studio/node-definitions";

// --- 빈 문서 ---

const emptyDocument = createThumbnailStudioDocument();

assert.equal(emptyDocument.metadata.kind, "thumbnail");
assert.deepEqual(
  {
    width: emptyDocument.canvas.width,
    height: emptyDocument.canvas.height,
  },
  {
    width: THUMBNAIL_STUDIO_DEFAULT_CANVAS.width,
    height: THUMBNAIL_STUDIO_DEFAULT_CANVAS.height,
  },
  "기본 캔버스는 1280×720이다.",
);
assert.deepEqual(
  emptyDocument.graph,
  { rootNodeIds: [], nodes: {} },
  "캔버스를 표현하기 위한 root node를 만들지 않는다. 사용자가 넣은 것만 graph에 들어간다.",
);
assert.deepEqual(emptyDocument.inputs, {});
assert.deepEqual(emptyDocument.assets, {});
assert.deepEqual(emptyDocument.styles, {});
assert.equal(
  emptyDocument.domains?.timetable,
  undefined,
  "썸네일 문서에 시간표 도메인이 있으면 시간표 UI가 이 문서에 개입할 수 있다.",
);
assert.equal(emptyDocument.domains?.thumbnail?.version, 1);
assert.equal(emptyDocument.domains?.thumbnail?.export.defaultFormat, "png");
assert.ok(
  THUMBNAIL_CANVAS_PRESETS.length >= 4,
  "크기 프리셋이 줄면 자주 쓰는 판형을 고를 수 없다.",
);
assert.ok(
  THUMBNAIL_CANVAS_PRESETS.every(
    (preset) => preset.width > 0 && preset.height > 0,
  ),
);

// --- 넣을 부모 ---

const createDocument = (): StudioTemplateDocument => {
  const document = createThumbnailStudioDocument();
  document.graph.rootNodeIds = ["group", "text"];
  document.graph.nodes = {
    group: {
      id: "group",
      type: "group",
      label: "group",
      parentId: null,
      childIds: ["inner"],
      styleId: "group_style",
    },
    inner: {
      id: "inner",
      type: "text",
      label: "inner",
      parentId: "group",
      childIds: [],
      styleId: "inner_style",
    },
    text: {
      id: "text",
      type: "text",
      label: "text",
      parentId: null,
      childIds: [],
      styleId: "text_style",
    },
  };
  document.styles = {
    group_style: { left: 200, top: 100, width: 400, height: 300 },
    inner_style: { left: 10, top: 10, width: 100, height: 50 },
    text_style: { left: 0, top: 0, width: 200, height: 60 },
  };
  return document;
};

const document = createDocument();

assert.equal(
  resolveStudioThumbnailInsertionParentId(document, null),
  null,
  "고른 것이 없으면 문서 루트에 넣는다.",
);
assert.equal(
  resolveStudioThumbnailInsertionParentId(document, document.graph.nodes.group),
  "group",
  "묶음을 골랐으면 그 안에 넣는다.",
);
assert.equal(
  resolveStudioThumbnailInsertionParentId(document, document.graph.nodes.inner),
  "group",
  "묶음 안의 것을 골랐으면 같은 묶음에 넣는다. 밖으로 나가면 묶어 둔 구조가 흐트러진다.",
);
assert.equal(
  resolveStudioThumbnailInsertionParentId(document, document.graph.nodes.text),
  null,
  "루트 노드를 골랐으면 그 형제로 넣는다.",
);

const lockedGroupDocument = createDocument();
lockedGroupDocument.graph.nodes.group.locked = true;
assert.equal(
  resolveStudioThumbnailInsertionParentId(
    lockedGroupDocument,
    lockedGroupDocument.graph.nodes.group,
  ),
  null,
  "잠근 묶음 안에는 넣지 않는다. 넣어도 곧바로 옮기거나 지울 수 없어 꺼낼 방법이 없다.",
);
assert.equal(
  resolveStudioThumbnailInsertionParentId(
    lockedGroupDocument,
    lockedGroupDocument.graph.nodes.inner,
  ),
  null,
  "부모가 잠겨 있으면 그 안에 형제로도 넣지 않는다.",
);

// --- 넣을 자리 ---

const centeredPlan = planStudioNodeInsertion({
  document,
  type: "text",
  selectedNode: null,
  viewportCenter: { x: 640, y: 360 },
});
const textSize = getStudioNodeDefinition("text").defaultSize;
assert.deepEqual(
  centeredPlan,
  {
    parentId: null,
    left: 640 - textSize.width / 2,
    top: 360 - textSize.height / 2,
    width: textSize.width,
    height: textSize.height,
  },
  "새 객체는 지금 보고 있는 화면 중앙에 온다.",
);

assert.deepEqual(
  planStudioNodeInsertion({
    document,
    type: "text",
    selectedNode: null,
    viewportCenter: null,
  }),
  {
    parentId: null,
    left: (1280 - textSize.width) / 2,
    top: (720 - textSize.height) / 2,
    width: textSize.width,
    height: textSize.height,
  },
  "화면 중앙을 모르면 캔버스 가운데로 본다.",
);

// 캔버스를 벗어나지 않는다.
const clampedTopLeft = planStudioNodeInsertion({
  document,
  type: "image",
  selectedNode: null,
  viewportCenter: { x: 0, y: 0 },
});
assert.deepEqual(
  { left: clampedTopLeft.left, top: clampedTopLeft.top },
  { left: 0, top: 0 },
  "왼쪽 위 밖으로 나가지 않는다.",
);

const imageSize = getStudioNodeDefinition("image").defaultSize;
const clampedBottomRight = planStudioNodeInsertion({
  document,
  type: "image",
  selectedNode: null,
  viewportCenter: { x: 1280, y: 720 },
});
assert.deepEqual(
  { left: clampedBottomRight.left, top: clampedBottomRight.top },
  { left: 1280 - imageSize.width, top: 720 - imageSize.height },
  "오른쪽 아래 밖으로도 나가지 않는다. 캔버스 밖에 놓이면 사용자는 추가가 안 된 것으로 읽는다.",
);

// 캔버스보다 큰 노드는 붙일 자리가 없으므로 왼쪽 위에 붙인다.
const tinyCanvasDocument = createThumbnailStudioDocument({
  width: 100,
  height: 100,
});
const oversizedPlan = planStudioNodeInsertion({
  document: tinyCanvasDocument,
  type: "group",
  selectedNode: null,
  viewportCenter: { x: 50, y: 50 },
});
assert.deepEqual(
  { left: oversizedPlan.left, top: oversizedPlan.top },
  { left: 0, top: 0 },
  "캔버스보다 큰 객체는 왼쪽 위에 붙인다.",
);

/**
 * 묶음 안에 넣을 때는 부모 좌표계로 바꾼다.
 *
 * 묶음이 (200, 100)에 있으므로 캔버스 중앙에서 부모 좌표를 빼야 한다. 빼먹으면 묶음
 * 안에 넣은 객체가 묶음만큼 밀려난다.
 */
const insideGroupPlan = planStudioNodeInsertion({
  document,
  type: "shape",
  selectedNode: document.graph.nodes.group,
  viewportCenter: { x: 640, y: 360 },
});
const shapeSize = getStudioNodeDefinition("shape").defaultSize;
assert.deepEqual(
  insideGroupPlan,
  {
    parentId: "group",
    left: 640 - shapeSize.width / 2 - 200,
    top: 360 - shapeSize.height / 2 - 100,
    width: shapeSize.width,
    height: shapeSize.height,
  },
  "묶음 안에 넣을 때는 좌표를 부모 기준으로 바꿔야 한다.",
);

// --- 만들어진 노드 ---

const created = createStudioThumbnailNode({
  nodeId: "node_1",
  styleId: "style_1",
  type: "text",
  label: "New Text",
  plan: centeredPlan,
});
assert.deepEqual(
  created.node.binding,
  { kind: "staticText", value: "New text" },
  "새 글자는 기본 binding을 갖는다. 없으면 빈 칸으로 만들어져 무엇을 채워야 하는지 알 수 없다.",
);
assert.equal(created.node.parentId, null);
assert.equal(created.node.styleId, "style_1");
assert.deepEqual(
  {
    left: created.style.left,
    top: created.style.top,
    width: created.style.width,
    height: created.style.height,
  },
  {
    left: centeredPlan.left,
    top: centeredPlan.top,
    width: textSize.width,
    height: textSize.height,
  },
  "계획한 자리와 크기가 style에 들어간다.",
);
assert.equal(created.style.fontSize, 64, "새 글자 기본 크기가 바뀌면 안 된다.");
assert.equal(created.style.fontWeight, 700);
assert.equal(created.style.textAlign, "left");
assert.ok(
  typeof created.style.color === "string" && created.style.color !== "",
  "글자색을 명시해야 한다. 테마 색을 물려받으면 캔버스 배경에 따라 보이지 않는다.",
);

const createdImage = createStudioThumbnailNode({
  nodeId: "node_2",
  styleId: "style_2",
  type: "image",
  label: "New Image",
  plan: planStudioNodeInsertion({
    document,
    type: "image",
    selectedNode: null,
  }),
});
assert.equal(createdImage.node.fit, "cover", "이미지 기본 맞춤은 cover다.");
assert.equal(
  createdImage.node.binding,
  undefined,
  "이미지에 글자 binding을 붙이지 않는다.",
);

const createdShape = createStudioThumbnailNode({
  nodeId: "node_3",
  styleId: "style_3",
  type: "shape",
  label: "New Rectangle",
  plan: planStudioNodeInsertion({
    document,
    type: "shape",
    selectedNode: null,
  }),
});
assert.equal(createdShape.node.binding, undefined);
assert.equal(
  createdShape.style.borderRadius,
  0,
  "도형은 각진 모서리로 시작한다.",
);
assert.equal(createdShape.node.fit, undefined);

// 문서 §5의 기본 크기 표
assert.deepEqual(
  {
    text: getStudioNodeDefinition("text").defaultSize,
    flexibleText: getStudioNodeDefinition("flexibleText").defaultSize,
    image: getStudioNodeDefinition("image").defaultSize,
    shape: getStudioNodeDefinition("shape").defaultSize,
    group: getStudioNodeDefinition("group").defaultSize,
  },
  {
    text: { width: 480, height: 100 },
    flexibleText: { width: 480, height: 140 },
    image: { width: 400, height: 300 },
    shape: { width: 400, height: 200 },
    group: { width: 600, height: 400 },
  },
  "기본 크기가 바뀌면 계획서의 표와 어긋난다.",
);

console.log("Thumbnail Studio node default baseline checks passed.");
