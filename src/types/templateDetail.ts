import { Tables } from "./supabase";

export type Template = Tables<"templates">;
export type TemplatePlan = Tables<"template_plans">;

// Shop template with joined template data and plans (for template detail page)
export type ShopTemplateWithPlans = Tables<"shop_templates"> & {
  templates: Tables<"templates">;
  template_plans: TemplatePlan[];
};

export interface PurchaseRequestData {
  template_id: string;
  depositor_name: string;
  message: string;
}

export interface PurchaseRequestResponse {
  success: boolean;
  error?: string;
}
