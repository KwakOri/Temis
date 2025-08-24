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
      className="absolute z-40 flex flex-col justify-between"
      style={{
        fontFamily: fontOption.primary,
        color: Settings.week.fontColor,
        fontSize: Settings.week.fontSize,
        width: Settings.week.flag.width,
        height: Settings.week.flag.height,
        top: 328,
        left: 1760,
      }}
    >
      <div
        className="grid grid-cols-2 justify-center items-center text-center"
        style={{
          width: "100%",
          height: 150,
        }}
      >
        <p>{start.monthEn.upper}</p>
        <p>{start.date}</p>
      </div>
      <div
        className="grid grid-cols-2 justify-center items-center text-center"
        style={{
          width: "100%",
          height: 150,
        }}
      >
        <p>{end.monthEn.upper}</p>
        <p>{end.date}</p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
