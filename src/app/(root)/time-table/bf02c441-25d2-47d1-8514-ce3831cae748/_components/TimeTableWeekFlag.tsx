import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { BASE_COLORS, COMP_FONTS } from '../_settings/settings';

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);

  return (
    <>
      <div
        className="absolute flex flex-col justify-center items-center z-40"
        style={{
          fontSize: 116,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          top: 1808,
          left: 2468,
          width: 200,
          height: 200,
        }}
      >
        <p style={{ lineHeight: 0.7, color: BASE_COLORS['first']['primary'] }}>
          {start.monthEn.upper}
        </p>
        <p style={{ lineHeight: 0.7, color: BASE_COLORS['first']['tertiary'] }}>
          {padZero(start.date)}
        </p>
      </div>
      <div
        className="absolute flex flex-col justify-center items-center z-40 "
        style={{
          fontSize: 116,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          top: 2064,
          left: 2610,
          width: 200,
          height: 200,
        }}
      >
        <p style={{ lineHeight: 0.7, color: BASE_COLORS['first']['primary'] }}>
          {end.monthEn.upper}
        </p>
        <p style={{ lineHeight: 0.7, color: BASE_COLORS['first']['tertiary'] }}>
          {padZero(end.date)}
        </p>
      </div>
    </>
  );
};

export default TimeTableWeekFlag;
