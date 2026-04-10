import type { V2OrderAdapter, V2OrderNode } from "./order-adapter";

export type V2OrderKeyState = Record<string, string>;

const v2_toUnique = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  ids.forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    next.push(id);
  });
  return next;
};

const v2_buildParentBuckets = (nodes: V2OrderNode[]) => {
  const buckets = new Map<string, V2OrderNode[]>();
  nodes.forEach((node) => {
    const list = buckets.get(node.parentId) ?? [];
    list.push(node);
    buckets.set(node.parentId, list);
  });
  return buckets;
};

const v2_reorderOrderKeyStateByOrderedIds = ({
  state,
  orderedIds,
}: {
  state: V2OrderKeyState;
  orderedIds: string[];
}): V2OrderKeyState => {
  const next: V2OrderKeyState = {
    ...state,
  };

  v2_toUnique(orderedIds).forEach((id, index) => {
    next[id] = `${index}`.padStart(8, "0");
  });

  return next;
};

const v2_buildOrderedIdsByParentFromOrderKey = (
  nodes: V2OrderNode[]
): Record<string, string[]> => {
  const buckets = v2_buildParentBuckets(nodes);
  const next: Record<string, string[]> = {};

  buckets.forEach((bucket, parentId) => {
    const sorted = [...bucket].sort((a, b) => {
      const aKey = typeof a.orderKey === "string" ? a.orderKey : "";
      const bKey = typeof b.orderKey === "string" ? b.orderKey : "";
      if (aKey && bKey) {
        if (aKey === bKey) return 0;
        return aKey < bKey ? -1 : 1;
      }
      if (aKey) return -1;
      if (bKey) return 1;
      return bucket.indexOf(a) - bucket.indexOf(b);
    });
    next[parentId] = v2_toUnique(sorted.map((node) => node.id));
  });

  return next;
};

export const v2_orderKeyOrderAdapter: V2OrderAdapter<V2OrderKeyState> = {
  model: "orderKey",
  buildOrderedIdsByParent: v2_buildOrderedIdsByParentFromOrderKey,
  reorderWithinParent: v2_reorderOrderKeyStateByOrderedIds,
};
