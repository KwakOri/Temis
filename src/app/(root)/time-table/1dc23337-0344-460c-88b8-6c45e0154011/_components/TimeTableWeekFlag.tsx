import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange } from "@/utils/date-formatter";
import { colors, fontOption } from "../_settings/settings";

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);

  return (
    <p
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        fontWeight: 700,
        color: colors["first"]["secondary"],
        fontSize: 64,
        width: 1000,
        height: 200,
        top: 124,
        left: 812,
      }}
    >
      {start.year}.{start.month}.{start.date} - {end.year}.{end.month}.
      {end.date}
    </p>
  );
};

export default TimeTableWeekFlag;
