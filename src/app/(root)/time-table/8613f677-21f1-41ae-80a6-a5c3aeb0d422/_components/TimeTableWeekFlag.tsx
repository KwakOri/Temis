import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { colors, fontOption, Settings } from "../_settings/settings";

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
      className="absolute z-40 grid grid-rows-2 justify-center items-center"
      style={{
        fontFamily: fontOption.primary,
        color: Settings.week.fontColor,
        fontSize: Settings.week.fontSize,
        width: Settings.week.flag.width,
        height: Settings.week.flag.height,
        top: 212,
        left: 1802,
      }}
    >
      <div className="flex flex-col justify-start items-center text-center w-full h-full pt-40 gap-5 ">
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 152,
            lineHeight: 1,
          }}
        >
          {padZero(start.date)}
        </p>
        <p style={{ color: Settings.week.fontColor, lineHeight: 1 }}>
          {start.monthEn.upper}
        </p>
      </div>
      <div className="flex flex-col justify-start items-center text-center w-full h-full pt-46 gap-5 ">
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 152,
            lineHeight: 1,
          }}
        >
          {padZero(end.date)}
        </p>
        <p style={{ color: Settings.week.fontColor, lineHeight: 1 }}>
          {end.monthEn.upper}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
