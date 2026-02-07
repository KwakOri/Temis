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
    <div
      className="absolute inset-0 flex flex-col z-40 "
      style={{
        fontSize: 75,
        fontWeight: 900,
        fontFamily: COMP_FONTS.WEEKLY_FLAG,
        color: BASE_COLORS['first']['primary'],
      }}
    >
      <div
        style={{ right: 434, top: 88, rotate: '14deg' }}
        className="absolute z-20 flex flex-col justify-center items-center"
      >
        <p
          style={{
            lineHeight: 1.3,
            color: BASE_COLORS['first']['tertiary'],
            fontSize: 32,
            letterSpacing: -2,
          }}
        >
          {start.monthEn.upper}
        </p>
        <p
          style={{
            lineHeight: 1.3,
            color: BASE_COLORS['first']['tertiary'],
            fontSize: 60,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>

      <div
        style={{ right: 104, top: 204, rotate: '-10deg' }}
        className="absolute z-20 flex flex-col justify-center items-center"
      >
        <p
          style={{
            lineHeight: 1.3,
            color: BASE_COLORS['first']['tertiary'],
            fontSize: 32,
            letterSpacing: -2,
          }}
        >
          {end.monthEn.upper}
        </p>
        <p
          style={{
            lineHeight: 1.3,
            color: BASE_COLORS['first']['tertiary'],
            fontSize: 60,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>

      <img
        className="absolute inset-0 pointer-events-none"
        draggable={false}
        src={Imgs['first'].weekDates.src}
        alt="week-flag"
      />
    </div>
  );
};

export default TimeTableWeekFlag;
