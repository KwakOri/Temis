"use client";

import React from "react";

import type { StudioTextLayoutResult } from "@/components/studio/text/use-studio-text-layout";
import { useStudioTextLayout } from "@/components/studio/text/use-studio-text-layout";

interface StudioAutoFitTextProps extends Omit<
  React.HTMLAttributes<HTMLParagraphElement>,
  "children" | "style"
> {
  children: string;
  maxFontSize: number;
  minFontSize: number;
  multiline?: boolean;
  maxLines?: number;
  fitMargin?: number;
  style?: React.CSSProperties;
  /** 측정 결과를 받아 논리 텍스트 위에 그릴 시각 레이어를 만든다. */
  renderVisual?: (layout: StudioTextLayoutResult) => React.ReactNode;
  /** 레이아웃 측정과 SVG 좌표 계산이 공유할 글꼴 속성. */
  typography?: React.CSSProperties;
}

/**
 * Studio flexibleText 전용 자동 맞춤.
 *
 * 효과가 없는 문서는 기존 AutoResizeText와 같은 `<p>` 직접 측정을 사용한다. 효과가 있는
 * 문서만 `<p><span>논리 텍스트</span>{renderVisual(layout)}</p>` 구조를 사용해 absolute
 * 레이어가 scrollWidth/scrollHeight에 섞이지 않게 한다. 최종 font-size는 언제나 root `<p>`
 * 하나가 소유하고 시각 레이어는 그 값을 명시적으로 공유한다.
 */
export function StudioAutoFitText({
  children,
  maxFontSize,
  minFontSize,
  multiline = false,
  maxLines,
  fitMargin = 0,
  style,
  className,
  renderVisual,
  typography = {},
  ...props
}: StudioAutoFitTextProps) {
  const hasVisualRenderer = renderVisual !== undefined;
  const { rootRef, measurementRef, layout } = useStudioTextLayout({
    text: children,
    maxFontSize,
    minFontSize,
    multiline,
    maxLines,
    fitMargin,
    typography,
    measureWithSpan: hasVisualRenderer,
  });
  const hasLineLimit =
    typeof maxLines === "number" && Number.isFinite(maxLines) && maxLines > 0;

  const textStyle: React.CSSProperties = {
    ...style,
    fontSize: `${layout.renderedFontSize}px`,
    whiteSpace: hasLineLimit ? "normal" : multiline ? "pre" : "nowrap",
    wordBreak: hasLineLimit
      ? "break-word"
      : multiline
        ? "break-word"
        : "normal",
    overflowWrap: hasLineLimit
      ? "break-word"
      : multiline
        ? "break-word"
        : "normal",
    overflow: "visible",
    ...(hasLineLimit
      ? {
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box" as const,
        }
      : {}),
  };

  return (
    <p ref={rootRef} className={className} style={textStyle} {...props}>
      {hasVisualRenderer ? (
        <span
          ref={measurementRef}
          data-studio-text-measurement="true"
          style={{
            display: "inline-block",
          }}
        >
          {layout.displayText}
        </span>
      ) : (
        layout.displayText
      )}
      {renderVisual?.(layout)}
    </p>
  );
}
