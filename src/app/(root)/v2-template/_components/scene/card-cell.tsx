import React from "react";

import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import {
  useTemplateRenderConfigContext,
  getAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { TDefaultCard } from "@/types/time-table/data";
import { TTheme } from "@/types/time-table/theme";
import {
  V2TemplateCardNode,
  V2TemplateComponentInstanceBindingOverrides,
  V2TemplateCardStructure,
  V2TemplateDayKey,
  V2TemplateCardStyleKey,
} from "@/types/time-table/template-render-config";
import { padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import {
  v2_dayKeyFromIndex,
  v2_getComponentFontFamily,
  v2_isEntryFieldBindingKey,
  v2_parseDayKey,
  v2_resolveDayLabelByKey,
  v2_isVisibleByMode,
} from "@/utils/time-table/template-render-config";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./card-node-renderers";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle, v2_toRenderableStyle } from "./render-style";

interface TimeTableCellProps {
  time: TDefaultCard;
  weekDate: Date;
  index: number;
  dayKeyOverride?: V2TemplateDayKey;
  currentTheme: TTheme;
  cardStructure: V2TemplateCardStructure;
  bindingOverrides?: V2TemplateComponentInstanceBindingOverrides;
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
  const style = v2_toRenderableLayoutStyle(layoutRaw);
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

const v2_resolveEntryFromBinding = ({
  binding,
  entries,
}: {
  binding: V2TemplateCardNode["binding"];
  entries: Array<Record<string, unknown>>;
}): Record<string, unknown> => {
  if (binding.mode !== "field" || binding.scope !== "entry") {
    return entries[0] ?? {};
  }
  const preferredIndex =
    binding.entrySelector?.mode === "index" ? binding.entrySelector.index : 0;
  if (!Number.isFinite(preferredIndex)) {
    return entries[0] ?? {};
  }
  const safeIndex = Math.max(0, Math.floor(preferredIndex));
  return entries[safeIndex] ?? entries[0] ?? {};
};

const v2_getCardNodeTextValue = ({
  node,
  dayLabel,
  weekDate,
  isGuerrilla,
  selectedEntry,
  cardData,
  entryTime,
  placeholdersByScope,
  globalData,
}: {
  node: V2TemplateCardNode;
  dayLabel: string;
  weekDate: Date;
  isGuerrilla: boolean;
  selectedEntry: Record<string, unknown>;
  cardData: Record<string, unknown>;
  entryTime: string;
  placeholdersByScope: Record<string, Record<string, string>>;
  globalData: Record<string, unknown>;
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
    const entryMainTitle = v2_toTextValue(selectedEntry.mainTitle) ?? "";
    const knownMainTitle =
      entryMainTitle ||
      placeholdersByScope.entry.mainTitle ||
      placeholdersByScope.card.mainTitle ||
      placeholdersByScope.global.mainTitle;
    if (knownMainTitle) return knownMainTitle;
  }

  if (node.binding.key === "subTitle") {
    const entrySubTitle = v2_toTextValue(selectedEntry.subTitle) ?? "";
    const knownSubTitle =
      entrySubTitle ||
      placeholdersByScope.entry.subTitle ||
      placeholdersByScope.card.subTitle ||
      placeholdersByScope.global.subTitle;
    if (knownSubTitle) return knownSubTitle;
  }

  const source =
    node.binding.scope === "entry"
      ? selectedEntry
      : node.binding.scope === "card"
        ? cardData
        : node.binding.scope === "global"
          ? globalData
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
  const { renderConfig } = useTemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.online;
  const onlineUrl = getAssetUrlFromConfig({
    renderConfig,
    key: "onlineByTheme",
    currentTheme: currentTheme || renderConfig.defaultTheme,
  });
  if (!onlineUrl) return null;

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
  const { renderConfig } = useTemplateRenderConfigContext();
  const cardSize = renderConfig.cardSizes.offline;
  const offlineUrl = getAssetUrlFromConfig({
    renderConfig,
    key: "offlineByTheme",
    currentTheme: currentTheme || renderConfig.defaultTheme,
  });
  if (!offlineUrl) return null;

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
  dayKeyOverride,
  index,
  currentTheme,
  cardStructure,
  bindingOverrides,
}) => {
  const { renderConfig } = useTemplateRenderConfigContext();
  const { hoverHighlightTarget, activeHighlightTarget, isLayerHidden, globalData } =
    useTemplateEditorRuntimeContext();
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const cardIsOffline = Boolean(time.isOffline);
  const cardSize = cardIsOffline
    ? renderConfig.cardSizes.offline
    : renderConfig.cardSizes.online;
  const cardContainerStyleMap = v2_toCardStyleMap(
    cardLayoutRecord,
    cardStructure.containerStyleKey
  );
  // Card root must stay in normal grid/flex flow unless position is explicitly set.
  // Auto-injecting absolute from offset props makes all cards overlap at one point.
  const cardContainerLayout = v2_toRenderableStyle(cardContainerStyleMap);
  const dayKey =
    dayKeyOverride ?? v2_parseDayKey(time.day) ?? v2_dayKeyFromIndex(index);
  const dayLabel = v2_resolveDayLabelByKey({
    dayKey,
    dayLabelFormat: renderConfig.dayLabelFormat,
    fallbackWeekdayOption: renderConfig.weekdayOption,
  });
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
  const entryCount = Math.max(
    1,
    Array.isArray(time.entries) ? time.entries.length : 0
  );
  const entryTime = (primaryEntry.time as string) || "09:00";

  const renderCardNode = (nodeId: string) => {
    const node = cardStructure.nodes[nodeId];
    if (!node) return null;
    if (isLayerHidden(node.layerId)) return null;
    if (
      !v2_isVisibleByMode({
        mode: node.visibilityMode,
        isOffline: cardIsOffline,
        entryCount,
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
      ? v2_toRenderableLayoutStyle(
          v2_toCardStyleMap(cardLayoutRecord, node.wrapperStyleKey)
        )
      : {};
    const effectiveBinding = bindingOverrides?.[node.id] ?? node.binding;
    const selectedEntry = v2_resolveEntryFromBinding({
      binding: effectiveBinding,
      entries: (time.entries ?? []) as Array<Record<string, unknown>>,
    });
    const nodeText = v2_getCardNodeTextValue({
      node: {
        ...node,
        binding: effectiveBinding,
      },
      dayLabel,
      weekDate,
      isGuerrilla: Boolean(primaryEntry.isGuerrilla),
      selectedEntry,
      cardData: time as Record<string, unknown>,
      entryTime,
      placeholdersByScope,
      globalData: globalData as Record<string, unknown>,
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
              binding: effectiveBinding,
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
      {v2_isVisibleByMode({
        mode: "onlineOnly",
        isOffline: cardIsOffline,
        entryCount,
      }) ? (
        <OnlineCardBG currentTheme={currentTheme} />
      ) : null}
      {v2_isVisibleByMode({
        mode: "offlineOnly",
        isOffline: cardIsOffline,
        entryCount,
      }) ? (
        <OfflineCardBG currentTheme={currentTheme} />
      ) : null}
    </div>
  );
};

export default TimeTableCell;
