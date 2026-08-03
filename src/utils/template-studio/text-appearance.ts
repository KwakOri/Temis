import type {
  StudioGraphNode,
  StudioStyleRecord,
  StudioTextFill,
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

/** 외부 JSON이 validator를 우회해도 renderer가 만드는 효과 레이어의 상한. */
export const STUDIO_TEXT_MAX_STROKES = 8;
export const STUDIO_TEXT_MAX_OUTSET = 64;
export const STUDIO_TEXT_MAX_OPACITY = 1;
export const STUDIO_TEXT_DEFAULT_FILL_COLOR = "#111827";
export const STUDIO_TEXT_DEFAULT_GRADIENT_END_COLOR = "#ffffff";
export const STUDIO_TEXT_DEFAULT_GRADIENT_ANGLE = 90;

const COLOR_FUNCTION_PATTERN = /^(?:rgb|rgba|hsl|hsla|color)\([^()]+\)$/i;
const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CSS_COLOR_KEYWORDS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black
  blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse
  chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
  darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta
  darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink
  deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
  fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey
  honeydew hotpink indianred indigo ivory khaki lavender lavenderblush
  lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow
  lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen
  lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
  limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid
  mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise
  mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy
  oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen
  paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue
  purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown
  seagreen seashell sienna silver skyblue slateblue slategray slategrey snow
  springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen`.split(/\s+/),
);

/** 텍스트 Fill에서 저장·렌더링에 허용하는 CSS 색상 표현이다. */
export const isStudioTextFillColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  const color = value.trim();
  if (color.length === 0) return false;
  if (
    color === "transparent" ||
    color === "currentColor" ||
    CSS_COLOR_KEYWORDS.has(color.toLowerCase())
  ) {
    return true;
  }
  if (HEX_COLOR_PATTERN.test(color)) return true;
  return COLOR_FUNCTION_PATTERN.test(color);
};

export const normalizeStudioTextFillOpacity = (
  value: unknown,
  fallback = 1,
): number => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(STUDIO_TEXT_MAX_OPACITY, Math.max(0, numericValue));
};

/** CSS가 허용하는 0° 이상 360° 미만의 회전값으로 해석한다. */
export const normalizeStudioTextFillAngle = (
  value: unknown,
  fallback = STUDIO_TEXT_DEFAULT_GRADIENT_ANGLE,
): number => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  if (numericValue === 360) return 360;

  const normalized = numericValue % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

/** 편집기 입력 경계에서 0~360 범위를 강제한다. */
export const clampStudioTextFillAngle = (value: number): number =>
  Math.min(
    360,
    Math.max(
      0,
      Number.isFinite(value) ? value : STUDIO_TEXT_DEFAULT_GRADIENT_ANGLE,
    ),
  );

export type ResolvedStudioTextFill =
  | {
      type: "solid";
      color: string | null;
      opacity: number;
    }
  | {
      type: "linearGradient";
      startColor: string;
      endColor: string;
      angleDeg: number;
      opacity: number;
    };

/** 저장값과 legacy style.color를 같은 구조로 해석한다. */
export const resolveStudioTextFill = (
  fill: unknown,
  fallbackColor: string | null = null,
): ResolvedStudioTextFill => {
  if (!fill || typeof fill !== "object") {
    return { type: "solid", color: fallbackColor, opacity: 1 };
  }

  const candidate = fill as Record<string, unknown>;
  const opacity = normalizeStudioTextFillOpacity(candidate.opacity);

  if (candidate.type === "solid") {
    return {
      type: "solid",
      color: isStudioTextFillColor(candidate.color)
        ? candidate.color.trim()
        : fallbackColor,
      opacity,
    };
  }

  if (candidate.type === "linearGradient") {
    return {
      type: "linearGradient",
      startColor: isStudioTextFillColor(candidate.startColor)
        ? candidate.startColor.trim()
        : (fallbackColor ?? STUDIO_TEXT_DEFAULT_FILL_COLOR),
      endColor: isStudioTextFillColor(candidate.endColor)
        ? candidate.endColor.trim()
        : STUDIO_TEXT_DEFAULT_GRADIENT_END_COLOR,
      angleDeg: normalizeStudioTextFillAngle(candidate.angleDeg),
      opacity,
    };
  }

  return { type: "solid", color: fallbackColor, opacity };
};

export const createStudioTextFillGradient = (
  fill: StudioTextFill,
): StudioTextFill => {
  const resolved = resolveStudioTextFill(fill, STUDIO_TEXT_DEFAULT_FILL_COLOR);
  return resolved.type === "linearGradient"
    ? {
        type: "linearGradient",
        startColor: resolved.startColor,
        endColor: resolved.endColor,
        angleDeg: resolved.angleDeg,
        opacity: resolved.opacity,
      }
    : {
        type: "linearGradient",
        startColor: resolved.color ?? STUDIO_TEXT_DEFAULT_FILL_COLOR,
        endColor: STUDIO_TEXT_DEFAULT_GRADIENT_END_COLOR,
        angleDeg: STUDIO_TEXT_DEFAULT_GRADIENT_ANGLE,
        opacity: resolved.opacity,
      };
};

export const createStudioTextFillSolid = (
  fill: StudioTextFill,
): StudioTextFill => {
  const resolved = resolveStudioTextFill(fill, STUDIO_TEXT_DEFAULT_FILL_COLOR);
  return resolved.type === "solid"
    ? {
        type: "solid",
        color: resolved.color ?? STUDIO_TEXT_DEFAULT_FILL_COLOR,
        opacity: resolved.opacity,
      }
    : {
        type: "solid",
        color: resolved.startColor,
        opacity: resolved.opacity,
      };
};

export const normalizeStudioTextFill = (
  fill: unknown,
  fallbackColor = STUDIO_TEXT_DEFAULT_FILL_COLOR,
): StudioTextFill => {
  const resolved = resolveStudioTextFill(fill, fallbackColor);
  return resolved.type === "solid"
    ? {
        type: "solid",
        color: resolved.color ?? fallbackColor,
        opacity: resolved.opacity,
      }
    : {
        type: "linearGradient",
        startColor: resolved.startColor,
        endColor: resolved.endColor,
        angleDeg: clampStudioTextFillAngle(resolved.angleDeg),
        opacity: resolved.opacity,
      };
};

export const getStudioTextFillPrimaryColor = (
  fill: ResolvedStudioTextFill | StudioTextFill,
): string | null => (fill.type === "solid" ? fill.color : fill.startColor);

export const getStudioTextFillCss = (
  fill: ResolvedStudioTextFill | StudioTextFill,
): string | undefined => {
  const resolved = resolveStudioTextFill(fill, STUDIO_TEXT_DEFAULT_FILL_COLOR);
  return resolved.type === "linearGradient"
    ? `linear-gradient(${resolved.angleDeg}deg, ${resolved.startColor}, ${resolved.endColor})`
    : undefined;
};

export interface StudioTextFillRenderStyle {
  color?: string;
  backgroundImage?: string;
  backgroundClip?: "text";
  WebkitBackgroundClip?: "text";
  WebkitTextFillColor?: "transparent";
  opacity: number;
}

/** StudioText의 고정 크기·Auto-fit·효과 레이어가 공유하는 Fill CSS다. */
export const getStudioTextFillRenderStyle = (
  fill: ResolvedStudioTextFill | StudioTextFill,
): StudioTextFillRenderStyle => {
  const resolved = resolveStudioTextFill(fill);
  if (resolved.type === "solid") {
    return {
      ...(resolved.color ? { color: resolved.color } : {}),
      opacity: resolved.opacity,
    };
  }

  return {
    backgroundImage: getStudioTextFillCss(resolved),
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    opacity: resolved.opacity,
  };
};

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
 * 투명도를 색에 섞어 CSS 색 값으로 만든다.
 *
 * 그림자는 레이어 투명도로 다룰 수 없다. 같은 레이어가 글자와 외곽선도 함께 그리므로,
 * 레이어를 흐리게 하면 그림자만이 아니라 전부 흐려진다. 그래서 색 자체에 alpha를 넣는다.
 *
 * `#rgb`와 `#rrggbb`만 alpha를 넣을 수 있다. 이름 있는 색이나 `rgb()` 표기는 안전하게
 * 쪼갤 수 없으므로 색을 그대로 준다. 억지로 문자열을 만들면 CSS가 선언 전체를 버려서
 * 그림자가 사라진다.
 */
export const toStudioCssColor = (color: string, opacity = 1): string => {
  const normalizedOpacity = Number.isFinite(opacity) ? opacity : 1;
  if (normalizedOpacity >= 1) return color;

  const clampedOpacity = Math.max(normalizedOpacity, 0);
  const hex = color.trim().replace("#", "");
  const isShortHex = /^[0-9a-f]{3}$/i.test(hex);
  const isLongHex = /^[0-9a-f]{6}$/i.test(hex);
  if (!isShortHex && !isLongHex) return color;

  const fullHex = isShortHex
    ? hex
        .split("")
        .map((part) => part + part)
        .join("")
    : hex;
  const value = Number.parseInt(fullHex, 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${
    value & 255
  }, ${clampedOpacity})`;
};

/** 저장된 뒤→앞 순서와 disabled 항목을 포함한 stroke 목록을 복사한다. */
export const getStudioOrderedTextStrokes = (
  strokes: readonly StudioTextStroke[],
): StudioTextStroke[] => (Array.isArray(strokes) ? [...strokes] : []);

const isDrawableStudioTextStroke = (
  stroke: StudioTextStroke | undefined,
): stroke is StudioTextStroke =>
  Boolean(
    stroke &&
    stroke.enabled === true &&
    Number.isFinite(stroke.opacity) &&
    stroke.opacity > 0 &&
    stroke.opacity <= STUDIO_TEXT_MAX_OPACITY &&
    Number.isFinite(stroke.outset) &&
    stroke.outset > 0 &&
    stroke.outset <= STUDIO_TEXT_MAX_OUTSET,
  );

/** 저장 목록과 분리된 renderer용 stroke 목록이다. 순서를 바꾸거나 8개를 넘기지 않는다. */
export const getStudioDrawableTextStrokes = (
  strokes: readonly StudioTextStroke[],
): StudioTextStroke[] =>
  getStudioOrderedTextStrokes(strokes)
    .filter(isDrawableStudioTextStroke)
    .slice(0, STUDIO_TEXT_MAX_STROKES);

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
  const bands = new Array<StudioTextStrokeBand>(ordered.length);
  let frontMostOutset = 0;

  // A later stroke can be thicker than the immediately following one. Walk from front to
  // back so a stroke is compared with every layer that can cover it, not just its neighbour.
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const stroke = ordered[index];
    const drawable = isDrawableStudioTextStroke(stroke);
    const band = drawable ? Math.max(0, stroke.outset - frontMostOutset) : 0;
    bands[index] = { stroke, band, hidden: band <= 0 };
    if (drawable) frontMostOutset = Math.max(frontMostOutset, stroke.outset);
  }

  return bands;
};

export interface StudioTextStrokeStackEntry {
  stroke: StudioTextStroke;
  /** 패널에서 입력하는 개별 띠 두께 */
  thickness: number;
  /** glyph 기준 저장된 누적 outset */
  effectiveOutset: number;
  /** 현재 enabled, opacity, 순서에서 실제로 보이는 띠 두께 */
  visibleBand: number;
  /** 다른 활성 stroke에 완전히 가려지는지 */
  hidden: boolean;
}

/** 저장된 뒤→앞 순서를 패널의 안쪽→바깥쪽 stack으로 해석한다. */
export const getStudioTextStrokeStack = (
  strokes: readonly StudioTextStroke[],
): StudioTextStrokeStackEntry[] => {
  const ordered = getStudioOrderedTextStrokes(strokes);
  const bands = getStudioTextStrokeBands(ordered);
  const stack: StudioTextStrokeStackEntry[] = [];
  let innerEffectiveOutset = 0;

  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const stroke = ordered[index];
    const effectiveOutset =
      Number.isFinite(stroke.outset) && stroke.outset > 0 ? stroke.outset : 0;
    const thickness = Math.max(0, effectiveOutset - innerEffectiveOutset);
    const band = bands[index];

    stack.push({
      stroke,
      thickness,
      effectiveOutset,
      visibleBand: band?.band ?? 0,
      hidden: band?.hidden ?? true,
    });
    innerEffectiveOutset = Math.max(innerEffectiveOutset, effectiveOutset);
  }

  return stack;
};

/** 저장된 effective outset 중 가장 바깥쪽 값을 반환한다. */
export const getStudioTextOutermostConfiguredOutset = (
  strokes: readonly StudioTextStroke[],
): number =>
  getStudioOrderedTextStrokes(strokes).reduce(
    (maximum, stroke) =>
      Number.isFinite(stroke.outset)
        ? Math.max(maximum, Math.max(0, stroke.outset))
        : maximum,
    0,
  );

/** 패널 순서의 stroke/thickness를 저장 순서 뒤→앞의 누적 outset으로 변환한다. */
export const rebuildStudioTextStrokeOutsetsFromPanelOrder = (
  panelStrokes: readonly StudioTextStroke[],
  thicknesses: readonly number[],
): StudioTextStroke[] => {
  let effectiveOutset = 0;
  const rebuilt = panelStrokes.map((stroke, index) => {
    const thickness =
      typeof thicknesses[index] === "number" &&
      Number.isFinite(thicknesses[index])
        ? Math.max(0, thicknesses[index])
        : 0;
    effectiveOutset += thickness;
    return { ...stroke, outset: effectiveOutset };
  });

  return rebuilt.reverse();
};

export interface ResolvedStudioTextAppearance {
  fill: ResolvedStudioTextFill;
  /** 저장된 뒤→앞 순서를 유지한 전체 stroke 목록. 비활성 항목도 포함한다. */
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

const splitLegacyShadowList = (value: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
};

const LEGACY_SHADOW_LENGTH = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(?:px)?$/i;

const splitLegacyShadowTokens = (value: string): string[] => {
  const tokens: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === "(") depth += 1;
    if (character === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(character) && depth === 0) {
      if (start < index) tokens.push(value.slice(start, index));
      start = index + 1;
    }
  }

  if (start < value.length) tokens.push(value.slice(start));
  return tokens;
};

/** 지원 가능한 단일 scalar `textShadow`를 구조화 shadow로 읽는다. */
export const parseLegacyStudioTextShadow = (
  style: StudioStyleRecord | undefined,
): StudioTextShadow | null => {
  const value = readStyleString(style, "textShadow");
  if (!value || value === "none") return null;

  const shadows = splitLegacyShadowList(value);
  if (shadows.length !== 1) return null;

  const tokens = splitLegacyShadowTokens(shadows[0]);
  if (tokens.length < 2 || tokens.length > 4) return null;

  const isLength = (token: string) => LEGACY_SHADOW_LENGTH.test(token);
  const allLengths = tokens.every(isLength);
  const colorFirst = !allLengths && !isLength(tokens[0]);
  const colorLast = !allLengths && !isLength(tokens[tokens.length - 1]);
  const lengthTokens = allLengths
    ? tokens
    : colorFirst
      ? tokens.slice(1)
      : colorLast
        ? tokens.slice(0, tokens.length - 1)
        : [];
  const color = allLengths
    ? "currentColor"
    : colorFirst
      ? tokens[0]
      : colorLast
        ? tokens[tokens.length - 1]
        : null;
  if (!color || lengthTokens.length < 2 || lengthTokens.length > 3) return null;
  if (!lengthTokens.every(isLength)) return null;

  const offsetX = Number.parseFloat(
    lengthTokens[0].match(LEGACY_SHADOW_LENGTH)?.[1] ?? "NaN",
  );
  const offsetY = Number.parseFloat(
    lengthTokens[1].match(LEGACY_SHADOW_LENGTH)?.[1] ?? "NaN",
  );
  const blur = Number.parseFloat(
    lengthTokens[2]?.match(LEGACY_SHADOW_LENGTH)?.[1] ?? "0",
  );
  if (
    !Number.isFinite(offsetX) ||
    !Number.isFinite(offsetY) ||
    !Number.isFinite(blur) ||
    blur < 0
  ) {
    return null;
  }

  return {
    enabled: true,
    color: color.trim(),
    offsetX,
    offsetY,
    blur,
    opacity: 1,
  };
};

export const hasLegacyStudioTextShadow = (
  style: StudioStyleRecord | undefined,
): boolean => {
  const value = readStyleString(style, "textShadow");
  return Boolean(value && value !== "none");
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
  /**
   * 효과를 담을 수 있는 것.
   *
   * 그래프 노드 전체를 요구하지 않는다. 시간표 composition 오브젝트도 글자를 그리고
   * (§5의 후속 사용 지점), 그쪽은 `StudioGraphNode`가 아니다. 읽는 값이 하나뿐이라
   * 그 하나만 요구한다.
   */
  node: Pick<StudioGraphNode, "textAppearance">,
  style: StudioStyleRecord | undefined,
): ResolvedStudioTextAppearance => {
  const appearance = node.textAppearance;

  if (appearance) {
    return {
      fill: resolveStudioTextFill(appearance.fill),
      strokes: getStudioOrderedTextStrokes(appearance.strokes),
      // 꺼 둔 그림자는 없는 것과 같다. 렌더러가 다시 판단하지 않게 여기서 걸러낸다.
      shadow: appearance.shadow?.enabled ? appearance.shadow : undefined,
      presetRef: appearance.presetRef,
      source: "appearance",
    };
  }

  const legacyStroke = readLegacyStroke(style);
  const legacyShadow = parseLegacyStudioTextShadow(style);

  return {
    fill: {
      type: "solid",
      color: readStyleString(style, "color"),
      opacity: 1,
    },
    strokes: legacyStroke ? [legacyStroke] : [],
    shadow: legacyShadow ?? undefined,
    source: "legacyStyle",
  };
};

/**
 * 효과 레이어를 겹쳐 그려야 하는지.
 *
 * 구조화된 효과가 저장돼 있을 때만 참이다. `legacyStyle`에서 읽은 stroke는 이미 style
 * 선언으로 그려지고 있으므로 레이어를 더하면 같은 외곽선이 두 번 그려진다. `legacy scalar
 * text appearance` 값은 인스펙터가 지금 상태를 보여주기 위해 읽는 것이고 렌더러가 다시
 * 그리지 않는다.
 *
 * 남은 제약: 인스펙터에서 효과를 저장하는 순간 예전 scalar 선언을 style에서 지워야 한다.
 * 지우지 않으면 그때부터 CSS 선언과 효과 레이어가 함께 그려진다. 그 처리는 인스펙터를
 * 만드는 단계(§15 10번)에서 한다.
 */
export const shouldRenderStudioTextEffectLayers = (
  appearance: ResolvedStudioTextAppearance,
): boolean =>
  appearance.source === "appearance" &&
  (appearance.fill.type === "linearGradient" ||
    getStudioDrawableTextStrokes(appearance.strokes).length > 0 ||
    Boolean(appearance.shadow));

/**
 * 이 노드에 구조화된 효과가 저장돼 있는지.
 *
 * 인스펙터가 "아직 기본 표현"과 "효과를 저장했다"를 구분할 때 쓴다.
 */
export const hasStudioTextAppearance = (
  node: Pick<StudioGraphNode, "textAppearance">,
): boolean => Boolean(node.textAppearance);
