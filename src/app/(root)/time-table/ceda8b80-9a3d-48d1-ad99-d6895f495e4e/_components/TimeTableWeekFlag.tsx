import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange } from "@/utils/date-formatter";
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
    <>
      <div
        className=" z-30 absolute  flex flex-col justify-start items-center"
        style={{
          width: 200,
          height: 200,
          top: 1040,
          left: 2450,
          rotate: "-3.5deg",
        }}
      >
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 104,
            fontFamily: fontOption.primary,
            lineHeight: 1,
            marginTop: 30,
          }}
        >
          {start.date}
        </p>
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 32,
            fontFamily: fontOption.primary,
            lineHeight: 1,
          }}
        >
          {start.monthEn.upper}
        </p>
      </div>
      <div
        className=" z-30 absolute flex flex-col justify-start items-center"
        style={{
          width: 200,
          height: 200,
          top: 1316,
          left: 2576,
          rotate: "-3.5deg",
        }}
      >
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 104,
            fontFamily: fontOption.primary,
            lineHeight: 1,
            marginTop: 30,
          }}
        >
          {end.date}
        </p>
        <p
          style={{
            color: colors["first"]["primary"],
            fontSize: 32,
            fontFamily: fontOption.primary,
            lineHeight: 1,
          }}
        >
          {end.monthEn.upper}
        </p>
      </div>
    </>
  );
};

export default TimeTableWeekFlag;
