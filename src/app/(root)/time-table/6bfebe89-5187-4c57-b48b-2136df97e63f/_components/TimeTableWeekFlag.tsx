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
    <div
      className="flex flex-col justify-center absolute z-40 "
      style={{
        fontFamily: fontOption.primary,
        fontWeight: 700,
        color: colors["first"]["secondary"],
        fontSize: 68,
        width: 510,
        height: 354,
        top: 290,
        left: 2412,
        rotate: "8deg",
      }}
    >
      <div
        style={{
          height: 86,
          width: "100%",
          fontSize: 44,
        }}
        className=" flex"
      >
        <p
          style={{}}
          className="w-full h-full flex justify-center items-center"
        >
          에서
        </p>
        <p
          style={{}}
          className="w-full h-full flex justify-center items-center"
        >
          까지
        </p>
      </div>
      <div
        style={{
          width: "100%",
          fontSize: 80,
        }}
        className=" flex grow"
      >
        <div className="w-full h-full flex flex-col justify-center items-center">
          <p style={{ lineHeight: 1.1 }}>{start.month}월</p>
          <p style={{ lineHeight: 1.1 }}>{start.date}일</p>
        </div>
        <div className="w-full h-full flex flex-col justify-center items-center">
          <p style={{ lineHeight: 1.1 }}>{end.month}월</p>
          <p style={{ lineHeight: 1.1 }}>{end.date}일</p>
        </div>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
