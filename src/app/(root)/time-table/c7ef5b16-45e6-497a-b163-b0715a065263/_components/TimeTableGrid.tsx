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
  const row1 = data.slice(0, 4);
  const row2 = data.slice(4);

  return (
    <div
      style={{
        left: 1278,
        top: 480,
        gap: 28,
      }}
      className="absolute flex flex-col items-center z-20"
    >
      <div className="flex gap-6">
        {row1.map((time, i) => (
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
      <div className="flex gap-4">
        {row2.map((time, i) => (
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
