import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { fontOption } from "../_settings/settings";

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
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{
        fontFamily: fontOption.primary,
        color: "#FFFFFF",
      }}
    >
      <div
        className="flex flex-col justify-center absolute "
        style={{
          width: 500,
          height: 400,
          top: 936,
          left: 1824,
          rotate: "-11.3deg",
        }}
      >
        <p
          className="relative right-8 flex justify-center items-center "
          style={{ width: 200, fontSize: 180, lineHeight: 0.8 }}
        >
          {padZero(start.date)}
        </p>
        <p style={{ fontSize: 230, lineHeight: 0.8 }}>{start.monthEn.upper}</p>
      </div>
      <div
        className="flex flex-col justify-center absolute "
        style={{
          width: 500,
          height: 400,
          top: 948,
          left: 2256,
          rotate: "7.5deg",
        }}
      >
        <p
          className="relative right-8 flex justify-center items-center "
          style={{ width: 200, fontSize: 180, lineHeight: 0.8 }}
        >
          {padZero(end.date)}
        </p>
        <p style={{ fontSize: 230, lineHeight: 0.8 }}>{end.monthEn.upper}</p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
