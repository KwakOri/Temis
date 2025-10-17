"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  children: string;
  maxFontSize?: number;
  minFontSize?: number;
  style?: React.CSSProperties;
  className?: string;
  verticalGap?: number; // 글자 간격 (px)
  spaceSize?: number; // 스페이스 크기 비율 (기본 0.25)
}

const VerticalResizeText: React.FC<Props> = ({
  children,
  maxFontSize = 24,
  minFontSize = 12,
  style,
  className,
  verticalGap = 0,
  spaceSize = 0.25,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const calculateFontSize = () => {
      // 사용 가능한 공간 계산 (padding 고려)
      const { availableHeight, availableWidth } = getAvailableLength(parent);

      // 최소 크기 확인
      if (availableWidth <= 0 || availableHeight <= 0) {
        setFontSize(minFontSize);
        return;
      }

      // 글자 수와 스페이스 수 계산
      const chars = children.split("");
      const spaceCount = chars.filter((char) => char === " ").length;
      const normalCharCount = chars.length - spaceCount;

      // 작은 단위로 줄여가면서 맞는 크기 찾기
      let currentFontSize = maxFontSize;

      while (currentFontSize >= minFontSize) {
        // 총 높이 계산: (일반 글자 높이 * 개수) + (스페이스 높이 * 개수) + (gap * (글자 수 - 1))
        const normalCharHeight = currentFontSize * normalCharCount;
        const spaceHeight = currentFontSize * spaceSize * spaceCount;
        const gapHeight = verticalGap * (chars.length - 1);
        const totalHeight = normalCharHeight + spaceHeight + gapHeight;

        // 가장 큰 글자의 너비 (대략적으로 fontSize와 동일하다고 가정)
        const estimatedWidth = currentFontSize;

        // 부모 크기와 비교하여 오버플로우 확인
        const exceedsWidth = estimatedWidth > availableWidth;
        const exceedsHeight = totalHeight > availableHeight;

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
  }, [children, maxFontSize, minFontSize, verticalGap, spaceSize]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${verticalGap}px`,
        overflow: "visible",
        ...style,
      }}
    >
      {children.split("").map((char, index) => {
        if (char === " ") {
          return (
            <span
              key={index}
              style={{
                fontSize: `${Math.floor(fontSize * spaceSize)}px`,
                lineHeight: 1,
                color: "transparent",
              }}
            >
              0
            </span>
          );
        }
        return (
          <span
            key={index}
            style={{
              fontSize: `${Math.floor(fontSize)}px`,
              lineHeight: 1,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

export default VerticalResizeText;
