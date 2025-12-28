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
      className="absolute grid grid-cols-3 justify-center items-center z-20"
      style={{
        top: 288,
        left: 1796,
        rowGap: 40,
        columnGap: 32,
        rotate: "-3.8deg",
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
          {i === 0 && (
            <>
              <div></div>
              <div></div>
            </>
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
