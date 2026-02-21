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
    <div className="relative" style={{ width: 760, height: 840 }}>
      <div
        style={{
          rotate: '10.3deg',
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: BASE_COLORS.first.primary,
          fontSize: 72,
          fontWeight: 700,
          left: 96,
          top: 208,
          width: 300,
          height: 200,
          filter: 'drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.8))',
        }}
        className="absolute flex flex-col justify-center items-center "
      >
        <p style={{ lineHeight: 1 }}>{start.monthEn.upper}</p>
        <p style={{ lineHeight: 1 }}>{start.date}</p>
      </div>
      <div
        style={{
          rotate: '-13.3deg',
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: BASE_COLORS.first.primary,
          fontSize: 72,
          fontWeight: 700,
          left: 352,
          top: 440,
          width: 300,
          height: 200,
          filter: 'drop-shadow(0px 0px 5px rgba(0, 0, 0, 0.8))',
        }}
        className="absolute flex flex-col justify-center items-center "
      >
        <p style={{ lineHeight: 1 }}>{end.monthEn.upper}</p>
        <p style={{ lineHeight: 1 }}>{end.date}</p>
      </div>
      <img src={Imgs['first']['week'].src} alt={'week'} draggable={false} />
    </div>
  );
};

export default TimeTableWeekFlag;
