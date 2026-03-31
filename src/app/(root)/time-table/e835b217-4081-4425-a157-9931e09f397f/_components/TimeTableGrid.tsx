import React, { Fragment } from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { Imgs } from '../_img/imgs';
import { CARD_SIZES, COMP_FONTS } from '../_settings/settings';
import TimeTableCell from './TimeTableCell';

const WeeklyMemoCard = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      {isMemoTextVisible && (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          className="relative flex justify-center items-center"
        >
          <p
            style={{
              fontFamily: COMP_FONTS.STREAMING_DAY,
              color: '#FFFFFF',
              fontSize: 78,
              top: 20,
              left: 40,
              lineHeight: 1,
            }}
            className="absolute"
          >
            MEMO
          </p>
          <div
            style={{
              height: 400,
              width: '80%',
              top: 200,
            }}
            className="absolute flex justify-center items-center shrink-0"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.MAIN_TITLE,
                color: '#FFFFFF',
                letterSpacing: -2,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
              className="leading-none text-center"
              multiline={true}
              maxFontSize={72}
            >
              {memoText || '메모 내용을\n적어주세요'}
            </AutoResizeText>
          </div>
          <img
            className="object-cover w-full h-full"
            src={Imgs['first']['memo'].src.replace('./', '/')}
            alt="memo"
          />
        </div>
      )}
    </>
  );
};

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
      style={{ left: 100, top: 584, rowGap: 28, columnGap: 32 }}
      className="absolute grid grid-cols-4 z-20"
    >
      {data.map((time, i) => (
        <Fragment key={time.day}>
          <TimeTableCell
            time={time}
            currentTheme={currentTheme}
            weekDate={weekDates[i]}
            index={i}
          />
        </Fragment>
      ))}
      <WeeklyMemoCard />
    </div>
  );
};

export default TimeTableGrid;
