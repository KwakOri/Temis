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
    <p
      className="absolute flex justify-center items-center z-40"
      style={{
        fontSize: 96,
        fontWeight: 700,
        width: 1080,
        height: 100,
        fontFamily: COMP_FONTS.WEEKLY_FLAG,
        color: COMP_COLORS.WEEKLY_FLAG,
        top: 560,
        left: 2932,
        rotate: '8.1deg',
      }}
    >
      {start.year}/{padZero(start.month)}/{padZero(start.date)} - {end.year}/
      {padZero(end.month)}/{padZero(end.date)}
    </p>
  );
};

export default TimeTableWeekFlag;
