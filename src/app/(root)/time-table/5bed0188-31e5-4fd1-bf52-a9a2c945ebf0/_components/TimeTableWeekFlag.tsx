import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { colors } from "../_settings/settings";

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
      className={"absolute z-30"}
      style={{
        top: 412,
        left: 32,
        rotate: "-90deg",
        color: colors["first"]["primary"],
        fontSize: 46,
        lineHeight: 1.05,
      }}
    >
      <p style={{ letterSpacing: 4 }}>
        {start.year}/{padZero(start.month)}/{padZero(start.date)}
      </p>
      <p style={{ letterSpacing: 4 }}>
        {end.year}/{padZero(end.month)}/{padZero(end.date)}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
