import React, { useMemo } from "react";

import {
  useTemplateRenderConfigContext,
  getAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateEditorData } from "@/contexts/v2/template-editor-ui-context";
import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";
import {
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";
import { getWeekDateRange, padZero } from "@/utils/date-formatter";
import { formatTime } from "@/utils/time-formatter";
import { weekdays } from "@/utils/time-table/data";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getDefaultCardComponentId,
  v2_getRuntimeCardStructureByComponentId,
} from "@/utils/time-table/template-graph-runtime";
import {
  v2_getComponentFontFamily,
  v2_isVisibleByMode,
} from "@/utils/time-table/template-render-config";
import { v2_resolveSceneTextNodeValue } from "@/utils/time-table/scene-nodes";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./card-node-renderers";
import V2TimeTableGrid from "./card-grid";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableStyle } from "./render-style";

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
  const { renderConfig } = useTemplateRenderConfigContext();
  const {
    data,
    globalData,
    currentTheme,
    hoverHighlightTarget,
    activeHighlightTarget,
    isLayerHidden,
  } = useTemplateEditorRuntimeContext();
  const { weekDates, profileText, imageSrc, preferProfileDummyImage } =
    useTemplateEditorData();
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const layerTargetMap = useMemo(
    () => v2_collectLayerTargetById(runtimeLayerTree),
    [runtimeLayerTree]
  );

  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const sceneLayoutRecord = renderConfig.layout.scene as Record<string, unknown>;
  const defaultCardComponentId = useMemo(
    () => v2_getDefaultCardComponentId(renderConfig),
    [renderConfig]
  );
  const runtimeCardStructureByComponentId = useMemo(() => {
    const next: Record<string, ReturnType<typeof v2_getRuntimeCardStructureByComponentId>> = {};
    Object.keys(renderConfig.graph.componentDefinitions ?? {}).forEach((componentId) => {
      next[componentId] = v2_getRuntimeCardStructureByComponentId(
        renderConfig,
        componentId
      );
    });
    if (!next[defaultCardComponentId]) {
      next[defaultCardComponentId] = v2_getRuntimeCardStructureByComponentId(
        renderConfig,
        defaultCardComponentId
      );
    }
    return next;
  }, [defaultCardComponentId, renderConfig]);
  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (firstCard?.entries as Record<string, unknown>[] | undefined)?.[0];
  const firstCardOffline = Boolean(firstCard?.isOffline);

  const resolveStyleRecordByKey = (key?: string): unknown => {
    if (!key) return {};
    if (sceneLayoutRecord[key] && typeof sceneLayoutRecord[key] === "object") {
      return sceneLayoutRecord[key];
    }
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

    const configuredAssetUrl = getAssetUrlFromConfig({
      renderConfig,
      key: node.assetKey,
      currentTheme,
    });
    const uploadedProfileImage =
      isProfileImage && typeof imageSrc === "string" && imageSrc.trim()
        ? imageSrc
        : null;
    const assetUrl = isProfileImage
      ? preferProfileDummyImage
        ? configuredAssetUrl ?? uploadedProfileImage
        : uploadedProfileImage ?? configuredAssetUrl
      : configuredAssetUrl;
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
    const componentId = node.componentId ?? defaultCardComponentId;
    const runtimeCardStructure =
      runtimeCardStructureByComponentId[componentId] ??
      runtimeCardStructureByComponentId[defaultCardComponentId];
    return <V2TimeTableGrid key={node.id} cardStructure={runtimeCardStructure} />;
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
