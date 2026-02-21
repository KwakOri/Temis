import React, { Fragment } from 'react';

import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import TimeTableCell from './TimeTableCell';
import TimeTableWeekFlag from './TimeTableWeekFlag';

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
      style={{ width: 2600, right: -112, top: 100, rowGap: 8 }}
      className="absolute flex flex-wrap z-20 justify-center"
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
            <TimeTableWeekFlag
              weekDates={weekDates}
              currentTheme={currentTheme}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default TimeTableGrid;
