import React from "react";

import AutoResizeText from "@/components/AutoResizeTextCard/AutoResizeText";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  V2TemplateCardNode,
  V2TemplateCardStyleKey,
} from "@/types/time-table/v2_template_render_config";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { createPlaceholdersFromConfig, weekdays } from "@/utils/time-table/data";
import { v2_getComponentFontFamily } from "@/utils/time-table/v2_template_render_config";
import { Imgs } from "../../_img/imgs";
import { v2_getHighlightStyle } from "./v2_highlight";
import { v2_toRenderableStyle } from "./v2_style";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
  day: number;
  currentTheme?: TTheme;
}

interface OnlineCardBGProps {
  currentTheme?: TTheme;
}

const v2_toCardStyleMap = (
  cardLayoutRecord: Record<string, unknown>,
  styleKey: V2TemplateCardStyleKey
): Record<string, string | number> => {
  const raw = cardLayoutRecord[styleKey];
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, string | number>;
};

const v2_resolveRenderableCardLayout = (
  styleMap: Record<string, string | number>
): { style: React.CSSProperties; width?: string | number } => {
  const { widthPercent, ...layoutRaw } = styleMap;
  const style = v2_toRenderableStyle(layoutRaw);
  const width =
    typeof widthPercent === "number"
      ? `${widthPercent}%`
      : typeof widthPercent === "string"
        ? widthPercent
        : style.width;

  return {
    style,
    ...(width !== undefined ? { width } : {}),
  };
};

const v2_getDefaultMaxFontSizeByBinding = ({
  binding,
  mainTitleMax,
  subTitleMax,
}: {
  binding: V2TemplateCardNode["binding"];
  mainTitleMax: number;
  subTitleMax: number;
}): number => {
  if (binding === "mainTitle") return mainTitleMax;
  if (binding === "subTitle") return subTitleMax;
  return mainTitleMax;
};

const v2_getCardNodeTextValue = ({
  node,
  dayLabel,
  weekDate,
  isGuerrilla,
  entryTime,
  entryMainTitle,
  entrySubTitle,
  placeholders,
}: {
  node: V2TemplateCardNode;
  dayLabel: string;
  weekDate: Date;
  isGuerrilla: boolean;
  entryTime: string;
  entryMainTitle: string;
  entrySubTitle: string;
  placeholders: Record<string, string>;
}): string => {
  switch (node.binding) {
    case "streamingDay":
      return dayLabel;
    case "streamingDate":
      return padZero(weekDate.getDate());
    case "streamingTime":
      return isGuerrilla ? "게릴라" : formatTime(entryTime, "half");
    case "mainTitle":
      return entryMainTitle || placeholders.mainTitle || "";
    case "subTitle":
      return entrySubTitle || placeholders.subTitle || "";
    default:
      return "";
  }
};

const OnlineCardBG = ({ currentTheme }: OnlineCardBGProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.online;
  const onlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "onlineByTheme",
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ??
    Imgs[currentTheme || "first"]?.online?.src ??
    Imgs.first.online.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      className="absolute -z-10"
    >
      <img className="h-full w-full object-cover" src={onlineUrl} alt="online" />
    </div>
  );
};

const OfflineCard = ({ day, currentTheme }: OfflineCardProps) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.offline;
  const offlineUrl =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "offlineByTheme",
      currentTheme: currentTheme || renderConfig.defaultTheme,
    }) ??
    Imgs[currentTheme || "first"]?.offline?.src ??
    Imgs.first.offline.src;

  return (
    <div
      style={{
        ...cardSize,
      }}
      key={day}
    >
      <img
        src={offlineUrl}
        alt="offline"
        style={{
          ...cardSize,
        }}
      />
    </div>
  );
};

const TimeTableCell: React.FC<TimeTableCellProps> = ({
  time,
  weekDate,
  currentTheme,
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget, isLayerHidden } =
    useV2TimeTableEditorRuntimeContext();
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const cardStructure = renderConfig.structure.card;
  const cardSize = renderConfig.cardSizes.online;
  const cardContainerStyleMap = v2_toCardStyleMap(
    cardLayoutRecord,
    cardStructure.containerStyleKey
  );
  const cardContainerLayout = v2_toRenderableStyle(cardContainerStyleMap);
  const weekdayByOption = weekdays[renderConfig.weekdayOption] ?? weekdays.en;
  const dayLabel = weekdayByOption[time.day] ?? "";
  const placeholders = createPlaceholdersFromConfig({
    cardInputConfig: renderConfig.cardInputConfig,
  });

  if (!weekDate) return "Loading";
  if (isLayerHidden(cardStructure.containerLayerId)) return null;

  const primaryEntry = time.entries?.[0] || {};
  const entryTime = (primaryEntry.time as string) || "09:00";
  const entryMainTitle = (primaryEntry.mainTitle as string) || "";
  const entrySubTitle = (primaryEntry.subTitle as string) || "";

  const renderCardNode = (nodeId: string) => {
    const node = cardStructure.nodes[nodeId];
    if (!node) return null;
    if (isLayerHidden(node.layerId)) return null;

    const containerStyleMap = v2_toCardStyleMap(
      cardLayoutRecord,
      node.containerStyleKey
    );
    const { style: renderableContainerStyle, width } =
      v2_resolveRenderableCardLayout(containerStyleMap);
    const textStyleMap = node.textStyleKey
      ? v2_toCardStyleMap(cardLayoutRecord, node.textStyleKey)
      : {};
    const textStyle = v2_toRenderableStyle(textStyleMap);
    const wrapperStyle = node.wrapperStyleKey
      ? v2_toRenderableStyle(
          v2_toCardStyleMap(cardLayoutRecord, node.wrapperStyleKey)
        )
      : {};
    const nodeText = v2_getCardNodeTextValue({
      node,
      dayLabel,
      weekDate,
      isGuerrilla: Boolean(primaryEntry.isGuerrilla),
      entryTime,
      entryMainTitle,
      entrySubTitle,
      placeholders,
    });
    const highlightStyle = v2_getHighlightStyle({
      target: node.highlightTarget,
      hoverTarget: hoverHighlightTarget,
      activeTarget: activeHighlightTarget,
    });

    const renderPlainTextNode = () => (
      <p
        key={node.id}
        style={{
          color: renderConfig.componentColors[node.colorKey],
          fontFamily: v2_getComponentFontFamily(renderConfig, node.fontKey),
          ...renderableContainerStyle,
          ...(width !== undefined ? { width } : {}),
          ...textStyle,
          ...highlightStyle,
        }}
        className={node.containerClassName ?? "absolute flex items-center justify-center"}
      >
        {nodeText}
      </p>
    );

    const renderAutoResizeNode = () => {
      const nodeOptions = node.optionsKey
        ? ((cardLayoutRecord[node.optionsKey] as Record<string, unknown>) ?? {})
        : {};
      const maxFontSize =
        typeof nodeOptions.maxFontSize === "number"
          ? nodeOptions.maxFontSize
          : v2_getDefaultMaxFontSizeByBinding({
              binding: node.binding,
              mainTitleMax: renderConfig.maxFontSizes.MAIN_TITLE,
              subTitleMax: renderConfig.maxFontSizes.SUB_TITLE,
            });
      const multiline =
        typeof nodeOptions.multiline === "boolean" ? nodeOptions.multiline : true;

      return (
        <div
          key={node.id}
          style={{
            ...renderableContainerStyle,
            ...(width !== undefined ? { width } : {}),
            ...wrapperStyle,
            ...highlightStyle,
          }}
          className={
            node.containerClassName ?? "absolute flex items-center justify-center"
          }
        >
          {/* AutoResizeText always depends on parent box size, so wrapper div is mandatory. */}
          <AutoResizeText
            style={{
              fontFamily: v2_getComponentFontFamily(renderConfig, node.fontKey),
              color: renderConfig.componentColors[node.colorKey],
              ...textStyle,
            }}
            className={node.textClassName ?? "leading-none text-center"}
            multiline={multiline}
            maxFontSize={maxFontSize}
          >
            {nodeText}
          </AutoResizeText>
        </div>
      );
    };

    if (node.kind === "autoResizeText") {
      return renderAutoResizeNode();
    }

    return renderPlainTextNode();
  };

  return (
    <>
      {time.isOffline ? (
        <OfflineCard day={time.day} currentTheme={currentTheme} />
      ) : (
        <div
          style={{
            ...cardSize,
            ...cardContainerLayout,
            ...v2_getHighlightStyle({
              target: cardStructure.containerHighlightTarget,
              hoverTarget: hoverHighlightTarget,
              activeTarget: activeHighlightTarget,
            }),
          }}
          key={time.day}
          className="relative flex justify-center"
        >
          {cardStructure.nodeOrder.map((nodeId) => renderCardNode(nodeId))}
          <OnlineCardBG currentTheme={currentTheme} />
        </div>
      )}
    </>
  );
};

export default TimeTableCell;
