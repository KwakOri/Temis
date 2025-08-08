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
      className="absolute z-40 flex justify-center items-center"
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["primary"],
        fontSize: 66,
        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 550,
        right: 1020,
        outline: "1px solid red",
      }}
    >
      <span>
        {startDate} - {endDate}
      </span>
    </div>
  );
};

export default TimeTableWeekFlag;
