/**
 * 텍스트 표현 resolver의 기준선 가드.
 *
 * 두 가지가 이 검사의 존재 이유다.
 *
 * 1. 저장하는 두께와 CSS 두께의 관계. 사용자가 보고 저장하는 값은 glyph 바깥으로 보이는
 *    실효 두께이고 CSS는 그 두 배를 받는다. 이 변환이 렌더러·인스펙터·효과 바깥 영역에서
 *    갈리면 인스펙터에 적은 숫자와 화면에 보이는 두께가 달라진다.
 * 2. 구조화된 효과가 없는 기존 문서의 시각 결과가 바뀌지 않는 것. 시간표 문서에는
 *    `textAppearance`가 없으므로 전부 legacy scalar text appearance 경로를 탄다. 여기서 기본색을 채워 넣으면
 *    색을 지정하지 않고 물려받던 글자의 색이 조용히 바뀐다.
 *
 * 이 검사가 덮지 못하는 범위:
 * - 실제 렌더 결과. 효과 레이어를 만드는 것은 §15 3~6번이고 그때 가드를 따로 붙인다.
 * - 예전 문서의 `textShadow` 같은 scalar 값. resolver가 소유하지 않고 style 선언으로
 *   그대로 흐른다. 렌더러가 알 수 없는 style 키를 버리지 않아야 한다는 제약이 남는다.
 */
import assert from "node:assert/strict";

import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTextAppearance,
  StudioTextStroke,
} from "../src/types/template-studio";
import {
  createStudioTextFillGradient,
  createStudioTextFillSolid,
  getStudioDrawableTextStrokes,
  getStudioOrderedTextStrokes,
  getStudioTextFillCss,
  getStudioTextStrokeStack,
  getStudioTextStrokeBands,
  getStudioTextFillRenderStyle,
  rebuildStudioTextStrokeOutsetsFromPanelOrder,
  hasStudioTextAppearance,
  getStudioTextFillPrimaryColor,
  normalizeStudioTextFillAngle,
  resolveStudioTextAppearance,
  shouldRenderStudioTextEffectLayers,
  STUDIO_TEXT_STROKE_CSS_SCALE,
  toStudioCssColor,
  toStudioCssStrokeWidth,
} from "../src/utils/template-studio/text-appearance";

const createTextNode = (
  overrides: Partial<StudioGraphNode> = {},
): StudioGraphNode => ({
  id: "node_text",
  type: "flexibleText",
  label: "title",
  parentId: null,
  childIds: [],
  styleId: "style_text",
  ...overrides,
});

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

// --- 두께 변환 ---

assert.equal(
  STUDIO_TEXT_STROKE_CSS_SCALE,
  2,
  "중앙 정렬 CSS stroke는 절반이 glyph 안쪽으로 들어간다. 배수가 2가 아니면 인스펙터에 적은 두께와 화면에 보이는 바깥 두께가 달라진다.",
);
assert.equal(toStudioCssStrokeWidth(6), 12);
assert.equal(toStudioCssStrokeWidth(0.5), 1);
assert.equal(toStudioCssStrokeWidth(0), 0, "두께 0은 그리지 않는다.");
assert.equal(toStudioCssStrokeWidth(-4), 0, "음수 두께는 그리지 않는다.");
assert.equal(toStudioCssStrokeWidth(Number.NaN), 0);

// --- 그릴 순서 ---

const orderedStrokes = getStudioOrderedTextStrokes([
  stroke("inner", 4),
  stroke("outer", 12),
  stroke("mid", 8),
]);
assert.deepEqual(
  orderedStrokes.map((item) => item.id),
  ["inner", "outer", "mid"],
  "저장 배열은 뒤→앞 렌더 순서다. outset은 z-order를 바꾸지 않는다.",
);

assert.deepEqual(
  getStudioOrderedTextStrokes([
    stroke("on", 8),
    stroke("off", 12, { enabled: false }),
  ]).map((item) => item.id),
  ["on", "off"],
  "stored order includes disabled strokes for the inspector.",
);
assert.deepEqual(
  getStudioDrawableTextStrokes([stroke("zero", 0), stroke("real", 6)]).map(
    (item) => item.id,
  ),
  ["real"],
  "drawable strokes exclude zero outset while stored order remains available to the inspector.",
);

// 원본 배열을 건드리지 않는다. 인스펙터 목록은 저장 순서를 유지해야 한다.
const sourceStrokes = [stroke("a", 4), stroke("b", 12)];
getStudioOrderedTextStrokes(sourceStrokes);
assert.deepEqual(
  sourceStrokes.map((item) => item.id),
  ["a", "b"],
  "정렬이 원본 배열을 바꾸면 인스펙터 목록 순서가 함께 흔들린다.",
);

// --- 보이는 띠 두께 ---

assert.deepEqual(
  getStudioTextStrokeBands([
    stroke("outer", 12),
    stroke("mid", 8),
    stroke("inner", 4),
  ]).map(({ stroke: item, band, hidden }) => ({ id: item.id, band, hidden })),
  [
    { id: "outer", band: 4, hidden: false },
    { id: "mid", band: 4, hidden: false },
    { id: "inner", band: 4, hidden: false },
  ],
  "보이는 띠는 인접한 두 실효 두께의 차이다. 가장 안쪽만 자기 두께 전체가 보인다.",
);

assert.deepEqual(
  getStudioTextStrokeBands([stroke("only", 10)]).map(({ band }) => band),
  [10],
  "하나뿐이면 자기 두께가 그대로 보인다.",
);

assert.deepEqual(
  getStudioTextStrokeBands([
    stroke("enabled", 8),
    stroke("disabled-front", 16, { enabled: false }),
  ]).map(({ stroke: item, band, hidden }) => ({
    id: item.id,
    band,
    hidden,
  })),
  [
    { id: "enabled", band: 8, hidden: false },
    { id: "disabled-front", band: 0, hidden: true },
  ],
  "disabled stroke는 Inspector 행으로 남지만 다른 stroke를 가리는 계산에는 참여하지 않는다.",
);

assert.deepEqual(
  getStudioTextStrokeBands([stroke("front", 8), stroke("back", 8)]).map(
    ({ band, hidden }) => ({ band, hidden }),
  ),
  [
    { band: 0, hidden: true },
    { band: 8, hidden: false },
  ],
  "두께가 같으면 하나가 완전히 가려진다. 인스펙터가 알려야 색을 바꿔도 화면이 그대로인 이유를 알 수 있다.",
);

// --- 구조화된 효과 ---

const appearance: StudioTextAppearance = {
  fill: { type: "solid", color: "#fde047", opacity: 0.8 },
  strokes: [stroke("inner", 4, { color: "#ef4444" }), stroke("outer", 12)],
  shadow: {
    enabled: true,
    color: "#0f172a",
    offsetX: 10,
    offsetY: 14,
    blur: 18,
    opacity: 0.65,
  },
  presetRef: { source: "builtin", presetId: "poster", presetVersion: 3 },
};

const resolved = resolveStudioTextAppearance(
  createTextNode({ textAppearance: appearance }),
  { color: "#000000" },
);
assert.equal(resolved.source, "appearance");
assert.deepEqual(resolved.fill, {
  type: "solid",
  color: "#fde047",
  opacity: 0.8,
});
assert.deepEqual(
  resolved.strokes.map((item) => item.id),
  ["inner", "outer"],
  "resolver는 저장된 뒤→앞 순서를 그대로 보존한다.",
);
assert.equal(resolved.shadow?.blur, 18);
assert.deepEqual(resolved.presetRef, {
  source: "builtin",
  presetId: "poster",
  presetVersion: 3,
});
assert.equal(
  getStudioTextFillPrimaryColor(resolved.fill),
  "#fde047",
  "구조화된 효과가 있으면 style의 색보다 그것을 쓴다.",
);

const gradientFill = {
  type: "linearGradient" as const,
  startColor: "#ef4444",
  endColor: "#3b82f6",
  angleDeg: 450,
  opacity: 0.75,
};
const resolvedGradient = resolveStudioTextAppearance(
  createTextNode({
    textAppearance: { fill: gradientFill, strokes: [] },
  }),
  {},
);
assert.deepEqual(resolvedGradient.fill, {
  type: "linearGradient",
  startColor: "#ef4444",
  endColor: "#3b82f6",
  angleDeg: 90,
  opacity: 0.75,
});
assert.equal(
  getStudioTextFillCss(resolvedGradient.fill),
  "linear-gradient(90deg, #ef4444, #3b82f6)",
);
assert.deepEqual(getStudioTextFillRenderStyle(resolvedGradient.fill), {
  backgroundImage: "linear-gradient(90deg, #ef4444, #3b82f6)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  opacity: 0.75,
});
assert.equal(normalizeStudioTextFillAngle(-90), 270);
assert.deepEqual(
  createStudioTextFillSolid(
    createStudioTextFillGradient({
      type: "solid",
      color: "#111827",
      opacity: 0.4,
    }),
  ),
  { type: "solid", color: "#111827", opacity: 0.4 },
  "solid -> gradient -> solid keeps the starting color and opacity",
);

// 꺼 둔 그림자는 없는 것과 같다.
assert.equal(
  resolveStudioTextAppearance(
    createTextNode({
      textAppearance: {
        ...appearance,
        shadow: { ...appearance.shadow!, enabled: false },
      },
    }),
    {},
  ).shadow,
  undefined,
  "꺼 둔 그림자를 넘기면 렌더러가 다시 판단해야 한다.",
);

// 채우기 투명도가 숫자가 아니면 불투명으로 본다.
assert.equal(
  resolveStudioTextAppearance(
    createTextNode({
      textAppearance: {
        ...appearance,
        fill: { type: "solid", color: "#ffffff", opacity: Number.NaN },
      },
    }),
    {},
  ).fill.opacity,
  1,
  "투명도가 NaN이면 글자가 사라진다.",
);

assert.equal(
  hasStudioTextAppearance(createTextNode({ textAppearance: appearance })),
  true,
);
assert.equal(hasStudioTextAppearance(createTextNode()), false);

// --- 구조화된 효과가 없는 기존 문서 ---

const legacyStyle: StudioStyleRecord = {
  color: "#475569",
  fontSize: 42,
  opacity: 0.5,
};
const legacyResolved = resolveStudioTextAppearance(
  createTextNode(),
  legacyStyle,
);
assert.equal(legacyResolved.source, "legacyStyle");
assert.deepEqual(
  legacyResolved.fill,
  { type: "solid", color: "#475569", opacity: 1 },
  "노드 투명도를 채우기 투명도로 가져오면 두 번 곱해져 글자가 더 흐려진다.",
);
assert.deepEqual(legacyResolved.strokes, []);

/**
 * 색을 지정하지 않은 기존 문서는 색이 없는 상태로 남는다.
 *
 * 기본색을 채우면 물려받던 글자색이 조용히 바뀐다. 시간표 문서에는 구조화된 효과가 없으므로
 * 전부 이 경로를 탄다.
 */
assert.equal(
  getStudioTextFillPrimaryColor(
    resolveStudioTextAppearance(createTextNode(), { fontSize: 20 }).fill,
  ),
  null,
  "색이 없으면 null이어야 한다. 기본색을 채우면 기존 문서의 글자색이 바뀐다.",
);
assert.equal(
  getStudioTextFillPrimaryColor(
    resolveStudioTextAppearance(createTextNode(), undefined).fill,
  ),
  null,
  "style이 아예 없어도 색을 만들어내지 않는다.",
);
assert.equal(
  getStudioTextFillPrimaryColor(
    resolveStudioTextAppearance(createTextNode(), { color: "   " }).fill,
  ),
  null,
  "빈 문자열은 색이 아니다.",
);

// 예전 scalar stroke는 읽기만 한다. 저장된 값은 CSS 두께이므로 실효 두께로 되돌린다.
const legacyStrokeResolved = resolveStudioTextAppearance(createTextNode(), {
  color: "#ffffff",
  WebkitTextStroke: "12px #111827",
});
assert.equal(legacyStrokeResolved.strokes.length, 1);
assert.equal(
  legacyStrokeResolved.strokes[0].outset,
  6,
  "저장된 12px는 CSS 두께다. 실효 두께로는 6px이다. 그대로 읽으면 인스펙터 숫자가 두 배로 보인다.",
);
assert.equal(legacyStrokeResolved.strokes[0].color, "#111827");
assert.equal(
  toStudioCssStrokeWidth(legacyStrokeResolved.strokes[0].outset),
  12,
  "실효 두께를 다시 CSS로 바꾸면 원래 값으로 돌아와야 한다.",
);

assert.deepEqual(
  resolveStudioTextAppearance(createTextNode(), {
    WebkitTextStroke: "0px #111827",
  }).strokes,
  [],
  "두께 0인 예전 stroke는 그리지 않는다.",
);
assert.deepEqual(
  resolveStudioTextAppearance(createTextNode(), {
    WebkitTextStroke: "thin black",
  }).strokes,
  [],
  "읽을 수 없는 값은 무시한다. 억지로 해석하면 없던 외곽선이 생긴다.",
);

// --- 투명도를 섞은 CSS 색 ---

assert.equal(
  toStudioCssColor("#0f172a", 1),
  "#0f172a",
  "불투명하면 색을 그대로 쓴다. 굳이 rgba로 바꾸면 저장한 값과 화면 값이 달라 보인다.",
);
assert.equal(toStudioCssColor("#0f172a", 0.65), "rgba(15, 23, 42, 0.65)");
assert.equal(
  toStudioCssColor("#fff", 0.5),
  "rgba(255, 255, 255, 0.5)",
  "세 자리 hex도 다뤄야 한다.",
);
assert.equal(
  toStudioCssColor("#0f172a", 0),
  "rgba(15, 23, 42, 0)",
  "완전 투명도 표현할 수 있어야 한다.",
);
assert.equal(
  toStudioCssColor("#0f172a", -1),
  "rgba(15, 23, 42, 0)",
  "음수 투명도는 0으로 가둔다.",
);
assert.equal(
  toStudioCssColor("rebeccapurple", 0.5),
  "rebeccapurple",
  "쪼갤 수 없는 색은 그대로 준다. 억지로 문자열을 만들면 CSS가 선언 전체를 버려서 그림자가 사라진다.",
);
assert.equal(toStudioCssColor("rgb(1, 2, 3)", 0.5), "rgb(1, 2, 3)");
assert.equal(
  toStudioCssColor("#0f172a", Number.NaN),
  "#0f172a",
  "투명도가 숫자가 아니면 불투명으로 본다.",
);

// --- 효과 레이어를 그릴지 ---

const layeredAppearance = createTextNode({ textAppearance: appearance });
assert.equal(
  shouldRenderStudioTextEffectLayers(
    resolveStudioTextAppearance(layeredAppearance, {}),
  ),
  true,
);
assert.equal(
  shouldRenderStudioTextEffectLayers(resolvedGradient),
  true,
  "gradient fill needs the text effect layer path",
);
assert.equal(
  shouldRenderStudioTextEffectLayers(
    resolveStudioTextAppearance(
      createTextNode({
        textAppearance: {
          fill: { type: "solid", color: "#111827", opacity: 1 },
          strokes: [],
        },
      }),
      {},
    ),
  ),
  false,
  "저장된 효과가 비어 있으면 레이어를 만들지 않는다.",
);

/**
 * 예전 scalar 외곽선은 레이어로 다시 그리지 않는다.
 *
 * 그 값은 style 선언으로 이미 그려지고 있다. 레이어를 더하면 같은 외곽선이 두 번 그려져
 * 두께가 두 배로 보인다.
 */
assert.equal(
  shouldRenderStudioTextEffectLayers(
    resolveStudioTextAppearance(createTextNode(), {
      WebkitTextStroke: "12px #111827",
    }),
  ),
  false,
  "예전 값에 레이어를 더하면 외곽선이 두 번 그려진다.",
);

assert.deepEqual(
  getStudioTextStrokeBands([
    stroke("outer", 12),
    stroke("middle", 4),
    stroke("front", 8),
  ]).map(({ stroke: item, band, hidden }) => ({
    id: item.id,
    band,
    hidden,
  })),
  [
    { id: "outer", band: 4, hidden: false },
    { id: "middle", band: 0, hidden: true },
    { id: "front", band: 8, hidden: false },
  ],
  "a later thicker stroke hides earlier layers even when it is not adjacent",
);

const stack = getStudioTextStrokeStack([
  stroke("outer", 32),
  stroke("middle", 8),
  stroke("inner", 4),
]);
assert.deepEqual(
  stack.map(({ stroke: item, thickness, effectiveOutset, visibleBand }) => ({
    id: item.id,
    thickness,
    effectiveOutset,
    visibleBand,
  })),
  [
    { id: "inner", thickness: 4, effectiveOutset: 4, visibleBand: 4 },
    { id: "middle", thickness: 4, effectiveOutset: 8, visibleBand: 4 },
    { id: "outer", thickness: 24, effectiveOutset: 32, visibleBand: 24 },
  ],
  "the inspector stack reverses stored order and separates configured thickness from visible band",
);
assert.deepEqual(
  getStudioTextStrokeStack([stroke("outer", 12), stroke("inner", 4)]).map(
    ({ stroke: item, thickness, effectiveOutset }) => ({
      id: item.id,
      thickness,
      effectiveOutset,
    }),
  ),
  [
    { id: "inner", thickness: 4, effectiveOutset: 4 },
    { id: "outer", thickness: 8, effectiveOutset: 12 },
  ],
  "existing absolute outsets are displayed as thickness differences without changing their stored values",
);
assert.deepEqual(
  getStudioTextStrokeStack([stroke("outer", 4), stroke("inner", 4)]).map(
    ({ stroke: item, thickness, hidden }) => ({
      id: item.id,
      thickness,
      hidden,
    }),
  ),
  [
    { id: "inner", thickness: 4, hidden: false },
    { id: "outer", thickness: 0, hidden: true },
  ],
  "equal legacy outsets show a zero-thickness covered outer band",
);
assert.deepEqual(
  getStudioTextStrokeStack([
    stroke("outer", 32),
    stroke("middle", 8, { enabled: false }),
    stroke("inner", 4),
  ]).map(({ stroke: item, thickness, visibleBand, hidden }) => ({
    id: item.id,
    thickness,
    visibleBand,
    hidden,
  })),
  [
    { id: "inner", thickness: 4, visibleBand: 4, hidden: false },
    { id: "middle", thickness: 4, visibleBand: 0, hidden: true },
    { id: "outer", thickness: 24, visibleBand: 28, hidden: false },
  ],
  "disabled strokes keep configured thickness while visible bands respond to coverage",
);
assert.deepEqual(
  rebuildStudioTextStrokeOutsetsFromPanelOrder(
    [stroke("inner", 0), stroke("middle", 0), stroke("outer", 0)],
    [4, 4, 24],
  ).map(({ id, outset }) => ({ id, outset })),
  [
    { id: "outer", outset: 32 },
    { id: "middle", outset: 8 },
    { id: "inner", outset: 4 },
  ],
  "panel thicknesses are saved back-to-front as cumulative outsets",
);

console.log("Studio text appearance baseline checks passed.");
