"use client";

import React from "react";

interface TemplateBoilerplateSettingsModalProps {
  open: boolean;
  target: string;
  targetOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onChangeTarget: (value: string) => void;
  editor: React.ReactNode;
}

const TemplateBoilerplateSettingsModal: React.FC<
  TemplateBoilerplateSettingsModalProps
> = ({ open, target, targetOptions, onClose, onChangeTarget, editor }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="보일러플레이트 설정 닫기"
        className="absolute inset-0 bg-gray-900/45"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-300 bg-white p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm text-gray-700">
              보일러플레이트 설정
            </h4>
            <p className="text-xs text-gray-500">
              각 항목의 보일러플레이트 적용 버튼으로 넣을 속성 템플릿을 여기서
              미리 관리합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
        <div className="grid grid-cols-2 items-center gap-2">
          <label className="text-xs text-gray-500">대상 항목</label>
          <select
            value={target}
            onChange={(event) => onChangeTarget(event.target.value)}
            className="px-2 py-1 rounded border border-gray-300 bg-white text-xs"
          >
            {targetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {editor}
      </div>
    </div>
  );
};

export default TemplateBoilerplateSettingsModal;
