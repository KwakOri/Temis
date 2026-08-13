"use client";

import { Image as ImageIcon } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { cn } from "@/lib/utils";

export interface StudioGuideControlProps {
  /** 가이드 에셋이 등록돼 있는지 */
  hasAsset: boolean;
  visible: boolean;
  /** 0~1 */
  opacity: number;
  onToggleVisible: () => void;
  onOpacityChange: (opacity: number) => void;
  /** 에셋이 없을 때 눌렀을 경우. 보통 설정을 연다. */
  onRequestAsset: () => void;
}

/**
 * 가이드 이미지 표시와 투명도 컨트롤.
 *
 * 어떤 에셋을 쓰는지와 상태를 어디에 저장하는지는 도메인이 소유하고, 이
 * 컴포넌트는 표현만 담당한다.
 */
export function StudioGuideControl({
  hasAsset,
  visible,
  opacity,
  onToggleVisible,
  onOpacityChange,
  onRequestAsset,
}: StudioGuideControlProps) {
  const isActive = hasAsset && visible;

  return (
    <div className="flex min-w-0 max-w-[240px] flex-1 items-center gap-2">
      <button
        aria-pressed={isActive}
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold transition",
          isActive
            ? "border-[var(--accent)] bg-[var(--sel)] text-[var(--accent)]"
            : "border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] hover:border-[var(--accent)] hover:text-[var(--fg)]",
        )}
        title={
          hasAsset
            ? visible
              ? "가이드 숨기기"
              : "가이드 표시"
            : "설정에서 가이드 이미지 추가"
        }
        type="button"
        onClick={() => {
          if (!hasAsset) {
            onRequestAsset();
            return;
          }
          onToggleVisible();
        }}
      >
        <ImageIcon size={12} />
        가이드
      </button>
      <input
        aria-label="가이드 오퍼시티"
        className="h-1 min-w-0 flex-1 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-35"
        disabled={!hasAsset}
        max={100}
        min={0}
        type="range"
        value={Math.round(opacity * 100)}
        onChange={(event) =>
          onOpacityChange(Number(event.currentTarget.value) / 100)
        }
      />
      <span className="w-7 shrink-0 text-right text-[9px] font-bold tabular-nums text-[var(--fg3)]">
        {Math.round(opacity * 100)}%
      </span>
    </div>
  );
}
