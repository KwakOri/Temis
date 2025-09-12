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
      className="absolute z-40 flex items-center justify-center pr-4"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["tertiary"],
        fontSize: 53,

        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 720,
        left: 1816,
      }}
    >
      <p
        className="absolute w-100 h-100 flex justify-center items-center"
        style={{
          top: -4,
          left: 0,
          fontSize: 114,
        }}
      >
        {padZero(start.date)}
      </p>
      <p
        className="absolute w-100 h-100 flex justify-center items-center"
        style={{
          top: -4,
          right: 0,
          fontSize: 108,
        }}
      >
        {start.monthEn.upper}
      </p>
      <p
        className="absolute w-100 h-100 flex justify-center items-center"
        style={{
          bottom: 2,
          right: 6,
          fontSize: 114,
        }}
      >
        {padZero(end.date)}
      </p>
      <p
        className="absolute w-100 h-100 flex justify-center items-center"
        style={{
          bottom: 4,
          left: -4,
          fontSize: 108,
        }}
      >
        {end.monthEn.upper}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
