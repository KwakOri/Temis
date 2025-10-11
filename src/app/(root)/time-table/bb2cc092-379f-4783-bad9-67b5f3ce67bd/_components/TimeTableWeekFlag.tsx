import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange } from "@/utils/date-formatter";
import { fontOption, Settings } from "../_settings/settings";

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
      className="absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        color: Settings.week.fontColor,
        fontSize: Settings.week.fontSize,
        width: Settings.week.flag.width,
        height: Settings.week.flag.height,
      }}
    ></div>
  );
};

export default TimeTableWeekFlag;
