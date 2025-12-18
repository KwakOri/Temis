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
        className="flex flex-col items-center absolute z-40 "
        style={{
          fontFamily: fontOption.tertiary,
          fontWeight: 700,
          color: colors["first"]["secondary"],

          width: 300,
          height: 300,
          top: 450,
          left: 1204,
          rotate: "-6.3deg",
        }}
      >
        <p
          style={{
            marginTop: 50,
            fontSize: 104,
            color: colors["first"]["tertiary"],
          }}
        >
          {start.date}
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: 32,
            color: colors["first"]["quaternary"],
          }}
        >
          {start.monthEn.upper}
        </p>
      </div>
      <div
        className="flex flex-col items-center absolute z-40 "
        style={{
          fontFamily: fontOption.tertiary,
          fontWeight: 700,
          color: colors["first"]["secondary"],

          width: 300,
          height: 300,
          top: 844,
          left: 1248,
          rotate: "-6.3deg",
        }}
      >
        <p
          style={{
            marginTop: 50,
            fontSize: 104,
            color: colors["first"]["tertiary"],
          }}
        >
          {end.date}
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: 32,
            color: colors["first"]["quaternary"],
          }}
        >
          {end.monthEn.upper}
        </p>
      </div>
    </>
  );
};

export default TimeTableWeekFlag;
