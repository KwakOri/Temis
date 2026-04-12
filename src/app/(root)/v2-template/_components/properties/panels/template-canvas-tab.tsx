"use client";

import React from "react";

interface TemplateCanvasTabProps {
  templateWidth: number;
  templateHeight: number;
  defaultTheme: string;
  previewTheme: string;
  themeOptions: string[];
  isMultiple: boolean;
  maxStreamingTimeByDay: number;
  onUpdateTemplateSize: (key: "width" | "height", value: number) => void;
  onChangeDefaultTheme: (theme: string) => void;
  onChangePreviewTheme: (theme: string) => void;
  onToggleMultiple: (value: boolean) => void;
  onChangeMaxStreamingTimeByDay: (value: number) => void;
  onApplyEntryCountVisibilityPreset: () => void;
  onAutoGenerateEntryCountNodes: () => void;
}

const TemplateCanvasTab: React.FC<TemplateCanvasTabProps> = ({
  templateWidth,
  templateHeight,
  defaultTheme,
  previewTheme,
  themeOptions,
  isMultiple,
  maxStreamingTimeByDay,
  onUpdateTemplateSize,
  onChangeDefaultTheme,
  onChangePreviewTheme,
  onToggleMultiple,
  onChangeMaxStreamingTimeByDay,
  onApplyEntryCountVisibilityPreset,
  onAutoGenerateEntryCountNodes,
}) => {
  return (
    <div className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100">
      <h3 className="font-bold text-base text-gray-100">템플릿 설정</h3>

      <div className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <p className="text-xs font-semibold tracking-wide text-gray-300">
          캔버스
        </p>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-xs text-gray-500">width</label>
          <input
            type="number"
            value={templateWidth}
            onChange={(event) =>
              onUpdateTemplateSize("width", Number(event.target.value))
            }
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#1f2a3f] text-sm text-gray-100"
          />
          <label className="text-xs text-gray-500">height</label>
          <input
            type="number"
            value={templateHeight}
            onChange={(event) =>
              onUpdateTemplateSize("height", Number(event.target.value))
            }
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#1f2a3f] text-sm text-gray-100"
          />
        </div>
      </div>

      <div className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <p className="text-xs font-semibold tracking-wide text-gray-300">테마</p>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-xs text-gray-500">default theme</label>
          <select
            value={defaultTheme}
            onChange={(event) => onChangeDefaultTheme(event.target.value)}
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#1f2a3f] text-sm text-gray-100"
          >
            {themeOptions.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>

          <label className="text-xs text-gray-500">preview theme</label>
          <select
            value={previewTheme}
            onChange={(event) => onChangePreviewTheme(event.target.value)}
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#1f2a3f] text-sm text-gray-100"
          >
            {themeOptions.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2 rounded border border-[#3a3d44] bg-[#1a1c20] p-3">
        <p className="text-xs font-semibold tracking-wide text-gray-300">
          다회차 설정
        </p>
        <label className="flex items-center justify-between gap-2 rounded border border-[#3a3d44] bg-[#111317] px-2.5 py-2">
          <span className="text-xs text-gray-300">
            다회차 기능 사용 (`entries` 최대 2개)
          </span>
          <input
            type="checkbox"
            checked={isMultiple}
            onChange={(event) => onToggleMultiple(event.target.checked)}
          />
        </label>
        <div className="grid grid-cols-[120px_1fr] gap-2 items-center">
          <label className="text-xs text-gray-500">최대 회차</label>
          <select
            value={isMultiple ? maxStreamingTimeByDay : 1}
            onChange={(event) =>
              onChangeMaxStreamingTimeByDay(Number(event.target.value))
            }
            disabled={!isMultiple}
            className="px-3 py-2 rounded border border-[#3a3d44] bg-[#1f2a3f] text-sm text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={1}>1회차</option>
            <option value={2}>2회차</option>
          </select>
        </div>
        <button
          type="button"
          onClick={onApplyEntryCountVisibilityPreset}
          className="w-full rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2 text-xs font-semibold text-gray-100 hover:bg-[#323640]"
        >
          다회차 가시성 프리셋 적용
        </button>
        <button
          type="button"
          onClick={onAutoGenerateEntryCountNodes}
          className="w-full rounded border border-[#4f8cff] bg-[#1f355f] px-3 py-2 text-xs font-semibold text-[#d6e6ff] hover:bg-[#27457a]"
        >
          단/다회차 노드 자동 생성
        </button>
        <p className="text-[11px] text-gray-500">
          같은 entry 필드(mainTitle/subTitle 등)를 쓰는 노드가 2개 이상이면
          첫 번째는 `온라인·단회차`, 두 번째부터는 `온라인·다회차`로 자동 설정됩니다.
        </p>
      </div>
    </div>
  );
};

export default TemplateCanvasTab;
