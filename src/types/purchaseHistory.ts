import { Tables } from "./supabase";

// Updated to use template_purchase_requests table
export type TemplatePurchaseRequest = Tables<"template_purchase_requests">;
export type Template = Tables<"templates">;
export type TemplatePlan = Tables<"template_plans">;
export type User = Tables<"users">;

export interface TemplatePurchaseRequestWithRelations extends TemplatePurchaseRequest {
  template?: Template;
  template_plan?: TemplatePlan;
  user?: User;
}

export interface PurchaseHistoryData {
  purchaseRequests: TemplatePurchaseRequestWithRelations[];
}

export interface UpdatePurchaseRequestData {
  depositor_name: string;
  message?: string;
}

export interface PurchaseHistoryResponse {
  purchaseRequests: TemplatePurchaseRequestWithRelations[];
}
