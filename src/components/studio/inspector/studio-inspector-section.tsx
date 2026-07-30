"use client";

import { ChevronRight } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface StudioInspectorSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** 제목 오른쪽의 짧은 상태 배지. 예: `Dynamic` */
  badge?: string;
  /** 제목 행 오른쪽 끝의 도메인 전용 버튼. 접기 토글과 별개로 동작한다. */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * 속성 패널의 접이식 섹션 프레임.
 *
 * 제목 행, 접기 표현, 내용 여백만 소유한다. 열림 상태는 소유하지 않고 호출한
 * 쪽이 넘긴다. 여러 섹션의 열림 상태를 한곳에서 관리하기 위한 선택이다.
 */
export function StudioInspectorSection({
  title,
  open,
  onToggle,
  badge,
  action,
  children,
}: StudioInspectorSectionProps) {
  return (
    <section className="border-b border-[var(--border)]">
      <div className="flex items-center transition hover:bg-[var(--hover)]">
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5 px-4 py-3 text-left"
          type="button"
          onClick={onToggle}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 text-[var(--fg2)] transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
            {title}
          </span>
          {badge ? (
            <span className="ml-auto rounded bg-[var(--sel)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.05em] text-[var(--accent)]">
              {badge}
            </span>
          ) : null}
        </button>
        {action ? <div className="pr-4">{action}</div> : null}
      </div>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  );
}
