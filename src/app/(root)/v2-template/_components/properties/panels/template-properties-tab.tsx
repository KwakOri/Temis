"use client";

import React from "react";

interface TemplatePropertiesTabProps {
  inspectorRef: React.RefObject<HTMLDivElement | null>;
  selectedLabel: string;
  onMouseLeave: () => void;
  onBlurOutside: () => void;
  children: React.ReactNode;
}

const TemplatePropertiesTab: React.FC<TemplatePropertiesTabProps> = ({
  inspectorRef,
  selectedLabel,
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
          onBlurOutside();
          return;
        }
        if (!inspectorRef.current?.contains(nextFocused)) {
          onBlurOutside();
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-gray-100">속성</h3>
        <span className="rounded border border-[#3a3d44] bg-[#1a1c20] px-2 py-1 text-[11px] text-gray-300">
          {selectedLabel}
        </span>
      </div>
      <p className="text-xs text-gray-400">
        왼쪽 Layers에서 오브젝트를 클릭하면 해당 오브젝트의 속성만 표시됩니다.
      </p>

      {children}
    </div>
  );
};

export default TemplatePropertiesTab;
