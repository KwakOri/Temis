import {
  V2TemplateGraphNode,
  V2TemplateRenderConfig,
  V2TemplateSceneNodeKind,
} from "@/types/time-table/template-render-config";
import { v2_graphUpdateNode } from "@/utils/v2/template-graph-editor";

export const v2_COMPONENT_INSTANCE_CLONE_NODE_PREFIX =
  "scene-component-instance-";
export const v2_COMPONENT_INSTANCE_CLONE_LAYER_PREFIX =
  "scene-component-instance-layer-";

export const v2_createComponentInstanceStyleKey = (nodeId: string) =>
  `sceneNode:${nodeId}:style`;

export const v2_createSceneComponentInstanceCloneNode = ({
  sourceNode,
  cloneNodeId,
  cloneLayerId,
}: {
  sourceNode: V2TemplateGraphNode;
  cloneNodeId: string;
  cloneLayerId: string;
}): { cloneNode: V2TemplateGraphNode; styleKey: string } => {
  const styleKey = v2_createComponentInstanceStyleKey(cloneNodeId);
  return {
    styleKey,
    cloneNode: {
      ...sourceNode,
      id: cloneNodeId,
      label: `${sourceNode.label} Copy`,
      layerId: cloneLayerId,
      parentId: sourceNode.parentId,
      childIds: [],
      styles: {
        ...(sourceNode.styles ?? {}),
        styleKey,
      },
      meta: {
        ...(sourceNode.meta ?? {}),
        layerTarget: `sceneNode:${cloneNodeId}`,
        layerSectionKey: styleKey,
        layerIcon: "layers",
      },
    },
  };
};

type V2ComponentInstanceParentKind = V2TemplateSceneNodeKind | "root" | null;

export const v2_applyRelocatedComponentInstancePatch = ({
  prev,
  nextGraph,
  nodeId,
  sourceIsComponentInstance,
  targetParentKind,
  fallbackInstanceId,
}: {
  prev: V2TemplateRenderConfig;
  nextGraph: V2TemplateRenderConfig["graph"];
  nodeId: string;
  sourceIsComponentInstance: boolean;
  targetParentKind: V2ComponentInstanceParentKind;
  fallbackInstanceId: string;
}): V2TemplateRenderConfig => {
  if (!sourceIsComponentInstance) {
    return {
      ...prev,
      graph: nextGraph,
    };
  }

  const movedNode = nextGraph.nodes[nodeId];
  if (!movedNode) {
    return {
      ...prev,
      graph: nextGraph,
    };
  }

  if (targetParentKind !== "cardCollection") {
    const styleKey =
      typeof movedNode.styles?.styleKey === "string" &&
      movedNode.styles.styleKey.trim().length > 0
        ? movedNode.styles.styleKey
        : v2_createComponentInstanceStyleKey(nodeId);
    const nextGraphWithStyle = v2_graphUpdateNode(nextGraph, nodeId, (node) => ({
      ...node,
      styles: {
        ...(node.styles ?? {}),
        styleKey,
      },
      meta: {
        ...(node.meta ?? {}),
        layerTarget: `sceneNode:${node.id}`,
        layerSectionKey: styleKey,
        layerIcon: "layers",
      },
    }));
    const existingStyle = prev.layout.scene[styleKey];
    return {
      ...prev,
      graph: nextGraphWithStyle,
      layout: {
        ...prev.layout,
        scene: {
          ...prev.layout.scene,
          ...(existingStyle
            ? {}
            : {
                [styleKey]: {
                  position: "absolute",
                  top: 120,
                  left: 120,
                },
              }),
        },
      },
    };
  }

  const staleStyleKey =
    typeof movedNode.styles?.styleKey === "string" &&
    movedNode.styles.styleKey.trim().length > 0
      ? movedNode.styles.styleKey
      : null;
  const nextGraphWithoutStyle = v2_graphUpdateNode(nextGraph, nodeId, (node) => {
    const nextStyles = {
      ...(node.styles ?? {}),
    };
    delete nextStyles.styleKey;

    return {
      ...node,
      ...(Object.keys(nextStyles).length > 0
        ? { styles: nextStyles }
        : { styles: undefined }),
      meta: {
        ...(node.meta ?? {}),
        layerTarget: `cardInstance:${fallbackInstanceId}`,
        layerSectionKey: "grid",
        layerIcon: "layers",
      },
    };
  });

  if (!staleStyleKey) {
    return {
      ...prev,
      graph: nextGraphWithoutStyle,
    };
  }

  const nextSceneLayout = {
    ...prev.layout.scene,
  };
  delete nextSceneLayout[staleStyleKey];
  return {
    ...prev,
    graph: nextGraphWithoutStyle,
    layout: {
      ...prev.layout,
      scene: nextSceneLayout,
    },
  };
};
