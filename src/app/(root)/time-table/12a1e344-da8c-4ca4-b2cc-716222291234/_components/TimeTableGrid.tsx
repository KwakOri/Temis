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
  return (
    <div
      className="absolute grid grid-cols-3 z-20"
      style={{
        columnGap: 48,
        rowGap: 0,
        top: 76,
        left: 146,
      }}
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
          {(i === 1 || i === 3) && <div></div>}
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
