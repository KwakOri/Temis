import React, { Fragment } from "react";

import { TTheme } from "@/types/time-table/theme";
import { TDefaultCard } from "@/utils/time-table/data";
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
        // if (time.day === 7)
        //   return (
        //     <div key={time.day}>
        //       <TimeTableWeekFlag
        //         currentTheme={currentTheme}
        //         weekDates={weekDates}
        //       />
        //     </div>
        //   );
        // if (time.day === 8) return <div key={time.day}></div>;
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

      <TimeTableWeekFlag currentTheme={currentTheme} weekDates={weekDates} />
    </div>
  );
};

export default TimeTableGrid;
