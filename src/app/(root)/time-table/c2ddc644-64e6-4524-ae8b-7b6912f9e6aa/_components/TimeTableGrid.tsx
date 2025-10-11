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
      className="absolute grid grid-cols-3 z-30"
      style={{
        top: 132,
        right: 120,

        columnGap: 10,
        rowGap: 34,
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
