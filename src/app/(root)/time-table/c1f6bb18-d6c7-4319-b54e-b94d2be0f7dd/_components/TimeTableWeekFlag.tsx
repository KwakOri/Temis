import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { COMP_FONTS, templateSize } from '../_settings/settings';

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const Char = ({ char }: { char: string }) => {
  return (
    <p
      className="flex justify-center items-center"
      style={{
        fontFamily: COMP_FONTS.WEEKLY_FLAG,
        color: '#000000',
        fontSize: 48,
        letterSpacing: 2,
        width: 75,
        height: 72,
      }}
    >
      {char}
    </p>
  );
};

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);

  const startMonth = padZero(start.month + 1).toString();
  const startDate = padZero(start.date).toString();
  const endMonth = padZero(end.month + 1).toString();
  const endDate = padZero(end.date).toString();
  return (
    <div
      className={`absolute flex justify-center z-30`}
      style={{
        width: templateSize.width,
        height: templateSize.height,
      }}
      draggable={false}
    >
      <div
        className="absolute z-50 flex justify-start items-center"
        style={{ top: 318, left: 826, rotate: '-4.4deg' }}
      >
        <Char char={startMonth[0]} />
        <Char char={startMonth[1]} />
        <Char char={startDate[0]} />
        <Char char={startDate[1]} />
        <Char char="-" />
        <Char char={endMonth[0]} />
        <Char char={endMonth[1]} />
        <Char char={endDate[0]} />
        <Char char={endDate[1]} />
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
