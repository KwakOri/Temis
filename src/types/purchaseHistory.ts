import { Tables } from "./supabase";

export type PurchaseRequest = Tables<"purchase_requests">;
export type Template = Tables<"templates">;

export interface PurchaseRequestWithTemplate extends PurchaseRequest {
  template?: Template;
}

export interface PurchaseHistoryData {
  purchaseRequests: PurchaseRequestWithTemplate[];
}

export interface UpdatePurchaseRequestData {
  depositor_name: string;
  message: string;
}

export interface PurchaseHistoryResponse {
  purchaseRequests: PurchaseRequestWithTemplate[];
}
