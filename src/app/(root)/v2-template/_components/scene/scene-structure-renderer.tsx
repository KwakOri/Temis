import React, { useMemo } from "react";

import {
  useTemplateRenderConfigContext,
  resolveAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import { useTemplateEditorData } from "@/contexts/v2/template-editor-ui-context";
import { V2TemplateLayerNode } from "@/types/time-table/template-render-config";
import {
  V2TemplateSceneAssetNode,
  V2TemplateSceneAssetRole,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeCardStructureByComponentId,
} from "@/utils/time-table/template-graph-runtime";
import {
  v2_dayKeyFromIndex,
  v2_getComponentFontFamily,
  v2_isVisibleByMode,
  v2_parseDayKey,
} from "@/utils/time-table/template-render-config";
import { v2_buildComputedValues } from "@/utils/time-table/text-formatting";
import { v2_resolveSceneTextNodeValue } from "@/utils/time-table/scene-nodes";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./card-node-renderers";
import V2TimeTableCell from "./card-cell";
import V2TimeTableGrid from "./card-grid";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle, v2_toRenderableStyle } from "./render-style";

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
  const style = v2_toRenderableLayoutStyle(value as Record<string, unknown>);
  const width = style.width;

  return {
    style,
    ...(width !== undefined ? { width } : {}),
  };
};

const v2_resolveSceneAssetRole = (
  node: Pick<V2TemplateSceneAssetNode, "id" | "layerId" | "assetRole">
): V2TemplateSceneAssetRole => {
  if (node.assetRole) return node.assetRole;
  if (node.layerId === "profile-image") return "profileImage";
  if (node.layerId === "profile-frame") return "profileFrame";
  if (node.id === "scene-background") return "background";
  if (node.id === "scene-guide-overlay") return "guideOverlay";
  return "general";
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
  const { weekDates, profileText, memoText, imageSrc } =
    useTemplateEditorData();
  const runtimeLayerTree = useMemo(
    () => v2_getRuntimeLayerTree(renderConfig),
    [renderConfig]
  );
  const layerTargetMap = useMemo(
    () => v2_collectLayerTargetById(runtimeLayerTree),
    [runtimeLayerTree]
  );
  const rootLayerZIndexById = useMemo(() => {
    const next: Record<string, number> = {};
    const total = runtimeLayerTree.length;
    runtimeLayerTree.forEach((node, index) => {
      next[node.id] = (total - index) * 10;
    });
    return next;
  }, [runtimeLayerTree]);

  const layoutRecord = renderConfig.layout as unknown as Record<string, unknown>;
  const cardLayoutRecord = renderConfig.layout.card as Record<string, unknown>;
  const sceneLayoutRecord = renderConfig.layout.scene as Record<string, unknown>;
  const runtimeCardStructureByComponentId = useMemo(() => {
    const next: Record<string, ReturnType<typeof v2_getRuntimeCardStructureByComponentId>> = {};
    Object.keys(renderConfig.graph.componentDefinitions ?? {}).forEach((componentId) => {
      next[componentId] = v2_getRuntimeCardStructureByComponentId(
        renderConfig,
        componentId
      );
    });
    return next;
  }, [renderConfig]);
  const firstCard = data[0] as Record<string, unknown> | undefined;
  const firstEntry = (firstCard?.entries as Record<string, unknown>[] | undefined)?.[0];
  const firstCardOffline = Boolean(firstCard?.isOffline);
  const firstCardEntryCount = Math.max(
    1,
    Array.isArray(firstCard?.entries) ? firstCard.entries.length : 0
  );
  const memoTextFallback = useMemo(() => {
    const memoField = renderConfig.formSchema.fields.find((field) => {
      return field.scope === "global" && field.key === "memoText";
    });
    if (!memoField) return "";
    if (
      typeof memoField.defaultValue === "string" &&
      memoField.defaultValue.trim().length > 0
    ) {
      return memoField.defaultValue;
    }
    return memoField.placeholder ?? "";
  }, [renderConfig.formSchema.fields]);
  const dataIndexByDayKey = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((card, index) => {
      const dayKey = v2_parseDayKey(card.day);
      if (!dayKey) return;
      if (map[dayKey] !== undefined) return;
      map[dayKey] = index;
    });
    return map;
  }, [data]);

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
    const wrapperStyle = v2_toRenderableLayoutStyle(
      resolveStyleRecordByKey(node.wrapperStyleKey)
    );
    const optionsRaw = node.optionsKey
      ? (resolveStyleRecordByKey(node.optionsKey) as Record<string, unknown>)
      : {};

    const firstDayKey =
      v2_parseDayKey(firstCard?.day) ?? v2_dayKeyFromIndex(0);
    const firstWeekDate = weekDates[0];
    const entryTime =
      typeof firstEntry?.time === "string" ? firstEntry.time : "10:00";
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
    const fallbackValue =
      node.id === "scene-week-flag"
        ? fallbackWeekFlag
        : node.id === "scene-profile-text"
          ? profileText || renderConfig.profileTextPlaceholder || ""
          : node.id === "scene-memo-text"
            ? memoText || memoTextFallback || ""
            : "";
    const text = v2_resolveSceneTextNodeValue({
      node,
      fallbackValue,
      computedValues,
      entrySource: firstEntry,
      entrySources: (firstCard?.entries as Record<string, unknown>[] | undefined) ?? [],
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
          : node.id === "scene-profile-text" || node.id === "scene-memo-text"
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
    const assetRole = v2_resolveSceneAssetRole(node);
    const isProfileImage = assetRole === "profileImage";
    const isProfileFrame = assetRole === "profileFrame";
    const isBackground = assetRole === "background";
    const isGuideOverlay = assetRole === "guideOverlay";

    const configuredAssetUrl = resolveAssetUrlFromConfig({
      renderConfig,
      assetRef: node.assetRef,
      currentTheme,
    });
    const uploadedProfileImage =
      isProfileImage && typeof imageSrc === "string" && imageSrc.trim()
        ? imageSrc
        : null;
    const assetUrl = isProfileImage ? uploadedProfileImage : configuredAssetUrl;

    const style = node.styleKey
      ? v2_toRenderableLayoutStyle(resolveStyleRecordByKey(node.styleKey))
      : {};
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

    if (!assetUrl) {
      if (!isProfileImage) return null;

      return (
        <div
          key={node.id}
          style={{
            ...baseStyle,
            ...style,
            ...highlightStyle,
          }}
        />
      );
    }

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
    const preferredComponentId = node.componentId?.trim();
    const fallbackComponentId =
      (preferredComponentId &&
      runtimeCardStructureByComponentId[preferredComponentId]
        ? preferredComponentId
        : undefined) ??
      (node.children ?? [])
        .map((child) => child.componentId?.trim() ?? "")
        .find(
          (componentId) =>
            componentId.length > 0 &&
            Boolean(runtimeCardStructureByComponentId[componentId])
        );
    if (!fallbackComponentId) return null;
    const runtimeCardStructure =
      runtimeCardStructureByComponentId[fallbackComponentId];
    if (!runtimeCardStructure) return null;
    return (
      <V2TimeTableGrid
        key={node.id}
        cardStructure={runtimeCardStructure}
        cardStructureByComponentId={runtimeCardStructureByComponentId}
        instances={node.children}
      />
    );
  };

  const renderComponentInstanceNode = (
    node: V2TemplateSceneComponentInstanceNode
  ) => {
    const runtimeCardStructure = runtimeCardStructureByComponentId[node.componentId];
    if (!runtimeCardStructure) return null;

    const dayIndex = dataIndexByDayKey[node.dayKey];
    const parsedInstanceIndex = Number.parseInt(node.instanceId, 10);
    const dataIndex =
      dayIndex !== undefined
        ? dayIndex
        : Number.isFinite(parsedInstanceIndex) && parsedInstanceIndex >= 0
          ? parsedInstanceIndex
          : 0;
    const cardData = data[dataIndex];
    const weekDate = weekDates[dataIndex];
    if (!cardData || !weekDate) return null;

    const style = node.styleKey
      ? v2_toRenderableLayoutStyle(resolveStyleRecordByKey(node.styleKey))
      : {};
    const resolvedTarget =
      (node.layerId ? layerTargetMap[node.layerId] : undefined) ??
      `sceneNode:${node.id}`;
    const highlightStyle = v2_getHighlightStyle({
      target: resolvedTarget,
      hoverTarget: hoverHighlightTarget,
      activeTarget: activeHighlightTarget,
    });

    return (
      <div
        key={node.id}
        style={{
          position: "absolute",
          ...style,
          ...highlightStyle,
        }}
      >
        <V2TimeTableCell
          time={cardData}
          dayKeyOverride={node.dayKey}
          currentTheme={currentTheme}
          weekDate={weekDate}
          index={dataIndex}
          cardStructure={runtimeCardStructure}
        />
      </div>
    );
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
      entryCount: firstCardEntryCount,
    });
    if (hiddenByLayer || !visibleByMode) return null;

    if (node.kind === "group") {
      const childCount = node.children.length;
      return (
        <div
          key={node.id}
          style={{
            position: "absolute",
            inset: 0,
            isolation: "isolate",
          }}
        >
          {node.children.map((childNode, index) => {
            const renderedChild = renderSceneNode(childNode, false);
            if (!renderedChild) return null;
            return (
              <div
                key={`${node.id}::${childNode.id}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: (childCount - index) * 10,
                }}
              >
                {renderedChild}
              </div>
            );
          })}
        </div>
      );
    }
    if (node.kind === "asset") return renderAssetNode(node);
    if (node.kind === "text" || node.kind === "flexibleText") {
      return renderTextNode(node);
    }
    if (node.kind === "cardCollection") return renderCardCollectionNode(node);
    if (node.kind === "componentInstance") return renderComponentInstanceNode(node);
    return null;
  };

  return (
    <>
      {sceneNodes.map((node) => {
        const rendered = renderSceneNode(node, false);
        if (!rendered) return null;
        const layerId = node.layerId ?? node.id;
        const rootAssetRole = node.kind === "asset" ? v2_resolveSceneAssetRole(node) : null;
        const rootZIndex =
          rootAssetRole === "background"
            ? -1000
            : rootAssetRole === "guideOverlay"
              ? 1000
              : rootLayerZIndexById[layerId];
        if (rootZIndex === undefined) return rendered;
        return (
          <div
            key={`root-layer-${node.id}`}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: rootZIndex,
            }}
          >
            {rendered}
          </div>
        );
      })}
    </>
  );
};

export default V2SceneStructureRenderer;
