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
}) => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const calculateFontSize = () => {
      // padding 값을 객체로 변환
      const paddingValues =
        typeof padding === "number"
          ? { top: padding, right: padding, bottom: padding, left: padding }
          : { top: 0, right: 0, bottom: 0, left: 0, ...padding };

      // 사용 가능한 공간 계산 (padding 고려)
      const availableWidth =
        parent.clientWidth - paddingValues.left - paddingValues.right;

      const availableHeight =
        parent.clientHeight - paddingValues.top - paddingValues.bottom;

      // 최소 크기 확인
      if (availableWidth <= 0 || availableHeight <= 0) {
        setFontSize(minFontSize);
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
  }, [children, maxFontSize, minFontSize, padding, multiline]);

  return (
    <p
      ref={textRef}
      className={className}
      style={{
        fontSize: `${Math.floor(fontSize)}px`,
        whiteSpace: multiline ? "pre" : "nowrap",
        wordBreak: multiline ? "break-word" : "normal",
        overflowWrap: multiline ? "break-word" : "normal",
        overflow: "visible",
        ...style,
      }}
    >
      {children}
    </p>
  );
};

export default AutoResizeText;
