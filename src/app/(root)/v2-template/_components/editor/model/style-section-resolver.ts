import {
  V2TemplateCardStructure,
  V2TemplateLayerNode,
  V2TemplateRenderConfig,
  V2TemplateSceneNode,
  V2TemplateStructureConfig,
  V2TemplateStyleRecord,
} from "@/types/time-table/template-render-config";

export const ROOT_LAYER_PARENT_ID = "__root__" as const;

export type TemplateLayoutShape = V2TemplateRenderConfig["layout"];
type RootLayoutStyleKey = keyof Omit<TemplateLayoutShape, "card" | "scene">;
type CardLayoutStyleKey = keyof TemplateLayoutShape["card"];
type SceneLayoutStyleKey = keyof TemplateLayoutShape["scene"];

export type SectionStyleResolver =
  | {
      scope: "root";
      key: RootLayoutStyleKey;
    }
  | {
      scope: "card";
      key: CardLayoutStyleKey;
    }
  | {
      scope: "scene";
      key: SceneLayoutStyleKey;
    };

export type SectionStyleResolverMap = Record<string, SectionStyleResolver>;

const ROOT_LAYOUT_STYLE_SECTION_MAP: Partial<Record<string, RootLayoutStyleKey>> = {
  grid: "grid",
  weekFlag: "weekFlag",
  topObjectContainer: "topObjectContainer",
  profileImage: "profileImage",
  profileFrame: "profileFrame",
  profileTextRootStyle: "profileTextRootStyle",
  profileTextWrapperStyle: "profileTextWrapperStyle",
  profileTextStyle: "profileTextStyle",
  profileTextArtistImageStyle: "profileTextArtistImageStyle",
};

export const collectLayerNodeMap = (
  nodes: V2TemplateLayerNode[],
  nodeMap: Map<string, V2TemplateLayerNode> = new Map()
): Map<string, V2TemplateLayerNode> => {
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    if (node.children?.length) {
      collectLayerNodeMap(node.children, nodeMap);
    }
  });
  return nodeMap;
};

export const collectStyleSectionResolverMap = (
  structure: V2TemplateStructureConfig
): SectionStyleResolverMap => {
  return collectStyleSectionResolverMapFromRuntime({
    layers: structure.layers,
    card: structure.card,
    sceneNodes: structure.sceneNodes,
  });
};

export const collectStyleSectionResolverMapFromRuntime = ({
  layers,
  card,
  sceneNodes,
}: {
  layers: V2TemplateLayerNode[];
  card: V2TemplateCardStructure;
  sceneNodes: V2TemplateSceneNode[];
}): SectionStyleResolverMap => {
  const map: SectionStyleResolverMap = {};
  const rootStyleKeySet = new Set<RootLayoutStyleKey>(
    Object.values(ROOT_LAYOUT_STYLE_SECTION_MAP).filter(
      (styleKey): styleKey is RootLayoutStyleKey => Boolean(styleKey)
    )
  );

  Object.entries(ROOT_LAYOUT_STYLE_SECTION_MAP).forEach(
    ([sectionKey, styleKey]) => {
      if (!styleKey) return;
      map[sectionKey] = {
        scope: "root",
        key: styleKey,
      };
    }
  );

  const layerNodeMap = collectLayerNodeMap(layers);
  const cardStyleKeySet = new Set<string>([card.containerStyleKey]);
  Object.values(card.nodes).forEach((cardNode) => {
    cardStyleKeySet.add(cardNode.containerStyleKey);
    if (cardNode.textStyleKey) cardStyleKeySet.add(cardNode.textStyleKey);
    if (cardNode.wrapperStyleKey) cardStyleKeySet.add(cardNode.wrapperStyleKey);
    if (cardNode.optionsKey) cardStyleKeySet.add(cardNode.optionsKey);
  });

  const cardContainerLayer = layerNodeMap.get(card.containerLayerId);
  if (cardContainerLayer?.sectionKey) {
    map[cardContainerLayer.sectionKey] = {
      scope: "card",
      key: card.containerStyleKey as CardLayoutStyleKey,
    };
  }

  Object.values(card.nodes).forEach((cardNode) => {
    const layerNode = layerNodeMap.get(cardNode.layerId);
    if (!layerNode?.sectionKey) return;
    map[layerNode.sectionKey] = {
      scope: "card",
      key: cardNode.containerStyleKey as CardLayoutStyleKey,
    };
  });

  const visitSceneNode = (node: V2TemplateSceneNode) => {
    if (node.kind === "group") {
      node.children.forEach(visitSceneNode);
      return;
    }

    if (!node.layerId) return;
    const layerNode = layerNodeMap.get(node.layerId);
    const sectionKey = layerNode?.sectionKey;
    if (!sectionKey) return;

    const styleKey =
      node.kind === "asset"
        ? node.styleKey
        : node.kind === "text" || node.kind === "flexibleText"
          ? node.containerStyleKey
          : undefined;
    if (!styleKey) return;

    if (rootStyleKeySet.has(styleKey as RootLayoutStyleKey)) {
      map[sectionKey] = {
        scope: "root",
        key: styleKey as RootLayoutStyleKey,
      };
      return;
    }

    if (cardStyleKeySet.has(styleKey)) {
      map[sectionKey] = {
        scope: "card",
        key: styleKey as CardLayoutStyleKey,
      };
      return;
    }

    map[sectionKey] = {
      scope: "scene",
      key: styleKey as SceneLayoutStyleKey,
    };
  };

  sceneNodes.forEach(visitSceneNode);

  return map;
};

export const getStyleRecordBySectionKey = (
  layout: TemplateLayoutShape,
  sectionKey: string,
  resolverMap: SectionStyleResolverMap
): V2TemplateStyleRecord | undefined => {
  const resolver = resolverMap[sectionKey];
  if (!resolver) return undefined;

  if (resolver.scope === "root") {
    return layout[resolver.key] as V2TemplateStyleRecord;
  }

  if (resolver.scope === "scene") {
    return layout.scene[resolver.key] as V2TemplateStyleRecord;
  }

  return layout.card[resolver.key] as V2TemplateStyleRecord;
};

export const setStyleRecordBySectionKey = (
  layout: TemplateLayoutShape,
  sectionKey: string,
  style: V2TemplateStyleRecord,
  resolverMap: SectionStyleResolverMap
): TemplateLayoutShape => {
  const resolver = resolverMap[sectionKey];
  if (!resolver) return layout;

  if (resolver.scope === "root") {
    return {
      ...layout,
      [resolver.key]: style,
    };
  }

  if (resolver.scope === "scene") {
    return {
      ...layout,
      scene: {
        ...layout.scene,
        [resolver.key]: style,
      },
    };
  }

  return {
    ...layout,
    card: {
      ...layout.card,
      [resolver.key]: style,
    },
  };
};
