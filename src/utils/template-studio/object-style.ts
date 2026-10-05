import type { CSSProperties } from "react";
import type {
  StudioObjectLayoutMode,
  StudioStyleRecord,
} from "@/types/template-studio";
import { isStudioFillParentLayout } from "./object-layout";

export type StudioTextAlignment = "left" | "center" | "right";
export const STUDIO_GEOMETRY_STYLE_KEYS = [
  "left",
  "top",
  "width",
  "height",
] as const;
export const isStudioGeometryStyleKey = (key: string) =>
  (STUDIO_GEOMETRY_STYLE_KEYS as readonly string[]).includes(key);

export const getStudioTextAlignment = (
  style: StudioStyleRecord,
): StudioTextAlignment => {
  if (
    style.textAlign === "left" ||
    style.textAlign === "center" ||
    style.textAlign === "right"
  )
    return style.textAlign;
  if (style.justifyContent === "center") return "center";
  if (style.justifyContent === "flex-end" || style.justifyContent === "end")
    return "right";
  return "left";
};
export const getStudioTextJustifyContent = (alignment: StudioTextAlignment) =>
  alignment === "left"
    ? "flex-start"
    : alignment === "right"
      ? "flex-end"
      : "center";
export const getStudioTextAlignmentStyle = (
  style: StudioStyleRecord,
  alignment: StudioTextAlignment,
): StudioStyleRecord => ({
  ...style,
  textAlign: alignment,
  justifyContent: getStudioTextJustifyContent(alignment),
});

/** These pure operations are independent of inline styles versus styleId storage. */
export const getStudioObjectStyleWithValue = (
  style: StudioStyleRecord,
  layoutMode: StudioObjectLayoutMode | undefined,
  key: string,
  value: string | number | undefined,
): StudioStyleRecord =>
  isStudioFillParentLayout(layoutMode) && isStudioGeometryStyleKey(key)
    ? style
    : { ...style, [key]: value };

export const getStudioObjectFitParentStyle = (
  style: StudioStyleRecord,
  shouldFillParent: boolean,
  size: { width: number; height: number },
): StudioStyleRecord => ({
  ...style,
  left: 0,
  top: 0,
  ...(shouldFillParent ? {} : size),
});

export const roundStudioCoordinate = (value: number) =>
  Number(value.toFixed(2));
export const getStudioObjectOffsetStyle = (
  style: StudioStyleRecord,
  delta: { deltaX: number; deltaY: number },
  origin: { left: number; top: number },
  round = false,
): StudioStyleRecord => ({
  ...style,
  left: round
    ? roundStudioCoordinate(origin.left + delta.deltaX)
    : origin.left + delta.deltaX,
  top: round
    ? roundStudioCoordinate(origin.top + delta.deltaY)
    : origin.top + delta.deltaY,
});

export const getStudioObjectPositionStyle = (
  style: StudioStyleRecord,
  layoutMode: StudioObjectLayoutMode | undefined,
  patch: Partial<{
    left: number;
    top: number;
    width: number;
    height: number;
    rotateDeg: number;
  }>,
  geometry: { left: number; top: number; width: number; height: number },
): StudioStyleRecord | null => {
  if (
    isStudioFillParentLayout(layoutMode) &&
    STUDIO_GEOMETRY_STYLE_KEYS.some((key) => patch[key] !== undefined)
  )
    return null;
  return {
    ...style,
    left: roundStudioCoordinate(patch.left ?? geometry.left),
    top: roundStudioCoordinate(patch.top ?? geometry.top),
    width: roundStudioCoordinate(patch.width ?? geometry.width),
    height: roundStudioCoordinate(patch.height ?? geometry.height),
    rotateDeg: roundStudioCoordinate(
      patch.rotateDeg ??
        (typeof style.rotateDeg === "number" ? style.rotateDeg : 0),
    ),
  };
};

export const applyStudioObjectHidden = (
  object: { hidden?: boolean },
  hidden: boolean | undefined,
) => {
  object.hidden = hidden;
};

export const getStudioCssOpacity = (value: unknown): number => {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed <= 1 ? parsed : parsed / 100, 0), 1);
};
export const getStudioOpacityPercent = (value: unknown) =>
  Math.round(getStudioCssOpacity(value) * 100);
export const getStudioBackgroundSizeForFit = (
  fit?: "cover" | "contain" | "fill",
) => (fit === "fill" ? "100% 100%" : (fit ?? "cover"));

/** Convert editor-only declarations once; consumers retain their domain policies. */
export const getStudioObjectCssStyle = (
  record: StudioStyleRecord = {},
  options: { legacyTimetable?: boolean } = {},
): CSSProperties => {
  const {
    rotateDeg,
    textWrapMode,
    dateRangeFormat,
    dateRangeTemplate,
    assetMode,
    assetPosition,
    assetGap,
    assetSize,
    ...rest
  } = record;
  void [
    textWrapMode,
    dateRangeFormat,
    dateRangeTemplate,
    assetMode,
    assetPosition,
    assetGap,
    assetSize,
  ];
  const style = { ...rest } as CSSProperties;
  style.position = options.legacyTimetable
    ? "absolute"
    : (style.position ?? "absolute");
  if (options.legacyTimetable) {
    style.opacity = getStudioCssOpacity(record.opacity);
    style.transform =
      typeof rotateDeg === "number" ? `rotate(${rotateDeg}deg)` : undefined;
  } else if (typeof rotateDeg === "number" && rotateDeg !== 0) {
    style.transform = [style.transform, `rotate(${rotateDeg}deg)`]
      .filter(Boolean)
      .join(" ");
  }
  return style;
};
