/**
 * 카드 노드 인스펙터의 기준선 가드.
 *
 * 어떤 노드에 어떤 섹션이 보이는지, 바인딩 후보를 어떻게 고르는지, 투명도를
 * 어떤 단위로 주고받는지를 고정한다. 이 규칙이 깨지면 편집기에서 값이 조용히
 * 100배로 튀거나 쓸 수 없는 바인딩이 후보로 올라온다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildStudioCardNodeInspectorSections,
  type StudioCardNodeInspectorModel,
  type StudioCardNodeInspectorSectionKey,
} from "../src/app/(root)/template-studio/_components/studio-card-node-inspector";
import type { StudioPropertyItem } from "../src/components/studio/editor-shell/studio-properties-panel";
import type {
  StudioGraphNode,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { createStudioStatusCardBackgroundExceptionMeta } from "../src/utils/template-studio/status-card-background";

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
    styleId: `${id}_style`,
    ...overrides,
  }) as StudioGraphNode;

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 1000, height: 1000, background: "#fff" },
    graph: {
      rootNodeIds: ["text", "image", "group"],
      nodes: {
        text: createNode("text"),
        image: createNode("image", { type: "image" }),
        group: createNode("group", { type: "group" }),
      },
    },
    inputs: {
      input_text: {
        id: "input_text",
        type: "text",
        scope: "entry",
        label: "Memo",
        defaultValue: "",
      },
      input_image: {
        id: "input_image",
        type: "image",
        scope: "global",
        label: "Sticker",
        defaultUrl: "",
      },
    },
    styles: {
      text_style: {
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        opacity: 0.5,
        fontSize: 24,
      },
      image_style: { left: 0, top: 0, width: 80, height: 80 },
      group_style: { left: 0, top: 0, width: 200, height: 200 },
    },
    assets: {
      asset_a: { id: "asset_a", label: "Asset A", src: "a.png" },
    },
  }) as unknown as StudioTemplateDocument;

interface BuildResult {
  sections: StudioPropertyItem[];
  toggled: StudioCardNodeInspectorSectionKey[];
  styleUpdates: Array<[string, string | number | undefined]>;
  boundInputIds: string[];
  boundFieldIds: string[];
  staticBindingCalls: number;
  fitParentCalls: number;
}

const build = (
  document: StudioTemplateDocument,
  selectedNode: StudioGraphNode | null,
  overrides: Partial<StudioCardNodeInspectorModel> = {},
): BuildResult => {
  const result: BuildResult = {
    sections: [],
    toggled: [],
    styleUpdates: [],
    boundInputIds: [],
    boundFieldIds: [],
    staticBindingCalls: 0,
    fitParentCalls: 0,
  };

  result.sections = buildStudioCardNodeInspectorSections({
    document,
    selectedNode,
    fontFamilies: ["Inter", "Pretendard"],
    isSectionOpen: () => true,
    onToggleSection: (sectionKey) => result.toggled.push(sectionKey),
    renderStatusBackgroundAssetSlot: () => (
      <div data-slot="status-background">slot</div>
    ),
    updateNode: (nodeId, updater) => {
      const node = document.graph.nodes[nodeId];
      if (node) updater(node, document);
    },
    updateStyle: (key, value) => result.styleUpdates.push([key, value]),
    updateTextAlignment: () => {},
    toggleFitParent: () => {
      result.fitParentCalls += 1;
    },
    setStaticBinding: () => {
      result.staticBindingCalls += 1;
    },
    bindToInput: (inputId) => result.boundInputIds.push(inputId),
    bindToBuiltinField: (fieldId) => result.boundFieldIds.push(fieldId),
    ...overrides,
  });

  return result;
};

const sectionIds = (sections: StudioPropertyItem[]): string[] =>
  sections.map((section) => section.id);

const findSection = (
  sections: StudioPropertyItem[],
  idPrefix: string,
): StudioPropertyItem => {
  const section = sections.find((candidate) =>
    candidate.id.startsWith(idPrefix),
  );
  if (!section) throw new Error(`섹션을 찾지 못했다: ${idPrefix}`);
  return section;
};

const markupOf = (section: StudioPropertyItem): string =>
  renderToStaticMarkup(<>{section.content}</>);

// --- 고른 노드가 없을 때 ---

const emptyResult = build(createDocument(), null);
assert.deepEqual(
  sectionIds(emptyResult.sections),
  ["cards:emptySelection"],
  "고른 노드가 없으면 안내 하나만 보여준다.",
);
assert.ok(
  markupOf(emptyResult.sections[0]).includes(
    "Select an object from the canvas or layer tree.",
  ),
  "안내 문구가 유지된다.",
);

// --- 노드 종류별 섹션 구성 ---

const document = createDocument();

const textSections = sectionIds(
  build(document, document.graph.nodes.text).sections,
);
assert.deepEqual(
  textSections,
  [
    "position:Position",
    "layout:Layout",
    "appearance:Appearance",
    "binding:Binding",
    "typography:Typography",
  ],
  "텍스트 노드의 섹션 종류와 순서가 바뀌면 안 된다.",
);

const imageSections = sectionIds(
  build(document, document.graph.nodes.image).sections,
);
assert.deepEqual(
  imageSections,
  [
    "position:Position",
    "layout:Layout",
    "appearance:Appearance",
    "binding:Binding",
    "cards:imageFit",
  ],
  "이미지 노드는 Typography 대신 Fit을 보여준다.",
);

const groupSections = sectionIds(
  build(document, document.graph.nodes.group).sections,
);
assert.deepEqual(
  groupSections,
  ["position:Position", "layout:Layout", "appearance:Appearance"],
  "그룹 노드에는 바인딩과 글꼴 섹션이 없다.",
);

// --- 상태 카드 배경 노드 ---

const statusDocument = createDocument();
statusDocument.graph.nodes.background = createNode("background", {
  type: "group",
  meta: {
    exception: createStudioStatusCardBackgroundExceptionMeta(),
  },
} as Partial<StudioGraphNode>);
statusDocument.styles.background_style = { left: 0, top: 0 };

const statusSections = build(
  statusDocument,
  statusDocument.graph.nodes.background,
).sections;

assert.deepEqual(
  sectionIds(statusSections),
  [
    "position:Position",
    "layout:Layout",
    "appearance:Appearance",
    "statusAssets:Background Asset",
  ],
  "상태 배경 노드에는 배경 에셋 섹션이 더 붙는다.",
);
assert.ok(
  markupOf(findSection(statusSections, "statusAssets:")).includes(
    'data-slot="status-background"',
  ),
  "배경 에셋 자리는 받은 것을 그대로 놓는다. 시간표 도메인이 소유하는 UI다.",
);
assert.ok(
  markupOf(findSection(statusSections, "appearance:")).includes("Base Color"),
  "상태 배경 노드에는 바탕색 편집이 함께 나타난다.",
);
assert.ok(
  !markupOf(
    findSection(
      build(document, document.graph.nodes.group).sections,
      "appearance:",
    ),
  ).includes("Base Color"),
  "상태 배경이 아니면 바탕색 편집을 보여주지 않는다.",
);

// --- 위치와 크기 ---

const positionSection = findSection(
  build(document, document.graph.nodes.text).sections,
  "position:",
);
const positionMarkup = markupOf(positionSection);

assert.ok(positionMarkup.includes('value="10"'), "X 좌표를 보여준다.");
assert.ok(positionMarkup.includes('value="20"'), "Y 좌표를 보여준다.");
assert.equal(
  (positionMarkup.match(/<button/g) ?? []).length,
  6,
  "정렬 버튼 여섯 개 자리를 유지한다.",
);
assert.ok(
  positionSection.kind !== "block" && positionSection.action !== undefined,
  "Position 섹션 제목 줄에 Fit 버튼이 붙는다.",
);

// 부모를 채우는 노드는 좌표와 크기를 직접 못 바꾼다.
const fitParentDocument = createDocument();
fitParentDocument.graph.nodes.text.layoutMode = "fillParent";
const fitParentSections = build(
  fitParentDocument,
  fitParentDocument.graph.nodes.text,
).sections;

assert.ok(
  markupOf(findSection(fitParentSections, "position:")).includes('disabled=""'),
  "부모를 채우면 좌표를 잠근다.",
);
assert.ok(
  markupOf(findSection(fitParentSections, "layout:")).includes('disabled=""'),
  "부모를 채우면 크기를 잠근다.",
);
assert.ok(
  !markupOf(
    findSection(build(document, document.graph.nodes.text).sections, "layout:"),
  ).includes('disabled=""'),
  "크기를 직접 정하는 노드는 잠그지 않는다.",
);

// --- 투명도 단위 ---

const appearanceMarkup = markupOf(
  findSection(
    build(document, document.graph.nodes.text).sections,
    "appearance:",
  ),
);
assert.ok(
  appearanceMarkup.includes('value="50"'),
  "문서의 0~1 투명도를 백분율로 보여준다.",
);

const opacityResult = build(document, document.graph.nodes.text);
const opacityField = (
  findSection(opacityResult.sections, "appearance:") as {
    content: React.ReactElement<{ children: React.ReactElement[] }>;
  }
).content.props.children[0] as React.ReactElement<{
  onChange: (value: number) => void;
}>;

opacityField.props.onChange(40);
assert.deepEqual(
  opacityResult.styleUpdates,
  [["opacity", 0.4]],
  "사람이 넣은 백분율을 0~1로 되돌려 저장한다.",
);

opacityField.props.onChange(140);
opacityField.props.onChange(-20);
assert.deepEqual(
  opacityResult.styleUpdates.slice(1),
  [
    ["opacity", 1],
    ["opacity", 0],
  ],
  "범위를 벗어난 값은 0과 1 사이로 자른다.",
);

// --- 바인딩 후보 ---
//
// 후보 목록은 묶인 상태에서만 나타난다. 노드가 쓸 수 없는 입력이 후보로 오르면
// 고르는 순간 렌더가 비어버리므로 종류별로 걸러지는지 확인한다.

const bindNode = (
  nodeId: "text" | "image",
  inputId: string,
): { document: StudioTemplateDocument; node: StudioGraphNode } => {
  const nextDocument = createDocument();
  const node = nextDocument.graph.nodes[nodeId];
  node.binding = {
    kind: nodeId === "text" ? "inputText" : "inputImage",
    inputId,
  } as StudioGraphNode["binding"];
  return { document: nextDocument, node };
};

const boundTextCase = bindNode("text", "input_text");
const bindingMarkup = markupOf(
  findSection(
    build(boundTextCase.document, boundTextCase.node).sections,
    "binding:",
  ),
);
assert.ok(
  bindingMarkup.includes("Memo"),
  "텍스트 노드에는 글자 입력이 후보로 오른다.",
);
assert.ok(
  !bindingMarkup.includes("Sticker"),
  "텍스트 노드에 이미지 입력이 후보로 오르면 안 된다.",
);

const boundImageCase = bindNode("image", "input_image");
const imageBindingMarkup = markupOf(
  findSection(
    build(boundImageCase.document, boundImageCase.node).sections,
    "binding:",
  ),
);
assert.ok(
  imageBindingMarkup.includes("Sticker"),
  "이미지 노드에는 이미지 입력이 후보로 오른다.",
);
assert.ok(
  !imageBindingMarkup.includes("Memo"),
  "이미지 노드에 글자 입력이 후보로 오르면 안 된다.",
);

// 쓸 수 있는 후보가 없으면 Bound를 누를 수 없다.
const noBindingDocument = createDocument();
noBindingDocument.inputs = {};
const noBindingMarkup = markupOf(
  findSection(
    build(noBindingDocument, noBindingDocument.graph.nodes.image).sections,
    "binding:",
  ),
);
assert.ok(
  noBindingMarkup.includes("No compatible binding") ||
    noBindingMarkup.includes('disabled=""'),
  "후보가 없으면 바인딩으로 바꿀 수 없게 막는다.",
);

// --- 정적 바인딩 ---

const staticTextMarkup = markupOf(
  findSection(build(document, document.graph.nodes.text).sections, "binding:"),
);
assert.ok(
  staticTextMarkup.includes("Static text"),
  "묶이지 않은 텍스트는 글자를 직접 적는다.",
);

const staticAssetMarkup = markupOf(
  findSection(build(document, document.graph.nodes.image).sections, "binding:"),
);
assert.ok(
  staticAssetMarkup.includes("Static asset"),
  "묶이지 않은 이미지는 에셋을 고른다.",
);
assert.ok(
  staticAssetMarkup.includes("Asset A"),
  "문서의 에셋이 후보로 오른다.",
);

// 묶인 노드는 정적 편집을 보여주지 않는다.
const boundDocument = createDocument();
boundDocument.graph.nodes.text.binding = {
  kind: "inputText",
  inputId: "input_text",
} as StudioGraphNode["binding"];
const boundMarkup = markupOf(
  findSection(
    build(boundDocument, boundDocument.graph.nodes.text).sections,
    "binding:",
  ),
);
assert.ok(
  !boundMarkup.includes("Static text"),
  "묶인 노드에는 정적 글자 입력이 없다.",
);
assert.ok(
  boundMarkup.includes("Custom Input Source"),
  "묶인 노드는 어떤 입력에 묶였는지 보여준다.",
);

// --- 글꼴 ---

const typographyMarkup = markupOf(
  findSection(
    build(document, document.graph.nodes.text).sections,
    "typography:",
  ),
);
assert.ok(typographyMarkup.includes("Pretendard"), "폰트 후보를 받아서 쓴다.");
assert.ok(typographyMarkup.includes('value="24"'), "글자 크기를 보여준다.");
assert.ok(
  !typographyMarkup.includes("Line Breaks"),
  "고정 크기 텍스트에는 줄바꿈 선택이 없다.",
);

const flexibleDocument = createDocument();
flexibleDocument.graph.nodes.text.type = "flexibleText";
assert.ok(
  markupOf(
    findSection(
      build(flexibleDocument, flexibleDocument.graph.nodes.text).sections,
      "typography:",
    ),
  ).includes("Line Breaks"),
  "Auto Text에는 줄바꿈 선택이 나타난다.",
);

// --- 섹션 접기 ---

const closedResult = build(document, document.graph.nodes.text, {
  isSectionOpen: (sectionKey) => sectionKey !== "layout",
});
const layoutSection = findSection(closedResult.sections, "layout:");
assert.ok(
  layoutSection.kind !== "block" && layoutSection.open === false,
  "닫힌 섹션은 닫힌 상태로 넘어간다.",
);

// 위 assert가 섹션 종류를 좁혀 주므로 여기서 다시 확인하지 않는다.
layoutSection.onToggle();
assert.deepEqual(
  closedResult.toggled,
  ["layout"],
  "섹션을 누르면 그 섹션 키로 알린다.",
);

console.log("Studio card node inspector baseline checks passed.");
