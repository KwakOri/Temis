import { useTimeTableUI } from "@/contexts/TimeTableContext";
import Link from "next/link";
import React from "react";

const TimeTableControls: React.FC = () => {
  const { scale, updateScale } = useTimeTableUI();
  return (
    <div className="fixed top-4 left-4 z-50 bg-white/80 px-4 py-2 rounded select-none flex items-center gap-4">
      {/* 뒤로가기 버튼 */}
      <Link
        href="/my-page"
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
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
      <div className="w-px h-6 bg-gray-300"></div>

      {/* 배율 조절 */}
      <div className="flex items-center">
        <label className="text-sm text-gray-600 font-medium">
          미리보기 배율: {scale.toFixed(1)}x
        </label>
        <input
          type="range"
          min={0.1}
          max={2}
          step={0.1}
          value={scale}
          onChange={(e) => updateScale(parseFloat(e.target.value))}
          className="ml-2 w-60 h-2 rounded-lg appearance-none bg-gray-300
          accent-[#3E4A82]
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#3E4A82]
          [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#3E4A82]
          [&::-moz-range-thumb]:shadow-md
          "
        />
      </div>
    </div>
  );
};

export default TimeTableControls;
