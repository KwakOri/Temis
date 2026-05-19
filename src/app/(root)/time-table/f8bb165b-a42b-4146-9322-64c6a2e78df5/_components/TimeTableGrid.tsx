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
  const topLine = data.slice(0, 4);
  const bottomLine = data.slice(4);
  return (
    <>
      <div
        style={{
          left: 1312,
          top: 720,
          gap: 8,
        }}
        className="absolute flex z-20"
      >
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
      <div
        style={{
          left: 1640,
          top: 1364,
          gap: 24,
        }}
        className="absolute flex z-20"
      >
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
    </>
  );
};

export default TimeTableGrid;
