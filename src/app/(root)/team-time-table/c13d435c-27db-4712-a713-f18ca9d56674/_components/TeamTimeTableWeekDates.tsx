import { useTimeTableData } from '@/contexts/TimeTableContext';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { fontOption } from '../_settings/settings';

const TeamTimeTableWeekDates = () => {
  const { weekDates } = useTimeTableData();

  const { start, end } = getWeekDateRange(weekDates);
  const weekTime = Math.ceil(start.date / 7);
  return (
    <p
      className="absolute z-40 flex justify-center items-center"
      style={{
        fontFamily: fontOption.tertiary,
        color: '#FDEFF3',
        fontSize: 44,
        top: 472,
        left: 144,
        fontWeight: 700,
        width: 600,
        height: 60,
        textShadow: '0px 0px 4px rgba(0, 0, 0, 0.5)',
        letterSpacing: 4,
      }}
    >
      {padZero(start.month)}.{padZero(start.date)} - {padZero(end.month)}.
      {padZero(end.date)}
    </p>
  );
};

export default TeamTimeTableWeekDates;
