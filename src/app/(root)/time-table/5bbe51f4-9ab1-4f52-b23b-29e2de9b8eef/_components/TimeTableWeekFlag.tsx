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
      className="flex justify-start items-center absolute z-40"
      style={{
        fontFamily: fontOption.secondary,
        color: colors["first"]["secondary"],
        fontSize: 120,
        width: 900,
        height: 100,
        bottom: 160,
        left: 1900,
        rotate: "-8deg",
        letterSpacing: 2,
      }}
    >
      <p>
        {start.year}/{start.month}/{start.date} ~ {end.year}/{end.month}/
        {end.date}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
