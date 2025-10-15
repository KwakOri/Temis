import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
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
    <p
      className="absolute z-40 flex items-center justify-center"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 68,
        width: 1200,
        height: 160,
        top: 508,
        left: 300,
        opacity: 0.8,
      }}
    >
      {start.year}/{padZero(start.month)}/{padZero(start.date)} ~ {end.year}/
      {padZero(end.month)}/{padZero(end.date)}
    </p>
  );
};

export default TimeTableWeekFlag;
