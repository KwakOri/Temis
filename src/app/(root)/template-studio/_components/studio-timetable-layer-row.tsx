"use client";

import {
  CalendarDays,
  EyeOff,
  Image as ImageIcon,
  Layers3,
  Type,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React from "react";

import { StudioLayerRow } from "@/components/studio/layers/studio-layer-primitives";

/**
 * 시간표 레이어 종류 이름에 맞는 아이콘.
 *
 * composition object의 종류를 행에서 다시 계산하지 않도록 문자열 이름을 받는다.
 */
export const getStudioTimetableLayerIcon = (type: string): React.ReactNode => {
  if (type === "group") return <Layers3 size={14} />;
  if (type === "day") return <CalendarDays size={14} />;
  if (type === "block" || type === "image") return <ImageIcon size={14} />;
  return <Type size={14} />;
};

export interface StudioTimetableLayerRowProps {
  id: string;
  label: string;
  /** 행 오른쪽에 보여줄 종류 이름. 아이콘도 이 값으로 고른다. */
  type: string;
  depth?: number;
  disabled?: boolean;
  hidden?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  draggable?: boolean;
  /** 드롭할 수 없는 이유. 있으면 막힌 표현으로 바뀐다. */
  blockedReason?: string | null;
  /** 지금 고른 레이어 id. 이 행의 id와 같으면 선택 표현이 된다. */
  selectedLayerId: string | null;
  /** 행을 눌렀을 때 고를 레이어를 바꾼다. */
  onSelectLayer: (id: string) => void;
  onToggleCollapsed?: () => void;
  /** 선택 외에 더 할 일. 예: 요일 카드에서 미리보기 요일 바꾸기 */
  onSelect?: () => void;
  onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void;
}

/**
 * 시간표 composition 레이어 한 행.
 *
 * 공통 레이어 행에 시간표 종류 아이콘과 선택 규칙만 더한다. 행을 누르면 항상
 * 고른 레이어가 먼저 바뀌고, 그 뒤에 호출한 쪽의 추가 동작이 이어진다.
 */
export function StudioTimetableLayerRow({
  id,
  label,
  type,
  depth = 0,
  disabled = false,
  hidden = false,
  collapsible = false,
  collapsed = false,
  draggable = false,
  blockedReason = null,
  selectedLayerId,
  onSelectLayer,
  onToggleCollapsed,
  onSelect,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
}: StudioTimetableLayerRowProps) {
  return (
    <StudioLayerRow
      blockedReason={blockedReason}
      collapsed={collapsed}
      collapsible={collapsible}
      depth={depth}
      disabled={disabled}
      draggable={draggable}
      hidden={hidden}
      icon={getStudioTimetableLayerIcon(type)}
      label={label}
      ring={blockedReason ? "blocked" : "none"}
      selected={selectedLayerId === id}
      stateIcon={
        hidden ? (
          <EyeOff className="h-3.5 w-3.5 shrink-0 text-[var(--fg3)]" />
        ) : null
      }
      typeLabel={type}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onToggleCollapsed={onToggleCollapsed}
      onClick={() => {
        onSelectLayer(id);
        onSelect?.();
      }}
    />
  );
}
