import React from "react";

interface ResetButtonProps {
  onReset: () => void;
}

const ResetButton: React.FC<ResetButtonProps> = ({ onReset }) => {
  return (
    <button
      onClick={onReset}
      className="bg-red-500 shrink-0 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
    >
      리셋
    </button>
  );
};

export default ResetButton;
