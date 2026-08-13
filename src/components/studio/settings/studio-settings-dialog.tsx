"use client";

import { X } from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import {
  buildStudioCommonSettingsSections,
  type StudioCommonSettingsModel,
} from "@/components/studio/settings/studio-common-settings";
import { cn } from "@/lib/utils";

/** 설정 패널 컨테이너 공통 클래스. */
export const STUDIO_SETTINGS_PANEL_CLASS =
  "mx-auto grid w-full max-w-3xl content-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--field)]/20 p-4";

export interface StudioSettingsSection {
  id: string;
  /** 좌측 목록 라벨 */
  label: string;
  /** 좌측 목록 보조 설명 */
  description: string;
  /**
   * 좌측 목록 아이콘.
   *
   * 활성 항목의 색을 프레임이 정하므로 className을 받는 컴포넌트로 넘긴다.
   */
  navIcon: ComponentType<{ className?: string }>;
  /** 패널 제목 행을 포함한 내용 전체 */
  content: ReactNode;
  /** 패널 컨테이너에 덧붙일 클래스 */
  contentClassName?: string;
}

export interface StudioSettingsDialogProps {
  open: boolean;
  title: string;
  description: string;
  /** 두 Studio가 함께 쓰는 문서 설정 */
  common: StudioCommonSettingsModel;
  /**
   * 도메인 전용 설정. 공통 설정보다 앞에 온다.
   *
   * Template Studio는 캔버스와 시간표 capability를 넣고, Thumbnail Studio는
   * 썸네일 캔버스를 넣는다.
   */
  domainSections?: StudioSettingsSection[];
  onClose: () => void;
}

/**
 * Studio 편집기 공통 설정 다이얼로그.
 *
 * 오버레이, 다이얼로그 프레임, 제목 행, 닫기 동작, 좌측 분류 목록, 패널
 * 컨테이너와 스크롤을 소유한다. 어떤 설정이 있는지는 공통 설정 모델과 도메인
 * 섹션 배열이 정한다.
 */
export function StudioSettingsDialog({
  open,
  title,
  description,
  common,
  domainSections = [],
  onClose,
}: StudioSettingsDialogProps) {
  const sections = [
    ...domainSections,
    ...buildStudioCommonSettingsSections(common),
  ];
  const [activeSectionId, setActiveSectionId] = useState(
    () => sections[0]?.id ?? "",
  );

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-describedby="studio-settings-description"
        aria-labelledby="studio-settings-title"
        aria-modal="true"
        className="flex h-[calc(100vh-4rem)] max-h-[880px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        role="dialog"
      >
        <header className="flex h-16 shrink-0 items-center border-b border-[var(--border)] bg-[var(--panel)] px-5">
          <div>
            <h2
              className="text-base font-bold text-[var(--fg)]"
              id="studio-settings-title"
            >
              {title}
            </h2>
            <p
              className="text-[11px] font-semibold text-[var(--fg3)]"
              id="studio-settings-description"
            >
              {description}
            </p>
          </div>
          <button
            aria-label="Close settings"
            autoFocus
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Close settings"
            type="button"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label="Settings categories"
            className="w-44 shrink-0 border-r border-[var(--border)] bg-[var(--field)]/15 p-3 sm:w-52"
          >
            <div
              className="grid gap-1"
              role="tablist"
              aria-orientation="vertical"
            >
              {sections.map(
                ({
                  id,
                  label,
                  description: navDescription,
                  navIcon: NavIcon,
                }) => (
                  <button
                    aria-controls={`studio-settings-panel-${id}`}
                    aria-selected={activeSectionId === id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      activeSectionId === id
                        ? "bg-[var(--sel)] text-[var(--fg)] shadow-[inset_0_0_0_1px_var(--field-border)]"
                        : "text-[var(--fg2)] hover:bg-[var(--hover)] hover:text-[var(--fg)]",
                    )}
                    id={`studio-settings-tab-${id}`}
                    key={id}
                    role="tab"
                    type="button"
                    onClick={() => setActiveSectionId(id)}
                  >
                    <NavIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        activeSectionId === id && "text-[var(--accent)]",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold">{label}</span>
                      <span className="block truncate text-[10px] font-semibold text-[var(--fg3)]">
                        {navDescription}
                      </span>
                    </span>
                  </button>
                ),
              )}
            </div>
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {sections.map((section) => (
              <section
                aria-labelledby={`studio-settings-tab-${section.id}`}
                className={cn(
                  STUDIO_SETTINGS_PANEL_CLASS,
                  section.contentClassName,
                  activeSectionId !== section.id && "hidden",
                )}
                id={`studio-settings-panel-${section.id}`}
                key={section.id}
                role="tabpanel"
              >
                {section.content}
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
