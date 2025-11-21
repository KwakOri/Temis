import React, { CSSProperties, Fragment } from "react";

import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import TimeTableCell from "./TimeTableCell";

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

export interface CellStyles {
  0: CSSProperties;
  1: CSSProperties;
  2: CSSProperties;
  3: CSSProperties;
  4: CSSProperties;
  5: CSSProperties;
  6: CSSProperties;
}

export type CellIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  const cellStyles: CellStyles = {
    0: { top: 308, left: -4 },
    1: { top: 400, left: 804 },
    2: { top: 200, left: 1580 },
    3: { top: 20, left: 2376 },
    4: { top: 1280, left: 52 },
    5: { top: 1380, left: 870 },
    6: { top: 1224, left: 1668 },
  };
  return (
    <div className="absolute z-20" style={{}}>
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            cellStyle={cellStyles[i as CellIndex]}
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
