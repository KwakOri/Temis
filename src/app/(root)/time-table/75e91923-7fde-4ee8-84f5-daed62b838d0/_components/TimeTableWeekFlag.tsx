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
      className="flex flex-col justify-start items-center absolute z-40 gap-50"
      style={{
        fontFamily: fontOption.primary,

        color: colors["first"]["secondary"],

        width: 240,
        height: 600,
        top: 450,
        left: 1470,
        rotate: "-3.4deg",
      }}
    >
      <div style={{ width: 240, height: 240 }} className="relative">
        <p
          className="absolute"
          style={{
            top: 30,
            left: 8,
            fontFamily: fontOption.secondary,
            fontWeight: 500,
            fontSize: 64,
          }}
        >
          {padZero(start.date)}
        </p>
        <p
          className="absolute w-full flex justify-center items-center"
          style={{
            height: 120,
            top: 92,
            left: 8,
            fontFamily: fontOption.secondary,
            fontWeight: 700,
            fontSize: 88,
          }}
        >
          {start.monthEn.upper}
        </p>
      </div>
      <div style={{ width: 240, height: 240, left: 4 }} className=" relative">
        <p
          className="absolute"
          style={{
            top: 30,
            left: 8,
            fontFamily: fontOption.secondary,
            fontWeight: 500,
            fontSize: 64,
          }}
        >
          {padZero(end.date)}
        </p>
        <p
          className="absolute w-full flex justify-center items-center"
          style={{
            height: 120,
            top: 92,
            left: 8,
            fontFamily: fontOption.secondary,
            fontWeight: 700,
            fontSize: 88,
          }}
        >
          {end.monthEn.upper}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
