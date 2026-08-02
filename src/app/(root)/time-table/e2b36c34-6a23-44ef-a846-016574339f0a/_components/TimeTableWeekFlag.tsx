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
          color: '#2E211A',
          fontSize: 90,
          top: 616,
          left: 148,
          width: 1600,
          height: 120,
          rotate: '-3deg',
        }}
      >
        주간 일정표 :: {padZero(start.month)}/{padZero(start.date)} ~{' '}
        {padZero(end.month)}/{padZero(end.date)}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
