import { V2TemplateRenderConfig, V2TemplateSceneTextNode } from "@/types/time-table/template-render-config";
import {
  v2_dayKeyFromIndex,
  v2_parseDayKey,
} from "@/utils/v2/template-render-config";
import { v2_resolveSceneTextNodeValue } from "@/utils/v2/scene-nodes";
import { v2_buildComputedValues } from "@/utils/v2/text-formatting";

export interface V2ResolvedRuntimeTextNode {
  text: string;
  multiline: boolean;
  maxFontSize: number;
}

export const v2_resolveRuntimeTextNodeValue = ({
  node,
  renderConfig,
  weekDates,
  firstCard,
  firstEntry,
  memoText,
  memoTextFallback,
  globalData,
  resolveStyleRecordByKey,
}: {
  node: V2TemplateSceneTextNode;
  renderConfig: V2TemplateRenderConfig;
  weekDates: Date[];
  firstCard: Record<string, unknown> | undefined;
  firstEntry: Record<string, unknown> | undefined;
  memoText: string;
  memoTextFallback: string;
  globalData: Record<string, unknown>;
  resolveStyleRecordByKey: (key?: string) => unknown;
}): V2ResolvedRuntimeTextNode => {
  const optionsRaw = node.optionsKey
    ? (resolveStyleRecordByKey(node.optionsKey) as Record<string, unknown>)
    : {};

  const firstDayKey = v2_parseDayKey(firstCard?.day) ?? v2_dayKeyFromIndex(0);
  const firstWeekDate = weekDates[0];
  const entryTime = typeof firstEntry?.time === "string" ? firstEntry.time : "10:00";
  const computedValues = v2_buildComputedValues({
    dayKey: firstDayKey,
    weekDate: firstWeekDate,
    weekDates,
    entryTime,
    isGuerrilla:
      typeof firstEntry?.isGuerrilla === "boolean" ? firstEntry.isGuerrilla : false,
    renderConfig,
  });

  const fallbackWeekFlag = computedValues.weekDateRange ?? "";
  const artistTextField = renderConfig.formSchema.fields.find(
    (field) => field.scope === "global" && field.key === "artistText"
  );
  const fallbackValue =
    node.id === "scene-week-flag"
      ? fallbackWeekFlag
      : node.id === "scene-artist-text"
        ? artistTextField?.placeholder || renderConfig.artistTextPlaceholder || ""
      : node.id === "scene-memo-text"
          ? memoText || memoTextFallback || ""
          : "";

  const text = v2_resolveSceneTextNodeValue({
    node,
    fallbackValue,
    computedValues,
    entrySource: firstEntry,
    entrySources:
      (firstCard?.entries as Record<string, unknown>[] | undefined) ?? [],
    cardSource: firstCard,
    globalSource: globalData,
  });

  const multiline =
    typeof optionsRaw.multiline === "boolean" ? optionsRaw.multiline : true;
  const maxFontSize =
    node.id === "scene-artist-text" || node.id === "scene-memo-text"
      ? renderConfig.maxFontSizes.ARTIST
      : renderConfig.maxFontSizes.MAIN_TITLE;

  return {
    text,
    multiline,
    maxFontSize,
  };
};
