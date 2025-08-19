import { TTheme } from "@/types/time-table/theme";
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
  const dateFormatter = (date: number) => {
    if (date < 10) return `0${date}`;
    return date;
  };

  const startDate = `${weekDates[0].getFullYear()}.${dateFormatter(
    weekDates[0].getMonth() + 1
  )}.${dateFormatter(weekDates[0].getDate())}`;
  const endDate = `${weekDates[6].getFullYear()}.${dateFormatter(
    weekDates[6].getMonth() + 1
  )}.${dateFormatter(weekDates[6].getDate())}`;

  return (
    <div
      className="absolute z-40 flex items-center justify-center pr-4"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["quaternary"],
        fontSize: 52,

        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 644,
        left: 1754,
      }}
    >
      {startDate} (MON) - {endDate} (SUN)
    </div>
  );
};

export default TimeTableWeekFlag;
