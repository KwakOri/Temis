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
    <div
      className={`absolute flex justify-center z-30`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      <div
        className="absolute flex justify-center items-center"
        style={{
          width: 200,
          height: 200,
          top: 1544,
          left: 1900,
          rotate: '-5.1deg',
        }}
      >
        <p
          className="absolute z-50 flex justify-center items-center "
          style={{
            fontFamily: COMP_FONTS.WEEKLY_FLAG,
            color: COMP_COLORS.WEEKLY_FLAG,
            fontSize: 60,
            fontWeight: 700,
            top: 42,
          }}
        >
          {padZero(start.month)}
        </p>
        <p
          className="absolute z-50 flex justify-center items-center "
          style={{
            fontFamily: COMP_FONTS.WEEKLY_FLAG,
            color: COMP_COLORS.WEEKLY_FLAG,
            fontSize: 80,
            fontWeight: 700,
            top: 94,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>
      <div
        className="absolute flex justify-center items-center "
        style={{
          width: 200,
          height: 200,
          top: 1838,
          left: 1876,
          rotate: '11deg',
        }}
      >
        <p
          className="absolute z-50 flex justify-center items-center "
          style={{
            fontFamily: COMP_FONTS.WEEKLY_FLAG,
            color: COMP_COLORS.WEEKLY_FLAG,
            fontSize: 60,
            fontWeight: 700,
            top: 42,
          }}
        >
          {padZero(end.month)}
        </p>
        <p
          className="absolute z-50 flex justify-center items-center "
          style={{
            fontFamily: COMP_FONTS.WEEKLY_FLAG,
            color: COMP_COLORS.WEEKLY_FLAG,
            fontSize: 80,
            fontWeight: 700,
            top: 94,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
