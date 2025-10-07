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
        top: 352,
        left: 132,
        columnGap: 10,
        rowGap: 56,
        rotate: "-2deg",
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
