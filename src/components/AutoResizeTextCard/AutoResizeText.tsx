"use client";

import React, { useEffect, useRef, useState } from "react";

interface Props {
  children: string;
  maxFontSize?: number;
  minFontSize?: number;
  style?: React.CSSProperties;
  className?: string;
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };
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

    // padding 값을 객체로 변환
    const paddingValues = typeof padding === 'number' 
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : { top: 0, right: 0, bottom: 0, left: 0, ...padding };

    // 사용 가능한 공간 계산 (padding 고려)
    const availableWidth = parent.clientWidth - paddingValues.left - paddingValues.right;
    let availableHeight = parent.clientHeight - paddingValues.top - paddingValues.bottom;
    
    // maxHeight가 지정된 경우, 더 작은 값을 사용
    if (maxHeight !== undefined) {
      availableHeight = Math.min(availableHeight, maxHeight);
    }

    let currentFont = maxFontSize;
    el.style.fontSize = `${currentFont}px`;
    
    // multiline 지원을 위한 스타일 설정
    if (multiline) {
      el.style.whiteSpace = 'pre-wrap';
      el.style.wordBreak = 'break-word';
      el.style.overflowWrap = 'break-word';
    } else {
      el.style.whiteSpace = 'nowrap';
      el.style.wordBreak = 'normal';
      el.style.overflowWrap = 'normal';
    }

    // 폰트 크기를 줄여가며 컨테이너에 맞춤
    while (
      (el.scrollWidth > availableWidth || el.scrollHeight > availableHeight) &&
      currentFont > minFontSize
    ) {
      currentFont -= 0.5;
      el.style.fontSize = `${currentFont}px`;
    }

    setFontSize(currentFont);
  }, [children, maxFontSize, minFontSize, padding, multiline, maxHeight]);

  return (
    <div
      ref={textRef}
      className={className}
      style={{ 
        fontSize: `${fontSize}px`,
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        wordBreak: multiline ? 'break-word' : 'normal',
        overflowWrap: multiline ? 'break-word' : 'normal',
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        overflow: maxHeight ? 'hidden' : 'visible',
        ...style 
      }}
    >
      {children}
    </div>
  );
};

export default AutoResizeText;
