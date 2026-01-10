import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { colors, fontOption } from "../_settings/settings";

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);

  return (
    <div
      style={{ top: 1450, left: 124, rotate: "-2deg", gap: 42 }}
      className="absolute z-40 flex flex-col items-center justify-center"
    >
      <div
        className=" flex flex-col items-center justify-center"
        style={{ width: 286, height: 286 }}
      >
        <p
          style={{
            color: colors["first"]["secondary"],
            lineHeight: 1.15,
            fontFamily: fontOption.primary,
            fontSize: 100,
          }}
        >
          {start.monthEn.upper}
        </p>
        <p
          style={{
            color: colors["first"]["secondary"],
            lineHeight: 1.15,
            fontFamily: fontOption.primary,
            fontSize: 80,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>
      <div
        className=" flex flex-col items-center justify-center"
        style={{ width: 286, height: 286 }}
      >
        <p
          style={{
            color: colors["first"]["secondary"],
            lineHeight: 1.15,
            fontFamily: fontOption.primary,
            fontSize: 100,
          }}
        >
          {end.monthEn.upper}
        </p>
        <p
          style={{
            color: colors["first"]["secondary"],
            lineHeight: 1.15,
            fontFamily: fontOption.primary,
            fontSize: 80,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
