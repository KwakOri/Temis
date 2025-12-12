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
    <div
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["tertiary"],
        fontWeight: 500,
        fontSize: 54,
        width: 800,
        height: 100,
        top: 228,
        left: 2816,
        rotate: "4.6deg",
        letterSpacing: -3,
      }}
    >
      <p>
        {start.year}
        {". "}
        {padZero(start.month)}
        {". "}
        {padZero(start.date)} - {padZero(end.month)}
        {". "}
        {padZero(end.date)}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
