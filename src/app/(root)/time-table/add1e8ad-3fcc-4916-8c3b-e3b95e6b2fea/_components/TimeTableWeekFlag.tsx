import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
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
      className="absolute z-40 flex items-center justify-center pr-4"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["tertiary"],
        fontSize: 53,

        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 612,
        left: 1920,
        rotate: "-4deg",
      }}
    >
      {padZero(start.month)}.{padZero(start.date)} (MON) - {padZero(end.month)}.
      {padZero(end.date)} (SUN)
    </div>
  );
};

export default TimeTableWeekFlag;
