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
    <div
      className="flex justify-center items-center absolute z-40 "
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 68,
        width: 720,
        height: 692,
        top: 764,
        left: 1800,
      }}
    ></div>
  );
};

export default TimeTableWeekFlag;
