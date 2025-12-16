import { useTimeTableUI } from "@/contexts/TimeTableContext";
import { cn } from "@/lib/utils";
import React from "react";
import { cardVariants } from "./styles";

const SampleTimeTableControls: React.FC = () => {
  const { scale, updateScale } = useTimeTableUI();
  return (
    <div
      className={cn(
        cardVariants({ variant: "elevated", type: "button" }),
        "flex items-center gap-4 select-none"
      )}
      style={{ gridColumn: "span 2" }}
    >
      {/* 배율 조절 */}
      <div className="w-full flex items-center">
        <label className="text-lg font-bold text-gray-600">미리보기</label>
        <div className="flex-1 flex justify-center items-center">
          <input
            type="range"
            min={0.1}
            max={0.25}
            step={0.01}
            value={scale}
            onChange={(e) => updateScale(parseFloat(e.target.value))}
            style={{ width: "80%" }}
            className="ml-2 h-2 rounded-lg appearance-none bg-gray-300
          accent-timetable-primary
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-timetable-primary
          [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-timetable-primary
          [&::-moz-range-thumb]:shadow-md
          "
          />
        </div>
        <p className="flex justify-center items-center h-12 px-4 bg-timetable-primary text-white font-bold text-lg rounded-full">
          {(scale * 100 * 4).toFixed(0)}%
        </p>
      </div>
    </div>
  );
};

export default SampleTimeTableControls;
