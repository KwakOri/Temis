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
          width: 200,
          height: 200,
          rotate: '-5deg',
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          left: 1612,
          top: 1588,
        }}
      >
        <p
          style={{
            lineHeight: 0.5,
            color: BASE_COLORS.first.secondary,
            fontSize: 90,
          }}
        >
          {start.monthEn.lower}
        </p>
        <p
          style={{
            lineHeight: 0.6,
            color: BASE_COLORS.first.primary,
            fontSize: 200,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>
      <div
        className="absolute flex flex-col justify-center items-center z-40 "
        style={{
          width: 200,
          height: 200,
          rotate: '-5deg',
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          left: 1624,
          top: 1876,
        }}
      >
        <p
          style={{
            lineHeight: 0.5,
            color: BASE_COLORS.first.secondary,
            fontSize: 90,
          }}
        >
          {end.monthEn.lower}
        </p>
        <p
          style={{
            lineHeight: 0.6,
            color: BASE_COLORS.first.primary,
            fontSize: 200,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>
    </>
  );
};

export default TimeTableWeekFlag;
