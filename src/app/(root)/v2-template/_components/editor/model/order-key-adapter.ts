import type { V2OrderAdapter, V2PointerOrderNode } from "./order-adapter";

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

const v2_buildParentBuckets = (nodes: V2PointerOrderNode[]) => {
  const buckets = new Map<string, V2PointerOrderNode[]>();
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
  nodes: V2PointerOrderNode[]
): Record<string, string[]> => {
  const buckets = v2_buildParentBuckets(nodes);
  const next: Record<string, string[]> = {};

  buckets.forEach((bucket, parentId) => {
    // Placeholder policy:
    // - keep input order stable for now
    // - actual fractional/lexo insertion policy will be introduced in Phase F
    next[parentId] = v2_toUnique(bucket.map((node) => node.id));
  });

  return next;
};

export const v2_orderKeyOrderAdapter: V2OrderAdapter<V2OrderKeyState> = {
  model: "orderKey",
  buildOrderedIdsByParent: v2_buildOrderedIdsByParentFromOrderKey,
  reorderWithinParent: v2_reorderOrderKeyStateByOrderedIds,
};
