"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  Minus,
  Plus,
  Save,
  Send,
  Settings,
} from "lucide-react";
// jsx: "preserve" 환경의 체크 스크립트가 클래식 변환을 타므로 React 심볼이 필요하다.
import React, { type ReactNode } from "react";

export interface StudioToolbarAction {
  title?: string;
  label?: string;
  disabled?: boolean;
  onClick: () => void;
}

export interface StudioToolbarCanvasSize {
  width: number;
  height: number;
  title?: string;
  onClick?: () => void;
}

export interface StudioToolbarZoomController {
  /** 1 = 100% */
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export interface StudioTopToolbarProps {
  backAction: StudioToolbarAction;
  saveAction: StudioToolbarAction;
  publishAction: StudioToolbarAction;
  canvasSize: StudioToolbarCanvasSize;
  zoom: StudioToolbarZoomController;
  settingsAction: StudioToolbarAction;
  previewAction: StudioToolbarAction;
  shareAction?: StudioToolbarAction;
  /**
   * 캔버스 크기 표시 뒤에 들어가는 도메인 전용 영역.
   *
   * Template Studio는 `Cards / Timetable` 전환과 가이드 컨트롤을 넣고,
   * Thumbnail Studio는 비워두거나 썸네일 전용 도구만 넣는다.
   */
  centerSlot?: ReactNode;
  /** 오른쪽 영역 앞에 덧붙이는 도메인 전용 액션 */
  extraActions?: ReactNode;
  /** 숨겨진 file input처럼 화면에 보이지 않는 요소 */
  hiddenControls?: ReactNode;
}

const ICON_BUTTON_CLASS =
  "flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45";

/**
 * Studio 편집기 공통 상단 도구 모음.
 *
 * 도메인 상태를 직접 참조하지 않는다. 표시 값과 핸들러만 받는다. 시간표의
 * `activeWorkspaceMode` 같은 상태는 `centerSlot`으로 주입한다.
 */
export function StudioTopToolbar({
  backAction,
  saveAction,
  publishAction,
  canvasSize,
  zoom,
  settingsAction,
  previewAction,
  shareAction,
  centerSlot,
  extraActions,
  hiddenControls,
}: StudioTopToolbarProps) {
  return (
    <div className="z-10 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--panel)] px-3">
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <button
          className="flex h-[30px] items-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-2.5 text-xs font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          title={backAction.title}
          type="button"
          onClick={backAction.onClick}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backAction.label ?? "목록"}
        </button>
        <div className="mx-0.5 h-[22px] w-px bg-[var(--border)]" />
        <button
          className={ICON_BUTTON_CLASS}
          disabled={saveAction.disabled}
          title={saveAction.title}
          type="button"
          onClick={saveAction.onClick}
        >
          <Save className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-blue-400/40 bg-blue-500/15 text-blue-200 transition hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={publishAction.disabled}
          title={publishAction.title}
          type="button"
          onClick={publishAction.onClick}
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="hidden min-w-0 flex-1 items-center justify-center gap-3 text-xs text-[var(--fg2)] md:flex">
        <button
          className="shrink-0 rounded-md px-1.5 py-1 transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          title={canvasSize.title}
          type="button"
          onClick={canvasSize.onClick}
        >
          <b className="font-semibold text-[var(--fg)]">{canvasSize.width}</b> ×{" "}
          <b className="font-semibold text-[var(--fg)]">{canvasSize.height}</b>
        </button>
        {centerSlot}
      </div>

      <div className="ml-auto flex min-w-[300px] items-center justify-end gap-2">
        {extraActions}
        <div className="flex h-[30px] items-center rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-1">
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Zoom out"
            type="button"
            onClick={zoom.onZoomOut}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-11 text-center text-xs font-semibold tracking-[0.01em] text-[var(--fg)]">
            {Math.round(zoom.scale * 100)}%
          </span>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
            title="Zoom in"
            type="button"
            onClick={zoom.onZoomIn}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          className="h-[30px] rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-medium text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)]"
          type="button"
          onClick={zoom.onFit}
        >
          Fit
        </button>
        {hiddenControls}
        <button
          className={ICON_BUTTON_CLASS}
          disabled={settingsAction.disabled}
          title={settingsAction.title}
          type="button"
          onClick={settingsAction.onClick}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          className="inline-flex h-[30px] items-center gap-1.5 rounded-lg border border-[var(--field-border)] bg-[var(--field)] px-3 text-xs font-semibold text-[var(--fg2)] transition hover:bg-[var(--hover)] hover:text-[var(--fg)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={previewAction.disabled}
          title={previewAction.title}
          type="button"
          onClick={previewAction.onClick}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          {previewAction.label ?? "Preview"}
        </button>
        {shareAction ? (
          <>
            <div className="mx-0.5 h-[22px] w-px bg-[var(--border)]" />
            <button
              className="h-[30px] rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold tracking-[0.01em] text-white transition disabled:cursor-not-allowed disabled:opacity-45"
              disabled={shareAction.disabled}
              title={shareAction.title}
              type="button"
              onClick={shareAction.onClick}
            >
              {shareAction.label ?? "공유"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
