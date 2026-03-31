import React, { Fragment } from 'react';

import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import TimeTableCell from './TimeTableCell';

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
  const topLine = data.slice(0, 3); // 앞에서 3개
  const bottomLine = data.slice(3, 7); // 다음 4개
  const lines = [topLine, bottomLine];

  return (
    <div
      style={{ left: 1512, top: 560 }}
      className="absolute z-20 flex flex-col justify-center items-center"
    >
      <div className="flex justify-center items-center gap-5">
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
      <div className="relative -top-12 flex justify-center items-center gap-5">
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
