import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { BASE_COLORS, COMP_FONTS } from "../_settings/settings";

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
        className="absolute z-50 flex justify-center items-center"
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: BASE_COLORS.first.primary,
          fontSize: 54,
          top: 348,
          left: 1916,
          width: 440,
          height: 120,
        }}
      >
        {start.year} . {padZero(start.month)} . {padZero(start.date)}
      </p>

      <p
        className="absolute z-50 flex justify-center items-center"
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: BASE_COLORS.first.primary,
          fontSize: 54,
          top: 348,
          left: 2376,
          width: 440,
          height: 120,
        }}
      >
        {end.year} . {padZero(end.month)} . {padZero(end.date)}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
