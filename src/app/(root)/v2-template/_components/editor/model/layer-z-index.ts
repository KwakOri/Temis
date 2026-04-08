import {
  V2TemplateLayerNode,
  V2TemplateStructureConfig,
  V2TemplateStyleRecord,
} from "@/types/time-table/template-render-config";
import {
  ROOT_LAYER_PARENT_ID,
  TemplateLayoutShape,
  collectLayerNodeMap,
  collectStyleSectionResolverMap,
  getStyleRecordBySectionKey,
  setStyleRecordBySectionKey,
} from "./style-section-resolver";

const parseZIndex = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export const buildOrderedLayerIdsByParent = ({
  structure,
  layout,
}: {
  structure: V2TemplateStructureConfig;
  layout: TemplateLayoutShape;
}): Record<string, string[]> => {
  const resolverMap = collectStyleSectionResolverMap(structure);

  const getSectionZIndex = (sectionKey?: string): number | undefined => {
    if (!sectionKey) return undefined;
    const style = getStyleRecordBySectionKey(layout, sectionKey, resolverMap);
    return parseZIndex(style?.zIndex);
  };

  const zIndexCache = new Map<string, number>();
  const getNodeZIndex = (node: V2TemplateLayerNode): number => {
    const cached = zIndexCache.get(node.id);
    if (cached !== undefined) return cached;

    const own = getSectionZIndex(node.sectionKey);
    let value = own ?? Number.NEGATIVE_INFINITY;

    if (node.children?.length) {
      node.children.forEach((child) => {
        value = Math.max(value, getNodeZIndex(child));
      });
    }

    const normalizedValue = Number.isFinite(value) ? value : 0;
    zIndexCache.set(node.id, normalizedValue);
    return normalizedValue;
  };

  const sortNodes = (nodes: V2TemplateLayerNode[]): V2TemplateLayerNode[] => {
    return [...nodes].sort((a, b) => {
      const aZ = getNodeZIndex(a);
      const bZ = getNodeZIndex(b);
      if (aZ === bZ) {
        return nodes.indexOf(a) - nodes.indexOf(b);
      }
      return bZ - aZ;
    });
  };

  const orderedMap: Record<string, string[]> = {};
  const buildOrder = (nodes: V2TemplateLayerNode[], parentId: string) => {
    const sorted = sortNodes(nodes);
    orderedMap[parentId] = sorted.map((node) => node.id);
    sorted.forEach((node) => {
      if (!node.children?.length) return;
      buildOrder(node.children, node.id);
    });
  };

  buildOrder(structure.layers, ROOT_LAYER_PARENT_ID);
  return orderedMap;
};

export const applyReorderedLayerZIndex = ({
  layout,
  structure,
  parentId,
  orderedIds,
}: {
  layout: TemplateLayoutShape;
  structure: V2TemplateStructureConfig;
  parentId: string;
  orderedIds: string[];
}): TemplateLayoutShape => {
  if (orderedIds.length === 0) return layout;

  const zMap = new Map<string, number>();
  orderedIds.forEach((id, index) => {
    zMap.set(id, (orderedIds.length - index) * 10);
  });

  const resolverMap = collectStyleSectionResolverMap(structure);
  let nextLayout: TemplateLayoutShape = {
    ...layout,
    card: {
      ...layout.card,
    },
  };
  const layerNodeMap = collectLayerNodeMap(structure.layers);
  const parentNode =
    parentId === ROOT_LAYER_PARENT_ID ? null : layerNodeMap.get(parentId) ?? null;
  const siblings =
    parentId === ROOT_LAYER_PARENT_ID
      ? structure.layers
      : (parentNode?.children ?? []);
  const siblingIdSet = new Set(siblings.map((sibling) => sibling.id));

  const setStyleZIndex = (
    style: V2TemplateStyleRecord | undefined,
    zIndex: number
  ): V2TemplateStyleRecord => {
    return {
      ...(style ?? {}),
      zIndex,
    };
  };

  const setSectionZIndex = (sectionKey: string, zIndex: number) => {
    const currentStyle = getStyleRecordBySectionKey(nextLayout, sectionKey, resolverMap);
    nextLayout = setStyleRecordBySectionKey(
      nextLayout,
      sectionKey,
      setStyleZIndex(currentStyle, zIndex),
      resolverMap
    );
  };

  const applyNodeZIndex = (node: V2TemplateLayerNode, zIndex: number) => {
    if (node.sectionKey) {
      setSectionZIndex(node.sectionKey, zIndex);
      return;
    }
    if (node.children?.length) {
      node.children.forEach((child) => applyNodeZIndex(child, zIndex));
    }
  };

  orderedIds.forEach((nodeId) => {
    if (!siblingIdSet.has(nodeId)) return;
    const zIndex = zMap.get(nodeId);
    if (zIndex === undefined) return;
    const node = layerNodeMap.get(nodeId);
    if (!node) return;
    applyNodeZIndex(node, zIndex);
  });

  return nextLayout;
};
