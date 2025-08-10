import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import {
  colors,
  fontOption,
  weekFlagCardHeight,
  weekFlagCardWidth,
} from "../_settings/settings";

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
      className="absolute z-40 flex justify-center items-center"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["secondary"],
        fontSize: 66,
        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 360,
        left: 0,
      }}
    >
      <div
        className="absolute flex flex-col items-center justify-end py-5"
        style={{
          width: 350,
          height: 440,
          transform: "rotate(-11deg)",
          top: 94,
          left: 80,
        }}
      >
        <p
          className="flex justify-center items-center"
          style={{ height: 280, width: "100%", fontSize: 160 }}
        >
          {padZero(start.date)}
        </p>
        <p
          className="flex justify-center items-center"
          style={{ height: 70, width: "100%", fontSize: 48 }}
        >
          {start.monthEn.upper}
        </p>
      </div>
      <div
        className="absolute flex flex-col items-center justify-end py-5"
        style={{
          width: 350,
          height: 440,
          transform: "rotate(7deg)",
          top: 20,
          right: 76,
        }}
      >
        <p
          className="flex justify-center items-center"
          style={{ height: 280, width: "100%", fontSize: 160 }}
        >
          {padZero(end.date)}
        </p>
        <p
          className="flex justify-center items-center"
          style={{ height: 70, width: "100%", fontSize: 48 }}
        >
          {end.monthEn.upper}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
