import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { useV2TemplateRenderConfigContext } from "@/contexts/v2/v2_TemplateRenderConfigContext";

interface TimeTableWeekFlagProps {
  weekDates: Date[];
}
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = ({
  weekDates,
}: TimeTableWeekFlagProps) => {
  const { start, end } = getWeekDateRange(weekDates);
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const weekFlagLayout = renderConfig.layout.weekFlag;

  return (
    <p
      className="absolute flex justify-center items-center z-40"
      style={{
        fontSize: weekFlagLayout.fontSize,
        fontWeight: weekFlagLayout.fontWeight,
        width: weekFlagLayout.width,
        height: weekFlagLayout.height,
        fontFamily: renderConfig.componentFonts.WEEKLY_FLAG,
        color: renderConfig.componentColors.WEEKLY_FLAG,
        top: weekFlagLayout.top,
        left: weekFlagLayout.left,
      }}
    >
      {start.year}.{padZero(start.month)}.{padZero(start.date)} - {end.year}.{padZero(end.month)}.{padZero(end.date)}
    </p>
    // <div
    //   className="absolute flex flex-col z-40"
    //   style={{
    //     fontSize: 75,
    //     fontWeight: 900,
    //     fontFamily: COMP_FONTS.WEEKLY_FLAG,
    //     top: 1820,
    //     left: 568,
    //   }}
    // >
    //   <p style={{ lineHeight: 1.3 }}>
    //     <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
    //       {start.monthEn.upper}
    //     </span>{" "}
    //     <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
    //       {padZero(start.date)}
    //     </span>
    //   </p>
    //   <p style={{ lineHeight: 1.3 }}>
    //     <span style={{ color: BASE_COLORS["first"]["quaternary"] }}>
    //       {end.monthEn.upper}
    //     </span>{" "}
    //     <span style={{ color: BASE_COLORS["first"]["tertiary"] }}>
    //       {padZero(end.date)}
    //     </span>
    //   </p>
    // </div>
  );
};

export default TimeTableWeekFlag;
