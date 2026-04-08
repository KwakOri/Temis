import React from "react";

import {
  V2TemplateLayerComponentKey,
  V2TemplateLayerNode,
  V2TemplateSceneNode,
} from "@/types/time-table/v2_template_render_config";
import V2ProfileImageSection from "./V2ProfileImageContainer";
import V2SceneStructureRenderer from "./V2SceneStructureRenderer";
import V2TimeTableGrid from "./V2TimeTableGrid";
import V2TimeTableTopObject from "./V2TimeTableTopObject";
import V2TimeTableWeekFlag from "./V2TimeTableWeekFlag";

const v2_COMPONENT_RENDERER_MAP: Record<
  V2TemplateLayerComponentKey,
  React.ComponentType
> = {
  grid: V2TimeTableGrid,
  weekFlag: V2TimeTableWeekFlag,
  topObject: V2TimeTableTopObject,
  profile: V2ProfileImageSection,
};

const v2_renderSceneNode = (node: V2TemplateLayerNode): React.ReactNode => {
  if (node.kind === "group") {
    if (!node.children?.length) return null;
    return (
      <React.Fragment key={node.id}>
        {node.children.map((childNode) => v2_renderSceneNode(childNode))}
      </React.Fragment>
    );
  }

  const componentKey = node.componentKey;
  if (!componentKey) return null;

  const Component = v2_COMPONENT_RENDERER_MAP[componentKey];
  if (!Component) return null;

  return <Component key={node.id} />;
};

const V2SceneRenderer = ({
  layers,
  sceneNodes,
}: {
  layers: V2TemplateLayerNode[];
  sceneNodes?: V2TemplateSceneNode[];
}) => {
  if (Array.isArray(sceneNodes) && sceneNodes.length > 0) {
    return <V2SceneStructureRenderer sceneNodes={sceneNodes} />;
  }

  return <>{layers.map((layerNode) => v2_renderSceneNode(layerNode))}</>;
};

export default V2SceneRenderer;
