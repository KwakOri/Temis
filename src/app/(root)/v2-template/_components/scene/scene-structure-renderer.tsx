import React, { useMemo } from "react";

import {
  useTemplateRenderConfigContext,
  resolveAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { useTemplateRuntimeContext } from "@/contexts/v2/template-runtime-context";
import { useTemplateRuntimeData } from "@/contexts/v2/template-runtime-ui-context";
import {
  V2TemplateSceneAssetNode,
  V2TemplateSceneCardCollectionNode,
  V2TemplateSceneComponentInstanceNode,
  V2TemplateSceneNode,
  V2TemplateSceneTextNode,
} from "@/types/time-table/template-render-config";
import {
  v2_getRuntimeCardStructureByComponentId,
} from "@/utils/v2/template-graph-runtime";
import {
  v2_getComponentFontFamily,
  v2_isVisibleByMode,
} from "@/utils/v2/template-render-config";
import {
  v2_resolveRuntimeAssetModel,
  v2_resolveRuntimeCardInstance,
  v2_resolveSceneAssetRole,
  v2_resolveRuntimeSceneModel,
  v2_resolveRuntimeTextNodeValue,
} from "@/utils/v2/runtime-resolver";
import {
  V2FlexibleTextNodeRenderer,
  V2PlainTextNodeRenderer,
} from "./card-node-renderers";
import V2TimeTableCell from "./card-cell";
import V2TimeTableGrid from "./card-grid";
import { v2_getHighlightStyle } from "./highlight-style";
import { v2_toRenderableLayoutStyle, v2_toRenderableStyle } from "./render-style";

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
  } = useTemplateRuntimeContext();
  const { weekDates, profileText, memoText, imageSrc } =
    useTemplateRuntimeData();
  const {
    layerTargetMap,
    rootLayerZIndexById,
    memoTextFallback,
    dataIndexByDayKey,
    firstCard,
    firstEntry,
    firstCardOffline,
    firstCardEntryCount,
    resolveStyleRecordByKey,
  } = useMemo(
    () => v2_resolveRuntimeSceneModel({ renderConfig, data }),
    [data, renderConfig]
  );
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
  const firstCardHasOfflineMemo =
    typeof firstCard?.offlineMemo === "string" &&
    firstCard.offlineMemo.trim().length > 0;
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

    const { text, multiline, maxFontSize } = v2_resolveRuntimeTextNodeValue({
      node,
      renderConfig,
      weekDates,
      firstCard,
      firstEntry,
      profileText,
      memoText,
      memoTextFallback,
      globalData: globalData as Record<string, unknown>,
      resolveStyleRecordByKey,
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
    const configuredAssetUrl = resolveAssetUrlFromConfig({
      renderConfig,
      assetRef: node.assetRef,
      currentTheme,
    });
    const { assetRole, assetUrl, isProfileImage, baseStyle, fit } =
      v2_resolveRuntimeAssetModel({
        node,
        renderConfig,
        configuredAssetUrl,
        imageSrc,
      });
    const isGuideOverlay = assetRole === "guideOverlay";

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
    const resolvedInstance = v2_resolveRuntimeCardInstance({
      node,
      data,
      weekDates,
      dataIndexByDayKey,
    });
    if (!resolvedInstance) return null;
    const { dataIndex, cardData, weekDate } = resolvedInstance;

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
      hasOfflineMemo: firstCardHasOfflineMemo,
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
