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
 * - 겹쳐 그린 글자가 실제로 어긋나지 않는지. 최종 브라우저 실측과 PNG glyph bounds로 판정한다.
 * - 맞춤 여유가 실제 탐색에 적용되는지. 크기 계산은 브라우저 effect에서 일어나므로 서버
 *   렌더 마크업에 나타나지 않는다. 여유를 정하는 순수 함수는 값으로 검증하고, 그 값이
 *   실제로 넘겨지는지는 최종 측정 표와 브라우저 경로로 본다.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioRenderer } from "../src/components/studio/canvas/studio-renderer";
import { StudioText } from "../src/components/studio/text/studio-text";
import type {
  StudioGraphNode,
  StudioRuntimeValues,
  StudioStyleRecord,
  StudioTextAppearance,
  StudioTextShadow,
  StudioTextStroke,
} from "../src/types/template-studio";
import { resolveStudioTextAppearance } from "../src/utils/template-studio/text-appearance";
import {
  getStudioTextFitBounds,
  STUDIO_TEXT_FIT_MARGIN_PX,
} from "../src/utils/template-studio/text-layout";
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

const shadow = (
  overrides: Partial<StudioTextShadow> = {},
): StudioTextShadow => ({
  enabled: true,
  color: "#000000",
  offsetX: 2,
  offsetY: 3,
  blur: 4,
  opacity: 0.8,
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
    <StudioText
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
assert.equal(
  render(createNode(), {
    color: "#111827",
    textShadow: "2px 3px 4px #000000",
  }),
  TEXT,
  "예전 scalar textShadow는 구조화 filter로 materialize하지 않고 기존 style 결과를 유지한다.",
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
  ["stroke:inner", "stroke:outer", "stroke:mid", "foreground"],
  "appearance.strokes의 저장된 뒤→앞 순서를 그대로 그린다. outset으로 정렬하면 안 된다.",
);

const oversizedStrokeMarkup = render(
  createNode({
    textAppearance: appearance({
      strokes: Array.from({ length: 10 }, (_, index) =>
        stroke(`stroke-${index}`, index + 1),
      ),
    }),
  }),
  {},
);
assert.equal(
  (oversizedStrokeMarkup.match(/data-effect-layer="stroke:/g) ?? []).length,
  8,
  "external JSON cannot make the renderer create more than eight stroke layers",
);

const invalidNumericStrokeMarkup = render(
  createNode({
    textAppearance: appearance({
      strokes: [
        stroke("too-wide", 65),
        stroke("over-opacity", 2, { opacity: 1.1 }),
        stroke("not-finite", Number.NaN),
        stroke("valid", 4),
      ],
    }),
  }),
  {},
);
assert.deepEqual(
  [...invalidNumericStrokeMarkup.matchAll(/data-effect-layer="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["stroke:valid", "foreground"],
  "renderer skips numeric stroke values outside the validator contract",
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

// --- 그림자는 합성된 실루엣에 한 번만 ---

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
  (shadowMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  1,
  "구조화 그림자는 root의 합성 실루엣에 정확히 한 번 적용한다.",
);
assert.ok(
  shadowMarkup.includes(
    "filter:drop-shadow(10px 14px 18px rgba(15, 23, 42, 0.65))",
  ),
  "shadow offset, blur와 alpha 색상은 drop-shadow 함수에 보존해야 한다.",
);
assert.ok(
  shadowMarkup.includes('data-studio-text-shadow-source="composite"'),
  "구조화 그림자는 최종 합성 실루엣을 기준으로 한다는 식별자가 있어야 한다.",
);
assert.equal(
  (shadowMarkup.match(/text-shadow:/g) ?? []).length,
  0,
  "stroke/fill 레이어에 text-shadow를 남기면 외곽 stroke가 그림자 원본이 되지 않는다.",
);
assert.equal(
  (shadowMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  1,
  "stroke가 여러 개여도 shadow filter는 하나여야 한다.",
);
assert.equal(
  (singleStrokeMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  0,
  "shadow가 없으면 불필요한 filter를 만들지 않는다.",
);

const edgeShadowMarkup = render(
  createNode({
    textAppearance: appearance({
      strokes: [stroke("translucent", 20, { opacity: 0.4 })],
      shadow: shadow({ offsetX: -6, offsetY: -7, blur: 0 }),
    }),
  }),
  {},
);
assert.ok(
  edgeShadowMarkup.includes(
    "filter:drop-shadow(-6px -7px 0px rgba(0, 0, 0, 0.8))",
  ),
  "blur 0과 음수 X/Y offset도 합성 shadow filter에 그대로 전달해야 한다.",
);
assert.ok(
  edgeShadowMarkup.includes("opacity:0.4"),
  "반투명 stroke는 자체 alpha만 적용하고 shadow root filter는 한 번만 만들어야 한다.",
);

// 외곽선이 없으면 fill 실루엣을 root filter의 원본으로 삼는다.
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
  (shadowOnlyMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  1,
  "외곽선이 없어도 fill 실루엣에 그림자를 한 번 만들어야 한다.",
);
assert.ok(shadowOnlyMarkup.includes('data-effect-layer="foreground"'));
assert.equal(
  (shadowOnlyMarkup.match(/text-shadow:/g) ?? []).length,
  0,
  "fill/foreground에도 text-shadow를 만들지 않는다.",
);

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
  ).includes("filter:drop-shadow("),
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

/**
 * 자동 크기 노드도 공용 렌더러를 거쳐 효과를 그려야 한다.
 *
 * 처음 이 가드를 쓸 때 고정 크기 노드만 확인해서, 자동 크기 갈래가 노드의 효과를 읽지 않게
 * 되는 회귀를 잡지 못했다. 두 갈래는 서로 다른 자리이므로 각각 봐야 한다.
 */
const autoFitDocumentMarkup = renderDocument(
  createNode({
    type: "flexibleText",
    textAppearance: appearance({ strokes: [stroke("outer", 6)] }),
  }),
  { color: "#111827", fontSize: 42 },
);
assert.ok(
  autoFitDocumentMarkup.includes('data-effect-layer="stroke:outer"'),
  "자동 크기 노드의 저장된 효과가 그려져야 한다.",
);
assert.ok(
  autoFitDocumentMarkup.includes("-webkit-text-stroke:12px"),
  "자동 크기 갈래도 같은 두께 변환을 거쳐야 한다.",
);

const autoFitPlainDocumentMarkup = renderDocument(
  createNode({ type: "flexibleText" }),
  { color: "#111827", fontSize: 42 },
);
assert.ok(
  !autoFitPlainDocumentMarkup.includes("data-effect-layer"),
  "효과가 없는 자동 크기 노드에 레이어가 생기면 기존 문서의 배치가 달라진다.",
);
assert.ok(
  autoFitPlainDocumentMarkup.includes("white-space:pre"),
  "자동 크기의 줄바꿈 정책이 바뀌면 기존 문서의 줄바꿈과 크기가 함께 바뀐다.",
);

const autoFitSingleLineMarkup = renderDocument(
  createNode({ type: "flexibleText" }),
  { color: "#111827", fontSize: 42, textWrapMode: "single" },
);
assert.ok(
  autoFitSingleLineMarkup.includes("white-space:nowrap"),
  "single 줄바꿈 모드는 개행을 무시하고 한 줄 측정을 사용해야 한다.",
);

// --- 상자에 맞춘 크기 ---

const renderAutoFit = (
  node: Pick<StudioGraphNode, "textAppearance">,
  style: StudioStyleRecord | undefined,
): string =>
  renderToStaticMarkup(
    <StudioText
      appearance={resolveStudioTextAppearance(node, style)}
      autoFit={{ maxFontSize: 42, minFontSize: 10, styleRecord: style }}
      text={TEXT}
    />,
  );

const autoFitPlainMarkup = renderAutoFit({}, { color: "#111827" });
assert.ok(
  !autoFitPlainMarkup.includes("data-effect-layer"),
  "효과가 없으면 자동 크기 경로에도 레이어가 없어야 한다.",
);
assert.ok(
  autoFitPlainMarkup.includes("color:#111827"),
  "효과가 없으면 style의 색을 글자 요소에 그대로 준다.",
);
assert.ok(
  !autoFitPlainMarkup.includes("data-studio-text-measurement"),
  "효과가 없는 자동 크기는 기존처럼 root p 자체를 측정해야 한다.",
);

const autoFitEffectMarkup = renderAutoFit(
  {
    textAppearance: appearance({
      strokes: [stroke("outer", 6), stroke("inner", 3, { color: "#ffffff" })],
    }),
  },
  {},
);

/**
 * 크기를 재는 요소는 하나다.
 *
 * 레이어마다 자동 크기 컴포넌트를 쓰면 각자 크기를 재고 폰트 로드 시점에 따라 결과가 갈린다.
 * 그러면 겹쳐 그린 글자가 어긋난다. 글자 요소가 하나라는 것으로 그것을 막는다.
 */
assert.equal(
  (autoFitEffectMarkup.match(/<p[\s>]/g) ?? []).length,
  1,
  "자동 크기 경로에서 크기를 재는 요소는 하나여야 한다.",
);
assert.ok(
  autoFitEffectMarkup.includes('data-studio-text-measurement="true"'),
  "효과가 있는 자동 크기는 논리 텍스트 전용 측정 요소를 가져야 한다.",
);
const measurementStart = autoFitEffectMarkup.indexOf(
  'data-studio-text-measurement="true"',
);
const measurementEnd = autoFitEffectMarkup.indexOf("</span>", measurementStart);
const firstEffectLayer = autoFitEffectMarkup.indexOf("data-effect-layer=");
assert.ok(measurementEnd > measurementStart, "측정 span은 닫혀야 한다.");
assert.ok(
  !autoFitEffectMarkup
    .slice(measurementStart, measurementEnd)
    .includes("data-effect-layer="),
  "효과 레이어는 논리 측정 요소 내부에 들어가면 안 된다.",
);
assert.ok(
  firstEffectLayer > measurementEnd,
  "효과 레이어는 논리 측정 요소와 형제여야 한다.",
);
assert.equal(
  (autoFitEffectMarkup.match(/font-size:/g) ?? []).length,
  1,
  "자동 크기 효과 조합은 root 하나의 font-size만 소유해야 한다.",
);

// 레이어가 그 요소 안에 있어야 크기를 물려받는다.
assert.ok(
  autoFitEffectMarkup.indexOf('data-effect-layer="stroke:outer"') <
    autoFitEffectMarkup.indexOf("</p>"),
  "레이어가 글자 요소 밖에 있으면 정한 크기를 물려받지 못한다.",
);
assert.deepEqual(
  [...autoFitEffectMarkup.matchAll(/data-effect-layer="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["stroke:outer", "stroke:inner", "fill"],
  "저장된 외곽선 순서를 유지하고 채우기를 마지막에 덮는다.",
);
assert.ok(
  autoFitEffectMarkup.includes("color:transparent"),
  "크기를 재는 요소는 지울 수 없으므로 색을 비우고 위에 겹친 레이어가 보이게 한다.",
);
assert.equal(
  (autoFitEffectMarkup.match(/aria-hidden="true"/g) ?? []).length,
  3,
  "겹쳐 그린 레이어는 모두 낭독에서 빠진다. 읽히는 글자는 크기를 재는 요소 하나다.",
);
assert.equal(
  (autoFitEffectMarkup.match(/pointer-events:none/g) ?? []).length,
  3,
  "겹쳐 그린 레이어는 클릭을 먹지 않아야 한다.",
);
assert.ok(
  autoFitEffectMarkup.includes("-webkit-text-stroke:12px"),
  "자동 크기 경로도 같은 두께 변환을 거쳐야 한다.",
);

const shadowOnlyAutoMarkup = renderAutoFit(
  { textAppearance: appearance({ shadow: shadow() }) },
  {},
);
const fixedSharedShadowMarkup = render(
  createNode({ textAppearance: appearance({ shadow: shadow() }) }),
  {},
);
assert.deepEqual(
  [...shadowOnlyAutoMarkup.matchAll(/data-effect-layer="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["fill"],
  "shadow-only 자동 크기는 fill 레이어 하나를 root 합성에 포함해야 한다.",
);
assert.ok(
  shadowOnlyAutoMarkup.includes("filter:drop-shadow(2px 3px 4px"),
  "shadow-only 자동 크기는 root에 drop-shadow를 적용해야 한다.",
);
assert.equal(
  (shadowOnlyAutoMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  1,
  "shadow-only 자동 크기도 shadow filter는 하나여야 한다.",
);

const strokeShadowAutoMarkup = renderAutoFit(
  {
    textAppearance: appearance({
      shadow: shadow(),
      strokes: [stroke("outer", 6)],
    }),
  },
  {},
);
assert.deepEqual(
  [...strokeShadowAutoMarkup.matchAll(/data-effect-layer="([^"]+)"/g)].map(
    (match) => match[1],
  ),
  ["stroke:outer", "fill"],
  "stroke + shadow 자동 크기는 stroke와 fill 레이어를 한 root 아래에 둬야 한다.",
);
assert.ok(
  strokeShadowAutoMarkup.includes("filter:drop-shadow(2px 3px 4px"),
  "stroke + shadow 자동 크기는 root 합성 실루엣에 drop-shadow를 적용해야 한다.",
);
assert.equal(
  (strokeShadowAutoMarkup.match(/filter:drop-shadow\(/g) ?? []).length,
  1,
  "stroke가 여러 개여도 자동 크기 shadow filter는 하나여야 한다.",
);
assert.equal(
  (strokeShadowAutoMarkup.match(/text-shadow:/g) ?? []).length,
  0,
  "자동 크기의 stroke/fill 레이어에도 text-shadow가 없어야 한다.",
);
assert.equal(
  fixedSharedShadowMarkup.match(/filter:drop-shadow\([^;]+\)/)?.[0],
  strokeShadowAutoMarkup.match(/filter:drop-shadow\([^;]+\)/)?.[0],
  "고정 텍스트와 Auto Text가 같은 shadow 표현을 사용해야 한다.",
);

// --- 맞춤 여유 ---

assert.ok(
  STUDIO_TEXT_FIT_MARGIN_PX > 0,
  "여유가 0이면 탐색 결과가 맞춤 경계에 붙는다. 그 상태에서는 화면과 내려받은 이미지가 어긋난다.",
);
assert.deepEqual(
  getStudioTextFitBounds({ width: 380, height: 74 }),
  {
    width: 380 - STUDIO_TEXT_FIT_MARGIN_PX,
    height: 74 - STUDIO_TEXT_FIT_MARGIN_PX,
  },
  "여유는 가로와 세로에 모두 적용한다. 어긋난 장면이 모두 세로가 빡빡한 쪽이었다.",
);
assert.deepEqual(
  getStudioTextFitBounds({ width: 380, height: 74, margin: 0 }),
  { width: 380, height: 74 },
  "여유를 0으로 넘기면 지금까지의 동작과 같아야 한다. 이 컴포넌트를 쓰는 화면이 200곳이 넘는다.",
);
assert.deepEqual(
  getStudioTextFitBounds({ width: 1, height: 1, margin: 10 }),
  { width: 1, height: 1 },
  "여유를 뺀 뒤에도 1px은 남긴다. 0이 되면 어떤 크기도 맞지 않아 글자가 갑자기 최소 크기까지 작아진다.",
);
assert.deepEqual(
  getStudioTextFitBounds({ width: 100, height: 50, margin: -5 }),
  { width: 100, height: 50 },
  "음수 여유는 상자를 넓히지 않는다.",
);
assert.deepEqual(
  getStudioTextFitBounds({ width: 100, height: 50, margin: Number.NaN }),
  { width: 100, height: 50 },
  "숫자가 아닌 여유는 없는 것으로 본다.",
);

/**
 * 여유를 넘기는 배선.
 *
 * 크기 계산은 브라우저 effect에서 일어나므로 서버 렌더 마크업으로는 볼 수 없다. 그래서
 * 원본에서 확인한다. 약한 검사지만 값을 빼먹는 것은 잡는다.
 */
assert.ok(
  readFileSync(
    "src/components/AutoResizeTextCard/AutoResizeText.tsx",
    "utf8",
  ).includes("fitMargin = 0"),
  "여유의 기본값이 0이 아니면 이 컴포넌트를 쓰는 200곳이 넘는 화면의 글자 크기가 함께 바뀐다.",
);
assert.ok(
  readFileSync("src/components/studio/text/studio-text.tsx", "utf8").includes(
    "fitMargin={STUDIO_TEXT_FIT_MARGIN_PX}",
  ),
  "Studio 경로는 여유를 넘겨야 한다. 넘기지 않으면 탐색 결과가 맞춤 경계에 붙는다.",
);
const studioTextSource = readFileSync(
  "src/components/studio/text/studio-text.tsx",
  "utf8",
);
const studioAutoFitSource = readFileSync(
  "src/components/studio/text/studio-auto-fit-text.tsx",
  "utf8",
);
assert.ok(
  studioTextSource.includes("StudioAutoFitText"),
  "Studio auto-fit은 전용 컴포넌트를 사용해야 한다.",
);
assert.ok(
  !studioTextSource.includes("AutoResizeText"),
  "Studio 경로가 범용 AutoResizeText에 의존하면 효과 overflow가 다시 측정된다.",
);
assert.ok(
  !studioTextSource.includes("textShadow"),
  "Studio structured effect layers는 legacy textShadow를 직접 그리지 않아야 한다.",
);
assert.ok(
  studioAutoFitSource.includes("measurement.scrollWidth") &&
    studioAutoFitSource.includes("measurement.scrollHeight") &&
    !studioAutoFitSource.includes("root.scrollWidth") &&
    !studioAutoFitSource.includes("root.scrollHeight"),
  "Studio 자동 맞춤은 logical measurement 요소의 overflow만 읽어야 한다.",
);
assert.ok(
  studioTextSource.includes("function StudioTextEffectLayers"),
  "고정/자동 텍스트는 하나의 효과 레이어 생성기를 공유해야 한다.",
);
const inspectorSource = readFileSync(
  "src/app/(root)/admin/thumbnail-studio/_components/thumbnail-inspector.tsx",
  "utf8",
);
assert.ok(
  inspectorSource.includes('selectedNode.type === "flexibleText"') &&
    inspectorSource.includes('"Max size"'),
  "단일 flexibleText의 font size 필드는 Max size로 표시해야 한다.",
);

console.log("Studio text baseline checks passed.");
