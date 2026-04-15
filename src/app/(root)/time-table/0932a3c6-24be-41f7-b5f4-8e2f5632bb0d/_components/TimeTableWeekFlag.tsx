import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange } from '@/utils/date-formatter';
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
    <div className="absolute inset-0 z-40">
      <p
        className="absolute flex justify-center items-center z-10"
        style={{
          fontSize: 64,
          width: 320,
          height: 100,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1722,
          left: 2316,
          rotate: '-2.2deg',
        }}
      >
        {start.month}월 {start.date}일
      </p>
      <p
        className="absolute flex justify-center items-center z-10"
        style={{
          fontSize: 64,
          width: 320,
          height: 100,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: COMP_COLORS.WEEKLY_FLAG,
          top: 1902,
          left: 2412,
          rotate: '-2.2deg',
        }}
      >
        {end.month}월 {end.date}일
      </p>
      <img
        className="absolute inset-0"
        draggable={false}
        src={Imgs['first']['week'].src}
        alt="week"
      />
    </div>
  );
};

export default TimeTableWeekFlag;
