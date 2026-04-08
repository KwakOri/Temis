import React from "react";

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
import { weekdays } from "@/utils/time-table/data";
import {
  v2_getComponentFontFamily,
  v2_isEntryFieldBindingKey,
  v2_isVisibleByMode,
} from "@/utils/time-table/v2_template_render_config";
import { Imgs } from "../../_img/imgs";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./V2CardNodeRenderers";
import { v2_getHighlightStyle } from "./v2_highlight";
import { v2_toRenderableStyle } from "./v2_style";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  currentTheme: TTheme;
}

interface OfflineCardProps {
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
  if (v2_isEntryFieldBindingKey(binding, "mainTitle")) return mainTitleMax;
  if (v2_isEntryFieldBindingKey(binding, "subTitle")) return subTitleMax;
  return mainTitleMax;
};

const v2_toTextValue = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
};

const v2_getCardNodeTextValue = ({
  node,
  dayLabel,
  weekDate,
  isGuerrilla,
  primaryEntry,
  cardData,
  entryTime,
  entryMainTitle,
  entrySubTitle,
  placeholdersByScope,
}: {
  node: V2TemplateCardNode;
  dayLabel: string;
  weekDate: Date;
  isGuerrilla: boolean;
  primaryEntry: Record<string, unknown>;
  cardData: Record<string, unknown>;
  entryTime: string;
  entryMainTitle: string;
  entrySubTitle: string;
  placeholdersByScope: Record<string, Record<string, string>>;
}): string => {
  if (node.binding.mode === "literal") {
    return node.binding.value;
  }

  if (node.binding.mode === "computed") {
    if (node.binding.key === "streamingDay") return dayLabel;
    if (node.binding.key === "streamingDate") return padZero(weekDate.getDate());
    return isGuerrilla ? "게릴라" : formatTime(entryTime, "half");
  }

  if (node.binding.key === "mainTitle") {
    const knownMainTitle =
      entryMainTitle ||
      placeholdersByScope.entry.mainTitle ||
      placeholdersByScope.card.mainTitle ||
      placeholdersByScope.global.mainTitle;
    if (knownMainTitle) return knownMainTitle;
  }

  if (node.binding.key === "subTitle") {
    const knownSubTitle =
      entrySubTitle ||
      placeholdersByScope.entry.subTitle ||
      placeholdersByScope.card.subTitle ||
      placeholdersByScope.global.subTitle;
    if (knownSubTitle) return knownSubTitle;
  }

  const source =
    node.binding.scope === "entry"
      ? primaryEntry
      : node.binding.scope === "card"
        ? cardData
        : undefined;
  const rawValue = source?.[node.binding.key];
  const value = v2_toTextValue(rawValue);
  if (value !== null) return value;

  const scopedPlaceholder = placeholdersByScope[node.binding.scope]?.[node.binding.key];
  if (typeof scopedPlaceholder === "string") return scopedPlaceholder;

  const entryFallbackPlaceholder = placeholdersByScope.entry[node.binding.key];
  if (typeof entryFallbackPlaceholder === "string") return entryFallbackPlaceholder;

  return "";
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

const OfflineCardBG = ({ currentTheme }: OfflineCardProps) => {
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
    <div style={{ ...cardSize }} className="absolute -z-10">
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
  const cardIsOffline = Boolean(time.isOffline);
  const cardSize = cardIsOffline
    ? renderConfig.cardSizes.offline
    : renderConfig.cardSizes.online;
  const cardContainerStyleMap = v2_toCardStyleMap(
    cardLayoutRecord,
    cardStructure.containerStyleKey
  );
  const cardContainerLayout = v2_toRenderableStyle(cardContainerStyleMap);
  const weekdayByOption = weekdays[renderConfig.weekdayOption] ?? weekdays.en;
  const dayLabel = weekdayByOption[time.day] ?? "";
  const placeholdersByScope = renderConfig.formSchema.fields.reduce(
    (
      acc: Record<string, Record<string, string>>,
      field
    ): Record<string, Record<string, string>> => {
      if (!acc[field.scope]) {
        acc[field.scope] = {};
      }
      acc[field.scope][field.key] = field.placeholder;
      return acc;
    },
    {
      entry: {},
      card: {},
      global: {},
    } as Record<string, Record<string, string>>
  );

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
    if (
      !v2_isVisibleByMode({
        mode: node.visibilityMode,
        isOffline: cardIsOffline,
      })
    ) {
      return null;
    }

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
      primaryEntry: primaryEntry as Record<string, unknown>,
      cardData: time as Record<string, unknown>,
      entryTime,
      entryMainTitle,
      entrySubTitle,
      placeholdersByScope,
    });
    const highlightStyle = v2_getHighlightStyle({
      target: node.highlightTarget,
      hoverTarget: hoverHighlightTarget,
      activeTarget: activeHighlightTarget,
    });

    const fontFamily = v2_getComponentFontFamily(renderConfig, node.fontKey);
    const color = renderConfig.componentColors[node.colorKey];

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
        <V2FlexibleTextNodeRenderer
          key={node.id}
          nodeId={node.id}
          text={nodeText}
          containerStyle={renderableContainerStyle}
          width={width}
          textStyle={textStyle}
          highlightStyle={highlightStyle}
          wrapperStyle={wrapperStyle}
          containerClassName={node.containerClassName}
          textClassName={node.textClassName}
          fontFamily={fontFamily}
          color={color}
          multiline={multiline}
          maxFontSize={maxFontSize}
        />
      );
    };

    if (node.kind === "flexibleText") {
      return renderAutoResizeNode();
    }

    return (
      <V2PlainTextNodeRenderer
        key={node.id}
        nodeId={node.id}
        text={nodeText}
        containerStyle={renderableContainerStyle}
        width={width}
        textStyle={textStyle}
        highlightStyle={highlightStyle}
        containerClassName={node.containerClassName}
        fontFamily={fontFamily}
        color={color}
      />
    );
  };

  return (
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
      {v2_isVisibleByMode({ mode: "onlineOnly", isOffline: cardIsOffline }) ? (
        <OnlineCardBG currentTheme={currentTheme} />
      ) : null}
      {v2_isVisibleByMode({ mode: "offlineOnly", isOffline: cardIsOffline }) ? (
        <OfflineCardBG currentTheme={currentTheme} />
      ) : null}
    </div>
  );
};

export default TimeTableCell;
