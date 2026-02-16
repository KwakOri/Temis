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
      style={{ fontFamily: fontOption.primary }}
      className="absolute inset-0 z-40 flex items-center justify-center"
    >
      <p
        className="absolute flex items-center justify-center"
        style={{
          color: colors["first"]["primary"],
          fontSize: 64,
          top: 640,
          left: 2860,
          width: 1000,
          height: 100,
          rotate: "5.7deg",
        }}
      >
        {start.year} / {padZero(start.month)} / {padZero(start.date)} ~{" "}
        {end.year} / {padZero(end.month)} / {padZero(end.date)}
      </p>
      <div
        className="flex flex-col justify-center items-center absolute gap-4 "
        style={{
          width: 500,
          height: 400,
          color: colors["first"]["tertiary"],
          top: 928,
          left: 3460,
          rotate: "-4.4deg",
        }}
      >
        <p style={{ fontSize: 110, lineHeight: 0.8 }}>{start.monthEn.upper}</p>
        <p style={{ fontSize: 96, lineHeight: 0.8 }}>{padZero(start.date)}</p>
      </div>
      <div
        className="flex flex-col justify-center items-center absolute gap-4 "
        style={{
          width: 500,
          height: 400,
          color: colors["first"]["tertiary"],
          top: 1400,
          left: 3504,
          rotate: "15.3deg",
        }}
      >
        <p style={{ fontSize: 110, lineHeight: 0.8 }}>{end.monthEn.upper}</p>
        <p style={{ fontSize: 96, lineHeight: 0.8 }}>{padZero(end.date)}</p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
