import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange } from '@/utils/date-formatter';

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
    <></>
    // <p
    //   className="absolute flex justify-center items-center z-40"
    //   style={{
    //     fontSize: 68,
    //     fontWeight: 500,
    //     width: 1000,
    //     height: 100,
    //     fontFamily: COMP_FONTS.WEEKLY_FLAG,
    //     color: COMP_COLORS.WEEKLY_FLAG,
    //     top: 664,
    //     left: 1848,
    //   }}
    // >
    //   {start.year}.{padZero(start.month)}.{padZero(start.date)} - {end.year}.
    //   {padZero(end.month)}.{padZero(end.date)}
    // </p>
  );
};

export default TimeTableWeekFlag;
