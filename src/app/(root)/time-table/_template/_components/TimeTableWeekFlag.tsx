import { TTheme } from "@/types/time-table/theme";
import {
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
  const splitDigits = (num: number) =>
    num.toString().padStart(2, "0").split("");

  const startMonth = weekDates[0].getMonth();
  const startDate = weekDates[0].getDate();
  const endMonth = weekDates[6].getMonth();
  const endDate = weekDates[6].getDate();

  return (
    <div
      className="absolute z-40 flex justify-between"
      style={{
        fontFamily: fontOption.primary,
        width: weekFlagCardWidth,
        height: weekFlagCardHeight,
        top: 0,
        left: 0,
      }}
    ></div>
  );
};

export default TimeTableWeekFlag;
