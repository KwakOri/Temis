import React, { Fragment } from "react";

import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
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
  const top = data.slice(0, 4);
  const bottom = data.slice(4);
  const lines = [top, bottom];
  return (
    <div
      className="absolute flex flex-col items-center z-20"
      style={{
        top: 296,
        left: 32,
        gap: 68,
        rotate: "-2deg",
      }}
    >
      <div className="flex gap-21">
        {top.map((time, i) => (
          <Fragment key={time.day}>
            <TimeTableCell
              time={time}
              currentTheme={currentTheme}
              weekDate={weekDates[i]}
              index={i}
            />
          </Fragment>
        ))}
      </div>
      <div className="flex gap-21 relative left-36">
        {bottom.map((time, i) => (
          <Fragment key={time.day}>
            <TimeTableCell
              time={time}
              currentTheme={currentTheme}
              weekDate={weekDates[i]}
              index={i}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default TimeTableGrid;
