"use client";

import React from "react";

interface TemplateCardAutoResizeOptionsProps {
  multiline: boolean;
  onHoverContainer: () => void;
  onLeaveContainer: () => void;
  onActivateContainer: () => void;
  onChangeMultiline: (value: boolean) => void;
}

const TemplateCardAutoResizeOptions: React.FC<TemplateCardAutoResizeOptionsProps> = ({
  multiline,
  onHoverContainer,
  onLeaveContainer,
  onActivateContainer,
  onChangeMultiline,
}) => {
  return (
    <>
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
