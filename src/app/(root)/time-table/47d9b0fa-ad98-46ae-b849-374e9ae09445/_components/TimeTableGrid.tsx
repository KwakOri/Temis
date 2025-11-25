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
  const topLine = data.slice(0, 2); // 앞에서 2개
  const middleLine = data.slice(2, 5); // 다음 3개
  const bottomLine = data.slice(5, 7); // 마지막 2개
  return (
    <div
      style={{
        top: 148,
        left: 1540,
      }}
      className="absolute inset-0 z-20 flex flex-col gap-4"
    >
      <div className="flex gap-7">
        {topLine.map((time, i) => (
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
        {middleLine.map((time, i) => (
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
      <div className="flex gap-7">
        {bottomLine.map((time, i) => (
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
