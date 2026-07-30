"use client";

import { SlidersHorizontal } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { Fragment, type ReactNode } from "react";

import { StudioInspectorSection } from "@/components/studio/inspector/studio-inspector-section";

export interface StudioSelectionHeader {
  /**
   * 이미 크기가 정해진 아이콘 노드 또는 한 글자 라벨.
   *
   * 프레임은 아이콘 배지의 크기와 색만 소유하고 어떤 아이콘인지는 도메인이
   * 정한다.
   */
  icon: ReactNode;
  /** 선택 타입 이름. 예: `Text`, `Timetable` */
  title: string;
  /** 선택 개수나 상태 요약. 예: `1 selected`, `Composition` */
  summary: string;
  /** 이름 변경 입력에 표시할 값. 선택이 없으면 안내 문구를 넣는다. */
  renameValue: string;
  renameDisabled?: boolean;
  onRenameChange: (label: string) => void;
}

/** 접이식 속성 섹션 항목. */
export interface StudioPropertySection {
  kind?: "section";
  /** 배열 안에서 유일한 식별자. 같은 섹션이 다시 렌더될 때 유지된다. */
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  action?: ReactNode;
  content: ReactNode;
}

/**
 * 섹션 프레임 없이 그대로 렌더하는 항목.
 *
 * 선택이 없을 때의 안내 문구처럼 접을 대상이 아닌 블록에 쓴다.
 */
export interface StudioPropertyBlock {
  kind: "block";
  id: string;
  content: ReactNode;
}

export type StudioPropertyItem = StudioPropertySection | StudioPropertyBlock;

export interface StudioPropertiesPanelProps {
  header: StudioSelectionHeader;
  /** Adapter가 만든 순서대로 렌더한다. 프레임은 순서를 바꾸지 않는다. */
  sections: StudioPropertyItem[];
}

/**
 * Studio 편집기 공통 우측 속성 패널 프레임.
 *
 * 패널 너비, 스크롤 경계, 선택 헤더와 이름 변경 입력, 섹션 렌더 순서를
 * 소유한다. 어떤 속성 섹션이 있고 각 섹션이 무엇을 편집하는지는 도메인이
 * 정한다.
 */
export function StudioPropertiesPanel({
  header,
  sections,
}: StudioPropertiesPanelProps) {
  return (
    <aside className="template-studio-scrollbar w-[280px] shrink-0 overflow-y-auto overflow-x-hidden border-l border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-[var(--sel)] text-[11px] font-extrabold text-[var(--accent)]">
            {header.icon}
          </span>
          <span className="text-[12.5px] font-semibold text-[var(--fg)]">
            {header.title}
          </span>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--fg3)]">
            {header.summary}
          </span>
        </div>
        <div className="flex h-[34px] items-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5">
          <SlidersHorizontal size={13} className="text-[var(--fg2)]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold text-[var(--fg)] outline-none disabled:text-[var(--fg3)]"
            disabled={header.renameDisabled}
            value={header.renameValue}
            onChange={(event) =>
              header.onRenameChange(event.currentTarget.value)
            }
          />
        </div>
      </div>

      {sections.map((section) =>
        section.kind === "block" ? (
          <Fragment key={section.id}>{section.content}</Fragment>
        ) : (
          <StudioInspectorSection
            action={section.action}
            badge={section.badge}
            key={section.id}
            open={section.open}
            title={section.title}
            onToggle={section.onToggle}
          >
            {section.content}
          </StudioInspectorSection>
        ),
      )}
    </aside>
  );
}
