import React from "react";

import {
  Data,
  ThemeTypes,
} from "@/app/test/_components/TimeTablePreview/types";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: Data[];
  weekDates: Date[];
  currentTheme: ThemeTypes;
}

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  return (
    <div className="absolute bottom-11 left-2 flex gap-2 justify-center items-center rounded-md z-20 w-[780px] flex-wrap">
      {/* <TimeTableHeader weekDates={weekDates} /> */}

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
