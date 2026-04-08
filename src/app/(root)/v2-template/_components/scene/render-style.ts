import { CSSProperties } from "react";

const v2_parseRotateDeg = (value: unknown): string | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}deg`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return `${trimmed}deg`;
    }
    return trimmed;
  }

  return undefined;
};

export const v2_toRenderableStyle = (value: unknown): CSSProperties => {
  if (!value || typeof value !== "object") return {};

  const raw = value as Record<string, unknown>;
  const { rotateDeg, ...rest } = raw;
  const style = rest as CSSProperties;

  if (style.rotate !== undefined) return style;

  const rotate = v2_parseRotateDeg(rotateDeg);
  if (!rotate) return style;

  return {
    ...style,
    rotate,
  };
};

