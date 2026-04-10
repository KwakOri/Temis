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
          fontSize: 36,
          width: 400,
          height: 100,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 392,
          left: 890,
          rotate: '-2.2deg',
          
        }}
      >
        {padZero(start.month)}.{padZero(start.date)} ~ {padZero(end.month)}.
        {padZero(end.date)}
      </p>
    </>
  );
};

export default TimeTableWeekFlag;
