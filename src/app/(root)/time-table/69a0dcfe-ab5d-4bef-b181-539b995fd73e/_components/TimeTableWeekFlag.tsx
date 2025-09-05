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
      className="absolute z-40 flex flex-col justify-around"
      style={{
        fontFamily: fontOption.secondary,
        color: Settings.week.fontColor,
        fontSize: Settings.week.fontSize,
        width: Settings.week.flag.width,
        height: Settings.week.flag.height,
        rotate: "-3.6deg",
        lineHeight: 1,
        top: 1912,
        left: 1920,
      }}
    >
      <p className="text-left font-bold">{start.full.split(".").join("/")}</p>
      <p className="text-right font-bold">{end.full.split(".").join("/")}</p>
    </div>
  );
};

export default TimeTableWeekFlag;
