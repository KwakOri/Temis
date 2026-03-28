import { Tables } from "./supabase";

export type Template = Tables<"templates">;
export type TemplatePlan = Tables<"template_plans">;
export type Artist = Tables<"artists">;
export type TemplateArtist = Tables<"template_artists"> & {
  artist: Artist | null;
};

// Shop template with joined template data and plans (for template detail page)
export type ShopTemplateWithPlans = Tables<"shop_templates"> & {
  templates: Tables<"templates">;
  template_plans: TemplatePlan[];
  template_artists: TemplateArtist[];
};

export interface PurchaseRequestData {
  template_id: string;
  plan_id: string;
  depositor_name: string;
  customer_phone?: string;
  message: string;
}

export interface PurchaseRequestResponse {
  success: boolean;
  error?: string;
}
