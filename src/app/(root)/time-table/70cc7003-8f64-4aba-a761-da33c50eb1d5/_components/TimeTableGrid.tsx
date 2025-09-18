import React, { Fragment } from "react";

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
  const leftGridItems = data.slice(0, 4);
  const rightGridItems = data.slice(4, 7);

  return (
    <>
      <div
        className="absolute grid grid-cols-2 grid-rows-2 z-20"
        style={{
          bottom: 42,
          left: 180,
          columnGap: 60,
          rowGap: 16,
          transform: "rotate(-8deg)",
        }}
      >
        {leftGridItems.map((time, i) => (
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
        className="absolute grid grid-rows-3 z-20"
        style={{
          top: 212,
          left: 1886,
          rowGap: 10,
          transform: "rotate(-8deg)",
        }}
      >
        {rightGridItems.map((time, i) => (
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
    </>
  );
};

export default TimeTableGrid;
