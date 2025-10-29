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
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        color: "#565258",
        fontSize: 40,
        width: 400,
        height: 100,
        top: 438,
        left: 1246,
      }}
    >
      <p>{`${padZero(start.month)}. ${padZero(start.date)} - ${padZero(
        end.month
      )}. ${padZero(end.date)}`}</p>
    </div>
  );
};

export default TimeTableWeekFlag;
