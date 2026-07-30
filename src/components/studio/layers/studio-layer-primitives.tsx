"use client";

import { ChevronRight } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { StudioGraphDropPosition } from "@/utils/template-studio/graph-editor";

/** 트리 깊이에 따른 행 들여쓰기. 일정 깊이 이후로는 더 밀지 않는다. */
export const getStudioLayerIndent = (depth: number): number =>
  Math.min(10 + depth * 20, 70);

/** 드롭 위치의 표시 이름. */
export const getStudioLayerDropPositionLabel = (
  position: StudioGraphDropPosition,
): string => {
  if (position === "before") return "Above";
  if (position === "after") return "Below";
  return "Inside";
};

export interface StudioLayerPanelFrameProps {
  /** 패널 제목. 예: `Cards Layers` */
  title: string;
  /** 제목 아래 요약. 예: `3 placed objects` */
  summary: ReactNode;
  children: ReactNode;
}

/**
 * 레이어 패널의 제목 행과 스크롤 영역.
 *
 * 트리 항목을 무엇으로 채우는지는 도메인이 정한다. 시간표 composition과 일반
 * 그래프가 같은 프레임을 쓴다.
 */
export function StudioLayerPanelFrame({
  title,
  summary,
  children,
}: StudioLayerPanelFrameProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-[var(--border)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--fg2)]">
          {title}
        </div>
        <div className="mt-1 text-[11px] font-medium text-[var(--fg3)]">
          {summary}
        </div>
      </div>
      <div className="template-studio-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
        <div className="grid min-w-0 max-w-full gap-0.5 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface StudioLayerDropIndicatorProps {
  depth: number;
  position: "before" | "after";
  /** 드롭할 수 없는 이유. 있으면 막힌 표현으로 바뀐다. */
  blockedReason?: string | null;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * 행 사이에 끼워 넣을 위치를 보여주는 표시선.
 *
 * 표시 여부는 호출한 쪽이 판단한다. 이 컴포넌트는 활성 상태만 렌더한다.
 */
export function StudioLayerDropIndicator({
  depth,
  position,
  blockedReason = null,
  onDragOver,
  onDrop,
}: StudioLayerDropIndicatorProps) {
  return (
    <div
      className={cn(
        "my-1 flex h-4 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.06em]",
        blockedReason ? "text-rose-300" : "text-[var(--accent)]",
      )}
      style={{ marginLeft: getStudioLayerIndent(depth) }}
      title={blockedReason ?? getStudioLayerDropPositionLabel(position)}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
        )}
      />
      <span
        className={cn(
          "h-0.5 min-w-0 flex-1 rounded-full",
          blockedReason ? "bg-rose-400" : "bg-[var(--accent)]",
        )}
      />
      <span
        className={cn(
          "rounded px-1.5 py-0.5",
          blockedReason
            ? "bg-rose-400/15 text-rose-300"
            : "bg-[var(--sel)] text-[var(--accent)]",
        )}
      >
        {blockedReason ? "Blocked" : getStudioLayerDropPositionLabel(position)}
      </span>
    </div>
  );
}

export interface StudioLayerRowProps {
  depth?: number;
  label: string;
  /** 행 오른쪽 끝의 종류 표시 */
  typeLabel: string;
  /** 이미 크기가 정해진 종류 아이콘 */
  icon: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /** 드래그로 옮길 수 있는 행 */
  draggable?: boolean;
  /** 숨긴 레이어. 흐리게 표시한다. */
  hidden?: boolean;
  /** 잘라내기 대상. 더 흐리게 표시한다. */
  cut?: boolean;
  /** 드롭 대상 테두리 표현 */
  ring?: "none" | "accent" | "blocked";
  /** 드롭할 수 없는 이유. 있으면 title에 쓴다. */
  blockedReason?: string | null;
  /** 잠금이나 숨김 같은 상태 아이콘 */
  stateIcon?: ReactNode;
  /** 라벨과 종류 사이의 배지 */
  badge?: ReactNode;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void;
}

/**
 * 레이어 트리의 한 행.
 *
 * 행 높이, 들여쓰기, 접기 아이콘, 선택과 드롭 표현을 소유한다. 어떤 모델의
 * 레이어인지는 모른다. 시간표 composition object와 일반 그래프 노드가 같은
 * 행을 쓴다.
 */
export function StudioLayerRow({
  depth = 0,
  label,
  typeLabel,
  icon,
  selected = false,
  disabled = false,
  draggable = false,
  hidden = false,
  cut = false,
  ring = "none",
  blockedReason = null,
  stateIcon,
  badge,
  collapsible = false,
  collapsed = false,
  onToggleCollapsed,
  onClick,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: StudioLayerRowProps) {
  return (
    <button
      className={cn(
        "flex h-[34px] w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-[7px] px-2 text-left text-[12.5px] font-medium transition-colors",
        disabled
          ? "cursor-not-allowed opacity-45"
          : draggable
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default",
        !disabled &&
          (selected
            ? "bg-[var(--sel)] font-semibold text-[var(--fg)]"
            : "text-[var(--fg2)] hover:bg-[var(--hover)]"),
        hidden && "opacity-55",
        ring === "accent" && "ring-1 ring-inset ring-[var(--accent)]",
        ring === "blocked" && "ring-1 ring-inset ring-rose-400/80",
        cut && "opacity-[0.45]",
      )}
      disabled={disabled}
      draggable={draggable && !disabled}
      style={{ paddingLeft: getStudioLayerIndent(depth) }}
      title={blockedReason ?? label}
      type="button"
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex h-5 w-4 shrink-0 items-center justify-center rounded text-[var(--fg3)] transition",
          collapsible
            ? "hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            : "opacity-0",
        )}
        title={
          collapsible
            ? collapsed
              ? "Expand group"
              : "Collapse group"
            : undefined
        }
        onClick={(event) => {
          if (!collapsible) return;
          event.preventDefault();
          event.stopPropagation();
          onToggleCollapsed?.();
        }}
        onMouseDown={(event) => {
          if (collapsible) event.stopPropagation();
        }}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            collapsible && !collapsed && "rotate-90",
          )}
        />
      </span>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--fg2)]">
        {icon}
      </span>
      <span className="block min-w-0 flex-1 truncate">{label}</span>
      {stateIcon}
      {badge}
      <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
        {typeLabel}
      </span>
    </button>
  );
}
