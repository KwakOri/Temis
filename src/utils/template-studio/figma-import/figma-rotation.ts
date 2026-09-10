export const normalizeFigmaRotation = (
  raw: number | undefined,
): number | undefined => {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;

  const degrees = Math.abs(raw) <= Math.PI * 2 + 0.0001
    ? (raw * 180) / Math.PI
    : raw;
  return Math.round(degrees * 100) / 100;
};

export const adjustFigmaRectForCssCenterRotation = ({
  left,
  top,
  width,
  height,
  rotateDeg,
  rotatedWidth,
  rotatedHeight,
}: {
  left: number;
  top: number;
  width: number;
  height: number;
  rotateDeg?: number;
  rotatedWidth?: number;
  rotatedHeight?: number;
}): { left: number; top: number; width: number; height: number } => {
  if (
    typeof rotateDeg !== "number" ||
    !Number.isFinite(rotateDeg) ||
    Math.abs(rotateDeg) <= 0.0001
  ) {
    return { left, top, width, height };
  }

  const radians = (rotateDeg * Math.PI) / 180;
  const boundsWidth = Number.isFinite(rotatedWidth)
    ? rotatedWidth!
    : Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const boundsHeight = Number.isFinite(rotatedHeight)
    ? rotatedHeight!
    : Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));

  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    left: round(left + (boundsWidth - width) / 2),
    top: round(top + (boundsHeight - height) / 2),
    width,
    height,
  };
};
