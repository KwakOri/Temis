import { Tables } from "./supabase";

export type Template = Tables<"templates">;
export type TemplateProduct = Tables<"template_products">;

export interface TemplateWithProducts extends Template {
  template_products: TemplateProduct[];
}

export interface PurchaseRequestData {
  template_id: string;
  depositor_name: string;
  message: string;
}

export interface PurchaseRequestResponse {
  success: boolean;
  error?: string;
}
