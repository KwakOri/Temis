import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
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
    <p
      className="absolute z-40 flex justify-center items-center"
      style={{
        fontFamily: fontOption.primary,
        fontWeight: 700,
        color: Settings.week.fontColor,
        fontSize: Settings.week.fontSize,
        width: Settings.week.flag.width,
        height: Settings.week.flag.height,
        top: 684,
        left: 1880,
      }}
    >
      {start.year.toString().split("").slice(2).join("")}.{padZero(start.month)}
      .{padZero(start.date)} (MON) ~{" "}
      {end.year.toString().split("").slice(2).join("")}.{padZero(end.month)}.
      {padZero(end.date)} (SUN)
    </p>
  );
};

export default TimeTableWeekFlag;
