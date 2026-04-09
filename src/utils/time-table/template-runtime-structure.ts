import {
  V2TemplateRenderConfig,
  V2TemplateStructureConfig,
} from "@/types/time-table/template-render-config";
import { v2_getRuntimeLayerTree } from "@/utils/time-table/template-graph-layers-runtime";
import {
  v2_getRuntimeCardStructure,
  v2_getRuntimeSceneNodes,
} from "@/utils/time-table/template-graph-runtime";

export const v2_buildRuntimeStructure = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateStructureConfig => {
  return {
    layers: v2_getRuntimeLayerTree(renderConfig),
    card: v2_getRuntimeCardStructure(renderConfig),
    sceneNodes: v2_getRuntimeSceneNodes(renderConfig),
  };
};

export const v2_withRuntimeStructure = (
  renderConfig: V2TemplateRenderConfig
): V2TemplateRenderConfig => {
  return renderConfig;
};
