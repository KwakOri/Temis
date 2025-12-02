import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { fontOption } from "../_settings/settings";

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
        fontFamily: fontOption.primary,
        color: "#C1F1F5",
        fontSize: 64,
        width: 700,
        height: 100,
        top: 1602,
        left: 2274,
        rotate: "-3.2deg",
      }}
    >
      <p>{`${start.monthEn.upper} ${padZero(start.date)} TO ${
        end.monthEn.upper
      } ${padZero(end.date)}`}</p>
    </div>
  );
};

export default TimeTableWeekFlag;
