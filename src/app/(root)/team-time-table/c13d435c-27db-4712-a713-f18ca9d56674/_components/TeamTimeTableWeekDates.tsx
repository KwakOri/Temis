import { useTimeTableData } from '@/contexts/TimeTableContext';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { colors, fontOption } from '../_settings/settings';

const TeamTimeTableWeekDates = () => {
  const { weekDates } = useTimeTableData();

  const { start, end } = getWeekDateRange(weekDates);
  const weekTime = Math.ceil(start.date / 7);
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 40,
      }}
      className="flex justify-center items-center"
    >
      <p
        className="absolute z-10 flex justify-center items-center "
        style={{
          fontFamily: fontOption.primary,
          color: colors.first.secondary,
          fontSize: 64,
          top: 804,
          left: 192,
          fontWeight: 700,
          width: 600,
          height: 100,
          textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
        }}
      >
        {padZero(start.month)} 월 {weekTime}주차
      </p>
      <p
        className="absolute z-10 flex justify-center items-center "
        style={{
          fontFamily: fontOption.primary,
          color: colors.first.secondary,
          fontSize: 36,
          top: 926,
          left: 192,
          fontWeight: 700,
          width: 600,
          height: 48,
          textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
        }}
      >
        {start.full} ~ {end.full}
      </p>
      {/* <img
        className={'absolute inset-0'}
        src={Imgs['first']['week'].src}
        alt="memo"
        draggable={false}
      /> */}
    </div>
  );
};

export default TeamTimeTableWeekDates;
