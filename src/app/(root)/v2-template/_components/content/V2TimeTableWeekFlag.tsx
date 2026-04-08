import { useTimeTableData } from '@/contexts/TimeTableContext';
import { useV2TemplateRenderConfigContext } from '@/contexts/v2/v2_TemplateRenderConfigContext';
import { useV2TimeTableEditorRuntimeContext } from '@/contexts/v2/v2_TimeTableEditorRuntimeContext';
import { getWeekDateRange, padZero } from '@/utils/date-formatter';
import { v2_getComponentFontFamily } from '@/utils/time-table/v2_template_render_config';
import {
  v2_findSceneTextNodeById,
  v2_resolveSceneTextNodeValue,
} from '@/utils/time-table/v2_scene_nodes';
import { v2_getHighlightStyle } from './v2_highlight';
import { v2_toRenderableStyle } from './v2_style';
// left -11.3 right 7.5 180/230

const TimeTableWeekFlag = () => {
  const { weekDates } = useTimeTableData();
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const {
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
    data,
    globalData,
  } = useV2TimeTableEditorRuntimeContext();
  const sceneTextNode = v2_findSceneTextNodeById(
    renderConfig.structure.sceneNodes,
    'scene-week-flag'
  );
  const weekFlagStyleKey = sceneTextNode?.containerStyleKey ?? 'weekFlag';
  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const weekFlagLayout = v2_toRenderableStyle(
    layoutRecord[weekFlagStyleKey] as Record<string, string | number>
  );
  if (weekDates.length === 0 || isLayerHidden("week-flag")) return null;

  const { start, end } = getWeekDateRange(weekDates);
  const fallbackRangeText = `${start.year}.${padZero(start.month)}.${padZero(
    start.date
  )} - ${end.year}.${padZero(end.month)}.${padZero(end.date)}`;
  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (firstCard?.entries as Record<string, unknown>[] | undefined)?.[0];
  const weekFlagText = sceneTextNode
    ? v2_resolveSceneTextNodeValue({
        node: sceneTextNode,
        fallbackValue: fallbackRangeText,
        computedValues: {
          streamingDate: fallbackRangeText,
          streamingDay: fallbackRangeText,
          streamingTime: fallbackRangeText,
        },
        entrySource: firstEntry,
        cardSource: firstCard,
        globalSource: globalData as Record<string, unknown>,
      })
    : fallbackRangeText;
  const weekFlagColorKey = sceneTextNode?.colorKey ?? 'WEEKLY_FLAG';
  const weekFlagFontKey = sceneTextNode?.fontKey ?? 'WEEKLY_FLAG';
  const weekFlagClassName =
    sceneTextNode?.containerClassName ?? 'absolute flex justify-center items-center z-40';

  return (
    <p
      className={weekFlagClassName}
      style={{
        ...weekFlagLayout,
        fontFamily:
          weekFlagLayout.fontFamily ??
          v2_getComponentFontFamily(renderConfig, weekFlagFontKey),
        color: weekFlagLayout.color ?? renderConfig.componentColors[weekFlagColorKey],
        ...v2_getHighlightStyle({
          target: sceneTextNode?.highlightTarget ?? 'weekFlag',
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        }),
      }}
    >
      {weekFlagText}
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
