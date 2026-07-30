"use client";

import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import type { StudioStyleRecord } from "@/types/template-studio";
import {
  getStudioTextWrapMode,
  isStudioTextWrapModeMultiline,
} from "@/utils/template-studio/text-wrap";

interface StudioAutoTextProps {
  /**
   * 해석이 끝난 스타일 레코드. Cards graph 노드는 `document.styles[styleId]`,
   * Timetable composition 오브젝트는 `object.style`을 넘긴다.
   */
  styleRecord: StudioStyleRecord | undefined;
  text: string;
  /** `fontSize`가 스타일에 없을 때 쓸 최대 폰트 크기. */
  defaultMaxFontSize: number;
  minFontSize: number;
  className?: string;
  /** `AutoResizeText`에 직접 넘기는 텍스트 스타일. 호출부 시각 동작을 유지한다. */
  textStyle?: React.CSSProperties;
}

/**
 * Auto Text(`flexibleText`)의 공용 렌더 프리미티브.
 *
 * Cards graph(`StudioRenderer`)와 Timetable composition
 * (`StudioTimetablePreview`)은 서로 다른 문서 모델을 쓰지만, 박스 안 자동
 * 리사이즈 텍스트를 그리는 규칙은 동일하다. 최대 폰트 크기 해석과 줄바꿈 모드
 * 해석을 여기 한 곳에 모아 두 경로가 갈라지지 않게 한다.
 */
export function StudioAutoText({
  styleRecord,
  text,
  defaultMaxFontSize,
  minFontSize,
  className,
  textStyle,
}: StudioAutoTextProps) {
  const fontSize = styleRecord?.fontSize;
  const maxFontSize =
    typeof fontSize === "number" ? fontSize : defaultMaxFontSize;
  const wrapMode = getStudioTextWrapMode(styleRecord);

  return (
    <AutoResizeText
      className={className}
      maxFontSize={maxFontSize}
      minFontSize={minFontSize}
      multiline={isStudioTextWrapModeMultiline(wrapMode)}
      style={textStyle}
    >
      {text}
    </AutoResizeText>
  );
}
