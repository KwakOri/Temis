import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
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
    <div style={{}} className="absolute inset-0 z-30">
      <div
        className="absolute flex justify-center items-center z-40 "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,

          fontWeight: 700,
          width: 300,
          height: 300,
          top: 220,
          left: 1076,
        }}
      >
        <p
          className="absolute"
          style={{
            color: BASE_COLORS.first.primary,
            fontSize: 54,
            letterSpacing: 2,
            top: 84,
          }}
        >
          {start.monthEn.upper}
        </p>
        <p
          className="absolute"
          style={{
            color: BASE_COLORS.first.secondary,
            fontSize: 48,
            letterSpacing: 2,
            top: 148,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>
      <div
        className="absolute flex justify-center items-center z-40 "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,

          fontWeight: 700,
          width: 300,
          height: 300,
          top: 472,
          left: 1226,
        }}
      >
        <p
          className="absolute"
          style={{
            color: BASE_COLORS.first.primary,
            fontSize: 54,
            letterSpacing: 2,
            top: 84,
          }}
        >
          {end.monthEn.upper}
        </p>
        <p
          className="absolute"
          style={{
            color: BASE_COLORS.first.secondary,
            fontSize: 48,
            letterSpacing: 2,
            top: 148,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>
      <img
        className="object-cover w-full h-full"
        src={Imgs['first']['week_dates'].src.replace('./', '/')}
        draggable={false}
        alt="memo"
      />
    </div>
  );
};

export default TimeTableWeekFlag;
