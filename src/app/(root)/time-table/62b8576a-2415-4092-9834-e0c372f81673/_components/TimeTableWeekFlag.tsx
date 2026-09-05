import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { BASE_COLORS, COMP_FONTS } from "../_settings/settings";
import { Imgs } from "../_img/imgs";

interface TimeTableWeekFlagProps {
  currentTheme: TTheme;
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = ({
  currentTheme,
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);

  return (
    <div
      className={`absolute flex justify-center z-30`}
      style={{
        width: 4000,
        height: 2250,
      }}
      draggable={false}
    >
      <p
        className="absolute z-50 flex justify-center items-center"
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          color: BASE_COLORS.first.secondary,
          fontSize: 90,
          top: 372,
          left: 2238,
          width: 900,
          height: 120,
          rotate: "-4.1deg",
        }}
      >
        {padZero(start.month)}.{padZero(start.date)} ~ {padZero(end.month)}.
        {padZero(end.date)}
      </p>

      <img
        src={Imgs["first"]["week_dates"].src.replace("./", "/")}
        alt="week flag"
        className="absolute inset-0 z-20"
      />
    </div>
  );
};

export default TimeTableWeekFlag;
