/**
 * 텍스트 효과 렌더러의 기준선 가드.
 *
 * 두 가지가 이 검사의 존재 이유다.
 *
 * 1. 효과를 쓰지 않는 문서의 결과가 그대로여야 한다. 시간표 문서에는 구조화된 효과가 없다.
 *    감싸는 요소를 하나 더하는 것만으로도 배치가 달라질 수 있으므로, 효과가 없으면 글자만
 *    그린다는 것을 마크업으로 못박는다.
 * 2. 논리 노드는 하나이고 레이어는 시각 표현일 뿐이라는 것. 레이어가 클릭을 먹으면 그 아래
 *    객체를 고를 수 없고, 레이어마다 글자를 노출하면 화면 낭독기가 같은 문장을 여러 번 읽는다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 겹쳐 그린 글자가 실제로 어긋나지 않는지. 그것은 스파이크 페이지에서 눈으로 판정한다.
 * - 자동 크기 텍스트(`flexibleText`). 공용 측정은 §15 7~8번이고 아직 연결하지 않았다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import { StudioTextRenderer } from "../src/components/studio/text/studio-text-renderer";
import type {
  StudioGraphNode,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTextAppearance,
  StudioTextStroke,
} from "../src/types/template-studio";
import { resolveStudioTextAppearance } from "../src/utils/template-studio/text-appearance";
import { createThumbnailStudioDocument } from "../src/utils/thumbnail-studio/document-factory";

const TEXT = "Rendered";

const stroke = (
  id: string,
  outset: number,
  overrides: Partial<StudioTextStroke> = {},
): StudioTextStroke => ({
  id,
  enabled: true,
  color: "#111827",
  outset,
  opacity: 1,
  ...overrides,
});

const createNode = (
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id: "node_text",
  type: "text",
  label: "title",
  parentId: null,
  childIds: [],
  styleId: "style_text",
  ...overrides,
});

const render = (
  node: StudioGraphNode,
  style: StudioStyleRecord | undefined,
  text = TEXT,
): string =>
  renderToStaticMarkup(
    <StudioTextRenderer
      appearance={resolveStudioTextAppearance(node, style)}
      text={text}
    />,
  );

// --- 효과가 없으면 글자만 그린다 ---

assert.equal(
  render(createNode(), { color: "#111827", fontSize: 42 }),
  TEXT,
  "구조화된 효과가 없으면 감싸는 요소를 만들지 않는다. 요소를 더하면 지금까지 그려 온 문서의 배치가 달라질 수 있다.",
);
assert.equal(
  render(createNode(), undefined, ""),
  "\u00a0",
  "빈 글자는 공백 하나로 그린다. 아무것도 그리지 않으면 상자가 접혀서 다시 고를 수 없다.",
);

/**
 * 예전 scalar 외곽선은 레이어로 다시 그리지 않는다.
 *
 * 그 값은 style 선언으로 이미 그려지고 있다. 레이어를 더하면 같은 외곽선이 두 번 그려져
 * 두께가 두 배로 보인다.
 */
assert.equal(
  render(createNode(), { color: "#111827", WebkitTextStroke: "12px #000000" }),
  TEXT,
  "예전 scalar 외곽선에 레이어를 더하면 외곽선이 두 번 그려진다.",
);

// --- 구조화된 효과 ---

const appearance = (
  overrides: Partial<StudioTextAppearance> = {},
): StudioTextAppearance => ({
  fill: { type: "solid", color: "#fde047", opacity: 1 },
  strokes: [],
  ...overrides,
});

const singleStrokeMarkup = render(
  createNode({
    textAppearance: appearance({ strokes: [stroke("outer", 6)] }),
  }),
  {},
);

assert.ok(
  singleStrokeMarkup.includes('data-studio-text-node="true"'),
  "효과가 있으면 레이어를 담는 요소가 있어야 한다.",
);
assert.equal(
  (singleStrokeMarkup.match(/data-effect-layer="/g) ?? []).length,
  2,
  "외곽선 하나면 레이어는 외곽선과 foreground 둘이다.",
);
assert.ok(
  singleStrokeMarkup.includes('data-effect-layer="stroke:outer"'),
  "외곽선 레이어에 어느 stroke인지 남아야 한다.",
);
assert.ok(
  singleStrokeMarkup.includes("-webkit-text-stroke:12px #111827"),
  "실효 두께 6px은 CSS 12px로 그린다. 이 변환이 빠지면 화면 두께가 절반이 된다.",
);
assert.ok(
  singleStrokeMarkup.includes("paint-order:stroke fill"),
  "외곽선을 먼저 그려야 글자가 그 위에 온다.",
);

// --- 레이어는 클릭도 낭독도 받지 않는다 ---

assert.equal(
  (singleStrokeMarkup.match(/aria-hidden="true"/g) ?? []).length,
  1,
  "읽히는 글자는 foreground 하나다. 레이어마다 노출하면 같은 문장을 여러 번 읽는다.",
);
assert.equal(
  (singleStrokeMarkup.match(/pointer-events:none/g) ?? []).length,
  1,
  "효과 레이어는 클릭을 먹지 않아야 한다. 먹으면 그 아래 객체를 고를 수 없다.",
);

const foregroundSegment = singleStrokeMarkup.slice(
  singleStrokeMarkup.indexOf('data-effect-layer="foreground"'),
);
assert.ok(
  !foregroundSegment.startsWith('data-effect-layer="foreground" aria-hidden'),
  "foreground는 실제 글자로 노출된다.",
);
assert.ok(
  !foregroundSegment.includes("pointer-events:none"),
  "foreground는 노드의 클릭 대상 안에 남는다.",
);

// --- 여러 외곽선의 앞뒤 순서 ---

const multiStrokeMarkup = render(
  createNode({
    textAppearance: appearance({
      strokes: [
        stroke("inner", 4, { color: "#ef4444" }),
        stroke("outer", 12),
        stroke("mid", 8, { color: "#ffffff" }),
      ],
    }),
  }),
  {},
);
const layerOrder = [
  ...multiStrokeMarkup.matchAll(/data-effect-layer="([^"]+)"/g),
].map((match) => match[1]);
assert.deepEqual(
  layerOrder,
  ["stroke:outer", "stroke:mid", "stroke:inner", "foreground"],
  "두꺼운 외곽선을 먼저 그리고 글자를 마지막에 그린다. 순서가 뒤집히면 안쪽 외곽선이 사라진다.",
);

// 꺼 둔 외곽선은 레이어를 만들지 않는다.
assert.deepEqual(
  [
    ...render(
      createNode({
        textAppearance: appearance({
          strokes: [stroke("on", 6), stroke("off", 12, { enabled: false })],
        }),
      }),
      {},
    ).matchAll(/data-effect-layer="([^"]+)"/g),
  ].map((match) => match[1]),
  ["stroke:on", "foreground"],
  "꺼 둔 외곽선이 레이어로 남으면 껐는데도 화면이 그대로다.",
);

// --- 그림자는 가장 뒤에서 한 번만 ---

const shadowMarkup = render(
  createNode({
    textAppearance: appearance({
      strokes: [stroke("outer", 12), stroke("inner", 6)],
      shadow: {
        enabled: true,
        color: "#0f172a",
        offsetX: 10,
        offsetY: 14,
        blur: 18,
        opacity: 0.65,
      },
    }),
  }),
  {},
);
assert.equal(
  (shadowMarkup.match(/text-shadow:/g) ?? []).length,
  1,
  "그림자를 레이어마다 그리면 겹쳐서 짙어진다.",
);
assert.ok(
  shadowMarkup.indexOf("text-shadow:") <
    shadowMarkup.indexOf('data-effect-layer="stroke:inner"'),
  "그림자는 가장 뒤 레이어에서 그려야 글자와 외곽선 아래에 깔린다.",
);
assert.ok(
  shadowMarkup.includes("rgba(15, 23, 42, 0.65)"),
  "그림자 투명도는 색의 alpha로 들어간다. 레이어 투명도로 다루면 같은 레이어의 글자와 외곽선까지 흐려진다.",
);

// 외곽선이 없으면 foreground가 가장 뒤이므로 거기서 그린다.
const shadowOnlyMarkup = render(
  createNode({
    textAppearance: appearance({
      shadow: {
        enabled: true,
        color: "#000000",
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        opacity: 1,
      },
    }),
  }),
  {},
);
assert.equal(
  (shadowOnlyMarkup.match(/text-shadow:/g) ?? []).length,
  1,
  "외곽선이 없어도 그림자는 한 번 그려야 한다.",
);
assert.ok(shadowOnlyMarkup.includes('data-effect-layer="foreground"'));

// 꺼 둔 그림자는 그리지 않는다.
assert.ok(
  !render(
    createNode({
      textAppearance: appearance({
        strokes: [stroke("outer", 6)],
        shadow: {
          enabled: false,
          color: "#000000",
          offsetX: 2,
          offsetY: 2,
          blur: 4,
          opacity: 1,
        },
      }),
    }),
    {},
  ).includes("text-shadow:"),
  "꺼 둔 그림자가 그려지면 껐는데도 화면이 그대로다.",
);

// --- 채우기 ---

assert.ok(
  singleStrokeMarkup.includes("color:#fde047"),
  "채우기 색을 foreground에 적용한다.",
);
assert.ok(
  !render(
    createNode({
      textAppearance: {
        fill: { type: "solid", color: "", opacity: 1 },
        strokes: [stroke("outer", 6)],
      },
    }),
    { color: "#123456" },
  ).includes("color:#123456"),
  "구조화된 효과가 있으면 style의 색을 쓰지 않는다.",
);

// --- 공용 렌더러에 붙였을 때 ---

const emptyRuntimeValues: StudioRuntimeValues = {
  global: {},
  days: {},
  entries: {},
  timetable: { entriesByDay: {} },
};

const renderDocument = (node: StudioGraphNode, style: StudioStyleRecord) => {
  const document = createThumbnailStudioDocument();
  document.graph.rootNodeIds = [node.id];
  document.graph.nodes[node.id] = {
    ...node,
    binding: { kind: "staticText", value: TEXT },
  };
  document.styles.style_text = style;

  return renderToStaticMarkup(
    <StudioRenderer document={document} runtimeValues={emptyRuntimeValues} />,
  );
};

const plainDocumentMarkup = renderDocument(createNode(), {
  color: "#111827",
  fontSize: 42,
});
assert.ok(plainDocumentMarkup.includes(TEXT), "글자는 그대로 그려져야 한다.");
assert.ok(
  !plainDocumentMarkup.includes("data-studio-text-node"),
  "효과가 없는 문서에 레이어 구조가 생기면 기존 문서의 배치가 달라진다.",
);
assert.ok(
  !plainDocumentMarkup.includes("data-effect-layer"),
  "효과가 없는 문서에는 효과 레이어가 없다.",
);

const effectDocumentMarkup = renderDocument(
  createNode({
    textAppearance: appearance({ strokes: [stroke("outer", 6)] }),
  }),
  { color: "#111827", fontSize: 42 },
);
assert.ok(
  effectDocumentMarkup.includes('data-effect-layer="stroke:outer"'),
  "공용 렌더러가 저장된 효과를 그려야 한다.",
);
assert.ok(
  effectDocumentMarkup.includes("-webkit-text-stroke:12px"),
  "공용 렌더러도 같은 두께 변환을 거쳐야 한다.",
);

console.log("Studio text renderer baseline checks passed.");
