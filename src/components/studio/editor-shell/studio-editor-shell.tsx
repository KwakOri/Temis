"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type CSSProperties, type ReactNode } from "react";

export interface StudioEditorShellProps {
  /** 테마 CSS 변수 */
  themeStyle?: CSSProperties;
  topToolbar: ReactNode;
  leftSidebar: ReactNode;
  canvas: ReactNode;
  propertiesPanel: ReactNode;
  /**
   * 모달과 다이얼로그.
   *
   * 모두 `position: fixed`와 명시적 z-index를 쓰므로 본문 뒤에 한 번에
   * 렌더해도 쌓이는 순서가 달라지지 않는다.
   */
  overlays?: ReactNode;
}

/**
 * Studio 편집기 공통 셸.
 *
 * 전체 화면 배치만 소유한다. 문서 저장, 선택 계산, 레이어 데이터 변환, 속성
 * 변경, PNG 생성은 하지 않는다. 각 영역의 내용은 도메인 컨테이너가 넣는다.
 */
export function StudioEditorShell({
  themeStyle,
  topToolbar,
  leftSidebar,
  canvas,
  propertiesPanel,
  overlays,
}: StudioEditorShellProps) {
  return (
    <main
      className="flex h-screen w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
      style={themeStyle}
    >
      {topToolbar}
      <div className="flex min-h-0 flex-1">
        {leftSidebar}
        {canvas}
        {propertiesPanel}
      </div>
      {overlays}
    </main>
  );
}
