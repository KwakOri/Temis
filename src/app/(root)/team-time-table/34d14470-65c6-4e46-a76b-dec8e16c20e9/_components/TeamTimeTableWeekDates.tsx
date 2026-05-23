import { useTimeTableData } from '@/contexts/TimeTableContext';
import { getWeekDateRange } from '@/utils/date-formatter';
import { colors, fontOption } from '../_settings/settings';

const TeamTimeTableWeekDates = () => {
  const { weekDates } = useTimeTableData();

  const { start, end } = getWeekDateRange(weekDates);
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 30,
      }}
      className="flex justify-center items-center"
    >
      <p
        className="absolute"
        style={{
          fontFamily: fontOption.primary,
          color: colors.first.tertiary,
          fontSize: 60,
          top: 452,
        }}
      >
        {start.full} ~ {end.full}
      </p>
    </div>
  );
};

export default TeamTimeTableWeekDates;
