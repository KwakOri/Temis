import { useTemplateRuntimeUI } from "@/contexts/v2/template-runtime-ui-context";
import type { V2TemplateEditorScopedPreviewMode } from "@/types/time-table/template-editor-ui";
import { ArrowLeft, Boxes, Layers } from "lucide-react";
import Link from "next/link";
import React from "react";
import {
  v2_PREVIEW_SCALE_MAX_DESKTOP,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "../shared/preview-scale";

interface TimeTableControlsProps {
  scopeTitle?: string;
  onExitScope?: () => void;
  exitScopeLabel?: string;
  scopePreviewMode?: V2TemplateEditorScopedPreviewMode;
  onChangeScopePreviewMode?: (
    mode: V2TemplateEditorScopedPreviewMode
  ) => void;
}

const TimeTableControls: React.FC<TimeTableControlsProps> = ({
  scopeTitle,
  onExitScope,
  exitScopeLabel = "Scene으로 돌아가기",
  scopePreviewMode,
  onChangeScopePreviewMode,
}) => {
  const { scale, updateScale } = useTemplateRuntimeUI();
  const showScopePreviewModeControls = Boolean(
    scopePreviewMode && onChangeScopePreviewMode
  );
  const iconButtonClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#344158] bg-[#171e2c] text-[#c8d6f2] transition-colors hover:bg-[#21304a] hover:text-white";
  return (
    <div className="fixed top-4 left-1/2 z-50 flex max-w-[min(calc(100vw-48px),820px)] -translate-x-1/2 select-none items-center gap-3 rounded-lg border border-[#303848] bg-[#121722]/95 px-3 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      {onExitScope ? (
        <>
          <button
            type="button"
            onClick={onExitScope}
            title={exitScopeLabel}
            aria-label={exitScopeLabel}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#4f8cff] bg-[#1f3f75] text-[#dbe8ff] transition-colors hover:bg-[#294c86]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {scopeTitle ? (
            <>
              <div className="h-6 w-px bg-[#303848]" />
              <span
                className="max-w-[140px] truncate text-sm font-semibold text-[#9ec1ff]"
                title={scopeTitle}
              >
                {scopeTitle}
              </span>
            </>
          ) : null}
          {showScopePreviewModeControls ? (
            <>
              <div className="h-6 w-px bg-[#303848]" />
              <div className="grid shrink-0 grid-cols-2 rounded-md border border-[#344158] bg-[#0c111b] p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeScopePreviewMode?.("isolated")}
                  title="단독 보기"
                  aria-label="단독 보기"
                  className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                    scopePreviewMode === "isolated"
                      ? "bg-[#274f93] text-white"
                      : "text-[#9aa8bd] hover:bg-[#1a2332] hover:text-[#dbe8ff]"
                  }`}
                >
                  <Boxes className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeScopePreviewMode?.("full")}
                  title="전체 보기"
                  aria-label="전체 보기"
                  className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                    scopePreviewMode === "full"
                      ? "bg-[#274f93] text-white"
                      : "text-[#9aa8bd] hover:bg-[#1a2332] hover:text-[#dbe8ff]"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : null}
          <div className="h-6 w-px bg-[#303848]" />
        </>
      ) : null}

      {/* 뒤로가기 버튼 */}
      <Link
        href="/my-page"
        title="목록으로 돌아가기"
        aria-label="목록으로 돌아가기"
        className={iconButtonClass}
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      {/* 구분선 */}
      <div className="w-px h-6 bg-[#303848]"></div>

      {/* 배율 조절 */}
      <div className="flex min-w-0 items-center gap-2">
        <label
          className="w-11 shrink-0 text-right text-sm font-semibold text-gray-100"
          title="미리보기 배율"
        >
          {scale.toFixed(1)}x
        </label>
        <input
          type="range"
          min={v2_PREVIEW_SCALE_MIN}
          max={v2_PREVIEW_SCALE_MAX_DESKTOP}
          step={0.1}
          value={scale}
          onChange={(e) =>
            updateScale(
              v2_clampPreviewScale({
                value: parseFloat(e.target.value),
                isMobile: false,
              })
            )
          }
          className="h-2 w-56 min-w-[160px] rounded-lg appearance-none bg-[#2a3344]
          accent-[#4f8cff]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#4f8cff]
          [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#4f8cff]
          [&::-moz-range-thumb]:shadow-md
          "
        />
      </div>
    </div>
  );
};

export default TimeTableControls;
