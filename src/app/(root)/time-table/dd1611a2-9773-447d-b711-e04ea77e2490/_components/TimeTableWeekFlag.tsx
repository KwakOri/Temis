import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { colors, fontOption } from "../_settings/settings";

const local_months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
      className="absolute z-40 grid grid-rows-2 items-center justify-center"
      style={{
        fontFamily: fontOption.primary,

        fontSize: 53,

        width: 412,
        height: 586,
        top: 696,
        left: 1846,
        rotate: "1.4deg",
      }}
    >
      <div className="flex flex-col justify-center items-center">
        <p
          style={{
            color: colors["first"]["tertiary"],
            fontSize: 62,
          }}
        >
          {local_months[start.month - 1]}
        </p>
        <p
          style={{
            color: colors["first"]["secondary"],
            fontSize: 76,
          }}
        >
          {padZero(start.date)}
        </p>
      </div>
      <div className="flex flex-col justify-center items-center">
        <p
          style={{
            color: colors["first"]["tertiary"],
            fontSize: 62,
          }}
        >
          {local_months[end.month - 1]}
        </p>
        <p
          style={{
            color: colors["first"]["secondary"],
            fontSize: 76,
          }}
        >
          {padZero(end.date)}
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
