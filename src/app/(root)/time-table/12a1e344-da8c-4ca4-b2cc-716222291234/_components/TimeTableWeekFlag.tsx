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
      className="flex justify-center items-center absolute z-40"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 68,
        width: 800,
        height: 692,
        top: 764,
        left: 1760,
      }}
    >
      <p
        style={{
          width: 640,
          height: 200,
          fontSize: 128,
          fontFamily: fontOption.primary,
          fontWeight: 700,
          color: colors["first"]["tertiary"],
          top: 92,
          left: 100,
          rotate: "-2deg",
        }}
        className="absolute flex justify-center items-center"
      >
        {start.month}월 {start.date}일
      </p>
      <p
        style={{
          width: 640,
          height: 200,
          fontSize: 128,
          fontFamily: fontOption.primary,
          fontWeight: 700,
          color: colors["first"]["quaternary"],
          top: 416,
          left: 80,
          rotate: "4.4deg",
        }}
        className="absolute flex justify-center items-center"
      >
        {end.month}월 {end.date}일
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
