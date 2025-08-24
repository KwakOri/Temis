"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  children: string;
  maxFontSize?: number;
  minFontSize?: number;
  style?: React.CSSProperties;
  className?: string;
  padding?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
  multiline?: boolean;
  maxHeight?: number;
}

const AutoResizeText: React.FC<Props> = ({
  children,
  maxFontSize = 24,
  minFontSize = 12,
  style,
  className,
  padding = 0,
  multiline = false,
  maxHeight,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    // 정확한 텍스트 너비 측정을 위한 헬퍼 함수
    const measureTextWidth = (fontSize: number): number => {
      // 임시 측정 요소 생성
      const tempEl = document.createElement("div");
      tempEl.style.position = "absolute";
      tempEl.style.visibility = "hidden";
      tempEl.style.whiteSpace = "nowrap";
      tempEl.style.fontSize = `${fontSize}px`;
      tempEl.style.fontFamily = el.style.fontFamily || "inherit";
      tempEl.style.fontWeight = el.style.fontWeight || "inherit";
      tempEl.style.letterSpacing = el.style.letterSpacing || "inherit";
      tempEl.textContent = children;

      document.body.appendChild(tempEl);
      const width = tempEl.scrollWidth;
      document.body.removeChild(tempEl);

      return width;
    };

    const calculateFontSize = () => {
      // padding 값을 객체로 변환
      const paddingValues =
        typeof padding === "number"
          ? { top: padding, right: padding, bottom: padding, left: padding }
          : { top: 0, right: 0, bottom: 0, left: 0, ...padding };

      // 사용 가능한 공간 계산 (padding 고려)
      const availableWidth =
        parent.clientWidth - paddingValues.left - paddingValues.right;
      let availableHeight =
        parent.clientHeight - paddingValues.top - paddingValues.bottom;

      // maxHeight가 지정된 경우, 더 작은 값을 사용
      if (maxHeight !== undefined) {
        availableHeight = Math.min(availableHeight, maxHeight);
      }

      // 최소 크기 확인
      if (availableWidth <= 0 || availableHeight <= 0) {
        setFontSize(minFontSize);
        return;
      }

      // multiline 지원을 위한 스타일 설정
      if (multiline) {
        el.style.whiteSpace = "pre-wrap";
        el.style.wordBreak = "break-word";
        el.style.overflowWrap = "break-word";
      } else {
        el.style.whiteSpace = "nowrap";
        el.style.wordBreak = "normal";
        el.style.overflowWrap = "normal";
      }

      // 이진 탐색으로 최적의 폰트 크기 찾기
      let low = minFontSize;
      let high = maxFontSize;
      let optimalFont = minFontSize;

      const testFontSize = (testFont: number): boolean => {
        el.style.fontSize = `${testFont}px`;

        let exceedsWidth = false;
        let exceedsHeight = false;

        if (multiline) {
          // multiline 모드에서는 실제 렌더링된 크기와 정확한 텍스트 너비를 모두 확인
          const singleLineWidth = measureTextWidth(testFont);
          exceedsWidth =
            singleLineWidth > availableWidth && el.scrollWidth > availableWidth;
          exceedsHeight = el.scrollHeight > availableHeight;
        } else {
          // single line 모드에서는 scrollWidth 사용
          exceedsWidth = el.scrollWidth > availableWidth;
          exceedsHeight = el.scrollHeight > availableHeight;
        }

        return !exceedsWidth && !exceedsHeight;
      };

      // 이진 탐색으로 최대 가능한 폰트 크기 찾기
      while (low <= high) {
        const mid = Math.floor(((low + high) / 2) * 2) / 2; // 0.5 단위로 반올림

        if (testFontSize(mid)) {
          optimalFont = mid;
          low = mid + 0.5;
        } else {
          high = mid - 0.5;
        }
      }

      setFontSize(optimalFont);
    };

    // 초기 계산
    calculateFontSize();

    // ResizeObserver로 부모 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      // debounce를 위한 작은 지연
      setTimeout(calculateFontSize, 10);
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [children, maxFontSize, minFontSize, padding, multiline, maxHeight]);

  return (
    <div
      ref={textRef}
      className={className}
      style={{
        fontSize: `${fontSize}px`,
        whiteSpace: multiline ? "pre-wrap" : "nowrap",
        wordBreak: multiline ? "break-word" : "normal",
        overflowWrap: multiline ? "break-word" : "normal",
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        overflow: maxHeight ? "hidden" : "visible",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default AutoResizeText;
