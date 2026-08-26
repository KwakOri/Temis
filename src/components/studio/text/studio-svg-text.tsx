"use client";

import React, { useId } from "react";

import {
  useStudioFixedTextLayout,
  type StudioTextLayoutResult,
} from "@/components/studio/text/use-studio-text-layout";
import type { ResolvedStudioTextAppearance } from "@/utils/template-studio/text-appearance";
import {
  getStudioDrawableTextStrokes,
  toStudioCssStrokeWidth,
} from "@/utils/template-studio/text-appearance";

export interface StudioSvgTextProps {
  layout: StudioTextLayoutResult;
  appearance: ResolvedStudioTextAppearance;
  typography: React.CSSProperties;
  textAlign: "left" | "center" | "right";
  hidden?: boolean;
}

export interface StudioFixedSvgTextProps {
  text: string;
  appearance: ResolvedStudioTextAppearance;
  typography: React.CSSProperties;
  className?: string;
}

interface CanvasTextMetrics {
  ascent: number;
  descent: number;
}

const EMPTY_TEXT_PLACEHOLDER = "\u00a0";

const normalizeSvgId = (value: string): string =>
  `studio-text-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

const getTextAnchor = (
  textAlign: StudioSvgTextProps["textAlign"],
): "start" | "middle" | "end" => {
  if (textAlign === "center") return "middle";
  if (textAlign === "right") return "end";
  return "start";
};

const getStudioSvgTextAlign = (
  textAlign: React.CSSProperties["textAlign"],
): StudioSvgTextProps["textAlign"] => {
  if (textAlign === "center") return "center";
  if (textAlign === "right" || textAlign === "end") return "right";
  return "left";
};

const getFontString = (
  fontSize: number,
  typography: React.CSSProperties,
): string => {
  const fontStyle =
    typeof typography.fontStyle === "string" ? typography.fontStyle : "normal";
  const fontVariant =
    typeof typography.fontVariant === "string"
      ? typography.fontVariant
      : "normal";
  const fontWeight =
    typeof typography.fontWeight === "number" ||
    typeof typography.fontWeight === "string"
      ? typography.fontWeight
      : "normal";
  const fontFamily =
    typeof typography.fontFamily === "string"
      ? typography.fontFamily
      : "sans-serif";

  return `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}px ${fontFamily}`;
};

const getCanvasTextMetrics = (
  text: string,
  fontSize: number,
  typography: React.CSSProperties,
): CanvasTextMetrics => {
  if (typeof document === "undefined") {
    return { ascent: fontSize * 0.8, descent: fontSize * 0.2 };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return { ascent: fontSize * 0.8, descent: fontSize * 0.2 };
  }

  context.font = getFontString(fontSize, typography);
  const metrics = context.measureText(text || EMPTY_TEXT_PLACEHOLDER);
  const ascent =
    Number.isFinite(metrics.actualBoundingBoxAscent) &&
    metrics.actualBoundingBoxAscent > 0
      ? metrics.actualBoundingBoxAscent
      : fontSize * 0.8;
  const descent =
    Number.isFinite(metrics.actualBoundingBoxDescent) &&
    metrics.actualBoundingBoxDescent >= 0
      ? metrics.actualBoundingBoxDescent
      : fontSize * 0.2;

  return { ascent, descent };
};

const getTypographyStyle = (
  layout: StudioTextLayoutResult,
  typography: React.CSSProperties,
): React.CSSProperties => ({
  fontFamily: typography.fontFamily,
  fontSize: `${Math.max(layout.renderedFontSize, 1)}px`,
  fontStyle: typography.fontStyle,
  fontVariant: typography.fontVariant,
  fontWeight: typography.fontWeight,
  letterSpacing: typography.letterSpacing,
});

const getGradientCoordinates = (angleDeg: number) => ({
  x1: "0%",
  y1: "0%",
  x2: "100%",
  y2: "0%",
  gradientTransform: `rotate(${angleDeg} 0.5 0.5)`,
});

export function StudioSvgText({
  layout,
  appearance,
  typography,
  textAlign,
  hidden = false,
}: StudioSvgTextProps) {
  const rawId = useId();
  const idPrefix = normalizeSvgId(rawId);
  const gradientId = `${idPrefix}-fill`;
  const shadowId = `${idPrefix}-shadow`;
  const strokes = getStudioDrawableTextStrokes(appearance.strokes);
  const shadow = appearance.shadow;
  const viewportWidth = Math.max(layout.width || layout.availableWidth, 1);
  const viewportHeight = Math.max(
    layout.height || layout.lineHeightPx,
    layout.lineHeightPx,
    1,
  );
  const fontSize = Math.max(layout.renderedFontSize, 1);
  const lineHeightPx = Math.max(layout.lineHeightPx, fontSize);
  const lines =
    layout.lines.length > 0 ? layout.lines : [EMPTY_TEXT_PLACEHOLDER];
  const metrics = getCanvasTextMetrics(
    layout.displayText,
    fontSize,
    typography,
  );
  const contentHeight = metrics.ascent + metrics.descent;
  const firstBaseline = (lineHeightPx - contentHeight) / 2 + metrics.ascent;
  const textAnchor = getTextAnchor(textAlign);
  const x =
    textAlign === "center"
      ? viewportWidth / 2
      : textAlign === "right"
        ? viewportWidth
        : 0;
  const maxStrokeOutset = strokes.reduce(
    (maxOutset, stroke) => Math.max(maxOutset, stroke.outset),
    0,
  );
  const shadowBleed = shadow
    ? Math.max(
        Math.abs(shadow.offsetX) + shadow.blur,
        Math.abs(shadow.offsetY) + shadow.blur,
      )
    : 0;
  const filterOutset = maxStrokeOutset + shadowBleed + 2;
  const fill =
    appearance.fill.type === "linearGradient"
      ? `url(#${gradientId})`
      : (appearance.fill.color ?? "transparent");
  const textStyle = getTypographyStyle(layout, typography);

  const renderLines = () =>
    lines.map((line, index) => (
      <tspan key={index} x={x} y={firstBaseline + index * lineHeightPx}>
        {line || EMPTY_TEXT_PLACEHOLDER}
      </tspan>
    ));

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 overflow-visible"
      data-studio-text-renderer="svg"
      height="100%"
      pointerEvents="none"
      preserveAspectRatio="none"
      width="100%"
      style={{
        pointerEvents: "none",
        overflow: "visible",
        ...(hidden ? { visibility: "hidden" } : {}),
      }}
    >
      {(appearance.fill.type === "linearGradient" || shadow) && (
        <defs>
          {appearance.fill.type === "linearGradient" && (
            <linearGradient
              id={gradientId}
              {...getGradientCoordinates(appearance.fill.angleDeg)}
            >
              <stop offset="0%" stopColor={appearance.fill.startColor} />
              <stop offset="100%" stopColor={appearance.fill.endColor} />
            </linearGradient>
          )}
          {shadow && (
            <filter
              id={shadowId}
              filterUnits="userSpaceOnUse"
              height={viewportHeight + filterOutset * 2}
              width={viewportWidth + filterOutset * 2}
              x={-filterOutset}
              y={-filterOutset}
            >
              <feDropShadow
                dx={shadow.offsetX}
                dy={shadow.offsetY}
                floodColor={shadow.color}
                floodOpacity={shadow.opacity}
                stdDeviation={shadow.blur / 2}
              />
            </filter>
          )}
        </defs>
      )}

      <g {...(shadow ? { filter: `url(#${shadowId})` } : {})}>
        {strokes.map((stroke) => (
          <text
            key={stroke.id}
            data-effect-layer={`stroke:${stroke.id}`}
            fill={stroke.color}
            opacity={stroke.opacity}
            paintOrder="stroke fill"
            stroke={stroke.color}
            strokeLinejoin="round"
            strokeMiterlimit={1}
            strokeWidth={toStudioCssStrokeWidth(stroke.outset)}
            style={textStyle}
            textAnchor={textAnchor}
          >
            {renderLines()}
          </text>
        ))}

        <text
          data-effect-layer="foreground"
          fill={fill}
          opacity={appearance.fill.opacity}
          style={textStyle}
          textAnchor={textAnchor}
        >
          {renderLines()}
        </text>
      </g>
    </svg>
  );
}

/**
 * Fixed-size structured text uses the same SVG effect renderer as Auto Text.
 *
 * The transparent span remains the layout/accessibility source of truth. SVG is only a
 * visual layer, so its viewport follows the measured span instead of introducing a second
 * font or wrapping algorithm.
 */
export function StudioFixedSvgText({
  text,
  appearance,
  typography,
  className,
}: StudioFixedSvgTextProps) {
  const { rootRef, measurementRef, layout } = useStudioFixedTextLayout({
    text,
    typography,
  });
  const textAlign = getStudioSvgTextAlign(typography.textAlign);

  return (
    <span
      ref={rootRef}
      className={className}
      data-studio-text-node="true"
      {...(appearance.shadow
        ? { "data-studio-text-shadow-source": "composite" }
        : {})}
      style={{
        ...typography,
        display: "inline-block",
        position: "relative",
        color: "transparent",
      }}
    >
      <span
        ref={measurementRef}
        data-studio-text-measurement="true"
        style={{
          display: "inline-block",
          whiteSpace: "pre",
        }}
      >
        {text}
      </span>
      <StudioSvgText
        appearance={appearance}
        layout={layout}
        textAlign={textAlign}
        typography={typography}
        hidden={!layout.ready}
      />
    </span>
  );
}
