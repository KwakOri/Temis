import { TTheme } from '@/types/time-table/theme';
import { getWeekDateRange } from '@/utils/date-formatter';
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
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 30,
      }}
    >
      <div
        style={{
          rotate: '10.3deg',
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          fontSize: 80,
          fontWeight: 700,
          left: 40,
          bottom: 580,
        }}
        className="absolute flex flex-col justify-center items-center"
      >
        <p style={{ color: BASE_COLORS.first.tertiary, lineHeight: 1 }}>
          {start.monthEn.upper}
        </p>
        <p style={{ color: BASE_COLORS.first.primary, lineHeight: 1 }}>
          {start.date}
        </p>
      </div>
      <img src={Imgs['first']['week'].src} alt={'week'} draggable={false} />
    </div>
  );
};

export default TimeTableWeekFlag;
