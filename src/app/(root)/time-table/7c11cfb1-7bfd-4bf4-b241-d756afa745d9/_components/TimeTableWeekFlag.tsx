import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange } from "@/utils/date-formatter";
import {
  colors,
  fontOption,
  weekFlagCardHeight,
  weekFlagCardWidth,
} from "../_settings/settings";

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
      className="absolute z-40 flex items-center justify-center"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["tertiary"],
        fontSize: 52,

        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 348,
        left: 760,
        rotate: "-2.5deg",
      }}
    >
      {start.year}/{start.month}/{start.date} ~ {end.year}/{end.month}/
      {end.date}
    </div>
  );
};

export default TimeTableWeekFlag;
