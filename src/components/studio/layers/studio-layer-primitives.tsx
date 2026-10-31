"use client";

import { ChevronRight } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { StudioGraphDropPosition } from "@/utils/template-studio/graph-editor";
import { findStudioLayerRowIndexAtPointer } from "@/utils/template-studio/layer-drag";

/** 드롭 대상 행에 붙이는 속성. `StudioLayerRow`의 `dropTargetId`가 이 이름으로 나간다. */
const STUDIO_LAYER_DROP_TARGET_ATTRIBUTE = "data-layer-drop-id";

/**
 * 목록 안에서 포인터에 가장 가까운 드롭 대상 행을 찾는다.
 *
 * 드롭은 행마다 받지 않고 목록 전체가 받는다. 행 사이 틈이나 옮길 수 없는 행
 * 위에서도 가장 가까운 대상 행으로 판단해야 놓을 수 없는 빈 자리가 생기지 않는다.
 */
export const findStudioLayerDropTarget = (
  container: HTMLElement,
  pointerY: number,
): { id: string; bounds: DOMRect } | null => {
  const rows = Array.from(
    container.querySelectorAll<HTMLElement>(
      `[${STUDIO_LAYER_DROP_TARGET_ATTRIBUTE}]`,
    ),
  );
  const bounds = rows.map((row) => row.getBoundingClientRect());
  const index = findStudioLayerRowIndexAtPointer(bounds, pointerY);
  const id = rows[index]?.getAttribute(STUDIO_LAYER_DROP_TARGET_ATTRIBUTE);
  return id ? { id, bounds: bounds[index] } : null;
};

/**
 * 끌고 있는 포인터가 목록 밖으로 나갔는지 본다.
 *
 * dragleave는 목록 안의 행을 옮겨 다닐 때도 들어온다. 다음 요소가 목록 안이면
 * 아직 목록 위에 있는 것이다. 다음 요소를 알려 주지 않는 브라우저도 있어서
 * 포인터 좌표로 한 번 더 본다.
 */
const isStudioLayerDragLeavingList = (
  event: React.DragEvent<HTMLElement>,
): boolean => {
  const nextTarget = event.relatedTarget;
  if (nextTarget instanceof Node) {
    return !event.currentTarget.contains(nextTarget);
  }
  const bounds = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  );
};

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
  /**
   * 목록 전체에서 받는 드래그 이벤트.
   *
   * 크롬은 새 요소에 들어가는 순간에는 dragenter만 보내고, 놓을 수 있는지도 그
   * 결과로 정한다. dragover만 받으면 행에 막 들어간 직후 놓은 것이 버려지므로
   * 둘 다 같은 핸들러로 받는다.
   */
  onDragEnter?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  /** 목록 밖으로 나갔을 때만 부른다. 목록 안의 행을 옮겨 다닐 때는 부르지 않는다. */
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
}

/**
 * 레이어 패널의 제목 행과 스크롤 영역.
 *
 * 트리 항목을 무엇으로 채우는지는 도메인이 정한다. 시간표 composition과 일반
 * 그래프가 같은 프레임을 쓴다. 드롭은 행이 아니라 스크롤 영역 전체가 받는다.
 */
export function StudioLayerPanelFrame({
  title,
  summary,
  children,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
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
      <div
        className="template-studio-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-3"
        onDragEnter={onDragEnter}
        onDragLeave={(event) => {
          if (isStudioLayerDragLeavingList(event)) onDragLeave?.(event);
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
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
}

/**
 * 행 사이에 끼워 넣을 위치를 보여주는 표시선.
 *
 * 표시 여부는 호출한 쪽이 판단한다. 이 컴포넌트는 활성 상태만 렌더한다.
 *
 * `relative` 부모의 위나 아래 가장자리에 겹쳐 그린다. 행 사이에 자리를 차지하면
 * 표시선이 나타날 때마다 아래 행이 밀려서, 포인터를 움직이지 않아도 포인터 밑의
 * 행이 바뀐다. 이벤트도 받지 않는다. 드롭은 목록 전체가 받는다.
 */
export function StudioLayerDropIndicator({
  depth,
  position,
  blockedReason = null,
}: StudioLayerDropIndicatorProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute right-1 z-10 flex h-1.5 items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.06em]",
        position === "before" ? "top-0" : "bottom-0",
        blockedReason ? "text-rose-300" : "text-[var(--accent)]",
      )}
      style={{ left: getStudioLayerIndent(depth) }}
      title={blockedReason ?? getStudioLayerDropPositionLabel(position)}
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
      {/* 행 글자 위에 겹치므로 배경을 채워 읽히게 한다. */}
      <span
        className={cn(
          "absolute right-0 rounded bg-[var(--panel)] px-1.5 py-0.5 leading-none ring-1 ring-inset",
          position === "before" ? "top-2" : "bottom-2",
          blockedReason
            ? "text-rose-300 ring-rose-400/60"
            : "text-[var(--accent)] ring-[var(--accent)]",
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
  /**
   * 드롭 대상일 때의 id. 목록이 포인터에 가장 가까운 대상 행을 이 값으로 찾는다.
   * 비워 두면 이 행 위에서는 이웃한 대상 행 기준으로 판단한다.
   */
  dropTargetId?: string;
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
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
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
  dropTargetId,
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
  onDragStart,
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
      data-layer-drop-id={dropTargetId}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
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
