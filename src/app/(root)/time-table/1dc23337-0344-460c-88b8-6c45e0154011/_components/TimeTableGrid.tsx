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
  const top = data.slice(0, 3);

  // 아랫줄 4개
  const bottom = data.slice(3, 7);
  return (
    <div
      className="absolute z-20"
      style={{
        top: 664,
        left: 168,
      }}
    >
      <div
        style={{ gap: 58 }}
        className="flex w-full justify-center items-center"
      >
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
      <div
        style={{ gap: 58 }}
        className="flex w-full justify-center items-center relative -top-5"
      >
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
