"use client";

import React, { useEffect, useRef, useState } from "react";

import { getStudioTextFitBounds } from "@/utils/template-studio/text-layout";

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
  /** 시각 효과를 담을 레이어. 측정 요소와 형제 관계로 렌더링한다. */
  effectLayers?: React.ReactNode;
}

const rmPx = (pixel: string) => Number(pixel.slice(0, -2));

const getAvailableLength = (parent: HTMLElement) => ({
  availableWidth:
    parent.clientWidth -
    rmPx(parent.style.paddingLeft) -
    rmPx(parent.style.paddingRight),
  availableHeight:
    parent.clientHeight -
    rmPx(parent.style.paddingTop) -
    rmPx(parent.style.paddingBottom),
});

/**
 * Studio flexibleText 전용 자동 맞춤.
 *
 * 효과가 없는 문서는 기존 AutoResizeText와 같은 `<p>` 직접 측정을 사용한다. 효과가 있는
 * 문서만 `<p><span>논리 텍스트</span>{effectLayers}</p>` 구조를 사용해 absolute 레이어가
 * scrollWidth/scrollHeight에 섞이지 않게 한다. 최종 font-size는 언제나 root `<p>` 하나가
 * 소유하고 효과 레이어는 그 값을 상속한다.
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
  effectLayers,
  ...props
}: StudioAutoFitTextProps) {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const measurementRef = useRef<HTMLElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const hasEffectLayers = effectLayers !== undefined && effectLayers !== null;
  const normalizedMaxLines =
    typeof maxLines === "number" && Number.isFinite(maxLines) && maxLines > 0
      ? Math.floor(maxLines)
      : undefined;
  const hasLineLimit = normalizedMaxLines !== undefined;
  const displayText = hasLineLimit
    ? children.replace(/[\r\n]+/g, " ")
    : children;

  useEffect(() => {
    const root = rootRef.current;
    const measurement = hasEffectLayers
      ? measurementRef.current
      : rootRef.current;
    if (!root || !measurement) return;

    const parent = root.parentElement;
    if (!parent) return;

    const calculateFontSize = () => {
      const originalRootWidth = root.style.width;
      if (!hasEffectLayers) root.style.width = "max-content";

      try {
        const parentLength = getAvailableLength(parent);

        if (
          parentLength.availableWidth <= 0 ||
          parentLength.availableHeight <= 0
        ) {
          setFontSize(minFontSize);
          return;
        }

        const { width: availableWidth, height: availableHeight } =
          getStudioTextFitBounds({
            width: parentLength.availableWidth,
            height: parentLength.availableHeight,
            margin: fitMargin,
          });

        if (hasLineLimit) {
          measurement.style.width = `${availableWidth}px`;
          measurement.style.whiteSpace = "normal";
          measurement.style.wordBreak = "break-word";
          measurement.style.overflowWrap = "break-word";

          const fitsAtFontSize = (candidateFontSize: number) => {
            root.style.fontSize = `${candidateFontSize}px`;

            const computedStyle = window.getComputedStyle(measurement);
            const computedLineHeight = Number.parseFloat(
              computedStyle.lineHeight,
            );
            const lineHeight =
              Number.isFinite(computedLineHeight) && computedLineHeight > 0
                ? computedLineHeight
                : candidateFontSize * 1.2;
            const maxTextHeight = lineHeight * normalizedMaxLines;
            const textWidth = measurement.scrollWidth;
            const textHeight = measurement.scrollHeight;
            const estimatedLineCount = Math.ceil(
              (textHeight - 0.5) / lineHeight,
            );

            return (
              textWidth <= availableWidth &&
              textHeight <= availableHeight &&
              textHeight <= maxTextHeight + 0.5 &&
              estimatedLineCount <= normalizedMaxLines
            );
          };

          let low = Math.ceil(minFontSize * 2);
          let high = Math.floor(maxFontSize * 2);
          let bestFontSize = low;

          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidateFontSize = mid / 2;

            if (fitsAtFontSize(candidateFontSize)) {
              bestFontSize = mid;
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }

          setFontSize(bestFontSize / 2);
          return;
        }

        measurement.style.whiteSpace = multiline ? "pre" : "nowrap";
        measurement.style.wordBreak = multiline ? "break-word" : "normal";
        measurement.style.overflowWrap = multiline ? "break-word" : "normal";

        let currentFontSize = maxFontSize;
        root.style.fontSize = `${currentFontSize}px`;

        while (currentFontSize >= minFontSize) {
          root.style.fontSize = `${currentFontSize}px`;

          const textWidth = measurement.scrollWidth;
          const textHeight = measurement.scrollHeight;
          const exceedsWidth = textWidth > availableWidth;
          const exceedsHeight = textHeight > availableHeight;

          if (!exceedsWidth && !exceedsHeight) break;

          currentFontSize -= 0.5;
        }

        setFontSize(Math.max(currentFontSize, minFontSize));
      } finally {
        root.style.width = originalRootWidth;
      }
    };

    calculateFontSize();

    const resizeObserver = new ResizeObserver(() => {
      calculateFontSize();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    displayText,
    fitMargin,
    hasEffectLayers,
    hasLineLimit,
    maxFontSize,
    minFontSize,
    multiline,
    normalizedMaxLines,
  ]);

  const textStyle: React.CSSProperties = {
    ...style,
    fontSize: `${Math.floor(fontSize)}px`,
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
      {hasEffectLayers ? (
        <span
          ref={measurementRef}
          data-studio-text-measurement="true"
          style={{
            display: "inline-block",
          }}
        >
          {displayText}
        </span>
      ) : (
        displayText
      )}
      {effectLayers}
    </p>
  );
}
