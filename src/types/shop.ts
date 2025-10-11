import { Tables } from "@/types/supabase";

// Shop template with joined template data and plans
export type ShopTemplate = Tables<"shop_templates"> & {
  templates: Tables<"templates">;
  template_plans: Tables<"template_plans">[];
};

export type SortOrder = "newest" | "oldest";
export type TabType = "shop" | "history";

export interface TemplateAccess {
  template_id: string;
}

export interface ShopTemplatesResponse {
  shopTemplates: ShopTemplate[];
}

export interface UserTemplateAccessResponse {
  access: TemplateAccess[];
}
