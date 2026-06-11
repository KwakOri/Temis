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
    <div
      className={`absolute flex justify-center z-40`}
      style={{
        width: 1920,
        height: 1080,
      }}
      draggable={false}
    >
      <p
        className="absolute z-50 flex justify-start items-center "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: '#F1F6FF',
          fontSize: 16,
          letterSpacing: 0.4,
          width: 600,
          top: 950,
          left: 244,
          opacity: 0.9,
        }}
      >
        {start.year}.{padZero(start.month)}.{padZero(start.date)} - {end.year}.
        {padZero(end.month)}.{padZero(end.date)}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
