"use client";

import React from "react";

interface TemplateStyleTabProps {
  inspectorRef: React.RefObject<HTMLDivElement | null>;
  onMouseLeave: () => void;
  onBlurOutside: () => void;
  children: React.ReactNode;
}

const TemplateStyleTab: React.FC<TemplateStyleTabProps> = ({
  inspectorRef,
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
      <h3 className="font-bold text-base text-gray-100">스타일</h3>
      {children}
    </div>
  );
};

export default TemplateStyleTab;
