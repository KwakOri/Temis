import React from "react";

import { V2TemplateSceneNode } from "@/types/time-table/template-render-config";
import V2SceneStructureRenderer from "./scene-structure-renderer";

const V2SceneRenderer = ({
  sceneNodes,
}: {
  sceneNodes: V2TemplateSceneNode[];
}) => {
  return <V2SceneStructureRenderer sceneNodes={sceneNodes} />;
};

export default V2SceneRenderer;
