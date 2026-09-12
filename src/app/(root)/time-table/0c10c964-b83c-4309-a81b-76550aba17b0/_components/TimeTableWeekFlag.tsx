import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { BASE_COLORS, COMP_COLORS, COMP_FONTS } from "../_settings/settings";
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
          color: COMP_COLORS.WEEKLY_FLAG,
          fontSize: 50,
          top: 501,
          left: 1600,
          width: 1600,
          height: 120,
        }}
      >
        {start.year}년 {padZero(start.month)}월 {padZero(start.date)}일 부터{" "}
        {end.year}년 {padZero(end.month)}월 {padZero(end.date)}일 까지
      </p>

      {/* <img
        src={Imgs["first"]["week_dates"].src.replace("./", "/")}
        alt="week flag"
        className="absolute inset-0 z-20"
      /> */}
    </div>
  );
};

export default TimeTableWeekFlag;
