import React from "react";
import type { Data } from "../TimeTableEditor";
import TimeTableCell from "./TimeTableCell";
import TimeTableHeader from "./TimeTableHeader";

interface TimeTableGridProps {
  data: Data[];
  weekDates: Date[];
}

const TimeTableGrid: React.FC<TimeTableGridProps> = ({ data, weekDates }) => {
  return (
    <div className="absolute left-12 top-20 -rotate-6 w-[640px] h-[640px]  grid grid-cols-3 grid-rows-3 gap-4 justify-center items-center rounded-md z-20">
      <TimeTableHeader weekDates={weekDates} />

      {data.map((time, i) => (
        <TimeTableCell
          key={time.day}
          time={time}
          weekDate={weekDates[i]}
          index={i}
        />
      ))}
    </div>
  );
};

export default TimeTableGrid;
