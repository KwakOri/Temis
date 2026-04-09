"use client";

import { useTemplateDesignGuideContext } from "@/contexts/v2/template-design-guide-context";
import React from "react";

const TimeTableDesignGuideController: React.FC = () => {
  const { isVisible, opacity, toggleVisible, setOpacity } =
    useTemplateDesignGuideContext();
  const handleOpacityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOpacity = parseFloat(event.target.value);
    setOpacity(newOpacity);
  };

  return (
    <div className="bg-[#1b212c] border border-[#303848] rounded-lg p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      <h3 className="text-sm font-medium text-gray-900 mb-3">도안 가이드</h3>

      <div className="space-y-3">
        {/* 표시/숨김 토글 */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">도안 표시</label>
          <button
            onClick={toggleVisible}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isVisible ? "bg-indigo-500" : "bg-[#2f3a4d]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-[#e8edf6] transition-transform ${
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
            className={`w-full h-2 bg-[#2f3a4d] rounded-lg appearance-none cursor-pointer slider ${
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
                  ? "bg-[#222936] text-gray-400 cursor-not-allowed"
                  : opacity === value
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/40"
                  : "bg-[#202734] text-gray-700 border-[#303848] hover:bg-[#2a3344]"
              }`}
            >
              {Math.round(value * 100)}%
            </button>
          ))}
        </div>

        {/* 안내 텍스트 */}
        <div className="bg-[#1d2738] border border-[#31425f] rounded p-2">
          <p className="text-xs text-[#8eb4ff]">
            💡 도안을 참고하여 작업하세요. 투명도를 조절하여 편집 중인 내용과
            함께 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeTableDesignGuideController;
