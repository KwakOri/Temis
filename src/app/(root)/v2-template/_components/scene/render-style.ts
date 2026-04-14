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
  const nextRest = { ...rest };
  delete nextRest.rotate;
  const style = { ...(nextRest as CSSProperties) } as CSSProperties &
    Record<string, unknown>;

  const rotate = v2_parseRotateDeg(rotateDeg);
  if (!rotate) return style;

  const nextStyle: CSSProperties & Record<string, unknown> = { ...style };

  const transform =
    typeof nextStyle.transform === "string" ? nextStyle.transform.trim() : "";
  if (transform.length === 0) {
    nextStyle.transform = `rotate(${rotate})`;
    return nextStyle;
  }

  const rotatePattern = /rotate\(([^)]*)\)/i;
  if (rotatePattern.test(transform)) {
    nextStyle.transform = transform.replace(rotatePattern, `rotate(${rotate})`);
    return nextStyle;
  }

  nextStyle.transform = `${transform} rotate(${rotate})`;
  return nextStyle;
};

const v2_hasOffsetProperty = (style: CSSProperties): boolean => {
  return (
    style.top !== undefined ||
    style.right !== undefined ||
    style.bottom !== undefined ||
    style.left !== undefined ||
    style.inset !== undefined ||
    style.insetInline !== undefined ||
    style.insetBlock !== undefined ||
    style.insetInlineStart !== undefined ||
    style.insetInlineEnd !== undefined ||
    style.insetBlockStart !== undefined ||
    style.insetBlockEnd !== undefined
  );
};

export const v2_toRenderableLayoutStyle = (value: unknown): CSSProperties => {
  const style = v2_toRenderableStyle(value);
  if (style.position !== undefined) return style;
  if (v2_hasOffsetProperty(style)) {
    return {
      ...style,
      position: "absolute",
    };
  }
  return {
    ...style,
    position: "relative",
  };
};
