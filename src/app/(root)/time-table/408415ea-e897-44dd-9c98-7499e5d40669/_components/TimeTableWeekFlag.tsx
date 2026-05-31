import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange } from '@/utils/date-formatter';
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
      className={`absolute flex justify-center z-30`}
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
          fontSize: 36,
          letterSpacing: 2,
          width: 400,
          top: 206,
          left: 700,
        }}
      >
        {start.month}.{start.date}-{end.month}.{end.date}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
