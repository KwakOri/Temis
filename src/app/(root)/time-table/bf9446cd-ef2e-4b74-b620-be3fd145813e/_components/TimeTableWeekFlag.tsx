import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { COMP_COLORS, COMP_FONTS } from '../_settings/settings';

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
      <p
        className="absolute flex justify-center items-center z-40"
        style={{
          fontSize: 100,

          width: 540,
          height: 140,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1052,
          left: 1630,
        }}
      >
        -{start.year}-
      </p>
      <p
        className="absolute flex justify-start items-center z-40"
        style={{
          fontSize: 100,

          width: 540,
          height: 140,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1210,
          left: 1668,
        }}
      >
        {padZero(start.month)}.{padZero(start.date)} ~
      </p>

      <p
        className="absolute flex justify-end items-center z-40 "
        style={{
          fontSize: 100,

          width: 524,
          height: 140,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1320,
          left: 1660,
        }}
      >
        {padZero(end.month)}.{padZero(end.date)}
      </p>
    </>
  );
};

export default TimeTableWeekFlag;
