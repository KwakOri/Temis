"use client";

import { useTimeTableDesignGuideContext } from "@/contexts/TimeTableDesignGuideContext";
import React from "react";

const TimeTableDesignGuideController: React.FC = () => {
  const { isVisible, opacity, toggleVisible, setOpacity } =
    useTimeTableDesignGuideContext();
  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(event.target.value);
    setOpacity(newOpacity);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-900 mb-3">도안 가이드</h3>

      <div className="space-y-3">
        {/* 표시/숨김 토글 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">도안 표시</label>
          <button
            onClick={toggleVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isVisible ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isVisible ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 투명도 조절 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">투명도</label>
            <span className="text-sm text-gray-500">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={opacity}
            onChange={handleOpacityChange}
            disabled={!isVisible}
            className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider ${
              !isVisible ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
        </div>

        {/* 빠른 투명도 버튼들 */}
        <div className="flex gap-1">
          {[0.3, 0.5, 0.7, 1.0].map((value) => (
            <button
              key={value}
              onClick={() => setOpacity(value)}
              disabled={!isVisible}
              className={`flex-1 px-2 py-1 text-xs rounded border transition-colors ${
                !isVisible
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : opacity === value
                  ? "bg-indigo-100 text-indigo-700 border-indigo-300"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>

        {/* 안내 텍스트 */}
        <div className="bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs text-blue-700">
            💡 도안을 참고하여 작업하세요. 투명도를 조절하여 편집 중인 내용과
            함께 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeTableDesignGuideController;
