import { useTimeTableData } from '@/contexts/TimeTableContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useV2TimeTableEditorRuntimeContext } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { v2_getComponentFontFamily } from '@/utils/time-table/v2_template_render_config';
import { v2_getHighlightStyle } from './v2_highlight';
import { v2_toRenderableStyle } from './v2_style';
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = () => {
  const { weekDates } = useTimeTableData();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget, isLayerHidden } =
    useV2TimeTableEditorRuntimeContext();
  const weekFlagLayout = v2_toRenderableStyle(renderConfig.layout.weekFlag);
  if (weekDates.length === 0 || isLayerHidden("week-flag")) return null;

  const { start, end } = getWeekDateRange(weekDates);

  return (
    <p
      className="absolute flex justify-center items-center z-40"
      style={{
        ...weekFlagLayout,
        fontFamily:
          weekFlagLayout.fontFamily ??
          v2_getComponentFontFamily(renderConfig, 'WEEKLY_FLAG'),
        color: weekFlagLayout.color ?? renderConfig.componentColors.WEEKLY_FLAG,
        ...v2_getHighlightStyle({
          target: 'weekFlag',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
    >
      {start.year}.{padZero(start.month)}.{padZero(start.date)} - {end.year}.
      {padZero(end.month)}.{padZero(end.date)}
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
