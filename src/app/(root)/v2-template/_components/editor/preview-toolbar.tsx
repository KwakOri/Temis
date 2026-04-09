import { useTemplateEditorUI } from "@/contexts/v2/template-editor-ui-context";
import Link from "next/link";
import React from "react";
import {
  v2_PREVIEW_SCALE_MAX_DESKTOP,
  v2_PREVIEW_SCALE_MIN,
  v2_clampPreviewScale,
} from "./preview-scale";

const TimeTableControls: React.FC = () => {
  const { scale, updateScale } = useTemplateEditorUI();
  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#303848] bg-[#121722]/95 px-4 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.35)] select-none flex items-center gap-4">
      {/* 뒤로가기 버튼 */}
      <Link
        href="/my-page"
        className="flex items-center text-gray-300 hover:text-gray-100 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="text-sm font-medium">뒤로가기</span>
      </Link>

      {/* 구분선 */}
      <div className="w-px h-6 bg-[#303848]"></div>

      {/* 배율 조절 */}
      <div className="flex items-center">
        <label className="text-sm text-gray-200 font-medium">
          미리보기 배율: {scale.toFixed(1)}x
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
          className="ml-2 w-72 h-2 rounded-lg appearance-none bg-[#2a3344]
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
