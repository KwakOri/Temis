"use client";

import React from "react";

interface TemplateCardAutoResizeOptionsProps {
  maxFontSize: number;
  multiline: boolean;
  onHoverContainer: () => void;
  onLeaveContainer: () => void;
  onActivateContainer: () => void;
  onChangeMaxFontSize: (value: number) => void;
  onChangeMultiline: (value: boolean) => void;
}

const TemplateCardAutoResizeOptions: React.FC<TemplateCardAutoResizeOptionsProps> = ({
  maxFontSize,
  multiline,
  onHoverContainer,
  onLeaveContainer,
  onActivateContainer,
  onChangeMaxFontSize,
  onChangeMultiline,
}) => {
  return (
    <>
      <div
        className="grid grid-cols-2 gap-2 items-center"
        onMouseEnter={onHoverContainer}
        onMouseLeave={onLeaveContainer}
        onClick={onActivateContainer}
      >
        <label className="text-xs text-gray-400">content / maxFontSize</label>
        <input
          type="number"
          value={maxFontSize}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (!Number.isFinite(value) || value <= 0) return;
            onChangeMaxFontSize(value);
          }}
          className="px-3 py-2 rounded border border-[#3a3d44] bg-[#2a2d33] text-sm text-gray-100"
        />
      </div>
      <label
        className="flex items-center justify-between gap-2 rounded border border-[#3a3d44] bg-[#2a2d33] px-3 py-2"
        onMouseEnter={onHoverContainer}
        onMouseLeave={onLeaveContainer}
        onClick={onActivateContainer}
      >
        <span className="text-sm text-gray-200">content / multiline</span>
        <input
          type="checkbox"
          checked={Boolean(multiline)}
          onChange={(event) => onChangeMultiline(event.target.checked)}
        />
      </label>
    </>
  );
};

export default TemplateCardAutoResizeOptions;
