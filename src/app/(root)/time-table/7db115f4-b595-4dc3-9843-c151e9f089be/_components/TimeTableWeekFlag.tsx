import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { COMP_FONTS } from '../_settings/settings';

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
          width: 160,
          height: 160,
          left: 1684,
          top: 140,
          color: '#FFFFFF',
        }}
      >
        <p
          style={{
            fontFamily: COMP_FONTS.WEEKLY_MEMO,
            fontSize: 96,
            lineHeight: 1,
          }}
        >
          {padZero(start.date)}
        </p>
        <p
          style={{
            fontFamily: COMP_FONTS.WEEKLY_MEMO,
            fontSize: 48,
            lineHeight: 1,
          }}
        >
          {start.monthEn.upper}
        </p>
      </div>
      <div
        className="absolute flex flex-col justify-center items-center z-40"
        style={{
          width: 160,
          height: 160,
          left: 1960,
          top: 220,
          color: '#FFFFFF',
        }}
      >
        <p
          style={{
            fontFamily: COMP_FONTS.WEEKLY_MEMO,
            fontSize: 96,
            lineHeight: 1,
          }}
        >
          {padZero(end.date)}
        </p>
        <p
          style={{
            fontFamily: COMP_FONTS.WEEKLY_MEMO,
            fontSize: 48,
            lineHeight: 1,
          }}
        >
          {end.monthEn.upper}
        </p>
      </div>
    </>
  );
};

export default TimeTableWeekFlag;
