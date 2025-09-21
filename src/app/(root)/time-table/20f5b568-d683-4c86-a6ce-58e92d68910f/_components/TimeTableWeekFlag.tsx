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
      className="absolute z-40 flex flex-col items-center justify-center "
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 106,
        gap: 60,
        width: 480,
        height: 480,
        top: 1462,
        left: 2100,
        rotate: "-4.2deg",
      }}
    >
      <p>
        {padZero(start.month)} / {start.date}
      </p>
      <p>
        {padZero(end.month)} / {end.date}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
