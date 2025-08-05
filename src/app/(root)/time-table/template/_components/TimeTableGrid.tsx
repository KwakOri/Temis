import React from "react";

import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard } from "@/utils/time-table/data";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  return (
    <div
      className="absolute left-11 top-21 grid grid-cols-3 z-20  gap-x-2 gap-y-3"
      style={{
        transform: "rotate(-1.5deg)",
      }}
    >
      <div></div>
      <div></div>
      {data.map((time, i) => (
        <TimeTableCell
          key={time.day}
          time={time}
          currentTheme={currentTheme}
          weekDate={weekDates[i]}
          index={i}
        />
      ))}
    </div>
  );
};

export default TimeTableGrid;
