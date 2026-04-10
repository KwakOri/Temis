import type { V2TemplateOrderModel } from "@/types/time-table/template-render-config";
import { v2_orderKeyOrderAdapter } from "./order-key-adapter";

// `pointer` is supported only at graph normalization(read-compat) boundary.
// Editor runtime adapters should write `orderKey` only.
export type V2OrderModel = Extract<V2TemplateOrderModel, "orderKey">;

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
