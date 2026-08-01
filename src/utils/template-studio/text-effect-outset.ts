import type {
  StudioTextAppearance,
  StudioTextShadow,
} from "@/types/template-studio";
import { getStudioDrawableTextStrokes } from "@/utils/template-studio/text-appearance";

export interface StudioEffectOutset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StudioLogicalBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StudioVisualBounds extends StudioLogicalBounds {
  right: number;
  bottom: number;
}

export interface StudioPoint {
  x: number;
  y: number;
}

const finiteNonNegative = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

const finiteNumber = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const isDrawableShadow = (shadow: StudioTextShadow | undefined): boolean =>
  Boolean(
    shadow?.enabled && Number.isFinite(shadow.opacity) && shadow.opacity > 0,
  );

const getDrawableShadow = (
  shadow: StudioTextShadow | undefined,
): StudioTextShadow | undefined =>
  isDrawableShadow(shadow) ? shadow : undefined;

/**
 * 구조화 텍스트 효과가 논리 박스 밖으로 나가는 로컬 범위를 계산한다.
 *
 * 저장 값은 논리 박스에 더하지 않는다. 이 결과는 화면의 overflow 진단과 PNG clipping
 * 진단에서만 사용한다. CSS blur의 마지막 픽셀은 엄밀한 경계가 아니므로 blur 자체를 운용상
 * 경계로 사용한다.
 */
export const getStudioTextEffectOutset = (
  appearance: Pick<StudioTextAppearance, "strokes" | "shadow"> | undefined,
): StudioEffectOutset => {
  const strokeOutset = getStudioDrawableTextStrokes(
    appearance?.strokes ?? [],
  ).reduce(
    (maximum, stroke) => Math.max(maximum, finiteNonNegative(stroke.outset)),
    0,
  );
  const shadow = getDrawableShadow(appearance?.shadow);
  const shadowBlurOutset = finiteNonNegative(shadow?.blur);
  const shadowOffsetX = finiteNumber(shadow?.offsetX);
  const shadowOffsetY = finiteNumber(shadow?.offsetY);

  return {
    top: strokeOutset + Math.max(0, shadowBlurOutset - shadowOffsetY),
    right: strokeOutset + Math.max(0, shadowBlurOutset + shadowOffsetX),
    bottom: strokeOutset + Math.max(0, shadowBlurOutset + shadowOffsetY),
    left: strokeOutset + Math.max(0, shadowBlurOutset - shadowOffsetX),
  };
};

const rotatePoint = (
  point: StudioPoint,
  center: StudioPoint,
  radians: number,
) => {
  const x = point.x - center.x;
  const y = point.y - center.y;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return {
    x: center.x + x * cosine - y * sine,
    y: center.y + x * sine + y * cosine,
  };
};

/** 로컬 outset을 먼저 적용한 뒤 CSS center rotation의 corner를 계산한다. */
export const getStudioVisualBoundsCorners = ({
  logicalBounds,
  appearance,
  rotateDeg = 0,
}: {
  logicalBounds: StudioLogicalBounds;
  appearance?: Pick<StudioTextAppearance, "strokes" | "shadow">;
  rotateDeg?: number;
}): StudioPoint[] => {
  const outset = getStudioTextEffectOutset(appearance);
  const expanded = {
    left: logicalBounds.left - outset.left,
    top: logicalBounds.top - outset.top,
    right: logicalBounds.left + logicalBounds.width + outset.right,
    bottom: logicalBounds.top + logicalBounds.height + outset.bottom,
  };
  const center = {
    x: logicalBounds.left + logicalBounds.width / 2,
    y: logicalBounds.top + logicalBounds.height / 2,
  };
  const radians =
    (Number.isFinite(rotateDeg) ? rotateDeg : 0) * (Math.PI / 180);
  const corners: StudioPoint[] = [
    { x: expanded.left, y: expanded.top },
    { x: expanded.right, y: expanded.top },
    { x: expanded.right, y: expanded.bottom },
    { x: expanded.left, y: expanded.bottom },
  ];
  return corners.map((point) => rotatePoint(point, center, radians));
};

/** 로컬 outset을 먼저 적용한 뒤 CSS center rotation의 canvas bounds를 계산한다. */
export const getStudioVisualBounds = ({
  logicalBounds,
  appearance,
  rotateDeg = 0,
}: {
  logicalBounds: StudioLogicalBounds;
  appearance?: Pick<StudioTextAppearance, "strokes" | "shadow">;
  rotateDeg?: number;
}): StudioVisualBounds => {
  const corners = getStudioVisualBoundsCorners({
    logicalBounds,
    appearance,
    rotateDeg,
  });
  const left = Math.min(...corners.map((point) => point.x));
  const top = Math.min(...corners.map((point) => point.y));
  const right = Math.max(...corners.map((point) => point.x));
  const bottom = Math.max(...corners.map((point) => point.y));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
};
