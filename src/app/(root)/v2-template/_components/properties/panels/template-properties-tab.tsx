"use client";

import React from "react";

interface TemplatePropertiesTabProps {
  inspectorRef: React.RefObject<HTMLDivElement | null>;
  selectedLabel: string;
  editorMode: "instance" | "master";
  onMouseLeave: () => void;
  onBlurOutside: () => void;
  children: React.ReactNode;
}

const TemplatePropertiesTab: React.FC<TemplatePropertiesTabProps> = ({
  inspectorRef,
  selectedLabel,
  editorMode,
  onMouseLeave,
  onBlurOutside,
  children,
}) => {
  return (
    <div
      ref={inspectorRef}
      className="space-y-4 rounded-xl border border-[#2f3239] bg-[#111317] p-3 text-gray-100"
      onMouseLeave={onMouseLeave}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget;
        if (!(nextFocused instanceof Node)) {
          return;
        }
        if (!inspectorRef.current?.contains(nextFocused)) {
          onBlurOutside();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-gray-100">속성</h3>
        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              editorMode === "master"
                ? "border-[#3f6ad8] bg-[#1a2b57] text-[#b9ccff]"
                : "border-[#3a3d44] bg-[#1a1c20] text-gray-300"
            }`}
          >
            {editorMode === "master" ? "Master" : "Instance"}
          </span>
          <span className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1 text-[11px] text-gray-300">
            {selectedLabel}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">
        {editorMode === "master"
          ? "Components 탭에서 선택한 마스터 오브젝트 속성을 편집 중입니다."
          : "Layers 탭에서 선택한 인스턴스 오브젝트 속성을 보고 있습니다."}
      </p>

      {children}
    </div>
  );
};

export default TemplatePropertiesTab;
