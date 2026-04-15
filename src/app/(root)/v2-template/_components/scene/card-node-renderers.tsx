import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";

interface V2CardRendererBaseProps {
  nodeId: string;
  text: string;
  containerStyle: React.CSSProperties;
  width?: string | number;
  textStyle: React.CSSProperties;
  highlightStyle: React.CSSProperties;
  containerClassName?: string;
  textClassName?: string;
  fontFamily: string;
  color: string;
}

type V2PlainTextNodeRendererProps = V2CardRendererBaseProps;

interface V2FlexibleTextNodeRendererProps extends V2CardRendererBaseProps {
  multiline: boolean;
  maxFontSize: number;
  wrapperStyle?: React.CSSProperties;
}

const v2_parsePositiveFontSizePx = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  const pxMatch = trimmed.match(/^(\d+(\.\d+)?)px$/i);
  if (!pxMatch) return undefined;
  const parsed = Number(pxMatch[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const V2PlainTextNodeRenderer: React.FC<V2PlainTextNodeRendererProps> = ({
  nodeId,
  text,
  containerStyle,
  width,
  textStyle,
  highlightStyle,
  containerClassName,
  fontFamily,
  color,
}) => {
  const nextTextStyle = { ...textStyle } as React.CSSProperties &
    Record<string, unknown>;
  // PlainText는 containerStyle에서 위치/회전을 관리하므로 textStyle transform은 무시한다.
  delete nextTextStyle.transform;

  return (
    <p
      key={nodeId}
      style={{
        color,
        fontFamily,
        ...containerStyle,
        ...(width !== undefined ? { width } : {}),
        ...nextTextStyle,
        ...highlightStyle,
      }}
      className={containerClassName ?? "absolute flex items-center justify-center"}
    >
      {text}
    </p>
  );
};

export const V2FlexibleTextNodeRenderer: React.FC<
  V2FlexibleTextNodeRendererProps
> = ({
  nodeId,
  text,
  containerStyle,
  width,
  textStyle,
  highlightStyle,
  containerClassName,
  textClassName,
  fontFamily,
  color,
  multiline,
  maxFontSize,
  wrapperStyle,
}) => {
  const nextTextStyle = { ...textStyle } as React.CSSProperties &
    Record<string, unknown>;
  const fontSizeFromTextStyle = v2_parsePositiveFontSizePx(nextTextStyle.fontSize);
  // FlexibleText uses AutoResizeText as a sizing engine.
  // If textStyle carries fontSize, treat it as maxFontSize to keep editor/style parity.
  if (fontSizeFromTextStyle !== undefined) {
    delete nextTextStyle.fontSize;
  }
  const resolvedMaxFontSize = fontSizeFromTextStyle ?? maxFontSize;
  const wrapperStyleMap = (wrapperStyle ?? {}) as React.CSSProperties &
    Record<string, unknown>;
  const containerStyleMap = containerStyle as React.CSSProperties &
    Record<string, unknown>;
  const hasWrapperJustify = wrapperStyleMap.justifyContent !== undefined;
  const hasWrapperAlign = wrapperStyleMap.alignItems !== undefined;
  const resolvedJustifyContent =
    hasWrapperJustify || containerStyleMap.justifyContent === undefined
      ? wrapperStyleMap.justifyContent
      : containerStyleMap.justifyContent;
  const resolvedAlignItems =
    hasWrapperAlign || containerStyleMap.alignItems === undefined
      ? wrapperStyleMap.alignItems
      : containerStyleMap.alignItems;
  const shouldEnableWrapperFlex =
    wrapperStyleMap.display === "flex" ||
    resolvedJustifyContent !== undefined ||
    resolvedAlignItems !== undefined;

  const nextWrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    ...(wrapperStyle ?? {}),
    ...(shouldEnableWrapperFlex && wrapperStyleMap.display === undefined
      ? { display: "flex" }
      : {}),
    ...(resolvedJustifyContent !== undefined
      ? { justifyContent: resolvedJustifyContent }
      : {}),
    ...(resolvedAlignItems !== undefined ? { alignItems: resolvedAlignItems } : {}),
  };
  const wrapperHasTransform =
    typeof nextWrapperStyle.transform === "string" &&
    nextWrapperStyle.transform.trim().length > 0;
  const containerHighlightStyle = wrapperHasTransform ? {} : highlightStyle;
  const wrapperHighlightStyle = wrapperHasTransform ? highlightStyle : {};

  return (
    <div
      key={nodeId}
      style={{
        ...containerStyle,
        ...(width !== undefined ? { width } : {}),
        ...containerHighlightStyle,
      }}
      className={containerClassName ?? "absolute flex items-center justify-center"}
    >
      {/* AutoResizeText depends on parent box dimensions, so wrapper div is mandatory. */}
      <div style={{ ...nextWrapperStyle, ...wrapperHighlightStyle }}>
        <AutoResizeText
          style={{
            fontFamily,
            color,
            ...nextTextStyle,
          }}
          className={textClassName ?? "leading-none text-center"}
          multiline={multiline}
          maxFontSize={resolvedMaxFontSize}
        >
          {text}
        </AutoResizeText>
      </div>
    </div>
  );
};
