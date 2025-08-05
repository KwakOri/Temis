import { TTheme } from "@/types/time-table/theme";
import { colors, fontOption } from "../../_settings/settings";

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
      className="absolute top-64 left-26 z-20 "
      style={{
        transform: "rotate(-1.5deg)",
      }}
    >
      <div
        className="absolute z-10 w-full h-full justify-center pr-1 pb-2 flex flex-col"
        style={{
          fontFamily: fontOption.primary,
        }}
      >
        <div
          style={{
            color: colors[currentTheme]["secondary"],
          }}
        >
          <p className="text-[26px] w-100 text-center">
            {startDate} ~ {endDate}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
