"use client";

// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StudioPanelTab {
  id: string;
  label: string;
  /** 이미 크기가 정해진 아이콘 노드. 셸이 아이콘을 고르지 않는다. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface StudioLeftSidebarProps {
  /**
   * 탭 위에 오는 도메인 전용 영역.
   *
   * Template Studio는 Component Set과 상태 선택을 넣고, Thumbnail Studio는
   * 전달하지 않는다.
   */
  contextHeader?: ReactNode;
  tabs: StudioPanelTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  content: ReactNode;
}

/**
 * Studio 편집기 공통 좌측 사이드바 프레임.
 *
 * 패널 너비, 탭 행, 활성 탭 표현과 스크롤 경계를 소유한다. 어떤 탭이 있고
 * 각 탭이 무엇을 보여주는지는 도메인이 정한다.
 */
export function StudioLeftSidebar({
  contextHeader,
  tabs,
  activeTabId,
  onTabChange,
  content,
}: StudioLeftSidebarProps) {
  return (
    <aside className="flex w-[260px] min-w-0 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--panel)]">
      {contextHeader}

      <div className="flex gap-0.5 px-2 pt-2">
        {tabs.map((tab) => (
          <button
            className={cn(
              "flex h-[34px] flex-1 items-center justify-center gap-1 rounded-t-lg text-[12px] font-semibold transition",
              activeTabId === tab.id
                ? "bg-[var(--field)] text-[var(--fg)]"
                : "text-[var(--fg2)] hover:bg-[var(--hover)]",
              tab.disabled &&
                "cursor-not-allowed opacity-45 hover:bg-transparent",
            )}
            disabled={tab.disabled}
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="border-b border-[var(--border)]" />

      {content}
    </aside>
  );
}
