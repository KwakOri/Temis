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
        fontFamily: fontOption.primary,
        color: '#ffffff',
        fontSize: 100,
        top: 104,
        left: 1448,
        width: 1200,
        height: 100,
      }}
    >
      {start.year.toString().slice(2)}.{padZero(start.month)}.
      {padZero(start.date)} - {end.year.toString().slice(2)}.
      {padZero(end.month)}.{padZero(end.date)}
    </p>
  );
};

export default TeamTimeTableWeekDates;
