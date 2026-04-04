import React, { Fragment } from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { Imgs } from '../_img/imgs';
import { CARD_SIZES, COMP_COLORS, COMP_FONTS } from '../_settings/settings';
import TimeTableCell from './TimeTableCell';

const WeeklyMemoCard = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();

  return (
    <>
      <img
        src={Imgs['first']['memoObject'].src.replace('./', '/')}
        alt="memoObject"
        className="absolute z-40"
        style={{
          top: isMemoTextVisible ? 812 : 980,
          left: isMemoTextVisible ? 750 : 560,
        }}
      />
      {isMemoTextVisible && (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          className="relative flex justify-center items-center"
        >
          <div
            style={{
              height: 388,
              width: '80%',
              top: 112,
            }}
            className="absolute flex justify-center items-center shrink-0"
          >
            <AutoResizeText
              style={{
                fontFamily: COMP_FONTS.ARTIST,
                color: COMP_COLORS.ARTIST,
                fontWeight: 700,
              }}
              className="leading-none text-center"
              multiline={true}
              maxFontSize={96}
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
      style={{
        left: 328,
        top: 328,
        rowGap: 24,
        columnGap: 24,
        rotate: '-2.3deg',
      }}
      className="absolute grid grid-cols-3 z-20"
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
