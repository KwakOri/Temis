import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { createTextStroke } from '@/utils/utils';
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
        className="absolute z-50 flex justify-center items-center "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: '#564C3A',
          fontSize: 48,
          top: 248,
          left: 1388,
          fontWeight: 700,
          width: 1000,
          rotate: '-2.3deg',

          ...createTextStroke({ color: '#3A3A3A', width: 2 }),
        }}
      >
        - {padZero(start.year)}. {padZero(start.month)}. {padZero(start.date)} ~{' '}
        {padZero(end.year)}. {padZero(end.month)}. {padZero(end.date)} -
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
