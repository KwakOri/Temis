import React from "react";

interface TimeTableControlsProps {
  scale: number;
  onScaleChange: (newScale: number) => void;
  mondayDateStr: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadClick: () => void;
}

const TimeTableControls: React.FC<TimeTableControlsProps> = ({
  scale,
  onScaleChange,
  mondayDateStr,
  onDateChange,
  onDownloadClick,
}) => {
  return (
    <div className="w-full p-4 flex justify-between">
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 font-medium">
          미리보기 배율: {scale.toFixed(1)}x
        </label>
        <input
          type="range"
          min={0.3}
          max={2}
          step={0.1}
          value={scale}
          onChange={(e) => onScaleChange(parseFloat(e.target.value))}
          className="w-64"
        />
      </div>
      <div className="p-4">
        <label>
          기준 월요일 선택:{" "}
          <input type="date" value={mondayDateStr} onChange={onDateChange} />
        </label>
      </div>
      <button
        onClick={onDownloadClick}
        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
      >
        이미지로 저장 (1280x720)
      </button>
    </div>
  );
};

export default TimeTableControls;
