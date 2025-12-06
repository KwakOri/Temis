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
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        fontWeight: 500,
        color: colors["first"]["secondary"],
        fontSize: 72,
        width: 1200,
        height: 100,
        rotate: "-5.3deg",
        top: 712,
        left: 480,
      }}
    >
      {start.year}/{padZero(start.month)}/{padZero(start.date)} ~ {end.year}/
      {padZero(end.month)}/{padZero(end.date)}
    </p>
  );
};

export default TimeTableWeekFlag;
