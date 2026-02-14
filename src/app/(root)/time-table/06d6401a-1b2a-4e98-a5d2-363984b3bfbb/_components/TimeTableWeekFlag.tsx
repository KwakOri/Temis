import { TTheme } from '@/types/time-table/theme';
import { getMonthEn, getWeekDateRange, padZero } from '@/utils/date-formatter';
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
        className="absolute flex justify-center items-center z-40 "
        style={{
          fontSize: 56,
          fontWeight: 500,
          width: 400,
          height: 120,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1980,
          left: 1996,
          letterSpacing: 0,
        }}
      >
        -{start.year}-
      </p>
      <p
        className="absolute flex justify-center items-center z-40"
        style={{
          fontSize: 88,
          fontWeight: 500,
          width: 820,
          height: 120,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          bottom: 36,
          left: 420,
          letterSpacing: -14,
        }}
      >
        {getMonthEn(start.month - 1, false).upper} {padZero(start.date)}
      </p>
      <p
        className="absolute flex justify-center items-center z-40 "
        style={{
          fontSize: 88,
          fontWeight: 500,
          width: 820,
          height: 120,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          bottom: 36,
          left: 1340,
          letterSpacing: -14,
        }}
      >
        {getMonthEn(end.month - 1, false).upper} {padZero(end.date)}
      </p>
    </>
  );
};

export default TimeTableWeekFlag;
