import React, { Fragment } from 'react';

import { AutoResizeText } from '@/components/AutoResizeTextCard';
import { useTimeTableData } from '@/contexts/TimeTableContext';
import { TDefaultCard } from '@/types/time-table/data';
import { TTheme } from '@/types/time-table/theme';
import { Imgs } from '../_img/imgs';
import { BASE_COLORS, CARD_SIZES, COMP_FONTS } from '../_settings/settings';
import TimeTableCell from './TimeTableCell';

interface TimeTableGridProps {
  data: TDefaultCard[];
  weekDates: Date[];
  currentTheme: TTheme;
}

const ProfileMemo = () => {
  const { isMemoTextVisible, memoText } = useTimeTableData();
  return (
    <>
      {isMemoTextVisible && (
        <div
          style={{ ...CARD_SIZES.ONLINE }}
          className="relative flex justify-center"
        >
          <div
            className="absolute flex justify-center items-center"
            style={{ top: 212, width: 540, height: 340 }}
          >
            <AutoResizeText
              style={{
                color: BASE_COLORS.first.tertiary,
                fontFamily: COMP_FONTS.MAIN_TITLE,
              }}
              maxFontSize={100}
            >
              {memoText || '메모를 작성해주세요'}
            </AutoResizeText>
          </div>
          <div
            style={{
              ...CARD_SIZES.ONLINE,
            }}
            className="absolute -z-10"
          >
            <img
              className="object-cover w-full h-full"
              src={Imgs['first']['memo'].src.replace('./', '/')}
              alt="memo"
            />
          </div>
        </div>
      )}
    </>
  );
};

const TimeTableGrid: React.FC<TimeTableGridProps> = ({
  data,
  weekDates,
  currentTheme,
}) => {
  return (
    <div
      style={{ left: 208, top: 194, rowGap: 12, columnGap: 8 }}
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
      <ProfileMemo />
    </div>
  );
};

export default TimeTableGrid;
