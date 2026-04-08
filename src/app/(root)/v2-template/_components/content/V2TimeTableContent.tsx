import { useTimeTableData, useTimeTableUI } from "@/contexts/TimeTableContext";
import { useV2TimeTableEditorRuntimeContext } from "@/contexts/v2/v2_TimeTableEditorRuntimeContext";
import {
  useV2TemplateRenderConfigContext,
  v2_getAssetUrlFromConfig,
} from "@/contexts/v2/v2_TemplateRenderConfigContext";
import { V2TemplateSceneNode } from "@/types/time-table/v2_template_render_config";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { isGuideEnabled } from "@/utils/time-table/data";
import { v2_isVisibleByMode } from "@/utils/time-table/v2_template_render_config";
import V2SceneRenderer from "./V2SceneRenderer";

const v2_sceneHasVisibleAssetKey = ({
  nodes,
  assetKey,
  isLayerHidden,
  isOffline,
}: {
  nodes: V2TemplateSceneNode[] | undefined;
  assetKey: string;
  isLayerHidden: (layerId: string) => boolean;
  isOffline: boolean;
}): boolean => {
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  const stack: Array<{ node: V2TemplateSceneNode; parentHidden: boolean }> = nodes.map(
    (node) => ({
      node,
      parentHidden: false,
    })
  );

  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    const { node, parentHidden } = current;
    const hiddenByLayer =
      parentHidden || (node.layerId ? isLayerHidden(node.layerId) : false);
    const visibleByMode = v2_isVisibleByMode({
      mode: node.visibilityMode,
      isOffline,
    });
    if (hiddenByLayer || !visibleByMode) continue;

    if (node.kind === "asset" && node.assetKey === assetKey) {
      return true;
    }
    if (node.kind === "group" && node.children.length > 0) {
      stack.unshift(
        ...node.children.map((childNode) => ({
          node: childNode,
          parentHidden: hiddenByLayer,
        }))
      );
    }
  }

  return false;
};

const V2TimeTableContent: React.FC = () => {
  const { currentTheme, isLayerHidden, data } = useV2TimeTableEditorRuntimeContext();
  const { weekDates } = useTimeTableData();
  const { scale } = useTimeTableUI();
  const { renderConfig } = useV2TemplateRenderConfigContext();

  if (weekDates.length === 0) return null;
  const firstCard = data[0] as { isOffline?: boolean } | undefined;
  const firstCardOffline = Boolean(firstCard?.isOffline);
  const hasSceneBackgroundAsset = v2_sceneHasVisibleAssetKey({
    nodes: renderConfig.structure.sceneNodes,
    assetKey: "bgByTheme",
    isLayerHidden,
    isOffline: firstCardOffline,
  });
  const hasSceneGuideAsset = v2_sceneHasVisibleAssetKey({
    nodes: renderConfig.structure.sceneNodes,
    assetKey: "guideByTheme",
    isLayerHidden,
    isOffline: firstCardOffline,
  });

  const backgroundImage =
    v2_getAssetUrlFromConfig({
      renderConfig,
      key: "bgByTheme",
      currentTheme,
    });
  const guideOverlayImage = v2_getAssetUrlFromConfig({
    renderConfig,
    key: "guideByTheme",
    currentTheme,
  });

  return (
    <div
      id="timetable"
      className=" box-border select-none font-sans origin-top-left relative overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
      style={{
        transform: `scale(${scale})`,
        ...(!hasSceneBackgroundAsset && backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {}),
        width: renderConfig.templateSize.width,
        height: renderConfig.templateSize.height,
      }}
    >
      {isGuideEnabled && <TimeTableDesignGuide />}
      <V2SceneRenderer
        sceneNodes={renderConfig.structure.sceneNodes}
      />
      {!hasSceneGuideAsset && guideOverlayImage ? (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 999 }}
          aria-hidden
        >
          <img
            className="h-full w-full object-cover"
            src={guideOverlayImage}
            alt="guide-overlay"
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
};

export default V2TimeTableContent;
