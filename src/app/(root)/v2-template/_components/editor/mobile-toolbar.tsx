import { useTemplateRuntimeUIContext } from "@/contexts/v2/template-runtime-ui-context";
import type { V2TemplateEditorScopedPreviewMode } from "@/types/time-table/template-editor-ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";
import {
  v2_PREVIEW_SCALE_MAX_MOBILE,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "../shared/preview-scale";

interface MobileHeaderProps {
  scopeTitle?: string;
  onExitScope?: () => void;
  exitScopeLabel?: string;
  scopePreviewMode?: V2TemplateEditorScopedPreviewMode;
  onChangeScopePreviewMode?: (
    mode: V2TemplateEditorScopedPreviewMode
  ) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  scopeTitle,
  onExitScope,
  exitScopeLabel = "Scene으로",
  scopePreviewMode,
  onChangeScopePreviewMode,
}) => {
  const { state, actions } = useTemplateRuntimeUIContext();
  const showScopePreviewModeControls = Boolean(
    scopePreviewMode && onChangeScopePreviewMode
  );
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-gray-200 bg-timetable-form-bg p-4 backdrop-blur-sm">
      <div className="min-w-0">
        {onExitScope ? (
          <button
            type="button"
            onClick={onExitScope}
            className="flex items-center rounded border border-[#4f8cff] bg-[#1f3f75] px-3 py-2 text-sm font-semibold text-[#dbe8ff] active:bg-[#294c86]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {exitScopeLabel}
          </button>
        ) : (
          <Link
            href="/my-page"
            className="flex items-center text-gray-600 transition-colors active:text-gray-900 touch-manipulation"
          >
            <ArrowLeft className="mr-2 h-6 w-6" />
            <span className="font-medium">뒤로가기</span>
          </Link>
        )}
        {scopeTitle ? (
          <p className="mt-1 truncate text-xs font-semibold text-[#4f6fa9]">
            {scopeTitle}
          </p>
        ) : null}
        {showScopePreviewModeControls ? (
          <div className="mt-2 grid w-fit grid-cols-2 rounded-md border border-[#c8d5e8] bg-white p-0.5">
            <button
              type="button"
              onClick={() => onChangeScopePreviewMode?.("isolated")}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${
                scopePreviewMode === "isolated"
                  ? "bg-[#1f3f75] text-white"
                  : "text-[#53657e]"
              }`}
            >
              단독
            </button>
            <button
              type="button"
              onClick={() => onChangeScopePreviewMode?.("full")}
              className={`rounded px-2.5 py-1 text-xs font-semibold ${
                scopePreviewMode === "full"
                  ? "bg-[#1f3f75] text-white"
                  : "text-[#53657e]"
              }`}
            >
              전체
            </button>
          </div>
        ) : null}
      </div>

      {/* 배율 조절 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {Math.round(state.scale * 100)}%
          </span>
          <input
            type="range"
            min={v2_PREVIEW_SCALE_MIN}
            max={v2_PREVIEW_SCALE_MAX_MOBILE}
            step={0.05}
            value={state.scale}
            onChange={(e) =>
              actions.updateScale(
                v2_clampPreviewScale({
                  value: parseFloat(e.target.value),
                  isMobile: true,
                })
              )
            }
            className="w-24 h-3 rounded-lg appearance-none bg-gray-300
            accent-timetable-primary
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-timetable-primary
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-timetable-primary
            [&::-moz-range-thumb]:shadow-md
            [&::-moz-range-thumb]:cursor-pointer
            [&::-moz-range-thumb]:border-none
            "
          />
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;
