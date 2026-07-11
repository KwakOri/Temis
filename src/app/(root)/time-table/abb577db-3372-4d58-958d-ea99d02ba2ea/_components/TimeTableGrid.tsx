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
  return (
    <div
      style={{
        left: 1936,
        top: 96,
        columnGap: 24,
        rowGap: 32,
      }}
      className="absolute grid grid-cols-3 z-30"
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
          {i === 5 && (
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
