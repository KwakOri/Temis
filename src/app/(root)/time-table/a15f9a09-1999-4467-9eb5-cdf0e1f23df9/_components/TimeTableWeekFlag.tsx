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
        color: colors["first"]["primary"],
        fontSize: 60,
        width: 420,
        height: 200,
        top: 132,
        left: 156,
      }}
    >
      {start.month}/{start.date} ~ {end.month}/{end.date}
    </p>
  );
};

export default TimeTableWeekFlag;
