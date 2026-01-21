import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { BASE_COLORS, COMP_FONTS } from "../_settings/settings";
import "./../_styles/index.css";

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
    <div className="flex justify-center items-center">
      <div
        className="absolute flex flex-col z-40"
        style={{
          fontSize: 96,
          fontWeight: 900,
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          top: 1792,
          left: 600,
        }}
      >
        <p className="mix" data-text={start.monthEn.upper + " " + padZero(start.date)} style={{ lineHeight: 1.1, }}>
          <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
            {start.monthEn.upper}
          </span>{" "}
          <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
            {padZero(start.date)}
          </span>
        </p>
        <p className="mix ml-8" data-text={end.monthEn.upper + " " + padZero(end.date)} style={{ lineHeight: 1.1 }}>
          <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
            {end.monthEn.upper}
          </span>{" "}
          <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
            {padZero(end.date)}
          </span>
        </p>
      </div>

    </div>
  );
};

export default TimeTableWeekFlag;
