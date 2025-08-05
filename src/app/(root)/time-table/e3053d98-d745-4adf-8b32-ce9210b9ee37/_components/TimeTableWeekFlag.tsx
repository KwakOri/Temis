import { TTheme } from "@/types/time-table/theme";
import { months } from "@/utils/time-table/data";
import { colors, fontOption } from "../_settings/settings";

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

  const startMonth = months.en[weekDates[0].getMonth()].toUpperCase();
  const startDate = splitDigits(weekDates[0].getDate());
  const endMonth = months.en[weekDates[6].getMonth()].toUpperCase();
  const endDate = splitDigits(weekDates[6].getDate());

  const dateArr = [
    {
      value: 1,
      date: startDate,
      month: startMonth,
    },
    {
      value: 2,
      date: endDate,
      month: endMonth,
    },
  ];
  return (
    <div
      className="absolute z-40 flex justify-between"
      style={{
        fontFamily: fontOption.primary,
        width: 231,
        left: 538,
        top: 304,
      }}
    >
      {dateArr.map((item) => (
        <div
          key={item.value}
          className="items-center flex flex-col "
          style={{
            color: colors[currentTheme]["primary"],
            width: 110,
          }}
        >
          <p style={{ lineHeight: 1 }} className="text-[84px] text-center">
            {item.date}
          </p>
          <p
            style={{
              marginTop: 6,
              color: colors[currentTheme]["tertiary"],
              fontSize: 22,
            }}
          >
            {item.month}
          </p>
        </div>
      ))}
      {/* <div
        className="items-center flex flex-col "
        style={{
          color: colors[currentTheme]["primary"],
          width: 110,
        }}
      >
        <p style={{ lineHeight: 1 }} className="text-[84px] text-center">
          {startDate}
        </p>
        <p
          style={{
            marginTop: 6,
            color: colors[currentTheme]["tertiary"],
            fontSize: 22,
          }}
        >
          {startMonth}
        </p>
      </div> */}
    </div>
  );
};

export default TimeTableWeekFlag;
