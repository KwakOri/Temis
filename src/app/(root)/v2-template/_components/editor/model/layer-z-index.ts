import {
  V2TemplateLayerNode,
  V2TemplateStyleRecord,
} from "@/types/time-table/template-render-config";
import {
  ROOT_LAYER_PARENT_ID,
  SectionStyleResolverMap,
  TemplateLayoutShape,
  collectLayerNodeMap,
  getStyleRecordBySectionKey,
  setStyleRecordBySectionKey,
} from "./style-section-resolver";
import {
  V2PointerOrderNode,
  v2_pointerOrderAdapter,
} from "./order-adapter";

const parseZIndex = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export const buildOrderedLayerIdsByParent = ({
  layers,
  layout,
  resolverMap,
}: {
  layers: V2TemplateLayerNode[];
  layout: TemplateLayoutShape;
  resolverMap: SectionStyleResolverMap;
}): Record<string, string[]> => {
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

  buildOrder(layers, ROOT_LAYER_PARENT_ID);

  const pointerNodes: V2PointerOrderNode[] = [];
  Object.entries(orderedMap).forEach(([parentId, orderedIds]) => {
    orderedIds.forEach((id, index) => {
      pointerNodes.push({
        id,
        parentId,
        prevSiblingId: index === 0 ? null : (orderedIds[index - 1] ?? null),
      });
    });
  });

  const orderedByAdapter = v2_pointerOrderAdapter.buildOrderedIdsByParent(pointerNodes);
  const nextOrderedMap: Record<string, string[]> = {};

  Object.entries(orderedMap).forEach(([parentId, orderedIds]) => {
    nextOrderedMap[parentId] = orderedByAdapter[parentId] ?? orderedIds;
  });

  return nextOrderedMap;
};

export const applyReorderedLayerZIndex = ({
  layout,
  layers,
  resolverMap,
  parentId,
  orderedIds,
}: {
  layout: TemplateLayoutShape;
  layers: V2TemplateLayerNode[];
  resolverMap: SectionStyleResolverMap;
  parentId: string;
  orderedIds: string[];
}): TemplateLayoutShape => {
  if (orderedIds.length === 0) return layout;

  const pointerState = v2_pointerOrderAdapter.reorderWithinParent({
    state: {},
    orderedIds,
  });
  const normalizedOrderedIds =
    v2_pointerOrderAdapter.buildOrderedIdsByParent(
      orderedIds.map((id) => ({
        id,
        parentId,
        prevSiblingId: pointerState[id] ?? null,
      }))
    )[parentId] ?? orderedIds;

  const zMap = new Map<string, number>();
  normalizedOrderedIds.forEach((id, index) => {
    zMap.set(id, (normalizedOrderedIds.length - index) * 10);
  });

  let nextLayout: TemplateLayoutShape = {
    ...layout,
    card: {
      ...layout.card,
    },
  };
  const layerNodeMap = collectLayerNodeMap(layers);
  const parentNode =
    parentId === ROOT_LAYER_PARENT_ID ? null : layerNodeMap.get(parentId) ?? null;
  const siblings =
    parentId === ROOT_LAYER_PARENT_ID
      ? layers
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

  normalizedOrderedIds.forEach((nodeId) => {
    if (!siblingIdSet.has(nodeId)) return;
    const zIndex = zMap.get(nodeId);
    if (zIndex === undefined) return;
    const node = layerNodeMap.get(nodeId);
    if (!node) return;
    applyNodeZIndex(node, zIndex);
  });

  return nextLayout;
};
