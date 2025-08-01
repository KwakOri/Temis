import React from "react";

import { TDefaultCard, TTheme } from "../../_settings/general";
import TimeTableCell from "./TimeTableCell";
import TimeTableWeekFlag from "./TimeTableWeekFlag";

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
        if (time.day === 7)
          return (
            <div key={time.day}>
              <TimeTableWeekFlag
                currentTheme={currentTheme}
                weekDates={weekDates}
              />
            </div>
          );
        if (time.day === 8) return <div key={time.day}></div>;
        return (
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
