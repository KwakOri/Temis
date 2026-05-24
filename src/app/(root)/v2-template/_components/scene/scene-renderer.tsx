import React from "react";

import { V2TemplateSceneNode } from "@/types/time-table/template-render-config";
import V2SceneStructureRenderer from "./scene-structure-renderer";

const V2SceneRenderer = ({
  sceneNodes,
  artistVisibleOverride,
  memoVisibleOverride,
  topObjectVisibleOverride,
}: {
  sceneNodes: V2TemplateSceneNode[];
  artistVisibleOverride?: boolean;
  memoVisibleOverride?: boolean;
  topObjectVisibleOverride?: boolean;
}) => {
  return (
    <V2SceneStructureRenderer
      sceneNodes={sceneNodes}
      artistVisibleOverride={artistVisibleOverride}
      memoVisibleOverride={memoVisibleOverride}
      topObjectVisibleOverride={topObjectVisibleOverride}
    />
  );
};

export default V2SceneRenderer;
