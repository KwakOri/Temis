import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { BASE_COLORS, COMP_FONTS } from "../_settings/settings";

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
        fontFamily: COMP_FONTS.WEEKLY_FLAG,
        top: 1820,
        left: 568,
      }}
    >
      <p style={{ lineHeight: 1.3 }}>
        <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
          {start.monthEn.upper}
        </span>{" "}
        <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
          {padZero(start.date)}
        </span>
      </p>
      <p style={{ lineHeight: 1.3 }}>
        <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
          {end.monthEn.upper}
        </span>{" "}
        <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
          {padZero(end.date)}
        </span>
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
