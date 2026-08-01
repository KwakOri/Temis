/**
 * Phase 0A 스파이크 표본 데이터.
 *
 * 이 파일은 렌더링 방식과 PNG 라이브러리를 결정하기 위한 일회용 자료다.
 * 결정이 끝나면 stroke 변환 상수와 표본 시나리오만 정식 모듈로 승격하고
 * 나머지는 제거한다.
 */

/**
 * 저장하는 stroke 두께는 glyph 바깥으로 보이는 실효 두께(outset)다.
 * 중앙 정렬 CSS stroke는 절반이 glyph 안쪽으로 들어가므로 2배로 변환한다.
 */
export const STUDIO_TEXT_STROKE_CSS_SCALE = 2;

export const toCssStrokeWidth = (outset: number): number =>
  outset * STUDIO_TEXT_STROKE_CSS_SCALE;

export interface SpikeStroke {
  id: string;
  color: string;
  /** glyph 바깥으로 보이는 실효 두께 */
  outset: number;
  opacity: number;
}

export interface SpikeShadow {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
}

export interface SpikeScene {
  id: string;
  title: string;
  /** 이 장면이 무엇을 검증하는지 */
  verifies: string;
  text: string;
  fontFamily: string;
  fontWeight: number;
  /** 고정 크기 텍스트 */
  fontSize?: number;
  /** 자동 크기 텍스트 */
  autoFit?: { min: number; max: number };
  lineHeight: number;
  align: "left" | "center" | "right";
  fill: { color: string; opacity: number };
  strokes: SpikeStroke[];
  shadow?: SpikeShadow;
  /** 논리 텍스트 박스 */
  box: { left: number; top: number; width: number; height: number };
  /** 캔버스 크기. 모든 장면이 같은 크기를 쓰면 비교가 쉽다. */
  canvas: { width: number; height: number };
  /** null이면 투명 배경 */
  canvasBackground: string | null;
  /**
   * 이 장면을 무엇으로 그릴지.
   *
   * `spike`는 Phase 3 렌더러의 프로토타입(`SpikeText`)이다. 자체 이분 탐색과
   * `pre-wrap`을 쓴다.
   *
   * `studioAutoText`는 지금 제품이 쓰는 경로다. `StudioRenderer`가 `flexibleText`를
   * `StudioAutoText` → `AutoResizeText`로 그리고, 그쪽은 `maxLines` 없이 불리므로
   * 0.5px씩 줄이는 선형 탐색과 `white-space: pre`를 쓴다. 두 경로는 크기를 정하는
   * 방법도, 줄이 나뉘는 조건도 다르므로 프로토타입 결과를 제품 결과로 읽으면 안 된다.
   */
  textEngine?: "spike" | "studioAutoText";
  /** `studioAutoText` 장면에서 줄바꿈 모드를 지정한다. */
  textWrapMode?: "preserve" | "single";
}

/** 메트릭 오버라이드가 주입되는 임포트 폰트 */
export const SPIKE_IMPORTED_FONT_FAMILY = "Escoredream";

/**
 * 눈누에서 복사하는 형태의 원본 CSS.
 * 의도적으로 ascent-override 등을 넣지 않아서, Studio 파서가
 * STUDIO_WEB_FONT_METRIC_DEFAULTS를 자동 주입하는지 함께 확인한다.
 */
export const SPIKE_IMPORTED_FONT_CSS = `
@font-face {
  font-family: 'Escoredream';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-4Regular.woff') format('woff');
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: 'Escoredream';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-6Bold.woff') format('woff');
  font-weight: 700;
  font-display: swap;
}

@font-face {
  font-family: 'Escoredream';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_six@1.2/S-CoreDream-8Heavy.woff') format('woff');
  font-weight: 800;
  font-display: swap;
}
`.trim();

const CANVAS = { width: 640, height: 360 };

const stroke = (
  id: string,
  color: string,
  outset: number,
  opacity = 1,
): SpikeStroke => ({ id, color, outset, opacity });

export const SPIKE_SCENES: SpikeScene[] = [
  {
    id: "fixed-basic",
    title: "01. 고정 크기 텍스트",
    verifies: "기준선. 효과 없는 단색 텍스트의 위치와 크기",
    text: "고정 크기 Fixed 123",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 700,
    fontSize: 64,
    lineHeight: 1,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 560, height: 80 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "auto-fit",
    title: "02. 자동 크기 텍스트",
    verifies: "측정된 최종 font size가 화면과 PNG에서 같은지",
    text: "자동 크기로 줄어드는 아주 긴 제목 텍스트입니다",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 700,
    autoFit: { min: 12, max: 96 },
    lineHeight: 1,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 130, width: 560, height: 100 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "multiline",
    title: "03. 여러 줄 텍스트",
    verifies: "줄바꿈 지점과 줄 수, 줄 간격",
    text: "첫째 줄입니다\n둘째 줄입니다\n셋째 줄",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 400,
    fontSize: 40,
    lineHeight: 1.2,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 100, width: 560, height: 160 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "imported-font",
    title: "04. 임포트 웹 폰트",
    verifies: "PNG에 웹 폰트가 embed되는지, fallback으로 바뀌지 않는지",
    text: "웹폰트 Escoredream 800",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 56,
    lineHeight: 1,
    align: "left",
    fill: { color: "#1d4ed8", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 560, height: 80 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "default-font",
    title: "05. 기본 폰트 (메트릭 오버라이드 없음)",
    verifies:
      "오버라이드 없는 폰트의 측정 결정성. 04와 줄 높이 계산 차이를 비교",
    text: "기본 폰트 Inter 123",
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 56,
    lineHeight: 1,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 560, height: 80 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "multi-stroke",
    title: "06. outset이 다른 stroke 3개",
    verifies: "핵심 항목. stroke 실효 두께, 띠 두께, 앞뒤 순서",
    text: "STROKE",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 96,
    lineHeight: 1,
    align: "center",
    fill: { color: "#fde047", opacity: 1 },
    strokes: [
      stroke("s-outer", "#111827", 12),
      stroke("s-mid", "#ffffff", 8),
      stroke("s-inner", "#ef4444", 4),
    ],
    box: { left: 40, top: 120, width: 560, height: 120 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "translucent-stroke",
    title: "07. 반투명 stroke",
    verifies: "stroke opacity가 PNG에서 유지되는지",
    text: "ALPHA",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 96,
    lineHeight: 1,
    align: "center",
    fill: { color: "#111827", opacity: 1 },
    strokes: [
      stroke("s-outer", "#2563eb", 12, 0.35),
      stroke("s-inner", "#f97316", 6, 0.7),
    ],
    box: { left: 40, top: 120, width: 560, height: 120 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
  },
  {
    id: "shadow",
    title: "08. offset과 blur가 있는 shadow",
    verifies: "shadow offset과 blur 반경이 PNG에서 유지되는지",
    text: "SHADOW",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 88,
    lineHeight: 1,
    align: "center",
    fill: { color: "#ffffff", opacity: 1 },
    strokes: [stroke("s-outer", "#111827", 6)],
    shadow: {
      color: "#0f172a",
      offsetX: 10,
      offsetY: 14,
      blur: 18,
      opacity: 0.65,
    },
    box: { left: 40, top: 120, width: 560, height: 120 },
    canvas: CANVAS,
    canvasBackground: "#e5e7eb",
  },
  {
    id: "transparent-canvas",
    title: "09. 투명 캔버스 배경",
    verifies: "alpha가 PNG에 보존되는지",
    text: "TRANSPARENT",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 72,
    lineHeight: 1,
    align: "center",
    fill: { color: "#111827", opacity: 1 },
    strokes: [stroke("s-outer", "#fbbf24", 8)],
    box: { left: 40, top: 130, width: 560, height: 100 },
    canvas: CANVAS,
    canvasBackground: null,
  },
  {
    id: "opaque-canvas",
    title: "10. 불투명 캔버스 배경",
    verifies: "09와 같은 장면의 불투명 배경 대조군",
    text: "OPAQUE",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 72,
    lineHeight: 1,
    align: "center",
    fill: { color: "#111827", opacity: 1 },
    strokes: [stroke("s-outer", "#fbbf24", 8)],
    box: { left: 40, top: 130, width: 560, height: 100 },
    canvas: CANVAS,
    canvasBackground: "#0f172a",
  },
  {
    id: "canvas-edge",
    title: "11. 캔버스 경계 근접",
    verifies: "효과가 캔버스 밖으로 나갈 때의 잘림. 화면과 PNG가 같아야 함",
    text: "EDGE",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 88,
    lineHeight: 1,
    align: "left",
    fill: { color: "#ffffff", opacity: 1 },
    strokes: [
      stroke("s-outer", "#111827", 14),
      stroke("s-inner", "#22d3ee", 7),
    ],
    box: { left: -20, top: -10, width: 400, height: 120 },
    canvas: CANVAS,
    canvasBackground: "#f97316",
  },

  /*
   * 아래 장면은 지금 제품이 쓰는 Auto Text 경로를 그대로 그린다.
   *
   * 박스와 글자 크기는 `createSampleStudioDocument()`의 시간표 카드 값을 옮겼다.
   * `style_main_title`은 380×74 / 42px / 800, `style_sub_title`은 360×42 / 18px / 600이다.
   * 값을 바꾸면 재 본 결과가 제품과 달라진다.
   *
   * 확인하려는 것은 사용자가 내려받는 PNG가 화면과 같은지다. 시간표 런타임은
   * `html-to-image`를 쓰고 스파이크가 표준으로 정한 것은 `modern-screenshot`이다.
   */
  {
    id: "product-main-title-long",
    title: "12. 제품 Auto Text — 긴 제목 (개행 없음)",
    verifies:
      "제품 경로. 폭 맞춤 경계에서 두 라스터라이저가 같은 최종 크기를 내는지",
    text: "정규 3집 발매 기념 쇼케이스 스페셜 무대",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 42,
    lineHeight: 1.08,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 380, height: 74 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
    textEngine: "studioAutoText",
  },
  {
    id: "product-main-title-newline",
    title: "13. 제품 Auto Text — 개행이 있는 제목",
    verifies:
      "제품 경로는 `white-space: pre`이므로 명시적 개행에서만 줄이 나뉜다. 줄 수가 화면과 PNG에서 같은지",
    text: "정규 3집 발매 기념\n쇼케이스 스페셜 무대",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 42,
    lineHeight: 1.08,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 380, height: 74 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
    textEngine: "studioAutoText",
  },
  {
    id: "product-sub-title",
    title: "14. 제품 Auto Text — 부제목 (작은 박스)",
    verifies: "제품 경로. 작은 박스에서 최소 크기 보정까지 내려가는지",
    text: "게스트와 함께하는 특별 코너 포함",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 600,
    fontSize: 18,
    lineHeight: 1.08,
    align: "left",
    fill: { color: "#475569", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 160, width: 360, height: 42 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
    textEngine: "studioAutoText",
  },
  {
    id: "product-main-title-short",
    title: "15. 제품 Auto Text — 줄일 필요 없는 제목 (대조군)",
    verifies: "12~14와 달리 탐색이 최대 크기에서 끝난다. 경계에 붙지 않는 경우",
    text: "쇼케이스",
    fontFamily: SPIKE_IMPORTED_FONT_FAMILY,
    fontWeight: 800,
    fontSize: 42,
    lineHeight: 1.08,
    align: "left",
    fill: { color: "#111827", opacity: 1 },
    strokes: [],
    box: { left: 40, top: 140, width: 380, height: 74 },
    canvas: CANVAS,
    canvasBackground: "#ffffff",
    textEngine: "studioAutoText",
  },
];

/**
 * 화면에 보이는 띠 두께를 계산한다.
 *
 * outset은 glyph 표면에서부터 측정한 값이므로, 사용자가 실제로 보는 띠는
 * 인접한 두 outset의 차이다. 가장 안쪽 stroke만 자신의 outset 전체가 보인다.
 * 음수면 해당 stroke가 더 두꺼운 stroke에 완전히 가려진다는 뜻이다.
 */
export const getSpikeStrokeBands = (
  strokes: SpikeStroke[],
): Array<{ stroke: SpikeStroke; band: number; hidden: boolean }> => {
  const ordered = [...strokes].sort((a, b) => b.outset - a.outset);
  return ordered.map((item, index) => {
    const next = ordered[index + 1];
    const band = next ? item.outset - next.outset : item.outset;
    return { stroke: item, band, hidden: band <= 0 };
  });
};

/** 효과가 논리 박스 밖으로 나가는 최대 범위 */
export const getSpikeEffectOutset = (scene: SpikeScene) => {
  const maxStrokeOutset = scene.strokes.reduce(
    (max, item) => Math.max(max, item.outset),
    0,
  );
  const shadow = scene.shadow;
  const shadowLeft = shadow ? Math.max(0, shadow.blur - shadow.offsetX) : 0;
  const shadowRight = shadow ? Math.max(0, shadow.blur + shadow.offsetX) : 0;
  const shadowTop = shadow ? Math.max(0, shadow.blur - shadow.offsetY) : 0;
  const shadowBottom = shadow ? Math.max(0, shadow.blur + shadow.offsetY) : 0;

  return {
    left: maxStrokeOutset + shadowLeft,
    right: maxStrokeOutset + shadowRight,
    top: maxStrokeOutset + shadowTop,
    bottom: maxStrokeOutset + shadowBottom,
  };
};
