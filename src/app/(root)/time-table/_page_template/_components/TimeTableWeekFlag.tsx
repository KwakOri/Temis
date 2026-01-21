import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { COMP_COLORS, COMP_FONTS } from "../_settings/settings";

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
    <p
      className="absolute flex justify-center items-center z-40"
      style={{
        fontSize: 68,
        fontWeight: 500,
        width: 1000,
        height: 100,
        fontFamily: COMP_FONTS.WEEKLY_FLAG,
        color: COMP_COLORS.WEEKLY_FLAG,
        top: 664,
        left: 1848,
      }}
    >
      {start.year}.{padZero(start.month)}.{padZero(start.date)} - {end.year}.{padZero(end.month)}.{padZero(end.date)}
    </p>
    // <div
    //   className="absolute flex flex-col z-40"
    //   style={{
    //     fontSize: 75,
    //     fontWeight: 900,
    //     fontFamily: COMP_FONTS.WEEKLY_FLAG,
    //     top: 1820,
    //     left: 568,
    //   }}
    // >
    //   <p style={{ lineHeight: 1.3 }}>
    //     <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
    //       {start.monthEn.upper}
    //     </span>{" "}
    //     <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
    //       {padZero(start.date)}
    //     </span>
    //   </p>
    //   <p style={{ lineHeight: 1.3 }}>
    //     <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
    //       {end.monthEn.upper}
    //     </span>{" "}
    //     <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
    //       {padZero(end.date)}
    //     </span>
    //   </p>
    // </div>
  );
};

export default TimeTableWeekFlag;
