import React from "react";

import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard } from "@/types/time-table/data";
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
      className="absolute grid grid-cols-3 z-20"
      style={{
        top: 213,
        right: 244,
        columnGap: 26,
        rowGap: 0,
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
