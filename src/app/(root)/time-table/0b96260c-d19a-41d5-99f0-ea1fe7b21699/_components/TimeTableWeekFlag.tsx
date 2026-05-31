import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
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
      <p
        className="absolute z-50 flex justify-center items-center"
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          fontSize: 48,
          top: 468,
          left: 2920,
          width: 900,
          height: 100,
          rotate: '5.9deg',
        }}
      >
        {padZero(start.month)}.{padZero(start.date)} (MON) ~{' '}
        {padZero(end.month)}.{padZero(end.date)} (SUN)
      </p>
      <img
        className="absolute inset-0 object-cover"
        src={Imgs['first']['week_dates'].src}
        alt="week_dates"
      />
    </div>
  );
};

export default TimeTableWeekFlag;
