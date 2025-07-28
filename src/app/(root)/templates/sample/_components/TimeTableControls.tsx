import React from "react";

interface TimeTableControlsProps {
  scale: number;
  onScaleChange: (newScale: number) => void;
}

const TimeTableControls: React.FC<TimeTableControlsProps> = ({
  scale,
  onScaleChange,
}) => {
  return (
    <div className="fixed top-4 left-4 z-50 bg-white/80 px-4 py-2 rounded select-none ">
      <label className="text-sm text-gray-600 font-medium ">
        미리보기 배율: {scale.toFixed(1)}x
      </label>
      <input
        type="range"
        min={0.3}
        max={2}
        step={0.1}
        value={scale}
        onChange={(e) => onScaleChange(parseFloat(e.target.value))}
        className="ml-2 w-60 h-2 rounded-lg appearance-none bg-gray-300
        accent-[#3E4A82]
        [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:h-5
        [&::-webkit-slider-thumb]:w-5
        [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-[#3E4A82]
        [&::-webkit-slider-thumb]:shadow-md
        [&::-moz-range-thumb]:h-5
        [&::-moz-range-thumb]:w-5
        [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:bg-[#3E4A82]
        [&::-moz-range-thumb]:shadow-md
        "
      />
    </div>
  );
};

export default TimeTableControls;
