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
      className="absolute flex flex-col z-40"
      style={{
        fontSize: 75,
        fontWeight: 900,
        fontFamily: fontOption.primary,
        top: 1820,
        left: 568,
      }}
    >
      <p style={{ lineHeight: 1.3 }}>
        <span style={{ color: colors["first"]["quaternary"] }}>
          {start.monthEn.upper}
        </span>{" "}
        <span style={{ color: colors["first"]["tertiary"] }}>
          {padZero(start.date)}
        </span>
      </p>
      <p style={{ lineHeight: 1.3 }}>
        <span style={{ color: colors["first"]["quaternary"] }}>
          {end.monthEn.upper}
        </span>{" "}
        <span style={{ color: colors["first"]["tertiary"] }}>
          {padZero(end.date)}
        </span>
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
