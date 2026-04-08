import React from "react";

interface ResetButtonProps {
  onReset: () => void;
}

const ResetButton: React.FC<ResetButtonProps> = ({ onReset }) => {
  return (
    <button
      onClick={onReset}
      className="shrink-0 border border-[#5c2d32] bg-[#7a3239] hover:bg-[#914049] text-white font-bold py-2 px-4 rounded transition-colors"
    >
      리셋
    </button>
  );
};

export default ResetButton;
