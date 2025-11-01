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
    <p
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 42,
        width: 500,
        height: 100,
        top: 1280,
        left: 2100,
        rotate: "-2.1deg",
      }}
    >
      {start.month}월 {start.date}일 ~ {end.month}월 {end.date}일
    </p>
  );
};

export default TimeTableWeekFlag;
