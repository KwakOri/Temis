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
    <div className="absolute bottom-7 left-5 grid grid-cols-3 z-40" style={{}}>
      {data.map((time, i) => {
        return time.day === 1 || time.day === 3 ? (
          <Fragment key={time.day}>
            <TimeTableCell
              time={time}
              currentTheme={currentTheme}
              weekDate={weekDates[time.day]}
              index={i}
            />
            <div></div>
          </Fragment>
        ) : (
          <TimeTableCell
            key={time.day}
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[time.day]}
            index={i}
          />
        );
      })}
    </div>
  );
};

export default TimeTableGrid;
