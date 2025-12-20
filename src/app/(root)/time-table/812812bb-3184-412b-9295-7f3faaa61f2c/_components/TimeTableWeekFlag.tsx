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
      style={{
        width: 1200,
        height: 200,
        top: 252,
        left: 1510,
        fontSize: 128,
        fontFamily: fontOption.primary,
        color: colors["first"].secondary,
        fontWeight: 400,
      }}
      className="absolute z-20"
    >
      {padZero(start.month)}/{padZero(start.date)}
      {"(월)"} ~ {padZero(end.month)}/{padZero(end.date)}
      {"(일)"}
    </p>
  );
};

export default TimeTableWeekFlag;
