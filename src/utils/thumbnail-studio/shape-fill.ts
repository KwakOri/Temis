import type {
  StudioShapeFill,
  StudioTemplateDocument,
} from "@/types/template-studio";

export const STUDIO_SHAPE_FILL_DEFAULT_COLOR = "#4f8cff";
export const STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_END_COLOR = "#ffffff";
export const STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_ANGLE = 90;

const COLOR_FUNCTION_PATTERN = /^(?:rgb|rgba|hsl|hsla|color)\([^()]+\)$/i;
const HEX_COLOR_PATTERN =
  /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Shape picker가 만들 수 있고 JSON 문서에서 안전하게 읽을 수 있는 색상인지 확인한다. */
export const isStudioShapeFillColor = (value: unknown): value is string => {
  if (typeof value !== "string") return false;

  const color = value.trim();
  if (color.length === 0) return false;
  if (color.toLowerCase() === "transparent") return true;
  if (HEX_COLOR_PATTERN.test(color)) return true;
  return COLOR_FUNCTION_PATTERN.test(color);
};

const resolveColor = (value: unknown, fallback: string): string =>
  isStudioShapeFillColor(value) ? value.trim() : fallback;

export const clampStudioShapeFillAngle = (
  value: unknown,
  fallback = STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_ANGLE,
): number => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(360, Math.max(0, numericValue));
};

/**
 * 구조화된 fill을 읽는다. 기존 문서는 shapeFill이 없으므로 style의
 * backgroundColor를 단색으로 흡수한다.
 */
export const resolveStudioShapeFill = (
  shapeFill: unknown,
  legacyBackgroundColor?: unknown,
): StudioShapeFill => {
  const legacyColor = resolveColor(
    legacyBackgroundColor,
    STUDIO_SHAPE_FILL_DEFAULT_COLOR,
  );

  if (!shapeFill || typeof shapeFill !== "object") {
    return { type: "solid", color: legacyColor };
  }

  const candidate = shapeFill as Record<string, unknown>;
  if (candidate.type === "solid") {
    return {
      type: "solid",
      color: resolveColor(candidate.color, legacyColor),
    };
  }

  if (candidate.type === "linearGradient") {
    return {
      type: "linearGradient",
      startColor: resolveColor(candidate.startColor, legacyColor),
      endColor: resolveColor(
        candidate.endColor,
        STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_END_COLOR,
      ),
      angleDeg: clampStudioShapeFillAngle(candidate.angleDeg),
    };
  }

  return { type: "solid", color: legacyColor };
};

export const createStudioShapeFillGradient = (
  fill: StudioShapeFill,
): StudioShapeFill => {
  const resolved = resolveStudioShapeFill(fill);
  return resolved.type === "linearGradient"
    ? resolved
    : {
        type: "linearGradient",
        startColor: resolved.color,
        endColor: STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_END_COLOR,
        angleDeg: STUDIO_SHAPE_FILL_DEFAULT_GRADIENT_ANGLE,
      };
};

export const createStudioShapeFillSolid = (
  fill: StudioShapeFill,
): StudioShapeFill => {
  const resolved = resolveStudioShapeFill(fill);
  return resolved.type === "solid"
    ? resolved
    : { type: "solid", color: resolved.startColor };
};

export const normalizeStudioShapeFill = (
  fill: unknown,
  legacyBackgroundColor?: unknown,
): StudioShapeFill => resolveStudioShapeFill(fill, legacyBackgroundColor);

export type StudioShapeFillUpdate =
  | StudioShapeFill
  | ((current: StudioShapeFill, nodeId: string) => StudioShapeFill);

/** 여러 Shape를 한 번의 document mutation으로 갱신한다. 잠긴 노드는 건너뛴다. */
export const applyStudioShapeFill = (
  document: StudioTemplateDocument,
  nodeIds: readonly string[],
  update: StudioShapeFillUpdate,
): string[] => {
  const changedNodeIds: string[] = [];

  [...new Set(nodeIds)].forEach((nodeId) => {
    const node = document.graph.nodes[nodeId];
    if (!node || node.type !== "shape" || node.locked) return;

    const style = node.styleId ? document.styles[node.styleId] : undefined;
    const current = resolveStudioShapeFill(
      node.shapeFill,
      style?.backgroundColor,
    );
    const nextValue =
      typeof update === "function" ? update(current, node.id) : update;
    node.shapeFill = normalizeStudioShapeFill(
      nextValue,
      current.type === "solid" ? current.color : current.startColor,
    );
    changedNodeIds.push(node.id);
  });

  return changedNodeIds;
};

export const getStudioShapeFillCss = (
  fill: StudioShapeFill,
): string | undefined => {
  const resolved = resolveStudioShapeFill(fill);
  if (resolved.type !== "linearGradient") return undefined;

  return `linear-gradient(${resolved.angleDeg}deg, ${resolved.startColor}, ${resolved.endColor})`;
};

/** Renderer와 Inspector가 공유하는 Shape fill의 CSS 결과. */
export interface StudioShapeFillRenderStyle {
  backgroundColor?: string;
  backgroundImage?: string;
}

export const getStudioShapeFillRenderStyle = (
  fill: StudioShapeFill,
): StudioShapeFillRenderStyle => {
  const resolved = resolveStudioShapeFill(fill);
  return resolved.type === "solid"
    ? {
        backgroundColor: resolved.color,
        backgroundImage: undefined,
      }
    : {
        backgroundImage: getStudioShapeFillCss(resolved),
      };
};
