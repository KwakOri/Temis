import { v2_orderKeyOrderAdapter } from "./order-key-adapter";

export type V2OrderModel = "orderKey";

export interface V2OrderNode {
  id: string;
  parentId: string;
  prevSiblingId?: string | null;
  orderKey?: string;
}

export interface V2OrderAdapter<TState> {
  model: V2OrderModel;
  buildOrderedIdsByParent: (nodes: V2OrderNode[]) => Record<string, string[]>;
  reorderWithinParent: (params: {
    state: TState;
    orderedIds: string[];
  }) => TState;
}

export function v2_getOrderAdapter(
  _model: V2OrderModel = "orderKey"
): V2OrderAdapter<Record<string, string>> {
  void _model;
  return v2_orderKeyOrderAdapter;
}
