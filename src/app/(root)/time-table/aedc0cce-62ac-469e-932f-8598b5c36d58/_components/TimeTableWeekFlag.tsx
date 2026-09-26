import { TTheme } from "@/types/time-table/theme";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { COMP_FONTS } from "../_settings/settings";

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
      <div
        className="absolute z-50 flex flex-col  justify-center items-center "
        style={{
          fontFamily: COMP_FONTS.WEEKLY_FLAG,
          fontWeight: 700,
          color: "#882449",
          fontSize: 100,
          top: 80,
          left: 3028,
          width: 500,
          height: 300,

          rotate: "7.2deg",
        }}
      >
        <p style={{ height: 116 }}>
          {padZero(start.month)}.{padZero(start.date)}
          <span style={{ fontSize: 70, fontWeight: 400 }}> 부터</span>
        </p>

        <p style={{ height: 116 }}>
          {padZero(end.month)}.{padZero(end.date)}
          <span style={{ fontSize: 70, fontWeight: 400 }}> 까지</span>
        </p>
      </div>
    </div>
  );
};

export default TimeTableWeekFlag;
