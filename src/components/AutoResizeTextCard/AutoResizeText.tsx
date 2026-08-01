"use client";

import React, { useEffect, useRef, useState } from "react";

import { getStudioTextFitBounds } from "@/utils/template-studio/text-layout";

interface Props extends React.HTMLAttributes<HTMLParagraphElement> {
  children: string;
  maxFontSize?: number;
  minFontSize?: number;
  style?: React.CSSProperties;
  className?: string;

  multiline?: boolean;
  maxLines?: number;
  /**
   * 맞춤 판정에서 상자에서 덜어낼 여유(px).
   *
   * 탐색은 상자에 맞는 최대 크기를 찾으므로 결과가 항상 맞춤 경계 직전이다. 그 상태에서는
   * 측정과 래스터화가 조금만 달라도 결과가 어긋난다. 여유를 주면 경계에서 떨어진다.
   *
   * 기본값은 0이다. 이 컴포넌트를 쓰는 화면이 200곳이 넘으므로, 값을 넘기지 않으면 지금과
   * 똑같이 동작해야 한다.
   */
  fitMargin?: number;
  /**
   * 정한 크기를 물려받아 겹쳐 그릴 레이어.
   *
   * 글자 요소 안에 그대로 들어가므로 CSS 상속으로 같은 `font-size`를 쓴다. 텍스트 효과를
   * 레이어로 그릴 때, 레이어마다 이 컴포넌트를 따로 쓰면 각자 크기를 재고 폰트 로드 시점에
   * 따라 결과가 갈린다. 그러면 겹쳐 그린 글자가 어긋난다.
   *
   * 레이어는 `position: absolute`로 이 요소를 덮어야 한다. 흐름에 끼면 상자 크기가 커져서
   * 맞춤 판정이 달라진다.
   */
  overlay?: React.ReactNode;
}

const rmPx = (pixel: string) => Number(pixel.slice(0, -2));

const getAvailableLength = (parent: HTMLElement) => {
  const availableWidth =
    parent.clientWidth -
    rmPx(parent.style.paddingLeft) -
    rmPx(parent.style.paddingRight);

  const availableHeight =
    parent.clientHeight -
    rmPx(parent.style.paddingTop) -
    rmPx(parent.style.paddingBottom);

  return { availableWidth, availableHeight };
};

const AutoResizeText: React.FC<Props> = ({
  children,
  maxFontSize = 24,
  minFontSize = 12,
  style,
  className,
  multiline = false,
  maxLines,
  fitMargin = 0,
  overlay,
  ...props
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);
  const normalizedMaxLines =
    typeof maxLines === "number" && Number.isFinite(maxLines) && maxLines > 0
      ? Math.floor(maxLines)
      : undefined;
  const hasLineLimit = normalizedMaxLines !== undefined;
  const displayText = hasLineLimit
    ? children.replace(/[\r\n]+/g, " ")
    : children;

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const calculateFontSize = () => {
      // padding 값을 객체로 변환

      // 사용 가능한 공간 계산 (padding 고려)
      const parentLength = getAvailableLength(parent);

      // 최소 크기 확인
      if (
        parentLength.availableWidth <= 0 ||
        parentLength.availableHeight <= 0
      ) {
        setFontSize(minFontSize);
        return;
      }

      /**
       * 맞춤 경계에서 떨어뜨린다.
       *
       * 여유를 넘기지 않으면 0이므로 지금까지의 동작과 같다.
       */
      const { width: availableWidth, height: availableHeight } =
        getStudioTextFitBounds({
          width: parentLength.availableWidth,
          height: parentLength.availableHeight,
          margin: fitMargin,
        });

      if (hasLineLimit) {
        el.style.width = `${availableWidth}px`;
        el.style.whiteSpace = "normal";
        el.style.wordBreak = "break-word";
        el.style.overflowWrap = "break-word";

        const fitsAtFontSize = (candidateFontSize: number) => {
          el.style.fontSize = `${candidateFontSize}px`;

          const computedStyle = window.getComputedStyle(el);
          const computedLineHeight = Number.parseFloat(
            computedStyle.lineHeight,
          );
          const lineHeight =
            Number.isFinite(computedLineHeight) && computedLineHeight > 0
              ? computedLineHeight
              : candidateFontSize * 1.2;
          const maxTextHeight = lineHeight * normalizedMaxLines;
          const textWidth = el.scrollWidth;
          const textHeight = el.scrollHeight;
          const estimatedLineCount = Math.ceil((textHeight - 0.5) / lineHeight);

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

      // multiline 지원을 위한 스타일 설정
      if (multiline) {
        el.style.whiteSpace = "pre";
        el.style.wordBreak = "break-word";
        el.style.overflowWrap = "break-word";
      } else {
        el.style.whiteSpace = "nowrap";
        el.style.wordBreak = "normal";
        el.style.overflowWrap = "normal";
      }

      // 새로운 접근: textRef와 부모 크기를 직접 비교하여 fontSize 조정
      let currentFontSize = maxFontSize;
      el.style.fontSize = `${currentFontSize}px`;

      // 작은 단위로 줄여가면서 맞는 크기 찾기
      while (currentFontSize >= minFontSize) {
        el.style.fontSize = `${currentFontSize}px`;

        // textRef의 실제 크기 측정
        const textWidth = el.scrollWidth;
        const textHeight = el.scrollHeight;

        // 부모 크기와 비교하여 오버플로우 확인
        const exceedsWidth = textWidth > availableWidth;
        const exceedsHeight = textHeight > availableHeight;

        // 가로나 세로 중 하나라도 오버플로우하면 폰트 크기를 줄임
        if (!exceedsWidth && !exceedsHeight) {
          break; // 적절한 크기 찾음
        }

        currentFontSize -= 0.5;
      }

      // 최소 폰트 크기보다 작아지지 않도록 보장
      const finalFontSize = Math.max(currentFontSize, minFontSize);
      setFontSize(finalFontSize);
    };

    // 초기 계산
    calculateFontSize();

    // ResizeObserver로 부모 크기 변경 감지
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
    hasLineLimit,
    maxFontSize,
    minFontSize,
    multiline,
    normalizedMaxLines,
  ]);

  return (
    <p
      ref={textRef}
      className={className}
      style={{
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
        ...style,
      }}
      {...props}
    >
      {displayText}
      {/*
       * 레이어는 이 요소 안에 들어가므로 정한 `font-size`를 물려받는다. 그래서 크기를 한 번만
       * 재고 모든 레이어가 같은 값을 쓴다. 레이어가 `position: absolute`로 이 요소를 덮는
       * 것은 넘기는 쪽의 책임이다.
       */}
      {overlay}
    </p>
  );
};

export default AutoResizeText;
