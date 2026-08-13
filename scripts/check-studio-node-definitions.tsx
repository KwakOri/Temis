/**
 * 노드 정의표와 렌더러 분기의 기준선 가드.
 *
 * 이 가드가 있는 이유는 하나다. 공통 렌더러가 모르는 종류를 글자로 그리던 시절에는
 * union에 종류를 더해도 컴파일 오류가 한 건도 나지 않았고, 새로 넣은 도형이 빈 글자로
 * 조용히 그려졌다. 그 위에 나머지 기능을 쌓으면 어디서 어긋났는지 찾을 수 없다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 정의표의 값이 화면 어디에 쓰이는지. 추가 메뉴와 인스펙터 배선은 각 편집기의
 *   가드(`check:studio:thumbnail-editor`)가 본다.
 * - `satisfies Record<StudioGraphNodeType, ...>`이 잡는 컴파일 단계 누락. 여기서는
 *   같은 규칙을 값으로 한 번 더 못박는다. 타입만 믿으면 `as` 하나로 뚫린다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioNodeTypeIcon } from "../src/components/studio/node-type-icon";
import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import type {
  StudioGraphNode,
  StudioGraphNodeType,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import {
  getStudioGraphNodeTypeAddMenuLabel,
  getStudioGraphNodeTypeLabel,
} from "../src/utils/template-studio/graph-node-label";
import { getStudioDefaultNodeStyle } from "../src/utils/template-studio/node-commands";
import {
  canStudioNodeTypeHaveChildren,
  getStudioNodeDefinition,
  getStudioNodeDefinitions,
  getStudioNodeDefinitionTypes,
  hasStudioNodeInspectorSection,
  isStudioTextNodeType,
  STUDIO_NODE_TYPE_ORDER,
} from "../src/utils/template-studio/node-definitions";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";

/**
 * union에 있는 모든 노드 종류.
 *
 * 값으로 적어 둔다. 정의표에서 한 종류를 빼면 `satisfies`가 컴파일 단계에서 잡지만,
 * 반대로 union에 종류를 더하고 정의표에도 더하면서 이 목록만 잊으면 그 종류가
 * 아무 가드 없이 들어온다.
 */
const ALL_NODE_TYPES = [
  "group",
  "text",
  "flexibleText",
  "image",
  "shape",
] as const satisfies readonly StudioGraphNodeType[];

// --- 정의표가 union을 빠짐없이 덮는다 ---

assert.deepEqual(
  [...getStudioNodeDefinitionTypes()].sort(),
  [...ALL_NODE_TYPES].sort(),
  "노드 정의표는 모든 StudioGraphNodeType을 담아야 한다.",
);
assert.deepEqual(
  [...STUDIO_NODE_TYPE_ORDER].sort(),
  [...ALL_NODE_TYPES].sort(),
  "추가 메뉴 순서 목록도 모든 종류를 담아야 한다.",
);
assert.equal(
  new Set(STUDIO_NODE_TYPE_ORDER).size,
  STUDIO_NODE_TYPE_ORDER.length,
  "추가 메뉴 순서에 같은 종류가 두 번 들어가면 안 된다.",
);
assert.deepEqual(
  getStudioNodeDefinitions().map((definition) => definition.type),
  [...STUDIO_NODE_TYPE_ORDER],
  "정의표 목록은 추가 메뉴 순서대로 나와야 한다.",
);

// --- 종류마다 이름과 기본 크기가 있다 ---

const seenLabels = new Set<string>();
for (const type of ALL_NODE_TYPES) {
  const definition = getStudioNodeDefinition(type);

  assert.equal(definition.type, type, `${type} 정의의 type이 어긋났다.`);
  assert.ok(
    definition.label.trim().length > 0,
    `${type}에 표시 이름이 없다. 이름이 없으면 레이어 트리에서 무엇인지 알 수 없다.`,
  );
  assert.ok(
    definition.addMenuLabel.trim().length > 0,
    `${type}에 추가 메뉴 이름이 없다.`,
  );
  assert.ok(
    !seenLabels.has(definition.label),
    `표시 이름이 겹친다: ${definition.label}`,
  );
  seenLabels.add(definition.label);

  assert.ok(
    definition.defaultSize.width > 0 && definition.defaultSize.height > 0,
    `${type}의 기본 크기가 0 이하다. 크기가 0이면 넣어도 보이지 않는다.`,
  );
  assert.ok(
    definition.inspectorSections.includes("transform"),
    `${type}에 Transform 섹션이 없다. 위치를 못 바꾸는 노드가 된다.`,
  );

  // 기본 style은 호출마다 새 객체여야 한다. 공유하면 한 노드를 고치면 다른 노드도
  // 같이 바뀐다.
  const firstStyle = definition.createDefaultStyle();
  const secondStyle = definition.createDefaultStyle();
  assert.notEqual(
    firstStyle,
    secondStyle,
    `${type}의 기본 style이 같은 객체를 돌려준다.`,
  );
  assert.deepEqual(
    { width: firstStyle.width, height: firstStyle.height },
    definition.defaultSize,
    `${type}의 기본 style 크기가 기본 크기와 다르다.`,
  );
}

// 이름 규칙이 정의표에서 온다. 종류 문자열을 대문자로 바꿔 만들면 도형은 `Shape`가
// 되고, 정의표에 없는 종류도 그럴듯한 이름을 얻어 화면에서 알아볼 수 없다.
assert.equal(getStudioGraphNodeTypeLabel("shape"), "Rectangle");
assert.equal(getStudioGraphNodeTypeLabel("flexibleText"), "Auto Text");
assert.equal(
  getStudioGraphNodeTypeAddMenuLabel("flexibleText"),
  "Auto-fit Text",
);
assert.equal(getStudioGraphNodeTypeAddMenuLabel("shape"), "Rectangle");

// --- 글자 종류는 기본 binding이 staticText다 ---

const TEXT_NODE_TYPES = ALL_NODE_TYPES.filter(isStudioTextNodeType);
assert.deepEqual(
  [...TEXT_NODE_TYPES].sort(),
  ["flexibleText", "text"],
  "글자를 그리는 종류가 바뀌면 안 된다.",
);

for (const type of ALL_NODE_TYPES) {
  const binding = getStudioNodeDefinition(type).createDefaultBinding();

  if (isStudioTextNodeType(type)) {
    assert.deepEqual(
      binding,
      { kind: "staticText", value: "New text" },
      `${type}의 기본 binding이 staticText가 아니다. binding이 없으면 새 글자가 빈 칸으로 만들어져 사용자가 무엇을 채워야 하는지 알 수 없다.`,
    );
    continue;
  }

  assert.equal(
    binding,
    undefined,
    `${type}에 글자 binding이 붙어 있다. 글자가 아닌 노드에 글자 값을 두면 발행 검사가 쓰이지 않는 값을 검사한다.`,
  );
}

// --- 자식을 가질 수 있는 종류는 group뿐이다 ---

assert.deepEqual(
  ALL_NODE_TYPES.filter(canStudioNodeTypeHaveChildren),
  ["group"],
  "group만 자식을 가질 수 있다. 다른 종류에 자식을 허용하면 레이어 트리에서 글자 안으로 객체를 넣을 수 있게 된다.",
);

// --- 종류별 인스펙터 섹션 ---

assert.ok(hasStudioNodeInspectorSection("shape", "shape"));
assert.ok(!hasStudioNodeInspectorSection("shape", "text"));
assert.ok(hasStudioNodeInspectorSection("image", "image"));
assert.ok(!hasStudioNodeInspectorSection("image", "text"));
assert.ok(hasStudioNodeInspectorSection("group", "group"));
assert.ok(!hasStudioNodeInspectorSection("group", "binding"));
assert.ok(hasStudioNodeInspectorSection("text", "binding"));

// --- 카드 문서의 기본 style도 종류를 빠짐없이 다룬다 ---

for (const type of ALL_NODE_TYPES) {
  const style = getStudioDefaultNodeStyle(type);
  assert.ok(
    typeof style.width === "number" && typeof style.height === "number",
    `${type}의 카드 기본 style에 크기가 없다.`,
  );
}
assert.equal(
  getStudioDefaultNodeStyle("shape").fontSize,
  undefined,
  "도형이 글자 style을 받으면 인스펙터가 엉뚱한 칸을 보여준다.",
);
assert.equal(
  getStudioDefaultNodeStyle("shape").backgroundColor,
  "#4f8cff",
  "도형은 눈에 보이는 채움색으로 시작해야 한다.",
);

// --- 종류 아이콘이 서로 다르다 ---

const iconMarkupByType = new Map<StudioGraphNodeType, string>();
for (const type of ALL_NODE_TYPES) {
  const markup = renderToStaticMarkup(<StudioNodeTypeIcon type={type} />);
  assert.ok(markup.length > 0, `${type} 아이콘이 비었다.`);
  for (const [otherType, otherMarkup] of iconMarkupByType) {
    assert.notEqual(
      markup,
      otherMarkup,
      `${type}와 ${otherType}의 아이콘이 같다. 트리에서 종류를 구별할 수 없다.`,
    );
  }
  iconMarkupByType.set(type, markup);
}
assert.match(
  iconMarkupByType.get("shape") ?? "",
  /lucide-square/,
  "도형 아이콘은 사각형이어야 한다.",
);
assert.match(
  iconMarkupByType.get("group") ?? "",
  /lucide-layers/,
  "묶음 아이콘은 겹친 판이어야 한다.",
);

// --- 렌더러가 종류마다 다르게 그린다 ---

const TEXT_VALUE = "Rendered node text";

const createRenderDocument = (
  type: StudioGraphNodeType,
): StudioTemplateDocument => {
  const document = createThumbnailStudioDocument();
  const node: StudioGraphNode = {
    id: "node_1",
    type,
    label: "Node",
    parentId: null,
    childIds: [],
    styleId: "style_1",
    binding: { kind: "staticText", value: TEXT_VALUE },
  };

  document.graph.rootNodeIds = [node.id];
  document.graph.nodes[node.id] = node;
  // 모르는 종류를 넣어 보는 검사도 이 픽스처를 쓴다. 정의표에 없는 종류는 크기만
  // 있는 style로 대신한다.
  document.styles.style_1 = getStudioNodeDefinition(type)
    ? getStudioNodeDefinition(type).createDefaultStyle()
    : { position: "absolute", width: 400, height: 200 };
  return document;
};

const emptyRuntimeValues: StudioRuntimeValues = {
  global: {},
  days: {},
  entries: {},
  timetable: { entriesByDay: {} },
};

const renderNodeType = (type: StudioGraphNodeType): string =>
  renderToStaticMarkup(
    <StudioRenderer
      document={createRenderDocument(type)}
      runtimeValues={emptyRuntimeValues}
    />,
  );

const textMarkup = renderNodeType("text");
assert.ok(textMarkup.includes(TEXT_VALUE), "글자 노드는 글자를 그려야 한다.");

const autoTextMarkup = renderNodeType("flexibleText");
assert.ok(
  autoTextMarkup.includes(TEXT_VALUE),
  "Auto Text 노드도 글자를 그려야 한다.",
);

const imageMarkup = renderNodeType("image");
assert.ok(
  imageMarkup.includes("No image"),
  "그림이 없는 이미지 노드는 빈 자리를 보여줘야 한다.",
);
assert.ok(
  !imageMarkup.includes(TEXT_VALUE),
  "이미지 노드에 글자 binding이 남아 있어도 글자를 그리지 않는다.",
);

const shapeMarkup = renderNodeType("shape");
assert.ok(
  shapeMarkup.includes('data-studio-shape-node="true"'),
  "도형 노드는 도형으로 그려져야 한다.",
);
assert.ok(
  !shapeMarkup.includes(TEXT_VALUE),
  "도형이 글자로 그려지면 새로 넣은 사각형이 빈 글자처럼 보인다.",
);
assert.ok(
  !shapeMarkup.includes("Unsupported node"),
  "도형은 렌더러가 아는 종류다.",
);

const groupMarkup = renderNodeType("group");
assert.ok(!groupMarkup.includes(TEXT_VALUE), "묶음이 글자로 그려지면 안 된다.");

// --- 렌더러가 모르는 종류를 글자로 그리지 않는다 ---

const unknownMarkup = renderToStaticMarkup(
  <StudioRenderer
    document={createRenderDocument(
      "unknownNodeType" as unknown as StudioGraphNodeType,
    )}
    runtimeValues={emptyRuntimeValues}
  />,
);
assert.ok(
  !unknownMarkup.includes(TEXT_VALUE),
  "모르는 종류를 글자로 그리면 새 종류가 빈 글자처럼 조용히 나타난다.",
);
assert.ok(
  unknownMarkup.includes("Unsupported node"),
  "모르는 종류는 그리지 못했다는 것이 눈에 보여야 한다.",
);
assert.ok(
  unknownMarkup.includes('data-studio-unsupported-node-type="unknownNodeType"'),
  "무엇을 못 그렸는지 종류 이름이 남아야 한다.",
);

// --- 감춘 노드는 그리지 않는다 ---

const hiddenDocument = createRenderDocument("text");
hiddenDocument.graph.nodes.node_1.hidden = true;
const hiddenMarkup = renderToStaticMarkup(
  <StudioRenderer
    document={hiddenDocument}
    runtimeValues={emptyRuntimeValues}
  />,
);
assert.ok(
  !hiddenMarkup.includes(TEXT_VALUE),
  "감춘 노드가 캔버스에 남으면 트리 표시와 화면이 어긋난다.",
);

const hiddenParentDocument = createRenderDocument("group");
hiddenParentDocument.graph.nodes.node_1.hidden = true;
hiddenParentDocument.graph.nodes.node_1.childIds = ["node_child"];
hiddenParentDocument.graph.nodes.node_child = {
  id: "node_child",
  type: "text",
  label: "Child",
  parentId: "node_1",
  childIds: [],
  styleId: "style_1",
  binding: { kind: "staticText", value: TEXT_VALUE },
};
assert.ok(
  !renderToStaticMarkup(
    <StudioRenderer
      document={hiddenParentDocument}
      runtimeValues={emptyRuntimeValues}
    />,
  ).includes(TEXT_VALUE),
  "부모를 감추면 자손도 함께 빠져야 한다.",
);

// --- 배경 그림 자리는 도메인을 모른다 ---

const backgroundDocument = createRenderDocument("shape");
backgroundDocument.assets.asset_1 = {
  id: "asset_1",
  label: "Background",
  src: "https://example.test/bg.png",
};
backgroundDocument.graph.nodes.node_1.assetSlots = {
  asset: { assetId: "asset_1", fit: "cover" },
};
const backgroundMarkup = renderToStaticMarkup(
  <StudioRenderer
    document={backgroundDocument}
    runtimeValues={emptyRuntimeValues}
  />,
);
assert.ok(
  backgroundMarkup.includes("background-image:url(&quot;"),
  "노드에 붙은 배경 그림 자리는 시간표 판단 없이도 그려져야 한다.",
);

console.log("Studio node definition baseline checks passed.");
