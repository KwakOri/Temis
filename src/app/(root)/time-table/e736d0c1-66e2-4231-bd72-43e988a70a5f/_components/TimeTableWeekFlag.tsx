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
    <div
      className="flex justify-center items-center absolute z-40 "
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 68,
        width: 720,
        height: 692,
        top: 764,
        left: 1800,
      }}
    >
      <div
        style={{ width: 600, height: 300 }}
        className="grid grid-cols-2 grid-rows-2 items-center justify-center mt-8"
      >
        <p
          style={{ fontSize: 108 }}
          className="flex justify-center items-center"
        >
          {start.month}월
        </p>
        <p
          style={{ fontSize: 108 }}
          className="flex justify-center items-center"
        >
          {end.month}월
        </p>
        <p
          style={{
            fontSize: 92,
            color: colors[currentTheme || "first"]["secondary"],
          }}
          className="flex justify-center items-center"
        >
          {start.date}일
        </p>
        <p
          style={{
            fontSize: 92,
            color: colors[currentTheme || "first"]["secondary"],
          }}
          className="flex justify-center items-center"
        >
          {end.date}일
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
