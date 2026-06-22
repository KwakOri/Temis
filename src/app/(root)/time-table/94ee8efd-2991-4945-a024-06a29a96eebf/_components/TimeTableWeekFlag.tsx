import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { Imgs } from '../_img/imgs';
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
      className={`absolute inset-0 flex justify-center z-30`}
      draggable={false}
    >
      <p
        className="absolute z-40 flex justify-start items-center "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: '#3B47D7',
          fontSize: 54,
          width: 600,
          top: 310,
          left: 1700,
        }}
      >
        {padZero(start.month)}.{padZero(start.date)} ~ {padZero(end.month)}.
        {padZero(end.date)}
      </p>
      <img
        src={Imgs['first']['week_dates'].src}
        alt="week_dates"
        className="absolute inset-0 object-cover"
        draggable={false}
      />
    </div>
  );
};

export default TimeTableWeekFlag;
