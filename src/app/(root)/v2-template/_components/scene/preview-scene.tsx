import { useTemplateEditorRuntimeContext } from "@/contexts/v2/template-editor-runtime-context";
import {
  useTemplateEditorData,
  useTemplateEditorUI,
} from "@/contexts/v2/template-editor-ui-context";
import {
  useTemplateRenderConfigContext,
  getAssetUrlFromConfig,
} from "@/contexts/v2/template-render-config-context";
import { V2TemplateSceneNode } from "@/types/time-table/template-render-config";
import React from "react";

import TimeTableDesignGuide from "@/components/tools/TimeTableDesignGuide";
import { isGuideEnabled } from "@/utils/time-table/data";
import { v2_getRuntimeSceneNodes } from "@/utils/time-table/template-graph-runtime";
import { v2_isVisibleByMode } from "@/utils/time-table/template-render-config";
import V2SceneRenderer from "./scene-renderer";

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
  const { currentTheme, isLayerHidden, data } = useTemplateEditorRuntimeContext();
  const { weekDates } = useTemplateEditorData();
  const { scale } = useTemplateEditorUI();
  const { renderConfig } = useTemplateRenderConfigContext();
  const runtimeSceneNodes = React.useMemo(
    () => v2_getRuntimeSceneNodes(renderConfig),
    [renderConfig]
  );

  if (weekDates.length === 0) return null;
  const firstCard = data[0] as { isOffline?: boolean } | undefined;
  const firstCardOffline = Boolean(firstCard?.isOffline);
  const hasSceneBackgroundAsset = v2_sceneHasVisibleAssetKey({
    nodes: runtimeSceneNodes,
    assetKey: "bgByTheme",
    isLayerHidden,
    isOffline: firstCardOffline,
  });
  const hasSceneGuideAsset = v2_sceneHasVisibleAssetKey({
    nodes: runtimeSceneNodes,
    assetKey: "guideByTheme",
    isLayerHidden,
    isOffline: firstCardOffline,
  });

  const backgroundImage =
    getAssetUrlFromConfig({
      renderConfig,
      key: "bgByTheme",
      currentTheme,
    });
  const guideOverlayImage = getAssetUrlFromConfig({
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
        sceneNodes={runtimeSceneNodes}
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
