/**
 * 썸네일 편집기 화면의 기준선 가드.
 *
 * 마크업만 보면 단추가 무엇을 부르는지 알 수 없다. 그래서 만들어진 요소 나무에서
 * 단추를 직접 눌러 확인한다. 눌러도 아무 일이 없는 단추와, 할 수 없는 일을 할 수 있게
 * 보이는 단추가 이 편집기에서 가장 흔한 고장이다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 명령이 문서를 어떻게 바꾸는지. 그것은 각 명령의 순수 함수 가드가 본다.
 * - 포인터를 실제로 끌었을 때의 좌표 계산. 그것은 `check:studio:transform-commands`가 본다.
 * - client가 명령 훅과 셸에 값을 넘기는 배선. 화면 구성은
 *   `check:studio:thumbnail-shell`이 렌더해서 본다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioSelectionOverlay } from "../src/components/studio/canvas/studio-selection-overlay";
import { buildThumbnailInspectorSections } from "../src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector";
import {
  ThumbnailAddMenu,
  ThumbnailLayerCommandBar,
} from "../src/app/(root)/admin/thumbnail-studio/_components/thumbnail-layer-tabs";
import type { ThumbnailNodeCommands } from "../src/app/(root)/admin/thumbnail-studio/_hooks/use-thumbnail-node-commands";
import type {
  StudioGraphNode,
  StudioGraphNodeType,
  StudioTemplateDocument,
} from "../src/types/template-studio";
import { STUDIO_NODE_TYPE_ORDER } from "../src/utils/template-studio/node-definitions";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";

interface FoundButton {
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

/**
 * 만들어진 요소 나무에서 누를 수 있는 단추를 모은다.
 *
 * 감싸는 컴포넌트 안에도 단추가 있으므로 함수 컴포넌트는 불러서 그 결과까지 훑는다.
 * `props.children`만 따라가면 감싼 단추를 통째로 놓친다.
 */
const findButtons = (node: React.ReactNode): FoundButton[] => {
  const found: FoundButton[] = [];
  const visit = (current: React.ReactNode) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!React.isValidElement(current)) return;

    const props = current.props as Record<string, unknown>;
    if (current.type === "button") {
      found.push(props as FoundButton);
    }
    if (typeof current.type === "function") {
      visit(
        (current.type as (componentProps: unknown) => React.ReactNode)(props),
      );
      return;
    }
    visit(props.children as React.ReactNode);
  };
  visit(node);
  return found;
};

// --- 추가 메뉴 ---

const addedTypes: StudioGraphNodeType[] = [];
const addMenuTree = ThumbnailAddMenu({
  onAddNode: (type) => addedTypes.push(type),
});
const addMenuButtons = findButtons(addMenuTree);

assert.equal(
  addMenuButtons.length,
  STUDIO_NODE_TYPE_ORDER.length,
  "추가 메뉴는 노드 정의표의 종류를 모두 보여줘야 한다.",
);
addMenuButtons.forEach((button) => button.onClick?.());
assert.deepEqual(
  addedTypes,
  [...STUDIO_NODE_TYPE_ORDER],
  "추가 메뉴 단추는 자기 종류를 넣어야 한다. 순서도 정의표를 따른다.",
);

const addMenuMarkup = renderToStaticMarkup(addMenuTree);
for (const expectedTitle of [
  'title="Add Text"',
  'title="Add Auto-fit Text"',
  'title="Add Image"',
  'title="Add Rectangle"',
  'title="Add Group"',
]) {
  assert.ok(
    addMenuMarkup.includes(expectedTitle),
    `추가 메뉴에서 사라진 항목이 있다: ${expectedTitle}`,
  );
}
assert.ok(
  addMenuMarkup.includes('data-thumbnail-add-node="shape"'),
  "도형을 넣을 수 있어야 한다.",
);
// 종류 아이콘은 행의 첫 svg가 아니라 각 단추 안의 svg다. 도형은 사각형이다.
assert.ok(
  addMenuMarkup.includes("lucide-square"),
  "도형 아이콘이 사각형이 아니면 무엇이 만들어지는지 알 수 없다.",
);

// --- 레이어 명령 줄 ---

const createCommandBar = (
  overrides: Partial<Parameters<typeof ThumbnailLayerCommandBar>[0]> = {},
  calls: string[] = [],
) =>
  ThumbnailLayerCommandBar({
    hasSelection: false,
    hasGroupSelection: false,
    hasMultiSelection: false,
    isLocked: false,
    isHidden: false,
    onMoveLayer: (command) => calls.push(`move:${command}`),
    onGroup: () => calls.push("group"),
    onUngroup: () => calls.push("ungroup"),
    onToggleLock: () => calls.push("lock"),
    onToggleHidden: () => calls.push("hidden"),
    onDelete: () => calls.push("delete"),
    ...overrides,
  });

const emptySelectionButtons = findButtons(createCommandBar());
assert.equal(
  emptySelectionButtons.length,
  9,
  "레이어 명령 단추 개수가 바뀌면 안 된다.",
);
assert.ok(
  emptySelectionButtons.every((button) => button.disabled === true),
  "고른 것이 없으면 모든 명령을 누를 수 없어야 한다. 눌러도 아무 일이 없으면 편집기가 멈춘 것으로 읽힌다.",
);

const singleSelectionButtons = findButtons(
  createCommandBar({ hasSelection: true }),
);
const buttonByTitle = new Map(
  singleSelectionButtons.map((button) => [button.title, button]),
);
assert.equal(
  buttonByTitle.get("Group selection")?.disabled,
  true,
  "하나만 골랐으면 묶을 수 없다.",
);
assert.equal(
  buttonByTitle.get("Ungroup selection")?.disabled,
  true,
  "묶음이 아니면 풀 수 없다.",
);
assert.equal(
  buttonByTitle.get("Bring forward")?.disabled,
  false,
  "하나만 골라도 순서는 바꿀 수 있다.",
);
assert.equal(buttonByTitle.get("Delete selection")?.disabled, false);

const multiSelectionButtons = findButtons(
  createCommandBar({ hasSelection: true, hasMultiSelection: true }),
);
assert.equal(
  new Map(multiSelectionButtons.map((button) => [button.title, button])).get(
    "Group selection",
  )?.disabled,
  false,
  "여러 개를 골랐으면 묶을 수 있어야 한다.",
);

const groupSelectionButtons = findButtons(
  createCommandBar({ hasSelection: true, hasGroupSelection: true }),
);
assert.equal(
  new Map(groupSelectionButtons.map((button) => [button.title, button])).get(
    "Ungroup selection",
  )?.disabled,
  false,
);

// 잠금과 숨김 단추는 지금 상태의 반대를 알려준다.
const lockedBarMarkup = renderToStaticMarkup(
  createCommandBar({ hasSelection: true, isLocked: true, isHidden: true }),
);
assert.ok(lockedBarMarkup.includes('title="Unlock selection"'));
assert.ok(lockedBarMarkup.includes('title="Show selection"'));
const unlockedBarMarkup = renderToStaticMarkup(
  createCommandBar({ hasSelection: true }),
);
assert.ok(unlockedBarMarkup.includes('title="Lock selection"'));
assert.ok(unlockedBarMarkup.includes('title="Hide selection"'));

// 각 단추가 자기 명령을 부른다.
const commandCalls: string[] = [];
findButtons(
  createCommandBar(
    { hasSelection: true, hasGroupSelection: true, hasMultiSelection: true },
    commandCalls,
  ),
).forEach((button) => button.onClick?.());
assert.deepEqual(
  commandCalls,
  [
    "move:forward",
    "move:backward",
    "move:front",
    "move:back",
    "group",
    "ungroup",
    "lock",
    "hidden",
    "delete",
  ],
  "레이어 명령 단추가 서로 다른 일을 해야 한다.",
);

// --- 인스펙터 섹션 ---

const createNode = (
  id: string,
  type: StudioGraphNodeType,
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id,
  type,
  label: id,
  parentId: null,
  childIds: [],
  styleId: `${id}_style`,
  ...overrides,
});

const createInspectorDocument = (): StudioTemplateDocument => {
  const document = createThumbnailStudioDocument();
  document.graph.rootNodeIds = ["text", "shape", "image", "group"];
  document.graph.nodes = {
    text: createNode("text", "text", {
      binding: { kind: "staticText", value: "Hello" },
    }),
    shape: createNode("shape", "shape"),
    image: createNode("image", "image", {
      fit: "cover",
      binding: { kind: "staticAsset", assetId: "asset" },
    }),
    group: createNode("group", "group"),
  };
  document.styles = {
    text_style: { left: 10, top: 20, width: 480, height: 100, fontSize: 64 },
    shape_style: {
      left: 50,
      top: 60,
      width: 400,
      height: 200,
      backgroundColor: "#4f8cff",
    },
    image_style: {
      left: 70,
      top: 80,
      width: 400,
      height: 300,
      objectPosition: "25% 75%",
      borderRadius: 18,
      opacity: 0.8,
    },
    group_style: { left: 90, top: 100, width: 600, height: 400 },
  };
  document.assets.asset = {
    id: "asset",
    label: "Asset",
    src: "data:image/png;base64,YXNzZXQ=",
  };
  return document;
};

const createCommandsStub = (calls: string[] = []): ThumbnailNodeCommands =>
  ({
    addNode: () => calls.push("addNode"),
    deleteNodes: () => calls.push("deleteNodes"),
    duplicateNodes: () => calls.push("duplicateNodes"),
    groupNodes: () => calls.push("groupNodes"),
    ungroupNodes: () => calls.push("ungroupNodes"),
    moveLayer: () => calls.push("moveLayer"),
    toggleLock: () => calls.push("toggleLock"),
    toggleHidden: () => calls.push("toggleHidden"),
    renameNode: () => calls.push("renameNode"),
    nudgeNodes: () => calls.push("nudgeNodes"),
    beginNodeMove: () => true,
    moveNodeByDrag: () => calls.push("moveNodeByDrag"),
    setStyleValue: (nodeId: string, key: string) =>
      calls.push(`setStyleValue:${nodeId}:${key}`),
    setGeometry: (nodeId: string, geometry: Record<string, number>) =>
      calls.push(`setGeometry:${nodeId}:${Object.keys(geometry).join(",")}`),
    setRotation: (nodeId: string) => calls.push(`setRotation:${nodeId}`),
    setTextAlignment: () => calls.push("setTextAlignment"),
    toggleFitParent: () => calls.push("toggleFitParent"),
    setImageFit: () => calls.push("setImageFit"),
    setStaticText: () => calls.push("setStaticText"),
    setImageAsset: () => calls.push("setImageAsset"),
    alignNodes: (axis: string, alignment: string) =>
      calls.push(`align:${axis}:${alignment}`),
    distributeNodes: (axis: string) => calls.push(`distribute:${axis}`),
    setCanvasSize: () => calls.push("setCanvasSize"),
    setCanvasBackground: () => calls.push("setCanvasBackground"),
    setCanvasName: () => calls.push("setCanvasName"),
    selectAll: () => calls.push("selectAll"),
  }) as unknown as ThumbnailNodeCommands;

const buildSections = ({
  document,
  selectedNodeIds,
  outsideCanvasNodeIds = [],
  clippedCanvasNodeIds = [],
  groupOverflowDiagnostics = [],
  calls = [],
}: {
  document: StudioTemplateDocument;
  selectedNodeIds: string[];
  outsideCanvasNodeIds?: string[];
  clippedCanvasNodeIds?: string[];
  groupOverflowDiagnostics?: Array<{ groupId: string; childIds: string[] }>;
  calls?: string[];
}) => {
  const selectedNodes = selectedNodeIds.map(
    (nodeId) => document.graph.nodes[nodeId],
  );

  return buildThumbnailInspectorSections({
    document,
    selectedNodes,
    selectedNode: selectedNodes.at(-1) ?? null,
    openSections: {},
    onToggleSection: () => {},
    aspectRatioLocked: false,
    onAspectRatioLockedChange: () => {},
    canvasPresets: [
      { id: "youtube", label: "YouTube", width: 1280, height: 720 },
    ],
    outsideCanvasNodeIds,
    clippedCanvasNodeIds,
    groupOverflowDiagnostics,
    commands: createCommandsStub(calls),
    captureHistory: () => calls.push("captureHistory"),
    onFitCanvas: () => calls.push("fitCanvas"),
    onCreateInput: () => calls.push("createInput"),
    onOpenInput: () => calls.push("openInput"),
    onCropImage: () => calls.push("cropImage"),
  });
};

const inspectorDocument = createInspectorDocument();
const sectionIdsFor = (selectedNodeIds: string[]): string[] =>
  buildSections({ document: inspectorDocument, selectedNodeIds }).map(
    (item) => item.id,
  );

assert.deepEqual(
  sectionIdsFor(["text"]),
  ["transform", "layout", "binding", "text"],
  "글자 노드에 binding inspector가 한 번만 있어야 한다.",
);
assert.deepEqual(
  sectionIdsFor(["shape"]),
  ["transform", "layout", "shape"],
  "도형에는 글자 칸이 없어야 한다. 바꿔도 아무 일이 없는 칸을 만지게 된다.",
);
assert.deepEqual(sectionIdsFor(["image"]), [
  "transform",
  "layout",
  "binding",
  "image",
]);
assert.deepEqual(sectionIdsFor(["group"]), ["transform", "layout", "group"]);

const imageSection = buildSections({
  document: inspectorDocument,
  selectedNodeIds: ["image"],
}).find((item) => item.id === "image");
assert.ok(imageSection && imageSection.kind !== "block");
const imageMarkup = renderToStaticMarkup(<>{imageSection.content}</>);
for (const label of [
  "Asset",
  "Fit",
  "Focus X %",
  "Focus Y %",
  "Border radius",
  "Crop image",
]) {
  assert.ok(
    imageMarkup.includes(label),
    `이미지 Inspector에 ${label}이 있어야 한다.`,
  );
}

const lockedImageDocument = createInspectorDocument();
lockedImageDocument.graph.nodes.image.locked = true;
const lockedImageSection = buildSections({
  document: lockedImageDocument,
  selectedNodeIds: ["image"],
}).find((item) => item.id === "image");
assert.ok(lockedImageSection && lockedImageSection.kind !== "block");
assert.equal(
  (
    renderToStaticMarkup(<>{lockedImageSection.content}</>).match(
      /disabled=""/g,
    ) ?? []
  ).length,
  6,
  "잠근 이미지의 Asset·Fit·Crop·Focus X·Focus Y·Border radius가 모두 비활성이어야 한다.",
);

// 고른 것이 없으면 캔버스 속성을 보여준다.
assert.deepEqual(
  sectionIdsFor([]),
  ["canvas", "thumbnail:emptySelection"],
  "편집할 대상이 없을 때 캔버스 속성을 보여줘야 한다. 빈 패널이면 크기와 배경을 바꾸러 갈 곳이 없다.",
);

// --- 다중 선택 ---

const multiSections = buildSections({
  document: inspectorDocument,
  selectedNodeIds: ["text", "shape"],
});
const transformSection = multiSections.find((item) => item.id === "transform");
assert.ok(transformSection && transformSection.kind !== "block");
const transformMarkup = renderToStaticMarkup(<>{transformSection.content}</>);
/**
 * 개수를 센다.
 *
 * 있는지만 보면 칸 하나에서 갈림 표시를 떼어낸 회귀를 놓친다. 다른 칸이 여전히
 * 갈렸다고 알리기 때문이다. 처음에 그렇게 썼다가 실제로 놓쳤다.
 */
assert.equal(
  (transformMarkup.match(/placeholder="Mixed"/g) ?? []).length,
  4,
  "X·Y·W·H가 모두 갈렸으면 네 칸이 갈렸다고 알려야 한다. 첫 값만 보여주면 고른 것 전부가 그 값이라고 읽힌다.",
);

// 한 칸만 갈린 경우도 그 칸만 알려야 한다.
const oneMixedDocument = createInspectorDocument();
oneMixedDocument.styles.shape_style = {
  ...oneMixedDocument.styles.text_style,
  left: 999,
};
const oneMixedSection = buildSections({
  document: oneMixedDocument,
  selectedNodeIds: ["text", "shape"],
}).find((item) => item.id === "transform");
assert.ok(oneMixedSection && oneMixedSection.kind !== "block");
assert.equal(
  (
    renderToStaticMarkup(<>{oneMixedSection.content}</>).match(
      /placeholder="Mixed"/g,
    ) ?? []
  ).length,
  1,
  "X만 갈렸으면 X 칸만 갈렸다고 알려야 한다.",
);

const sameValueDocument = createInspectorDocument();
sameValueDocument.styles.shape_style = {
  ...sameValueDocument.styles.shape_style,
  left: 10,
  top: 20,
  width: 480,
  height: 100,
};
const sameValueSection = buildSections({
  document: sameValueDocument,
  selectedNodeIds: ["text", "shape"],
}).find((item) => item.id === "transform");
assert.ok(sameValueSection && sameValueSection.kind !== "block");
assert.ok(
  !renderToStaticMarkup(<>{sameValueSection.content}</>).includes(
    'placeholder="Mixed"',
  ),
  "값이 같으면 그 값을 보여준다.",
);

// 잠근 노드는 편집 칸을 비활성으로 둔다. 개수로 세야 `disabled:` 유틸리티와 구별된다.
const lockedDocument = createInspectorDocument();
lockedDocument.graph.nodes.text.locked = true;
const lockedTransform = buildSections({
  document: lockedDocument,
  selectedNodeIds: ["text"],
}).find((item) => item.id === "transform");
assert.ok(lockedTransform && lockedTransform.kind !== "block");
assert.equal(lockedTransform.badge, "Locked");
assert.equal(
  (
    renderToStaticMarkup(<>{lockedTransform.content}</>).match(
      /disabled=""/g,
    ) ?? []
  ).length,
  6,
  "잠근 노드의 X·Y·W·H·Rotation·Opacity 칸이 모두 비활성이어야 한다.",
);
const unlockedTransform = buildSections({
  document: inspectorDocument,
  selectedNodeIds: ["text"],
}).find((item) => item.id === "transform");
assert.ok(unlockedTransform && unlockedTransform.kind !== "block");
assert.equal(
  (
    renderToStaticMarkup(<>{unlockedTransform.content}</>).match(
      /disabled=""/g,
    ) ?? []
  ).length,
  0,
  "잠기지 않은 노드는 좌표를 바꿀 수 있어야 한다.",
);
const lockedBinding = buildSections({
  document: lockedDocument,
  selectedNodeIds: ["text"],
}).find((item) => item.id === "binding");
const lockedText = buildSections({
  document: lockedDocument,
  selectedNodeIds: ["text"],
}).find((item) => item.id === "text");
assert.ok(lockedBinding && lockedBinding.kind !== "block");
assert.ok(lockedText && lockedText.kind !== "block");
assert.match(
  renderToStaticMarkup(<>{lockedBinding.content}</>),
  /<textarea[^>]*disabled=""/,
  "잠근 text의 static binding 내용은 편집할 수 없어야 한다.",
);
assert.match(
  renderToStaticMarkup(<>{lockedText.content}</>),
  /<textarea[^>]*disabled=""/,
  "잠근 text의 Content는 편집할 수 없어야 한다.",
);

// --- 정렬과 분배 단추 ---

const layoutCalls: string[] = [];
const layoutSection = buildSections({
  document: inspectorDocument,
  selectedNodeIds: ["text"],
  calls: layoutCalls,
}).find((item) => item.id === "layout");
assert.ok(layoutSection && layoutSection.kind !== "block");
const layoutButtons = findButtons(layoutSection.content);
assert.equal(
  layoutButtons.length,
  8,
  "정렬 여섯 개와 분배 두 개가 있어야 한다.",
);
assert.equal(
  layoutButtons.filter((button) => button.disabled).length,
  2,
  "하나만 골랐으면 분배 단추만 누를 수 없다.",
);
layoutButtons.forEach((button) => {
  if (button.disabled) return;
  button.onClick?.();
});
assert.deepEqual(
  layoutCalls,
  [
    "align:horizontal:start",
    "align:horizontal:center",
    "align:horizontal:end",
    "align:vertical:start",
    "align:vertical:center",
    "align:vertical:end",
  ],
  "정렬 단추가 서로 다른 축과 방향을 불러야 한다.",
);

const distributeCalls: string[] = [];
const distributeSection = buildSections({
  document: inspectorDocument,
  selectedNodeIds: ["text", "shape", "image"],
  calls: distributeCalls,
}).find((item) => item.id === "layout");
assert.ok(distributeSection && distributeSection.kind !== "block");
const distributeButtons = findButtons(distributeSection.content).filter(
  (button) => !button.disabled,
);
assert.equal(
  distributeButtons.length,
  8,
  "세 개 이상 골랐으면 분배도 누를 수 있어야 한다.",
);
distributeButtons.slice(6).forEach((button) => button.onClick?.());
assert.deepEqual(distributeCalls, [
  "distribute:horizontal",
  "distribute:vertical",
]);

// --- 캔버스 섹션 ---

const canvasCalls: string[] = [];
const canvasSection = buildSections({
  document: inspectorDocument,
  selectedNodeIds: [],
  outsideCanvasNodeIds: ["shape", "image"],
  calls: canvasCalls,
}).find((item) => item.id === "canvas");
assert.ok(canvasSection && canvasSection.kind !== "block");
const canvasMarkup = renderToStaticMarkup(<>{canvasSection.content}</>);
assert.ok(
  canvasMarkup.includes('data-thumbnail-outside-canvas-warning="true"'),
  "캔버스 밖 노드는 알려야 한다.",
);
assert.ok(
  canvasMarkup.includes("They are kept, not deleted."),
  "캔버스 밖 노드를 지우지 않는다는 것을 알려야 한다. 지우면 되돌릴 수 없는 손실이 된다.",
);
const clippingCanvasMarkup = renderToStaticMarkup(
  <>
    {
      (
        buildSections({
          document: inspectorDocument,
          selectedNodeIds: [],
          clippedCanvasNodeIds: ["text"],
          groupOverflowDiagnostics: [{ groupId: "group", childIds: ["text"] }],
        }).find((item) => item.id === "canvas") as {
          content: React.ReactNode;
        }
      ).content
    }
  </>,
);
assert.ok(
  clippingCanvasMarkup.includes(
    'data-thumbnail-canvas-clipping-warning="true"',
  ),
);
assert.ok(
  clippingCanvasMarkup.includes('data-thumbnail-group-overflow-warning="true"'),
);
assert.ok(
  !renderToStaticMarkup(
    <>
      {
        (
          buildSections({
            document: inspectorDocument,
            selectedNodeIds: [],
          }).find((item) => item.id === "canvas") as {
            content: React.ReactNode;
          }
        ).content
      }
    </>,
  ).includes('data-thumbnail-outside-canvas-warning="true"'),
  "밖으로 나간 노드가 없으면 경고를 띄우지 않는다.",
);

const effectDocument = createInspectorDocument();
effectDocument.graph.nodes.text.textAppearance = {
  fill: { type: "solid", color: "#fff", opacity: 1 },
  strokes: [
    { id: "disabled", enabled: false, color: "#000", outset: 4, opacity: 1 },
    { id: "enabled", enabled: true, color: "#000", outset: 8, opacity: 1 },
  ],
};
const effectSection = buildSections({
  document: effectDocument,
  selectedNodeIds: ["text"],
}).find((item) => item.id === "text");
assert.ok(effectSection && effectSection.kind !== "block");
const effectMarkup = renderToStaticMarkup(<>{effectSection.content}</>);
assert.equal(
  (effectMarkup.match(/draggable="true"/g) ?? []).length,
  2,
  "disabled stroke is still a draggable stored layer",
);

// --- 선택 overlay ---

const overlayMarkup = renderToStaticMarkup(
  <StudioSelectionOverlay
    bounds={{ left: 10, top: 20, width: 100, height: 50 }}
    scale={1}
  />,
);
assert.equal(
  (overlayMarkup.match(/data-studio-resize-handle="/g) ?? []).length,
  8,
  "모서리 네 개와 변 네 개의 손잡이가 있어야 한다.",
);
assert.ok(
  overlayMarkup.includes('data-studio-rotate-handle="true"'),
  "회전 손잡이가 있어야 한다.",
);
assert.ok(
  overlayMarkup.includes("pointer-events-none"),
  "선 자체는 클릭을 먹지 않아야 한다. 먹으면 그 아래 객체를 고를 수 없다.",
);
assert.equal(
  (overlayMarkup.match(/pointer-events-auto/g) ?? []).length,
  9,
  "손잡이만 클릭을 받아야 한다.",
);

const noHandlesMarkup = renderToStaticMarkup(
  <StudioSelectionOverlay
    bounds={{ left: 10, top: 20, width: 100, height: 50 }}
    scale={1}
    showHandles={false}
  />,
);
assert.ok(
  !noHandlesMarkup.includes("data-studio-resize-handle"),
  "잡을 수 없는 손잡이를 그리면 눌러도 아무 일이 없는 표적이 된다.",
);
assert.ok(
  noHandlesMarkup.includes('data-studio-selection-overlay="true"'),
  "손잡이가 없어도 고른 범위는 보여야 한다.",
);

// 회전한 선택은 같은 각도로 겹쳐 그린다.
assert.ok(
  renderToStaticMarkup(
    <StudioSelectionOverlay
      bounds={{ left: 0, top: 0, width: 100, height: 50 }}
      rotateDeg={30}
      scale={1}
    />,
  ).includes("rotate(30deg)"),
  "회전한 객체 위에 곧은 사각형을 그리면 무엇을 고른 것인지 알 수 없다.",
);

console.log("Thumbnail Studio editor baseline checks passed.");
