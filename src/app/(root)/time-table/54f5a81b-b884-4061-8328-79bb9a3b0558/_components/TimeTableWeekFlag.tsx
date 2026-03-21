import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange } from '@/utils/date-formatter';
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
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          fontSize: 64,
          fontWeight: 700,
          width: 600,
          height: 80,
          rotate: '-1deg',
          top: 1496,
          left: 3046,
        }}
      >
        {start.year}
      </p>
      <p
        className="absolute flex justify-center items-center z-40"
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          fontSize: 100,
          fontWeight: 700,
          width: 600,
          height: 120,
          rotate: '-1deg',
          top: 1592,
          left: 3046,
        }}
      >
        {start.month}.{start.date}~{end.month}.{end.date}
      </p>
    </>
  );
};

export default TimeTableWeekFlag;
