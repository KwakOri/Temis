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
      className="absolute z-40 flex flex-col justify-between"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["secondary"],
        fontSize: 84,
        width: 574,
        height: 980,
        top: 350,
        left: 1860,
      }}
    >
      <div className="w-full h-[140px] flex gap-12 justify-center items-center">
        <p>{start.monthEn.upper}</p>
        <p>{start.date}</p>
      </div>
      <div className="w-full h-[140px] flex gap-12 justify-center items-center">
        <p>{end.monthEn.upper}</p>
        <p>{end.date}</p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
