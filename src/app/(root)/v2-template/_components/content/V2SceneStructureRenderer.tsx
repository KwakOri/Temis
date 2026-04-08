import React, { useMemo } from "react";

import { useTimeTableData } from "@/contexts/TimeTableContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import { V2TemplateLayerNode } from "@/types/time-table/v2_template_render_config";
import {
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneGroupNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/v2_template_render_config";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
import {
  v2_getComponentFontFamily,
  v2_isVisibleByMode,
} from "@/utils/time-table/v2_template_render_config";
import { v2_resolveSceneTextNodeValue } from "@/utils/time-table/v2_scene_nodes";
import { Imgs } from "../../_img/imgs";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./V2CardNodeRenderers";
import V2TimeTableGrid from "./V2TimeTableGrid";
import { v2_getHighlightStyle } from "./v2_highlight";
import { v2_toRenderableStyle } from "./v2_style";

const v2_collectLayerTargetById = (
  nodes: V2TemplateLayerNode[]
): Record<string, string> => {
  const next: Record<string, string> = {};
  const stack = [...nodes];

  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) continue;
    if (node.target) {
      next[node.id] = node.target;
    }
    if (node.children?.length) {
      stack.unshift(...node.children);
    }
  }

  return next;
};

const v2_assetFallbackMap = {
  bgByTheme: "bg",
  topObjectByTheme: "topObject",
  onlineByTheme: "online",
  offlineByTheme: "offline",
  profileFrameByTheme: "profileFrame",
  profileBgByTheme: "artist",
  guideByTheme: null,
} as const;

const v2_toRenderableLayout = (
  value: unknown
): {
  style: React.CSSProperties;
  width?: string | number;
} => {
  if (!value || typeof value !== "object") return { style: {} };
  const raw = value as Record<string, unknown>;
  const { widthPercent, ...layoutRaw } = raw;
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

const V2SceneStructureRenderer = ({
  sceneNodes,
}: {
  sceneNodes: V2TemplateSceneNode[];
}) => {
  const { renderConfig } = useV2TemplateRenderConfigContext();
  const {
    data,
    globalData,
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useV2TimeTableEditorRuntimeContext();
  const { weekDates, profileText, imageSrc } = useTimeTableData();
  const layerTargetMap = useMemo(
    () => v2_collectLayerTargetById(renderConfig.structure.layers),
    [renderConfig.structure.layers]
  );

  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (firstCard?.entries as Record<string, unknown>[] | undefined)?.[0];
  const firstCardOffline = Boolean(firstCard?.isOffline);

  const resolveStyleRecordByKey = (key?: string): unknown => {
    if (!key) return {};
    if (cardLayoutRecord[key] && typeof cardLayoutRecord[key] === "object") {
      return cardLayoutRecord[key];
    }
    if (layoutRecord[key] && typeof layoutRecord[key] === "object") {
      return layoutRecord[key];
    }
    return {};
  };

  const renderTextNode = (node: V2TemplateSceneTextNode) => {
    const layout = v2_toRenderableLayout(
      resolveStyleRecordByKey(node.containerStyleKey)
    );
    const textStyle = v2_toRenderableStyle(
      resolveStyleRecordByKey(node.textStyleKey)
    );
    const wrapperStyle = v2_toRenderableStyle(
      resolveStyleRecordByKey(node.wrapperStyleKey)
    );
    const optionsRaw = node.optionsKey
      ? (resolveStyleRecordByKey(node.optionsKey) as Record<string, unknown>)
      : {};

    const weekdayByOption = weekdays[renderConfig.weekdayOption] ?? weekdays.en;
    const firstDayRaw =
      firstCard && typeof firstCard.day === "string"
        ? weekdayByOption[firstCard.day as keyof typeof weekdayByOption]
        : "";
    const firstDayLabel =
      typeof firstDayRaw === "string" || typeof firstDayRaw === "number"
        ? String(firstDayRaw)
        : "";
    const firstWeekDate = weekDates[0];
    const firstDateLabel =
      firstWeekDate instanceof Date && !Number.isNaN(firstWeekDate.getTime())
        ? padZero(firstWeekDate.getDate())
        : "";
    const entryTime =
      typeof firstEntry?.time === "string" ? firstEntry.time : "10:00";
    const firstTimeLabel =
      typeof firstEntry?.isGuerrilla === "boolean" && firstEntry.isGuerrilla
        ? "게릴라"
        : formatTime(entryTime, "half");

    const hasWeekDates = weekDates.length > 0;
    const fallbackWeekFlag = hasWeekDates
      ? (() => {
          const { start, end } = getWeekDateRange(weekDates);
          return `${start.year}.${padZero(start.month)}.${padZero(
            start.date
          )} - ${end.year}.${padZero(end.month)}.${padZero(end.date)}`;
        })()
      : "";
    const fallbackValue =
      node.id === "scene-week-flag"
        ? fallbackWeekFlag
        : node.id === "scene-profile-text"
          ? profileText || renderConfig.profileTextPlaceholder || ""
          : "";
    const text = v2_resolveSceneTextNodeValue({
      node,
      fallbackValue,
      computedValues: {
        streamingDay: firstDayLabel,
        streamingDate: firstDateLabel,
        streamingTime: firstTimeLabel,
      },
      entrySource: firstEntry,
      cardSource: firstCard,
      globalSource: globalData as Record<string, unknown>,
    });

    const resolvedTarget =
      node.highlightTarget ??
      (node.layerId ? layerTargetMap[node.layerId] : undefined);
    const highlightStyle =
      resolvedTarget && !node.id.startsWith("scene-background")
        ? v2_getHighlightStyle({
            target: resolvedTarget,
            hoverTarget: hoverHighlightTarget,
            activeTarget: activeHighlightTarget,
          })
        : {};
    const fontFamily = v2_getComponentFontFamily(renderConfig, node.fontKey);
    const color = renderConfig.componentColors[node.colorKey];

    if (node.kind === "flexibleText") {
      const multiline =
        typeof optionsRaw.multiline === "boolean" ? optionsRaw.multiline : true;
      const maxFontSize =
        typeof optionsRaw.maxFontSize === "number" && Number.isFinite(optionsRaw.maxFontSize)
          ? optionsRaw.maxFontSize
          : node.id === "scene-profile-text"
            ? renderConfig.maxFontSizes.ARTIST
            : renderConfig.maxFontSizes.MAIN_TITLE;

      return (
        <V2FlexibleTextNodeRenderer
          key={node.id}
          nodeId={node.id}
          text={text}
          containerStyle={layout.style}
          width={layout.width}
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
    }

    return (
      <V2PlainTextNodeRenderer
        key={node.id}
        nodeId={node.id}
        text={text}
        containerStyle={layout.style}
        width={layout.width}
        textStyle={textStyle}
        highlightStyle={highlightStyle}
        containerClassName={node.containerClassName}
        textClassName={node.textClassName}
        fontFamily={fontFamily}
        color={color}
      />
    );
  };

  const renderAssetNode = (node: V2TemplateSceneAssetNode) => {
    const isProfileImage = node.layerId === "profile-image";
    const isProfileFrame = node.layerId === "profile-frame";
    const isBackground = node.assetKey === "bgByTheme";
    const isGuideOverlay = node.assetKey === "guideByTheme";

    if (isProfileImage) {
      const uploadedProfileImage =
        typeof imageSrc === "string" && imageSrc.trim() ? imageSrc : null;
      if (!uploadedProfileImage) return null;
      const profileImageStyle = v2_toRenderableStyle(
        resolveStyleRecordByKey(node.styleKey)
      );
      const profileImageTarget = node.layerId ? layerTargetMap[node.layerId] : undefined;
      const profileImageHighlightStyle = profileImageTarget
        ? v2_getHighlightStyle({
            target: profileImageTarget,
            hoverTarget: hoverHighlightTarget,
            activeTarget: activeHighlightTarget,
          })
        : {};

      return (
        <div
          key={node.id}
          style={{
            ...renderConfig.cardSizes.profile,
            position: "absolute",
            ...profileImageStyle,
            ...profileImageHighlightStyle,
          }}
        >
          <img
            src={uploadedProfileImage}
            alt={node.alt ?? node.label}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: node.fit ?? "cover",
            }}
          />
        </div>
      );
    }

    const configuredAssetUrl = v2_getAssetUrlFromConfig({
      renderConfig,
      key: node.assetKey,
      currentTheme,
    });
    const fallbackTheme =
      Imgs[currentTheme as keyof typeof Imgs] ?? Imgs[renderConfig.defaultTheme as keyof typeof Imgs] ?? Imgs.first;
    const fallbackKey = v2_assetFallbackMap[node.assetKey];
    const fallbackAssetUrl =
      fallbackKey &&
      typeof fallbackTheme[fallbackKey] === "object" &&
      fallbackTheme[fallbackKey] &&
      "src" in fallbackTheme[fallbackKey]
        ? (fallbackTheme[fallbackKey] as { src: string }).src
        : null;

    const assetUrl = configuredAssetUrl ?? fallbackAssetUrl;
    if (!assetUrl) return null;

    const style = v2_toRenderableStyle(resolveStyleRecordByKey(node.styleKey));
    const resolvedTarget = node.layerId ? layerTargetMap[node.layerId] : undefined;
    const highlightStyle = resolvedTarget
      ? v2_getHighlightStyle({
          target: resolvedTarget,
          hoverTarget: hoverHighlightTarget,
          activeTarget: activeHighlightTarget,
        })
      : {};

    const baseStyle: React.CSSProperties = isBackground
      ? {
          position: "absolute",
          inset: 0,
          width: renderConfig.templateSize.width,
          height: renderConfig.templateSize.height,
          zIndex: 0,
        }
      : isGuideOverlay
        ? {
            position: "absolute",
            inset: 0,
            width: renderConfig.templateSize.width,
            height: renderConfig.templateSize.height,
            zIndex: 999,
            pointerEvents: "none",
          }
        : isProfileImage
          ? {
              ...renderConfig.cardSizes.profile,
              position: "absolute",
            }
          : isProfileFrame
            ? {
                ...renderConfig.cardSizes.frame,
                position: "absolute",
              }
            : {
                position: "absolute",
              };

    const fit = node.fit ?? "cover";

    return (
      <div
        key={node.id}
        style={{
          ...baseStyle,
          ...style,
          ...highlightStyle,
        }}
      >
        <img
          src={assetUrl}
          alt={node.alt ?? node.label}
          draggable={false}
          className={isGuideOverlay ? "h-full w-full object-cover" : undefined}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
          }}
        />
      </div>
    );
  };

  const renderCardCollectionNode = (node: V2TemplateSceneCardCollectionNode) => {
    if (node.source === "card") {
      return <V2TimeTableGrid key={node.id} />;
    }
    return null;
  };

  const renderSceneNode = (
    node: V2TemplateSceneNode,
    parentHidden: boolean
  ): React.ReactNode => {
    const hiddenByLayer =
      parentHidden || (node.layerId ? isLayerHidden(node.layerId) : false);
    const visibleByMode = v2_isVisibleByMode({
      mode: node.visibilityMode,
      isOffline: firstCardOffline,
    });
    if (hiddenByLayer || !visibleByMode) return null;

    if (node.kind === "group") {
      return (
        <React.Fragment key={node.id}>
          {node.children.map((childNode) => renderSceneNode(childNode, false))}
        </React.Fragment>
      );
    }
    if (node.kind === "asset") return renderAssetNode(node);
    if (node.kind === "text" || node.kind === "flexibleText") {
      return renderTextNode(node);
    }
    if (node.kind === "cardCollection") return renderCardCollectionNode(node);
    return null;
  };

  return <>{sceneNodes.map((node) => renderSceneNode(node, false))}</>;
};

export default V2SceneStructureRenderer;
