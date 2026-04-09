export type V2OrderModel = "pointer" | "orderKey";

export interface V2PointerOrderNode {
  id: string;
  parentId: string;
  prevSiblingId?: string | null;
}

export type V2PointerOrderState = Record<string, string | null>;

export interface V2OrderAdapter<TState> {
  model: V2OrderModel;
  buildOrderedIdsByParent: (nodes: V2PointerOrderNode[]) => Record<string, string[]>;
  reorderWithinParent: (params: {
    state: TState;
    orderedIds: string[];
  }) => TState;
}

const toUnique = (ids: string[]): string[] => {
  const seen = new Set<string>();
  const next: string[] = [];
  ids.forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    next.push(id);
  });
  return next;
};

const buildParentBuckets = (nodes: V2PointerOrderNode[]) => {
  const buckets = new Map<string, V2PointerOrderNode[]>();
  nodes.forEach((node) => {
    const list = buckets.get(node.parentId) ?? [];
    list.push(node);
    buckets.set(node.parentId, list);
  });
  return buckets;
};

const buildPointerOrderForParent = (
  nodes: V2PointerOrderNode[]
): string[] => {
  if (nodes.length === 0) return [];

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const nextByPrev = new Map<string | null, string[]>();
  const inputOrder = nodes.map((node) => node.id);

  nodes.forEach((node) => {
    const rawPrev = node.prevSiblingId ?? null;
    const prev = rawPrev && byId.has(rawPrev) ? rawPrev : null;
    const list = nextByPrev.get(prev) ?? [];
    list.push(node.id);
    nextByPrev.set(prev, list);
  });

  const ordered: string[] = [];
  const visited = new Set<string>();

  const walk = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    ordered.push(id);

    const nextIds = nextByPrev.get(id) ?? [];
    nextIds.forEach((nextId) => {
      walk(nextId);
    });
  };

  // 1) 정상/고아 노드는 모두 head(prev=null) 기준으로 순회
  (nextByPrev.get(null) ?? []).forEach((headId) => {
    walk(headId);
  });

  // 2) cycle 등으로 남은 노드는 입력 순서를 기준으로 안정적으로 추가
  inputOrder.forEach((id) => {
    if (visited.has(id)) return;
    walk(id);
  });

  return toUnique(ordered);
};

export const v2_buildOrderedIdsByParentFromPointer = (
  nodes: V2PointerOrderNode[]
): Record<string, string[]> => {
  const buckets = buildParentBuckets(nodes);
  const next: Record<string, string[]> = {};

  buckets.forEach((bucket, parentId) => {
    next[parentId] = buildPointerOrderForParent(bucket);
  });

  return next;
};

export const v2_reorderPointerStateByOrderedIds = ({
  state,
  orderedIds,
}: {
  state: V2PointerOrderState;
  orderedIds: string[];
}): V2PointerOrderState => {
  const normalized = toUnique(orderedIds);
  const next: V2PointerOrderState = {
    ...state,
  };

  normalized.forEach((id, index) => {
    next[id] = index === 0 ? null : normalized[index - 1] ?? null;
  });

  return next;
};

export const v2_pointerOrderAdapter: V2OrderAdapter<V2PointerOrderState> = {
  model: "pointer",
  buildOrderedIdsByParent: v2_buildOrderedIdsByParentFromPointer,
  reorderWithinParent: v2_reorderPointerStateByOrderedIds,
};
