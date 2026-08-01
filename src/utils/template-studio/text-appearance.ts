import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTextPresetReference,
  StudioTextShadow,
  StudioTextStroke,
} from "@/types/template-studio";

/**
 * 저장하는 stroke 두께를 CSS 값으로 바꾸는 배수.
 *
 * 사용자에게 보여주고 문서에 저장하는 값은 glyph 바깥으로 보이는 실효 두께(`outset`)다.
 * 중앙 정렬 CSS stroke는 절반이 glyph 안쪽으로 들어가므로 두 배로 변환해야 바깥 두께가
 * 지정한 값이 된다. Phase 0A 스파이크가 화면과 PNG 양쪽에서 이 변환을 확인했다.
 */
export const STUDIO_TEXT_STROKE_CSS_SCALE = 2;

/**
 * 실효 두께를 CSS stroke 두께로 바꾼다.
 *
 * 렌더러와 인스펙터, 효과 바깥 영역 계산이 모두 이 함수를 쓴다. 호출부마다 직접 두 배를
 * 곱하면 한 곳을 고칠 때 나머지가 남아 화면과 결과물이 어긋난다.
 */
export const toStudioCssStrokeWidth = (outset: number): number =>
  Number.isFinite(outset) && outset > 0
    ? outset * STUDIO_TEXT_STROKE_CSS_SCALE
    : 0;

/**
 * 그릴 수 있는 stroke인지.
 *
 * 꺼 둔 것과 두께가 0 이하인 것은 그리지 않는다. 두께 0을 레이어로 만들면 아무것도 보이지
 * 않는 레이어가 쌓여서, 순서를 바꿔도 화면이 그대로인 것처럼 보인다.
 */
const isDrawableStroke = (stroke: StudioTextStroke): boolean =>
  stroke.enabled && Number.isFinite(stroke.outset) && stroke.outset > 0;

/**
 * 그릴 순서대로 정렬한 stroke.
 *
 * 두꺼운 것이 먼저다. 렌더러는 이 순서대로 뒤에서 앞으로 겹쳐 그린다. 얇은 것을 먼저
 * 그리면 두꺼운 것이 그 위를 덮어서 안쪽 stroke가 사라진다.
 *
 * 인스펙터의 목록에는 이 결과를 쓰지 않는다. 꺼 둔 stroke도 목록에는 남아야 사용자가 다시
 * 켤 수 있다.
 */
export const getStudioOrderedTextStrokes = (
  strokes: readonly StudioTextStroke[],
): StudioTextStroke[] =>
  [...strokes].filter(isDrawableStroke).sort((a, b) => b.outset - a.outset);

export interface StudioTextStrokeBand {
  stroke: StudioTextStroke;
  /** 화면에 실제로 보이는 띠 두께 */
  band: number;
  /** 더 두꺼운 stroke에 완전히 가려지는지 */
  hidden: boolean;
}

/**
 * 화면에 보이는 띠 두께를 계산한다.
 *
 * `outset`은 glyph 표면에서부터 잰 값이므로, 사용자가 실제로 보는 띠는 인접한 두 `outset`의
 * 차이다. 가장 안쪽 stroke만 자기 `outset` 전체가 보인다.
 *
 * 이 값이 0이면 그 stroke는 더 두꺼운 stroke에 완전히 가려진다. 인스펙터가 그 사실을 알려야
 * 한다. 색을 바꿔도 화면이 그대로면 사용자는 편집기가 고장난 것으로 읽는다.
 */
export const getStudioTextStrokeBands = (
  strokes: readonly StudioTextStroke[],
): StudioTextStrokeBand[] => {
  const ordered = getStudioOrderedTextStrokes(strokes);

  return ordered.map((stroke, index) => {
    const next = ordered[index + 1];
    const band = next ? stroke.outset - next.outset : stroke.outset;
    return { stroke, band, hidden: band <= 0 };
  });
};

export interface ResolvedStudioTextFill {
  /**
   * 글자색. 지정된 색이 없으면 `null`이다.
   *
   * `null`일 때 렌더러는 색을 지정하지 않고 물려받는다. 기본색을 채워 넣으면 색을 지정하지
   * 않고 물려받던 기존 문서의 글자색이 바뀐다.
   */
  color: string | null;
  opacity: number;
}

export interface ResolvedStudioTextAppearance {
  fill: ResolvedStudioTextFill;
  /** 그릴 순서대로 정렬된 stroke. 두꺼운 것이 먼저다. */
  strokes: StudioTextStroke[];
  shadow?: StudioTextShadow;
  presetRef?: StudioTextPresetReference;
  /**
   * 이 결과가 어디서 왔는지.
   *
   * `appearance`는 노드에 저장된 구조화된 값이고, `legacyStyle`은 그것이 없어서 style
   * 레코드에서 읽어 온 것이다. 인스펙터가 "효과를 아직 저장하지 않았다"를 구분해야 하고,
   * 저장하는 순간 구조화된 값을 만들어야 한다.
   */
  source: "appearance" | "legacyStyle";
}

const readStyleString = (
  style: StudioStyleRecord | undefined,
  key: string,
): string | null => {
  const value = style?.[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

/**
 * 예전 문서의 scalar stroke 값을 읽는다.
 *
 * 구조화된 효과가 생기기 전에는 stroke를 CSS 선언 하나로 저장했다. 저장된 값은 CSS 두께이므로
 * 실효 두께로 되돌리려면 변환 배수로 나눈다. 그래야 인스펙터에 보이는 숫자가 화면에서 보이는
 * 바깥 두께와 같아진다.
 *
 * 읽기 전용이다. 새로 저장할 때는 구조화된 `textAppearance`를 만든다.
 */
const readLegacyStroke = (
  style: StudioStyleRecord | undefined,
): StudioTextStroke | null => {
  const declaration =
    readStyleString(style, "WebkitTextStroke") ??
    readStyleString(style, "webkitTextStroke");
  if (!declaration) return null;

  const match = /^([\d.]+)px\s+(.+)$/.exec(declaration);
  if (!match) return null;

  const cssWidth = Number.parseFloat(match[1]);
  if (!Number.isFinite(cssWidth) || cssWidth <= 0) return null;

  return {
    id: "legacy-stroke",
    enabled: true,
    color: match[2].trim(),
    outset: cssWidth / STUDIO_TEXT_STROKE_CSS_SCALE,
    opacity: 1,
  };
};

/**
 * 텍스트 노드가 실제로 그릴 표현을 정한다.
 *
 * 렌더러와 인스펙터가 같은 함수를 쓴다. fallback 규칙을 양쪽에 따로 쓰면 인스펙터에 보이는
 * 값과 화면에 그려지는 값이 갈린다.
 *
 * 구조화된 `textAppearance`가 없으면 style 레코드에서 읽는다. 기존 시간표 문서에는
 * `textAppearance`가 없으므로 이 경로를 탄다. 그 문서의 시각 결과가 바뀌면 안 되므로
 * 색이 없을 때 기본색을 채우지 않는다.
 *
 * 글자의 `opacity`는 여기서 다루지 않는다. `style.opacity`는 노드 전체의 투명도이고
 * 렌더러가 이미 CSS로 흘린다. 채우기 투명도로 한 번 더 적용하면 두 번 곱해진다.
 */
export const resolveStudioTextAppearance = (
  node: StudioGraphNode,
  style: StudioStyleRecord | undefined,
): ResolvedStudioTextAppearance => {
  const appearance = node.textAppearance;

  if (appearance) {
    return {
      fill: {
        color: appearance.fill.color,
        opacity: Number.isFinite(appearance.fill.opacity)
          ? appearance.fill.opacity
          : 1,
      },
      strokes: getStudioOrderedTextStrokes(appearance.strokes),
      // 꺼 둔 그림자는 없는 것과 같다. 렌더러가 다시 판단하지 않게 여기서 걸러낸다.
      shadow: appearance.shadow?.enabled ? appearance.shadow : undefined,
      presetRef: appearance.presetRef,
      source: "appearance",
    };
  }

  const legacyStroke = readLegacyStroke(style);

  return {
    fill: {
      color: readStyleString(style, "color"),
      opacity: 1,
    },
    strokes: legacyStroke ? [legacyStroke] : [],
    source: "legacyStyle",
  };
};

/**
 * 이 노드에 구조화된 효과가 저장돼 있는지.
 *
 * 인스펙터가 "아직 기본 표현"과 "효과를 저장했다"를 구분할 때 쓴다.
 */
export const hasStudioTextAppearance = (node: StudioGraphNode): boolean =>
  Boolean(node.textAppearance);
