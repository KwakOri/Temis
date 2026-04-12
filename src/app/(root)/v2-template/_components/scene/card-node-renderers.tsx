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
  return (
    <p
      key={nodeId}
      style={{
        color,
        fontFamily,
        ...containerStyle,
        ...(width !== undefined ? { width } : {}),
        ...textStyle,
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
  return (
    <div
      key={nodeId}
      style={{
        ...containerStyle,
        ...(width !== undefined ? { width } : {}),
        ...highlightStyle,
      }}
      className={containerClassName ?? "absolute flex items-center justify-center"}
    >
      {/* AutoResizeText depends on parent box dimensions, so wrapper div is mandatory. */}
      <div
        style={{
          width: "100%",
          height: "100%",
          ...(wrapperStyle ?? {}),
        }}
      >
        <AutoResizeText
          style={{
            fontFamily,
            color,
            ...textStyle,
          }}
          className={textClassName ?? "leading-none text-center"}
          multiline={multiline}
          maxFontSize={maxFontSize}
        >
          {text}
        </AutoResizeText>
      </div>
    </div>
  );
};
