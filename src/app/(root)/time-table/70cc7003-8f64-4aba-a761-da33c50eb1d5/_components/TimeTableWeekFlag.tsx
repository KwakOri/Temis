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
      className="absolute z-40 flex flex-col justify-center gap-4 px-20"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 86,
        width: 650,
        height: 230,
        top: 86,
        left: 2460,
        transform: "rotate(-8deg)",
        lineHeight: 1,
      }}
    >
      <p className="w-full text-left">
        {start.year}/{start.month}/{start.date}
      </p>
      <p className="w-full text-right">
        {end.year}/{end.month}/{end.date}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
