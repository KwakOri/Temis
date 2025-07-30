import { useTimeTableState } from "@/hooks/useTimeTableState";
import Link from "next/link";
import React from "react";

const MobileHeader: React.FC = () => {
  const { state, actions } = useTimeTableState();
  return (
    <div className="sticky top-0 flex items-center justify-between p-4 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50">
      {/* 뒤로가기 버튼 */}
      <Link
        href="/"
        className="flex items-center text-gray-600 active:text-gray-900 transition-colors touch-manipulation"
      >
        <svg
          className="w-6 h-6 mr-2"
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
        <span className="font-medium">뒤로가기</span>
      </Link>

      {/* 배율 조절 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-600 whitespace-nowrap">
            {Math.round(state.scale * 100)}%
          </span>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={state.scale}
            onChange={(e) => actions.updateScale(parseFloat(e.target.value))}
            className="w-24 h-3 rounded-lg appearance-none bg-gray-300
            accent-[#3E4A82]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#3E4A82]
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[#3E4A82]
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
