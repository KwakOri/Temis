"use client";

import React from "react";

interface TemplateStylePresetControlsProps {
  presetOptions: Array<{ id: string; label: string; description: string }>;
  selectedPresetId: string;
  onChangePresetId: (id: string) => void;
  onApplyPreset: () => void;
}

const TemplateStylePresetControls: React.FC<TemplateStylePresetControlsProps> = ({
  presetOptions,
  selectedPresetId,
  onChangePresetId,
  onApplyPreset,
}) => {
  const selectedDescription =
    presetOptions.find((preset) => preset.id === selectedPresetId)?.description ??
    "";

  return (
    <section className="rounded border border-[#2f3239] bg-[#0f1218] p-3 space-y-2">
      <h4 className="text-sm font-semibold text-gray-100">프리셋</h4>
      <p className="text-xs text-gray-400">
        프리셋은 구조/스타일/스키마를 데이터로 적용합니다.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={selectedPresetId}
          onChange={(event) => onChangePresetId(event.target.value)}
          className="flex-1 rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1.5 text-xs text-gray-100"
        >
          {presetOptions.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onApplyPreset}
          className="rounded border border-[#2f6ef7] bg-[#1e3e8a] px-2.5 py-1.5 text-xs font-semibold text-[#dbe7ff] hover:bg-[#2651b2]"
        >
          프리셋 적용
        </button>
      </div>
      {selectedDescription ? (
        <p className="text-[11px] text-gray-500">{selectedDescription}</p>
      ) : null}
    </section>
  );
};

export default TemplateStylePresetControls;
