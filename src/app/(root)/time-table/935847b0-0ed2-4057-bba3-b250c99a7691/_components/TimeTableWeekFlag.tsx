import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
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
      className="absolute z-40 flex flex-col items-center justify-start "
      style={{
        fontFamily: fontOption.primary,
        color: colors["first"]["tertiary"],
        fontSize: 53,

        width: 668,
        height: 420,
        top: 780,
        left: 1862,
        rotate: "-1.8deg",
        lineHeight: 0.8,
      }}
    >
      <div
        style={{ height: 274 }}
        className="w-full flex justify-center gap-30"
      >
        <div className="w-52 h-full  flex flex-col items-center">
          <p className="text-[62px] mt-12 font-bold">{start.monthEn.upper}</p>
          <p className="text-[156px] mt-5 font-black text-[#AC2948] ">
            {padZero(start.date)}
          </p>
        </div>
        <div className="w-52 h-full  flex flex-col items-center">
          <p className="text-[62px] mt-12 font-bold">{end.monthEn.upper}</p>
          <p className="text-[156px] mt-5 font-black text-[#AC2948] ">
            {padZero(end.date)}
          </p>
        </div>
      </div>
      <p
        style={{ height: 124 }}
        className="w-full h-20 flex justify-center items-center font-black text-[76px]"
      >
        YEAR {start.year}
      </p>
    </div>
  );
};

export default TimeTableWeekFlag;
